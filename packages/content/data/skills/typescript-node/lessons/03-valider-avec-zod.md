---
title: Valider les entrées à l’exécution avec Zod
summary: Décrire une donnée attendue avec un schéma Zod 4, la valider avec safeParse, lire les erreurs, en déduire le type avec z.infer, et transformer ou convertir les valeurs qui arrivent en texte.
durationMinutes: 70
sources:
  - title: Zod — Utilisation de base
    url: https://zod.dev/basics
  - title: Zod — Définir des schémas (API)
    url: https://zod.dev/api
  - title: Zod — Mettre en forme les erreurs
    url: https://zod.dev/error-formatting
  - title: OWASP — Input Validation Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
---

## Le problème : des types qui ne vérifient rien

La leçon précédente s’est terminée sur un constat : annoter `req.body` ne contrôle rien, et
l’API a enregistré une salle inexistante, un titre numérique et un identifiant choisi par le
client. Dans la compétence « Bases de TypeScript », tu as appris à écrire des gardes de type à
la main : `typeof value === 'object' && value !== null && 'price' in value && …`. Pour une
réservation à cinq champs, avec des bornes et un format de date, la garde ferait trente lignes,
et rien ne garantirait qu’elle corresponde au type déclaré à côté.

Une **bibliothèque de validation par schéma** règle les deux problèmes à la fois. Tu décris une
seule fois la donnée attendue, sous forme d’un objet JavaScript appelé **schéma**. Ce schéma sert
ensuite :

- à l’**exécution**, à vérifier une valeur inconnue et à produire des erreurs précises ;
- à la **compilation**, à en déduire le type TypeScript correspondant, sans le réécrire.

Ce cours utilise **Zod**, très répandu dans l’écosystème TypeScript, dans sa version 4
(installée en leçon 1 : `npm ls zod` doit afficher `zod@4.6.7` ou une 4.x plus récente).
Beaucoup d’exemples en ligne, et beaucoup de code proposé par les IA, utilisent encore la
syntaxe de Zod 3 : la fin de la leçon liste ce qui a changé.

Pour les exemples de cette leçon, crée des fichiers dans `src/` du projet et exécute-les avec
`node src/<fichier>.ts`. Supprime-les ensuite, sauf `src/config.ts`.

## Un premier schéma

```ts
// src/first-schema.ts
import { z } from 'zod';

const createBookingSchema = z.object({
  room: z.enum(['atlas', 'balise', 'cap']),
  title: z.string().trim().min(3).max(80),
  date: z.iso.date(),
  startHour: z.number().int().min(8).max(19),
  durationHours: z.number().int().min(1).max(4),
});

const ok = createBookingSchema.safeParse({
  room: 'cap',
  title: '  Rétro  ',
  date: '2026-12-02',
  startHour: 14,
  durationHours: 2,
  admin: true,
});
console.log(ok);

const ko = createBookingSchema.safeParse({
  room: 'salle-99',
  title: 42,
  date: '2026-02-30',
  startHour: 7.5,
});
if (!ko.success) {
  console.log(ko.error.issues.map(({ code, path, message }) => ({ code, path, message })));
}
```

```text
{
  success: true,
  data: {
    room: 'cap',
    title: 'Rétro',
    date: '2026-12-02',
    startHour: 14,
    durationHours: 2
  }
}
[
  {
    code: 'invalid_value',
    path: [ 'room' ],
    message: 'Invalid option: expected one of "atlas"|"balise"|"cap"'
  },
  {
    code: 'invalid_type',
    path: [ 'title' ],
    message: 'Invalid input: expected string, received number'
  },
  {
    code: 'invalid_format',
    path: [ 'date' ],
    message: 'Invalid ISO date'
  },
  {
    code: 'invalid_type',
    path: [ 'startHour' ],
    message: 'Invalid input: expected int, received number'
  },
  {
    code: 'invalid_type',
    path: [ 'durationHours' ],
    message: 'Invalid input: expected number, received undefined'
  }
]
```

### Les briques d’un schéma

`z` est l’objet qui regroupe toutes les fonctions de Zod. Chaque fonction crée un schéma, et
chaque méthode renvoie un **nouveau** schéma plus contraint :

| Écriture                         | Accepte                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `z.string()`                     | une chaîne                                                   |
| `z.number()`                     | un nombre fini (`NaN` et `Infinity` sont refusés)            |
| `z.boolean()`                    | `true` ou `false`                                            |
| `z.enum(['atlas', 'cap'])`       | une de ces chaînes exactement                                |
| `z.iso.date()`                   | une chaîne `AAAA-MM-JJ` qui désigne une date réelle          |
| `z.array(schéma)`                | un tableau dont chaque élément respecte le schéma            |
| `z.object({ … })`                | un objet dont chaque propriété respecte son schéma           |
| `.min(n)`, `.max(n)`             | bornes : longueur d’une chaîne ou d’un tableau, valeur d’un nombre |
| `.int()`                         | un entier                                                    |
| `.trim()`                        | retire les espaces autour de la chaîne **avant** les contrôles suivants |
| `.optional()`                    | la valeur peut aussi être `undefined` (propriété absente)    |
| `.nullable()`                    | la valeur peut aussi être `null`                             |

Observe les erreurs : `2026-02-30` a la bonne forme mais n’existe pas, et `z.iso.date()` le
refuse. `7.5` est un nombre, mais pas un entier. Une propriété absente arrive comme
`undefined`, ce que `z.number()` refuse. Zod ne s’arrête pas à la première erreur : il les
collecte **toutes**, ce qui permet au client de corriger sa requête en une fois.

### `safeParse` renvoie un résultat, `parse` lève une exception

`safeParse` renvoie une **union discriminée**, exactement comme le `Result<T>` de la compétence
précédente :

- `{ success: true, data }` : `data` est la valeur validée, typée ;
- `{ success: false, error }` : `error` est une `ZodError` dont la propriété `issues` liste les
  problèmes.

Après `if (!ko.success)`, TypeScript sait que `ko.error` existe ; après `if (ok.success)`, que
`ok.data` existe. Pas de `try…catch`, pas de `as`.

`parse` fait la même vérification mais **renvoie directement la valeur**, ou lève une exception :

```ts
// src/parse.ts
import { z } from 'zod';

const titleSchema = z.string().trim().min(3);

console.log(titleSchema.parse('  Rétro  '));

try {
  titleSchema.parse(42);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('ZodError :', error.issues[0]?.message);
  } else {
    throw error;
  }
}
```

```text
Rétro
ZodError : Invalid input: expected string, received number
```

Règle pratique : `safeParse` quand une donnée invalide est un cas **normal** à traiter (une
requête HTTP, un formulaire) ; `parse` quand une donnée invalide est une **anomalie** qui doit
interrompre le programme. `ZodError` hérite d’`Error`, donc `instanceof` permet de la
distinguer des autres erreurs dans un `catch`. Le `?.` après `issues[0]` vient de
`noUncheckedIndexedAccess` : TypeScript ne sait pas que le tableau est non vide.

## La valeur validée est une nouvelle valeur

Regarde à nouveau le premier résultat : `ok.data` n’est pas l’objet reçu.

- Le titre a été **nettoyé** par `.trim()` : `'  Rétro  '` est devenu `'Rétro'`.
- La propriété `admin`, absente du schéma, a **disparu**.

`safeParse` construit une nouvelle valeur à partir de ce que décrit le schéma. C’est elle, et
seulement elle, que ton code doit utiliser ensuite. Garder l’objet d’origine (`req.body`) après
l’avoir validé, c’est garder les espaces et les propriétés imprévues.

Le sort des propriétés inconnues dépend de la fonction qui crée l’objet :

```ts
// src/objects.ts
import { z } from 'zod';

const shape = { title: z.string() };
const input = { title: 'Rétro', admin: true };

console.log(z.object(shape).safeParse(input).data);
console.log(z.looseObject(shape).safeParse(input).data);
console.log(z.strictObject(shape).safeParse(input).error?.issues);
```

```text
{ title: 'Rétro' }
{ title: 'Rétro', admin: true }
[
  {
    code: 'unrecognized_keys',
    keys: [ 'admin' ],
    path: [],
    message: 'Unrecognized key: "admin"'
  }
]
```

| Fonction          | Propriétés inconnues           | Usage typique                                      |
| ----------------- | ------------------------------ | -------------------------------------------------- |
| `z.object`        | retirées en silence            | paramètres de requête, où des ajouts sont anodins  |
| `z.strictObject`  | refusées avec une erreur       | corps de requête : une faute de frappe est signalée |
| `z.looseObject`   | conservées                     | rarement utile pour une entrée externe             |

`z.object` suffit déjà à neutraliser l’affectation de masse de la leçon 2 : l’`id` envoyé par le
client est retiré. `z.strictObject` va plus loin : un client qui envoie `durationHour` au lieu de
`durationHours` reçoit une erreur claire au lieu d’une valeur ignorée. C’est un choix de
conception, pas une règle : ce cours utilise `z.strictObject` pour les corps de requête.

## Lire et personnaliser les erreurs

Chaque élément de `error.issues` contient au moins un `code` (la nature du problème), un
`path` (le chemin vers la valeur fautive : `['title']`, ou `['equipment', 0]` pour le premier
élément d’un tableau, `[]` pour l’objet lui-même) et un `message`. Selon le code, d’autres
propriétés précisent l’erreur (`expected`, `values`, `keys`…).

Les messages par défaut sont en anglais. Tu peux en fournir d’autres avec l’option `error`, ou
avec une simple chaîne en second argument d’une contrainte. Zod propose aussi deux fonctions de
mise en forme :

```ts
// src/messages.ts
import { z } from 'zod';

const schema = z.strictObject({
  title: z
    .string({ error: 'Le titre doit être une chaîne' })
    .trim()
    .min(3, { error: 'Le titre doit contenir au moins 3 caractères' }),
  startHour: z.number().int().min(8, 'Ouverture à 8 h'),
});

const result = schema.safeParse({ title: '  a ', startHour: 7, admin: true });
if (!result.success) {
  console.log(z.prettifyError(result.error));
  console.log(z.flattenError(result.error));
}
```

```text
✖ Unrecognized key: "admin"
✖ Le titre doit contenir au moins 3 caractères
  → at title
✖ Ouverture à 8 h
  → at startHour
{
  formErrors: [ 'Unrecognized key: "admin"' ],
  fieldErrors: {
    title: [ 'Le titre doit contenir au moins 3 caractères' ],
    startHour: [ 'Ouverture à 8 h' ]
  }
}
```

- `z.prettifyError` produit un texte lisible, idéal pour un message dans un terminal.
- `z.flattenError` regroupe les messages par champ (`fieldErrors`), plus les erreurs qui
  portent sur l’objet entier (`formErrors`) : pratique pour afficher chaque erreur à côté du
  bon champ d’un formulaire.
- L’option `error` de `z.string({ error: … })` s’applique quand la valeur n’est pas une chaîne,
  y compris quand elle est absente.

Zod fournit aussi des traductions de ses messages par défaut : `z.config(z.locales.fr())`
active le français pour **tout** le programme (par exemple « Entrée invalide : entier attendu,
nombre reçu »). C’est un réglage global, à faire une seule fois au démarrage. Dans le projet, on
garde les messages par défaut : l’erreur principale de l’API sera en français, et le détail
technique en anglais, ce qui est courant pour une API.

## Déduire le type : `z.infer`

Le schéma décrit déjà tout ce que le type devrait dire. `z.infer` le calcule :

```ts
// src/infer.ts
import { z } from 'zod';

const createBookingSchema = z.object({
  room: z.enum(['atlas', 'balise', 'cap']),
  title: z.string().trim().min(3).max(80),
  date: z.iso.date(),
  startHour: z.number().int().min(8).max(19),
  durationHours: z.number().int().min(1).max(4).default(1),
});

type CreateBookingInput = z.infer<typeof createBookingSchema>;

function describe(input: CreateBookingInput): string {
  return `${input.title} (${input.room}, ${input.date} à ${input.startHour} h, ${input.durationHours} h)`;
}

const body: unknown = JSON.parse(
  '{"room":"balise","title":"Atelier","date":"2026-12-04","startHour":10}',
);
const result = createBookingSchema.safeParse(body);
if (result.success) {
  console.log(describe(result.data));
}

const typo: CreateBookingInput = {
  room: 'Atlas',
  title: 'Point',
  date: '2026-12-01',
  startHour: 9,
  durationHours: 1,
};
```

```text
src/infer.ts(27,3): error TS2820: Type '"Atlas"' is not assignable to type '"atlas" | "balise" | "cap"'. Did you mean '"atlas"'?
```

```text
Atelier (balise, 2026-12-04 à 10 h, 1 h)
```

- `typeof createBookingSchema` désigne le **type de la variable** qui contient le schéma ;
  `z.infer<…>` en extrait le type des données valides. Ici :
  `{ room: 'atlas' | 'balise' | 'cap'; title: string; date: string; startHour: number; durationHours: number }`.
- `body` est déclaré `unknown` : c’est le type honnête d’une donnée externe. Après
  `if (result.success)`, `result.data` est un `CreateBookingInput`, **sans aucune assertion**.
- `.default(1)` : si `durationHours` est absent, la validation renvoie `1`. Le message affiche
  bien `1 h`.
- Les contraintes (`min(3)`, `int()`…) n’apparaissent pas dans le type : TypeScript ne sait pas
  exprimer « chaîne d’au moins trois caractères ». C’est la validation à l’exécution qui les
  garantit.

Le bénéfice décisif : **une seule définition**. Si tu ajoutes un champ au schéma, le type suit
automatiquement, et `tsc` te montre chaque endroit du code à adapter.

### Ce qui entre et ce qui sort : `z.input` et `z.output`

Avec `.default(1)`, le client **peut** omettre `durationHours`, mais la valeur validée l’a
**toujours**. Un même schéma décrit donc deux types :

```ts
// src/in-out.ts
import { z } from 'zod';

const createBookingSchema = z.object({
  title: z.string().trim().min(3),
  durationHours: z.number().int().min(1).max(4).default(1),
});

type CreateBookingBody = z.input<typeof createBookingSchema>; // ce que le client peut envoyer
type CreateBookingInput = z.output<typeof createBookingSchema>; // ce que la validation renvoie

const body: CreateBookingBody = { title: 'Rétro' };
const input: CreateBookingInput = { title: 'Rétro' };
```

```text
src/in-out.ts(13,7): error TS2741: Property 'durationHours' is missing in type '{ title: string; }' but required in type '{ title: string; durationHours: number; }'.
```

`z.infer` est un autre nom de `z.output` : c’est presque toujours lui que tu veux, puisque ton
code manipule des données **déjà validées**. `z.input` sert surtout à typer ce qu’un client
envoie, par exemple dans un test.

## Transformer et convertir

### Nettoyer et transformer

Une validation peut aussi **transformer** la valeur. Tu as vu `.trim()` ; `.toLowerCase()`
existe aussi. `.transform(fonction)` applique une fonction quelconque, et `.pipe(schéma)` passe
le résultat à un second schéma :

```ts
// src/transform.ts
import { z } from 'zod';

const roomSchema = z.string().trim().toLowerCase().pipe(z.enum(['atlas', 'balise', 'cap']));
console.log(roomSchema.parse(' Atlas '));
console.log(roomSchema.safeParse('Zénith').error?.issues[0]?.message);

const tagsSchema = z
  .string()
  .transform((value) => value.split(',').map((tag) => tag.trim()).filter((tag) => tag !== ''));
console.log(tagsSchema.parse('projet, , client ,urgent'));
```

```text
atlas
Invalid option: expected one of "atlas"|"balise"|"cap"
[ 'projet', 'client', 'urgent' ]
```

Le type déduit suit la transformation : `z.infer<typeof tagsSchema>` est `string[]`, et
`z.input<typeof tagsSchema>` est `string`.

### Les paramètres de requête arrivent en texte : la coercition

Dans `?limit=10`, la valeur est la **chaîne** `'10'` : `z.number()` la refuserait. Les schémas
`z.coerce.…` commencent par convertir la valeur, avec `Number(…)` pour `z.coerce.number()`, puis
appliquent les contrôles :

```ts
// src/coerce.ts
import { z } from 'zod';

const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

const inputs = [undefined, '10', ' 12 ', '1e1', '0x10', '', 'abc', ['5', '6']];
for (const input of inputs) {
  const result = limitSchema.safeParse(input);
  const outcome = result.success ? result.data : result.error.issues[0]?.message;
  console.log(JSON.stringify(input), '->', outcome);
}
```

```text
undefined -> 20
"10" -> 10
" 12 " -> 12
"1e1" -> 10
"0x10" -> 16
"" -> Too small: expected number to be >=1
"abc" -> Invalid input: expected number, received NaN
["5","6"] -> Invalid input: expected number, received NaN
```

Chaque ligne s’explique par les règles de `Number()` que tu connais :

- paramètre absent : `.default(20)` répond **avant** toute conversion ;
- espaces, notation scientifique et hexadécimale sont acceptés par `Number()` ;
- la chaîne vide devient `0` : seule la borne `min(1)` la rejette. Sans elle, `?limit=` vaudrait
  0 sans erreur ;
- un paramètre répété (`?limit=5&limit=6`) arrive en tableau, que `Number()` transforme en
  `NaN`, refusé par `z.number()`.

Pour une limite, cette tolérance est acceptable. Pour un **identifiant**, on préfère souvent
n’accepter que des chiffres, avec une expression régulière suivie d’une transformation :

```ts
// src/strict-id.ts
import { z } from 'zod';

const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, 'Identifiant invalide')
  .transform((value) => Number(value));

for (const input of ['12', '1e1', '0x10', '007', '-3']) {
  const result = idSchema.safeParse(input);
  console.log(input, '->', result.success ? result.data : result.error.issues[0]?.message);
}

type IdInput = z.input<typeof idSchema>; // string
type Id = z.output<typeof idSchema>; // number
```

```text
12 -> 12
1e1 -> Identifiant invalide
0x10 -> Identifiant invalide
007 -> Identifiant invalide
-3 -> Identifiant invalide
```

### Le piège des booléens

```ts
// src/booleans.ts
import { z } from 'zod';

const naive = z.coerce.boolean();
console.log(naive.parse('true'), naive.parse('false'), naive.parse('0'), naive.parse(''));

const flag = z.stringbool();
console.log(flag.parse('true'), flag.parse('false'), flag.parse('0'), flag.parse('yes'));
console.log(flag.safeParse('peut-être').success);
```

```text
true true true false
true false false true
false
```

`z.coerce.boolean()` applique `Boolean(…)` : toute chaîne non vide est **truthy**, donc
`?onlyMine=false` donne `true`. C’est presque toujours un bug. `z.stringbool()` interprète le
texte : `'true'`, `'1'`, `'yes'`, `'on'` (et quelques autres) donnent `true`, leurs contraires
donnent `false`, et toute autre chaîne est refusée.

## Une règle qui porte sur plusieurs champs : `refine`

« Une réservation se termine à 20 h au plus tard » concerne deux champs à la fois. `.refine`
ajoute un contrôle quelconque, décrit par une fonction qui renvoie `true` si la valeur est
acceptable :

```ts
// src/refine.ts
import { z } from 'zod';

const slotSchema = z
  .object({
    startHour: z.number().int().min(8).max(19),
    durationHours: z.number().int().min(1).max(4),
  })
  .refine((slot) => slot.startHour + slot.durationHours <= 20, {
    error: 'La réservation doit se terminer à 20 h au plus tard',
    path: ['durationHours'],
  });

console.log(slotSchema.safeParse({ startHour: 17, durationHours: 3 }).success);
console.log(slotSchema.safeParse({ startHour: 18, durationHours: 3 }).error?.issues);
console.log(slotSchema.safeParse({ startHour: 7, durationHours: 9 }).error?.issues.length);
```

```text
true
[
  {
    code: 'custom',
    path: [ 'durationHours' ],
    message: 'La réservation doit se terminer à 20 h au plus tard'
  }
]
2
```

- `path` rattache l’erreur à un champ ; sans lui, elle porterait sur l’objet entier (`[]`).
- La dernière ligne affiche `2` : les deux champs sont hors bornes, et la fonction de `refine`
  **n’est pas exécutée** tant que la forme de l’objet n’est pas valide. Elle peut donc compter
  sur des nombres corrects.
- Une règle qui dépend de l’**état** de l’application (« ce créneau est-il déjà pris ? ») n’a
  pas sa place dans un schéma : le schéma ne vérifie que la donnée elle-même. Ce contrôle viendra
  dans la leçon suivante.

## Valider aussi la configuration

Les variables d’environnement sont, elles aussi, des données externes : elles arrivent en
texte et peuvent être absentes ou fausses. Avec `Number(process.env.PORT ?? 3000)`, un
`PORT=abc` donne `NaN` sans que personne ne s’en aperçoive. Remplace `src/config.ts` par cette
version, que le projet gardera :

```ts
// src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error(`Configuration invalide :\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const config = {
  port: result.data.PORT,
  env: result.data.NODE_ENV,
};
```

Avec un fichier d’essai `src/show-config.ts` qui fait `import { config } from './config.ts'`
puis `console.log(config)` :

```bash
node src/show-config.ts
PORT=8080 NODE_ENV=production node src/show-config.ts
PORT=abc NODE_ENV=prod node src/show-config.ts
```

```text
{ port: 3000, env: 'development' }
{ port: 8080, env: 'production' }
Configuration invalide :
✖ Invalid input: expected number, received NaN
  → at PORT
✖ Invalid option: expected one of "development"|"production"|"test"
  → at NODE_ENV
```

Le serveur refuse de démarrer avec une configuration fausse, et dit pourquoi : c’est bien
mieux qu’un serveur qui démarre de travers. Ici, `process.exit(1)` est justifié : sans
configuration valide, rien ne doit s’exécuter. TypeScript le sait d’ailleurs : `process.exit`
est déclaré comme ne revenant jamais (type `never`), donc après le `if`, `result.data` est
accessible sans erreur. `z.object` ignore les centaines d’autres variables d’environnement, et
la configuration exportée a un type exact : `port` est un `number`, `env` une union de trois
chaînes.

## Les syntaxes de Zod 3 à reconnaître

| Écriture Zod 3 (à corriger)                         | Écriture Zod 4                      | Ce qui se passe avec Zod 4          |
| --------------------------------------------------- | ----------------------------------- | ----------------------------------- |
| `z.string({ required_error: '…' })`                 | `z.string({ error: '…' })`          | erreur de `tsc` (`TS2769`)          |
| `error.errors`                                      | `error.issues`                      | erreur de `tsc`, `undefined` à l’exécution |
| `.min(3, { message: '…' })`                         | `.min(3, { error: '…' })`           | fonctionne, mais déprécié           |
| `z.string().email()`, `.uuid()`, `.url()`           | `z.email()`, `z.uuid()`, `z.url()`  | fonctionne, mais déprécié           |
| `z.string().date()`, `.datetime()`                  | `z.iso.date()`, `z.iso.datetime()`  | fonctionne, mais déprécié           |
| `error.flatten()`, `error.format()`                 | `z.flattenError(…)`, `z.treeifyError(…)` | fonctionne, mais déprécié      |
| `.passthrough()`                                    | `z.looseObject({ … })`              | fonctionne, mais déprécié           |
| `a.merge(b)`                                        | `a.extend(b.shape)`                 | fonctionne, mais déprécié           |

Une écriture dépréciée fonctionne encore, mais elle est signalée (texte barré) par ton éditeur
et pourra disparaître. Quand une IA te propose du Zod, vérifie la version installée et
corrige ces écritures.

## Pièges courants

- **Valider puis utiliser l’objet d’origine** : les transformations et le nettoyage sont dans
  `result.data`, pas dans `req.body`.
- **Écrire le type à la main à côté du schéma** : les deux finiront par diverger. Déduis-le avec
  `z.infer`.
- **`z.number()` pour un paramètre de requête** : il reçoit une chaîne et refuse tout. Utilise
  `z.coerce.number()`, avec des bornes.
- **`z.coerce.boolean()` pour du texte** : `'false'` devient `true`. Utilise `z.stringbool()`.
- **Oublier `min(1)` après une coercition numérique** : la chaîne vide devient `0` en silence.
- **Une règle métier dépendant des données stockées dans un schéma** : un schéma valide la
  donnée seule.
- **Copier du Zod 3** : `required_error`, `.errors`, `message`…

## Exercices

### Exercice 1 — Le schéma d’une salle

Écris `createRoomSchema` pour créer une salle : un nom de 2 à 40 caractères (espaces autour
retirés), une capacité entière de 1 à 50, une liste d’équipements parmi `screen`, `video` et
`whiteboard`, vide par défaut. Les propriétés inconnues sont refusées. Déduis le type
`CreateRoomInput`, écris `summary(room: CreateRoomInput): string`, et teste ces trois entrées :

```ts
const inputs: unknown[] = [
  { name: ' Atlas ', capacity: 12, equipment: ['screen', 'video'] },
  { name: 'Cap', capacity: 6 },
  { name: 'B', capacity: 0, equipment: ['projector'], floor: 2 },
];
```

:::solution
```ts
// src/rooms.ts
import { z } from 'zod';

const createRoomSchema = z.strictObject({
  name: z.string().trim().min(2).max(40),
  capacity: z.number().int().min(1).max(50),
  equipment: z.array(z.enum(['screen', 'video', 'whiteboard'])).default([]),
});

type CreateRoomInput = z.infer<typeof createRoomSchema>;

function summary(room: CreateRoomInput): string {
  const equipment = room.equipment.length > 0 ? room.equipment.join(', ') : 'aucun équipement';
  return `${room.name} : ${room.capacity} places, ${equipment}`;
}

const inputs: unknown[] = [
  { name: ' Atlas ', capacity: 12, equipment: ['screen', 'video'] },
  { name: 'Cap', capacity: 6 },
  { name: 'B', capacity: 0, equipment: ['projector'], floor: 2 },
];

for (const input of inputs) {
  const result = createRoomSchema.safeParse(input);
  if (result.success) {
    console.log(summary(result.data));
  } else {
    console.log(z.prettifyError(result.error));
  }
}
```

```text
Atlas : 12 places, screen, video
Cap : 6 places, aucun équipement
✖ Unrecognized key: "floor"
✖ Too small: expected string to have >=2 characters
  → at name
✖ Too small: expected number to be >=1
  → at capacity
✖ Invalid option: expected one of "screen"|"video"|"whiteboard"
  → at equipment[0]
```

- `z.strictObject` refuse `floor` ; `.default([])` fournit une liste vide à `Cap`.
- Dans `summary`, `room.equipment` est toujours un tableau : `z.infer` donne le type de
  **sortie**, où le défaut a été appliqué. Avec `z.input`, il serait optionnel.
- Le chemin `equipment[0]` désigne le premier élément du tableau.
:::

### Exercice 2 — Les paramètres d’une recherche par période

Écris `periodQuerySchema` pour des paramètres de requête `from` et `to` (dates ISO
obligatoires) et `page` (entier à partir de 1, 1 par défaut, reçu en texte). La date de fin ne
doit pas précéder la date de début ; l’erreur doit porter sur `to`. Teste avec :

```ts
const queries: unknown[] = [
  { from: '2026-12-01', to: '2026-12-07' },
  { from: '2026-12-01', to: '2026-12-07', page: '3' },
  { from: '2026-12-07', to: '2026-12-01', page: '2' },
  { from: '2026-12-01', page: 'deux' },
];
```

:::solution
```ts
// src/period-query.ts
import { z } from 'zod';

const periodQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine((query) => query.from <= query.to, {
    error: 'La date de fin doit suivre la date de début',
    path: ['to'],
  });

type PeriodQuery = z.infer<typeof periodQuerySchema>;

const queries: unknown[] = [
  { from: '2026-12-01', to: '2026-12-07' },
  { from: '2026-12-01', to: '2026-12-07', page: '3' },
  { from: '2026-12-07', to: '2026-12-01', page: '2' },
  { from: '2026-12-01', page: 'deux' },
];

for (const query of queries) {
  const result = periodQuerySchema.safeParse(query);
  if (result.success) {
    const period: PeriodQuery = result.data;
    console.log(period);
  } else {
    console.log(result.error.issues.map((issue) => `${issue.path.join('.')} : ${issue.message}`));
  }
}
```

```text
{ from: '2026-12-01', to: '2026-12-07', page: 1 }
{ from: '2026-12-01', to: '2026-12-07', page: 3 }
[ 'to : La date de fin doit suivre la date de début' ]
[
  'to : Invalid input: expected string, received undefined',
  'page : Invalid input: expected number, received NaN'
]
```

- Comparer deux dates au format `AAAA-MM-JJ` avec `<=` fonctionne, car l’ordre alphabétique de
  ce format est l’ordre chronologique. La comparaison n’a de sens qu’une fois les deux formats
  validés, ce que garantit `refine`.
- Dans le dernier cas, la règle de `refine` n’est pas évaluée : la forme de l’objet est déjà
  invalide.
- `page` est un `number` dans `PeriodQuery`, alors qu’il arrive en texte.
:::

### Exercice 3 — Relire du Zod proposé par une IA

Une IA a proposé ce module pour lire des filtres de recherche reçus dans `req.query`. Trouve
tous les défauts, ceux que `tsc` signale et ceux qu’il ne peut pas voir, puis corrige.

```ts
// src/filters.ts
import { z } from 'zod';

const filtersSchema = z.object({
  room: z.string({ required_error: 'Salle obligatoire' }),
  onlyMine: z.coerce.boolean(),
  limit: z.number().int().max(50).optional(),
});

const createBookingSchema = z.object({
  room: z.string(),
  title: z.string().min(3),
});

type Filters = z.infer<typeof createBookingSchema>;

export function readFilters(query: unknown): Filters {
  const result = filtersSchema.safeParse(query);
  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }
  return result.data as Filters;
}
```

:::solution
`npx tsc --noEmit` signale trois erreurs :

```text
src/filters.ts(5,20): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'required_error' does not exist in type '$ZodStringParams'.
src/filters.ts(20,34): error TS2339: Property 'errors' does not exist on type 'ZodError<{ room: string; onlyMine: boolean; limit?: number | undefined; }>'.
src/filters.ts(22,10): error TS2352: Conversion of type '{ room: string; onlyMine: boolean; limit?: number | undefined; }' to type '{ room: string; title: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'title' is missing in type '{ room: string; onlyMine: boolean; limit?: number | undefined; }' but required in type '{ room: string; title: string; }'.
```

1. `required_error` est une option de Zod 3 : en Zod 4, c’est `error`.
2. `error.errors` n’existe plus : c’est `error.issues`. Avec `noUncheckedIndexedAccess`, il faut
   aussi `issues[0]?.message`.
3. `Filters` est déduit du **mauvais schéma** (`createBookingSchema`), et le `as` tentait de
   masquer l’incohérence. Ici, les types sont si différents que `tsc` proteste quand même ;
   avec deux schémas proches, le `as` serait passé sans bruit. Il faut déduire le type du schéma
   réellement utilisé et supprimer le `as`.

Une fois ces erreurs corrigées, `tsc` ne dit plus rien, mais deux défauts restent, visibles
seulement à l’exécution :

4. `z.coerce.boolean()` transforme `'false'` en `true` : utiliser `z.stringbool()`, avec
   `.default(false)` si le filtre est facultatif.
5. `z.number()` refuse `'10'`, alors qu’un paramètre de requête est **toujours** une chaîne :
   utiliser `z.coerce.number()`, avec `min(1)` pour rejeter la chaîne vide.

```ts
// src/filters.ts (corrigé)
import { z } from 'zod';

const filtersSchema = z.object({
  room: z.string({ error: 'Salle obligatoire' }),
  onlyMine: z.stringbool().default(false),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

type Filters = z.infer<typeof filtersSchema>;

export function readFilters(query: unknown): Filters {
  const result = filtersSchema.safeParse(query);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }
  return result.data;
}

console.log(readFilters({ room: 'cap', onlyMine: 'false' }));
console.log(readFilters({ room: 'cap', onlyMine: 'true', limit: '10' }));
console.log(readFilters({ room: 'cap' }));
```

```text
{ room: 'cap', onlyMine: false }
{ room: 'cap', onlyMine: true, limit: 10 }
{ room: 'cap', onlyMine: false }
```

`createBookingSchema`, inutile ici, a disparu avec le type qu’on en déduisait à tort.
:::

## Récapitulatif

- Un schéma Zod décrit une donnée attendue ; `safeParse` la vérifie à l’exécution et renvoie
  `{ success: true, data }` ou `{ success: false, error }`. `parse` lève une `ZodError`.
- La valeur validée est une **nouvelle** valeur : nettoyée, transformée, débarrassée des
  propriétés inconnues avec `z.object`. `z.strictObject` les refuse.
- `error.issues` donne `code`, `path` et `message` de chaque problème ; `z.prettifyError` et
  `z.flattenError` les mettent en forme ; l’option `error` personnalise les messages.
- `z.infer` (alias de `z.output`) déduit le type des données validées ; `z.input` celui des
  données acceptées en entrée. Plus besoin d’écrire le type à la main.
- `.transform`, `.pipe`, `.default` et `z.coerce.number()` convertissent les valeurs reçues en
  texte ; pour les booléens, `z.stringbool()`.
- `.refine` exprime une règle qui porte sur plusieurs champs ; elle ne s’exécute que si la forme
  est valide.
- La configuration lue dans `process.env` se valide comme toute entrée externe.
- Le code Zod 3 (`required_error`, `.errors`, `message`…) se reconnaît et se corrige.
