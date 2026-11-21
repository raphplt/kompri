import type { Metadata } from 'next';
import { ProsePage } from '../../components/prose-page';
import { privacyPolicy } from '../../messages/legal';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.footer.privacy };

export default function PrivacyPage() {
  return (
    <ProsePage title="Politique de confidentialité" source={privacyPolicy} />
  );
}
