import type { Metadata } from 'next';
import { ProsePage } from '../../components/prose-page';
import { legalNotice } from '../../messages/legal';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.footer.legal };

export default function LegalNoticePage() {
  return <ProsePage title={fr.footer.legal} source={legalNotice} />;
}
