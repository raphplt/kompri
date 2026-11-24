---
title: Génériques et types utilitaires
summary: Écrire des fonctions et des types réutilisables avec les génériques, et dériver de nouveaux types avec Partial, Required, Pick, Omit, Record, Readonly et ReturnType.
durationMinutes: 70
sources:
  - title: TypeScript — Generics (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
  - title: TypeScript — Utility Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
  - title: TypeScript — Creating Types from Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
---

## Le problème : une fonction utile pour tous les types

Tu veux une fonction qui renvoie le premier élément d’un tableau. Avec ce que tu sais, deux
options, toutes deux mauvaises :

```ts
function firstNumber(values: number[]): number | undefined {
  return values[0];
}

function firstAny(values: any[]): any {
  return values[0];
}

const city = firstAny(['Lyon', 'Lille']);
console.log(city.toFixed(2));
```

`firstNumber` ne fonctionne que pour des nombres : il faudrait une copie par type. `firstAny`
fonctionne pour tout, mais perd l’information : `city` est `any`, `tsc` accepte
`city.toFixed(2)`, et l’exécution échoue :

```text
TypeError: city.toFixed is not a function
```

Ce qu’il faudrait dire, c’est : « la fonction reçoit un tableau d’éléments d’un certain type,
et renvoie un élément **de ce même type** ». C’est exactement ce que permettent les
**génériques**.

## Les fonctions génériques

Fichier `first.ts` :

```ts
function first<T>(values: readonly T[]): T | undefined {
  return values[0];
}

const city = first(['Lyon', 'Lille']);
const score = first([12, 15]);
const nothing = first<string>([]);

console.log(city?.toUpperCase(), score?.toFixed(1), nothing);
```

```text
LYON 12.0 undefined
```

- `<T>` après le nom déclare un **paramètre de type**. `T` est une variable, comme un
  paramètre de fonction, mais qui contient un type. Le nom `T` est une convention ; on écrit
  aussi `Item`, `Value`…
- `values: readonly T[]` : un tableau d’éléments de type `T`. Le résultat `T | undefined` :
  un élément de ce même type, ou `undefined` si le tableau est vide.
- À l’appel, TypeScript **infère** `T` à partir des arguments : `string` pour le premier,
  `number` pour le second. `city` est donc une `string | undefined` et `score` un
  `number | undefined`.
- Quand rien ne permet de déduire `T` (un tableau vide), on peut le fournir entre chevrons :
  `first<string>([])`.

La vérification est complète. Ajoute `console.log(score?.toUpperCase());` à la fin :

```text
first.ts(10,20): error TS2339: Property 'toUpperCase' does not exist on type 'number'.
```

Tu utilises des génériques depuis le début sans le savoir : `Array<number>` est le type
générique `Array` appliqué à `number`, et `map`, `filter` ou `find` sont des méthodes
génériques. Les collections aussi : `new Map<string, number>()` crée une `Map` dont les clés
sont des chaînes et les valeurs des nombres.

### Un même `T` relie plusieurs paramètres

Fichier `lastor.ts` :

```ts
function lastOr<T>(values: readonly T[], fallback: T): T {
  return values.length > 0 ? values[values.length - 1] : fallback;
}

console.log(lastOr([3, 8, 5], 0));
console.log(lastOr([], 'aucun'));
console.log(lastOr([3, 8, 5], 'aucun'));
```

```text
lastor.ts(7,31): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

Le premier argument fixe `T = number` ; la valeur de repli doit alors être un nombre. Sans
générique, rien n’imposerait que les deux soient du même type. Une fois la dernière ligne
retirée, le programme affiche `5` puis `aucun`.

### Contraindre un paramètre de type avec `extends`

Parfois, la fonction a besoin que `T` possède certaines propriétés. Sans précaution (fichier
`longest.ts`) :

```ts
function longest<T>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```

```text
longest.ts(2,12): error TS2339: Property 'length' does not exist on type 'T'.
longest.ts(2,24): error TS2339: Property 'length' does not exist on type 'T'.
```

`T` peut être n’importe quoi, y compris un nombre, qui n’a pas de `length`. On **contraint**
`T` avec `extends` : « `T` doit au moins avoir une propriété `length` numérique » :

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

console.log(longest('Lyon', 'Marseille'));
console.log(longest([1, 2, 3], [4]));
console.log(longest(10, 20));
```

```text
longest.ts(7,21): error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

Les chaînes et les tableaux conviennent (sans la dernière ligne, le programme affiche
`Marseille` puis `[ 1, 2, 3 ]`), les nombres non. Et le type renvoyé reste précis : pour deux
chaînes, le résultat est une `string`, pas un vague `{ length: number }`.

### `keyof` : les noms de propriétés d’un type

`keyof T` est l’union des noms de propriétés de `T`. Combiné à un générique, il permet d’écrire
une fonction qui lit une propriété en gardant son type exact (fichier `property.ts`) :

```ts
type Product = {
  id: number;
  name: string;
  price: number;
};

type ProductKey = keyof Product;

function getProperty<T, K extends keyof T>(item: T, key: K): T[K] {
  return item[key];
}

const keyboard: Product = { id: 1, name: 'Clavier', price: 49.9 };
const name = getProperty(keyboard, 'name');
const price = getProperty(keyboard, 'price');
console.log(name.toUpperCase(), price.toFixed(2));

const key: ProductKey = 'stock';
getProperty(keyboard, 'stock');
```

```text
property.ts(18,7): error TS2322: Type '"stock"' is not assignable to type 'keyof Product'.
property.ts(19,23): error TS2345: Argument of type '"stock"' is not assignable to parameter of type 'keyof Product'.
```

- `keyof Product` vaut `'id' | 'name' | 'price'` : une union de littéraux.
- `K extends keyof T` : la clé doit être un nom de propriété de `T`.
- `T[K]` est un **type indexé** : le type de la propriété `K` de `T`. Pour `'name'`, c’est
  `string` ; pour `'price'`, `number`. Sans les deux dernières lignes, le programme affiche
  `CLAVIER 49.90`.

Tu n’écriras pas souvent ce genre de fonction, mais `keyof` est la clé pour comprendre les
types utilitaires de la suite.

## Les types génériques

Un type peut lui aussi avoir des paramètres. C’est le moyen de décrire une **structure** une
seule fois, quel que soit son contenu :

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

function parseAge(text: string): Result<number> {
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) {
    return { ok: false, error: `Âge invalide : ${text}` };
  }
  return { ok: true, value: age };
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

for (const input of ['36', '-4', 'trente']) {
  const result = parseAge(input);
  if (result.ok) {
    console.log(`Âge : ${result.value + 1} l’an prochain`);
  } else {
    console.log(result.error);
  }
}

const page = paginate(['Ada', 'Alan', 'Grace', 'Linus', 'Margaret'], 2, 2);
console.log(page);
console.log(page.items.map((name) => name.toUpperCase()));

const stock = new Map<string, number>();
stock.set('pommes', 12);
console.log(stock.get('pommes'));
```

```text
Âge : 37 l’an prochain
Âge invalide : -4
Âge invalide : trente
{ items: [ 'Grace', 'Linus' ], page: 2, totalPages: 3 }
[ 'GRACE', 'LINUS' ]
12
```

- `Result<T>` est l’union discriminée de la leçon précédente, rendue générique :
  `Result<number>`, `Result<Product>`, `Result<string[]>`… Après `if (result.ok)`,
  `result.value` a le bon type.
- `Page<T>` décrit une page de résultats de n’importe quoi. `paginate` relie le type des
  éléments reçus au type de la page renvoyée : `page.items` est un `string[]`.
- `stock.get('pommes')` est typé `number | undefined` : la clé peut ne pas exister.

:::warning[Un générique qui ment]
On voit souvent, notamment dans du code généré, ce genre de fonction :

```ts
type Product = {
  name: string;
  price: number;
};

function parseJson<T>(text: string): T {
  return JSON.parse(text);
}

const product = parseJson<Product>('{"name":"Clavier"}');
console.log(product.price.toFixed(2));
```

`tsc` accepte tout, car `JSON.parse` renvoie `any`, assignable à `T`. Résultat :
`TypeError: Cannot read properties of undefined (reading 'toFixed')`. Ce `parseJson<Product>`
est un `as Product` déguisé : le paramètre de type n’apparaît que dans le type de retour, rien
ne le relie à une vérification. Méfie-toi d’un générique qui n’est utilisé **que** dans le type
de retour. Une fonction de lecture honnête renvoie `unknown`, puis une garde de type vérifie.
:::

## Les types utilitaires

TypeScript fournit des types génériques prêts à l’emploi pour **dériver** un type d’un autre.
L’intérêt : une seule source de vérité. Si tu ajoutes une propriété à `User`, tous les types
dérivés suivent, sans copier-coller.

### `Partial<T>` : tout devient optionnel

Cas typique : une mise à jour qui ne modifie que certains champs (fichier `update.ts`) :

```ts
type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'member';
};

function updateUser(user: User, changes: Partial<User>): User {
  return { ...user, ...changes };
}

const ada: User = { id: 1, name: 'Ada', email: 'ada@example.com', role: 'member' };
console.log(updateUser(ada, { role: 'admin' }));
console.log(updateUser(ada, { email: 'ada@kompri.example' }).email);

updateUser(ada, { role: 'owner' });
updateUser(ada, { nickname: 'ada' });
```

```text
update.ts(16,19): error TS2322: Type '"owner"' is not assignable to type '"admin" | "member" | undefined'.
update.ts(17,19): error TS2353: Object literal may only specify known properties, and 'nickname' does not exist in type 'Partial<User>'.
```

`Partial<User>` vaut `{ id?: number; name?: string; email?: string; role?: 'admin' | 'member' }` :
chaque propriété peut manquer, mais celles qui sont présentes gardent leur type. Sans les deux
dernières lignes :

```text
{ id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin' }
ada@kompri.example
```

Deux défauts de cette version, à connaître :

1. `Partial<User>` permet aussi de modifier `id`. Pour l’empêcher, on combine les utilitaires :
   `Partial<Omit<User, 'id'>>`.
2. Une propriété optionnelle accepte `undefined` écrit explicitement. `updateUser(ada, { name:
   undefined })` passe `tsc`, et le décomposé `...changes` **écrase** le nom par `undefined`.
   Le type de retour annonce pourtant `name: string` : la prochaine lecture de `name.toUpperCase()`
   lève une `TypeError`. Quand les changements viennent de l’extérieur, il faut les valider.

### `Required<T>` et `Readonly<T>`

`Required<T>` fait l’inverse de `Partial` : toutes les propriétés deviennent obligatoires.
`Readonly<T>` les passe toutes en lecture seule (superficiellement, comme `readonly`). Fichier
`options.ts` :

```ts
type Options = {
  pageSize?: number;
  sortBy?: 'name' | 'date';
};

const defaults: Required<Options> = { pageSize: 20, sortBy: 'date' };

function resolveOptions(options: Options): Required<Options> {
  return { ...defaults, ...options };
}

const settings: Readonly<Required<Options>> = resolveOptions({ sortBy: 'name' });
console.log(settings);
settings.pageSize = 50;

const incomplete: Required<Options> = { pageSize: 10 };
```

```text
options.ts(14,10): error TS2540: Cannot assign to 'pageSize' because it is a read-only property.
options.ts(16,7): error TS2741: Property 'sortBy' is missing in type '{ pageSize: number; }' but required in type 'Required<Options>'.
```

Sans les lignes fautives, le programme affiche `{ pageSize: 20, sortBy: 'name' }`. Le motif
« options facultatives pour l’appelant, toutes résolues à l’intérieur » est très courant :
`defaults` doit fournir **chaque** valeur, ce que `Required` garantit.

### `Pick<T, K>` et `Omit<T, K>` : garder ou retirer des propriétés

```ts
type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'member';
};

type PublicUser = Omit<User, 'passwordHash'>;
type UserSummary = Pick<User, 'id' | 'name'>;
type NewUser = Omit<User, 'id'>;

function toPublic(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function summarize(user: User): UserSummary {
  return { id: user.id, name: user.name };
}

const ada: User = {
  id: 1,
  name: 'Ada',
  email: 'ada@example.com',
  passwordHash: '$2b$12$exemple',
  role: 'admin',
};

console.log(toPublic(ada));
console.log(summarize(ada));

const draft: NewUser = { name: 'Alan', email: 'alan@example.com', passwordHash: 'x', role: 'member' };
console.log(draft.name);
```

```text
{ id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin' }
{ id: 1, name: 'Ada' }
Alan
```

- `Pick<User, 'id' | 'name'>` garde seulement les propriétés citées.
- `Omit<User, 'passwordHash'>` garde toutes les autres. `Omit<User, 'id'>` décrit un
  utilisateur pas encore enregistré, avant que la base de données ne lui attribue un
  identifiant.

`Pick` vérifie que les clés existent (`Pick<User, 'nmae'>` donne
`TS2344: Type '"nmae"' does not satisfy the constraint 'keyof User'.`). **`Omit` ne le vérifie
pas** : `Omit<User, 'pasword'>`, avec une faute de frappe, est accepté sans erreur et ne retire
rien du tout.

:::warning[Un type ne retire rien à l’exécution]
Voici une version plus courte de `toPublic`, qui passe `tsc` :

```ts
type User = {
  id: number;
  name: string;
  passwordHash: string;
};

type PublicUser = Omit<User, 'passwordHash'>;

function toPublic(user: User): PublicUser {
  return user;
}

const ada: User = { id: 1, name: 'Ada', passwordHash: '$2b$12$exemple' };
console.log(JSON.stringify(toPublic(ada)));
```

```text
{"id":1,"name":"Ada","passwordHash":"$2b$12$exemple"}
```

Le hachage du mot de passe fuit. Par typage structurel, un `User` possède toutes les
propriétés d’un `PublicUser` : il est accepté tel quel. Le type dit ce que l’appelant a le
**droit de lire**, pas ce que l’objet **contient**. Pour retirer réellement une donnée sensible,
construis un nouvel objet avec les seules propriétés voulues, comme dans la première version.
:::

### `Record<K, V>` : un objet dictionnaire

`Record<K, V>` décrit un objet dont les clés sont de type `K` et les valeurs de type `V`. Avec
une union de littéraux comme clés, il garantit qu’**aucune** clé ne manque :

```ts
type Role = 'admin' | 'editor' | 'viewer';

const roleLabels: Record<Role, string> = {
  admin: 'Administratrice ou administrateur',
  editor: 'Rédaction',
  viewer: 'Lecture seule',
};

const stock: Record<string, number> = { pommes: 12, poires: 0 };
stock.kiwis = 5;

console.log(roleLabels.editor);
console.log(stock);
console.log(stock.bananes);
```

```text
Rédaction
{ pommes: 12, poires: 0, kiwis: 5 }
undefined
```

Si tu oublies `viewer` dans `roleLabels`, `tsc` le signale :
`TS2741: Property 'viewer' is missing in type '{ admin: string; editor: string; }' but required
in type 'Record<Role, string>'.` C’est une autre forme de vérification d’exhaustivité : ajouter
un rôle à l’union oblige à lui donner un libellé.

Avec `Record<string, number>`, n’importe quelle clé est acceptée… et typée `number`, même
`stock.bananes` qui vaut `undefined`. C’est le même trou que l’accès par indice dans un tableau
(leçon 2), et `noUncheckedIndexedAccess` le referme aussi. Pour un dictionnaire dont les clés
ne sont pas connues à l’avance, une `Map<string, number>`, dont `get` renvoie
`number | undefined`, est souvent plus sûre.

### `ReturnType<T>` : le type de ce que renvoie une fonction

Parfois, la source de vérité est une fonction. Plutôt que de recopier la forme de ce qu’elle
renvoie, on la déduit :

```ts
function createSession(userId: number, now: Date) {
  return {
    userId,
    startedAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  };
}

type Session = ReturnType<typeof createSession>;

function isExpired(session: Session, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

const session = createSession(7, new Date('2026-03-01T10:00:00Z'));
console.log(Object.keys(session));
console.log(isExpired(session, new Date('2026-03-01T10:30:00Z')));
console.log(isExpired(session, new Date('2026-03-01T11:00:00Z')));
```

```text
[ 'userId', 'startedAt', 'expiresAt' ]
false
true
```

- `typeof createSession` utilisé **dans un type** n’est pas l’opérateur `typeof` de JavaScript :
  c’est l’opérateur de types de TypeScript, qui donne le type d’une valeur, ici
  `(userId: number, now: Date) => { userId: number; startedAt: Date; expiresAt: Date }`.
- `ReturnType<…>` extrait la partie après la flèche. `Session` vaut donc
  `{ userId: number; startedAt: Date; expiresAt: Date }`, et suivra toute modification de
  `createSession`.

Il ne faut pas confondre les deux `typeof` : celui de JavaScript s’écrit dans une expression et
produit une chaîne à l’exécution (`'object'`, `'string'`…) ; celui de TypeScript s’écrit après
`type X =` ou `:` et disparaît à la compilation.

## Tableau des types utilitaires

| Type             | Ce qu’il produit                                           | Usage typique                              |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `Partial<T>`     | toutes les propriétés optionnelles                         | modification partielle, options            |
| `Required<T>`    | toutes les propriétés obligatoires                         | options résolues avec valeurs par défaut   |
| `Readonly<T>`    | toutes les propriétés en lecture seule (superficiel)       | configuration figée                        |
| `Pick<T, K>`     | seulement les propriétés `K` (clés vérifiées)              | résumé, sous-ensemble                      |
| `Omit<T, K>`     | toutes sauf `K` (clés **non** vérifiées)                   | données de création, vue publique          |
| `Record<K, V>`   | objet aux clés `K` et valeurs `V`                          | libellés par statut, dictionnaires         |
| `ReturnType<F>`  | le type renvoyé par le type de fonction `F`                | dériver d’une fonction existante           |

Tous sont **effacés** à l’exécution, comme les autres types : ils ne retirent, n’ajoutent et
ne figent rien dans les objets réels.

## Pièges courants

- **Un générique inutile.** `function log<T>(value: T): void` n’apporte rien : `T` ne relie
  rien à rien. Écris `value: unknown`. Un paramètre de type sert quand il apparaît **au moins
  deux fois** (deux paramètres, ou un paramètre et le retour).
- **Un générique uniquement dans le type de retour** (`parseJson<T>`) : c’est une assertion
  déguisée.
- **Oublier la contrainte** : `Property 'length' does not exist on type 'T'` signale qu’il faut
  un `extends`.
- **`Omit` avec une faute de frappe** : aucune erreur, aucune propriété retirée.
- **Croire qu’`Omit` ou `Pick` filtrent l’objet** : seul un nouvel objet construit à la main le
  fait.
- **`Partial` qui laisse passer `undefined`** et écrase une valeur obligatoire.
- **`Record<string, T>` qui promet une valeur pour toutes les clés.**

## Exercices

### Exercice 1 — Deux fonctions génériques

Écris :

1. `findById(items, id)`, qui renvoie l’élément dont l’`id` vaut `id`, ou `undefined`. Elle
   doit accepter n’importe quel tableau d’objets ayant un `id` numérique, et renvoyer le type
   exact des éléments.
2. `uniq(values)`, qui renvoie un nouveau tableau sans doublons, pour tout type d’éléments.

Vérifie que `findById(['a', 'b'], 1)` est refusé.

:::solution
```ts
function findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const books = [
  { id: 1, title: 'Le Petit Prince' },
  { id: 2, title: 'Vingt mille lieues sous les mers' },
];

const book = findById(books, 2);
console.log(book?.title);
console.log(findById(books, 9));
console.log(uniq(['ts', 'node', 'ts']));
console.log(uniq([3, 1, 3, 2, 1]));
```

```text
Vingt mille lieues sous les mers
undefined
[ 'ts', 'node' ]
[ 3, 1, 2 ]
```

- La contrainte `T extends { id: number }` autorise `item.id` dans la fonction ; le type de
  retour `T | undefined` garde la forme complète des livres, donc `book?.title` est permis.
  Avec `items: { id: number }[]` sans générique, on perdrait `title`.
- `readonly T[]` promet à l’appelant que son tableau ne sera pas modifié.
- `new Set(values)` élimine les doublons (comparaison stricte), et le décomposé `[...]`
  reconstruit un tableau. `uniq` garde l’ordre de première apparition.

`findById(['a', 'b'], 1)` produit
`TS2322: Type 'string' is not assignable to type '{ id: number; }'.` sur chaque élément. Un objet
dont l’`id` est une chaîne (`{ id: '1', … }`) est refusé de la même façon.
:::

### Exercice 2 — Dériver les types d’un article

À partir de ce type :

```ts
type Status = 'draft' | 'published' | 'archived';

type Article = {
  id: number;
  title: string;
  body: string;
  status: Status;
  authorId: number;
  createdAt: Date;
};
```

1. Définis `ArticleInput`, les données fournies pour créer un article (sans `id` ni
   `createdAt`, attribués par le programme).
2. Définis `ArticlePatch`, une modification partielle qui ne peut toucher qu’à `title`, `body`
   et `status`.
3. Définis `statusLabels`, un libellé français par statut, sans pouvoir en oublier un.
4. Écris `createArticle(input, now)` et `applyPatch(article, patch)`, puis publie un article.

:::solution
À la suite du type `Article` :

```ts
type ArticleInput = Omit<Article, 'id' | 'createdAt'>;
type ArticlePatch = Partial<Pick<Article, 'title' | 'body' | 'status'>>;

const statusLabels: Record<Status, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

let nextId = 1;

function createArticle(input: ArticleInput, now: Date): Article {
  const article = { ...input, id: nextId, createdAt: now };
  nextId += 1;
  return article;
}

function applyPatch(article: Article, patch: ArticlePatch): Article {
  return { ...article, ...patch };
}

const article = createArticle(
  { title: 'Les génériques', body: '…', status: 'draft', authorId: 7 },
  new Date('2026-03-01T10:00:00Z'),
);
const published = applyPatch(article, { status: 'published' });
console.log(`${published.title} : ${statusLabels[published.status]}`);
console.log(article.status, published.id, published.createdAt.toISOString());
```

```text
Les génériques : Publié
draft 1 2026-03-01T10:00:00.000Z
```

- `Partial<Pick<…>>` combine deux utilitaires : d’abord garder trois propriétés, puis les rendre
  optionnelles. `{ id: 99 }` ou `{ authorId: 3 }` sont refusés avec `TS2353`.
- `Record<Status, string>` oblige à fournir les trois libellés ; ajouter un statut à l’union
  fera apparaître une erreur ici.
- `applyPatch` renvoie un **nouvel** objet : `article` garde son statut `draft`.
- `now` est passé en paramètre plutôt que créé dans la fonction : elle reste prévisible et
  testable.
- Reste le trou de `Partial` vu plus haut : `{ title: undefined }` est accepté. Si les
  modifications viennent d’un formulaire ou d’une requête, valide-les avant.
:::

### Exercice 3 — Travailler avec `Result<T>`

Avec `type Result<T> = { ok: true; value: T } | { ok: false; error: string };` et la fonction
`parseAge` vue plus haut, écris :

1. `unwrapOr(result, fallback)`, qui renvoie la valeur si `ok`, sinon `fallback` ;
2. `mapResult(result, transform)`, qui applique `transform` à la valeur si `ok`, et renvoie
   l’erreur inchangée sinon. Le type de la valeur peut changer : `Result<number>` peut devenir
   `Result<boolean>`.

:::solution
```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function unwrapOr<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

function mapResult<T, U>(result: Result<T>, transform: (value: T) => U): Result<U> {
  if (!result.ok) {
    return result;
  }
  return { ok: true, value: transform(result.value) };
}

function parseAge(text: string): Result<number> {
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) {
    return { ok: false, error: `Âge invalide : ${text}` };
  }
  return { ok: true, value: age };
}

const good = parseAge('36');
const bad = parseAge('trente');

console.log(unwrapOr(good, 0), unwrapOr(bad, 0));
console.log(mapResult(good, (age) => age >= 18));
console.log(mapResult(bad, (age) => age >= 18));
console.log(mapResult(good, (age) => `${age} ans`));
```

```text
36 0
{ ok: true, value: true }
{ ok: false, error: 'Âge invalide : trente' }
{ ok: true, value: '36 ans' }
```

- `unwrapOr` relie trois positions par le même `T` : le contenu du résultat, la valeur de repli
  et le retour. `unwrapOr(good, 'inconnu')` serait refusé.
- `mapResult` a deux paramètres de type : `T` pour l’entrée, `U` pour la sortie, déduit de ce
  que renvoie `transform` (`boolean`, puis `string`).
- Dans la branche `!result.ok`, `result` est rétréci à `{ ok: false; error: string }`, qui ne
  contient aucun `T` : il est donc aussi un `Result<U>` valide, et peut être renvoyé tel quel.
:::

## Récapitulatif

- Un générique `<T>` est un paramètre de type, inféré à l’appel ; il relie les types de
  plusieurs paramètres et du retour sans perdre d’information, contrairement à `any`.
- `T extends Contrainte` exige que `T` possède certaines propriétés ; `keyof T` est l’union de
  ses clés ; `T[K]` le type d’une propriété.
- Les types génériques (`Result<T>`, `Page<T>`, `Array<T>`, `Map<K, V>`) décrivent une structure
  indépendante de son contenu.
- Un générique présent seulement dans le type de retour est une assertion déguisée.
- `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record` et `ReturnType` dérivent des types
  d’une source unique. `Omit` ne vérifie pas ses clés, `Partial` laisse passer `undefined`.
- Aucun type ne transforme les objets réels : pour retirer un champ sensible, construis un
  nouvel objet ; pour faire confiance à une donnée externe, valide-la. La compétence
  « TypeScript côté serveur » applique tout cela à une API Express, avec une validation par
  schéma qui produit à la fois le contrôle et le type.
