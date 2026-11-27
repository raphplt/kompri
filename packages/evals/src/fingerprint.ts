import { createHash } from 'node:crypto';
import {
  followUpInstructions,
  gradeInstructions,
  maxQuestions,
  minQuestions,
  prepareInstructions,
} from '@kompri/examiner';

/**
 * Fingerprint of every instruction the examiner sends to the model. A live
 * report records it; CI refuses prompts that differ from the latest report.
 */
export function promptFingerprint(): string {
  const prepare = Array.from(
    { length: maxQuestions - minQuestions + 1 },
    (_, i) => prepareInstructions(minQuestions + i),
  );
  return createHash('sha256')
    .update(JSON.stringify([prepare, followUpInstructions, gradeInstructions]))
    .digest('hex')
    .slice(0, 16);
}
