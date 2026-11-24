---
title: Annuler, retrouver et enquêter
summary: Choisir entre revert, reset et restore, retrouver un travail perdu avec le reflog et trouver un commit fautif avec bisect.
durationMinutes: 75
sources:
  - title: Documentation de git reset
    url: https://git-scm.com/docs/git-reset
  - title: Documentation de git revert
    url: https://git-scm.com/docs/git-revert
  - title: Documentation de git reflog
    url: https://git-scm.com/docs/git-reflog
  - title: Documentation de git bisect
    url: https://git-scm.com/docs/git-bisect
---

## Trois questions avant d’annuler

En équipe, « annuler » n’est jamais anodin : ce que tu défais peut avoir été récupéré,
testé, voire livré. Avant de taper une commande, pose-toi trois questions :

1. **Le changement est-il commité ?** Si non, seules `git restore` et `git stash`
   s’appliquent, et ce qui est jeté est perdu.
2. **Le commit est-il partagé ?** Si oui, on ne le retire pas de l’historique : on crée un
   commit qui l’annule (`git revert`). Sinon, on peut déplacer la branche (`git reset`).
3. **Sait-on quel commit est en cause ?** Si non, on enquête : `git log`, `git blame`, et
   pour une régression, `git bisect`.

La compétence « Versionner avec Git » t’a présenté `restore`, `revert`, `reset` et le
reflog sur des cas simples. Cette leçon les applique aux situations réelles d’une équipe :
commits faits sur la mauvaise branche, fusion à annuler puis à réintégrer, branche
supprimée par erreur, bug apparu « quelque part dans les vingt derniers commits ».

Comme dans les leçons précédentes, les sorties ont été obtenues avec Git 2.43 et tes
empreintes seront différentes.

## Ce que reset déplace vraiment

`git reset <commit>` déplace **la branche courante** (et donc `HEAD`) vers `<commit>`.
L’option choisit ce qui suit le mouvement :

| Mode               | Branche déplacée | Index remis à `<commit>` | Répertoire de travail remis à `<commit>` |
| ------------------ | ---------------- | ------------------------ | ---------------------------------------- |
| `--soft`           | oui              | non                      | non                                      |
| `--mixed` (défaut) | oui              | oui                      | non                                      |
| `--hard`           | oui              | oui                      | **oui** : modifications non commitées perdues |

Avec `--soft`, les différences entre l’ancienne position et la nouvelle se retrouvent
**dans l’index**, prêtes à être commitées ; avec `--mixed`, dans le répertoire de travail ;
avec `--hard`, elles disparaissent des fichiers (les commits restent récupérables par le
reflog, pas les modifications jamais commitées). Deux usages fréquents en équipe suivent.

### Cas 1 : des commits faits sur main au lieu d’une branche

Camille a oublié de créer sa branche : deux commits sur la lettre d’information sont sur son
`main` local, pas encore poussés. Pour reproduire la situation dans ton atelier `~/equipe`
(clone de Camille, sur un `main` à jour ; les sorties ci-dessous viennent d’un atelier
recréé, où `main` ne contient que le premier commit) :

```bash
printf '\n## Lettre d’information\n\nInscription depuis le pied de page.\n' >> README.md
git commit -am "Documente la lettre d’information"
printf 'export function isValidEmail(value) {\n  return value.includes("@");\n}\n' > src/newsletter.js
git add src/newsletter.js
git commit -m "Ajoute la validation de l’adresse"
git status
```

```text
On branch main
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
```

Trois commandes suffisent : poser une branche sur le travail, ramener `main` sur
`origin/main`, aller sur la branche.

```bash
git branch feat/newsletter
git reset --hard origin/main
git switch feat/newsletter
git log --oneline --graph --all
```

```text
HEAD is now at dee2d51 Ajoute le calcul du sous-total
Switched to branch 'feat/newsletter'
* a82d1ea (HEAD -> feat/newsletter) Ajoute la validation de l’adresse
* eb9f9fa Documente la lettre d’information
* dee2d51 (origin/main, main) Ajoute le calcul du sous-total
```

L’ordre est essentiel : **d’abord** l’étiquette `feat/newsletter`, qui protège les deux
commits, **ensuite** le `reset --hard`. Et le `--hard` n’est sûr que parce que
`git status` indiquait un répertoire de travail propre. Si les commits avaient déjà été
poussés sur `main`, ce serait trop tard pour cette méthode : il faudrait les annuler par
`git revert`.

### Cas 2 : regrouper ses commits locaux

Sur sa branche, Camille veut ne garder qu’un seul commit pour ces deux changements. Le
rebase interactif le permet (`fixup`) ; `reset --soft` aussi, plus directement :

```bash
git reset --soft HEAD~2
git status --short
```

```text
M  README.md
A  src/newsletter.js
```

La branche a reculé de deux commits, mais leurs modifications sont toutes **dans l’index**.
Il n’y a plus qu’à commiter :

```bash
git commit -m "Ajoute l’inscription à la lettre d’information"
```

```text
[feat/newsletter 4d81d8c] Ajoute l’inscription à la lettre d’information
 2 files changed, 7 insertions(+)
 create mode 100644 src/newsletter.js
```

Comme toute réécriture, à réserver aux commits qui n’ont pas été partagés.

## restore : agir sur des fichiers, pas sur l’historique

`git restore` ne déplace aucune branche. Il réécrit des **fichiers**, dans le répertoire de
travail (par défaut) et/ou dans l’index (`--staged`), à partir de l’index ou d’un commit
(`--source`). Deux formes utiles complètent celles que tu connais. La première combine
`--source` avec `--staged` et `--worktree`. Sur `feat/newsletter`, par exemple, pour remettre le `README.md` dans l’état de `main`,
à la fois dans l’index et sur le disque :

```bash
git restore --source=main --staged --worktree README.md
git status --short
```

```text
M  README.md
```

Le fichier est prêt à être commité dans son ancienne version : c’est une **nouvelle
modification**, l’historique n’a pas bougé. Pour revenir en arrière,
`git restore --staged --worktree README.md` le remet dans l’état de `HEAD`.

L’option `-p` (`git restore -p fichier`) te propose chaque bloc de modification un par un,
comme `git add -p` : idéal pour jeter une ligne de débogage sans perdre le reste.

## Le reflog, filet de sécurité de l’équipe

Le reflog enregistre, **sur ta machine**, chaque déplacement de `HEAD` et de chaque branche
locale. Il ne quitte jamais ton dépôt : il ne contient rien de ce que font tes collègues
chez eux.

### Le reflog d’une branche

Chaque branche a son propre journal, consultable avec `git reflog show <branche>` :

```bash
git reflog show feat/newsletter
```

```text
4d81d8c (HEAD -> feat/newsletter) feat/newsletter@{0}: commit: Ajoute l’inscription à la lettre d’information
dee2d51 (origin/main, main) feat/newsletter@{1}: reset: moving to HEAD~2
a82d1ea feat/newsletter@{2}: branch: Created from main
```

La notation `feat/newsletter@{2}` désigne « la position de la branche il y a deux
mouvements » : `git reset --hard feat/newsletter@{1}` ou `git switch -c ancienne
feat/newsletter@{2}` sont des commandes valides. On peut aussi viser une date :
`main@{yesterday}` ou `main@{2.hours.ago}`.

### Retrouver une branche supprimée

```bash
git switch main
git branch -D feat/newsletter
```

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
Deleted branch feat/newsletter (was 4d81d8c).
```

Le message donne déjà l’empreinte : `git branch feat/newsletter 4d81d8c` recrée la branche.
Si tu ne l’as plus sous les yeux, attention : le reflog **de la branche** est supprimé avec
elle. Celui de `HEAD`, lui, reste :

```bash
git reflog -4
```

```text
dee2d51 (HEAD -> main, origin/main) HEAD@{0}: checkout: moving from feat/newsletter to main
4d81d8c HEAD@{1}: commit: Ajoute l’inscription à la lettre d’information
dee2d51 (HEAD -> main, origin/main) HEAD@{2}: reset: moving to HEAD~2
a82d1ea HEAD@{3}: checkout: moving from main to feat/newsletter
```

La dernière position occupée **sur** la branche, juste avant de passer sur `main`, est
`HEAD@{1}` :

```bash
git branch feat/newsletter HEAD@{1}
```

### Annuler un rebasage ou une fusion terminés

`git rebase`, `git merge` et `git reset` enregistrent la position d’avant dans `ORIG_HEAD` :
juste après l’opération, `git reset --hard ORIG_HEAD` l’annule. Plus tard, cherche dans
`git reflog` la ligne `rebase (start)` : la ligne **juste en dessous** est la pointe de la
branche avant le rebasage.

### Les limites du reflog

- Il est **local** : il ne sauve rien sur l’ordinateur d’un collègue ni sur le serveur.
- Ses entrées **expirent** (par défaut, 90 jours, ou 30 jours pour un commit devenu
  inaccessible), puis le nettoyage automatique de Git peut supprimer les commits orphelins.
- Il ne contient que des **commits** : une modification jamais commitée, jetée par
  `git restore` ou `git reset --hard`, est perdue. Commiter souvent, même sur une branche
  qu’on nettoiera plus tard, est la meilleure assurance.

## revert en équipe

### Annuler plusieurs commits

`git revert` accepte une **plage** : `git revert --no-edit HEAD~2..HEAD` crée un commit
d’annulation pour chacun des deux derniers commits, en commençant par le plus récent. Si
tu préfères **un seul** commit d’annulation,
ajoute `--no-commit` : Git prépare toutes les annulations dans l’index, puis tu commites
une fois avec un message qui explique pourquoi.

```bash
git revert --no-commit HEAD~2..HEAD
git status --short
git commit -m "Annule l'export CSV, qui corrompt les accents"
```

`git status --short` montre alors l’ensemble des modifications inverses prêtes à être
commitées.

### Annuler une fusion

La branche `feat/newsletter` est relue, puis intégrée dans `main` par un commit de fusion
et poussée :

```bash
git switch main
git merge --no-ff --no-edit feat/newsletter
git push
git log --oneline --graph -4
```

On découvre aussitôt qu’elle casse l’inscription : il faut la retirer de `main` tout de
suite. Le graphe au moment de la décision :

```text
*   2a80b69 (HEAD -> main, origin/main) Merge branch 'feat/newsletter'
|\
| * 4d81d8c (feat/newsletter) Ajoute l’inscription à la lettre d’information
|/
* dee2d51 Ajoute le calcul du sous-total
```

```bash
git revert HEAD
```

```text
error: commit 2a80b697b049ec5d4773070a481d6c686c6a99b6 is a merge but no -m option was given.
fatal: revert failed
```

Un commit de fusion a **deux parents** : annuler « ses changements » n’a de sens que par
rapport à l’un d’eux. L’option `-m 1` désigne le premier parent, c’est-à-dire `main` avant
la fusion : on annule tout ce que la branche fusionnée a apporté.

```bash
git revert -m 1 --no-edit HEAD
git show --stat HEAD
```

```text
[main 45490a2] Revert "Merge branch 'feat/newsletter'"
 Date: Fri Mar 20 10:54:40 2026 +0100
 2 files changed, 7 deletions(-)
 delete mode 100644 src/newsletter.js
commit 45490a205efc38d3c49705e7e6d34b95ef472ebe (HEAD -> main)
Author: Camille Martin <camille@example.com>
Date:   Fri Mar 20 10:54:40 2026 +0100

    Revert "Merge branch 'feat/newsletter'"

    This reverts commit 2a80b697b049ec5d4773070a481d6c686c6a99b6, reversing
    changes made to dee2d51ca882a829990cf453617707f00ed92c4f.

 README.md         | 4 ----
 src/newsletter.js | 3 ---
 2 files changed, 7 deletions(-)
```

On pousse ce commit (`git push`) : `main` est réparée, sans réécriture. C’est aussi le
principe du bouton « Revert » que GitHub propose sur une pull request fusionnée : il
prépare le commit d’annulation dans une nouvelle pull request, qu’il reste à fusionner.

### Réintégrer la branche après correction : annuler l’annulation

Camille corrige sa branche par un nouveau commit :

```bash
git switch feat/newsletter
printf 'export function normalizeEmail(value) {\n  return value.trim().toLowerCase();\n}\n' >> src/newsletter.js
git commit -am "Normalise l’adresse avant validation"
git switch main
```

Piège : si elle fusionne maintenant `feat/newsletter` dans `main`, Git considère que le
commit `4d81d8c` est **déjà fusionné** (il est dans l’historique de `main`), et
n’apporte que le nouveau commit. Les changements annulés ne reviennent pas ; selon les
fichiers touchés, la fusion se termine sans erreur avec un code incomplet, ou produit des
conflits incompréhensibles.

La bonne procédure : **annuler l’annulation**, puis fusionner la suite.

```bash
git revert --no-edit 45490a2
git merge --no-ff --no-edit feat/newsletter
git log --oneline --graph -8
```

```text
[main 2fb73e0] Reapply "Merge branch 'feat/newsletter'"
 Date: Fri Mar 20 10:56:40 2026 +0100
 2 files changed, 7 insertions(+)
 create mode 100644 src/newsletter.js
Merge made by the 'ort' strategy.
 src/newsletter.js | 3 +++
 1 file changed, 3 insertions(+)
*   c80010e (HEAD -> main) Merge branch 'feat/newsletter'
|\
| * b265379 (feat/newsletter) Normalise l’adresse avant validation
* | 2fb73e0 Reapply "Merge branch 'feat/newsletter'"
* | 45490a2 (origin/main) Revert "Merge branch 'feat/newsletter'"
* | 2a80b69 Merge branch 'feat/newsletter'
|\|
| * 4d81d8c Ajoute l’inscription à la lettre d’information
|/
* dee2d51 Ajoute le calcul du sous-total
```

Depuis Git 2.43, l’annulation d’une annulation est intitulée `Reapply "…"` ; les versions
précédentes produisent `Revert "Revert …"`. Le graphe raconte toute l’histoire : fusion,
annulation, réapplication, correction.

Si une annulation entre en conflit (le code a évolué depuis le commit annulé), `git revert`
s’arrête comme une fusion : résous, `git add`, puis `git revert --continue`, ou abandonne
avec `git revert --abort`.

## Trouver le commit fautif avec git bisect

Un client signale qu’un panier de trois articles à 0,29 € coûte 0,86 € au lieu de 0,87 €.
La version d’il y a deux semaines était juste. Entre les deux : douze commits, dont aucun
ne parle d’arrondi… en apparence. Les lire un par un serait long ; `git bisect` fait une
**recherche dichotomique** : il te place au milieu de l’intervalle, tu dis « bon » ou
« mauvais », il coupe l’intervalle en deux, et recommence. Pour 12 commits, 3 ou 4 tests
suffisent ; pour 1 000 commits, une dizaine.

### Préparer l’enquête

Ce script crée le dépôt de l’enquête dans `~/enquete` :

```bash
#!/usr/bin/env bash
# bisect.sh — crée un dépôt de douze commits dont l'un introduit une régression
set -e
mkdir ~/enquete
cd ~/enquete
git init
git config user.name "Camille Martin"
git config user.email "camille@example.com"
mkdir src
printf '{\n  "type": "module"\n}\n' > package.json
printf '# Boutique\n\nCalcul du panier de la boutique en ligne.\n' > README.md
cat > src/cart.js <<'JS'
export function subtotal(items) {
  const sum = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return Math.round(sum * 100) / 100;
}
JS
save() { git add -A && git commit -q -m "$1"; }
save "Initialise la boutique"
printf '\nexport function itemCount(items) {\n  return items.reduce((count, item) => count + item.quantity, 0);\n}\n' >> src/cart.js
save "Ajoute le comptage des articles"
cat > src/discount.js <<'JS'
export function applyDiscount(amount, rate) {
  return Math.round((amount - amount * rate) * 100) / 100;
}
JS
save "Ajoute la remise"
printf '\n## Remise\n\nLa remise se calcule sur le sous-total.\n' >> README.md
save "Documente la remise"
printf 'export function shippingCost(subtotal) {\n  return subtotal >= 50 ? 0 : 4.5;\n}\n' > src/shipping.js
save "Ajoute les frais de livraison"
printf 'export function roundCents(amount) {\n  return Math.floor(amount * 100) / 100;\n}\n' > src/money.js
cat > src/cart.js <<'JS'
import { roundCents } from './money.js';

export function subtotal(items) {
  const sum = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return roundCents(sum);
}

export function itemCount(items) {
  return items.reduce((count, item) => count + item.quantity, 0);
}
JS
cat > src/discount.js <<'JS'
import { roundCents } from './money.js';

export function applyDiscount(amount, rate) {
  return roundCents(amount - amount * rate);
}
JS
save "Factorise l’arrondi au centime"
printf '\n## Livraison\n\nGratuite à partir de 50 euros.\n' >> README.md
save "Documente les frais de livraison"
printf 'export function withVat(amount, rate = 0.2) {\n  return amount * (1 + rate);\n}\n' > src/tax.js
save "Ajoute le calcul TTC"
sed -i.bak 's/se calcule/est calculée/' README.md && rm README.md.bak
save "Reformule la documentation de la remise"
printf "export const FREE_SHIPPING_THRESHOLD = 50;\n" > src/config.js
save "Ajoute la configuration de la livraison"
printf "export function formatPrice(amount) {\n  return amount.toFixed(2).replace('.', ',') + ' €';\n}\n" > src/format.js
save "Ajoute le formatage des prix"
printf 'Code sous licence MIT.\n' > LICENSE
save "Ajoute la licence"
git log --oneline
```

Lance `bash bisect.sh`, puis place-toi dans `~/enquete` :

```text
72434e6 (HEAD -> main) Ajoute la licence
e6bdf8d Ajoute le formatage des prix
0d0e9e9 Ajoute la configuration de la livraison
45a0db8 Reformule la documentation de la remise
27be878 Ajoute le calcul TTC
0fcccdf Documente les frais de livraison
6a2049a Factorise l’arrondi au centime
67ebf69 Ajoute les frais de livraison
d0b99a8 Documente la remise
751cc31 Ajoute la remise
7a5af6d Ajoute le comptage des articles
ae72682 Initialise la boutique
```

Évidemment, ici le titre du commit fautif saute aux yeux ; dans un vrai projet, il
s’appellerait peut-être « Nettoie le code » au milieu de cinquante autres.

Avant tout, il faut un **moyen fiable de dire si un commit est bon**. Crée, à la racine du
dépôt, le fichier `check-rounding.mjs` (que tu ne commites pas) :

```js
import { subtotal } from './src/cart.js';

const result = subtotal([{ price: 0.29, quantity: 3 }]);
console.log(`subtotal = ${result}`);
process.exitCode = result === 0.87 ? 0 : 1;
```

```bash
node check-rounding.mjs
```

```text
subtotal = 0.86
```

Le script affiche le résultat et se termine avec le code 0 si le calcul est juste, 1 sinon.

### Une bissection à la main

```bash
git bisect start
git bisect bad                 # le commit actuel est mauvais
git bisect good ae72682        # le premier commit était bon
```

```text
status: waiting for both good and bad commits
status: waiting for good commit(s), bad commit known
Bisecting: 5 revisions left to test after this (roughly 3 steps)
[6a2049a0bf208237f4b54db7113f9cd27a4bf7e3] Factorise l’arrondi au centime
```

Git a extrait un commit au milieu de l’intervalle (en HEAD détachée). Tu testes, puis tu
donnes le verdict :

```bash
node check-rounding.mjs        # subtotal = 0.86
git bisect bad
```

```text
Bisecting: 2 revisions left to test after this (roughly 1 step)
[751cc313eee749e52a662fbce93d76f66dc0b2a8] Ajoute la remise
```

```bash
node check-rounding.mjs        # subtotal = 0.87
git bisect good
```

```text
Bisecting: 0 revisions left to test after this (roughly 1 step)
[67ebf690deb76ab4b47b174c089dd325878d580d] Ajoute les frais de livraison
```

```bash
node check-rounding.mjs        # subtotal = 0.87
git bisect good
```

```text
6a2049a0bf208237f4b54db7113f9cd27a4bf7e3 is the first bad commit
commit 6a2049a0bf208237f4b54db7113f9cd27a4bf7e3
Author: Camille Martin <camille@example.com>
Date:   Tue Nov 24 10:21:37 2026 +0000

    Factorise l’arrondi au centime

 src/cart.js     | 4 +++-
 src/discount.js | 4 +++-
 src/money.js    | 3 +++
 3 files changed, 9 insertions(+), 2 deletions(-)
 create mode 100644 src/money.js
```

Trois tests pour onze commits candidats. `git bisect log` récapitule tes verdicts (utile
pour les partager ou rejouer l’enquête). Termine **toujours** par :

```bash
git bisect reset
```

```text
Previous HEAD position was 67ebf69 Ajoute les frais de livraison
Switched to branch 'main'
```

Tu reviens sur ta branche, dans l’état d’avant l’enquête. Si tu te trompes de verdict, la
suite de la recherche sera fausse : `git bisect reset` et recommence.

### Automatiser avec git bisect run

Puisque le script de vérification donne son verdict par son **code de sortie**, Git peut
l’exécuter lui-même à chaque étape :

```bash
git bisect start HEAD ae72682      # mauvais commit, puis bon commit
git bisect run node check-rounding.mjs
```

```text
Bisecting: 5 revisions left to test after this (roughly 3 steps)
[6a2049a0bf208237f4b54db7113f9cd27a4bf7e3] Factorise l’arrondi au centime
running 'node' 'check-rounding.mjs'
subtotal = 0.86
Bisecting: 2 revisions left to test after this (roughly 1 step)
[751cc313eee749e52a662fbce93d76f66dc0b2a8] Ajoute la remise
running 'node' 'check-rounding.mjs'
subtotal = 0.87
Bisecting: 0 revisions left to test after this (roughly 1 step)
[67ebf690deb76ab4b47b174c089dd325878d580d] Ajoute les frais de livraison
running 'node' 'check-rounding.mjs'
subtotal = 0.87
6a2049a0bf208237f4b54db7113f9cd27a4bf7e3 is the first bad commit
commit 6a2049a0bf208237f4b54db7113f9cd27a4bf7e3
Author: Camille Martin <camille@example.com>
Date:   Tue Nov 24 10:21:37 2026 +0000

    Factorise l’arrondi au centime

 src/cart.js     | 4 +++-
 src/discount.js | 4 +++-
 src/money.js    | 3 +++
 3 files changed, 9 insertions(+), 2 deletions(-)
 create mode 100644 src/money.js
bisect found first bad commit
```

La règle des codes de sortie, définie par la documentation de `git bisect run` :

- **0** : le commit est bon ;
- **1 à 127, sauf 125** : le commit est mauvais ;
- **125** : impossible de tester ce commit (il ne compile pas, un fichier manque…), Git le
  saute ;
- un autre code (par exemple un plantage du script au-delà de 127) **interrompt** la
  recherche.

Ici, un `node --test` sur un fichier de test non commité fonctionnerait aussi, puisque le
lanceur de tests de Node sort avec le code 1 en cas d’échec. Deux précautions : le script
de vérification ne doit **pas** être suivi par Git (sinon il changerait d’un commit à
l’autre, voire disparaîtrait), et il doit vérifier **un seul** symptôme précis.

Une fois le coupable trouvé, `git show 6a2049a` montre la cause : `Math.floor` au lieu de
`Math.round` dans `roundCents`. La correction est un **nouveau commit** (on ne réécrit pas un
`main` partagé), idéalement accompagné d’un test qui aurait détecté la régression.

## Pièges courants

- **`git reset --hard` avec du travail non commité.** Lance toujours `git status` avant ;
  en cas de doute, `git stash` ou un commit temporaire.
- **`reset` sur un commit déjà poussé.** Le prochain `push` sera refusé ; le forcer
  réécrirait l’historique partagé. Sur `main`, c’est `revert`.
- **Refusionner une branche dont la fusion a été annulée.** Sans annuler d’abord
  l’annulation, une partie du travail ne revient pas.
- **Oublier `git bisect reset`.** Tu restes en HEAD détachée sur un vieux commit ; tes
  prochains commits n’appartiendraient à aucune branche.
- **Un script de bissection suivi par Git ou qui teste trop de choses.** Il doit être hors
  de l’historique et ne répondre qu’à la question posée.
- **Compter sur le reflog d’un collègue.** Chaque reflog est local : ce qui a disparu du
  serveur ne se récupère que chez quelqu’un qui possède encore les commits.

## Exercices

### Exercice 1 — Choisir l’outil

Pour chaque situation, donne la ou les commandes et dis si quelque chose peut être perdu :

1. Ta fusion de `feat/export` dans `main`, poussée il y a une heure, casse la production.
2. Tu as fait trois commits sur `main` au lieu de `fix/accents` ; rien n’est poussé.
3. Tu as supprimé `fix/accents` avec `-D` hier ; le terminal a été fermé depuis.
4. Le fichier `src/tax.js` doit revenir à sa version d’il y a cinq commits, le reste du
   projet ne doit pas bouger.
5. Les tests de calcul TTC échouent sur `main` ; ils passaient sur le commit `27be878`.

:::solution
1. `git revert -m 1 <commit de fusion>` puis `git push`. Rien n’est perdu : l’annulation
   est un nouveau commit. Pour réintégrer la branche plus tard, annuler d’abord ce revert.
2. `git branch fix/accents`, puis `git reset --hard origin/main` (après avoir vérifié avec
   `git status` que le répertoire de travail est propre), puis `git switch fix/accents`.
   Rien n’est perdu : les commits sont protégés par la nouvelle étiquette.
3. `git reflog` : repérer la dernière ligne où `HEAD` était sur `fix/accents` (par exemple
   `checkout: moving from fix/accents to main` ; l’empreinte de cette ligne est la
   position **après** le départ, celle de la ligne juste en dessous est la pointe de
   `fix/accents`), puis `git branch fix/accents <empreinte>`. Possible tant que l’entrée
   n’a pas expiré.
4. `git restore --source=HEAD~5 --staged --worktree src/tax.js`, puis un commit qui
   explique pourquoi. L’historique est intact ; la version actuelle du fichier reste dans
   les commits précédents.
5. `git bisect start HEAD 27be878` puis `git bisect run` avec un script ou un fichier de
   test non suivi qui vérifie le calcul TTC ; `git bisect reset` à la fin. Rien ne change
   dans le dépôt.
:::

### Exercice 2 — Réparer une erreur de manipulation

Dans `~/enquete`, crée une branche `essai`, fais-y deux commits, reviens sur `main` et
supprime la branche avec `git branch -D essai`. Ensuite, sur `main`, lance
`git reset --hard HEAD~3`. Restaure la branche `essai` **et** l’état de `main`, sans
utiliser les empreintes affichées par `git branch -D`.

:::solution
```bash
cd ~/enquete
git switch -c essai
echo "a" > essai.txt && git add essai.txt && git commit -m "Ajoute un essai"
echo "b" >> essai.txt && git commit -am "Complète l'essai"
git switch main
git branch -D essai
git reset --hard HEAD~3

git reflog -6
# HEAD@{0}: reset: moving to HEAD~3
# HEAD@{1}: checkout: moving from essai to main      <- position de main avant le reset
# HEAD@{2}: commit: Complète l'essai                  <- pointe de la branche essai
# HEAD@{3}: commit: Ajoute un essai
# …
git branch essai HEAD@{2}
git reset --hard HEAD@{1}
git log --oneline -1          # 72434e6 … Ajoute la licence (ton empreinte)
git log --oneline -2 essai    # les deux commits de l'essai
```

Attention à l’ordre : après `git reset --hard HEAD@{1}`, une nouvelle ligne s’ajoute en
haut du reflog et tous les numéros se décalent d’un cran. Recrée donc la branche `essai`
**avant**, ou utilise les empreintes lues dans le reflog plutôt que les numéros. Le reflog
de la branche `essai` a disparu avec elle, mais celui de `HEAD` a tout gardé.
:::

### Exercice 3 — Bissection avec des commits impossibles à tester

Dans `~/enquete`, on veut vérifier la fonction `formatPrice` de `src/format.js` :
`formatPrice(12.5)` doit renvoyer `12,50 €`. Ce fichier n’existe que dans les deux
derniers commits. Écris un script de vérification utilisable avec `git bisect run` qui
**saute** les commits où le fichier n’existe pas, et explique ce que Git conclura.

:::solution
Script `check-format.sh`, non suivi, à la racine du dépôt :

```bash
#!/usr/bin/env bash
# Code 125 : commit impossible à tester, Git le saute
if [ ! -f src/format.js ]; then
  exit 125
fi
node -e "import('./src/format.js').then((m) => { process.exitCode = m.formatPrice(12.5) === '12,50 €' ? 0 : 1; })"
```

```bash
git bisect start HEAD ae72682   # mauvais, puis bon (empreintes chez toi)
git bisect run bash check-format.sh
git bisect reset
```

Ici, `formatPrice` est **correcte** : le script renvoie 0 même sur `HEAD`, que tu as
pourtant déclaré mauvais. Git saute un à un tous les commits où `src/format.js` n’existe
pas (code 125), teste « Ajoute le formatage des prix », le trouve bon, et affiche que le
premier commit mauvais (`… is the first bad commit`) est « Ajoute la licence », c’est-à-dire
`HEAD`. Le seul commit « mauvais » restant est celui que **tu** as déclaré mauvais au départ.
La conclusion est absurde (une licence ne casse pas le formatage) parce que la prémisse
était fausse. La leçon : **vérifie d’abord** ton script à la main sur les deux bornes, il
doit répondre « mauvais » (code non nul) sur le commit déclaré mauvais et « bon » (0) sur
le commit déclaré bon. Sinon, `git bisect run` désigne un coupable sans aucune valeur.
:::

## Récapitulatif

- Trois questions avant d’annuler : est-ce commité ? partagé ? sait-on quel commit ?
- `git reset` déplace la branche : `--soft` garde les changements dans l’index, `--mixed`
  dans le répertoire de travail, `--hard` les efface. Réservé à ce qui n’est pas partagé.
- Commits faits sur `main` par erreur : `git branch nouvelle`, `git reset --hard
  origin/main`, `git switch nouvelle`.
- `git restore --source=<commit> --staged --worktree fichier` ramène un fichier sans
  toucher à l’historique ; `-p` choisit bloc par bloc.
- `git revert` annule sans réécrire : plages (`A..B`, `--no-commit`), fusions (`-m 1`).
  Pour réintégrer une branche dont la fusion a été annulée, on annule d’abord l’annulation.
- Le reflog (de `HEAD` et de chaque branche) retrouve branches supprimées, rebasages et
  resets ; il est local, expire, et ne contient que des commits.
- `git bisect` trouve le commit fautif par dichotomie ; `git bisect run script` automatise
  avec les codes de sortie (0 bon, 1 à 127 mauvais, 125 sauté). Toujours finir par
  `git bisect reset`.
