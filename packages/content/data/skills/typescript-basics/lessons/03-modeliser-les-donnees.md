---
title: Modéliser ses données
summary: Nommer des types avec type et interface, décrire des choix avec les unions et les littéraux, et gérer les valeurs absentes avec strictNullChecks.
durationMinutes: 60
sources:
  - title: TypeScript — Everyday Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: TypeScript — Object Types (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
  - title: TypeScript — Option strictNullChecks
    url: https://www.typescriptlang.org/tsconfig/strict.html
---

## Décrire le domaine avant d’écrire le code

Dans une application, les mêmes formes de données reviennent partout : un produit, un client,
une commande. Dans la leçon précédente, tu as écrit ces formes directement dans les paramètres :
`{ title: string; pages: number }`. Répété dans dix fonctions, ce type devient illisible et
impossible à faire évoluer.

Cette leçon t’apprend à **modéliser** : donner un nom à chaque forme, dire précisément quelles
valeurs sont permises (« le statut est `draft`, `published` ou `archived`, rien d’autre ») et
quelles informations peuvent manquer. Un bon modèle rend les erreurs impossibles à écrire :
`tsc` les refuse avant même que tu lances le programme.

## Nommer un type : `type` et `interface`

Deux syntaxes permettent de donner un nom à une forme d’objet :

```ts
type Product = {
  id: number;
  name: string;
  price: number;
};

interface Customer {
  id: number;
  email: string;
}

function formatLine(product: Product, quantity: number): string {
  return `${quantity} × ${product.name} = ${(product.price * quantity).toFixed(2)} €`;
}

function greetCustomer(customer: Customer): string {
  return `Bonjour ${customer.email}`;
}

const keyboard: Product = { id: 1, name: 'Clavier', price: 49.9 };
const ada: Customer = { id: 7, email: 'ada@example.com' };

console.log(formatLine(keyboard, 2));
console.log(greetCustomer(ada));
```

```text
2 × Clavier = 99.80 €
Bonjour ada@example.com
```

- `type Product = { … };` crée un **alias de type** : un nouveau nom pour un type. Note le `=`
  et le point-virgule final, comme une affectation.
- `interface Customer { … }` déclare une **interface** : pas de `=`.
- Par convention, les noms de types commencent par une majuscule (`Product`, `Customer`), les
  variables par une minuscule.

Le typage reste **structurel** : le nom ne change rien à la compatibilité. Un objet qui a un
`id` numérique et un `email` textuel convient partout où un `Customer` est attendu, même s’il
n’a jamais été déclaré comme tel.

### Étendre un type

On construit souvent un type à partir d’un autre. Les deux syntaxes le permettent, chacune à
sa façon :

```ts
interface Person {
  name: string;
}

interface Employee extends Person {
  team: string;
}

type Timestamped = {
  createdAt: Date;
};

type Note = {
  text: string;
} & Timestamped;

const grace: Employee = { name: 'Grace', team: 'Compilateurs' };
const note: Note = { text: 'Relire la leçon 3', createdAt: new Date('2026-03-01T10:00:00Z') };

console.log(grace.name, grace.team);
console.log(note.text, note.createdAt.toISOString());
```

```text
Grace Compilateurs
Relire la leçon 3 2026-03-01T10:00:00.000Z
```

- `interface Employee extends Person` : un `Employee` a tout ce qu’a un `Person`, plus `team`.
- `A & B` est une **intersection** : une valeur qui possède à la fois les propriétés de `A` et
  celles de `B`.

### `type` ou `interface` : que choisir ?

Les deux sont très proches et, pour décrire un objet, interchangeables dans la grande majorité
des cas. Deux différences concrètes :

1. **`type` peut nommer n’importe quel type**, pas seulement un objet : une union
   (`type Id = string | number`), un tuple (`type Point = [number, number]`), un type de
   fonction (`type Formatter = (value: number) => string`). Une interface ne décrit que des
   objets ; `interface Euro = number;` est une erreur de syntaxe.
2. **Une interface peut être rouverte** : deux déclarations `interface Settings` du même nom
   fusionnent leurs propriétés. Deux `type Options` du même nom provoquent une erreur (fichier
   `merge.ts`) :

```ts
interface Settings {
  theme: string;
}
interface Settings {
  pageSize: number;
}

type Options = { theme: string };
type Options = { pageSize: number };

const settings: Settings = { theme: 'sombre' };
```

```text
merge.ts(8,6): error TS2300: Duplicate identifier 'Options'.
merge.ts(9,6): error TS2300: Duplicate identifier 'Options'.
merge.ts(11,7): error TS2741: Property 'pageSize' is missing in type '{ theme: string; }' but required in type 'Settings'.
```

La dernière erreur montre la fusion : `Settings` exige désormais `theme` **et** `pageSize`.
Cette fusion sert surtout aux bibliothèques ; dans ton code, une interface déclarée deux fois
par erreur est plutôt un piège.

Le manuel de TypeScript indique qu’on peut choisir selon ses préférences et, si l’on veut une
règle, utiliser `interface` tant qu’on n’a pas besoin des possibilités propres à `type`.
Beaucoup d’équipes font l’inverse et utilisent `type` partout. C’est une **convention**, pas
une règle du langage : l’important est d’être cohérent dans un même projet. Ce cours emploie
surtout `type`, parce qu’il sert aussi pour les unions que tu vas voir maintenant.

## Les unions : une valeur parmi plusieurs types

Une **union** `A | B` décrit une valeur qui est **soit** de type `A`, **soit** de type `B`
(fichier `union.ts`) :

```ts
function formatId(id: string | number): string {
  return `#${id}`;
}

console.log(formatId(42));
console.log(formatId('A-17'));
console.log(formatId(true));

function shout(id: string | number): string {
  return id.toUpperCase();
}
```

```text
union.ts(7,22): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
union.ts(10,13): error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  Property 'toUpperCase' does not exist on type 'number'.
```

La première erreur est attendue : un booléen n’est ni une chaîne ni un nombre. La seconde est
plus instructive. Sur une union, TypeScript n’autorise que ce qui est valable pour **tous** les
membres. Un gabarit de chaîne accepte les deux types, d’où `formatId` sans erreur ; mais
`toUpperCase` n’existe que sur les chaînes, et `id` pourrait être un nombre. Pour l’appeler, il
faut d’abord vérifier que `id` est une chaîne : c’est le **rétrécissement**, sujet de la leçon
suivante.

## Les types littéraux : n’autoriser que certaines valeurs

Un **type littéral** est un type qui n’admet qu’une seule valeur : `'draft'` est le type de la
seule chaîne `'draft'`. Seul, il sert peu ; combiné en union, il décrit exactement un ensemble
de valeurs permises (fichier `status.ts`) :

```ts
type Status = 'draft' | 'published' | 'archived';

type Article = {
  title: string;
  status: Status;
};

function publish(article: Article): Article {
  return { ...article, status: 'published' };
}

const draft: Article = { title: 'Les unions', status: 'draft' };
console.log(publish(draft));
```

```text
{ title: 'Les unions', status: 'published' }
```

Toute autre valeur est refusée, y compris une simple différence de casse :

```ts
const broken: Article = { title: 'Supprimé', status: 'deleted' };
const typo: Article = { title: 'Brouillon', status: 'Draft' };
```

```text
status.ts(15,46): error TS2322: Type '"deleted"' is not assignable to type 'Status'.
status.ts(16,45): error TS2820: Type '"Draft"' is not assignable to type 'Status'. Did you mean '"draft"'?
```

(Ces deux lignes sont ajoutées à la fin du fichier précédent, après une ligne vide, d’où les
numéros 15 et 16.)

C’est la manière la plus simple et la plus courante de remplacer un `enum` : une union de
chaînes. Elle est effaçable (Node.js l’exécute sans problème), l’éditeur propose les valeurs
possibles en autocomplétion, et à l’exécution les valeurs sont de simples chaînes, lisibles
dans un JSON ou une base de données.

On peut aussi combiner des nombres (`type Dice = 1 | 2 | 3 | 4 | 5 | 6`) ou des booléens.

### `let`, `const` et l’élargissement

Fichier `widen.ts` :

```ts
type Status = 'draft' | 'published' | 'archived';

function setStatus(status: Status): void {
  console.log(`Nouveau statut : ${status}`);
}

const fixed = 'draft';
let changing = 'draft';

setStatus(fixed);
setStatus(changing);

const article = { title: 'Les unions', status: 'draft' };
setStatus(article.status);
```

```text
widen.ts(11,11): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Status'.
widen.ts(14,11): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Status'.
```

Pourquoi `fixed` passe et pas `changing` ? Une constante ne peut contenir que `'draft'` : son
type est le littéral `'draft'`. Une variable `let` peut changer ; TypeScript **élargit** son
type à `string`. De même, une propriété d’objet peut être modifiée : `article.status` est une
`string`. Une `string` quelconque n’est pas forcément un `Status`, d’où le refus.

Deux corrections (fichier `asconst.ts`) :

```ts
type Status = 'draft' | 'published' | 'archived';

function setStatus(status: Status): void {
  console.log(`Nouveau statut : ${status}`);
}

let changing: Status = 'draft';
setStatus(changing);

const article = { title: 'Les unions', status: 'draft' } as const;
setStatus(article.status);
article.status = 'published';
```

```text
asconst.ts(12,9): error TS2540: Cannot assign to 'status' because it is a read-only property.
```

- Annoter `let changing: Status` dit ce que la variable a le droit de contenir.
- `as const` (une forme particulière d’assertion, sans danger celle-ci) fige l’objet : chaque
  propriété garde son type littéral et devient en lecture seule. Le dernier appel montre que la
  modification est désormais refusée.

Annoter directement l’objet (`const article: Article = { … }`) est souvent la meilleure
solution : `status` y est typé `Status`, et l’objet reste modifiable.

## Valeurs absentes : propriétés optionnelles et `strictNullChecks`

### Les propriétés optionnelles

Toutes les données ne sont pas toujours connues. Un `?` après le nom rend une propriété
**optionnelle** (fichier `contact.ts`) :

```ts
type Contact = {
  name: string;
  email: string;
  phone?: string;
};

const ada: Contact = { name: 'Ada', email: 'ada@example.com' };
const grace: Contact = { name: 'Grace', email: 'grace@example.com', phone: '06 12 34 56 78' };

function phoneDigits(contact: Contact): number {
  return contact.phone.length;
}
```

```text
contact.ts(11,10): error TS18048: 'contact.phone' is possibly 'undefined'.
```

Les deux objets sont acceptés, avec ou sans téléphone. Mais à l’intérieur de la fonction,
`contact.phone` est de type `string | undefined` : l’utiliser comme une chaîne est refusé.
`TS18048` est l’erreur que tu rencontreras le plus souvent en TypeScript strict. Elle t’oblige
à traiter le cas de l’absence, qui sinon provoquerait
`TypeError: Cannot read properties of undefined`.

Trois manières de la traiter :

```ts
type Contact = {
  name: string;
  email: string;
  phone?: string;
};

const ada: Contact = { name: 'Ada', email: 'ada@example.com' };
const grace: Contact = { name: 'Grace', email: 'grace@example.com', phone: '06 12 34 56 78' };

function phoneLabel(contact: Contact): string {
  if (contact.phone === undefined) {
    return 'pas de téléphone';
  }
  return `tél. ${contact.phone.replaceAll(' ', '')}`;
}

function phoneLength(contact: Contact): number {
  return contact.phone?.length ?? 0;
}

console.log(phoneLabel(ada), '|', phoneLabel(grace));
console.log(phoneLength(ada), phoneLength(grace));
```

```text
pas de téléphone | tél. 0612345678
0 14
```

- Un `if` qui écarte `undefined` : après lui, TypeScript sait que `phone` est une `string`.
- Le chaînage optionnel `?.` : `contact.phone?.length` vaut `undefined` si `phone` est absent.
  Son type est `number | undefined`.
- La coalescence `??` fournit une valeur de remplacement : le résultat est un `number`.

Ce sont les opérateurs que tu connais en JavaScript ; TypeScript comprend leur effet sur les
types.

### `strictNullChecks` : `null` et `undefined` sont des types à part

Avec l’option `strictNullChecks`, incluse dans `strict`, `null` et `undefined` ne sont **pas**
des valeurs acceptables pour une `string` ou un `number`. Il faut les inclure explicitement
dans le type (fichier `names.ts`) :

```ts
let nickname: string = null;
let middleName: string | null = null;
middleName = 'Brewster';
```

```text
names.ts(1,5): error TS2322: Type 'null' is not assignable to type 'string'.
```

Cette option change aussi le type de nombreuses fonctions de JavaScript. `find` renvoie
l’élément trouvé **ou** `undefined` (fichier `find.ts`) :

```ts
type Contact = {
  name: string;
  email: string;
};

const contacts: Contact[] = [
  { name: 'Ada', email: 'ada@example.com' },
  { name: 'Grace', email: 'grace@example.com' },
];

const found = contacts.find((contact) => contact.name === 'Alan');
console.log(found.email);
```

```text
find.ts(12,13): error TS18048: 'found' is possibly 'undefined'.
```

Si l’on désactive `strictNullChecks`, ce fichier passe `tsc` sans erreur… et plante à
l’exécution avec `TypeError: Cannot read properties of undefined (reading 'email')`, puisque
personne ne s’appelle Alan. C’est l’une des principales raisons de ne jamais travailler sans
`strict`.

:::note[Optionnel ou `| undefined` ?]
`phone?: string` et `phone: string | undefined` ne sont pas identiques. Avec `?`, on peut
**omettre** la propriété. Avec `| undefined`, la propriété doit être **écrite**, même avec la
valeur `undefined` : `{}` est refusé (`TS2741: Property 'phone' is missing…`). Utilise `?`
pour une information facultative, et `| undefined` ou `| null` quand tu veux obliger à se
poser la question à chaque création d’objet.
:::

### Le point d’exclamation : à éviter

TypeScript propose l’opérateur `!` placé après une expression, qui affirme « cette valeur n’est
ni `null` ni `undefined` ». Comme `as`, il n’est **pas vérifié** :

```ts
type Contact = {
  name: string;
  phone?: string;
};

const ada: Contact = { name: 'Ada' };
console.log(ada.phone!.length);
```

`tsc` ne dit rien ; `node` affiche :

```text
console.log(ada.phone .length);
                       ^

TypeError: Cannot read properties of undefined (reading 'length')
```

Remarque la ligne citée par Node.js : le `!` a été remplacé par une espace, preuve que les
annotations sont simplement effacées. Dans du code généré, un `!` est un signal d’alerte :
quelqu’un a fait taire `TS18048` au lieu de traiter l’absence.

## Les propriétés en lecture seule

`readonly` devant une propriété interdit de la réaffecter après la création de l’objet
(fichier `invoice.ts`) :

```ts
type Invoice = {
  readonly id: number;
  readonly lines: readonly { label: string; amount: number }[];
  paid: boolean;
};

const invoice: Invoice = {
  id: 2026001,
  lines: [{ label: 'Formation', amount: 400 }],
  paid: false,
};

invoice.paid = true;
invoice.id = 2026002;
invoice.lines.push({ label: 'Support', amount: 50 });
invoice.lines[0].amount = 0;
```

```text
invoice.ts(14,9): error TS2540: Cannot assign to 'id' because it is a read-only property.
invoice.ts(15,15): error TS2339: Property 'push' does not exist on type 'readonly { label: string; amount: number; }[]'.
```

`paid` reste modifiable. Mais regarde la dernière ligne : elle n’est **pas** refusée.
`readonly` est **superficiel** : il protège la propriété `lines` et le tableau, pas les objets
qui sont dedans. C’est la même logique que `const` en JavaScript, qui empêche de réaffecter une
variable sans rendre l’objet qu’elle désigne immuable.

## Pièges courants

- **Une union n’est pas « l’un ou l’autre au choix du code ».** Sur `string | number`, seules
  les opérations communes aux deux sont permises tant que tu n’as pas vérifié le type.
- **`let status = 'draft'` est une `string`**, pas un `Status`. Annote la variable, ou l’objet
  qui la contient.
- **`?` partout** : rendre toutes les propriétés optionnelles « pour être tranquille » oblige
  ensuite à vérifier partout, et cache les vraies absences possibles. Une propriété n’est
  optionnelle que si elle peut réellement manquer.
- **Le `!` et le `as` pour faire taire `TS18048`.** Traite l’absence avec un `if`, `?.` ou `??`.
- **Croire que `readonly` rend un objet immuable** en profondeur, ou à l’exécution.
- **Déclarer deux fois la même interface** par erreur : elles fusionnent sans prévenir.

## Exercices

### Exercice 1 — Modéliser des tickets d’assistance

Une équipe gère des tickets. Chaque ticket a un identifiant numérique qui ne change jamais, un
titre, une priorité qui vaut `low`, `normal` ou `urgent`, éventuellement une personne assignée,
une liste d’étiquettes (éventuellement vide) et une date de création.

1. Écris le type `Priority` et l’interface `Ticket`.
2. Écris `describeTicket(ticket: Ticket): string` qui produit
   `[URGENT] #12 Panne serveur (non assigné)` ou `[LOW] #13 Coquille page contact (Grace)`.
3. Teste avec deux tickets, un assigné et un non assigné.

:::solution
```ts
type Priority = 'low' | 'normal' | 'urgent';

interface Ticket {
  readonly id: number;
  title: string;
  priority: Priority;
  assignee?: string;
  tags: string[];
  createdAt: Date;
}

function describeTicket(ticket: Ticket): string {
  const owner = ticket.assignee ?? 'non assigné';
  return `[${ticket.priority.toUpperCase()}] #${ticket.id} ${ticket.title} (${owner})`;
}

const tickets: Ticket[] = [
  { id: 12, title: 'Panne serveur', priority: 'urgent', tags: ['prod'], createdAt: new Date() },
  {
    id: 13,
    title: 'Coquille page contact',
    priority: 'low',
    assignee: 'Grace',
    tags: [],
    createdAt: new Date(),
  },
];

for (const ticket of tickets) {
  console.log(describeTicket(ticket));
}
```

```text
[URGENT] #12 Panne serveur (non assigné)
[LOW] #13 Coquille page contact (Grace)
```

Choix de modélisation à savoir justifier :

- `readonly id` : l’identifiant ne doit jamais être modifié.
- `assignee?: string` : l’information peut manquer ; `?? 'non assigné'` traite l’absence.
- `tags: string[]` n’est **pas** optionnel : « pas d’étiquette » s’exprime par un tableau vide,
  ce qui évite de vérifier `undefined` avant chaque `map`.
- `priority.toUpperCase()` est permis : chaque membre de l’union `Priority` est une chaîne.
- Comme `tickets` est annoté `Ticket[]`, une priorité `'high'` serait refusée dès la création.
:::

### Exercice 2 — Traiter l’absence

`npx tsc` signale deux erreurs dans ce fichier `members.ts`. Explique-les, prévois ce que ferait `node`
sans correction, puis corrige sans `!` ni `as` : `emailDomain` renvoie `undefined` quand il n’y
a pas d’e-mail, `findName` renvoie `'membre inconnu'` quand l’identifiant n’existe pas.

```ts
type Member = {
  id: number;
  name: string;
  email?: string;
};

const members: Member[] = [
  { id: 1, name: 'Ada', email: 'ada@example.com' },
  { id: 2, name: 'Alan' },
];

function emailDomain(member: Member): string {
  return member.email.split('@')[1];
}

function findName(id: number): string {
  const member = members.find((candidate) => candidate.id === id);
  return member.name;
}

console.log(emailDomain(members[0]), findName(2));
console.log(emailDomain(members[1]), findName(3));
```

:::solution
```text
members.ts(13,10): error TS18048: 'member.email' is possibly 'undefined'.
members.ts(18,10): error TS18048: 'member' is possibly 'undefined'.
```

- `email` est optionnel, donc de type `string | undefined`.
- `find` renvoie `Member | undefined`, car il peut ne rien trouver.

Sans correction, `node` affiche `example.com Alan` puis plante sur la seconde ligne :
`TypeError: Cannot read properties of undefined (reading 'split')`, car Alan n’a pas d’e-mail.

Correction des deux fonctions, le reste du fichier ne change pas :

```ts
function emailDomain(member: Member): string | undefined {
  return member.email?.split('@')[1];
}

function findName(id: number): string {
  const member = members.find((candidate) => candidate.id === id);
  return member?.name ?? 'membre inconnu';
}
```

```text
example.com Alan
undefined membre inconnu
```

Le type de retour de `emailDomain` devient `string | undefined` : on **annonce** l’absence
possible à l’appelant au lieu de la cacher. Pour `findName`, `?.` puis `??` fournissent la
valeur de remplacement demandée.
:::

### Exercice 3 — Ce qui compile et ce qui ne compile pas

Pour chaque déclaration de `a` à `f` du fichier `quiz.ts`, dis si `tsc` l’accepte et pourquoi.
Vérifie ensuite.

```ts
type Size = 'S' | 'M' | 'L';
type Shirt = { size: Size; color: string; stock?: number };

const a: Shirt = { size: 'M', color: 'bleu' };
const b: Shirt = { size: 'XL', color: 'rouge' };
let chosen = 'L';
const c: Shirt = { size: chosen, color: 'vert' };
const d: Shirt = { size: 'S', color: 'noir', stock: undefined };
const e: Shirt = { size: 'S' };
const f: Size[] = ['S', 'M', 'M'];
console.log(a, b, c, d, e, f);
```

:::solution
```text
quiz.ts(5,20): error TS2322: Type '"XL"' is not assignable to type 'Size'.
quiz.ts(7,20): error TS2322: Type 'string' is not assignable to type 'Size'.
quiz.ts(9,7): error TS2741: Property 'color' is missing in type '{ size: "S"; }' but required in type 'Shirt'.
```

- `a` : accepté. `stock` est optionnel, on peut l’omettre.
- `b` : refusé, `'XL'` ne fait pas partie de l’union `Size`.
- `c` : refusé. `chosen` est déclaré avec `let`, son type est élargi à `string`. Correction :
  `let chosen: Size = 'L'` ou `const chosen = 'L'`.
- `d` : accepté. Une propriété optionnelle accepte aussi la valeur `undefined` écrite
  explicitement (une option plus stricte, `exactOptionalPropertyTypes`, l’interdirait).
- `e` : refusé, `color` est obligatoire.
- `f` : accepté, chaque élément est une taille valide ; les doublons ne regardent pas le type.
:::

## Récapitulatif

- `type Nom = { … }` et `interface Nom { … }` nomment une forme d’objet. `type` nomme aussi des
  unions, tuples et types de fonctions ; une interface peut être étendue avec `extends` et
  rouverte. Choisis une convention et tiens-la.
- `A | B` : une valeur de l’un **ou** l’autre type ; seules les opérations communes sont
  permises sans vérification. `A & B` : les propriétés des deux.
- Les unions de littéraux (`'draft' | 'published'`) décrivent un ensemble fermé de valeurs et
  remplacent les `enum`. Attention à l’élargissement des `let` et des propriétés d’objets.
- `prop?: T` rend une propriété optionnelle ; elle vaut alors `T | undefined`.
- Avec `strictNullChecks`, `null` et `undefined` doivent figurer dans le type ; `find` et les
  optionnels obligent à traiter l’absence (`if`, `?.`, `??`). Évite `!`, non vérifié.
- `readonly` interdit la réaffectation d’une propriété, de façon superficielle et seulement
  pour `tsc`.
