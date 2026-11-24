---
title: Pull request de bout en bout et étiquettes de version
summary: Proposer, relire et intégrer une pull request, puis publier une version étiquetée selon SemVer.
durationMinutes: 75
sources:
  - title: GitHub Docs — Pull request reviews
    url: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews
  - title: GitHub Docs — Pull request merges
    url: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges
  - title: Documentation de git tag
    url: https://git-scm.com/docs/git-tag
  - title: Gestion sémantique de version 2.0.0 (en français)
    url: https://semver.org/lang/fr/
---

## Une pull request est une conversation

Tu as vu dans la compétence précédente qu’une **pull request** (GitHub) ou **merge
request** (GitLab) est une demande de fusion d’une branche dans une autre, accompagnée d’une
page de discussion. Techniquement, ce n’est qu’une branche et un bouton. Humainement, c’est
le moment où ton travail devient celui de l’équipe : quelqu’un d’autre le lit, le
comprend, le questionne, et accepte d’en partager la responsabilité.

Une bonne pull request se prépare, se décrit, se relit, se corrige, se met à jour, puis
s’intègre proprement. Cette leçon suit une pull request de bout en bout, en reproduisant en
local tout ce qui relève de Git, et en décrivant ce qui relève de la plateforme. Elle se
termine par l’étape qui suit souvent une série de pull requests : **publier une version**
étiquetée.

Les interfaces des plateformes changent régulièrement ; les concepts décrits ici (branche
de base, description, relecteurs, demandes de modification, approbation, stratégies de
fusion) sont stables et communs à GitHub et GitLab, avec parfois un vocabulaire différent.

## Préparer la branche

Repars de l’atelier `~/equipe` de la leçon 1 (ou recrée-le : un serveur nu et deux clones).
Camille ajoute sur `main`, et pousse, un `package.json` qui déclare un script de test,
pour que chacun lance les tests de la même façon avec `npm test` :

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Sacha veut ajouter des codes promotionnels. Elle part d’un `main` à jour et crée une branche
dédiée :

```bash
cd ~/equipe/sacha
git switch main
git pull
git switch -c feat/code-promo
mkdir -p test
```

Elle écrit `src/promo.js` :

```js
const CODES = { BIENVENUE10: 0.1, FIDELE20: 0.2 };

export function promoRate(code) {
  return CODES[code] ?? 0;
}
```

et ses tests, `test/promo.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promoRate } from '../src/promo.js';

test('reconnaît un code valide', () => {
  assert.equal(promoRate('BIENVENUE10'), 0.1);
});

test('renvoie 0 pour un code inconnu', () => {
  assert.equal(promoRate('INCONNU'), 0);
});
```

```bash
git add src/promo.js test/promo.test.js
git commit -m "Ajoute les codes promotionnels"
npm test
```

```text
[feat/code-promo 106bdec] Ajoute les codes promotionnels
 2 files changed, 16 insertions(+)
 create mode 100644 src/promo.js
 create mode 100644 test/promo.test.js

> test
> node --test

✔ reconnaît un code valide (0.628002ms)
✔ renvoie 0 pour un code inconnu (0.107779ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 57.770313
```

(Les durées varient à chaque exécution.) Avant de publier, Sacha fait sa propre relecture :
`git diff origin/main...HEAD` montre exactement ce que verront les relecteurs. C’est le
moment de retirer un `console.log` oublié, de nettoyer l’historique (leçon 2) et de
vérifier qu’aucun fichier sensible n’est inclus. Puis elle publie la branche :

```bash
git push -u origin feat/code-promo
```

```text
To /home/camille/equipe/serveur.git
 * [new branch]      feat/code-promo -> feat/code-promo
branch 'feat/code-promo' set up to track 'origin/feat/code-promo'.
```

Quelques repères pour la taille, qui relèvent du bon sens plutôt que d’une règle : une pull
request traite **un seul sujet**, se relit en moins d’une demi-heure, et contient ses
tests. Si la description a besoin du mot « et » pour énumérer des sujets sans rapport,
c’est probablement deux pull requests.

## Ouvrir la pull request

Sur la plateforme, on crée une pull request en choisissant deux branches : la **branche
de base** (celle qui recevra les changements, ici `main`) et la **branche à fusionner**
(`feat/code-promo`). On rédige ensuite un titre et une description. Le titre résume le
changement comme un bon message de commit ; la description donne au relecteur tout ce qu’il
ne peut pas deviner en lisant le code :

```text
Ajoute les codes promotionnels

## Pourquoi
L'équipe marketing veut proposer des codes de réduction lors de la campagne
de rentrée (ticket #12).

## Ce qui change
- Nouveau module src/promo.js : promoRate(code) renvoie le taux de remise
  associé à un code, ou 0 pour un code inconnu.
- Tests dans test/promo.test.js.

## Comment tester
npm test
node -e "import('./src/promo.js').then((m) => console.log(m.promoRate('FIDELE20')))"
-> affiche 0.2

## Points d'attention
Les codes sont codés en dur pour l'instant ; leur stockage en base fera
l'objet d'une autre pull request.

Closes #12
```

Quelques fonctions courantes des plateformes, à connaître sans dépendre d’une interface
précise :

- **Lien avec un ticket** : sur GitHub, une phrase comme `Closes #12` dans la description
  ferme automatiquement le ticket 12 quand la pull request est fusionnée dans la branche
  par défaut. D’autres plateformes ont un mécanisme équivalent.
- **Brouillon** (_draft_) : une pull request marquée comme brouillon ne peut pas être
  fusionnée. On s’en sert pour montrer un travail en cours et recueillir un premier avis,
  avant de la déclarer prête pour la relecture.
- **Relecteurs** : on demande explicitement l’avis d’une ou plusieurs personnes ;
  certaines équipes désignent automatiquement les responsables des fichiers modifiés.
- **Vérifications automatiques** : un service d’intégration continue lance les tests à
  chaque envoi sur la branche et affiche le résultat dans la pull request. Une branche
  protégée peut exiger que ces vérifications réussissent avant toute fusion.

## Relire une pull request

Camille est relectrice. Relire, ce n’est pas seulement lire la différence dans le
navigateur : c’est **comprendre** le changement et, souvent, **l’essayer**. Sans créer de
branche locale (qui deviendrait vite périmée), elle se place directement sur la version
distante :

```bash
cd ~/equipe/camille
git fetch
git switch --detach origin/feat/code-promo
git log --oneline main..origin/feat/code-promo
git diff --stat main...origin/feat/code-promo
```

```text
From /home/camille/equipe/serveur
 * [new branch]      feat/code-promo -> origin/feat/code-promo
HEAD is now at 106bdec Ajoute les codes promotionnels
106bdec (HEAD, origin/feat/code-promo) Ajoute les codes promotionnels
 src/promo.js       |  5 +++++
 test/promo.test.js | 11 +++++++++++
 2 files changed, 16 insertions(+)
```

Elle lance les tests (ils passent), puis essaie un cas que les tests ne couvrent pas :
un client qui tape son code en minuscules.

```bash
node -e "import('./src/promo.js').then((m) => console.log(m.promoRate('bienvenue10')))"
```

```text
0
```

Le code est refusé. C’est exactement le genre de défaut qu’une relecture doit trouver.

### Ce qu’on regarde

- **Le besoin** : la pull request fait-elle ce que la description annonce, et seulement
  cela ?
- **La justesse** : cas limites, entrées inattendues, erreurs. Essayer plutôt que supposer.
- **Les tests** : couvrent-ils le comportement, y compris les cas limites ?
- **La lisibilité** : noms, structure, commentaires utiles. Quelqu’un comprendra-t-il ce
  code dans six mois ?
- **La sécurité** : pas de secret, entrées validées, pas de données sensibles dans les
  journaux.
- **L’historique** : des commits clairs, ou une stratégie d’écrasement prévue.

### Écrire des commentaires utiles

Un commentaire de relecture vise le **code**, pas la personne ; il explique **pourquoi**
et, si possible, **propose**. Beaucoup d’équipes indiquent aussi le poids du commentaire,
pour que l’auteur sache ce qui bloque la fusion et ce qui est une simple suggestion
(c’est une convention, à adapter) :

```text
src/promo.js, ligne 4 — bloquant
Un client qui saisit « bienvenue10 » ou « BIENVENUE10 » avec une espace
obtient 0 : j'ai essayé avec node -e (sortie : 0). On pourrait normaliser
avec code.trim().toUpperCase() avant la recherche, et ajouter un test.

test/promo.test.js — suggestion
On pourrait tester aussi FIDELE20, pour couvrir les deux codes.

src/promo.js, ligne 1 — question
Les codes ont-ils vocation à rester dans le code ? Si oui, un commentaire
le dirait au prochain lecteur.
```

À la fin, la relectrice soumet sa relecture avec une **décision**. GitHub en propose
trois : **Comment** (un avis sans se prononcer), **Approve** (prêt à fusionner) et
**Request changes** (des modifications sont nécessaires avant la fusion). Ici, Camille
demande des modifications.

Relire est aussi une compétence d’équipe : relire vite (les pull requests en attente
bloquent les autres), relire tout (pas seulement le premier fichier), et approuver
seulement ce que tu as compris.

## Répondre à la relecture

Sacha corrige **sur la même branche** : la pull request suit la branche, un `git push`
suffit à la mettre à jour. Elle normalise le code reçu :

```js
const CODES = { BIENVENUE10: 0.1, FIDELE20: 0.2 };

export function promoRate(code) {
  return CODES[code.trim().toUpperCase()] ?? 0;
}
```

et ajoute un test à `test/promo.test.js` :

```js

test('ignore la casse et les espaces', () => {
  assert.equal(promoRate(' bienvenue10 '), 0.1);
});
```

```bash
git commit -am "Accepte les codes en minuscules"
git push
```

```text
[feat/code-promo e6c0be5] Accepte les codes en minuscules
 2 files changed, 5 insertions(+), 1 deletion(-)
To /home/camille/equipe/serveur.git
   106bdec..e6c0be5  feat/code-promo -> feat/code-promo
```

Pendant la relecture, ajouter de **nouveaux commits** a un avantage : le relecteur voit
exactement ce qui a changé depuis son passage. Si l’équipe veut un historique propre, on
peut utiliser des commits `--fixup` et les fondre par autosquash juste avant la fusion
(leçon 2), ou laisser la plateforme écraser la branche à la fusion.

Sacha répond ensuite à chaque commentaire (« corrigé dans e6c0be5 », « bonne idée, ajouté »,
ou une explication si elle n’est pas d’accord), puis redemande une relecture. Un désaccord
se discute avec des arguments, et se tranche si besoin de vive voix : un fil de vingt
commentaires est le signe qu’une conversation directe aurait été plus efficace.

## Garder la branche à jour

Pendant ce temps, Camille a poussé sur `main` un commit qui documente les tests. La branche
de Sacha n’est plus basée sur le dernier `main`. Certaines équipes configurent leur branche
protégée pour exiger qu’une pull request soit **à jour** avant d’être fusionnée, afin que
les tests aient tourné sur le résultat réel.

Deux façons de mettre à jour, vues en leçon 1 :

- **fusionner** `origin/main` dans la branche : aucun historique réécrit, un `git push`
  normal suffit ; certaines plateformes proposent un bouton qui fait exactement cela ;
- **rebaser** la branche sur `origin/main` : historique linéaire, mais les commits sont
  réécrits, ce qui impose un envoi forcé. Acceptable **parce que la branche n’appartient
  qu’à Sacha**.

Sacha choisit le rebasage :

```bash
git fetch
git rebase origin/main
git push
```

```text
From /home/camille/equipe/serveur
   6b8d94c..ade87db  main       -> origin/main
Successfully rebased and updated refs/heads/feat/code-promo.
To /home/camille/equipe/serveur.git
 ! [rejected]        feat/code-promo -> feat/code-promo (non-fast-forward)
error: failed to push some refs to '/home/camille/equipe/serveur.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

Le refus est attendu : les commits rebasés remplacent ceux du serveur. Surtout pas de
`git pull` ici, qui fusionnerait les anciennes et les nouvelles versions des mêmes commits.
Sacha force prudemment :

```bash
git push --force-with-lease
```

```text
To /home/camille/equipe/serveur.git
 + e6c0be5...034977d feat/code-promo -> feat/code-promo (forced update)
```

Chez la relectrice, `git fetch` affiche `(forced update)` pour `origin/feat/code-promo`.
Comme Camille relit en HEAD détachée sur la branche distante, il lui suffit de refaire
`git switch --detach origin/feat/code-promo` : aucune branche locale à réparer.

## Intégrer

La pull request peut être fusionnée quand les conditions fixées par l’équipe sont
réunies : relecture(s) approuvée(s), vérifications automatiques réussies, aucun conflit,
branche à jour si c’est exigé. Le bouton de fusion des plateformes propose en général
trois stratégies, que tu as reproduites en leçon 1 :

| Stratégie (nom GitHub)     | Équivalent Git                              | Résultat sur `main`                                  |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Merge commit               | `git merge --no-ff`                         | tous les commits de la branche + un commit de fusion |
| Squash and merge           | `git merge --squash` puis `git commit`      | un seul commit qui contient toute la branche         |
| Rebase and merge           | rebasage de la branche puis avance rapide   | les commits de la branche, recréés, sans fusion      |

L’équipe en choisit une, souvent l’écrasement quand chaque pull request correspond à un
seul sujet. Camille fusionne par écrasement. En local, cela correspond à :

```bash
git fetch
git switch main
git merge --squash origin/feat/code-promo
```

Après les lignes de `git fetch` et de `git switch`, Git affiche :

```text
Updating ade87db..034977d
Fast-forward
Squash commit -- not updating HEAD
 src/promo.js       |  5 +++++
 test/promo.test.js | 15 +++++++++++++++
 2 files changed, 20 insertions(+)
 create mode 100644 src/promo.js
 create mode 100644 test/promo.test.js
```

```bash
git commit -m "Ajoute les codes promotionnels (#12)"
git push
git push origin --delete feat/code-promo
```

```text
[main 7c6f573] Ajoute les codes promotionnels (#12)
 2 files changed, 20 insertions(+)
 create mode 100644 src/promo.js
 create mode 100644 test/promo.test.js
To /home/camille/equipe/serveur.git
   ade87db..7c6f573  main -> main
To /home/camille/equipe/serveur.git
 - [deleted]         feat/code-promo
```

Le numéro `(#12)` dans le message relie le commit à la pull request ou au ticket : c’est
une convention courante, et certaines plateformes l’ajoutent d’elles-mêmes. La branche
distante est supprimée (les plateformes proposent un bouton pour le faire).

### Faire le ménage chez soi

Chez Sacha, il reste la branche locale :

```bash
git switch main
git pull
```

```text
Switched to branch 'main'
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)
From /home/camille/equipe/serveur
   ade87db..7c6f573  main       -> origin/main
Updating 6b8d94c..7c6f573
Fast-forward
 README.md          |  4 ++++
 src/promo.js       |  5 +++++
 test/promo.test.js | 15 +++++++++++++++
 3 files changed, 24 insertions(+)
 create mode 100644 src/promo.js
 create mode 100644 test/promo.test.js
```

```bash
git fetch --prune
git branch -vv
```

```text
From /home/camille/equipe/serveur
 - [deleted]         (none)     -> origin/feat/code-promo
  feat/code-promo 034977d [origin/feat/code-promo: gone] Accepte les codes en minuscules
* main            7c6f573 [origin/main] Ajoute les codes promotionnels (#12)
```

`--prune` supprime les branches de suivi dont la branche distante a disparu, et
`git branch -vv` signale `gone` pour les branches locales orphelines. Mais :

```bash
git branch -d feat/code-promo
```

```text
error: the branch 'feat/code-promo' is not fully merged.
If you are sure you want to delete it, run 'git branch -D feat/code-promo'
```

Après un écrasement, les commits de la branche ne sont **pas** dans `main` : `main`
contient un autre commit, au contenu équivalent. Git ne peut pas le savoir. Après avoir
vérifié que la pull request est bien fusionnée (sur la plateforme, ou avec
`git diff feat/code-promo main -- src/promo.js test/promo.test.js`, qui ne doit rien
afficher), `git branch -D feat/code-promo` est légitime.

### Annuler une pull request fusionnée

Si une pull request fusionnée casse `main`, on ne réécrit pas `main` : on annule par un
nouveau commit, avec `git revert` (ou `git revert -m 1` pour un commit de fusion, leçon 4).
Les plateformes proposent souvent un bouton qui prépare cette annulation dans une nouvelle
pull request.

## Étiqueter une version

Après plusieurs pull requests, l’équipe veut **publier** : déployer, annoncer, permettre aux
utilisateurs de dire « le bug apparaît en version 1.1.0 ». Une **étiquette** (_tag_) est un
nom fixe posé sur un commit. Contrairement à une branche, elle **ne bouge pas** quand on
commite.

### Étiquette annotée ou légère

Git propose deux sortes d’étiquettes :

- l’étiquette **annotée** (`git tag -a`) est un véritable objet Git, avec un auteur
  (_tagger_), une date et un message. C’est celle qu’on utilise pour les versions ;
- l’étiquette **légère** (`git tag nom`, sans `-a`) n’est qu’un nom posé sur un commit,
  sans aucune information. Elle sert pour un repère personnel et temporaire.

```bash
cd ~/equipe/camille
git pull
git tag -a v1.0.0 -m "Première version publique"
git tag
git show --no-patch v1.0.0
```

```text
v1.0.0
tag v1.0.0
Tagger: Camille Martin <camille@example.com>
Date:   Sun Apr 12 14:29:00 2026 +0100

Première version publique

commit 7c6f573009d5b647b94c3ed29531ed50d4b48168 (HEAD -> main, tag: v1.0.0, origin/main)
Author: Camille Martin <camille@example.com>
Date:   Sun Apr 12 14:27:00 2026 +0100

    Ajoute les codes promotionnels (#12)
```

La partie `tag v1.0.0 … Tagger … message` n’existe que pour une étiquette annotée. On peut
vérifier la nature d’une étiquette avec `git cat-file -t` :

```bash
git cat-file -t v1.0.0
git tag essai-local
git cat-file -t essai-local
git tag -d essai-local
```

```text
tag
commit
Deleted tag 'essai-local' (was 7c6f573)
```

`v1.0.0` est un objet `tag` ; `essai-local` désigne directement un `commit`. Sans
argument, `git tag -a` étiquette `HEAD` ; pour étiqueter un commit plus ancien, on ajoute
son empreinte : `git tag -a v0.9.0 6b8d94c -m "…"`.

### Publier les étiquettes

Piège classique : `git push` **n’envoie pas** les étiquettes.

```bash
git push
git ls-remote --tags origin
```

```text
Everything up-to-date
```

`git ls-remote --tags origin` interroge le serveur : aucune étiquette. Il faut les envoyer
explicitement :

```bash
git push origin v1.0.0
git ls-remote --tags origin
```

```text
To /home/camille/equipe/serveur.git
 * [new tag]         v1.0.0 -> v1.0.0
5cd4a56a53e3bcf651466991f4e35e872e32f88a	refs/tags/v1.0.0
7c6f573009d5b647b94c3ed29531ed50d4b48168	refs/tags/v1.0.0^{}
```

La première ligne est l’objet étiquette, la seconde (`^{}`) le commit qu’il désigne. Plus
pratique au quotidien : `git push --follow-tags` envoie les commits **et** les étiquettes
annotées qui les désignent. Les collègues récupèrent les étiquettes avec un simple
`git fetch` (`* [new tag] v1.0.0 -> v1.0.0`).

### Se repérer entre deux versions

Deux nouveaux commits plus tard (« Ajoute le comptage des articles », « Commente le cas du
code inconnu ») :

```bash
git describe
```

```text
v1.0.0-2-gdc09b1e
```

`git describe` décrit `HEAD` par rapport à la dernière étiquette annotée : 2 commits après
`v1.0.0`, sur le commit `dc09b1e` (le `g` signifie _git_). Pratique pour identifier une
version non publiée dans un rapport de bug.

Camille publie la version suivante, puis liste ce qu’elle contient, base des notes de
version :

```bash
git tag -a v1.1.0 -m "Version 1.1.0"
git push --follow-tags
git log --oneline v1.0.0..v1.1.0
```

```text
To /home/camille/equipe/serveur.git
   7c6f573..dc09b1e  main -> main
 * [new tag]         v1.1.0 -> v1.1.0
dc09b1e (HEAD -> main, tag: v1.1.0, origin/main) Commente le cas du code inconnu
9767d74 Ajoute le comptage des articles
```

`git tag -l "v1.*"` filtre les étiquettes par motif ; `git tag -n` affiche aussi la
première ligne de leur message. Pour examiner le code d’une version :
`git switch --detach v1.0.0`. Sur GitHub, les « Releases » sont construites sur ces
étiquettes : on y joint des notes de version et des fichiers à télécharger.

:::warning[Une étiquette publiée ne bouge plus]
Les autres et les outils (déploiement, gestionnaires de dépendances) se fient à ce que
`v1.0.0` désigne. Déplacer ou recréer une étiquette déjà publiée crée deux « v1.0.0 »
différentes selon les machines. Si une version publiée contient une erreur, on publie une
nouvelle version (`v1.0.1`). Supprimer une étiquette (`git tag -d v1.0.0` en local,
`git push origin --delete v1.0.0` sur le serveur) ne se fait que pour une erreur
immédiate, que personne n’a pu récupérer.
:::

## Choisir le numéro : la gestion sémantique de version

Pourquoi `v1.1.0` et pas `v1.0.1` ou `v2.0.0` ? La **gestion sémantique de version**
(_Semantic Versioning_, SemVer) est une spécification qui donne un sens à chaque partie du
numéro `MAJEUR.MINEUR.CORRECTIF` :

- **CORRECTIF** (`1.0.0` → `1.0.1`) : uniquement des corrections de bugs **rétrocompatibles**.
- **MINEUR** (`1.0.1` → `1.1.0`) : de nouvelles fonctionnalités **rétrocompatibles** ;
  le correctif repart à 0.
- **MAJEUR** (`1.1.0` → `2.0.0`) : au moins un changement **non rétrocompatible** de l’API
  publique (une fonction supprimée, un paramètre qui change de sens) ; mineur et correctif
  repartent à 0.

« Rétrocompatible » signifie que le code qui utilisait la version précédente fonctionne
toujours sans modification. Ajouter `itemCount` est une nouvelle fonctionnalité
rétrocompatible : de `1.0.0` à `1.1.0`, donc. SemVer suppose que le projet déclare une
**API publique** (les fonctions exportées, les routes d’une API web…) : c’est par rapport à
elle qu’on juge la compatibilité.

Autres règles utiles de la spécification :

- Chaque numéro s’incrémente **numériquement** : `1.9.0` → `1.10.0`.
- Une version publiée ne doit plus être modifiée : toute modification passe par une
  nouvelle version.
- Les versions `0.y.z` sont réservées au **développement initial** : tout peut changer à
  tout moment. `1.0.0` définit l’API publique.
- Une **pré-version** s’écrit avec un tiret : `1.0.0-alpha`, `1.0.0-rc.1`. Elle précède la
  version normale : `1.0.0-alpha < 1.0.0-rc.1 < 1.0.0`.

Le `v` de `v1.0.0` est une **convention** courante pour les noms d’étiquettes ; le numéro de
version SemVer proprement dit est `1.0.0`. Les équipes qui suivent la convention
_Conventional Commits_ (vue dans la compétence précédente) en tirent souvent le numéro
automatiquement : `fix:` donne un correctif, `feat:` une version mineure, et un changement
marqué comme non rétrocompatible une version majeure.

## Pièges courants

- **Une pull request fourre-tout.** Plusieurs sujets mélangés se relisent mal et
  s’annulent mal. Une pull request, un sujet.
- **Relire sans essayer.** Beaucoup de défauts ne se voient qu’en exécutant le code sur un
  cas limite.
- **Approuver ce qu’on n’a pas compris.** L’approbation engage le relecteur : pose la
  question plutôt.
- **`git pull` après un rebasage de sa propre branche.** Il fusionne les anciennes et les
  nouvelles versions des commits. Après un rebasage voulu : `git push --force-with-lease`.
- **Continuer à travailler sur une branche écrasée.** Après un « squash and merge », repars
  d’un `main` à jour sur une nouvelle branche.
- **Oublier d’envoyer les étiquettes.** `git push` ne les envoie pas : `git push origin v1.2.0`
  ou `git push --follow-tags`.
- **Étiquettes légères pour les versions.** Elles n’ont ni auteur, ni date, ni message, et
  `--follow-tags` ne les envoie pas.
- **Déplacer une étiquette publiée.** Publie une nouvelle version à la place.

## Exercices

### Exercice 1 — Relire pour de vrai

Voici une pull request « Ajoute la livraison express » dont la description tient en une
ligne : « ajout express ». La différence :

```diff
diff --git a/src/shipping.js b/src/shipping.js
--- a/src/shipping.js
+++ b/src/shipping.js
@@ -1,3 +1,7 @@
-export function shippingCost(subtotal) {
-  return subtotal >= 50 ? 0 : 4.5;
+export function shippingCost(subtotal, express) {
+  console.log('shipping', subtotal, express);
+  if (express) {
+    return 9.9;
+  }
+  return subtotal > 50 ? 0 : 4.5;
 }
```

Rédige la relecture : trois commentaires au moins, avec leur poids, et ta décision. Propose
aussi une meilleure description.

:::solution
Commentaires possibles :

```text
src/shipping.js, ligne 6 — bloquant
Le seuil passe de « >= 50 » à « > 50 » : un panier d'exactement 50 euros
paie maintenant la livraison. Ce changement n'est pas annoncé ; est-il voulu ?
Si non, revenir à >= et ajouter un test pour 50.

src/shipping.js, ligne 2 — bloquant
console.log de débogage à retirer : il écrirait dans les journaux à chaque
calcul.

tests — bloquant
Aucun test pour le mode express ni pour le seuil. Proposition : express à
9,90 quel que soit le panier, standard à 49,99 et à 50.

src/shipping.js, ligne 1 — suggestion
Un paramètre booléen « express » se lit mal à l'appel (shippingCost(30, true)).
Un objet d'options ({ express: true }) ou un mode nommé serait plus clair.

question
La livraison express reste-t-elle payante au-delà de 50 euros ? La
description devrait le dire.
```

Décision : **Request changes** (demande de modifications), à cause des points bloquants.

Description proposée : pourquoi (demande du service client), ce qui change (nouveau
paramètre, tarif express fixe), comment tester (commandes de test et exemples), points
d’attention (règle de gratuité inchangée pour la livraison standard).
:::

### Exercice 2 — Publier deux versions

Dans un dépôt d’essai avec un dépôt nu comme distant, fais trois commits, étiquette le
premier en `v0.1.0` **après coup**, le troisième en `v0.2.0`, publie les deux étiquettes, puis
vérifie depuis un second clone qu’elles sont bien arrivées. Donne la sortie de
`git describe` sur le deuxième commit.

:::solution
```bash
mkdir versions && cd versions
git init --bare serveur.git
git clone serveur.git dev && cd dev
echo "un" > a.txt && git add a.txt && git commit -m "Ajoute a.txt"
echo "deux" > b.txt && git add b.txt && git commit -m "Ajoute b.txt"
echo "trois" > c.txt && git add c.txt && git commit -m "Ajoute c.txt"
git log --oneline                                  # repérer l'empreinte du premier commit
git tag -a v0.1.0 HEAD~2 -m "Version 0.1.0"        # HEAD~2 : le premier commit
git tag -a v0.2.0 -m "Version 0.2.0"               # HEAD : le troisième commit
git push -u origin main --follow-tags              # commits et étiquettes annotées
git describe HEAD~1                                # v0.1.0-1-g<empreinte du 2e commit>

cd ..
git clone serveur.git verif && cd verif
git tag                                            # v0.1.0 et v0.2.0
git ls-remote --tags origin                        # quatre lignes : tag et ^{} pour chacune
```

Points à savoir expliquer : `HEAD~2` permet d’étiqueter un commit ancien ; `--follow-tags`
n’envoie que les étiquettes **annotées** qui désignent des commits envoyés ; un clone
récupère les étiquettes automatiquement ; `git describe` compte les commits depuis la
dernière étiquette atteignable.
:::

### Exercice 3 — Quel numéro ?

La version actuelle est `2.3.1`. Donne le numéro de la prochaine version dans chaque cas
(indépendants) :

1. On corrige un calcul de TVA erroné, sans changer aucune signature.
2. On ajoute une fonction exportée `formatPrice`.
3. On renomme la fonction exportée `subtotal` en `computeSubtotal`.
4. On ajoute un paramètre facultatif à `applyDiscount`, avec une valeur par défaut qui
   conserve l’ancien comportement, et on corrige un bug.
5. On prépare la première version candidate de la version majeure suivante.

:::solution
1. `2.3.2` : correction rétrocompatible.
2. `2.4.0` : nouvelle fonctionnalité rétrocompatible ; le correctif repart à 0.
3. `3.0.0` : le code qui appelait `subtotal` ne fonctionne plus, changement non
   rétrocompatible de l’API publique. (Une alternative courante : garder `subtotal` comme
   alias marqué obsolète en `2.4.0`, puis le supprimer en `3.0.0`.)
4. `2.4.0` : la fonctionnalité ajoutée est rétrocompatible grâce à la valeur par défaut ;
   une version mineure peut inclure des corrections.
5. `3.0.0-rc.1` (ou `3.0.0-alpha`, `3.0.0-beta.1` selon les conventions de l’équipe) :
   une pré-version, qui précède `3.0.0`.
:::

## Récapitulatif

- Une pull request se **prépare** : un sujet, une branche partie d’un `main` à jour, des
  tests qui passent, une relecture personnelle (`git diff origin/main...HEAD`).
- La **description** dit pourquoi, ce qui change, comment tester et les points d’attention ;
  elle peut fermer un ticket (`Closes #12` sur GitHub).
- **Relire**, c’est comprendre et essayer : `git fetch`, `git switch --detach
  origin/branche`, tests, cas limites. Les commentaires visent le code, expliquent et
  indiquent leur poids ; la décision est un commentaire, une approbation ou une demande de
  modifications.
- On **répond** par des commits sur la même branche et un `git push` ; on met la branche
  **à jour** par fusion de `main` ou par rebasage suivi de `git push --force-with-lease`
  (branche personnelle uniquement).
- On **intègre** selon la stratégie de l’équipe (commit de fusion, écrasement, rebasage),
  puis on supprime la branche et on fait le ménage (`git fetch --prune`, `git branch -D`
  après vérification si elle a été écrasée).
- Une **étiquette annotée** (`git tag -a v1.0.0 -m "…"`) marque une version ; elle se
  publie explicitement (`git push origin v1.0.0` ou `--follow-tags`) et ne se déplace plus.
- **SemVer** : `MAJEUR.MINEUR.CORRECTIF` ; correctif pour une correction rétrocompatible,
  mineur pour une fonctionnalité rétrocompatible, majeur pour une rupture de compatibilité.
