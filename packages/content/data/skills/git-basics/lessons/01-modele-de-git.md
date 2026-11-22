---
title: Le modèle de Git
summary: Comprendre le répertoire de travail, l’index et les commits, puis créer son premier dépôt.
durationMinutes: 50
sources:
  - title: Pro Git (livre officiel, en français)
    url: https://git-scm.com/book/fr/v2
  - title: Documentation de git status
    url: https://git-scm.com/docs/git-status
  - title: Documentation de git add
    url: https://git-scm.com/docs/git-add
  - title: Documentation de git commit
    url: https://git-scm.com/docs/git-commit
---

## Le problème : « site-final-v3-vraiment-final »

Tu modifies une page web, tu casses quelque chose, et tu ne sais plus ce qui fonctionnait
hier. Alors tu copies ton dossier avant chaque changement important : `site`, `site-v2`,
`site-final`, `site-final-v3-vraiment-final`. Au bout d’une semaine, plus personne ne sait
quelle copie contient quoi, ni pourquoi telle ligne a changé.

Un **système de gestion de versions** résout ce problème. Il enregistre des **instantanés**
successifs de ton projet, chacun accompagné d’un message qui explique le changement, de son
auteur et de sa date. Tu peux ensuite comparer deux versions, revenir en arrière, travailler
sur plusieurs idées en parallèle et partager ton travail avec d’autres.

Git est le système de gestion de versions le plus répandu aujourd’hui. Il a été créé par
Linus Torvalds en 2005 pour le développement du noyau Linux. C’est un logiciel libre qui
fonctionne entièrement sur ton ordinateur : tu n’as besoin ni de compte ni d’Internet pour
l’utiliser.

:::note[Git n’est pas GitHub]
Git est un programme installé sur ta machine. GitHub, GitLab ou Bitbucket sont des
**services en ligne** qui hébergent des dépôts Git et ajoutent des outils de collaboration
(revue de code, tickets, intégration continue). Tu peux utiliser Git toute ta vie sans
jamais ouvrir un compte sur l’un d’eux. Nous verrons les dépôts distants dans la dernière
leçon.
:::

## Installer et configurer Git

Vérifie d’abord que Git est installé, dans ton terminal :

```bash
git --version
```

Tu obtiens une ligne du type `git version 2.43.0` (le numéro dépend de ton système). Si la
commande est introuvable, installe Git depuis le site officiel `git-scm.com` ou avec le
gestionnaire de paquets de ton système (`brew install git` sur macOS avec Homebrew,
`sudo apt install git` sur Debian ou Ubuntu).

Git signe chaque enregistrement avec un nom et une adresse électronique. Configure-les une
fois pour toutes :

```bash
git config --global user.name "Camille Martin"
git config --global user.email "camille@example.com"
git config --global init.defaultBranch main
```

- `--global` enregistre le réglage pour ton compte utilisateur, dans le fichier
  `~/.gitconfig`. Sans cette option, le réglage ne vaut que pour le dépôt courant.
- `init.defaultBranch main` nomme `main` la branche créée par défaut dans chaque nouveau
  dépôt. C’est le nom utilisé par GitHub et GitLab pour les nouveaux dépôts. Sans ce
  réglage, Git nomme encore la branche `master` dans de nombreuses versions, en affichant
  un avertissement.

Pour relire ta configuration :

```bash
git config --global --list
```

```text
user.name=Camille Martin
user.email=camille@example.com
init.defaultbranch=main
```

:::warning[Adresse publique]
Le nom et l’adresse sont inscrits dans chaque enregistrement et deviennent visibles de tous
si tu publies ton dépôt. Utilise une adresse que tu acceptes de rendre publique. GitHub et
GitLab proposent des adresses de remplacement qui masquent ton adresse réelle.
:::

:::tip[Messages en anglais ou en français]
Les exemples de cette leçon montrent les messages de Git en anglais. Si ton système est
configuré en français, Git peut afficher `Sur la branche main` au lieu de `On branch main` :
le sens est identique. Les empreintes de commits (`670d699`…) seront aussi différentes chez
toi, car elles dépendent de la date et de ton nom.
:::

## Les trois zones de Git

Pour comprendre Git, il faut avoir en tête **trois zones** distinctes :

```text
 répertoire de travail        index                     dépôt (.git)
 (tes fichiers)               (zone de préparation)     (l’historique des commits)

   index.html  ── git add ──>  index.html  ── git commit ──>  commit 670d699
   style.css                                                   commit 6dae829
                                                               ...
```

1. Le **répertoire de travail** (_working directory_) : les fichiers que tu vois et modifies
   dans ton éditeur. Git les observe mais ne les enregistre pas tout seul.
2. L’**index** (_staging area_, zone de préparation) : le contenu du **prochain** commit, que
   tu composes fichier par fichier, voire ligne par ligne, avec `git add`.
3. Le **dépôt** : le dossier caché `.git`, qui contient tous les commits, c’est-à-dire tout
   l’historique du projet.

Un **commit** est un instantané complet de tous les fichiers suivis à un instant donné,
accompagné de métadonnées : auteur, date, message et lien vers le ou les commits
**parents** (ceux qui le précèdent). Les commits forment ainsi une chaîne : l’**historique**.
Chaque commit est identifié par une **empreinte** de 40 caractères hexadécimaux, calculée à
partir de son contenu. On l’abrège souvent à ses 7 premiers caractères : `670d699`.

Pourquoi une étape intermédiaire, l’index ? Parce que tu modifies souvent plusieurs choses à
la fois. L’index te permet de **choisir** ce qui entre dans chaque commit, pour que chaque
commit raconte un seul changement. C’est la clé des commits utiles de la leçon suivante.

## Premier dépôt, pas à pas

Crée un dossier de projet et transforme-le en dépôt Git :

```bash
mkdir mon-site
cd mon-site
git init
ls -a
```

```text
Initialized empty Git repository in /home/camille/mon-site/.git/
.
..
.git
```

`git init` a créé le dossier caché `.git`. **Tout** ce que Git sait de ton projet est
dedans : si tu le supprimes, l’historique disparaît, mais tes fichiers restent.

Crée maintenant `index.html` avec ton éditeur :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Mon site</title>
  </head>
  <body>
    <h1>Bienvenue</h1>
  </body>
</html>
```

### Observer avec git status

`git status` est la commande à lancer sans modération : elle décrit l’état des trois zones.

```bash
git status
```

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	index.html

nothing added to commit but untracked files present (use "git add" to track)
```

Le fichier est **non suivi** (_untracked_) : il existe dans le répertoire de travail, mais
Git ne l’a jamais enregistré. Remarque que Git t’indique la commande suivante possible.

### Préparer avec git add

```bash
git add index.html
git status
```

```text
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   index.html
```

`index.html` est maintenant dans l’index : il fera partie du prochain commit.

### Enregistrer avec git commit

```bash
git commit -m "Ajoute la page d'accueil"
```

```text
[main (root-commit) 670d699] Ajoute la page d'accueil
 1 file changed, 10 insertions(+)
 create mode 100644 index.html
```

Git a créé le premier commit (`root-commit`, il n’a pas de parent) sur la branche `main`,
avec l’empreinte abrégée `670d699`. L’option `-m` fournit le message directement.

```bash
git status
```

```text
On branch main
nothing to commit, working tree clean
```

« Working tree clean » : le répertoire de travail, l’index et le dernier commit sont
identiques. C’est l’état de repos idéal.

## Modifier un fichier suivi

Change le titre `h1` en « Bienvenue sur mon site », puis :

```bash
git status
```

```text
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   index.html

no changes added to commit (use "git add" and/or "git commit -a")
```

Le fichier est **suivi** et **modifié**, mais la modification n’est pas dans l’index.

### Voir les différences avec git diff

```bash
git diff
```

```diff
diff --git a/index.html b/index.html
index 51a676d..e4a4fd6 100644
--- a/index.html
+++ b/index.html
@@ -5,6 +5,6 @@
     <title>Mon site</title>
   </head>
   <body>
-    <h1>Bienvenue</h1>
+    <h1>Bienvenue sur mon site</h1>
   </body>
 </html>
```

Lis ce format ainsi : `---` est l’ancienne version, `+++` la nouvelle ; `@@ -5,6 +5,6 @@`
signifie « l’extrait commence à la ligne 5 et couvre 6 lignes, dans l’ancienne version (`-`)
comme dans la nouvelle (`+`) » ; les lignes
commençant par `-` sont retirées, celles par `+` ajoutées, les autres servent de contexte.

Retiens précisément ce que compare chaque commande :

| Commande            | Compare                                     |
| ------------------- | ------------------------------------------- |
| `git diff`          | répertoire de travail **et** index          |
| `git diff --staged` | index **et** dernier commit                 |
| `git diff HEAD`     | répertoire de travail **et** dernier commit |

```bash
git add index.html
git diff
git diff --staged
```

Après `git add`, `git diff` n’affiche plus rien : le répertoire de travail et l’index sont
identiques. `git diff --staged` affiche la même différence que tout à l’heure, car elle se
trouve maintenant entre l’index et le dernier commit.

## L’index est un instantané, pas une liste de fichiers

C’est le point que la plupart des débutants ratent. `git add` ne signifie pas « suivre ce
fichier désormais » : il signifie « copier **le contenu actuel** de ce fichier dans
l’index ». Démonstration : la modification du `h1` est déjà indexée ; change maintenant le
titre de l’onglet (`title`) en « Mon site personnel », **sans** refaire `git add`.

```bash
git status --short
```

```text
MM index.html
```

`git status --short` (ou `-s`) affiche deux colonnes : la première décrit l’index, la
seconde le répertoire de travail. `MM` veut dire : modifié dans l’index (le `h1`) **et**
encore modifié depuis dans le répertoire de travail (le `title`). Que contient le commit si
tu enregistres maintenant ?

```bash
git commit -m "Précise le titre principal"
git status --short
```

```text
[main 6dae829] Précise le titre principal
 1 file changed, 1 insertion(+), 1 deletion(-)
 M index.html
```

Le commit ne contient **que** le changement du `h1` : c’est ce qui était dans l’index. La
modification du `title` est restée dans le répertoire de travail (` M`, espace puis `M`).
Pour l’enregistrer à son tour :

```bash
git add index.html
git commit -m "Précise le titre de l'onglet"
```

### Les codes de git status --short

| Code | Signification                                   |
| ---- | ----------------------------------------------- |
| `??` | fichier non suivi                               |
| `A ` | nouveau fichier ajouté à l’index                |
| `M ` | modification indexée                            |
| ` M` | modification non indexée                        |
| `MM` | modification indexée, puis modifiée à nouveau   |
| ` D` | fichier suivi supprimé du répertoire de travail |

## Lire l’historique

```bash
git log --oneline
```

```text
eeae4a2 (HEAD -> main) Précise le titre de l'onglet
6dae829 Précise le titre principal
670d699 Ajoute la page d'accueil
```

Le plus récent est en haut. `(HEAD -> main)` se lit : « la branche `main` pointe sur ce
commit, et `HEAD` (là où tu te trouves) pointe sur `main` ». Une **branche** n’est qu’une
étiquette mobile qui avance à chaque commit ; nous les étudierons en détail plus tard.

La version longue, `git log`, affiche l’empreinte complète, l’auteur et la date :

```text
commit eeae4a26db18ee480c30ef250d498d638a912555 (HEAD -> main)
Author: Camille Martin <camille@example.com>
Date:   Mon Mar 2 10:30:00 2026 +0100

    Précise le titre de l'onglet
```

Si l’historique est long, Git l’affiche dans un visualiseur (_pager_) : utilise les flèches
pour défiler et la touche `q` pour quitter.

Par curiosité, tu peux regarder ce qu’est réellement un commit :

```bash
git cat-file -p HEAD
```

```text
tree 21505adfb8f716fd67751f0cd04a45dd91d9a386
parent 6dae8295de4b582c04f4468662f29147e033bc66
author Camille Martin <camille@example.com> 1772443800 +0100
committer Camille Martin <camille@example.com> 1772443800 +0100

Précise le titre de l'onglet
```

Un commit référence un `tree` (l’instantané des fichiers), son `parent`, l’auteur, la date
et le message. Comme l’empreinte est calculée à partir de tout cela, modifier un seul
caractère d’un ancien commit changerait son empreinte et celle de tous ses descendants :
c’est ce qui rend l’historique Git fiable.

## Pièges courants

### Oublier de refaire git add

Symptôme : « J’ai fait `git add` puis `git commit`, mais ma dernière modification n’est pas
dans le commit. » Cause : tu as modifié le fichier **après** `git add`. Correction : relance
`git status` avant chaque commit et vérifie qu’il n’y a plus de ` M` inattendu.

### Lancer git init au mauvais endroit

Si tu lances `git init` dans ton dossier personnel, **tout** ton dossier personnel devient
un dépôt et `git status` liste des centaines de fichiers. Vérifie toujours le dossier
courant avec `pwd` avant `git init`. Pour annuler une initialisation faite par erreur dans un
dossier qui n’avait pas d’historique, il suffit de supprimer le dossier `.git` de cet
endroit précis (`rm -rf .git`), en vérifiant deux fois que tu es au bon endroit.

### Être piégé dans l’éditeur

Sans `-m`, `git commit` ouvre un éditeur pour saisir le message, souvent Vim. Pour en
sortir : touche `Échap`, puis tape `:wq` et `Entrée` pour enregistrer et quitter (ou `:q!`
pour abandonner, ce qui annule le commit si le message est vide). Tu peux choisir un éditeur
plus simple :

```bash
git config --global core.editor "nano"
```

### Identité non configurée

Si tu n’as pas configuré ton nom et ton adresse, `git commit` refuse avec un message qui
commence ainsi :

```text
Author identity unknown

*** Please tell me who you are.
```

Lance les deux commandes `git config --global user.…` vues plus haut, puis recommence.

### Croire que Git suit les dossiers vides

Git suit des **fichiers**. Un dossier vide n’apparaît jamais dans `git status`. Si tu as
besoin qu’un dossier existe, places-y au moins un fichier.

## Exercices

### Exercice 1 — Prédire git status --short

Dans un dépôt propre qui contient déjà un fichier suivi `a.txt`, tu exécutes :

```bash
echo "bonjour" > b.txt
echo "ligne ajoutée" >> a.txt
git add a.txt
echo "autre ligne" >> a.txt
```

Écris la sortie de `git status --short` **avant** de l’exécuter. Puis, si tu lances
`git commit -m "Complète a.txt"`, que contient le commit et que reste-t-il ?

:::solution

```text
MM a.txt
?? b.txt
```

- `b.txt` n’a jamais été ajouté : il est non suivi (`??`).
- `a.txt` a une modification indexée (« ligne ajoutée ») puis une nouvelle modification non
  indexée (« autre ligne ») : `MM`.

Le commit contient `a.txt` avec « ligne ajoutée » seulement, car c’est la version copiée
dans l’index. Après le commit, `git status --short` affiche ` M a.txt` (il reste « autre
ligne ») et `?? b.txt`. Vérifie-le en créant un dépôt de test : c’est la meilleure façon de
fixer le modèle des trois zones.
:::

### Exercice 2 — Ton carnet de commandes

1. Crée un dossier `carnet`, initialise un dépôt et crée `commandes.md` qui contient une
   ligne par commande Git apprise.
2. Fais un premier commit.
3. Ajoute deux nouvelles commandes, n’en indexe qu’une seule en modifiant le fichier en deux
   temps (comme dans la démonstration `MM`), et fais un commit qui ne contient que la
   première.
4. Vérifie avec `git show` (qui affiche le dernier commit et sa différence) que le commit
   contient bien une seule ligne ajoutée, puis enregistre la seconde.

:::solution

```bash
mkdir carnet
cd carnet
git init
echo "git init : crée un dépôt" > commandes.md
git add commandes.md
git commit -m "Commence le carnet de commandes"

echo "git status : décrit l'état des trois zones" >> commandes.md
git add commandes.md      # l'index contient maintenant cette ligne
echo "git diff : compare répertoire de travail et index" >> commandes.md
git status --short        # affiche MM commandes.md
git commit -m "Ajoute git status au carnet"
git show                  # une seule ligne précédée de + : celle de git status
git diff                  # la ligne de git diff est encore non indexée
git add commandes.md
git commit -m "Ajoute git diff au carnet"
git log --oneline         # trois commits
```

Le point à savoir expliquer : `git add` a copié le fichier **tel qu’il était** à ce
moment-là. La ligne ajoutée ensuite n’était pas dans l’index, donc pas dans le commit.
:::

### Exercice 3 — Les bonnes questions

Réponds en une phrase chacune : que se passe-t-il pour ton historique si tu supprimes le
dossier `.git` ? Et pour tes fichiers ? Pourquoi Git a-t-il besoin de ton adresse
électronique ?

:::solution

- Supprimer `.git` détruit tout l’historique (commits, branches, configuration locale) :
  le dossier redevient un simple dossier.
- Les fichiers du répertoire de travail restent tels qu’ils sont, dans leur dernière
  version.
- Le nom et l’adresse identifient l’auteur de chaque commit ; ils sont inscrits dans le
  commit lui-même, pas vérifiés par Git.

:::

## Récapitulatif

- Git enregistre des instantanés de ton projet appelés **commits**, chacun avec un auteur,
  une date, un message et un lien vers son parent.
- Trois zones : le **répertoire de travail** (tes fichiers), l’**index** (le prochain
  commit en préparation) et le **dépôt** `.git` (l’historique).
- `git init` crée un dépôt ; `git add` copie le contenu actuel d’un fichier dans l’index ;
  `git commit -m "…"` enregistre l’index comme nouveau commit.
- `git status` (et `git status --short`) décrit l’état des trois zones : lance-le avant et
  après chaque action.
- `git diff` compare répertoire de travail et index ; `git diff --staged` compare index et
  dernier commit.
- `git log --oneline` liste l’historique ; `HEAD` indique où tu te trouves.
- Configure une fois `user.name`, `user.email` et `init.defaultBranch`.
