import { z } from 'zod';

// Keywords rejected by strict structured-output modes (OpenAI, Mistral, Anthropic).
// They are still enforced: every response is validated with the Zod schema.
const unsupported = new Set([
  '$schema',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'default',
]);

function strict(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strict);
  if (!node || typeof node !== 'object') return node;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node))
    if (!unsupported.has(key))
      output[key] =
        key === 'properties' && value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value).map(([name, child]) => [
                name,
                strict(child),
              ]),
            )
          : strict(value);
  if (output.type === 'object' && output.properties) {
    output.additionalProperties = false;
    output.required = Object.keys(output.properties as object);
  }
  return output;
}

/** JSON Schema accepted by strict structured-output modes of every adapter. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return strict(z.toJSONSchema(schema, { io: 'output' })) as Record<
    string,
    unknown
  >;
}
