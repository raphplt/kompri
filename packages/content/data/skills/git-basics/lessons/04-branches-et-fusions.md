---
title: Branches, fusions et conflits
summary: Travailler sur plusieurs idées en parallèle, les fusionner et résoudre un conflit simple.
durationMinutes: 60
sources:
  - title: Pro Git — Les branches avec Git (en français)
    url: https://git-scm.com/book/fr/v2
  - title: Documentation de git switch
    url: https://git-scm.com/docs/git-switch
  - title: Documentation de git branch
    url: https://git-scm.com/docs/git-branch
  - title: Documentation de git merge
    url: https://git-scm.com/docs/git-merge
---

## Travailler sur plusieurs choses à la fois

Tu commences une page de contact. En plein milieu, on te signale une faute urgente sur la
page d’accueil. Si tout se passe sur la même ligne d’historique, ta correction urgente va se
retrouver mélangée à une page de contact à moitié finie. Les **branches** règlent ce
problème : chaque idée avance sur sa propre ligne, et on les **fusionne** quand elles sont
prêtes.

Dans un projet en équipe, c’est la règle : la branche principale (`main`) reste toujours
dans un état stable, et chaque fonctionnalité ou correction est développée sur une branche
dédiée, relue, puis fusionnée.

Nous repartons du dépôt `mon-site` au commit `0bd8ce8`. Si ton historique contient un ou
deux commits de plus suite aux essais de la leçon précédente, ce n’est pas un problème :
seules les empreintes changeront.

## Une branche est une étiquette

Une **branche** n’est pas une copie du projet. C’est une simple **étiquette mobile** qui
pointe sur un commit. Quand tu commites, l’étiquette de la branche courante avance sur le
nouveau commit. `HEAD` indique la branche sur laquelle tu te trouves.

```text
                    HEAD
                     |
                    main
                     |
670d699 <- ... <- 0bd8ce8
```

Créer une branche revient à poser une nouvelle étiquette : c’est instantané, quelle que soit
la taille du projet.

```bash
git branch
```

```text
* main
```

`git branch` liste les branches locales ; l’étoile marque la branche courante. Pour
n’obtenir que le nom de la branche courante (utile dans un script), utilise
`git branch --show-current`, qui affiche ici `main`.

## Créer une branche et s’y placer

```bash
git switch -c contact
```

```text
Switched to a new branch 'contact'
```

`git switch -c nom` crée la branche à partir du commit actuel **et** s’y place
(`-c` pour _create_). Tu rencontreras aussi l’ancienne forme équivalente
`git checkout -b contact`.

```bash
git branch
```

```text
* contact
  main
```

Crée maintenant `contact.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Contact</title>
  </head>
  <body>
    <h1>Me contacter</h1>
    <p>Écris-moi à camille@example.com.</p>
  </body>
</html>
```

Puis, dans `index.html`, remplace la ligne du pied de page par
`<footer><a href="contact.html">Me contacter</a></footer>`, et fais deux commits :

```bash
git add contact.html
git commit -m "Ajoute une page de contact"
git commit -am "Ajoute un lien vers la page de contact"
```

```text
[contact 9aec1e2] Ajoute une page de contact
 1 file changed, 11 insertions(+)
 create mode 100644 contact.html
[contact 344c0ea] Ajoute un lien vers la page de contact
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Visualise toutes les branches avec `--graph` et `--all` :

```bash
git log --oneline --graph --all
```

```text
* 344c0ea (HEAD -> contact) Ajoute un lien vers la page de contact
* 9aec1e2 Ajoute une page de contact
* 0bd8ce8 (main) Ignore les dépendances, les secrets et les journaux
* 177e613 Ajoute une présentation et un pied de page
* 4e96c22 Ajoute une feuille de style de base
* eeae4a2 Précise le titre de l'onglet
* 6dae829 Précise le titre principal
* 670d699 Ajoute la page d'accueil
```

`contact` a avancé de deux commits ; `main` est resté sur `0bd8ce8`.

### Changer de branche

```bash
git switch main
```

```text
Switched to branch 'main'
```

Regarde ton dossier : `contact.html` a **disparu**, et le pied de page d’`index.html` a
retrouvé son ancien texte. C’est normal : changer de branche met le répertoire de travail
dans l’état du commit pointé par cette branche. Rien n’est perdu, `git switch contact`
ferait tout réapparaître.

## Fusionner : l’avance rapide

La page de contact est terminée : on veut l’intégrer à `main`. On se place sur la branche
qui **reçoit** les changements, puis on fusionne :

```bash
git switch main
git merge contact
```

```text
Updating 0bd8ce8..344c0ea
Fast-forward
 contact.html | 11 +++++++++++
 index.html   |  2 +-
 2 files changed, 12 insertions(+), 1 deletion(-)
 create mode 100644 contact.html
```

« Fast-forward » (**avance rapide**) : `main` n’avait pas bougé depuis la création de
`contact`, donc Git s’est contenté d’avancer l’étiquette `main` jusqu’à `344c0ea`. Aucun
nouveau commit n’est créé.

```text
* 344c0ea (HEAD -> main, contact) Ajoute un lien vers la page de contact
* 9aec1e2 Ajoute une page de contact
* 0bd8ce8 Ignore les dépendances, les secrets et les journaux
```

La branche `contact` a rempli son rôle ; on la supprime (seulement l’étiquette, les commits
restent dans `main`) :

```bash
git branch -d contact
```

```text
Deleted branch contact (was 344c0ea).
```

## Fusionner deux histoires : le commit de fusion

Souvent, `main` a avancé pendant que tu travaillais sur ta branche. Simulons-le :

```bash
git switch -c couleurs
```

Ajoute à la fin de `style.css` une ligne vide, puis :

```css
h1 {
  color: darkblue;
}
```

```bash
git commit -am "Colore le titre principal en bleu foncé"
git switch main
```

Pendant ce temps, sur `main`, change le `title` d’`index.html` en « Camille, développeuse
web » :

```bash
git commit -am "Reformule le titre de l'onglet"
git log --oneline --graph --all -4
```

```text
* 1de05fd (HEAD -> main) Reformule le titre de l'onglet
| * c957b77 (couleurs) Colore le titre principal en bleu foncé
|/
* 344c0ea Ajoute un lien vers la page de contact
* 9aec1e2 Ajoute une page de contact
```

Les deux branches ont **divergé** : chacune a un commit que l’autre n’a pas. L’avance rapide
est impossible. Git réalise alors une **fusion à trois points** : il compare l’ancêtre
commun (`344c0ea`) avec chacune des deux pointes, combine les changements et crée un
**commit de fusion**, qui a **deux parents**.

```bash
git merge couleurs
```

Git ouvre ton éditeur avec le message `Merge branch 'couleurs'` ; enregistre et ferme
(ou utilise `git merge --no-edit couleurs` pour accepter ce message directement) :

```text
Merge made by the 'ort' strategy.
 style.css | 4 ++++
 1 file changed, 4 insertions(+)
```

```bash
git log --oneline --graph -5
```

```text
*   ebef3ca (HEAD -> main) Merge branch 'couleurs'
|\
| * c957b77 (couleurs) Colore le titre principal en bleu foncé
* | 1de05fd Reformule le titre de l'onglet
|/
* 344c0ea Ajoute un lien vers la page de contact
* 9aec1e2 Ajoute une page de contact
```

Le graphe montre les deux lignes qui se rejoignent. `ort` est le nom de la stratégie de
fusion par défaut des versions récentes de Git. Les changements ne se chevauchaient pas
(l’un dans `style.css`, l’autre dans le `title`) : Git a tout combiné seul.

```bash
git branch -d couleurs
```

## Les conflits

Un **conflit** survient quand les deux branches ont modifié **les mêmes lignes** d’un
fichier de façon différente. Git ne peut pas deviner quelle version garder : il te demande
de décider.

Provoquons-en un. Sur une branche `accueil`, change le `h1` en « Bonjour et bienvenue ! »,
et sur `main`, change ce même `h1` en « Bienvenue chez Camille » :

```bash
git switch -c accueil
# modifier le h1 : Bonjour et bienvenue !
git commit -am "Rend le titre d'accueil plus chaleureux"
git switch main
# modifier le h1 : Bienvenue chez Camille
git commit -am "Personnalise le titre d'accueil"
git merge accueil
```

```text
Auto-merging index.html
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```

La fusion est **suspendue**. `git status` explique la situation :

```text
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   index.html

no changes added to commit (use "git add" and/or "git commit -a")
```

Ouvre `index.html` : Git y a inscrit les deux versions entre des **marqueurs de conflit**.

```html
  <body>
<<<<<<< HEAD
    <h1>Bienvenue chez Camille</h1>
=======
    <h1>Bonjour et bienvenue !</h1>
>>>>>>> accueil
    <p>Je m'appelle Camille et j'apprends le développement web.</p>
```

- Entre `<<<<<<< HEAD` et `=======` : la version de la branche courante (`main`).
- Entre `=======` et `>>>>>>> accueil` : la version de la branche fusionnée.

### Résoudre le conflit en quatre étapes

1. **Choisis** le contenu final : l’une des versions, l’autre, ou un mélange réfléchi.
   Ici, on combine les deux intentions.
2. **Supprime les trois lignes de marqueurs** et ne garde que le contenu voulu :

   ```html
     <body>
       <h1>Bonjour et bienvenue chez Camille !</h1>
       <p>Je m'appelle Camille et j'apprends le développement web.</p>
   ```

3. **Marque le fichier comme résolu** en l’ajoutant à l’index :

   ```bash
   git add index.html
   git status
   ```

   ```text
   On branch main
   All conflicts fixed but you are still merging.
     (use "git commit" to conclude merge)

   Changes to be committed:
   	modified:   index.html
   ```

4. **Termine la fusion** avec `git commit` (l’éditeur propose `Merge branch 'accueil'`) :

   ```text
   [main a56d594] Merge branch 'accueil'
   ```

```text
*   a56d594 (HEAD -> main) Merge branch 'accueil'
|\
| * 15a284f (accueil) Rend le titre d'accueil plus chaleureux
* | 262c51f Personnalise le titre d'accueil
|/
*   ebef3ca Merge branch 'couleurs'
```

Avant de commiter, vérifie que la page fonctionne toujours (ouvre-la dans le navigateur,
lance les tests s’il y en a) : une résolution de conflit est une modification de code comme
une autre, elle peut introduire un bug.

:::tip[Paniquer est inutile : git merge --abort]
Tant que tu n’as pas commité la fusion, `git merge --abort` annule tout et remet le dépôt
dans l’état d’avant `git merge`. Tu peux réfléchir, demander de l’aide, et recommencer.
:::

:::note[Les éditeurs aident]
Les éditeurs de code comme VS Code détectent les marqueurs et proposent des boutons
« accepter la modification actuelle », « accepter la modification entrante » ou « accepter
les deux ». Ils ne font que modifier le texte à ta place : tu dois toujours comprendre ce
que tu gardes, puis faire `git add` et `git commit`.
:::

## Changer de branche avec des modifications en cours

Si tu as des modifications non commitées qui seraient écrasées par le changement de
branche, Git refuse :

```text
error: Your local changes to the following files would be overwritten by checkout:
	style.css
Please commit your changes or stash them before you switch branches.
Aborting
```

Trois solutions : commiter (si le travail est cohérent), `git stash` puis `git stash pop`
après être revenu, ou jeter la modification avec `git restore`. Si les modifications ne
touchent pas les fichiers qui diffèrent entre les branches, Git les emporte simplement avec
toi : vérifie toujours `git status` après un changement de branche.

## La tête détachée

`git switch` attend un nom de branche. Pour examiner un ancien commit, il faut le demander
explicitement :

```bash
git switch --detach 344c0ea
```

```text
HEAD is now at 344c0ea Ajoute un lien vers la page de contact
```

Tu es en **HEAD détachée** (_detached HEAD_) : `HEAD` pointe directement sur un commit et non
sur une branche. Tu peux regarder, tester, et même commiter, mais ces commits
n’appartiennent à aucune branche et seront difficiles à retrouver. Pour revenir :
`git switch main`. Pour garder des commits faits dans cet état : `git switch -c
nouvelle-branche`. L’ancienne commande `git checkout 344c0ea` produit le même état, avec un
long message d’avertissement.

## Pièges courants

- **Commiter sur la mauvaise branche.** Regarde la branche courante (`git status`, ou ton
  invite de commande si elle l’affiche) avant de commiter.
- **Fusionner dans le mauvais sens.** `git merge X` fait entrer `X` **dans la branche
  courante**. Pour intégrer `contact` à `main`, il faut être sur `main`.
- **Laisser des marqueurs de conflit.** Un `<<<<<<<` oublié casse le code. Avant `git add`,
  cherche-les : `git diff` les montre, et `git diff --check` signale les marqueurs restants.
- **Supprimer une branche non fusionnée.** `git branch -d` refuse si les commits de la
  branche n’ont pas été intégrés à la branche courante (ou à sa branche distante suivie) :

  ```text
  error: the branch 'brouillon' is not fully merged.
  If you are sure you want to delete it, run 'git branch -D brouillon'
  ```

  `-D` force la suppression : les commits ne seront plus accessibles que par le reflog.
- **Des branches qui vivent des semaines.** Plus une branche s’écarte de `main`, plus les
  conflits sont nombreux. Préfère des branches courtes, fusionnées souvent.

## Exercices

### Exercice 1 — Avance rapide ou commit de fusion ?

Pour chaque scénario, dis si `git merge` fera une avance rapide ou un commit de fusion, puis
vérifie dans un dépôt d’essai.

1. Tu crées `nav` depuis `main`, tu y fais trois commits, tu reviens sur `main` et tu
   fusionnes `nav`.
2. Même chose, mais quelqu’un a fait un commit sur `main` entre-temps.
3. Tu es sur `nav` et tu fusionnes `main`, qui n’a pas bougé depuis la création de `nav`.

:::solution
1. **Avance rapide** : `main` est un ancêtre direct de `nav`, il suffit d’avancer
   l’étiquette.
2. **Commit de fusion** : les branches ont divergé, Git combine les deux histoires dans un
   commit à deux parents.
3. **Rien à faire** : `main` est déjà contenu dans `nav`. Git répond
   `Already up to date.`

Pour vérifier, `git log --oneline --graph --all` avant et après chaque fusion montre si un
commit `Merge branch …` est apparu.
:::

### Exercice 2 — Résoudre un vrai conflit

Dans un dépôt d’essai, crée `menu.txt` contenant trois lignes `Accueil`, `Blog`,
`Contact` et commite. Sur une branche `renommage`, remplace `Blog` par `Articles` ; sur
`main`, remplace `Blog` par `Actualités`. Fusionne `renommage` dans `main`, résous le
conflit en gardant `Articles`, et montre le graphe final.

:::solution
```bash
mkdir menu-test
cd menu-test
git init
printf 'Accueil\nBlog\nContact\n' > menu.txt
git add menu.txt
git commit -m "Ajoute le menu"

git switch -c renommage
sed -i.bak 's/Blog/Articles/' menu.txt && rm menu.txt.bak   # ou modifier dans l'éditeur
git commit -am "Renomme Blog en Articles"

git switch main
sed -i.bak 's/Blog/Actualités/' menu.txt && rm menu.txt.bak
git commit -am "Renomme Blog en Actualités"

git merge renommage          # CONFLICT (content): Merge conflict in menu.txt
```

Le fichier contient alors :

```text
Accueil
<<<<<<< HEAD
Actualités
=======
Articles
>>>>>>> renommage
Contact
```

On garde `Articles` et on supprime les marqueurs, pour obtenir `Accueil`, `Articles`,
`Contact`, puis :

```bash
git add menu.txt
git commit --no-edit         # accepte le message « Merge branch 'renommage' »
git log --oneline --graph --all
```

Le graphe montre deux commits parallèles qui se rejoignent dans le commit de fusion. Le
point à savoir expliquer : Git a signalé un conflit parce que la **même ligne** a été
modifiée différemment des deux côtés ; s’il s’était agi de lignes éloignées, la fusion
aurait été automatique. (L’écriture `sed -i.bak … && rm …` fonctionne à la fois sous Linux et
macOS ; tu peux aussi modifier le fichier dans ton éditeur.)
:::

### Exercice 3 — Sauver un commit orphelin

Tu as fait `git switch --detach HEAD~1`, puis un commit « Essai de couleur » dans cet état.
Comment le conserver dans une branche `essai-couleur` ? Et si tu étais déjà revenu sur
`main` avant d’y penser ?

:::solution
- Toujours en HEAD détachée : `git switch -c essai-couleur` crée une branche sur le commit
  actuel, qui est désormais à l’abri.
- Déjà revenu sur `main` : le commit n’est plus visible dans `git log`, mais il est dans le
  reflog. `git reflog` affiche une ligne `commit: Essai de couleur` avec son empreinte ;
  `git branch essai-couleur <empreinte>` pose une branche dessus. Git affiche d’ailleurs
  l’empreinte et cette commande en quittant la HEAD détachée.
:::

## Récapitulatif

- Une branche est une étiquette mobile sur un commit ; `HEAD` désigne la branche courante.
- `git switch -c nom` crée une branche et s’y place ; `git switch nom` change de branche
  (anciennement `git checkout -b` et `git checkout`).
- `git log --oneline --graph --all` visualise toutes les branches.
- `git merge X` fait entrer `X` dans la branche courante : **avance rapide** si la branche
  courante n’a pas bougé, sinon **commit de fusion** à deux parents.
- Un **conflit** survient quand les mêmes lignes sont modifiées des deux côtés : choisis le
  contenu, retire les marqueurs, `git add`, puis `git commit`. `git merge --abort` annule.
- `git branch -d` supprime une branche fusionnée ; `-D` force, avec prudence.
- En HEAD détachée, crée une branche avant de partir si tu veux garder tes commits.
