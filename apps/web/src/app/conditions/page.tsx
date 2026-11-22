import type { Metadata } from 'next';
import { ProsePage } from '../../components/prose-page';
import { termsOfUse } from '../../messages/legal';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation',
};

export default function TermsPage() {
  return (
    <ProsePage title="Conditions générales d’utilisation" source={termsOfUse} />
  );
}
