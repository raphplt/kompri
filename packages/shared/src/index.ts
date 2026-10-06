import { z } from 'zod';
export { z };
export const challengeFamilySchema = z.enum([
  'SANS_IA',
  'AVEC_IA',
  'CONTRE_IA',
  'APRES_IA',
]);
export const skillSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  rncpBlockReference: z.string().min(1).optional(),
});
export const skillsResponseSchema = z.array(skillSchema);
export type Skill = z.infer<typeof skillSchema>;
export const skillsQuerySchema = z
  .object({ locale: z.enum(['fr', 'en']).default('fr') })
  .strict();
