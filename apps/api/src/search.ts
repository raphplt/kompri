import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { searchQuerySchema, searchResponseSchema } from '@kompri/shared';
import { DATABASE } from './context.ts';
import { parseInput } from './errors.ts';

const start = '⟦';
const stop = '⟧';

/** Splits a ts_headline result on its markers into plain and matched parts. */
export function excerptParts(headline: string) {
  const parts: { text: string; match: boolean }[] = [];
  for (const [index, chunk] of headline
    .replace(/\s+/g, ' ')
    .trim()
    .split(new RegExp(`[${start}${stop}]`))
    .entries()) {
    if (chunk) parts.push({ text: chunk, match: index % 2 === 1 });
  }
  return parts;
}

interface Row {
  skillId: string;
  skillTitle: string;
  slug: string;
  title: string;
  summary: string;
  headline: string;
}

@ApiTags('content')
@Controller()
export class SearchController {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  /**
   * Full-text search over published lessons, accent-insensitive French
   * stemming (`kompri_french`), ranked title > summary > body. Excerpts are
   * computed on the best results only, from the body stripped of Markdown.
   */
  @Get('search')
  async search(@Query() query: unknown) {
    const { q } = parseInput(searchQuerySchema, query);
    const rows = await this.db.$queryRaw<Row[]>`
      WITH query AS (SELECT websearch_to_tsquery('kompri_french', ${q}) AS q),
      ranked AS (
        SELECT l."skillId", s.title AS "skillTitle", l.slug, l.title,
               l.summary, l.body, query.q,
               ts_rank_cd(l."searchVector", query.q) AS rank,
               s.position AS "skillPosition", l.position
        FROM "Lesson" l
        JOIN "Skill" s ON s.id = l."skillId"
        CROSS JOIN query
        WHERE l."archivedAt" IS NULL AND s."archivedAt" IS NULL
          AND s.status = 'PUBLISHED' AND l."searchVector" @@ query.q
        ORDER BY rank DESC, "skillPosition", l.position
        LIMIT 15
      )
      SELECT "skillId", "skillTitle", slug, title, summary,
        ts_headline('kompri_french',
          regexp_replace(
            regexp_replace(body, '\`\`\`[a-z]*|:::[a-z]*|\\]\\([^)]*\\)|[#>|]+', ' ', 'g'),
            '[\`*\\[]+', '', 'g'),
          q,
          ${`StartSel=${start}, StopSel=${stop}, MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "`}
        ) AS headline
      FROM ranked
      ORDER BY rank DESC, "skillPosition", position`;
    return searchResponseSchema.parse({
      query: q,
      results: rows.map(({ headline, ...row }) => ({
        ...row,
        excerpt: excerptParts(headline),
      })),
    });
  }
}
