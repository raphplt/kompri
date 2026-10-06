# Clients LLM injectés par usage

Statut : accepté — 6 octobre 2026.

## Contexte

La fiabilité doit être mesurée hors interface et sans imposer un modèle.

## Décision

Interface texte/objet/stream, registre par usage, mock déterministe et adaptateur HTTP Mistral.

## Conséquences

Les tests restent locaux. Modèle, endpoint et tarifs sont configurables ; un nouveau protocole demande un adaptateur seulement.
