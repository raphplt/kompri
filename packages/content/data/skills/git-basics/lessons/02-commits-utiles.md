---
title: Des commits atomiques et des messages utiles
summary: Découper son travail en commits cohérents, écrire des messages qui expliquent et ignorer ce qui ne doit pas être versionné.
durationMinutes: 50
sources:
  - title: Documentation de git add (option --patch)
    url: https://git-scm.com/docs/git-add
  - title: Documentation de git commit
    url: https://git-scm.com/docs/git-commit
  - title: Documentation de gitignore
    url: https://git-scm.com/docs/gitignore
  - title: Pro Git (livre officiel, en français)
    url: https://git-scm.com/book/fr/v2
---

## Pourquoi soigner ses commits ?

Un historique Git est lu bien plus souvent qu’il n’est écrit : par toi dans trois mois,
par un collègue qui relit ton travail, par quelqu’un qui cherche quand et pourquoi un bug
est apparu. Compare ces deux historiques :

```text
a1b2c3d modifs
d4e5f6a suite
b7c8d9e wip
e0f1a2b fix
```

```text
a1b2c3d Corrige le calcul du total quand le panier est vide
d4e5f6a Ajoute la validation de l'adresse électronique
b7c8d9e Extrait l'affichage du panier dans une fonction
e0f1a2b Ajoute une page de contact
```

Le second se lit comme un journal de bord. Et comme chaque commit ne fait qu’une chose, on
peut en annuler un seul (`git revert`, leçon suivante) sans défaire le reste.

Cette leçon poursuit le projet `mon-site` de la leçon précédente.

## Qu’est-ce qu’un commit atomique ?

Un commit **atomique** contient **un seul changement logique, complet**. Trois questions
pour vérifier :

1. **Un seul sujet ?** Peux-tu le décrire en une phrase sans « et aussi » ? « Ajoute une
   feuille de style » oui ; « Ajoute une feuille de style et corrige une faute dans le pied
   de page » non : ce sont deux commits.
2. **Complet ?** Le projet fonctionne-t-il après ce commit ? Si tu ajoutes un lien vers
   `style.css`, le fichier `style.css` doit être dans le même commit, sinon le site est
   cassé entre les deux.
3. **Rien d’autre ?** Pas de fichier de test oublié, pas de ligne de débogage, pas de
   reformatage massif mélangé à une correction.

Atomique ne veut pas dire minuscule : un commit qui ajoute une fonctionnalité complète
avec son test peut toucher plusieurs fichiers. Ce qui compte, c’est la cohérence.

## Choisir ce qui entre dans un commit

Imagine que tu as travaillé une heure sur `mon-site` et que tu as fait deux choses à la
fois : créer et relier une feuille de style, et ajouter une présentation et un pied de page.
La nouvelle feuille `style.css` contient :

```css
body {
  font-family: sans-serif;
}
```

```bash
git status --short
```

```text
 M index.html
?? style.css
```

```bash
git diff
```

```diff
diff --git a/index.html b/index.html
index 40156e4..1d4f22f 100644
--- a/index.html
+++ b/index.html
@@ -3,8 +3,11 @@
   <head>
     <meta charset="utf-8" />
     <title>Mon site personnel</title>
+    <link rel="stylesheet" href="style.css" />
   </head>
   <body>
     <h1>Bienvenue sur mon site</h1>
+    <p>Je m'appelle Camille et j'apprends le développement web.</p>
+    <footer>Contact : camille@example.com</footer>
   </body>
 </html>
```

Le même fichier `index.html` contient des modifications des deux sujets. `git add
index.html` les mettrait toutes dans l’index. La solution : `git add --patch` (ou `-p`),
qui te propose chaque bloc de modifications (_hunk_) un par un.

```bash
git add -p index.html
```

Git affiche la différence puis demande :

```text
(1/1) Stage this hunk [y,n,q,a,d,s,e,?]?
```

Les réponses les plus utiles :

| Touche | Effet                                           |
| ------ | ----------------------------------------------- |
| `y`    | ajouter ce bloc à l’index                       |
| `n`    | ne pas l’ajouter                                |
| `s`    | découper ce bloc en blocs plus petits (_split_) |
| `q`    | quitter                                         |
| `?`    | afficher l’aide                                 |

Ici, les trois lignes ajoutées sont proches, donc Git les regroupe en un seul bloc. On tape
`s` pour le découper :

```text
Split into 2 hunks.
@@ -3,6 +3,7 @@
   <head>
     <meta charset="utf-8" />
     <title>Mon site personnel</title>
+    <link rel="stylesheet" href="style.css" />
   </head>
   <body>
     <h1>Bienvenue sur mon site</h1>
(1/2) Stage this hunk [y,n,q,a,d,j,J,g,/,e,?]?
```

On répond `y` pour le lien vers la feuille de style, puis `n` pour le second bloc
(présentation et pied de page). Résultat :

```bash
git add style.css
git status --short
```

```text
MM index.html
A  style.css
```

`MM index.html` : une partie du fichier est dans l’index (le lien), une autre partie est
seulement dans le répertoire de travail (la présentation et le pied de page). `A  style.css` :
le nouveau fichier est entièrement indexé. Vérifie toujours ce qui va partir avec
`git diff --staged` :

```bash
git diff --staged --stat
```

```text
 index.html | 1 +
 style.css  | 3 +++
 2 files changed, 4 insertions(+)
```

Le lien et la feuille de style forment un changement complet : on peut enregistrer.

:::tip[Toujours relire l’index avant de valider]
Le réflexe professionnel : `git status`, puis `git diff --staged`, puis seulement
`git commit`. Cela évite d’enregistrer un fichier de débogage, un mot de passe ou une
modification qui n’a rien à voir.
:::

## Écrire un message utile

### Les conventions les plus répandues

Git accepte n’importe quel texte. Les règles suivantes sont des **conventions** largement
partagées, pas des obligations techniques :

- une **ligne de résumé** courte (une cinquantaine de caractères, 72 au plus), sans point
  final ;
- à l’**impératif** ou au présent, qui complète la phrase « Ce commit… » : « Ajoute »,
  « Corrige », « Supprime » ;
- si nécessaire, une **ligne vide**, puis un **corps** qui explique **pourquoi** le
  changement est fait et ce qu’il implique. Le « quoi » se lit déjà dans la différence.

Pour un message sur plusieurs paragraphes, tu peux répéter `-m` : chaque `-m` devient un
paragraphe.

```bash
git commit -m "Ajoute une feuille de style de base" -m "La page utilisait la police par défaut du navigateur. On applique
une police sans empattement à tout le document."
```

```text
[main 4e96c22] Ajoute une feuille de style de base
 2 files changed, 4 insertions(+)
 create mode 100644 style.css
```

Ou, plus confortable, lance `git commit` sans `-m` : ton éditeur s’ouvre, tu écris le résumé
sur la première ligne, une ligne vide, puis le corps. `git log -1` affiche le résultat :

```text
commit 4e96c22cf1baceccd4bc535c162c8f8502f6659f
Author: Camille Martin <camille@example.com>
Date:   Tue Mar 3 09:10:00 2026 +0100

    Ajoute une feuille de style de base

    La page utilisait la police par défaut du navigateur. On applique
    une police sans empattement à tout le document.
```

Puis on enregistre le second sujet :

```bash
git add index.html
git commit -m "Ajoute une présentation et un pied de page"
```

### Les préfixes de type

Beaucoup d’équipes adoptent la convention _Conventional Commits_, qui préfixe le résumé par
un type : `feat: ajoute la page de contact`, `fix: corrige le calcul du total`,
`docs: complète le README`. C’est une convention d’équipe, utile notamment pour générer
automatiquement des notes de version. Dans un projet existant, **respecte la convention en
place** ; dans tes projets personnels, choisis-en une et tiens-t’y.

### Ce qu’il faut éviter

| Message                                | Problème                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `modifs`                               | ne dit rien du changement                                     |
| `fix`                                  | quoi ? pourquoi ?                                             |
| `wip`                                  | « travail en cours » : le commit n’est sans doute pas complet |
| `index.html`                           | le fichier se voit déjà dans la différence                    |
| `Corrige le bug signalé par Paul hier` | incompréhensible dans six mois                                |

## Ignorer des fichiers avec .gitignore

Certains fichiers ne doivent **jamais** être versionnés :

- les **dépendances** téléchargées (`node_modules/`), qui se réinstallent ;
- les **secrets** et réglages locaux (`.env`, qui contient des mots de passe) ;
- les fichiers générés : journaux (`*.log`), résultats de compilation ;
- les fichiers propres à ton système ou ton éditeur (`.DS_Store` sur macOS).

Supposons que ces fichiers soient présents :

```bash
git status --short
```

```text
?? .env
?? debug.log
?? node_modules/
```

Crée à la racine du projet un fichier `.gitignore` :

```text
# Dépendances installées par npm
node_modules/

# Secrets et configuration locale
.env

# Journaux
*.log
```

Chaque ligne est un **motif** : `*` remplace n’importe quelle suite de caractères, une barre
finale (`node_modules/`) ne vise que les dossiers, `#` commence un commentaire. Résultat :

```bash
git status --short
```

```text
?? .gitignore
```

Les trois éléments ont disparu de la liste. `.gitignore` lui-même **doit** être versionné,
pour que tout le monde ignore les mêmes fichiers :

```bash
git add .gitignore
git commit -m "Ignore les dépendances, les secrets et les journaux"
```

Pour savoir quelle règle ignore un fichier :

```bash
git check-ignore -v .env debug.log
```

```text
.gitignore:5:.env	.env
.gitignore:8:*.log	debug.log
```

Si tu tentes d’ajouter un fichier ignoré, Git refuse et l’explique :

```text
The following paths are ignored by one of your .gitignore files:
.env
hint: Use -f if you really want to add them.
hint: Turn this message off by running
hint: "git config advice.addIgnoredFile false"
```

### Un fichier déjà suivi n’est pas ignoré

`.gitignore` ne concerne que les fichiers **non suivis**. Si `notes.txt` a déjà été
commité, l’ajouter à `.gitignore` ne change rien : Git continue de suivre ses modifications.
Il faut d’abord le retirer de l’index, sans le supprimer du disque :

```bash
git rm --cached notes.txt
git status --short
```

```text
 M .gitignore
D  notes.txt
```

`D ` signifie que le prochain commit retirera `notes.txt` du dépôt ; le fichier reste sur ton
disque, et comme il est désormais ignoré, il n’apparaît plus comme non suivi.

:::warning[Un secret commité est un secret compromis]
Si tu as commité un mot de passe ou une clé d’API, le retirer dans un commit suivant
**ne l’efface pas de l’historique** : n’importe qui peut le lire dans l’ancien commit. Si le
dépôt a été partagé, considère le secret comme divulgué : **révoque-le et remplace-le**
auprès du service concerné. C’est pour cela que `.env` doit figurer dans `.gitignore` dès le
premier commit du projet.
:::

## Supprimer et renommer des fichiers suivis

- `git rm fichier` supprime le fichier du disque **et** prépare sa suppression dans l’index.
- `git mv ancien nouveau` renomme et prépare le changement :

```bash
git mv style.css main.css
git status --short
```

```text
R  style.css -> main.css
```

(Pour annuler ce renommage de démonstration : `git mv main.css style.css`.)

Si tu renommes un fichier avec ton éditeur ou `mv`, Git voit d’abord une suppression et un
nouveau fichier non suivi ; après `git add` des deux, il détecte le renommage tout seul.

## Corriger le dernier commit

Une faute dans le message, un fichier oublié ? Tant que le commit **n’a pas été partagé**
(envoyé sur un dépôt distant), `git commit --amend` le remplace. Imagine qu’au moment de
commiter le `.gitignore`, tu aies tapé « journux » :

```bash
git commit -m "Ignore les dépendances, les secrets et les journux"
git commit --amend -m "Ignore les dépendances, les secrets et les journaux"
```

```text
[main de650e1] Ignore les dépendances, les secrets et les journux
 1 file changed, 8 insertions(+)
 create mode 100644 .gitignore
[main 0bd8ce8] Ignore les dépendances, les secrets et les journaux
 Date: Tue Mar 3 09:30:00 2026 +0100
 1 file changed, 8 insertions(+)
 create mode 100644 .gitignore
```

Remarque que l’empreinte a changé (`de650e1` puis `0bd8ce8`) : `--amend` ne modifie pas le
commit, il en crée un **nouveau** qui le remplace. Pour ajouter un fichier oublié, fais
`git add fichier` puis `git commit --amend --no-edit` (garde le même message).

:::warning[Ne réécris pas un historique partagé]
Si le commit a déjà été envoyé et récupéré par d’autres, le remplacer crée deux versions
concurrentes de l’histoire. Dans ce cas, fais un nouveau commit de correction.
:::

## Pièges courants

- **`git add .` par réflexe.** Il ajoute tout le dossier courant, y compris des fichiers
  que tu n’avais pas prévu (si `.gitignore` est incomplet). Préfère nommer les fichiers ou
  utiliser `git add -p`, et relis `git status`.
- **`git commit -a` et les nouveaux fichiers.** `-a` indexe automatiquement les fichiers
  **déjà suivis** modifiés ou supprimés, mais **pas** les fichiers non suivis. Un nouveau
  fichier sera oublié silencieusement.
- **Commits « fourre-tout » en fin de journée.** Commite dès qu’un petit changement est
  complet ; c’est plus facile que de découper après coup.
- **Un `.gitignore` ajouté trop tard.** Ajoute-le dès le premier commit ; sinon pense à
  `git rm --cached`.

## Exercices

### Exercice 1 — Découper un travail mélangé

Dans un dépôt contenant un fichier suivi `recette.md` :

```text
# Crêpes

- 250 g de farine
- 3 œufs
- 50 cl de lait
```

Tu fais en une fois deux changements : tu corriges « 3 œufs » en « 4 œufs » **et** tu
ajoutes à la fin une section « Préparation » (un titre et une phrase). Produis **deux commits** :
d’abord la correction, puis l’ajout. Donne les commandes et les messages.

:::solution

```bash
git add -p recette.md
# Git propose un seul bloc : taper s pour le découper en deux,
# puis y pour la correction des œufs et n pour la section Préparation.
git diff --staged            # vérifier : seulement « 3 œufs » -> « 4 œufs »
git commit -m "Corrige le nombre d'œufs des crêpes"
git add recette.md           # le reste du fichier : la section Préparation
git commit -m "Ajoute les étapes de préparation des crêpes"
git log --oneline -2
```

Le découpage fonctionne parce que la ligne « 50 cl de lait », inchangée, sépare les deux
modifications. Si deux modifications sont collées l’une à l’autre, `s` ne peut pas les
séparer : la touche `e` permet alors d’éditer le bloc à la main, ou tu peux retirer
temporairement la seconde modification dans l’éditeur, commiter, puis la remettre. L’important est que
chaque commit ne contienne qu’un sujet et que tu l’aies vérifié avec `git diff --staged`.
:::

### Exercice 2 — Réécrire des messages

Propose un meilleur message pour chacun de ces commits, à partir de ce que fait la
différence :

1. `update` : la différence ajoute `<meta name="viewport" content="width=device-width, initial-scale=1">` dans le `head`.
2. `fix bug` : la différence remplace `if (total > 50)` par `if (total >= 50)`, car la
   livraison est gratuite à partir de 50 €.
3. `css` : la différence supprime 40 lignes de règles qui ne s’appliquent plus à aucun
   élément.

:::solution

1. `Ajoute la balise viewport pour l'affichage mobile` : le message dit ce qui change et
   pourquoi en peu de mots.
2. `Offre la livraison à partir de 50 € inclus`, avec éventuellement un corps :
   « La règle métier dit "à partir de 50 €" : le test strict excluait exactement 50 €. »
   Le corps donne le **pourquoi**, que la différence ne montre pas.
3. `Supprime les règles CSS inutilisées` : le nombre de lignes n’a pas besoin d’être répété,
   il se voit dans `git show --stat`.

D’autres formulations sont valables si elles sont courtes, précises et à l’impératif.
:::

### Exercice 3 — Le .gitignore d’un projet Node.js

Ton projet contient : `index.js`, `package.json`, `package-lock.json`, `node_modules/`,
`.env`, `.env.example` (un modèle sans secrets), `erreurs.log` et `.DS_Store`. Écris le
`.gitignore` et dis quels fichiers seront versionnés.

:::solution

```text
# Dépendances
node_modules/

# Secrets locaux (le modèle .env.example, lui, est versionné)
.env

# Journaux
*.log

# Fichiers système macOS
.DS_Store
```

Seront versionnés : `index.js`, `package.json`, `package-lock.json`, `.env.example` et
`.gitignore`. Le fichier `package-lock.json` doit être versionné : il garantit que tout le
monde installe exactement les mêmes versions des dépendances. Vérifie avec
`git status --short` et `git check-ignore -v` que seuls les bons fichiers apparaissent.
:::

## Récapitulatif

- Un commit **atomique** contient un seul changement logique, complet, et rien d’autre.
- `git add -p` permet de choisir les blocs de modifications à indexer ; `s` découpe un
  bloc.
- Relis toujours l’index avec `git diff --staged` avant `git commit`.
- Un bon message : un résumé court à l’impératif, puis si besoin une ligne vide et un corps
  qui explique le pourquoi. Les préfixes de type sont une convention d’équipe.
- `.gitignore` exclut dépendances, secrets, journaux et fichiers système ; il est lui-même
  versionné. Un fichier déjà suivi doit être retiré avec `git rm --cached`.
- Un secret commité reste dans l’historique : il faut le révoquer.
- `git commit --amend` remplace le dernier commit, uniquement s’il n’a pas été partagé.
