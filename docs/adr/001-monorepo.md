# Monorepo pnpm et Turborepo

Statut : accepté — 6 octobre 2026.

## Contexte

Partager les contrats sans dupliquer le code entre deux apps et cinq modules métier.

## Décision

Workspaces pnpm, dépendances internes explicites et tâches Turborepo ordonnées par le graphe.

## Conséquences

Un lockfile et des configurations communes ; les changements transversaux sont atomiques. Les exports TS internes restent propres au workspace.
