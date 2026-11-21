import { z } from 'zod';

export const challengeFamilySchema = z.enum([
  'SANS_IA',
  'AVEC_IA',
  'CONTRE_IA',
  'APRES_IA',
]);
export type ChallengeFamily = z.infer<typeof challengeFamilySchema>;
export const contentIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
