# Versions stables compatibles

Statut : accepté — 6 octobre 2026.

## Contexte

Les dernières publications ne garantissent ni stabilité ni compatibilité entre outils.

## Décision

Node 24.21.0 LTS, dépendances stables épinglées ; TypeScript 6.0.3 plutôt que 7.0.2 et Prisma 7.10.0 plutôt que la préversion latest.

## Conséquences

Respect des peer dependencies Swagger et typescript-eslint. Réévaluer lors des mises à jour, régénérer le lockfile et exécuter toute la chaîne.
