---
title: Créer, copier, déplacer, supprimer et lire des fichiers
summary: Manipuler fichiers et dossiers au clavier, lire leur contenu, et prendre les bons réflexes pour ne rien perdre.
durationMinutes: 50
sources:
  - title: GNU Coreutils — manuel
    url: https://www.gnu.org/software/coreutils/manual/coreutils.html
  - title: GNU Bash Reference Manual — Filename Expansion
    url: https://www.gnu.org/software/bash/manual/bash.html
---

Créer la structure d’un projet, copier un fichier de configuration, renommer un
dossier, supprimer des fichiers générés, jeter un œil à un journal d’erreurs : tu le
feras des dizaines de fois par jour. Au clavier, c’est rapide et précis… à condition de
savoir ce que fait chaque commande, car le terminal **ne demande pas confirmation** et
**n’a pas de corbeille**.

Cette leçon présente les commandes de manipulation de fichiers et, surtout, les réflexes
de sécurité qui vont avec. Place-toi dans le terrain d’entraînement créé à la leçon
précédente :

```bash
cd ~/atelier-terminal
```

## Créer des dossiers : mkdir

`mkdir` (*make directory*) crée un dossier. Commence par supprimer le dossier vide
`mes photos` de la leçon précédente avec `rmdir`, qui ne supprime que des dossiers
**vides** :

```bash
rmdir "mes photos"
mkdir recettes
mkdir recettes/desserts/tartes
```

```text
mkdir: cannot create directory 'recettes/desserts/tartes': No such file or directory
```

`mkdir` refuse de créer `tartes` parce que son parent `desserts` n’existe pas. L’option
`-p` (*parents*) crée tous les dossiers intermédiaires nécessaires, et ne se plaint pas
si le dossier existe déjà :

```bash
mkdir -p recettes/desserts/tartes
ls recettes recettes/desserts
```

```text
recettes:
desserts

recettes/desserts:
tartes
```

Avec plusieurs arguments, `ls` liste chaque dossier sous un titre.

## Créer et lire des fichiers

### Créer un fichier

- `touch fichier` crée un fichier **vide** s’il n’existe pas (et sinon met à jour sa
  date de modification).
- `echo 'texte' > fichier` écrit une ligne dans un fichier. Le `>` est une
  **redirection** (leçon suivante) : il **remplace** le contenu du fichier.
- `echo 'texte' >> fichier` **ajoute** une ligne à la fin.

```bash
cd recettes
echo 'Pâte brisée, pommes, sucre' > tarte-pommes.txt
echo 'Cuire 35 minutes à 180 °C' >> tarte-pommes.txt
cat tarte-pommes.txt
```

```text
Pâte brisée, pommes, sucre
Cuire 35 minutes à 180 °C
```

:::warning[Un seul chevron écrase tout]
`echo 'Ingrédients' > tarte-pommes.txt` remplacerait les deux lignes par une seule,
sans avertissement. Vérifie toujours si tu veux `>` (remplacer) ou `>>` (ajouter).

:::

Pour écrire plus que quelques lignes, utilise un éditeur. Dans le terminal, `nano
fichier` ouvre un éditeur simple : `Ctrl`+`O` puis Entrée pour enregistrer, `Ctrl`+`X`
pour quitter. Tu peux aussi ouvrir le dossier courant dans ton éditeur graphique ; avec
Visual Studio Code, si sa commande `code` est installée : `code .`.

### Lire un fichier

| Commande         | Usage                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `cat fichier`    | Affiche tout le fichier d’un coup : idéal pour les petits fichiers |
| `less fichier`   | Affiche page par page : flèches, Espace, `/mot` pour chercher, `q` pour quitter |
| `head fichier`   | Les 10 premières lignes ; `head -n 3` pour les 3 premières         |
| `tail fichier`   | Les 10 dernières lignes ; `tail -f` suit un fichier qui grandit (un journal) |
| `wc fichier`     | Compte lignes, mots et octets ; `wc -l` seulement les lignes       |

Crée un fichier de 100 lignes avec `seq` (qui écrit une suite de nombres) et essaie :

```bash
seq 1 100 > nombres.txt
head -n 3 nombres.txt
tail -n 2 nombres.txt
wc -l nombres.txt
wc tarte-pommes.txt
```

```text
1
2
3
99
100
100 nombres.txt
 2  9 57 tarte-pommes.txt
```

`tarte-pommes.txt` contient 2 lignes, 9 mots et 57 octets : les lettres accentuées et le
symbole « ° » occupent plusieurs octets en UTF-8. (Sous macOS, `wc` aligne ses colonnes
différemment.)

:::tip
`tail -f journal.log` affiche les nouvelles lignes au fur et à mesure qu’elles sont
écrites : pratique pour surveiller les journaux d’un serveur. Arrête avec `Ctrl`+`C`.

:::

## Copier : cp

`cp source destination` copie un fichier :

```bash
cp tarte-pommes.txt tarte-poires.txt
ls
```

```text
desserts  nombres.txt  tarte-poires.txt  tarte-pommes.txt
```

Pour copier un **dossier** et tout son contenu, il faut l’option `-r` (*recursive*) :

```bash
cp desserts desserts-sauvegarde
```

```text
cp: -r not specified; omitting directory 'desserts'
```

```bash
cp -r desserts desserts-sauvegarde
```

Si la destination est un dossier existant, la copie est placée **dedans** :
`cp tarte-pommes.txt desserts/` crée `desserts/tarte-pommes.txt`.

## Déplacer et renommer : mv

`mv` (*move*) déplace **ou** renomme : pour le système, c’est la même opération.

```bash
mv tarte-poires.txt desserts/
mv desserts/tarte-poires.txt desserts/tarte-aux-poires.txt
ls desserts
```

```text
tarte-aux-poires.txt  tartes
```

La première commande déplace le fichier dans `desserts` ; la seconde le renomme sans le
déplacer. `mv` déplace aussi des dossiers entiers, sans option particulière.

### Écraser sans le savoir

Si la destination existe déjà, `cp` et `mv` **la remplacent sans prévenir**. L’option
`-i` (*interactive*) demande confirmation :

```bash
echo 'version B' > b.txt
cp b.txt tarte-pommes.txt.bak
cp -i b.txt tarte-pommes.txt.bak
```

```text
cp: overwrite 'tarte-pommes.txt.bak'?
```

Réponds `n` puis Entrée pour annuler, `y` pour confirmer. Prends l’habitude de `-i`
dès que tu n’es pas sûr de la destination.

## Supprimer : rm et rmdir

`rm` (*remove*) supprime des fichiers. **Il n’y a pas de corbeille** : un fichier
supprimé par `rm` est perdu, sauf sauvegarde.

```bash
rm b.txt tarte-pommes.txt.bak
rm desserts-sauvegarde
```

```text
rm: cannot remove 'desserts-sauvegarde': Is a directory
```

Pour un dossier, deux possibilités :

- `rmdir dossier` ne supprime qu’un dossier **vide** ; ici il refuse avec
  `Directory not empty`. C’est la commande la plus sûre.
- `rm -r dossier` supprime le dossier **et tout son contenu**, récursivement.

```bash
rm -r desserts-sauvegarde
```

`rm -i` demande confirmation pour chaque fichier, et `rm -ri` pour chaque élément d’un
dossier.

:::warning[Les commandes qui ne pardonnent pas]
- `rm -rf` (`-f` pour *force* : ne rien demander, ignorer les erreurs) supprime tout
  sans un mot. Ne l’utilise que sur un chemin que tu viens de vérifier avec `ls`.
- Une espace de trop change tout : `rm -r mon dossier` supprime **deux** éléments,
  `mon` et `dossier`. Écris `rm -r "mon dossier"`.
- Ne lance jamais une commande `rm` trouvée en ligne ou proposée par une IA sans
  comprendre **chaque** caractère.
- Travaille dans un projet versionné avec Git (compétence suivante) : c’est ton filet
  de sécurité.

:::

## Les jokers

Le shell sait désigner plusieurs fichiers d’un coup grâce à des **motifs** (*globs*) :

| Motif      | Correspond à                                             |
| ---------- | -------------------------------------------------------- |
| `*`        | N’importe quelle suite de caractères (même vide)         |
| `?`        | Exactement un caractère                                  |
| `[abc]`    | Un caractère parmi `a`, `b`, `c`                         |

```bash
touch photo1.jpg photo2.jpg photo10.jpg notes.md
ls *.jpg
ls photo?.jpg
```

```text
photo1.jpg  photo10.jpg  photo2.jpg
photo1.jpg  photo2.jpg
```

Point essentiel : c’est le **shell** qui remplace le motif par la liste des noms
correspondants, **avant** de lancer la commande. `ls` ne voit jamais `*.jpg` ; il reçoit
`photo1.jpg photo10.jpg photo2.jpg`. Tu peux le vérifier sans risque avec `echo` :

```bash
echo rm *.jpg
```

```text
rm photo1.jpg photo10.jpg photo2.jpg
```

Cette astuce est le meilleur réflexe avant une suppression : **préfixe la commande par
`echo`**, lis exactement ce qui serait exécuté, puis retire `echo`.

Si aucun fichier ne correspond, bash laisse le motif tel quel, et la commande reçoit
littéralement `*.png` :

```bash
ls *.png
```

```text
ls: cannot access '*.png': No such file or directory
```

:::note
Les motifs ne correspondent pas aux fichiers cachés : `*` n’inclut pas `.env`. Et les
motifs du shell ne sont pas des expressions régulières : `*` n’a pas ici le sens qu’il
a dans `grep`.

:::

## Pièges et idées reçues

**« Je récupérerai le fichier dans la corbeille. »** `rm` n’utilise pas la corbeille.

**« cp et mv me préviendront s’ils écrasent quelque chose. »** Non, pas sans `-i`.

**« `rm *` dans le mauvais dossier, ce n’est pas grave. »** Le motif est développé dans
le **répertoire courant**. Fais `pwd` et `echo rm *` avant.

**« Un fichier nommé `-f.txt` se supprime avec `rm -f.txt`. »** Le shell transmet
`-f.txt` à `rm`, qui le lit comme des options. Écris `rm -- -f.txt` (`--` signifie « fin
des options ») ou `rm ./-f.txt`.

**« Pour vider un fichier, je le supprime et je le recrée. »** `> fichier` (une
redirection sans commande) suffit à le vider, mais vérifie que c’est bien ce fichier.

## Exercices

### Exercice 1 : monter la structure d’un projet

Depuis `~/atelier-terminal`, crée en **trois commandes au plus** cette structure, où
chaque fichier est vide sauf `LISEZMOI.md`, qui contient la ligne `Mon portfolio` :

```text
portfolio/
├── LISEZMOI.md
├── css/
│   └── style.css
├── images/
└── index.html
```

Vérifie avec `ls -R portfolio` (`-R` liste récursivement).

:::solution
```bash
mkdir -p portfolio/css portfolio/images
touch portfolio/index.html portfolio/css/style.css
echo 'Mon portfolio' > portfolio/LISEZMOI.md
ls -R portfolio
```

```text
portfolio:
LISEZMOI.md  css  images  index.html

portfolio/css:
style.css

portfolio/images:
```

`mkdir -p` crée `portfolio` et ses deux sous-dossiers en une fois. `touch` accepte
plusieurs fichiers. La redirection `>` crée `LISEZMOI.md` avec son contenu. Le dossier
`images` est vide, d’où la section sans contenu à la fin.

:::

### Exercice 2 : ranger sans rien perdre

Dans `~/atelier-terminal/recettes`, il reste `photo1.jpg`, `photo2.jpg`,
`photo10.jpg`, `notes.md`, `nombres.txt`, `tarte-pommes.txt` et le dossier `desserts`.

1. Crée un dossier `images` et déplaces-y toutes les photos en une commande.
2. Fais une copie de sauvegarde du dossier `desserts` nommée `desserts-2026`.
3. Supprime `nombres.txt` en demandant confirmation.
4. Avant de supprimer toutes les photos de `images`, affiche exactement la commande qui
   serait exécutée.

:::solution
```bash
cd ~/atelier-terminal/recettes
mkdir images
mv *.jpg images/
cp -r desserts desserts-2026
rm -i nombres.txt
echo rm images/*.jpg
```

- `mv *.jpg images/` : le shell remplace `*.jpg` par les trois noms, et `mv` les
  déplace dans `images` (le `/` final rappelle que c’est un dossier).
- `cp -r` est obligatoire pour un dossier.
- `rm -i` affiche `rm: remove regular file 'nombres.txt'?` ; réponds `y`.
- `echo rm images/*.jpg` affiche `rm images/photo1.jpg images/photo10.jpg
  images/photo2.jpg` sans rien supprimer. Retire `echo` pour exécuter vraiment.

:::

### Exercice 3 : expliquer des catastrophes

Explique ce que fait chaque commande et pourquoi elle est dangereuse ou fausse, puis
corrige-la.

1. `rm -r Mes Documents` pour supprimer le dossier « Mes Documents ».
2. `cp rapport.txt archives` alors que `archives` n’existe pas encore et devait être un
   dossier.
3. `echo 'nouvelle ligne' > journal.txt` pour ajouter une ligne au journal.
4. `mv config.js config.js.old` puis `mv config-nouveau.js config.js`, lancées depuis
   le mauvais dossier.

:::solution
1. Le shell coupe sur l’espace : `rm` reçoit `Mes` et `Documents`, et supprime donc
   deux autres éléments s’ils existent (et échoue pour « Mes Documents »). Correction :
   `rm -r "Mes Documents"`, après un `ls "Mes Documents"` de vérification.
2. Comme `archives` n’existe pas, `cp` crée un **fichier** nommé `archives`, copie de
   `rapport.txt`. Correction : `mkdir archives` puis `cp rapport.txt archives/` ; le `/`
   final fait échouer `cp` si `archives` n’est pas un dossier, au lieu de créer un
   fichier par erreur.
3. `>` **écrase** tout le journal. Correction : `>>`.
4. Les chemins relatifs sont interprétés depuis le répertoire courant : dans le mauvais
   dossier, la première commande échoue (`No such file or directory`) ou renomme un
   autre `config.js`. Correction : vérifier avec `pwd` et `ls`, ou utiliser des chemins
   absolus ; et `mv -i` pour ne rien écraser par surprise.

:::

## Récapitulatif

- `mkdir -p` crée des dossiers et leurs parents ; `rmdir` supprime un dossier vide.
- `touch` crée un fichier vide ; `>` écrit (en écrasant), `>>` ajoute.
- Lire : `cat` (tout), `less` (page par page, `q` pour quitter), `head`/`tail` (début et
  fin, `-n` pour le nombre de lignes, `tail -f` pour suivre), `wc` (compter).
- `cp` copie (`-r` pour un dossier) ; `mv` déplace et renomme ; les deux écrasent sans
  prévenir sauf avec `-i`.
- `rm` supprime **définitivement** ; `rm -r` supprime un dossier et son contenu.
- Les jokers `*`, `?` et `[…]` sont développés par le **shell** ; vérifie avec
  `echo commande` avant de supprimer.
- Réflexes : `pwd` et `ls` avant d’agir, guillemets autour des noms avec espaces, `--`
  pour les noms qui commencent par un tiret.
