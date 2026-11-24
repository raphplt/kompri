---
title: Rétrécir les types et se passer de any
summary: Vérifier le type réel d’une valeur avec typeof, in, l’égalité et les unions discriminées, garantir l’exhaustivité avec never, et valider des données inconnues avec unknown.
durationMinutes: 75
sources:
  - title: TypeScript — Narrowing (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  - title: TypeScript — Everyday Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: MDN — typeof
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/typeof
---

## Le problème : une union qu’on ne peut pas utiliser

Dans la leçon précédente, tu as vu que sur une valeur de type `string | number`, TypeScript
n’autorise que ce qui est valable pour les deux : `id.toUpperCase()` est refusé, car `id`
pourrait être un nombre. Pour utiliser une union, il faut d’abord **vérifier** de quel membre il
s’agit. Bonne nouvelle : tu sais déjà le faire en JavaScript, avec `typeof`, `===`, `in` ou
`instanceof`. TypeScript **lit ces contrôles** et en déduit un type plus précis dans chaque
branche. C’est le **rétrécissement** (_narrowing_).

Cette leçon montre les différentes formes de rétrécissement, puis la technique la plus
puissante pour modéliser des données : les **unions discriminées**, avec une vérification
d’exhaustivité. Elle se termine par `unknown`, l’alternative sûre à `any` pour les données qui
viennent de l’extérieur.

## `typeof` : distinguer les primitifs

```ts
function formatId(id: string | number): string {
  if (typeof id === 'string') {
    return id.toUpperCase();
  }
  return id.toString().padStart(5, '0');
}

console.log(formatId('a-17'));
console.log(formatId(42));
```

```text
A-17
00042
```

Dans le `if`, TypeScript sait que `id` est une `string` : `toUpperCase` est autorisé. Après le
`if`, qui se termine par `return`, il ne reste que `number` : `id` est un nombre. TypeScript
suit le **flux d’exécution** du code, branche par branche. Dans un éditeur, survole `id` à
chacun de ces endroits : le type affiché change.

`typeof` rétrécit vers `'string'`, `'number'`, `'bigint'`, `'boolean'`, `'symbol'`,
`'undefined'`, `'object'` et `'function'`, les valeurs que l’opérateur renvoie en JavaScript.

:::warning[`typeof null` vaut `'object'`]
C’est une bizarrerie historique de JavaScript, et TypeScript la connaît (fichier `describe.ts`) :

```ts
function describe(value: string[] | null): string {
  if (typeof value === 'object') {
    return `${value.length} éléments`;
  }
  return 'rien';
}
```

```text
describe.ts(3,15): error TS18047: 'value' is possibly 'null'.
```

Dans le `if`, `value` est encore `string[] | null`. Teste `value !== null` (ou
`Array.isArray(value)`) en plus de `typeof`.
:::

## L’égalité et la valeur de vérité

Comparer avec `===` ou `!==` rétrécit aussi. C’est ce que tu as fait dans la leçon précédente
avec `contact.phone === undefined`. Un simple `if (valeur)` rétrécit également, en écartant
`undefined` et `null`… mais aussi toutes les autres valeurs **falsy**, ce qui est un piège
classique :

```ts
function formatQuantity(quantity: number | undefined): string {
  if (quantity) {
    return `${quantity} en stock`;
  }
  return 'quantité inconnue';
}

console.log(formatQuantity(3));
console.log(formatQuantity(undefined));
console.log(formatQuantity(0));
```

```text
3 en stock
quantité inconnue
quantité inconnue
```

`tsc` ne dit rien : le code est correctement typé. Mais `0` est falsy, et un stock à zéro est
affiché comme inconnu. TypeScript vérifie les types, pas ta logique. Compare avec une égalité
stricte :

```ts
function formatQuantity(quantity: number | undefined): string {
  if (quantity === undefined) {
    return 'quantité inconnue';
  }
  return `${quantity} en stock`;
}

console.log(formatQuantity(3));
console.log(formatQuantity(undefined));
console.log(formatQuantity(0));
```

```text
3 en stock
quantité inconnue
0 en stock
```

Règle : pour écarter l’absence, teste précisément l’absence (`=== undefined`, `=== null`, ou
`== null` qui couvre les deux, l’un des rares usages défendables de `==`). Garde `if (valeur)`
pour les cas où **toutes** les valeurs falsy doivent être traitées de la même façon.

## `in` : distinguer des objets par leurs propriétés

Quand les membres d’une union sont des objets, `typeof` ne sert plus : ils valent tous
`'object'`. L’opérateur `in`, qui teste la présence d’une propriété, permet de les distinguer :

```ts
type CardPayment = {
  cardNumber: string;
  expiry: string;
};

type BankTransfer = {
  iban: string;
};

function describePayment(payment: CardPayment | BankTransfer): string {
  if ('iban' in payment) {
    return `Virement depuis ${payment.iban.slice(0, 4)}…`;
  }
  return `Carte se terminant par ${payment.cardNumber.slice(-4)}`;
}

console.log(describePayment({ iban: 'FR7630006000011234567890189' }));
console.log(describePayment({ cardNumber: '4970101234567890', expiry: '12/28' }));
```

```text
Virement depuis FR76…
Carte se terminant par 7890
```

Seul `BankTransfer` déclare `iban` : dans le `if`, `payment` est un `BankTransfer` ; après, un
`CardPayment`.

### `instanceof` et `Array.isArray`

Pour les objets créés par un constructeur (`Date`, `Error`, `Map`…), `instanceof` rétrécit ;
pour les tableaux, `Array.isArray` :

```ts
function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

function asList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

console.log(toDate('2026-03-01T10:00:00Z').toISOString());
console.log(asList('ts'), asList(['ts', 'node']));
```

```text
2026-03-01T10:00:00.000Z
[ 'ts' ] [ 'ts', 'node' ]
```

Le ternaire rétrécit comme un `if` : dans la première branche, `value` est un `string[]`, dans
la seconde une `string`.

## Les unions discriminées

`in` fonctionne, mais devient fragile quand les objets partagent des propriétés. La technique
recommandée consiste à donner à chaque membre de l’union une propriété commune, de type
**littéral** différent pour chacun : le **discriminant**. On l’appelle souvent `kind`, `type`
ou `status`.

```ts
type Circle = { kind: 'circle'; radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Shape = Circle | Rectangle;

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}

const shapes: Shape[] = [
  { kind: 'circle', radius: 1 },
  { kind: 'rectangle', width: 3, height: 4 },
];

for (const shape of shapes) {
  console.log(shape.kind, area(shape).toFixed(2));
}
```

```text
circle 3.14
rectangle 12.00
```

Dans `case 'circle'`, TypeScript sait que `shape` est un `Circle` : `shape.radius` existe. Dans
`case 'rectangle'`, c’est un `Rectangle`. Une confusion entre les deux est détectée (fichier
`shapes.ts`) :

```ts
type Circle = { kind: 'circle'; radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Shape = Circle | Rectangle;

function area(shape: Shape): number {
  if (shape.kind === 'circle') {
    return Math.PI * shape.width ** 2;
  }
  return shape.radius * shape.height;
}
```

```text
shapes.ts(7,28): error TS2339: Property 'width' does not exist on type 'Circle'.
shapes.ts(9,16): error TS2339: Property 'radius' does not exist on type 'Rectangle'.
```

Les unions discriminées sont partout dans le code réel : formes géométriques, moyens de
paiement, messages, et surtout **états** et **résultats**. Tu as écrit dans la compétence sur les
données une fonction `safeParse` qui renvoie `{ ok: true, value }` ou `{ ok: false, error }` :
c’est une union discriminée par `ok`, qui se type ainsi :

```ts
type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };
```

Après `if (result.ok)`, TypeScript sait que `result.value` existe ; dans le `else`, c’est
`result.error`. Impossible de lire une valeur qui n’existe pas.

## L’exhaustivité : ne rien oublier quand l’union grandit

Ajoutons un triangle aux formes. Que se passe-t-il pour les fonctions qui traitent les formes ?
Nouvelle version de `shapes.ts` :

```ts
type Circle = { kind: 'circle'; radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Triangle = { kind: 'triangle'; base: number; height: number };
type Shape = Circle | Rectangle | Triangle;

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}

function logShape(shape: Shape): void {
  switch (shape.kind) {
    case 'circle':
      console.log(`Cercle de rayon ${shape.radius}`);
      break;
    case 'rectangle':
      console.log(`Rectangle ${shape.width} × ${shape.height}`);
      break;
  }
}

logShape({ kind: 'triangle', base: 3, height: 2 });
console.log('fin');
```

```text
shapes.ts(6,30): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

- Pour `area`, `tsc` réagit, mais indirectement : comme le type de retour est `number`, il
  remarque qu’un chemin ne renvoie rien. Le message ne dit pas quel cas manque.
- Pour `logShape`, qui ne renvoie rien, **aucune erreur**. `node` affiche simplement `fin` : le
  triangle est ignoré en silence. C’est exactement le bug qui arrive quand on ajoute une
  variante dans un grand projet.

### Le type `never`

`never` est le type **sans aucune valeur**. Quand TypeScript a éliminé tous les membres d’une
union, ce qui reste est de type `never`. On exploite cette propriété avec une petite fonction :

```ts
type Circle = { kind: 'circle'; radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Triangle = { kind: 'triangle'; base: number; height: number };
type Shape = Circle | Rectangle | Triangle;

function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`);
}

function logShape(shape: Shape): void {
  switch (shape.kind) {
    case 'circle':
      console.log(`Cercle de rayon ${shape.radius}`);
      break;
    case 'rectangle':
      console.log(`Rectangle ${shape.width} × ${shape.height}`);
      break;
    default:
      assertNever(shape);
  }
}
```

```text
shapes.ts(19,19): error TS2345: Argument of type 'Triangle' is not assignable to parameter of type 'never'.
```

Dans le `default`, si tous les cas avaient été traités, `shape` serait de type `never` et
l’appel serait accepté. Ici, il reste `Triangle` : `tsc` refuse l’appel et **nomme le cas
oublié**. Ajoute `case 'triangle'` et l’erreur disparaît.

`assertNever` a un second rôle, à l’exécution : si une valeur inattendue arrive malgré tout
(par exemple d’un JSON non vérifié), elle lève une erreur explicite au lieu d’ignorer la
valeur. Avec le `case 'triangle'` ajouté :

```ts
type Circle = { kind: 'circle'; radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Triangle = { kind: 'triangle'; base: number; height: number };
type Shape = Circle | Rectangle | Triangle;

function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`);
}

function logShape(shape: Shape): void {
  switch (shape.kind) {
    case 'circle':
      console.log(`Cercle de rayon ${shape.radius}`);
      break;
    case 'rectangle':
      console.log(`Rectangle ${shape.width} × ${shape.height}`);
      break;
    case 'triangle':
      console.log(`Triangle de base ${shape.base}`);
      break;
    default:
      assertNever(shape);
  }
}

logShape({ kind: 'triangle', base: 3, height: 2 });

const fromServer = JSON.parse('{"kind":"hexagon","side":2}');
try {
  logShape(fromServer);
} catch (error) {
  console.log(String(error));
}
```

```text
Triangle de base 3
Error: Cas non traité : {"kind":"hexagon","side":2}
```

`fromServer` est `any` (merci `JSON.parse`) : `tsc` l’accepte comme `Shape`. Sans le `default`,
l’hexagone serait passé inaperçu.

:::tip[Sans fonction auxiliaire]
On rencontre aussi la forme `const unhandled: never = shape;` à l’endroit où tous les cas
devraient être traités. Le principe est identique ; l’erreur devient
`Type 'Triangle' is not assignable to type 'never'.`
:::

## `any` contre `unknown`

### `any` désactive la vérification… et se propage

Tu as déjà croisé `any`, le type de retour de `JSON.parse`. Une valeur `any` accepte toute
opération, et tout ce qu’on en tire est `any` à son tour :

```ts
function loadUser(text: string) {
  return JSON.parse(text);
}

const user = loadUser('{"name":"Ada","age":36}');
const nameLength = user.nmae.length;
const age: string = user.age;
const doubled = user.age * 2;
user.sendEmail();
```

`npx tsc` : **aucune erreur**. Pourtant, `nmae` est une faute de frappe, `age` est un nombre
rangé dans une `string`, et `sendEmail` n’existe pas. Le type de retour de `loadUser`, non
annoté, a été inféré `any` : la fonction **propage** `any` à tous ses appelants, qui perdent
toute vérification sans s’en rendre compte. C’est pour cela qu’un seul `any` mal placé dégrade
tout un programme.

L’option `noImplicitAny` (incluse dans `strict`) interdit les `any` **implicites**, comme un
paramètre sans annotation. Elle n’empêche ni un `any` écrit explicitement, ni celui que renvoie
une fonction comme `JSON.parse`.

### `unknown` : « je ne sais pas encore »

`unknown` signifie aussi « n’importe quelle valeur », mais avec la logique inverse : on peut y
**ranger** n’importe quoi, et on ne peut **rien en faire** sans l’avoir rétréci (fichier
`loaduser.ts`) :

```ts
function loadUser(text: string): unknown {
  return JSON.parse(text);
}

const user = loadUser('{"name":"Ada","age":36}');
const nameLength = user.name.length;
const age: number = user;
```

```text
loaduser.ts(6,20): error TS18046: 'user' is of type 'unknown'.
loaduser.ts(7,7): error TS2322: Type 'unknown' is not assignable to type 'number'.
```

En annotant le retour `unknown`, on oblige l’appelant à vérifier. C’est le bon type pour toute
donnée d’origine extérieure.

### Rétrécir un `unknown` jusqu’à un type précis

Les contrôles habituels fonctionnent sur `unknown`. Pour un objet, il faut enchaîner : est-ce
un objet ? non nul ? possède-t-il la propriété ? de quel type ?

```ts
const data: unknown = JSON.parse('{"price":49.9}');

if (typeof data === 'object' && data !== null && 'price' in data && typeof data.price === 'number') {
  console.log(data.price.toFixed(2));
}
```

```text
49.90
```

Pour réutiliser ce contrôle, on l’enferme dans une fonction de **garde de type** (_type
guard_). Son type de retour `value is Product` dit à TypeScript : « si je renvoie `true`, la
valeur est un `Product` ».

```ts
type Product = {
  name: string;
  price: number;
};

function isProduct(value: unknown): value is Product {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'price' in value &&
    typeof value.price === 'number'
  );
}

function parseProduct(text: string): Product {
  const data: unknown = JSON.parse(text);
  if (!isProduct(data)) {
    throw new Error('Produit invalide');
  }
  return data;
}

const inputs = [
  '{"name":"Clavier","price":49.9}',
  '{"name":"Souris","price":"19"}',
  'null',
  '[1, 2]',
];

for (const input of inputs) {
  try {
    const product = parseProduct(input);
    console.log(`${product.name} : ${product.price.toFixed(2)} €`);
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Rejeté (${error.message}) : ${input}`);
    }
  }
}
```

```text
Clavier : 49.90 €
Rejeté (Produit invalide) : {"name":"Souris","price":"19"}
Rejeté (Produit invalide) : null
Rejeté (Produit invalide) : [1, 2]
```

C’est la première **validation à l’exécution** de ce cours : la donnée externe est contrôlée
avant d’être considérée comme un `Product`. Après le `if (!isProduct(data))`, `data` est un
`Product`, sans `as`.

:::warning[Une garde de type peut mentir]
TypeScript ne vérifie pas que le corps de la garde correspond à son type de retour. Une garde
`return typeof value === 'object' && value !== null;` déclarée `value is Product` est acceptée
par `tsc`, et laisse passer `{"name":"Souris"}` sans prix :
`TypeError: Cannot read properties of undefined (reading 'toFixed')`. Une garde se relit et se
teste comme n’importe quel code. Écrire ces contrôles à la main devient vite long : la
compétence « TypeScript côté serveur » utilise une bibliothèque de validation par schéma qui
les produit à partir d’une seule description.
:::

### Les erreurs de `catch` sont `unknown`

Avec `strict`, la variable d’un `catch` est de type `unknown` : en JavaScript, on peut lever
n’importe quelle valeur, pas seulement une `Error` (fichier `catch.ts`) :

```ts
try {
  JSON.parse('{oups}');
} catch (error) {
  console.log(error.message);
}
```

```text
catch.ts(4,15): error TS18046: 'error' is of type 'unknown'.
```

On rétrécit avec `instanceof` :

```ts
try {
  JSON.parse('{oups}');
} catch (error) {
  if (error instanceof SyntaxError) {
    console.log(`JSON invalide : ${error.message}`);
  } else {
    throw error;
  }
}
```

```text
JSON invalide : Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

Ce qui n’est pas une erreur de syntaxe est relancé plutôt qu’ignoré.

## Pièges courants

- **`if (valeur)` pour tester l’absence** : il écarte aussi `0`, `''` et `false`.
- **`typeof x === 'object'` sans exclure `null`.**
- **Un `switch` sans `default` exhaustif** sur une union discriminée : une nouvelle variante sera
  ignorée en silence dans les fonctions qui ne renvoient rien.
- **`any` pour « faire passer » une erreur** : il désactive la vérification et contamine tout ce
  qui en dépend. Préfère `unknown` et un contrôle.
- **`as Product` après `JSON.parse`** : ce n’est pas un contrôle. Utilise une garde de type.
- **Une garde de type incomplète** : elle ment à TypeScript comme un `as`.
- **`Array.isArray` sur un `unknown`** rétrécit vers `any[]` : les éléments ne sont pas vérifiés,
  il faut encore contrôler chacun d’eux.

## Exercices

### Exercice 1 — Un montant sous trois formes

Écris `toCents(amount: string | number | null): number` :

- `null` donne 0 ;
- un nombre en euros est converti en centimes arrondis (`19.99` donne `1999`) ;
- une chaîne accepte la virgule décimale (`'4,50'` donne `450`) ; si elle n’est pas un nombre,
  la fonction lève une `Error` avec le message `Montant invalide : …`.

Teste les quatre cas, en affichant le message d’erreur dans un `catch` correctement typé.

:::solution
```ts
function toCents(amount: string | number | null): number {
  if (amount === null) {
    return 0;
  }
  if (typeof amount === 'string') {
    const parsed = Number(amount.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      throw new Error(`Montant invalide : ${amount}`);
    }
    return Math.round(parsed * 100);
  }
  return Math.round(amount * 100);
}

console.log(toCents(19.99));
console.log(toCents('4,50'));
console.log(toCents(null));
try {
  toCents('douze');
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

```text
1999
450
0
Montant invalide : douze
```

- `amount === null` écarte `null` ; il reste `string | number`.
- Dans le bloc `typeof amount === 'string'`, `replace` est autorisé ; à la sortie de ce bloc
  (qui se termine toujours par `return` ou `throw`), il ne reste que `number`.
- `Math.round` est indispensable : `19.99 * 100` donne `1998.9999999999998` en virgule
  flottante.
- Le `catch` reçoit un `unknown` : `instanceof Error` permet de lire `message`.

Limite à connaître : `Number('')` vaut 0, donc `toCents('')` renvoie 0 au lieu de lever une
erreur. Teste `amount.trim() === ''` si ce cas doit être refusé.
:::

### Exercice 2 — Des messages exhaustifs

Voici un modèle de messages envoyés aux utilisateurs, à écrire dans `messages.ts` :

```ts
type EmailMessage = { channel: 'email'; to: string; subject: string };
type SmsMessage = { channel: 'sms'; phone: string; text: string };
type Message = EmailMessage | SmsMessage;
```

1. Écris `describe(message: Message): string` avec un `switch` sur `channel` et un `default`
   qui appelle `assertNever`.
2. Ajoute une variante `PushMessage` (`channel: 'push'`, `deviceId`, `title`) à l’union, sans
   toucher à `describe`. Relève l’erreur de `tsc`.
3. Complète `describe`.

:::solution
```ts
type EmailMessage = { channel: 'email'; to: string; subject: string };
type SmsMessage = { channel: 'sms'; phone: string; text: string };
type Message = EmailMessage | SmsMessage;

function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`);
}

function describe(message: Message): string {
  switch (message.channel) {
    case 'email':
      return `E-mail à ${message.to} : ${message.subject}`;
    case 'sms':
      return `SMS au ${message.phone} : ${message.text}`;
    default:
      return assertNever(message);
  }
}

console.log(describe({ channel: 'email', to: 'ada@example.com', subject: 'Bienvenue' }));
console.log(describe({ channel: 'sms', phone: '0612345678', text: 'Code : 4821' }));
```

```text
E-mail à ada@example.com : Bienvenue
SMS au 0612345678 : Code : 4821
```

Après l’ajout de `type PushMessage = { channel: 'push'; deviceId: string; title: string };` et
de `| PushMessage` dans `Message` (le fichier compte alors une ligne de plus) :

```text
messages.ts(17,26): error TS2345: Argument of type 'PushMessage' is not assignable to parameter of type 'never'.
```

`tsc` désigne la ligne du `default` et nomme la variante oubliée. On ajoute le cas :

```ts
    case 'push':
      return `Notification sur ${message.deviceId} : ${message.title}`;
```

Le `return assertNever(message)` est accepté dans une fonction qui renvoie une `string` : une
fonction de type `never` ne renvoie jamais, donc son « résultat » est compatible avec tout type.
:::

### Exercice 3 — Chasser un `any`

Prévois la sortie de ce programme, explique pourquoi `tsc` ne dit rien, puis réécris
`readScores` pour qu’elle renvoie un `number[]` vérifié, ou lève une erreur.

```ts
function readScores(text: string): any {
  return JSON.parse(text);
}

const scores = readScores('[12, "15", 9]');
const total = scores.reduce((sum: number, score: number) => sum + score, 0);
console.log(total);
console.log(total / scores.length);
```

:::solution
```text
12159
4053
```

`12 + '15'` concatène (`'1215'`), puis `'1215' + 9` donne `'12159'`, et la division le
reconvertit en nombre. Les annotations `sum: number, score: number` de la fonction passée à
`reduce` ne protègent rien : `scores` est `any`, donc `tsc` accepte qu’on lui passe n’importe
quelle fonction. Ces annotations donnent une fausse impression de sécurité.

```ts
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

function readScores(text: string): number[] {
  const data: unknown = JSON.parse(text);
  if (!isNumberArray(data)) {
    throw new Error('Les notes doivent être un tableau de nombres');
  }
  return data;
}

for (const text of ['[12, 15, 9]', '[12, "15", 9]']) {
  try {
    const scores = readScores(text);
    const total = scores.reduce((sum, score) => sum + score, 0);
    console.log(total, total / scores.length);
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  }
}
```

```text
36 12
Les notes doivent être un tableau de nombres
```

`Array.isArray` seul ne suffit pas : sur un `unknown`, il rétrécit vers `any[]`, et
`'15'` passerait. C’est `every` qui contrôle chaque élément. Désormais, `scores` est un vrai
`number[]` : dans le `reduce`, `sum` et `score` sont inférés `number` sans annotation, et la
donnée invalide est rejetée au lieu de produire un total faux.
:::

## Récapitulatif

- TypeScript suit le flux du code : après un contrôle, le type est **rétréci** dans la branche
  concernée, et ce qui reste après un `return` est déduit.
- `typeof` pour les primitifs (attention à `typeof null === 'object'`), `===` pour les valeurs
  précises et l’absence, `in` pour les propriétés, `instanceof` et `Array.isArray` pour les
  objets construits et les tableaux.
- `if (valeur)` écarte toutes les valeurs falsy, pas seulement `undefined`.
- Une union discriminée donne à chaque variante un littéral commun (`kind`, `status`…) ; un
  `switch` dessus rétrécit chaque cas.
- `never` est le type sans valeur ; `assertNever` dans le `default` garantit l’exhaustivité à la
  compilation et lève une erreur claire à l’exécution.
- `any` désactive la vérification et se propage ; `unknown` oblige à vérifier avant usage. Les
  données externes sont `unknown` jusqu’à preuve du contraire, et la preuve est une garde de
  type (`value is T`) qui contrôle réellement chaque propriété.
- La variable d’un `catch` est `unknown` : rétrécis-la avec `instanceof`.
