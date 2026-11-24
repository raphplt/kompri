---
title: Résoudre des conflits de fusion et de rebasage
summary: Méthode complète pour des conflits sur plusieurs fichiers, pendant une fusion comme pendant un rebasage.
durationMinutes: 70
sources:
  - title: Pro Git — Fusions avancées (en français)
    url: https://git-scm.com/book/fr/v2/Utilitaires-Git-Fusion-avanc%C3%A9e
  - title: Documentation de git merge (section « How conflicts are presented »)
    url: https://git-scm.com/docs/git-merge
  - title: Documentation de git rebase
    url: https://git-scm.com/docs/git-rebase
  - title: Documentation de git rerere
    url: https://git-scm.com/docs/git-rerere
---

## Au-delà du conflit simple

Tu as déjà résolu un conflit : une ligne modifiée des deux côtés, des marqueurs à retirer,
`git add`, `git commit`. Dans un vrai projet, une branche qui a pris du retard rencontre
plutôt **plusieurs conflits à la fois**, dans plusieurs fichiers, et de natures
différentes : deux modifications de la même zone, un fichier modifié d’un côté et supprimé
de l’autre… Et si tu rebases au lieu de fusionner, les conflits arrivent **commit par
commit**, avec un vocabulaire qui semble inversé.

Cette leçon te donne une méthode qui marche à chaque fois : **comprendre l’état** avec
`git status`, **comprendre chaque conflit** en voyant les trois versions, **décider** du
contenu, **vérifier**, puis **poursuivre** ou **abandonner** l’opération.

## L’atelier : une branche en retard

Sacha a créé `feat/format-fr` pour afficher les prix à la française (`12,50 €`). Pendant ce
temps, Camille a modifié la même fonction sur `main` pour accepter une devise, a supprimé
un vieux fichier que Sacha avait retouché, et a reformulé la même phrase du `README.md`.

Pour obtenir exactement cette situation, enregistre ce script sous le nom `conflits.sh`,
puis lance `bash conflits.sh`. Il crée tout dans un nouveau dossier `~/conflits`
(supprime-le avant de relancer le script).

```bash
#!/usr/bin/env bash
# conflits.sh — prépare un atelier avec des conflits sur plusieurs fichiers
set -e
mkdir ~/conflits
cd ~/conflits
git init --bare serveur.git
git clone serveur.git camille
cd camille
git config user.name "Camille Martin"
git config user.email "camille@example.com"
mkdir src
printf '# Boutique\n\nCalcul du panier de la boutique en ligne.\n\n## Installation\n\nnpm install\n' > README.md
printf '{\n  "type": "module"\n}\n' > package.json
cat > src/format.js <<'JS'
export function formatPrice(amount) {
  return amount.toFixed(2) + ' €';
}
JS
cat > src/legacy-format.js <<'JS'
// Ancien formatage, conservé pour les vieilles pages
export function oldFormat(amount) {
  return amount + ' euros';
}
JS
cat > src/cart.js <<'JS'
export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
JS
git add .
git commit -m "Initialise la boutique"
git push -u origin main

# Sacha : une branche qui formate les prix à la française
cd ..
git clone serveur.git sacha
cd sacha
git config user.name "Sacha Bernard"
git config user.email "sacha@example.com"
git switch -c feat/format-fr
sed -i.bak "s/toFixed(2) + ' €'/toFixed(2).replace('.', ',') + ' €'/" src/format.js
sed -i.bak "s/return amount + ' euros'/return String(amount).replace('.', ',') + ' euros'/" src/legacy-format.js
rm src/*.bak
git commit -am "Formate les prix à la française"
sed -i.bak 's/en ligne\.$/en ligne, prix au format français./' README.md
rm README.md.bak
git commit -am "Documente le format des prix"

# Camille : pendant ce temps, main avance
cd ../camille
cat > src/format.js <<'JS'
export function formatPrice(amount, currency = '€') {
  return amount.toFixed(2) + ' ' + currency;
}
JS
git rm src/legacy-format.js
git commit -am "Ajoute la devise au formatage et supprime l'ancien formatage"
sed -i.bak 's/^Calcul du panier de la/Calcul du panier et des prix de la/' README.md
rm README.md.bak
printf '\nexport function itemCount(items) {\n  return items.reduce((count, item) => count + item.quantity, 0);\n}\n' >> src/cart.js
git commit -am "Ajoute le comptage des articles et précise le README"
git push

# Retour chez Sacha
cd ../sacha
git fetch
echo "Atelier prêt dans ~/conflits/sacha"
```

`set -e` arrête le script à la première commande en échec. Les `sed -i.bak … && rm` font
une modification ciblée qui fonctionne sous Linux comme sous macOS. Place-toi ensuite dans
le clone de Sacha :

```bash
cd ~/conflits/sacha
git log --oneline --graph --all
```

```text
* 70925c6 (origin/main, origin/HEAD) Ajoute le comptage des articles et précise le README
* da5bf81 Ajoute la devise au formatage et supprime l'ancien formatage
| * 13287f7 (HEAD -> feat/format-fr) Documente le format des prix
| * b888dc7 Formate les prix à la française
|/
* f4c5259 (main) Initialise la boutique
```

Comme toujours, tes empreintes seront différentes.

## Conflits de fusion sur plusieurs fichiers

Sacha met sa branche à jour en fusionnant `origin/main` :

```bash
git merge origin/main
```

```text
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Auto-merging src/format.js
CONFLICT (content): Merge conflict in src/format.js
CONFLICT (modify/delete): src/legacy-format.js deleted in origin/main and modified in HEAD.  Version HEAD of src/legacy-format.js left in tree.
Automatic merge failed; fix conflicts and then commit the result.
```

Trois conflits, de deux types :

- `CONFLICT (content)` : les deux côtés ont modifié la même zone d’un fichier ;
- `CONFLICT (modify/delete)` : un côté a modifié un fichier que l’autre a supprimé. Git a
  laissé la version modifiée dans le répertoire de travail, sans marqueurs : c’est à toi de
  dire si le fichier doit exister.

### Étape 1 : faire l’inventaire avec git status

```bash
git status
```

```text
On branch feat/format-fr
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Changes to be committed:
	modified:   src/cart.js

Unmerged paths:
  (use "git add/rm <file>..." as appropriate to mark resolution)
	both modified:   README.md
	both modified:   src/format.js
	deleted by them: src/legacy-format.js
```

Lis cette sortie en deux parties :

- **Changes to be committed** : ce que Git a fusionné **seul**, sans conflit (le comptage
  des articles ajouté par Camille dans `src/cart.js`). C’est déjà dans l’index.
- **Unmerged paths** : ce qui attend ta décision. `both modified` = modifié des deux côtés ;
  `deleted by them` = supprimé par « eux », c’est-à-dire par la branche que tu fusionnes
  (`origin/main`), alors que « nous » (`HEAD`, ta branche) l’avons modifié.

En version courte, `git status --short` marque les fichiers en conflit d’un `U`
(_unmerged_) : `UU README.md`, `UU src/format.js`, `UD src/legacy-format.js`. Pour obtenir
seulement la liste des fichiers à traiter :

```bash
git diff --name-only --diff-filter=U
```

```text
README.md
src/format.js
src/legacy-format.js
```

### Étape 2 : comprendre chaque conflit

```bash
cat src/format.js
```

```js
<<<<<<< HEAD
export function formatPrice(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €';
=======
export function formatPrice(amount, currency = '€') {
  return amount.toFixed(2) + ' ' + currency;
>>>>>>> origin/main
}
```

La partie `HEAD` est la version de ta branche, la partie `origin/main` celle que tu
fusionnes. Mais il manque une information essentielle : **qu’y avait-il avant ?** Sans
l’ancêtre commun, impossible de savoir qui a changé quoi. Active le style de conflit à trois
versions, puis recrée les marqueurs de ce fichier :

```bash
git config --global merge.conflictStyle zdiff3
git checkout --conflict=zdiff3 src/format.js
cat src/format.js
```

```text
Recreated 1 merge conflict
```

```js
<<<<<<< ours
export function formatPrice(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €';
||||||| base
export function formatPrice(amount) {
  return amount.toFixed(2) + ' €';
=======
export function formatPrice(amount, currency = '€') {
  return amount.toFixed(2) + ' ' + currency;
>>>>>>> theirs
}
```

Maintenant tout est lisible : la **base** (l’ancêtre commun) formatait avec un point et
l’euro en dur. **Ours** (Sacha) a remplacé le point par une virgule ; **theirs** (Camille) a
ajouté un paramètre `currency`. Les deux intentions sont compatibles : la bonne résolution
n’est ni l’une ni l’autre, mais **les deux**. `git checkout --conflict=…` ne sert qu’à
réécrire les marqueurs d’un fichier encore en conflit ; avec le réglage global, les
prochains conflits afficheront directement la section `|||||||`. (`zdiff3` existe depuis
Git 2.35 ; avec une version plus ancienne, utilise `diff3`.)

Tu peux aussi afficher chaque version complète d’un fichier en conflit, grâce aux numéros
d’étape de l’index : `:1:` pour la base, `:2:` pour « ours », `:3:` pour « theirs ».

```bash
git show :1:src/format.js
```

```js
export function formatPrice(amount) {
  return amount.toFixed(2) + ' €';
}
```

Le `README.md` présente un conflit de même nature sur une seule phrase :

```text
# Boutique

<<<<<<< HEAD
Calcul du panier de la boutique en ligne, prix au format français.
=======
Calcul du panier et des prix de la boutique en ligne.
>>>>>>> origin/main

## Installation

npm install
```

Enfin, `src/legacy-format.js` : Camille l’a supprimé parce que plus rien ne l’utilise ; la
modification de Sacha n’a donc plus d’objet. Avant de trancher un conflit
modification/suppression, vérifie **pourquoi** le fichier a été supprimé (`git log
origin/main -- src/legacy-format.js` montre le commit et son message).

### Étape 3 : décider et marquer comme résolu

Pour chaque fichier, écris le contenu final, sans aucun marqueur. `src/format.js` combine
les deux intentions :

```js
export function formatPrice(amount, currency = '€') {
  return amount.toFixed(2).replace('.', ',') + ' ' + currency;
}
```

Le `README.md` aussi (une seule ligne change ; le reste du fichier ne bouge pas) :

```text
Calcul du panier et des prix de la boutique en ligne, prix au format français.
```

Avant de marquer quoi que ce soit, cherche les marqueurs oubliés :

```bash
git diff --check
```

Aucune sortie : il n’en reste pas. Sinon, tu obtiendrais par exemple
`src/format.js:1: leftover conflict marker`. Marque ensuite chaque fichier. Pour un conflit
de contenu, `git add` ; pour un conflit modification/suppression, `git add` si le fichier
doit rester, `git rm` s’il doit disparaître :

```bash
git add src/format.js README.md
git rm src/legacy-format.js
git status
```

```text
rm 'src/legacy-format.js'
On branch feat/format-fr
All conflicts fixed but you are still merging.
  (use "git commit" to conclude merge)

Changes to be committed:
	modified:   README.md
	modified:   src/cart.js
	modified:   src/format.js
	deleted:    src/legacy-format.js
```

### Étape 4 : vérifier que le code fonctionne

Une résolution de conflit est du **code nouveau** que personne n’a encore relu. Git ne
vérifie rien : `git add` accepte même un fichier qui contient encore des marqueurs, d’où
le `git diff --check` ci-dessus. Il ne vérifie pas non plus la cohérence du code. Teste
avant de conclure :

```bash
node -e "import('./src/format.js').then((m) => console.log(m.formatPrice(12.5)))"
```

```text
12,50 €
```

Dans un vrai projet, lance la suite de tests complète (`npm test`).

### Étape 5 : conclure ou abandonner

```bash
git merge --continue
```

Git ouvre l’éditeur avec le message `Merge remote-tracking branch 'origin/main' into
feat/format-fr`, suivi en commentaire de la liste des fichiers qui étaient en conflit.
Enregistre et ferme :

```text
[feat/format-fr 89a3444] Merge remote-tracking branch 'origin/main' into feat/format-fr
```

`git merge --continue` équivaut ici à `git commit`, mais refuse de s’exécuter si aucune
fusion n’est en cours : c’est une petite sécurité. À n’importe quel moment **avant** cette
étape, `git merge --abort` remet la branche et les fichiers dans leur état d’avant la
fusion.

## Conflits pendant un rebasage

Reprenons la même situation, mais Sacha préfère rebaser sa branche, qui n’appartient qu’à
elle. Pour repartir de l’état initial, supprime `~/conflits` et relance le script, ou
annule la fusion conclue avec `git reset --hard ORIG_HEAD` (la fusion n’a pas été
poussée).

```bash
git rebase origin/main
```

```text
Auto-merging src/format.js
CONFLICT (content): Merge conflict in src/format.js
CONFLICT (modify/delete): src/legacy-format.js deleted in HEAD and modified in b888dc7 (Formate les prix à la française).  Version b888dc7 (Formate les prix à la française) of src/legacy-format.js left in tree.
error: could not apply b888dc7... Formate les prix à la française
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
Could not apply b888dc7... Formate les prix à la française
```

Première différence : le rebasage rejoue les commits **un par un**. Il s’arrête au premier,
« Formate les prix à la française », qui touche `src/format.js` et `src/legacy-format.js`.
Le `README.md` n’est pas encore concerné : il n’est modifié que par le second commit.

```bash
git status
```

```text
interactive rebase in progress; onto 70925c6
Last command done (1 command done):
   pick b888dc7 Formate les prix à la française
Next command to do (1 remaining command):
   pick 13287f7 Documente le format des prix
  (use "git rebase --edit-todo" to view and edit)
You are currently rebasing branch 'feat/format-fr' on '70925c6'.
  (fix conflicts and then run "git rebase --continue")
  (use "git rebase --skip" to skip this patch)
  (use "git rebase --abort" to check out the original branch)

Unmerged paths:
  (use "git restore --staged <file>..." to unstage)
  (use "git add/rm <file>..." as appropriate to mark resolution)
	both modified:   src/format.js
	deleted by us:   src/legacy-format.js

no changes added to commit (use "git add" and/or "git commit -a")
```

`git status` indique le commit en cours de rejeu, ceux qui restent et les trois issues
possibles. (Le mot « interactive » apparaît même pour un rebasage simple : c’est le même
mécanisme interne.)

### Attention : « ours » et « theirs » sont inversés

Regarde la dernière ligne : `deleted by us`. Pendant la fusion, c’était `deleted by them`.
Le fichier n’a pas changé de camp ; c’est le sens des mots qui a changé.

Pendant un rebasage, Git se place sur `origin/main` et y **rejoue tes commits** un par un.
Donc :

| Pendant…   | `HEAD` / « ours » / « us »                         | « theirs » / « them »          |
| ---------- | -------------------------------------------------- | ------------------------------ |
| une fusion | ta branche                                         | la branche que tu fusionnes    |
| un rebasage | la base en construction (`origin/main` + tes commits déjà rejoués) | **ton** commit en cours de rejeu |

Les marqueurs le confirment :

```bash
cat src/format.js
```

```js
<<<<<<< HEAD
export function formatPrice(amount, currency = '€') {
  return amount.toFixed(2) + ' ' + currency;
||||||| parent of b888dc7 (Formate les prix à la française)
export function formatPrice(amount) {
  return amount.toFixed(2) + ' €';
=======
export function formatPrice(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €';
>>>>>>> b888dc7 (Formate les prix à la française)
}
```

(La section `|||||||` est là parce que tu as activé `zdiff3` ; sans ce réglage, elle
n’apparaît pas.) La version de Camille est maintenant en haut, sous `HEAD` ; celle de Sacha
en bas, étiquetée par l’empreinte et le message de son commit. La base est ici le
**parent** du commit rejoué. Si Sacha résolvait ce conflit avec l’idée
« je garde ma version, donc ours », elle **jetterait son propre travail**. Retiens : pendant
un rebasage, ton travail est du côté « theirs ».

### Résoudre, continuer, recommencer

La résolution est la même que tout à l’heure : écrire la version combinée de
`src/format.js`, supprimer `src/legacy-format.js`, puis continuer :

```bash
git add src/format.js
git rm src/legacy-format.js
git rebase --continue
```

Git ouvre l’éditeur avec le message du commit rejoué, pour que tu puisses l’adapter ;
enregistre et ferme. Le premier commit est créé, puis le rebasage passe au second… et
s’arrête de nouveau :

```text
[detached HEAD aceb6b6] Formate les prix à la française
 1 file changed, 1 insertion(+), 1 deletion(-)
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
error: could not apply 13287f7... Documente le format des prix
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
Could not apply 13287f7... Documente le format des prix
```

Remarque que le commit rejoué ne modifie plus que `src/format.js` : la suppression de
`src/legacy-format.js` existe déjà dans `origin/main`, elle n’a rien à ajouter.

Pour le `README.md`, voici ce que donnent les options qui prennent **un côté entier** d’un
fichier en conflit :

```bash
git restore --theirs README.md     # pendant un rebasage : la version de TON commit
cat README.md
```

```text
# Boutique

Calcul du panier de la boutique en ligne, prix au format français.

## Installation

npm install
```

```bash
git restore --ours README.md       # pendant un rebasage : la version de la base (main)
cat README.md
```

```text
# Boutique

Calcul du panier et des prix de la boutique en ligne.

## Installation

npm install
```

Aucune des deux n’est la bonne ici : chacune efface la modification de l’autre personne.
Pour retrouver les marqueurs après ces essais :

```bash
git checkout --merge README.md
cat README.md
```

```text
Recreated 1 merge conflict
# Boutique

<<<<<<< ours
Calcul du panier et des prix de la boutique en ligne.
||||||| base
Calcul du panier de la boutique en ligne.
=======
Calcul du panier de la boutique en ligne, prix au format français.
>>>>>>> theirs

## Installation

npm install
```

Ces options servent quand un côté a **entièrement raison** pour un fichier (un fichier
généré, par exemple). Attention : elles prennent le fichier **complet** de ce côté, y compris
les zones qui n’étaient pas en conflit. On écrit donc la phrase combinée, puis :

```bash
git add README.md
git rebase --continue
git log --oneline --graph --all
```

```text
[detached HEAD e1c9913] Documente le format des prix
 1 file changed, 1 insertion(+), 1 deletion(-)
Successfully rebased and updated refs/heads/feat/format-fr.
* e1c9913 (HEAD -> feat/format-fr) Documente le format des prix
* aceb6b6 Formate les prix à la française
* 70925c6 (origin/main, origin/HEAD) Ajoute le comptage des articles et précise le README
* da5bf81 Ajoute la devise au formatage et supprime l'ancien formatage
* f4c5259 (main) Initialise la boutique
```

Historique linéaire, et chaque commit de Sacha contient maintenant sa modification
**adaptée** au nouveau code. Teste de nouveau avant de pousser.

### Les trois sorties d’un rebasage arrêté

- `git rebase --continue` : le conflit du commit courant est résolu et indexé, on passe au
  suivant.
- `git rebase --skip` : abandonner **le commit en cours** et passer au suivant. Utile
  quand ce commit n’a plus de raison d’être (par exemple, la même correction a déjà été
  intégrée dans `main`). Sinon, c’est une façon rapide de perdre du travail.
- `git rebase --abort` : tout annuler, la branche revient exactement à son état d’avant
  `git rebase`.

## Fusion ou rebasage face aux conflits

Avec une fusion, tu résous tous les conflits **une seule fois**, sur l’état final. Avec un
rebasage, tu les résous **commit par commit** : plus de travail si ta branche a beaucoup de
commits qui retouchent la même zone, mais chaque commit reste cohérent et testable.

Si tu dois résoudre plusieurs fois le même conflit (une branche rebasée chaque jour sur un
`main` qui bouge), Git peut s’en souvenir. `git config --global rerere.enabled true` active
**rerere** (_reuse recorded resolution_) : Git enregistre chaque résolution et la réapplique
automatiquement quand il rencontre exactement le même conflit. Tu dois toujours vérifier et
indexer le résultat.

Enfin, la meilleure façon de gérer les conflits reste de les **éviter** : branches courtes,
synchronisation fréquente, et un mot à l’équipe quand tu vas modifier en profondeur un
fichier très partagé.

## Pièges courants

- **`git add .` en fin de résolution sans relire.** Il indexe aussi un fichier où restent
  des marqueurs. Lance `git diff --check` avant, et indexe fichier par fichier.
- **Prendre « ours » pendant un rebasage en pensant garder son travail.** Pendant un
  rebasage, ton travail est « theirs ».
- **Résoudre sans comprendre l’autre modification.** Supprimer la partie du collègue fait
  disparaître le conflit… et son travail. Lis la base (`zdiff3`) et le message du commit
  d’en face ; demande à son auteur en cas de doute.
- **Oublier les conflits modification/suppression.** Ils n’ont pas de marqueurs : seul
  `git status` les signale (`deleted by us/them`).
- **Ne pas tester.** Un fichier sans conflit textuel peut être cassé par la combinaison des
  deux branches (une fonction renommée d’un côté, appelée sous l’ancien nom de l’autre).
- **Paniquer.** Tant que tu n’as pas conclu, `git merge --abort` ou `git rebase --abort`
  ramènent à l’état initial.

## Exercices

### Exercice 1 — Lire un état de conflit

Pendant un `git rebase origin/main`, `git status` affiche notamment :

```text
Unmerged paths:
	both modified:   src/cart.js
	deleted by them: src/old-cart.js
	both added:      src/tax.js
```

Explique chaque ligne, dis qui a fait quoi, et donne les commandes pour résoudre si l’on
veut : la version combinée pour `cart.js`, garder `old-cart.js` supprimé, et ne garder
pour `tax.js` que la version de ton commit.

:::solution
Pendant un **rebasage**, « us » est la base en construction (`origin/main` et tes commits
déjà rejoués), « them » est **ton** commit en cours de rejeu.

- `both modified: src/cart.js` : `main` et ton commit ont modifié la même zone. Tu édites
  le fichier, retires les marqueurs, puis `git add src/cart.js`.
- `deleted by them: src/old-cart.js` : **ton commit** supprime ce fichier, que `main` a
  modifié entre-temps. Pour confirmer la suppression : `git rm src/old-cart.js` (vérifie
  d’abord avec `git log origin/main -- src/old-cart.js` ce que `main` y a changé et si
  cela doit être reporté ailleurs).
- `both added: src/tax.js` : les deux côtés ont créé un fichier du même nom. Pour ne garder
  que la version de ton commit : `git restore --theirs src/tax.js` puis
  `git add src/tax.js`.

Puis `git diff --check`, les tests, et `git rebase --continue`.
:::

### Exercice 2 — Rejouer l’atelier en sens inverse

Relance `conflits.sh`. Cette fois, c’est Camille qui doit intégrer la branche de Sacha
dans `main`, par une fusion avec commit de fusion. Résous les conflits, en gardant la
suppression de `legacy-format.js`. Avant de commencer, prédis ce qu’affichera
`git status` pour `src/legacy-format.js`.

:::solution
La branche de Sacha n’a jamais été poussée par le script : il faut d’abord la publier,
puis la récupérer chez Camille.

```bash
cd ~/conflits/sacha
git push -u origin feat/format-fr
cd ~/conflits/camille
git fetch
git merge --no-ff origin/feat/format-fr
```

`git status` affiche `deleted by us: src/legacy-format.js` : cette fois, c’est **notre**
branche (`main`, celle de Camille) qui a supprimé le fichier, et la branche fusionnée
(« them », Sacha) qui l’a modifié. Pendant une fusion, « us » est toujours la branche
courante.

Résolution : mêmes contenus combinés pour `src/format.js` et `README.md`. Avec le réglage
`zdiff3`, les marqueurs d’une vraie fusion portent les noms `HEAD` (la version de Camille,
en haut), l’empreinte de l’ancêtre commun (après `|||||||`) et `origin/feat/format-fr` (la
version de Sacha, en bas). Ensuite : `git rm src/legacy-format.js`, `git diff --check`, test rapide, puis
`git merge --continue` et `git push`.
:::

### Exercice 3 — Le commit devenu inutile

Pendant un rebasage, Git s’arrête sur ton commit « Corrige l’arrondi du total » avec un
conflit dans `src/cart.js`. En lisant les marqueurs (et la base), tu constates que `main`
contient déjà la même correction, faite par une collègue dans un commit plus large qui a
aussi retouché les lignes voisines. Que fais-tu ? Et pourquoi Git ne l’a-t-il pas détecté
tout seul ?

:::solution
`git rebase --skip` : ton commit n’apporte plus rien, on l’abandonne et le rebasage passe
au suivant. C’est la commande qui exprime directement l’intention.

Autre chemin possible : `git restore --ours src/cart.js` (pendant un rebasage, la version de
la base, qui contient déjà la correction), `git add`, puis `git rebase --continue`. Le commit
rejoué n’apporte alors aucune modification ; avec Git 2.43, le rebasage le laisse
simplement tomber et termine. Le résultat est le même, mais l’intention est moins claire
pour qui relira ta démarche.

Git détecte tout seul les commits **strictement identiques** déjà présents dans la base : il
les saute avant même de commencer, en affichant
`warning: skipped previously applied commit …`. Ici, la correction de ta collègue fait
partie d’un commit qui modifie aussi d’autres lignes : ce n’est pas le même correctif, Git
ne peut pas savoir qu’il contient le tien.

Avant de sauter, vérifie que la correction de `main` couvre **vraiment** la tienne (compare
`git show :2:src/cart.js` et `git show :3:src/cart.js`) : sauter un commit dont une partie
manquait dans `main` perdrait cette partie.
:::

## Récapitulatif

- `git status` fait l’inventaire : ce qui est fusionné seul (dans l’index), et les
  « unmerged paths » (`both modified`, `deleted by us/them`, `both added`).
- `git diff --name-only --diff-filter=U` liste les fichiers à traiter ; `git diff --check`
  repère les marqueurs oubliés.
- Le style `zdiff3` (`merge.conflictStyle`) montre la **base** commune : on comprend qui a
  changé quoi. `git show :1:f`, `:2:f`, `:3:f` affichent base, ours et theirs.
- Résoudre : écrire le contenu final, `git add` (ou `git rm` pour une suppression), tester,
  puis `git merge --continue` ou `git rebase --continue`.
- Un rebasage s’arrête **à chaque commit** en conflit ; `--skip` abandonne le commit courant,
  `--abort` annule tout, comme `git merge --abort` pour une fusion.
- Pendant un rebasage, « ours » est la base (`main`) et « theirs » est **ton** commit.
- `git restore --ours/--theirs` prend un fichier entier d’un côté : à réserver aux cas où ce
  côté a entièrement raison.
- `rerere` peut rejouer une résolution déjà faite ; les branches courtes restent le meilleur
  remède.
