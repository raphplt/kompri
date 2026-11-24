---
title: Annoter et laisser inférer
summary: Typer variables, fonctions, tableaux, tuples et objets, en laissant TypeScript déduire tout ce qu’il peut.
durationMinutes: 60
sources:
  - title: TypeScript — Everyday Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: TypeScript — More on Functions (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/functions.html
  - title: TypeScript — Object Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---

## Faut-il tout annoter ?

Quand on découvre TypeScript, on est tenté d’écrire un type après chaque nom :
`const count: number = 0`. C’est inutile : TypeScript **déduit** le type de la plupart des
valeurs. Cette déduction s’appelle l’**inférence**. Le bon réflexe est l’inverse : annoter là où
TypeScript ne peut pas deviner (les paramètres de fonctions, une variable déclarée sans valeur,
un tableau vide) ou là où tu veux **imposer** un contrat (le type de retour d’une fonction), et
laisser l’inférence faire le reste.

Tous les exemples se vérifient dans le dossier `ts-practice` de la leçon précédente : écris le
fichier, lance `npx tsc`, puis `node fichier.ts` pour l’exécuter.

## L’inférence sur les variables

```ts
let count = 0;
const city = 'Lyon';
let isOpen = true;
const prices = [12.5, 8, 3.2];
const user = { name: 'Ada', age: 36 };

count = 'zéro';
user.email = 'ada@example.com';
console.log(prices.toUpperCase());
```

Aucune annotation, et pourtant `npx tsc` trouve trois erreurs :

```text
infer.ts(7,1): error TS2322: Type 'string' is not assignable to type 'number'.
infer.ts(8,6): error TS2339: Property 'email' does not exist on type '{ name: string; age: number; }'.
infer.ts(9,20): error TS2339: Property 'toUpperCase' does not exist on type 'number[]'.
```

TypeScript a déduit de leur valeur initiale que `count` est un `number`, que `prices` est un
`number[]` (un tableau de nombres) et que `user` est un objet `{ name: string; age: number }`.
Le type d’un objet est **fixé à sa création** : on ne peut plus lui ajouter une propriété
`email` en cours de route, ce que JavaScript autorise. Si une propriété doit exister plus
tard, elle doit figurer dans le type dès le départ (la leçon suivante montre comment la
déclarer optionnelle).

Dans un éditeur comme VS Code, **survole** un nom de variable : une info-bulle affiche le type
inféré, par exemple `let count: number`. C’est le moyen le plus rapide de savoir ce que
TypeScript a compris. Pour `city`, déclarée avec `const`, tu verras `const city: "Lyon"` : une
constante ne peut contenir que cette valeur précise, son type est le **type littéral** `"Lyon"`.
Tu en verras l’intérêt dans la leçon 3.

### Les types primitifs

Les types de base s’écrivent en **minuscules**, avec les mêmes noms que les résultats de
`typeof` (sauf `null`, pour lequel `typeof` renvoie `'object'`) : `string`, `number` (entiers
et décimaux confondus, comme en JavaScript), `boolean`, `bigint`, `undefined` et `null`. Écris toujours `string` et non `String` : avec une majuscule, il s’agit
du type des objets « enveloppes » créés par `new String(…)`, que l’on n’utilise jamais.

### Quand annoter une variable

Annote une variable déclarée **sans valeur initiale**, pour dire ce qu’elle contiendra
(fichier `greeting.ts`) :

```ts
let message: string;
const hour = 14;

if (hour < 12) {
  message = 'Bonjour';
} else {
  message = 'Bon après-midi';
}

console.log(message);
```

```text
Bon après-midi
```

TypeScript suit les chemins d’exécution. Si tu supprimes le `else`, il remarque qu’un chemin
laisse `message` vide :

```text
greeting.ts(8,13): error TS2454: Variable 'message' is used before being assigned.
```

Sans TypeScript, ce programme afficherait `undefined` quand il est 14 h.

## Typer les fonctions

### Paramètres et valeur de retour

Les paramètres sont l’endroit où l’annotation est **indispensable** : TypeScript ne peut pas
deviner ce que les appelants passeront. Avec `strict`, un paramètre sans type est une erreur
(`TS7006: Parameter 'price' implicitly has an 'any' type.`).

```ts
function applyDiscount(price: number, rate: number): number {
  return price - price * rate;
}

const formatEuros = (amount: number): string => `${amount.toFixed(2)} €`;

function greet(name: string, greeting = 'Bonjour', punctuation?: string): string {
  return `${greeting} ${name}${punctuation ?? ''}`;
}

function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function logTotal(total: number): void {
  console.log(`Total : ${formatEuros(total)}`);
}

console.log(applyDiscount(80, 0.25));
console.log(greet('Ada'));
console.log(greet('Ada', 'Salut', ' !'));
console.log(sum(1, 2, 3.5));
logTotal(sum(applyDiscount(80, 0.25), 4.5));
```

```text
60
Bonjour Ada
Salut Ada !
6.5
Total : 64.50 €
```

Décortiquons :

- `(price: number, rate: number): number` : le type de chaque paramètre, puis celui de la
  valeur renvoyée, après la parenthèse fermante. Pour une fonction fléchée, il se place avant
  la flèche.
- `greeting = 'Bonjour'` : un paramètre avec valeur par défaut n’a pas besoin d’annotation ;
  son type (`string`) est inféré de la valeur, et il devient facultatif pour l’appelant.
- `punctuation?: string` : le `?` rend le paramètre **optionnel**. À l’intérieur de la
  fonction, il vaut une `string` ou `undefined`, d’où le `?? ''`. Un paramètre optionnel se
  place après les paramètres obligatoires.
- `...values: number[]` : un paramètre du reste est toujours un tableau.
- `void` : la fonction ne renvoie rien d’utile.

Les appels sont vérifiés en nombre et en types (fichier `calls.ts`) :

```ts
function applyDiscount(price: number, rate: number): number {
  return price - price * rate;
}

function greet(name: string, greeting = 'Bonjour'): string {
  return `${greeting} ${name}`;
}

applyDiscount(80);
greet('Ada', 42);
const label: string = applyDiscount(80, 0.25);
```

```text
calls.ts(9,1): error TS2554: Expected 2 arguments, but got 1.
calls.ts(10,14): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
calls.ts(11,7): error TS2322: Type 'number' is not assignable to type 'string'.
```

En JavaScript, `applyDiscount(80)` aurait renvoyé `NaN` sans un mot.

### Annoter le retour : pour localiser l’erreur au bon endroit

Le type de retour peut être inféré. Pourquoi l’écrire quand même ? Compare ces deux versions
d’une fonction qui oublie un cas (fichier `shipping.ts`) :

```ts
function shippingCost(total: number) {
  if (total >= 50) {
    return 0;
  } else if (total > 0) {
    return 4.5;
  }
}

const cost: number = shippingCost(30);
```

```text
shipping.ts(9,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
```

Sans annotation, TypeScript infère `number | undefined` (« un nombre **ou** `undefined` »,
c’est une union, sujet de la leçon suivante), car un chemin ne renvoie rien. L’erreur apparaît
**chez l’appelant**, qui n’y est pour rien. Avec `function shippingCost(total: number): number`,
l’erreur se place sur la fonction elle-même :

```text
shipping.ts(1,39): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

Règle pratique : annote le type de retour des fonctions que d’autres parties du code appellent.
Il sert de contrat et place l’erreur là où se trouve le défaut.

### Les fonctions passées en argument

Quand tu passes une fonction fléchée à `map`, `filter` ou `reduce`, tu n’as pas à annoter ses
paramètres : TypeScript connaît le type des éléments du tableau et l’applique. C’est
l’**inférence contextuelle**.

```ts
const prices = [12.5, 8, 3.2];

const withVat = prices.map((price) => price * 1.2);
const labels = prices.map((price) => `${price} €`);
const cheap = prices.filter((price) => price < 10);

console.log(withVat, labels, cheap);

function applyToAll(values: number[], transform: (value: number) => number): number[] {
  const result: number[] = [];
  for (const value of values) {
    result.push(transform(value));
  }
  return result;
}

console.log(applyToAll(prices, (price) => Math.round(price)));
```

```text
[ 15, 9.6, 3.84 ] [ '12.5 €', '8 €', '3.2 €' ] [ 8, 3.2 ]
[ 13, 8, 3 ]
```

`price` est inféré `number` ; `withVat` est un `number[]`, `labels` un `string[]`.

Pour écrire ta propre fonction d’ordre supérieur, décris le paramètre fonction avec un **type
de fonction** : `(value: number) => number` se lit « une fonction qui reçoit un nombre et
renvoie un nombre ». Le nom `value` n’est là que pour la lisibilité. Une fonction qui ne
respecte pas ce contrat est refusée (fichier `transform.ts`) :

```ts
function applyToAll(values: number[], transform: (value: number) => number): number[] {
  const result: number[] = [];
  for (const value of values) {
    result.push(transform(value));
  }
  return result;
}

applyToAll([1, 2], (value) => value.toFixed(1));
```

```text
transform.ts(9,31): error TS2322: Type 'string' is not assignable to type 'number'.
```

`toFixed` renvoie une chaîne, alors que `transform` doit renvoyer un nombre.

## Typer les tableaux

Deux écritures équivalentes : `string[]` et `Array<string>`. La première est la plus courante.

```ts
const tags: string[] = ['ts', 'node'];
const scores: Array<number> = [12, 15, 9];
const mixed = [1, 'deux', 3];

tags.push('web');
console.log(tags, scores, mixed);

const names: string[] = [];
names.push('Ada');
console.log(names);
```

```text
[ 'ts', 'node', 'web' ] [ 12, 15, 9 ] [ 1, 'deux', 3 ]
[ 'Ada' ]
```

- Avec des valeurs initiales, l’annotation est superflue : `['ts', 'node']` donne `string[]`.
- `mixed` est inféré `(string | number)[]` : un tableau dont chaque élément est une chaîne ou
  un nombre.
- Un tableau **vide** ne dit rien de son contenu futur : annote-le (`const names: string[] =
  []`) pour que TypeScript vérifie ce que tu y ranges. `tags.push(42)` serait alors refusé
  (`TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.`).

### Un tableau qu’on ne doit pas modifier

Une fonction qui reçoit un tableau peut le modifier par accident : tu as vu dans la
compétence sur les données que `sort` modifie le tableau d’origine. `readonly` l’interdit
(fichier `average.ts`) :

```ts
function average(values: readonly number[]): number {
  values.sort();
  return values.reduce((total, value) => total + value, 0) / values.length;
}
```

```text
average.ts(2,10): error TS2339: Property 'sort' does not exist on type 'readonly number[]'.
```

Un `readonly number[]` n’a plus les méthodes qui modifient (`push`, `sort`, `splice`…), mais
garde `map`, `filter` ou `reduce`, qui renvoient un nouveau tableau. Comme pour tout le reste,
cette protection disparaît à l’exécution : c’est `tsc` qui la fait respecter.

:::warning[L’accès par indice n’est pas vérifié]
`tags[10]` est typé `string`, alors qu’il vaut `undefined` si le tableau a moins de onze
éléments. Ce code passe `tsc`, puis plante :

```ts
const tags: string[] = ['ts', 'node'];
const tenth = tags[10];
console.log(tenth.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

L’option `noUncheckedIndexedAccess` du `tsconfig.json` type ces accès `string | undefined` et
oblige à vérifier (`error TS18048: 'tenth' is possibly 'undefined'.`). Elle n’est pas incluse
dans `strict` ; tu la rencontreras dans des projets exigeants. Sans elle, vérifie la longueur
ou utilise une méthode comme `find`, dont le type de retour inclut `undefined`.
:::

## Les tuples : des tableaux de longueur et d’ordre fixés

Un **tuple** est un tableau dont on connaît le nombre d’éléments et le type de chacun, selon sa
position. Il sert surtout à renvoyer plusieurs valeurs d’une fonction.

```ts
function minMax(values: number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

const [lowest, highest] = minMax([12, 4, 19, 7]);
console.log(lowest, highest);

const entry: [string, number] = ['pommes', 12];
const [product, quantity] = entry;
console.log(`${product} : ${quantity}`);

const stock = { pommes: 12, poires: 0 };
for (const [name, count] of Object.entries(stock)) {
  console.log(name.toUpperCase(), count + 1);
}
```

```text
4 19
pommes : 12
POMMES 13
POIRES 1
```

Avec la déstructuration, chaque variable reçoit le bon type : `product` est une `string`,
`quantity` un `number`. `Object.entries` renvoie justement un tableau de tuples
`[string, number][]`, ce qui permet d’appeler `toUpperCase` sur `name` et d’additionner
`count`.

TypeScript contrôle l’ordre, la longueur et les indices (fichier `tuples.ts`) :

```ts
const wrongOrder: [string, number] = [12, 'pommes'];
const tooLong: [string, number] = ['poires', 3, true];
const entry: [string, number] = ['pommes', 12];
console.log(wrongOrder, tooLong, entry[2]);
```

```text
tuples.ts(1,39): error TS2322: Type 'number' is not assignable to type 'string'.
tuples.ts(1,43): error TS2322: Type 'string' is not assignable to type 'number'.
tuples.ts(2,7): error TS2322: Type '[string, number, boolean]' is not assignable to type '[string, number]'.
  Source has 3 element(s) but target allows only 2.
tuples.ts(4,40): error TS2493: Tuple type '[string, number]' of length '2' has no element at index '2'.
```

:::tip[Tuple inféré ou non]
Un tableau littéral n’est jamais inféré comme un tuple : `const pair = ['pommes', 12]` donne
`(string | number)[]`. Pour obtenir un tuple, annote la variable ou le type de retour de la
fonction, comme dans `minMax`.
:::

## Typer les objets

Un type objet liste les propriétés et leur type, séparées par des points-virgules (ou des
virgules). Les objets peuvent s’imbriquer :

```ts
function describeBook(book: { title: string; pages: number; author: { name: string } }): string {
  return `${book.title}, par ${book.author.name} (${book.pages} pages)`;
}

const book = {
  title: 'Le Petit Prince',
  pages: 96,
  author: { name: 'Antoine de Saint-Exupéry', born: 1900 },
  isbn: '978-2-07-061275-8',
};

console.log(describeBook(book));
```

```text
Le Petit Prince, par Antoine de Saint-Exupéry (96 pages)
```

L’objet `book` possède des propriétés que le paramètre ne demande pas (`isbn`,
`author.born`) : c’est accepté. TypeScript applique un **typage structurel** : un objet
convient s’il possède **au moins** les propriétés demandées, avec les bons types. Peu importe
comment il a été créé ou nommé. C’est cohérent avec JavaScript, où une fonction ne regarde que
les propriétés qu’elle utilise.

Les objets écrits **directement** dans l’appel subissent un contrôle de plus (fichier
`book.ts`) :

```ts
function describeBook(book: { title: string; pages: number }): string {
  return `${book.title} (${book.pages} pages)`;
}

describeBook({ title: 'Le Petit Prince' });
describeBook({ title: 'Le Petit Prince', pages: 96, isbn: '978-2-07-061275-8' });
describeBook({ title: 'Le Petit Prince', pages: '96' });
```

```text
book.ts(5,14): error TS2741: Property 'pages' is missing in type '{ title: string; }' but required in type '{ title: string; pages: number; }'.
book.ts(6,53): error TS2353: Object literal may only specify known properties, and 'isbn' does not exist in type '{ title: string; pages: number; }'.
book.ts(7,42): error TS2322: Type 'string' is not assignable to type 'number'.
```

- `TS2741` : une propriété obligatoire manque.
- `TS2353` : une propriété **en trop** dans un objet littéral. Écrire une propriété que la
  fonction n’attend pas est presque toujours une faute de frappe (`titel`) ou une confusion,
  d’où ce contrôle des **propriétés excédentaires**. Il ne s’applique qu’aux objets littéraux
  écrits à cet endroit : passé par une variable, comme `book` plus haut, l’objet est accepté.
- `TS2322` : une propriété du mauvais type ; la colonne pointe la valeur fautive.

Répéter `{ title: string; pages: number }` à chaque fonction devient vite illisible. La leçon
suivante montre comment **nommer** un type avec `type` ou `interface`.

## Pièges courants

- **Annoter ce qui est déjà inféré.** `const total: number = a + b` n’apporte rien et alourdit
  la lecture. Annote paramètres, retours et valeurs vides.
- **Oublier d’annoter un tableau vide.** Annote `const items: Item[] = []` pour que chaque
  `push` soit contrôlé.
- **Écrire `String`, `Number` ou `Boolean`** avec une majuscule au lieu des types primitifs.
- **Confondre tableau et tuple.** `number[]` peut avoir zéro ou mille éléments ; `[number,
  number]` en a exactement deux.
- **Croire que `tags[10]` est forcément une `string`.** Hors limites, c’est `undefined`, et
  TypeScript ne le signale pas sans `noUncheckedIndexedAccess`.
- **Contourner une erreur de propriété excédentaire en passant par une variable.** L’erreur
  disparaît, la faute de frappe reste.

## Exercices

### Exercice 1 — Typer un fichier JavaScript

Ce code fonctionne en JavaScript. Copie-le dans `grades.ts` : `npx tsc` signale sept erreurs
`TS7006`. Ajoute **le minimum** d’annotations pour qu’il n’y en ait plus, sans modifier la
logique. Que se passe-t-il ensuite pour `average([])` et `bestStudent([])` ?

```ts
function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatGrade(grade, max = 20) {
  return `${grade.toFixed(1)}/${max}`;
}

function bestStudent(students) {
  return students.reduce((best, student) => (student.grade > best.grade ? student : best));
}

const students = [
  { name: 'Ada', grade: 15.5 },
  { name: 'Grace', grade: 17 },
  { name: 'Alan', grade: 12 },
];

console.log(formatGrade(average(students.map((student) => student.grade))));
console.log(bestStudent(students).name);
```

:::solution
Trois paramètres suffisent à faire disparaître les sept erreurs (le reste du fichier ne change
pas) :

```ts
function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatGrade(grade: number, max = 20): string {
  return `${grade.toFixed(1)}/${max}`;
}

function bestStudent(students: { name: string; grade: number }[]): { name: string; grade: number } {
  return students.reduce((best, student) => (student.grade > best.grade ? student : best));
}
```

```text
14.8/20
Grace
```

- Une fois `values` typé `number[]`, les paramètres `total` et `value` de la fonction passée
  à `reduce` sont inférés : c’est l’inférence contextuelle. Idem pour `best` et `student`.
- `max = 20` n’a pas besoin d’annotation grâce à sa valeur par défaut.
- Les types de retour ne sont pas obligatoires, mais les écrire fixe le contrat. Le type
  `{ name: string; grade: number }` répété deux fois est lourd : la leçon suivante le nommera.

Quant aux tableaux vides, `tsc` accepte `average([])` et `bestStudent([])`, car `[]` est bien
un tableau. À l’exécution, `average([])` renvoie `NaN` (0 divisé par 0) et `bestStudent([])`
lève `TypeError: Reduce of empty array with no initial value`. Les types décrivent la
**forme** des données, pas leur contenu : un tableau vide reste un cas à traiter toi-même.
:::

### Exercice 2 — Prévoir les erreurs

Sans lancer `tsc`, liste les erreurs de ce fichier `bugs.ts` (ligne, cause), puis vérifie et
corrige.

```ts
function createUser(name: string, age: number): { name: string; age: number; active: boolean } {
  return { name, age };
}

const ada = createUser('Ada', '36');
const scores: number[] = [12, 15, '9'];
const point: [number, number] = [4];
console.log(ada.nmae, scores, point);
```

:::solution
```text
bugs.ts(2,3): error TS2741: Property 'active' is missing in type '{ name: string; age: number; }' but required in type '{ name: string; age: number; active: boolean; }'.
bugs.ts(5,31): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
bugs.ts(6,35): error TS2322: Type 'string' is not assignable to type 'number'.
bugs.ts(7,7): error TS2322: Type '[number]' is not assignable to type '[number, number]'.
  Source has 1 element(s) but target requires 2.
bugs.ts(8,17): error TS2339: Property 'nmae' does not exist on type '{ name: string; age: number; active: boolean; }'.
```

1. Ligne 2 : l’objet renvoyé n’a pas `active`, exigé par le type de retour annoncé.
2. Ligne 5 : `'36'` est une chaîne, le paramètre `age` attend un nombre.
3. Ligne 6 : `'9'` n’a rien à faire dans un `number[]`.
4. Ligne 7 : le tuple exige deux éléments.
5. Ligne 8 : faute de frappe, `nmae` au lieu de `name`.

Correction :

```ts
function createUser(name: string, age: number): { name: string; age: number; active: boolean } {
  return { name, age, active: true };
}

const ada = createUser('Ada', 36);
const scores: number[] = [12, 15, 9];
const point: [number, number] = [4, 0];
console.log(ada.name, scores, point);
```

```text
Ada [ 12, 15, 9 ] [ 4, 0 ]
```

Pour `point`, la valeur manquante dépend du besoin réel : ici on a choisi 0, mais la vraie
question à se poser est « d’où vient la seconde coordonnée ? ».
:::

### Exercice 3 — Un tuple et une fonction en paramètre

Écris :

1. `splitFullName(fullName: string)` qui renvoie un tuple `[prénom, reste du nom]` ; sans
   espace, le reste est une chaîne vide.
2. `countWhere(values, predicate)` qui compte les chaînes pour lesquelles `predicate` renvoie
   `true`. Type le paramètre `predicate` avec un type de fonction.

Teste avec `'Grace Brewster Hopper'`, `'Ada'` et la liste `['Lyon', 'Lille', 'Nantes', 'Laval']`.

:::solution
```ts
function splitFullName(fullName: string): [string, string] {
  const index = fullName.indexOf(' ');
  if (index === -1) {
    return [fullName, ''];
  }
  return [fullName.slice(0, index), fullName.slice(index + 1)];
}

function countWhere(values: string[], predicate: (value: string) => boolean): number {
  let count = 0;
  for (const value of values) {
    if (predicate(value)) {
      count += 1;
    }
  }
  return count;
}

const [firstName, lastName] = splitFullName('Grace Brewster Hopper');
console.log(firstName, '|', lastName);
console.log(splitFullName('Ada'));

const cities = ['Lyon', 'Lille', 'Nantes', 'Laval'];
console.log(countWhere(cities, (city) => city.startsWith('L')));
console.log(countWhere(cities, (city) => city.length > 5));
```

```text
Grace | Brewster Hopper
[ 'Ada', '' ]
3
1
```

Le type de retour `[string, string]` est indispensable : sans lui, TypeScript inférerait
`string[]`, et la déstructuration donnerait deux `string` sans garantie qu’il y ait bien deux
éléments. Dans les appels à `countWhere`, `city` n’est pas annoté : son type vient du type de
fonction déclaré pour `predicate`. Si tu passais `(city) => city.length` (qui renvoie un
nombre), `tsc` refuserait l’appel.
:::

## Récapitulatif

- L’inférence déduit le type des variables initialisées, des retours de fonctions et des
  paramètres des fonctions passées en argument. Survole une variable pour voir ce qui a été
  inféré.
- Annote : les paramètres (obligatoire en mode strict), les variables sans valeur initiale, les
  tableaux vides, et le type de retour des fonctions utilisées ailleurs.
- Fonctions : `(a: number, b = 1, c?: string, ...rest: number[]): number` ; `void` pour une
  fonction sans résultat ; `(value: number) => number` pour un paramètre fonction.
- Tableaux : `string[]` ou `Array<string>`, `readonly string[]` pour interdire la modification.
  L’accès par indice n’est pas vérifié par défaut.
- Tuples : `[string, number]`, longueur et ordre fixés, jamais inférés d’un littéral.
- Objets : `{ name: string; age: number }`. Typage structurel (au moins ces propriétés), mais
  un objet littéral avec une propriété en trop est refusé. Le type d’un objet est fixé à sa
  création.
