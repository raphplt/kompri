---
title: JavaScript hors du navigateur
summary: Comprendre ce qu’est Node.js, ce qui le distingue du navigateur, et lancer ses premiers scripts.
durationMinutes: 45
sources:
  - title: Node.js — À propos de Node.js
    url: https://nodejs.org/en/about
  - title: Node.js — Versions et calendrier LTS
    url: https://nodejs.org/en/about/previous-releases
  - title: Documentation Node.js — process
    url: https://nodejs.org/api/process.html
  - title: Documentation Node.js — Objets globaux
    url: https://nodejs.org/api/globals.html
---

## Pourquoi exécuter JavaScript ailleurs que dans une page ?

Jusqu’ici, ton JavaScript vivait dans un navigateur, au service d’une page web. Mais un
site a aussi besoin d’un **serveur** : un programme qui reçoit les requêtes, lit une base de
données, écrit des fichiers, envoie des courriels. Le navigateur ne peut pas faire ces
choses-là, et c’est voulu : une page web ne doit pas pouvoir lire les fichiers de ton
ordinateur.

**Node.js** est un **environnement d’exécution** (_runtime_) qui permet de lancer du
JavaScript directement sur ta machine ou sur un serveur, comme on lance un programme Python
ou Java. Il réutilise V8, le moteur JavaScript de Chrome, et lui ajoute ce qui manque pour
écrire des outils et des serveurs : accès aux fichiers, au réseau, aux processus, aux
variables d’environnement.

Avec Node.js, on écrit :

- des **serveurs web** et des API (ce que tu feras avec Express) ;
- des **outils en ligne de commande** (convertisseurs, scripts d’automatisation) ;
- les **outils de développement** eux-mêmes : beaucoup de formateurs de code, de
  bundlers et d’exécuteurs de tests sont écrits en JavaScript et tournent sur Node.js.

## Vérifier l’installation et la version

```bash
node --version
npm --version
```

```text
v24.21.0
11.19.0
```

Tes numéros peuvent différer. Ce parcours utilise **Node.js 24**, une version **LTS**
(_Long Term Support_, support à long terme). Chaque version majeure de Node.js passe
d’abord six mois en phase _Current_ (la plus récente, pour que les bibliothèques s’adaptent),
puis certaines deviennent LTS : elles reçoivent alors les correctifs importants pendant
environ 30 mois au total, et ce sont celles qu’on choisit pour un projet réel. Jusqu’à
Node.js 26, seules les versions paires devenaient LTS (les impaires n’étaient plus suivies
après six mois) ; à partir de Node.js 27, le projet publie une version majeure par an et
chacune devient LTS. Si tu n’as pas Node.js ou une version trop ancienne, installe une
version LTS depuis `nodejs.org` ou avec un gestionnaire de versions comme `nvm`.

## Trois façons d’exécuter du JavaScript avec Node.js

### Le REPL, pour essayer

Tape simplement `node` : tu entres dans le **REPL** (_Read-Eval-Print Loop_), une console
interactive comme celle des outils de développement du navigateur.

```text
$ node
Welcome to Node.js v24.21.0.
Type ".help" for more information.
> 2 ** 10
1024
> 'Node'.toUpperCase()
'NODE'
> .exit
```

`.exit` (ou deux fois `Ctrl+C`) permet de sortir. Pratique pour vérifier une expression,
mais rien n’est enregistré.

### Un fichier de script

C’est la façon normale de travailler. Crée un dossier `decouverte`, et dedans un fichier
`package.json` qui contient seulement :

```json
{
  "type": "module"
}
```

Cette ligne indique à Node.js que tes fichiers `.js` utilisent les **modules ES**
(`import`/`export`), la syntaxe moderne que nous utiliserons partout. La leçon suivante
l’explique en détail.

Crée ensuite `bonjour.js` :

```js
const name = 'Node.js';
console.log(`Bonjour depuis ${name} ${process.version} !`);
console.log(`Système : ${process.platform}`);
console.log(`Dossier courant : ${process.cwd()}`);
```

```bash
node bonjour.js
```

```text
Bonjour depuis Node.js v24.21.0 !
Système : linux
Dossier courant : /home/camille/projets/decouverte
```

`process.platform` vaut `linux`, `darwin` (macOS) ou `win32` (Windows) ; `process.cwd()`
(_current working directory_) renvoie le dossier **depuis lequel tu as lancé** la commande,
pas forcément celui où se trouve le script. Cette nuance comptera quand nous lirons des
fichiers.

### Une expression en ligne de commande

```bash
node -e "console.log(1 + 2)"
```

```text
3
```

L’option `-e` (_evaluate_) exécute le code passé en argument. Utile dans un script shell,
rarement ailleurs.

## Ce qui change par rapport au navigateur

Le **langage** est exactement le même : variables, fonctions, tableaux, objets, classes,
promesses. Ce qui change, ce sont les **objets fournis par l’environnement**.

| Disponible dans le navigateur                  | Disponible dans Node.js                         |
| ---------------------------------------------- | ----------------------------------------------- |
| `window`, `document`, le DOM                   | `process` (le programme en cours)               |
| `alert`, `prompt`, les événements de la page   | accès aux fichiers (`node:fs`)                  |
| `localStorage`, les cookies de la page         | création de serveurs réseau (`node:http`)       |
| exécution dans un bac à sable très restreint   | droits de l’utilisateur qui lance le programme  |

Certains outils existent **dans les deux** : `console`, `setTimeout`, `fetch`, `URL`,
`JSON`, `globalThis` (l’objet global, quel que soit l’environnement).

```js
console.log(typeof window);
console.log(typeof document);
console.log(typeof globalThis);
console.log(typeof setTimeout, typeof fetch, typeof URL);
console.log(typeof process, typeof Buffer);
```

```text
undefined
undefined
object
function function function
object function
```

Et si tu tentes d’utiliser le DOM :

```text
ReferenceError: document is not defined
```

:::warning[Un programme Node.js a tes droits]
Dans le navigateur, une page ne peut pas effacer tes fichiers. Un script Node.js, lui,
s’exécute avec **tous les droits de l’utilisateur qui le lance** : il peut lire tes
documents, supprimer un dossier, envoyer des données sur le réseau. N’exécute que du code
que tu comprends, et méfie-toi des paquets installés sans vérification (nous y reviendrons
avec npm).
:::

## L’objet process

`process` représente le programme en cours d’exécution. Ses propriétés les plus utiles :

| Propriété ou méthode | Rôle                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `process.argv`       | les arguments de la ligne de commande                            |
| `process.env`        | les variables d’environnement (leçon 5)                          |
| `process.cwd()`      | le dossier courant                                               |
| `process.exitCode`   | le code de sortie à renvoyer au shell quand le programme finit   |
| `process.platform`   | le système d’exploitation                                        |
| `process.version`    | la version de Node.js                                            |

### Lire les arguments

```js
// args.js
console.log(process.argv);
```

```bash
node args.js 12 "deux mots" --verbose
```

```text
[
  '/usr/local/bin/node',
  '/home/camille/projets/decouverte/args.js',
  '12',
  'deux mots',
  '--verbose'
]
```

Les deux premiers éléments sont le chemin de l’exécutable `node` (il dépend de ton
installation) et celui du script. Les arguments commencent donc à l’indice 2 :
`process.argv.slice(2)`. Ce sont **toujours des chaînes** : `'12'`, pas `12`. Les guillemets
du shell regroupent `deux mots` en un seul argument.

### Signaler un échec avec le code de sortie

Tu sais qu’un programme termine avec un **code de sortie** : 0 pour un succès, autre chose
pour un échec. En Node.js, on fixe ce code avec `process.exitCode`, et on écrit les messages
d’erreur sur la **sortie d’erreur** avec `console.error` :

```js
// somme.js — additionne les nombres passés en arguments : node somme.js 4 5 6
const values = process.argv.slice(2);

if (values.length === 0) {
  console.error('Usage : node somme.js NOMBRE...');
  process.exitCode = 1;
} else {
  let total = 0;
  let valid = true;
  for (const value of values) {
    const number = Number(value);
    if (value.trim() === '' || Number.isNaN(number)) {
      console.error(`« ${value} » n'est pas un nombre.`);
      valid = false;
      break;
    }
    total += number;
  }
  if (valid) {
    console.log(`Total : ${total}`);
  } else {
    process.exitCode = 1;
  }
}
```

```bash
node somme.js 4 5 6; echo "code : $?"
node somme.js 4 abc; echo "code : $?"
```

```text
Total : 15
code : 0
« abc » n'est pas un nombre.
code : 1
```

Pourquoi `console.error` ? Parce que la sortie standard (`console.log`) et la sortie
d’erreur (`console.error`) sont deux flux séparés que le shell peut rediriger
indépendamment :

```bash
node somme.js x > resultat.txt 2> erreurs.txt
```

Ici, `resultat.txt` reste vide et `erreurs.txt` contient le message d’erreur. Un programme
qui enchaîne ton script peut ainsi récupérer les résultats sans les mélanger aux erreurs.

:::tip[exitCode plutôt que exit]
`process.exit(1)` arrête le programme **immédiatement**, même si des écritures de fichiers
ou des affichages sont encore en cours. `process.exitCode = 1` laisse le programme finir
proprement, puis renvoie ce code. Préfère `exitCode` ; réserve `exit()` aux cas où il faut
vraiment tout interrompre.
:::

## Un premier aperçu de l’asynchrone

Lire un fichier ou interroger un serveur prend du temps. Plutôt que de bloquer tout le
programme pendant l’attente, Node.js lance l’opération et rend la main : l’opération renvoie
une **promesse**, c’est-à-dire un objet qui représente un résultat à venir. Le mot-clé
`await` attend ce résultat.

```js
// attente.js
import { readFile } from 'node:fs/promises';

console.log('A. Je demande la lecture du fichier');
const promise = readFile('package.json', 'utf8');
console.log('B. Pendant la lecture, le programme continue');
const text = await promise;
console.log(`C. Lecture terminée : ${text.length} caractères`);
```

```text
A. Je demande la lecture du fichier
B. Pendant la lecture, le programme continue
C. Lecture terminée : 23 caractères
```

Le fichier `package.json` écrit plus haut compte 23 caractères, espaces et retours à la
ligne compris. Ce fonctionnement **non bloquant** est la grande force de Node.js pour les
serveurs : pendant qu’une requête attend la base de données, d’autres requêtes sont
traitées. Dans la pratique, tu écriras presque toujours `await` directement :
`const text = await readFile(…)`. La compétence sur l’asynchrone détaille les promesses ; ici,
retiens seulement que **les opérations d’entrée-sortie de Node.js renvoient des promesses
qu’on attend avec `await`**.

## Pièges courants

- **Lancer `node` sans fichier et taper du shell dedans.** Si l’invite devient `>`, tu es
  dans le REPL : `ls` ou `cd` n’y fonctionnent pas. Sors avec `.exit`.
- **Oublier que les arguments sont des chaînes.** `process.argv[2] + 1` avec l’argument
  `4` donne `'41'`. Convertis explicitement avec `Number()` et vérifie `Number.isNaN`.
- **Chercher `window` ou `document`.** Ils n’existent pas : un tutoriel qui les utilise
  concerne le navigateur.
- **Afficher les erreurs avec `console.log`.** Elles se mélangent aux résultats ; utilise
  `console.error` et un code de sortie non nul.
- **Exécuter un script trouvé en ligne sans le lire.** Il a tous tes droits.

## Exercices

### Exercice 1 — Carte d’identité de l’environnement

Écris `info.js` qui affiche la version de Node.js, le système, le chemin du script en cours
d’exécution et la liste des arguments séparés par des virgules (ou `(aucun)`). Exécute-le
avec `node info.js a b`.

:::solution
```js
// info.js
console.log(`Node ${process.version} sur ${process.platform}`);
console.log(`Script : ${process.argv[1]}`);
console.log(`Arguments : ${process.argv.slice(2).join(', ') || '(aucun)'}`);
```

```text
Node v24.21.0 sur linux
Script : /home/camille/projets/decouverte/info.js
Arguments : a, b
```

`process.argv[1]` est le chemin absolu du script. `join(', ')` sur un tableau vide renvoie
la chaîne vide, qui est _falsy_ : l’opérateur `||` la remplace alors par `(aucun)`. Les
valeurs exactes de la version, du système et du chemin dépendent de ta machine.
:::

### Exercice 2 — Le plus grand nombre

Écris `max.js` qui affiche le plus grand des nombres passés en arguments. Sans argument ou
avec un argument invalide, le script affiche un message sur la sortie d’erreur et se
termine avec le code 1. Vérifie avec `node max.js 3 17 -2`, `node max.js` et
`node max.js 3 douze`, suivis de `echo $?`.

:::solution
```js
// max.js
const values = process.argv.slice(2).map((value) => ({ value, number: Number(value) }));
const invalid = values.find(({ value, number }) => value.trim() === '' || Number.isNaN(number));

if (values.length === 0) {
  console.error('Usage : node max.js NOMBRE...');
  process.exitCode = 1;
} else if (invalid) {
  console.error(`« ${invalid.value} » n'est pas un nombre.`);
  process.exitCode = 1;
} else {
  console.log(Math.max(...values.map(({ number }) => number)));
}
```

```text
$ node max.js 3 17 -2; echo $?
17
0
$ node max.js; echo $?
Usage : node max.js NOMBRE...
1
$ node max.js 3 douze; echo $?
« douze » n'est pas un nombre.
1
```

`Number('')` vaut 0 : sans le test `value.trim() === ''`, un argument vide (`""`)
passerait pour un nombre. `Math.max(...tableau)` décompose le tableau en arguments. Le code
de sortie permet à un autre programme de savoir si le calcul a réussi.
:::

### Exercice 3 — Navigateur ou Node.js ?

Pour chaque ligne, dis si elle fonctionne dans le navigateur, dans Node.js, ou dans les
deux : `document.title = 'X'` ; `console.log(new URL('https://exemple.fr/a?b=1').searchParams.get('b'))` ;
`process.exitCode = 2` ; `setTimeout(() => console.log('ok'), 100)` ;
`localStorage.setItem('a', '1')`.

:::solution
- `document.title = 'X'` : navigateur seulement (le DOM n’existe pas dans Node.js).
- `new URL(…)` : les deux ; affiche `1`.
- `process.exitCode = 2` : Node.js seulement.
- `setTimeout(…)` : les deux.
- `localStorage.setItem(…)` : navigateur. Ne compte pas sur `localStorage` côté serveur :
  pour stocker des données, Node.js écrit dans des fichiers ou une base de données.
:::

## Récapitulatif

- Node.js est un environnement d’exécution qui fait tourner JavaScript hors du navigateur,
  avec le moteur V8 et des modules pour les fichiers, le réseau et les processus.
- Utilise une version LTS ; vérifie-la avec `node --version`.
- `node fichier.js` exécute un script ; `node` seul ouvre le REPL (`.exit` pour sortir).
- Pas de `window` ni de DOM ; `process`, les fichiers et le réseau en plus ; `console`,
  `setTimeout`, `fetch`, `URL` des deux côtés.
- `process.argv.slice(2)` donne les arguments, toujours sous forme de chaînes.
- `console.error` écrit sur la sortie d’erreur ; `process.exitCode = 1` signale un échec.
- Les entrées-sorties renvoient des promesses qu’on attend avec `await`.
- Un script Node.js a tous les droits de son utilisateur : n’exécute que du code compris.
