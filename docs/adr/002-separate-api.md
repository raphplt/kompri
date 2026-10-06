# API séparée du front

Statut : accepté — 6 octobre 2026.

## Contexte

L’examinateur et de futurs clients ne doivent pas être enfermés dans le cycle de rendu web.

## Décision

NestJS expose REST/OpenAPI ; Next.js rend des composants serveur et consomme cette API.

## Conséquences

Deux processus locaux et un appel HTTP supplémentaire. La logique d’oral reste dans un package indépendant.
