---
title: Lire et écrire des fichiers, gérer les chemins
summary: Utiliser node:fs/promises et node:path pour manipuler fichiers et dossiers de façon fiable et sûre.
durationMinutes: 60
sources:
  - title: Documentation Node.js — File system (API promesses)
    url: https://nodejs.org/api/fs.html
  - title: Documentation Node.js — Path
    url: https://nodejs.org/api/path.html
  - title: OWASP — Path Traversal
    url: https://owasp.org/www-community/attacks/Path_Traversal
---

## Des données qui survivent au programme

Quand un script se termine, ses variables disparaissent. Pour garder des données (un journal,
une configuration, des notes, des fichiers déposés par des utilisateurs), il faut les
**écrire sur le disque**, puis savoir les relire. C’est le rôle du module natif `node:fs`
(_file system_), et plus précisément de son interface à base de promesses,
**`node:fs/promises`**. Le module **`node:path`** l’accompagne pour construire des chemins
corrects sur tous les systèmes.

:::note[Trois styles d’API]
`node:fs` existe en trois versions : avec des **callbacks** (`fs.readFile(chemin, fonction)`,
le style historique), **synchrone** (`fs.readFileSync`, qui bloque tout le programme pendant
la lecture) et avec des **promesses** (`node:fs/promises`). Dans ce parcours, on utilise les
promesses avec `await` : le code se lit de haut en bas et ne bloque pas un serveur. Les
versions synchrones restent acceptables dans un petit script lancé une fois, jamais dans le
traitement d’une requête.
:::

## Lire et écrire un fichier texte

```js
// premiers-pas.js
import { readFile, writeFile, appendFile } from 'node:fs/promises';

await writeFile('bonjour.txt', 'Bonjour\n', 'utf8');
await appendFile('bonjour.txt', 'Deuxième ligne\n', 'utf8');

const text = await readFile('bonjour.txt', 'utf8');
console.log(text);
console.log(JSON.stringify(text));
```

```bash
node premiers-pas.js
```

```text
Bonjour
Deuxième ligne

"Bonjour\nDeuxième ligne\n"
```

- `writeFile` crée le fichier ou **remplace entièrement** son contenu.
- `appendFile` ajoute à la fin (et crée le fichier s’il n’existe pas).
- `readFile` lit tout le contenu. `JSON.stringify(text)` montre les caractères invisibles :
  le fichier se termine par un retour à la ligne, d’où la ligne vide dans le premier
  affichage.

### L’encodage : 'utf8' ou des octets

Sans encodage, `readFile` renvoie un **Buffer**, c’est-à-dire les octets bruts :

```js
const buffer = await readFile('bonjour.txt');
console.log(buffer);
```

```text
<Buffer 42 6f 6e 6a 6f 75 72 0a 44 65 75 78 69 c3 a8 6d 65 20 6c 69 67 6e 65 0a>
```

`42` est le code de `B`, `0a` le retour à la ligne, et `c3 a8` les **deux** octets qui
encodent `è` en UTF-8. Pour du texte, passe toujours `'utf8'`. Le Buffer sert pour les
fichiers binaires (images, PDF) qu’on ne veut pas interpréter comme du texte.

## Les opérations courantes

| Fonction (`node:fs/promises`)            | Effet                                                         |
| ---------------------------------------- | ------------------------------------------------------------- |
| `readFile(chemin, 'utf8')`               | lit tout le fichier                                           |
| `writeFile(chemin, texte, 'utf8')`       | crée ou remplace                                              |
| `appendFile(chemin, texte, 'utf8')`      | ajoute à la fin                                               |
| `mkdir(chemin, { recursive: true })`     | crée un dossier et ses parents, sans erreur s’il existe déjà  |
| `readdir(chemin)`                        | liste les noms contenus dans un dossier                       |
| `stat(chemin)`                           | informations : taille, dates, fichier ou dossier              |
| `copyFile(source, destination)`          | copie un fichier                                              |
| `rename(ancien, nouveau)`                | renomme ou déplace                                            |
| `rm(chemin, { recursive: true, force: true })` | supprime un fichier ou un dossier entier                |

Toutes renvoient une promesse : n’oublie pas `await`.

:::warning[rm est définitif]
`rm` ne passe pas par la corbeille. Avec `recursive: true`, un chemin mal construit peut
effacer bien plus que prévu. Vérifie toujours le chemin (affiche-le d’abord) avant de
supprimer.
:::

## Quand une opération échoue

Un fichier peut manquer, un dossier être protégé, un disque être plein. Une opération qui
échoue **rejette** sa promesse : avec `await`, cela se traduit par une exception, qu’on
attrape avec `try`/`catch`. L’erreur porte une propriété `code` stable, bien plus fiable
que le texte du message :

| Code      | Signification                                       |
| --------- | --------------------------------------------------- |
| `ENOENT`  | le fichier ou le dossier n’existe pas               |
| `EEXIST`  | il existe déjà (création exclusive)                 |
| `EACCES`  | permission refusée                                  |
| `EISDIR`  | c’est un dossier alors qu’on attendait un fichier   |
| `ENOTDIR` | une partie du chemin n’est pas un dossier           |

```js
try {
  await readFile('absent.txt', 'utf8');
} catch (error) {
  console.log(error.code);
  console.log(error.message);
}
```

```text
ENOENT
ENOENT: no such file or directory, open 'absent.txt'
```

La règle : **traite les erreurs que tu sais gérer, laisse remonter les autres**. Un fichier
absent peut être normal (premier lancement) ; une permission refusée ne l’est pas, et la
masquer rendrait le problème invisible.

## Un exemple complet : un journal de bord en JSON

Le format JSON est idéal pour enregistrer des données structurées : `JSON.stringify` pour
écrire, `JSON.parse` pour relire.

```js
// journal.js — un petit journal de bord en ligne de commande
// node journal.js ajouter "Texte de l'entrée"
// node journal.js lister
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.join(import.meta.dirname, 'data');
const journalFile = path.join(dataDir, 'journal.json');

async function loadEntries() {
  try {
    const text = await readFile(journalFile, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // pas encore de journal : on part d'une liste vide
    }
    throw error; // toute autre erreur est inattendue : on la laisse remonter
  }
}

async function saveEntries(entries) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(journalFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

const [command, text] = process.argv.slice(2);

if (command === 'ajouter' && text) {
  const entries = await loadEntries();
  entries.push({ date: new Date().toISOString().slice(0, 10), text });
  await saveEntries(entries);
  console.log(`Entrée n° ${entries.length} enregistrée.`);
} else if (command === 'lister') {
  const entries = await loadEntries();
  if (entries.length === 0) {
    console.log('Le journal est vide.');
  }
  for (const [index, entry] of entries.entries()) {
    console.log(`${index + 1}. [${entry.date}] ${entry.text}`);
  }
} else {
  console.error('Usage : node journal.js ajouter "texte" | node journal.js lister');
  process.exitCode = 1;
}
```

```bash
node journal.js lister
node journal.js ajouter "Découverte de node:fs/promises"
node journal.js ajouter "Les chemins avec node:path"
node journal.js lister
```

```text
Le journal est vide.
Entrée n° 1 enregistrée.
Entrée n° 2 enregistrée.
1. [2026-11-21] Découverte de node:fs/promises
2. [2026-11-21] Les chemins avec node:path
```

(La date affichée est celle du jour, en temps universel.) Le fichier `data/journal.json`
contient :

```json
[
  {
    "date": "2026-11-21",
    "text": "Découverte de node:fs/promises"
  },
  {
    "date": "2026-11-21",
    "text": "Les chemins avec node:path"
  }
]
```

Points à retenir :

- `JSON.stringify(entries, null, 2)` indente le JSON de deux espaces : le fichier reste
  lisible et ses modifications se voient bien dans Git.
- `mkdir(…, { recursive: true })` avant d’écrire garantit que le dossier existe.
- Si le fichier est corrompu (par exemple `{ invalide`), `JSON.parse` lève une
  `SyntaxError` qui n’est **pas** attrapée : le programme s’arrête avec un message clair au
  lieu d’écraser silencieusement les données avec une liste vide.

## Construire des chemins avec node:path

Assembler des chemins à la main (`dossier + '/' + fichier`) produit des doubles barres, des
`..` mal gérés, et ne fonctionne pas sous Windows, qui utilise `\`. `node:path` s’en
charge :

```js
import path from 'node:path';

console.log(path.join('data', 'notes', '..', 'todo.json'));
console.log(path.join('/srv/app', 'data', 'todo.json'));
console.log(path.basename('/srv/app/data/todo.json'));
console.log(path.basename('/srv/app/data/todo.json', '.json'));
console.log(path.extname('photo.de.vacances.jpg'));
console.log(path.dirname('/srv/app/data/todo.json'));
console.log(path.relative('/srv/app', '/srv/app/data/todo.json'));
```

```text
data/todo.json
/srv/app/data/todo.json
todo.json
todo
.jpg
/srv/app/data
data/todo.json
```

| Fonction                 | Rôle                                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| `path.join(...parties)`  | assemble et normalise (résout `..` et `.`)                              |
| `path.resolve(...parties)` | produit un chemin **absolu**, en partant du dossier courant si besoin |
| `path.basename(p, ext)`  | dernier élément, éventuellement sans l’extension                        |
| `path.extname(p)`        | extension, à partir du dernier point                                    |
| `path.dirname(p)`        | dossier parent                                                          |
| `path.relative(de, vers)` | chemin relatif de l’un à l’autre                                       |
| `path.parse(p)`          | toutes les parties d’un coup (`dir`, `name`, `ext`…)                    |

Sous Windows, ces fonctions produisent des `\` : ton code reste le même.

### Relatif à quoi ? process.cwd() contre import.meta.dirname

Un chemin relatif comme `'data/journal.json'` est interprété par rapport au **dossier
courant** (`process.cwd()`), c’est-à-dire le dossier depuis lequel on a lancé `node`, **pas**
celui du script. Démonstration avec un script `sous/ou.js` :

```js
import path from 'node:path';
console.log('cwd     :', process.cwd());
console.log('dirname :', import.meta.dirname);
console.log(path.join(import.meta.dirname, 'data.json'));
```

```text
$ node sous/ou.js
cwd     : /home/camille/projet
dirname : /home/camille/projet/sous
/home/camille/projet/sous/data.json
$ cd sous && node ou.js
cwd     : /home/camille/projet/sous
dirname : /home/camille/projet/sous
/home/camille/projet/sous/data.json
```

Pour un fichier qui **fait partie du programme** (données, modèles, configuration), construis
son chemin à partir de `import.meta.dirname` : il fonctionnera d’où qu’on lance le script.
Le journal ci-dessus fonctionne ainsi. Pour un fichier **désigné par l’utilisateur** en
argument, garde le chemin relatif au dossier courant : c’est ce qu’il attend.

## Ne jamais faire confiance à un nom de fichier fourni

Imagine un script (ou plus tard un serveur) qui affiche une note choisie par l’utilisateur :
`path.join(notesDir, name)`. Si `name` vaut `../../etc/passwd`, le chemin **sort** du
dossier des notes :

```js
path.join('/srv/app/notes', '../../etc/passwd'); // '/srv/etc/passwd'
path.resolve('/srv/app/notes', '/etc/passwd');   // '/etc/passwd'
```

C’est une attaque par **traversée de répertoire** (_path traversal_) : elle permet de lire,
voire d’écraser, des fichiers hors du dossier prévu. La parade : résoudre le chemin complet,
puis vérifier qu’il reste **à l’intérieur** du dossier autorisé.

```js
// lire-note.js — affiche une note : node lire-note.js courses.txt
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const notesDir = path.join(import.meta.dirname, 'notes');

function resolveNotePath(name) {
  const fullPath = path.resolve(notesDir, name);
  // Refuse tout chemin qui sortirait du dossier des notes
  if (!fullPath.startsWith(notesDir + path.sep)) {
    throw new Error(`Nom de note invalide : ${name}`);
  }
  return fullPath;
}

const name = process.argv[2];
try {
  const text = await readFile(resolveNotePath(name ?? ''), 'utf8');
  process.stdout.write(text);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`La note « ${name} » n'existe pas.`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
}
```

```text
$ node lire-note.js courses.txt
Acheter du pain
$ node lire-note.js absente.txt
La note « absente.txt » n'existe pas.
$ node lire-note.js ../package.json
Nom de note invalide : ../package.json
$ node lire-note.js /etc/passwd
Nom de note invalide : /etc/passwd
```

Le `+ path.sep` est important : sans lui, un dossier voisin nommé `notes-secretes`
commencerait lui aussi par `…/notes` et passerait le test. `process.stdout.write` affiche
le texte sans ajouter de retour à la ligne, puisque le fichier en contient déjà un.

## Pièges courants

- **Oublier `await`.** `const text = readFile(…)` donne une promesse, pas le contenu :
  `console.log(text)` affiche `Promise { <pending> }`.
- **Oublier `'utf8'`.** Tu obtiens un Buffer au lieu d’une chaîne.
- **Chemins relatifs au mauvais dossier.** Le script marche depuis son dossier et échoue
  ailleurs : utilise `import.meta.dirname` pour ses propres fichiers.
- **Avaler toutes les erreurs.** Un `catch` qui renvoie `[]` quelle que soit l’erreur
  efface les données au prochain enregistrement si le fichier est simplement illisible.
  Teste `error.code`.
- **Concaténer des chemins à la main** ou faire confiance à un nom de fichier fourni.
- **Écrire un fichier pendant qu’un autre traitement l’écrit aussi.** Deux écritures
  simultanées peuvent perdre des données : pour plusieurs utilisateurs, une base de données
  est le bon outil.

## Exercices

### Exercice 1 — Compter lignes, mots et caractères

Écris `compter.js` qui reçoit un chemin de fichier en argument et affiche son nom, son
nombre de lignes, de mots et de caractères. Messages clairs et code de sortie 1 si
l’argument manque, si le fichier n’existe pas ou si c’est un dossier. Teste avec un fichier
`texte.txt` contenant les quatre lignes `Le chat dort.`, `Le chien aboie fort.`, une ligne
vide et `Fin.`, chacune terminée par un retour à la ligne.

:::solution
```js
// compter.js — statistiques d'un fichier texte : node compter.js texte.txt
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage : node compter.js FICHIER');
  process.exitCode = 1;
} else {
  try {
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop(); // le dernier retour à la ligne ne crée pas de ligne
    const words = text.split(/\s+/).filter((word) => word !== '');
    console.log(`${path.basename(file)} : ${lines.length} lignes, ${words.length} mots, ${text.length} caractères`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Fichier introuvable : ${file}`);
    } else if (error.code === 'EISDIR') {
      console.error(`${file} est un dossier, pas un fichier.`);
    } else {
      throw error;
    }
    process.exitCode = 1;
  }
}
```

```text
$ node compter.js texte.txt
texte.txt : 4 lignes, 8 mots, 41 caractères
$ node compter.js absent.txt
Fichier introuvable : absent.txt
$ node compter.js notes
notes est un dossier, pas un fichier.
```

Le chemin est fourni par l’utilisateur : il reste relatif au dossier courant, c’est le
comportement attendu d’un outil en ligne de commande. `text.length` compte des unités de
code JavaScript, ce qui correspond aux caractères pour un texte français courant.
L’expression `/\s+/` découpe sur toute suite d’espaces, tabulations et retours à la ligne ;
le `filter` retire la chaîne vide qui apparaît en fin de texte.
:::

### Exercice 2 — Sauvegarde datée

Écris `sauvegarder.js` qui copie le fichier passé en argument dans un dossier `backups`
situé **à côté du script**, en ajoutant la date au nom : `texte.txt` devient
`backups/texte-AAAA-MM-JJ.txt`. Le dossier est créé s’il n’existe pas.

:::solution
```js
// sauvegarder.js — copie un fichier dans backups/ avec la date : node sauvegarder.js texte.txt
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
  console.error('Usage : node sauvegarder.js FICHIER');
  process.exitCode = 1;
} else {
  const backupDir = path.join(import.meta.dirname, 'backups');
  await mkdir(backupDir, { recursive: true });
  const { name, ext } = path.parse(source);
  const date = new Date().toISOString().slice(0, 10);
  const target = path.join(backupDir, `${name}-${date}${ext}`);
  await copyFile(source, target);
  console.log(`Copie créée : ${path.relative(process.cwd(), target)}`);
}
```

```text
$ node sauvegarder.js texte.txt
Copie créée : backups/texte-2026-11-21.txt
$ node sauvegarder.js notes/courses.txt
Copie créée : backups/courses-2026-11-21.txt
```

`path.parse` sépare le nom (`name`) de l’extension (`ext`), même si le fichier est dans un
sous-dossier. Le dossier de sauvegarde dépend de `import.meta.dirname` (il fait partie du
programme), alors que la source dépend du dossier courant (elle est choisie par
l’utilisateur). Une erreur `ENOENT` sur une source absente n’est pas attrapée ici : à toi
d’ajouter un message clair comme dans l’exercice 1.
:::

### Exercice 3 — Où est la faille ?

Un collègue propose cette fonction pour un futur serveur de téléchargement. Explique le
problème et corrige-la.

```js
import { readFile } from 'node:fs/promises';

export async function readUpload(fileName) {
  return readFile(`./uploads/${fileName}`);
}
```

:::solution
Deux problèmes :

1. **Traversée de répertoire** : avec `fileName` égal à `../.env`, la fonction lit le
   fichier de secrets du projet. Tout nom fourni par un utilisateur doit être vérifié.
2. **Chemin relatif au dossier courant** : `./uploads` dépend de l’endroit d’où le serveur
   est lancé.

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const uploadsDir = path.join(import.meta.dirname, 'uploads');

export async function readUpload(fileName) {
  const fullPath = path.resolve(uploadsDir, fileName);
  if (!fullPath.startsWith(uploadsDir + path.sep)) {
    throw new Error('Nom de fichier invalide');
  }
  return readFile(fullPath);
}
```

On garde la lecture sans encodage : un fichier déposé peut être une image. Si les fichiers
sont toujours au premier niveau du dossier, `path.basename(fileName)` est une alternative
plus stricte encore, qui retire tout chemin.
:::

## Récapitulatif

- `node:fs/promises` fournit `readFile`, `writeFile`, `appendFile`, `mkdir`, `readdir`,
  `stat`, `copyFile`, `rename`, `rm`, à utiliser avec `await`.
- Passe `'utf8'` pour du texte ; sans encodage, tu obtiens un Buffer d’octets.
- Les erreurs ont un `code` (`ENOENT`, `EEXIST`, `EACCES`…) : gère celles que tu attends,
  laisse remonter les autres.
- JSON : `JSON.stringify(données, null, 2)` pour écrire, `JSON.parse` pour relire.
- `node:path` construit des chemins portables : `join`, `resolve`, `basename`, `extname`,
  `dirname`, `relative`, `parse`.
- Les chemins relatifs partent du dossier courant ; utilise `import.meta.dirname` pour les
  fichiers du programme.
- Un nom de fichier fourni par l’utilisateur doit être résolu puis vérifié pour empêcher la
  traversée de répertoire.
