import type { Metadata } from 'next';
import { ProsePage } from '../../components/prose-page';
import { howItWorks } from '../../messages/legal';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.footer.about };

const setting = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export default function HowItWorksPage() {
  return (
    <ProsePage
      title={fr.footer.about}
      source={howItWorks({
        questions: setting('ORAL_QUESTION_COUNT', 3),
        minutes: Math.round(setting('ORAL_ANSWER_SECONDS', 240) / 60),
        orals: setting('ORAL_LIMIT_PER_WINDOW', 5),
        hours: setting('ORAL_WINDOW_HOURS', 24),
        validityDays: setting('VALIDATION_DAYS', 180),
      })}
    />
  );
}
