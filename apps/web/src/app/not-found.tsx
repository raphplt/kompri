import { ButtonLink } from '../components/ui';
import { fr } from '../messages/fr';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">{fr.notFound.title}</h1>
      <p className="mt-2 text-muted">{fr.notFound.text}</p>
      <div className="mt-8">
        <ButtonLink href="/">{fr.notFound.back}</ButtonLink>
      </div>
    </div>
  );
}
