# Choix ouvert du fournisseur de modèle

Statut : accepté — 21 novembre 2026.

## Contexte

Le porteur du projet veut pouvoir utiliser Mistral, OpenAI, Gemini, Claude ou un modèle
local, sans toucher à l’examinateur. Les tests et la CI ne doivent faire aucun appel réel.

## Décision

Deux protocoles couvrent tous les fournisseurs :

- **Chat Completions** (`openai-compatible.ts`, `fetch` direct) : Mistral, OpenAI, Gemini
  via son endpoint de compatibilité, Ollama, vLLM, LM Studio et tout serveur compatible ;
- **Messages API d’Anthropic** (`anthropic.ts`) avec le SDK officiel `@anthropic-ai/sdk`,
  dont l’option `fetch` permet le même transport simulé dans les tests. Le repli serveur
  `fallbacks: "default"` est activé par défaut sur refus de sécurité
  (`ANTHROPIC_FALLBACKS=none` le désactive).

Chaque usage (`examiner`, `tutor`, `content-generation`) choisit un fournisseur parmi des
préréglages (URL par défaut, clé `<PRÉFIXE>_API_KEY`, URL `<PRÉFIXE>_BASE_URL`). HTTPS est
obligatoire, sauf vers la boucle locale pour un modèle servi sur la machine. Les sorties
structurées utilisent un JSON Schema strict commun (objets fermés, toutes les clés
requises, contraintes numériques et de longueur retirées puis revérifiées par Zod).
Un refus ou une réponse tronquée est une erreur ; aucune reprise automatique n’est faite
par l’adaptateur, l’application décide.

## Conséquences

Changer de fournisseur est une modification de configuration. Un nouveau protocole exige
seulement un adaptateur. La qualité d’un modèle n’est jamais déduite des tests : elle se
mesure avec `pnpm evals:live`, lancé manuellement et facturé par le fournisseur.
