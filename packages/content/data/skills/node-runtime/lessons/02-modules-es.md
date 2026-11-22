---
title: Organiser son code en modules ES
summary: Découper un programme en fichiers avec import et export, et comprendre comment Node.js les résout.
durationMinutes: 50
sources:
  - title: Documentation Node.js — Modules ECMAScript
    url: https://nodejs.org/api/esm.html
  - title: Documentation Node.js — Modules (package.json, type)
    url: https://nodejs.org/api/packages.html
  - title: MDN — Les modules JavaScript
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Modules
---

## Un fichier de 800 lignes

Un script qui grossit devient vite illisible : les fonctions de calcul côtoient l’affichage,
la lecture des fichiers et la configuration. On ne sait plus quelle fonction dépend de
quelle variable. La solution est de découper le programme en **modules** : des fichiers qui
**exportent** ce qu’ils proposent et **importent** ce dont ils ont besoin. Chaque module a
sa propre portée : ce qui n’est pas exporté reste privé.

JavaScript dispose depuis ES2015 d’un système de modules standard, les **modules ES**
(_ECMAScript modules_, ou ESM), avec les mots-clés `import` et `export`. C’est le même
système dans le navigateur (`script type="module"`) et dans Node.js.

## Activer les modules ES dans un projet

Node.js connaît deux systèmes de modules : les modules ES et un système plus ancien,
**CommonJS** (`require`). Pour un fichier `.js`, Node.js choisit selon le champ `type` du
fichier `package.json` le plus proche :

| `package.json`             | Les fichiers `.js` sont…                                      |
| -------------------------- | ------------------------------------------------------------- |
| `"type": "module"`         | des modules ES                                                |
| `"type": "commonjs"`       | des modules CommonJS                                          |
| pas de champ `type`        | CommonJS, sauf si Node.js détecte une syntaxe `import`/`export` |

Quelle que soit la configuration, l’extension `.mjs` force un module ES et `.cjs` un module
CommonJS. Pour tout nouveau projet, on écrit `"type": "module"` dans `package.json`. Sans
ce champ, Node.js 24 sait reconnaître un fichier qui contient `import`, mais affiche un
avertissement :

```text
[MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///…/index.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /…/package.json.
```

Le message dit lui-même comment le corriger.

## Exporter et importer

Construisons un petit projet `boutique` :

```text
boutique/
  package.json
  src/
    prices.js
    format.js
    main.js
```

`package.json` :

```json
{
  "name": "boutique",
  "type": "module"
}
```

### Les exports nommés

`src/prices.js` :

```js
// prices.js — calculs de prix
export const VAT_RATE = 0.2;

export function addVat(priceExcludingTax) {
  return priceExcludingTax * (1 + VAT_RATE);
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

export function totalWithVat(items) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return roundCents(addVat(total));
}
```

`export` devant une déclaration la rend disponible pour les autres modules, **sous son
nom**. `roundCents` n’est pas exportée : c’est un détail interne, invisible de l’extérieur.

### L’export par défaut

`src/format.js` :

```js
// format.js — mise en forme des montants
export default function formatEuros(amount) {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}
```

Un module peut avoir **au plus un** export par défaut, en plus d’éventuels exports nommés.

### Importer

`src/main.js` :

```js
// main.js — point d'entrée
import formatEuros from './format.js';
import { totalWithVat, VAT_RATE } from './prices.js';

const cart = [
  { name: 'Carnet', price: 4.5, quantity: 2 },
  { name: 'Stylo', price: 1.25, quantity: 4 },
];

console.log(`TVA : ${VAT_RATE * 100} %`);
console.log(`Total TTC : ${formatEuros(totalWithVat(cart))}`);
```

```bash
node src/main.js
```

```text
TVA : 20 %
Total TTC : 16,80 €
```

- `import formatEuros from …` importe l’export **par défaut** ; tu choisis librement le nom
  local.
- `import { totalWithVat, VAT_RATE } from …` importe des exports **nommés** : les noms
  entre accolades doivent correspondre exactement.

### Les autres formes d’import

```js
import * as prices from './prices.js';
import { addVat as withTax } from './prices.js';

console.log(Object.keys(prices));
console.log(withTax(10));
console.log(prices.roundCents);
```

```text
[ 'VAT_RATE', 'addVat', 'totalWithVat' ]
12
undefined
```

- `import * as prices` regroupe tous les exports nommés dans un objet (un **espace de
  noms**). `roundCents` n’y figure pas : elle n’est pas exportée.
- `as` renomme un import, utile en cas de conflit de noms.

### Nommé ou par défaut ?

C’est une question de **convention**. Les exports nommés ont un avantage : le nom est
imposé, ce qui évite qu’un même élément s’appelle différemment selon les fichiers, et les
éditeurs les proposent automatiquement. Beaucoup d’équipes réservent l’export par défaut
au cas d’un module qui ne fait qu’une chose. Suis la convention du projet.

## Comment Node.js trouve un module

Le texte après `from` s’appelle le **spécificateur**. Il en existe trois sortes :

| Spécificateur      | Exemple                         | Ce que Node.js charge                               |
| ------------------ | ------------------------------- | --------------------------------------------------- |
| relatif            | `'./format.js'`, `'../config.js'` | un fichier, relativement au module qui importe    |
| module natif       | `'node:fs/promises'`            | un module fourni par Node.js                        |
| nom de paquet      | `'slugify'`                     | un paquet installé dans `node_modules` (leçon 3)    |

### L’extension est obligatoire

Contrairement à ce que tu verras dans des projets qui utilisent un outil de compilation,
Node.js n’ajoute **pas** l’extension pour toi dans un module ES :

```js
import { addVat } from './prices'; // extension oubliée
```

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/camille/boutique/src/prices' imported from /home/camille/boutique/src/bad.js
```

Écris toujours `'./prices.js'`. Le chemin est relatif au **fichier qui importe**, pas au
dossier depuis lequel tu lances `node`.

### Le préfixe node: pour les modules natifs

Les modules fournis par Node.js s’importent avec le préfixe `node:` :

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
```

Pour la plupart des modules natifs, le préfixe est facultatif (`'fs/promises'` fonctionne
aussi), mais il est recommandé : il montre d’un coup d’œil qu’il s’agit d’un module de
Node.js et non d’un paquet téléchargé, et il évite toute confusion avec un paquet du même
nom. Certains modules récents l’**exigent** : `import 'test'` échoue avec
`Cannot find package 'test'`, alors que `import 'node:test'` fonctionne.

### Une erreur d’export nommé

Si tu importes un nom qui n’existe pas :

```text
SyntaxError: The requested module './prices.js' does not provide an export named 'nope'
```

Vérifie l’orthographe et si l’élément est exporté par défaut plutôt que nommé.

## Ce qu’il faut savoir des modules ES

### Un module est évalué une seule fois

```js
// counter.js
console.log('counter.js est évalué');
let count = 0;
export function increment() {
  count += 1;
  return count;
}
```

```js
// a.js
import { increment } from './counter.js';
console.log('a :', increment());
```

```js
// b.js
import { increment } from './counter.js';
console.log('b :', increment());
```

```js
// app.js
import './a.js';
import './b.js';
console.log('app : terminé');
```

```text
counter.js est évalué
a : 1
b : 2
app : terminé
```

`counter.js` n’est exécuté **qu’une fois**, au premier import ; tous les modules qui
l’importent partagent ensuite la même instance et donc la même variable `count`. C’est ce
qui permet d’écrire un module de configuration lu une seule fois au démarrage (leçon 5).
Remarque aussi que `import './a.js'` sans accolades exécute un module sans rien importer.

### Les imports sont en lecture seule

```js
import { VAT_RATE } from './prices.js';
VAT_RATE = 0.1;
```

```text
TypeError: Assignment to constant variable.
```

Un module ne peut pas modifier les exports d’un autre. Pour changer un comportement, le
module propriétaire doit exporter une fonction prévue pour cela.

### Le mode strict et l’await de premier niveau

Un module ES s’exécute toujours en **mode strict** : certaines erreurs silencieuses
deviennent des exceptions (par exemple affecter une variable jamais déclarée). Et on peut
utiliser `await` directement au niveau du module, hors de toute fonction, comme dans la
leçon précédente :

```js
import { readFile } from 'node:fs/promises';
const text = await readFile('package.json', 'utf8');
```

### import.meta : où suis-je ?

```js
// src/meta.js
console.log(import.meta.url);
console.log(import.meta.filename);
console.log(import.meta.dirname);
```

```text
file:///home/camille/boutique/src/meta.js
/home/camille/boutique/src/meta.js
/home/camille/boutique/src
```

`import.meta.filename` est le chemin du fichier du module, `import.meta.dirname` celui de
son dossier ; `import.meta.url` est la même information sous forme d’URL `file://`. Ils
remplacent `__filename` et `__dirname`, qui n’existent qu’en CommonJS :

```text
ReferenceError: __dirname is not defined in ES module scope
```

Tu en auras besoin pour lire un fichier situé à côté du script, quel que soit le dossier
depuis lequel on le lance (leçon 4).

### Importer un fichier JSON

```js
import config from '../config.json' with { type: 'json' };
console.log(config.port);
```

La clause `with { type: 'json' }` (un **attribut d’import**) est obligatoire ; sans elle,
Node.js refuse avec `ERR_IMPORT_ATTRIBUTE_MISSING`. Un JSON importé ainsi est lu **une seule
fois** au démarrage : pour des données qui changent pendant l’exécution, on lit le fichier
avec `node:fs/promises`.

## Reconnaître CommonJS

Tu croiseras beaucoup de code CommonJS dans des projets existants et des réponses en ligne.
Il ressemble à ceci :

```js
// legacy.cjs — un module CommonJS, l'ancien système de Node.js
const path = require('node:path');

function describe(file) {
  return `${path.basename(file)} (${path.extname(file)})`;
}

module.exports = { describe };
```

| Modules ES                         | CommonJS                              |
| ---------------------------------- | ------------------------------------- |
| `import x from './x.js'`           | `const x = require('./x')`            |
| `export function f() {}`           | `module.exports = { f }`              |
| `import.meta.dirname`              | `__dirname`                           |
| extension obligatoire              | extension facultative                 |

Un module ES peut importer un module CommonJS : `module.exports` devient l’export par
défaut, et Node.js expose aussi en général ses propriétés comme exports nommés.

```js
import legacy from './legacy.cjs';
import { describe } from './legacy.cjs';
console.log(legacy.describe('/tmp/photo.jpg'));
console.log(describe('notes.txt'));
```

```text
photo.jpg (.jpg)
notes.txt (.txt)
```

Dans un projet `"type": "module"`, `require` n’existe pas :

```text
ReferenceError: require is not defined in ES module scope, you can use import instead
```

Si un tutoriel te donne du `require`, traduis-le en `import` plutôt que de changer le
`type` du projet.

## Pièges courants

- **Oublier `"type": "module"`.** Avertissement au mieux, `SyntaxError: Cannot use import
  statement outside a module` dans d’autres contextes. Vérifie `package.json`.
- **Oublier l’extension `.js`.** `ERR_MODULE_NOT_FOUND` : ajoute l’extension.
- **Confondre défaut et nommé.** `import { formatEuros } from './format.js'` échoue si
  `formatEuros` est l’export par défaut.
- **Mélanger `require` et `import`** dans un même fichier : choisis les modules ES.
- **Compter sur un état partagé caché.** Un module évalué une fois garde son état : c’est
  utile pour une configuration, piégeux pour des données qui devraient être indépendantes.
- **Des imports circulaires** (A importe B qui importe A) : ils fonctionnent dans certains
  cas mais produisent des variables pas encore initialisées. Réorganise plutôt le code.

## Exercices

### Exercice 1 — Découper un script

Voici un script monolithique. Découpe-le en trois modules : `temperature.js` (conversions,
exports nommés), `display.js` (export par défaut d’une fonction d’affichage) et `main.js`
(point d’entrée). La sortie doit rester identique.

```js
const ABSOLUTE_ZERO = -273.15;

function toFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

function toKelvin(celsius) {
  return celsius - ABSOLUTE_ZERO;
}

const celsius = 21.5;
console.log(`${celsius} °C = ${toFahrenheit(celsius).toFixed(1)} °F = ${toKelvin(celsius).toFixed(2)} K`);
```

:::solution
`package.json` contient `{ "type": "module" }`.

```js
// temperature.js
export const ABSOLUTE_ZERO = -273.15;

export function toFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

export function toKelvin(celsius) {
  return celsius - ABSOLUTE_ZERO;
}
```

```js
// display.js
import { toFahrenheit, toKelvin } from './temperature.js';

export default function describeTemperature(celsius) {
  return `${celsius} °C = ${toFahrenheit(celsius).toFixed(1)} °F = ${toKelvin(celsius).toFixed(2)} K`;
}
```

```js
// main.js
import describeTemperature from './display.js';

console.log(describeTemperature(21.5));
```

```text
21.5 °C = 70.7 °F = 294.65 K
```

Les extensions `.js` sont présentes dans chaque import ; `display.js` dépend de
`temperature.js`, et `main.js` ne connaît que l’affichage. On aurait pu exporter
`describeTemperature` sous forme nommée : l’important est d’être cohérent.
:::

### Exercice 2 — Trouver les erreurs

Ce projet a `"type": "module"`. Pour chaque ligne de `main.js`, dis si elle fonctionne et
corrige-la sinon.

```js
// utils.js
export function slug(text) {
  return text.toLowerCase().replaceAll(' ', '-');
}
export default function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}
```

```js
// main.js
import { capitalize } from './utils.js';   // ligne 1
import slug from './utils';               // ligne 2
const path = require('node:path');        // ligne 3
import { join } from 'node:path';         // ligne 4
console.log(__dirname);                   // ligne 5
```

:::solution
1. Incorrecte : `capitalize` est l’export **par défaut**. Écrire
   `import capitalize from './utils.js';`.
2. Deux erreurs : extension manquante, et `slug` est un export **nommé**. Écrire
   `import { slug } from './utils.js';`. On peut combiner les deux lignes :
   `import capitalize, { slug } from './utils.js';`.
3. Incorrecte : `require` n’existe pas dans un module ES. Écrire
   `import path from 'node:path';` (ou se contenter de la ligne 4 si seul `join` sert).
4. Correcte.
5. Incorrecte : `__dirname` n’existe pas. Écrire `console.log(import.meta.dirname);`.

Tu peux vérifier chaque correction en exécutant `node main.js` : les messages d’erreur de
Node.js nomment précisément le problème.
:::

### Exercice 3 — Prédire l’ordre d’exécution

Avec les fichiers ci-dessous, qu’affiche `node main.js` ?

```js
// log.js
console.log('log.js chargé');
export const messages = [];
```

```js
// first.js
import { messages } from './log.js';
messages.push('premier');
console.log('first.js chargé');
```

```js
// main.js
import './first.js';
import { messages } from './log.js';
console.log(messages);
```

:::solution
```text
log.js chargé
first.js chargé
[ 'premier' ]
```

`main.js` importe d’abord `first.js`, qui importe `log.js` : `log.js` est évalué en
premier, puis `first.js`. Quand `main.js` importe à son tour `log.js`, le module n’est pas
réévalué : c’est **le même** tableau `messages`, qui contient déjà `'premier'`. On ne peut
pas réaffecter un import, mais on peut modifier l’objet qu’il désigne (ici avec `push`) :
c’est une source de bugs si plusieurs modules le font sans le savoir.
:::

## Récapitulatif

- Un module est un fichier avec sa propre portée ; il **exporte** ce qu’il partage et
  **importe** ce dont il a besoin.
- `"type": "module"` dans `package.json` active les modules ES pour les fichiers `.js`.
- Exports nommés (`export function f`) importés entre accolades ; un export par défaut
  (`export default`) importé sous le nom de ton choix.
- Spécificateurs : relatifs avec extension obligatoire, modules natifs avec `node:`,
  paquets par leur nom.
- Un module est évalué une seule fois et partagé ; ses imports sont en lecture seule.
- `import.meta.dirname` et `import.meta.filename` remplacent `__dirname` et `__filename`.
- Un JSON s’importe avec `with { type: 'json' }`.
- CommonJS (`require`, `module.exports`) est l’ancien système : sache le lire et le
  traduire.
