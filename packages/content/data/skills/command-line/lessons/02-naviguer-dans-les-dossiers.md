---
title: Naviguer dans l’arborescence
summary: Se repérer dans les dossiers avec pwd, ls et cd, et maîtriser chemins absolus et relatifs.
durationMinutes: 40
sources:
  - title: GNU Bash Reference Manual
    url: https://www.gnu.org/software/bash/manual/bash.html
  - title: GNU Coreutils — ls
    url: https://www.gnu.org/software/coreutils/manual/coreutils.html
---

Dans un explorateur de fichiers, tu vois où tu es et tu cliques sur un dossier pour y
entrer. Dans un terminal, rien ne s’affiche tant que tu ne le demandes pas : il faut
savoir **où l’on est** et **comment désigner** un fichier ou un dossier. C’est la
compétence la plus utilisée de toutes : lancer un serveur, ouvrir un projet, trouver un
fichier de configuration commencent toujours par là.

La plupart des erreurs de débutant en ligne de commande, comme « No such file or
directory », viennent d’un chemin mal compris. Cette leçon règle la question une fois
pour toutes.

## L’arborescence

Sous Linux et macOS, tous les fichiers sont rangés dans **un seul arbre** de dossiers
(on dit aussi répertoires). Son sommet est la **racine**, notée `/`. Il n’y a pas de
lettres de lecteur comme `C:` sous Windows.

```text
/
├── bin
├── etc
├── home
│   ├── lea          ← ton dossier personnel (sous macOS : /Users/lea)
│   └── sam
├── tmp
└── usr
```

Chaque utilisateur a un **dossier personnel** (*home directory*), que le shell abrège en
`~` (tilde). Pour Léa sous Linux, `~` désigne `/home/lea`. Dans les exemples de ce cours,
remplace `lea` par ton propre nom d’utilisateur.

:::note[Et les fichiers Windows dans WSL ?]
Dans WSL, Linux a sa propre arborescence. Tes disques Windows sont accessibles sous
`/mnt` : le disque `C:` devient `/mnt/c`. Pour de meilleures performances, garde tes
projets dans ton dossier personnel Linux (`~`) plutôt que sous `/mnt/c`.

:::

## Préparer un terrain d’entraînement

Copie-colle ces commandes dans ton terminal. Elles créent un dossier `atelier-terminal`
avec quelques fichiers ; la leçon suivante expliquera chacune d’elles.

```bash
mkdir -p ~/atelier-terminal/projets/site/css ~/atelier-terminal/projets/api ~/atelier-terminal/notes
cd ~/atelier-terminal
touch projets/site/index.html projets/site/css/style.css notes/idees.txt notes/.brouillon.txt
echo 'Atelier terminal' > LISEZMOI.txt
```

Tu obtiens cette arborescence :

```text
atelier-terminal/
├── LISEZMOI.txt
├── notes/
│   ├── .brouillon.txt
│   └── idees.txt
└── projets/
    ├── api/
    └── site/
        ├── css/
        │   └── style.css
        └── index.html
```

## Où suis-je ? pwd

Le shell a toujours un **répertoire courant** (*working directory*) : le dossier dans
lequel il « se trouve ». `pwd` (*print working directory*) l’affiche :

```bash
pwd
```

```text
/home/lea/atelier-terminal
```

## Que contient ce dossier ? ls

`ls` (*list*) liste le contenu du répertoire courant :

```bash
ls
```

```text
LISEZMOI.txt  notes  projets
```

Les fichiers dont le nom commence par un point sont **cachés** : `ls` ne les montre pas.
L’option `-a` (*all*) les affiche :

```bash
ls -a notes
```

```text
.  ..  .brouillon.txt  idees.txt
```

Ici, `ls` reçoit un **argument**, `notes` : il liste ce dossier au lieu du répertoire
courant. Tu vois apparaître `.brouillon.txt`, ainsi que deux entrées spéciales, `.` et
`..`, expliquées plus bas. Beaucoup de fichiers de configuration sont cachés de cette
façon : `.gitignore`, `.env`, `.bashrc`.

L’option `-l` (*long*) donne une ligne détaillée par élément :

```bash
ls -l
```

```text
total 12
-rw-r--r-- 1 lea lea   17 Nov 21 10:42 LISEZMOI.txt
drwxr-xr-x 2 lea lea 4096 Nov 21 10:42 notes
drwxr-xr-x 4 lea lea 4096 Nov 21 10:42 projets
```

Tes dates et tailles de dossiers peuvent différer, et le mois est abrégé dans la langue
du système. Lis chaque ligne ainsi :

- le premier caractère indique le **type** : `-` pour un fichier, `d` pour un dossier
  (*directory*) ;
- les neuf suivants sont les **permissions** (lecture `r`, écriture `w`, exécution
  `x`, pour le propriétaire, le groupe et les autres) ;
- viennent ensuite le propriétaire (`lea`), le groupe, la **taille** en octets
  (`LISEZMOI.txt` fait 17 octets : 16 caractères et un saut de ligne), la date de
  dernière modification et le nom.

Les options courtes se combinent : `ls -la` équivaut à `ls -l -a`.

## Se déplacer : cd

`cd` (*change directory*) change le répertoire courant :

```bash
cd projets/site
pwd
ls
```

```text
/home/lea/atelier-terminal/projets/site
css  index.html
```

`cd` n’affiche rien quand il réussit : vérifie avec `pwd`, ou regarde l’invite, qui
montre en général le dossier courant.

## Chemins absolus et chemins relatifs

C’est **la** notion de cette leçon. Un chemin désigne un fichier ou un dossier de deux
façons.

**Un chemin absolu** commence par `/` (ou par `~`). Il part de la racine et désigne
toujours le même endroit, **où que tu sois** :

```text
/home/lea/atelier-terminal/projets/site/index.html
~/atelier-terminal/projets/site/index.html
```

**Un chemin relatif** ne commence pas par `/`. Il part du **répertoire courant**, et sa
signification dépend donc de l’endroit où tu te trouves :

```text
projets/site/index.html      depuis ~/atelier-terminal
site/index.html              depuis ~/atelier-terminal/projets
index.html                   depuis ~/atelier-terminal/projets/site
```

Deux noms spéciaux existent dans chaque dossier :

- **`.`** désigne le dossier **lui-même** : `./index.html` est `index.html` dans le
  dossier courant ;
- **`..`** désigne le dossier **parent** : depuis `projets/site`, `..` est `projets`
  et `../..` est `atelier-terminal`.

Tu reconnais la logique des URL relatives vue dans « Fonctionnement du web » : c’est la
même.

```bash
cd ..
pwd
cd ../notes
pwd
```

```text
/home/lea/atelier-terminal/projets
/home/lea/atelier-terminal/notes
```

### Les raccourcis de cd

| Commande  | Effet                                                    |
| --------- | -------------------------------------------------------- |
| `cd`      | Sans argument : retour au dossier personnel             |
| `cd ~`    | Idem                                                    |
| `cd -`    | Retour au dossier **précédent** (et affiche son chemin) |
| `cd /`    | Aller à la racine                                       |
| `cd ..`   | Remonter d’un niveau                                     |

```bash
cd -
```

```text
/home/lea/atelier-terminal/projets
```

## Les espaces dans les noms

Le shell sépare les arguments par des espaces. Un nom qui contient une espace doit
donc être **protégé**, sinon il est coupé en deux :

```bash
cd ~/atelier-terminal
mkdir "mes photos"
cd mes photos
```

```text
bash: cd: too many arguments
```

`cd` a reçu deux arguments, `mes` et `photos`. Trois façons correctes :

```bash
cd "mes photos"
cd 'mes photos'
cd mes\ photos
```

Les guillemets regroupent les mots ; la barre oblique inverse `\` protège le caractère
qui la suit. La complétion par **Tab** ajoute ces protections pour toi. Sous Linux,
`ls` affiche d’ailleurs ce nom entre apostrophes, `'mes photos'`, pour te le rappeler.

:::tip
Pour tes propres fichiers de code, évite espaces et accents : préfère `mes-photos` ou
`mes_photos`. Tu t’éviteras des ennuis avec de nombreux outils.

:::

## Pièges et idées reçues

**« No such file or directory, pourtant le fichier existe ! »** Le chemin est sans
doute relatif à un autre dossier que celui où tu te trouves. Tape `pwd`, puis `ls`, et
recompose le chemin depuis là.

**« `/projets` et `projets`, c’est pareil. »** `/projets` est un chemin absolu qui
désigne un dossier `projets` **à la racine** du système ; il n’existe probablement pas.

**« Les noms de fichiers ne tiennent pas compte des majuscules. »** Sous Linux,
`Notes.txt` et `notes.txt` sont deux fichiers différents. Sous macOS et Windows, les
systèmes de fichiers ignorent généralement la casse, ce qui cache des erreurs qui
apparaîtront plus tard sur un serveur Linux.

**« Le fichier caché a disparu. »** `ls` ne montre pas les noms qui commencent par un
point. Utilise `ls -a`.

**« J’ai tapé cd et rien ne s’est passé. »** Un `cd` réussi n’affiche rien. L’invite ou
`pwd` te confirment le changement.

## Exercices

### Exercice 1 : absolu ou relatif ?

Tu es dans `~/atelier-terminal/projets`. Pour chaque chemin, dis s’il est absolu ou
relatif, et donne le chemin absolu complet qu’il désigne (avec `/home/lea`).

1. `site/css/style.css`
2. `../notes/idees.txt`
3. `/notes/idees.txt`
4. `~/atelier-terminal/LISEZMOI.txt`
5. `./api`
6. `../../atelier-terminal/projets/site`

:::solution
1. Relatif : `/home/lea/atelier-terminal/projets/site/css/style.css`.
2. Relatif : `..` remonte à `atelier-terminal`, d’où
   `/home/lea/atelier-terminal/notes/idees.txt`.
3. **Absolu** : `/notes/idees.txt`, à la racine du système. Ce n’est **pas** le fichier
   du terrain d’entraînement, et il n’existe probablement pas : c’est le piège classique
   du `/` en trop.
4. Absolu (le `~` est remplacé par le dossier personnel) :
   `/home/lea/atelier-terminal/LISEZMOI.txt`.
5. Relatif : `/home/lea/atelier-terminal/projets/api`.
6. Relatif : `../..` remonte à `/home/lea`, puis on redescend :
   `/home/lea/atelier-terminal/projets/site`. Correct mais inutilement long :
   `site` suffisait.

:::

### Exercice 2 : le parcours

Depuis ton dossier personnel, en n’utilisant que `cd` avec des chemins **relatifs** :

1. va dans `atelier-terminal/projets/site/css` ;
2. remonte dans `atelier-terminal/notes` en une seule commande ;
3. reviens au dossier précédent en une commande ;
4. reviens dans ton dossier personnel en une commande.

Vérifie chaque étape avec `pwd`.

:::solution
```bash
cd
cd atelier-terminal/projets/site/css
pwd
cd ../../../notes
pwd
cd -
cd
pwd
```

Sorties de `pwd` (et de `cd -`, qui affiche le dossier atteint) :

```text
/home/lea/atelier-terminal/projets/site/css
/home/lea/atelier-terminal/notes
/home/lea/atelier-terminal/projets/site/css
/home/lea
```

Pour l’étape 2, il faut remonter trois niveaux (`css` → `site` → `projets` →
`atelier-terminal`) avant de descendre dans `notes`. Le premier `cd` sans argument
garantit le point de départ ; `cd ~` aurait le même effet.

:::

### Exercice 3 : lire ls -l

Voici une sortie de `ls -la` dans un projet :

```text
total 24
drwxr-xr-x 4 lea lea 4096 Nov 21 10:50 .
drwxr-xr-x 6 lea lea 4096 Nov 21 10:42 ..
-rw-r--r-- 1 lea lea   42 Nov 21 10:50 .env
-rw-r--r-- 1 lea lea   18 Nov 21 10:48 .gitignore
drwxr-xr-x 2 lea lea 4096 Nov 21 10:45 public
-rw-r--r-- 1 lea lea  512 Nov 21 10:49 server.js
```

1. Combien de dossiers et de fichiers ce projet contient-il (sans compter `.` et `..`) ?
2. Quels éléments `ls` sans option n’aurait-il pas affichés ?
3. Quelle est la taille de `server.js` ?

:::solution
1. Un seul dossier, `public` (ligne commençant par `d`), et trois fichiers : `.env`,
   `.gitignore` et `server.js`.
2. `ls` seul n’affiche ni `.`, ni `..`, ni les fichiers cachés `.env` et `.gitignore`.
   C’est important : un fichier `.env` contient souvent des secrets, et il est facile
   d’oublier qu’il existe.
3. 512 octets.

:::

## Récapitulatif

- Linux et macOS ont **une seule arborescence** qui part de la racine `/` ; ton dossier
  personnel est `~` (`/home/lea`, `/Users/lea` sous macOS).
- `pwd` affiche le répertoire courant, `ls` son contenu (`-a` pour les fichiers cachés,
  `-l` pour les détails), `cd` change de dossier.
- Un **chemin absolu** commence par `/` ou `~` et ne dépend pas de l’endroit où tu es ;
  un **chemin relatif** part du répertoire courant.
- `.` est le dossier courant, `..` le dossier parent ; `cd -` revient au dossier
  précédent, `cd` seul au dossier personnel.
- Protège les espaces avec des guillemets ou `\`, ou mieux : évite-les dans tes noms.
- Linux distingue majuscules et minuscules dans les noms de fichiers.
