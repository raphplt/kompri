import { cache } from 'react';
import {
  progressResponseSchema,
  skillDetailSchema,
  treeResponseSchema,
} from '@kompri/shared';
import type { ProgressResponse, SkillState } from '@kompri/shared';
import { api, ApiRequestError } from './api';
import { getCurrentUser, getToken } from './session';

export const getTree = cache(() => api('/tree', treeResponseSchema));

export const getSkill = cache(async (id: string) => {
  try {
    return await api(`/skills/${encodeURIComponent(id)}`, skillDetailSchema);
  } catch (error) {
    if (error instanceof ApiRequestError && [400, 404].includes(error.status))
      return null;
    throw error;
  }
});

/** Progress of the signed-in learner, or null for visitors. */
export const getProgress = cache(async (): Promise<ProgressResponse | null> => {
  if (!(await getCurrentUser())) return null;
  return api('/me/progress', progressResponseSchema, {
    token: await getToken(),
  });
});

export function stateOf(
  progress: ProgressResponse | null,
  skill: { id: string; status: 'draft' | 'published'; prerequisites: string[] },
): SkillState | null {
  const entry = progress?.skills.find((s) => s.skillId === skill.id);
  if (entry) return entry.state;
  return skill.status === 'draft' ? 'upcoming' : null;
}
