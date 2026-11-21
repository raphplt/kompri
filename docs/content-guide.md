# Guide de rédaction des contenus

Ce guide fixe le format et l’exigence des cours, défis et grilles de Kompri. Le contenu est
la source de vérité : il est relu dans Git, validé par `pnpm content:validate`, puis
synchronisé en base par `pnpm db:seed`.

## Public et promesse

Le parcours « développement web full-stack élémentaire » s’adresse à un adulte motivé
qui débute ou se reconvertit, sans prérequis autre que savoir utiliser un ordinateur.
À la fin, il sait construire, comprendre et défendre une petite application web complète :
HTML/CSS, JavaScript, Node.js, API REST, PostgreSQL, tests et sécurité de base.

Chaque cours doit permettre d’apprendre **sans autre ressource**. Un apprenant qui lit les
leçons et fait les exercices doit pouvoir réussir les défis puis l’oral. Le cours n’est pas
une page de liens, ni un résumé : il explique, montre, fait pratiquer et anticipe les erreurs.

## Arborescence

```text
packages/content/data/
  domains.yaml                     Domaines de l’arbre, dans l’ordre d’affichage
  skills.yaml                      Compétences, prérequis, objectifs, statut
  skills/<skill-id>/lessons/       Leçons Markdown, préfixées 01-, 02-…
  skills/<skill-id>/challenges.yaml Défis de la compétence avec leur grille
```

Une compétence `published` exige au moins deux leçons et au moins un défi de chacune des
quatre familles. Une compétence `draft` est affichée comme « à venir ».

## Leçons

Fichier `NN-slug.md` (slug en minuscules et tirets). En-tête YAML obligatoire :

```markdown
---
title: Les sélecteurs CSS
summary: Cibler précisément les éléments à mettre en forme.
durationMinutes: 30
sources:
  - title: MDN — Sélecteurs CSS
    url: https://developer.mozilla.org/fr/docs/Web/CSS/CSS_selectors
---
```

`durationMinutes` estime lecture et exercices (entre 10 et 90). `sources` est facultatif
mais attendu dès qu’une affirmation technique précise est faite (norme, comportement,
recommandation de sécurité). Sources acceptées : documentation officielle (MDN, WHATWG,
W3C, IETF/RFC, Node.js, Express, PostgreSQL, Git), OWASP, ANSSI, CNIL. Une à quatre
sources par leçon suffisent. Ne citer que des URL dont l’existence est certaine.

### Structure d’une leçon

1. Pas de titre de niveau 1 : le titre vient de l’en-tête. Sections en `##` et `###`.
2. Une introduction courte : quel problème cette notion résout-elle ?
3. Les explications, progressives, chacune illustrée d’un exemple de code complet et
   exécutable, suivi de ce qu’il produit et de pourquoi.
4. Les pièges et idées reçues, avec l’erreur typique et sa correction.
5. Des exercices d’entraînement (au moins deux par leçon), chacun suivi de sa solution
   commentée dans un bloc `:::solution`.
6. Un récapitulatif en liste à puces.

Volume indicatif : 1 500 à 3 500 mots par leçon, trois à six leçons par compétence.
La compétence entière doit couvrir tous ses objectifs déclarés dans `skills.yaml`.

### Syntaxe disponible

- Markdown GitHub : titres, listes, tableaux, liens, gras, code en ligne.
- Blocs de code avec langage obligatoire : `html`, `css`, `js`, `json`, `sql`, `bash`,
  `http`, `text`. Pas de HTML brut hors des blocs de code : il n’est pas rendu.
- Encadrés : `:::note`, `:::tip`, `:::warning` et `:::solution`, fermés par `:::` en début
  de ligne, précédé d’une ligne vide (sinon il serait rattaché à une liste).
  Une solution est repliée par défaut. Un encadré peut avoir un titre :
  `:::warning[Ne jamais faire confiance à l’entrée]`.

### Exigences d’exactitude

- Tout code doit fonctionner tel quel avec les versions du parcours : navigateurs à jour,
  Node.js 24 LTS (modules ES, `import`), Express 5, PostgreSQL 18, client `pg`,
  `node:test` pour les tests. Préciser les commandes pour exécuter l’exemple.
- Pas de syntaxe dépréciée (`var` présenté comme moyen principal, `==` sans explication,
  `body-parser` séparé avec Express 5, callbacks Node quand une promesse existe…).
- Ne pas inventer de chiffres, de dates ou de citations. En cas de doute, ne pas affirmer.
- Distinguer clairement norme, convention et opinion.
- Les bonnes pratiques de sécurité sont intégrées dès les premiers exemples : requêtes SQL
  paramétrées, échappement par défaut, pas de secret dans le code.

## Style

- Français clair, phrases courtes, tutoiement. Termes techniques anglais conservés quand
  l’usage professionnel les emploie (`commit`, `callback`), expliqués à la première
  occurrence. Identifiants de code en anglais, commentaires en français.
- Expliquer le pourquoi avant le comment. Un exemple concret avant une définition abstraite.
- Ton bienveillant et exigeant, sans familiarité excessive ni emoji.
- L’IA est présentée comme un outil d’apprentissage légitime : la leçon peut suggérer de
  demander une reformulation à une IA, mais l’apprenant doit pouvoir tout expliquer seul.

## Défis

Chaque compétence publiée propose les quatre familles :

| Famille     | Intention                                                                       |
| ----------- | ------------------------------------------------------------------------------- |
| `SANS_IA`   | Exercice court sur les fondamentaux, faisable en 20 à 60 minutes sans aide.     |
| `AVEC_IA`   | Mini-projet réalisé avec une IA, que l’apprenant doit comprendre et défendre.   |
| `CONTRE_IA` | Code « généré » fourni, qui contient des failles ou bugs à trouver et corriger. |
| `APRES_IA`  | Projet existant fourni, à faire évoluer ou dépanner sans tout régénérer.        |

Format de `challenges.yaml` :

```yaml
- id: css-fundamentals-sans-ia # unique, minuscules et tirets
  family: SANS_IA
  title: Une carte de profil
  summary: Mettre en forme une carte avec la cascade et le modèle de boîte.
  estimatedMinutes: 45
  instructions:
    | # Markdown, tout ce dont l’apprenant a besoin, code fourni compris
    …
  deliverable: | # Markdown : ce qu’il colle dans le formulaire de soumission
    …
  examinerNotes:
    | # Invisible pour l’apprenant, transmis seulement à l’examinateur
    …
  rubric:
    passRatio: 0.7
    criteria:
      - id: cascade
        description: Explique quelle règle s’applique et pourquoi.
        maxScore: 3
        levels:
          - { score: 0, description: … }
          - { score: 1, description: … }
          - { score: 2, description: … }
          - { score: 3, description: … }
```

- La soumission est du texte (code et explications) collé dans un formulaire, 100 000
  caractères au plus. Demander des livrables raisonnables : quelques fichiers courts.
- `instructions` contient le contexte, le travail demandé, les contraintes et, pour
  `CONTRE_IA` et `APRES_IA`, le code fourni complet. Le code fourni doit être réaliste
  et ses défauts plausibles (ceux qu’une IA produit réellement), sans les signaler.
- `examinerNotes` liste : points de compréhension attendus, défauts cachés et leur
  correction (pour `CONTRE_IA`), erreurs fréquentes, et deux ou trois idées de questions
  ou de modification à demander à l’oral. C’est la clé de correction ; elle ne fuit jamais.
- La grille contient trois à cinq critères. `levels` décrit chaque score de 0 à
  `maxScore` inclus, de façon observable : ce que l’apprenant dit ou montre.
  Les critères portent sur la compréhension démontrée à l’oral, pas seulement sur le code.
- `passRatio` entre 0,6 et 0,8.

## Relecture

Le contenu rédigé par une IA porte le statut de relecture humaine en attente dans la
journal de projet. Une relecture d’exactitude indépendante vérifie chaque leçon : code
exécuté ou raisonné, affirmations comparées aux sources, liens contrôlés.
