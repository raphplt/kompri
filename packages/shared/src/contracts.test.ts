import { expect, it } from 'vitest';
import { z } from './index.ts';
it('rejects invalid shared input', () => {
  expect(z.string().safeParse(42).success).toBe(false);
});
