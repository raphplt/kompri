# PostgreSQL et Prisma

Statut : accepté — 6 octobre 2026.

## Contexte

Le domaine comporte des relations fortes et des données personnelles à supprimer intégralement.

## Décision

Schéma Prisma, migration SQL versionnée, adaptateur pg et cascades testées sur PostgreSQL.

## Conséquences

Les contraintes SQL complètent Prisma. Snapshots et consommation unique évitent de réinterpréter le passé ou doubler un comptage.
