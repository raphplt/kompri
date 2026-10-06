import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fr } from '../messages/fr';
import './globals.css';
export const metadata: Metadata = {
  title: fr.title,
  description: fr.description,
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
