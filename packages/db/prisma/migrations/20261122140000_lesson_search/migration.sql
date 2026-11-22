-- Accent-insensitive French text search: "requete" finds "requête".
-- unaccent is a trusted extension: the database owner can create it.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION kompri_french (COPY = french);
ALTER TEXT SEARCH CONFIGURATION kompri_french
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;

-- Single definition of a lesson's weighted vector, used by the content sync.
CREATE FUNCTION lesson_search_vector(title TEXT, summary TEXT, body TEXT)
RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
    SELECT setweight(to_tsvector('kompri_french', title), 'A')
        || setweight(to_tsvector('kompri_french', summary), 'B')
        || setweight(to_tsvector('kompri_french', body), 'C')
$$;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "searchVector" tsvector;

-- CreateIndex
CREATE INDEX "Lesson_searchVector_idx" ON "Lesson" USING GIN ("searchVector");

-- Backfill existing lessons.
UPDATE "Lesson" SET "searchVector" = lesson_search_vector("title", "summary", "body");
