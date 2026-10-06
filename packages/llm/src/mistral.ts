import { z } from 'zod';
import type { Adapter, Request, TokenUsage } from './types.ts';
const usageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
});
const completionSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string() }) }))
    .min(1),
  usage: usageSchema.nullish(),
});
const chunkSchema = z.object({
  choices: z.array(
    z.object({ delta: z.object({ content: z.string().nullish() }) }),
  ),
  usage: usageSchema.nullish(),
});
const tokens = (usage: z.infer<typeof usageSchema>): TokenUsage => ({
  inputTokens: usage.prompt_tokens,
  outputTokens: usage.completion_tokens,
});
export function createMistralAdapter(
  config: { baseUrl: string; apiKey: string; model: string },
  transport: typeof fetch = fetch,
): Adapter {
  const send = async (
    request: Request,
    stream: boolean,
    jsonSchema?: Record<string, unknown>,
  ) => {
    const response = await transport(
      `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: 0,
          stream,
          ...(jsonSchema
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'response',
                    schema: jsonSchema,
                    strict: true,
                  },
                },
              }
            : {}),
        }),
      },
    );
    // Provider bodies may contain personal data. Never propagate them.
    if (!response.ok) throw new Error(`LLM provider HTTP ${response.status}`);
    return response;
  };
  return {
    async complete(request, jsonSchema) {
      const result = completionSchema.parse(
        await (await send(request, false, jsonSchema)).json(),
      );
      return {
        text: result.choices[0]!.message.content,
        tokens: result.usage ? tokens(result.usage) : null,
      };
    },
    async *stream(request) {
      const response = await send(request, true);
      if (!response.body) throw new Error('Missing provider stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let ended = false;
      try {
        while (true) {
          const part = await reader.read();
          buffer += part.done
            ? decoder.decode()
            : decoder.decode(part.value, { stream: true });
          // SSE allows CRLF; normalize after chunks are assembled (including split CRLF).
          buffer = buffer.replace(/\r\n/g, '\n');
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = block
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');
            if (!data) continue;
            if (data === '[DONE]') {
              ended = true;
              return;
            }
            const chunk = chunkSchema.parse(JSON.parse(data));
            for (const choice of chunk.choices)
              if (choice.delta.content) yield { text: choice.delta.content };
            if (chunk.usage) yield { tokens: tokens(chunk.usage) };
          }
          if (part.done) break;
        }
        if (!ended) throw new Error('Truncated provider stream');
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
    },
  };
}
