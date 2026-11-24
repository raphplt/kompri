---
title: Partager les contrats et valider dans Express
summary: Regrouper schémas et types déduits dans un module de contrats importé partout, écrire un middleware de validation réutilisable et répondre 400 proprement, sans jamais dupliquer une définition.
durationMinutes: 75
sources:
  - title: Zod — Définir des schémas (API)
    url: https://zod.dev/api
  - title: Express — Écrire et utiliser des middlewares
    url: https://expressjs.com/en/guide/using-middleware.html
  - title: TypeScript — Modules
    url: https://www.typescriptlang.org/docs/handbook/2/modules.html
  - title: Node.js — Modules TypeScript (import type)
    url: https://nodejs.org/api/typescript.html
---

## Le problème : deux définitions finissent toujours par diverger

À la fin de la leçon 2, le projet avait des types écrits à la main dans `src/types.ts`. La
leçon 3 a montré comment écrire des schémas. Si tu gardes les deux, tu décris chaque donnée
**deux fois**, et le jour où quelqu’un n’en modifie qu’une, le code ment. Exemple, dans un
fichier d’essai à supprimer ensuite :

```ts
// src/divergence.ts
import { z } from 'zod';

// Écrit à la main… et complété la semaine dernière
type CreateBookingInput = {
  room: 'atlas' | 'balise' | 'cap';
  title: string;
  attendees: number;
};

// Le schéma, lui, n'a pas été mis à jour
const createBookingSchema = z.strictObject({
  room: z.enum(['atlas', 'balise', 'cap']),
  title: z.string().trim().min(3),
});

const input = createBookingSchema.parse({ room: 'cap', title: 'Rétro' }) as CreateBookingInput;
console.log(`${input.title} : ${input.attendees} participants`);

const result = createBookingSchema.safeParse({ room: 'cap', title: 'Rétro', attendees: 6 });
console.log(result.error?.issues[0]?.message);
```

```text
Rétro : undefined participants
Unrecognized key: "attendees"
```

`tsc` ne signale rien : le `as` relie les deux définitions par une simple affirmation. Le code
lit un `attendees` qui n’existe jamais, et un client qui l’envoie est refusé. Le remède tient en
une règle : **le schéma est la seule source de vérité, les types en sont déduits**, et tous les
modules importent les mêmes définitions depuis un endroit unique.

Cette leçon réorganise `bookings-api` autour de ce principe. Supprime `src/types.ts` : tout ce
qu’il contenait va être remplacé.

## Le module de contrats

Un **contrat** décrit ce que l’API accepte et ce qu’elle renvoie. Regroupe tous ceux des
réservations dans un module dédié :

```ts
// src/contracts/bookings.ts
// Contrats de l'API : schémas Zod et types déduits, seule source de vérité.
import { z } from 'zod';

export const ROOMS = ['atlas', 'balise', 'cap'] as const;
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 20;

const bookingFields = {
  room: z.enum(ROOMS),
  title: z.string().trim().min(3).max(80),
  date: z.iso.date(),
  startHour: z.number().int().min(OPENING_HOUR).max(CLOSING_HOUR - 1),
  durationHours: z.number().int().min(1).max(4),
};

// Corps attendu pour POST /api/bookings
export const createBookingSchema = z
  .strictObject(bookingFields)
  .refine((input) => input.startHour + input.durationHours <= CLOSING_HOUR, {
    error: `La réservation doit se terminer à ${CLOSING_HOUR} h au plus tard`,
    path: ['durationHours'],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Une réservation enregistrée, telle que l'API la renvoie
export const bookingSchema = z.object({ id: z.number().int().positive(), ...bookingFields });
export type Booking = z.infer<typeof bookingSchema>;

// Paramètres de requête de GET /api/bookings
export const listBookingsQuerySchema = z.object({
  room: z.enum(ROOMS).optional(),
  date: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

// Paramètre de route :id
export const bookingIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Corps de toutes les réponses d'erreur
const apiIssueSchema = z.object({ path: z.string(), message: z.string() });
export type ApiIssue = z.infer<typeof apiIssueSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  issues: z.array(apiIssueSchema).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
```

Chaque choix a une raison :

- **`ROOMS` avec `as const`** : le tableau devient `readonly ['atlas', 'balise', 'cap']`, et
  `z.enum(ROOMS)` en déduit l’union `'atlas' | 'balise' | 'cap'`. La liste existe une seule
  fois, pour la validation, pour le type et pour qui veut l’afficher.
- **`bookingFields`**, un simple objet de schémas, est partagé par la création et la réponse.
  On ne dérive pas `bookingSchema` de `createBookingSchema`, car ce dernier porte un `refine` :
  Zod 4 refuse alors `.pick()` et `.partial()` (`Error: .pick() cannot be used on object
  schemas containing refinements`). Partager les champs évite le problème.
- **`createBookingSchema`** est strict : l’`id`, `admin` ou une faute de frappe sont refusés.
- **`bookingSchema`** décrit ce que l’API **renvoie**. Il ne sert pas à valider une requête,
  mais à typer les réponses et, dans la leçon 5, à vérifier dans les tests que l’API respecte
  son contrat.
- **`listBookingsQuerySchema`** utilise `z.object` : un paramètre de requête inconnu (ajouté par
  un outil de cache, par exemple) est ignoré. `limit` est converti et borné.
- **`bookingIdParamsSchema`** convertit `:id`, qui arrive en chaîne. `z.coerce.number()`
  accepte aussi `'1e1'` ; l’expression régulière de la leçon 3 serait plus stricte. C’est un
  choix assumé ici : un identifiant mal écrit mène au pire à une 404.
- **`apiErrorSchema`** fixe la forme de **toutes** les erreurs : `{ error, issues? }`.

Ce module n’importe **que Zod**. Ni Express, ni le stockage : il décrit des données, rien de
plus. N’importe quel module peut donc l’importer sans entraîner le serveur avec lui : les
routes, les règles métier, les tests, et demain une interface web qui enverrait les mêmes
requêtes.

## Importer des valeurs et des types

Un module de contrats exporte deux sortes de choses :

- des **valeurs**, qui existent à l’exécution : les schémas, `ROOMS`, `CLOSING_HOUR` ;
- des **types**, effacés à l’exécution : `Booking`, `CreateBookingInput`, `ApiError`…

Avec `verbatimModuleSyntax`, chaque import dit ce qu’il importe :

```ts
import { createBookingSchema } from '../contracts/bookings.ts'; // une valeur
import type { Booking, CreateBookingInput } from '../contracts/bookings.ts'; // des types
```

Si tu importes un type comme une valeur, `tsc` et Node.js protestent chacun à sa façon :

```text
src/bookings/rules.ts(3,10): error TS1484: 'Booking' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
src/bookings/rules.ts(3,19): error TS1484: 'CreateBookingInput' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

```text
SyntaxError: The requested module '../contracts/bookings.ts' does not provide an export named 'Booking'
```

Tu peux aussi mélanger dans une seule ligne : `import { bookingSchema, type Booking } from …`.
Nuance : avec cette forme, l’import est conservé même s’il ne reste que des types (`tsc`
produit alors `import {} from './…'` et le module est chargé), alors qu’une ligne
`import type` disparaît entièrement. Ce cours garde deux lignes séparées : on voit d’un coup
d’œil ce qui existe à l’exécution.

## Les règles métier et le stockage

Une règle comme « deux réservations ne se chevauchent pas » ne dépend ni d’HTTP ni de la façon
de stocker les données. On l’isole dans un module **pur** : des fonctions qui ne lisent que
leurs arguments et ne modifient rien. C’est le code le plus facile à tester.

```ts
// src/bookings/rules.ts
// Règles métier pures : aucune dépendance à Express ni au stockage.
import type { Booking, CreateBookingInput } from '../contracts/bookings.ts';

type Slot = Pick<Booking, 'room' | 'date' | 'startHour' | 'durationHours'>;

export function endHour(slot: Slot): number {
  return slot.startHour + slot.durationHours;
}

export function overlaps(a: Slot, b: Slot): boolean {
  return (
    a.room === b.room &&
    a.date === b.date &&
    a.startHour < endHour(b) &&
    b.startHour < endHour(a)
  );
}

export function findConflict(
  existing: readonly Booking[],
  candidate: CreateBookingInput,
): Booking | undefined {
  return existing.find((booking) => overlaps(booking, candidate));
}
```

`Slot` est **dérivé** de `Booking` avec `Pick` : ce sont les quatre propriétés dont les
fonctions ont besoin. Une réservation enregistrée (`Booking`) comme une demande de création
(`CreateBookingInput`) les possèdent, donc `overlaps` accepte les deux. Deux créneaux se
chevauchent si chacun commence avant la fin de l’autre : 9 h-11 h et 11 h-12 h ne se
chevauchent pas.

Le stockage reste en mémoire, mais derrière un type qui décrit ce qu’il sait faire :

```ts
// src/bookings/store.ts
// Stockage en mémoire : les données disparaissent à chaque redémarrage.
import type { Booking, CreateBookingInput, ListBookingsQuery } from '../contracts/bookings.ts';

export type BookingStore = {
  all(): Booking[];
  list(filters: ListBookingsQuery): Booking[];
  get(id: number): Booking | undefined;
  add(input: CreateBookingInput): Booking;
  remove(id: number): boolean;
};

export function createBookingStore(initial: readonly Booking[] = []): BookingStore {
  const bookings: Booking[] = initial.map((booking) => ({ ...booking }));
  let nextId = Math.max(0, ...bookings.map((booking) => booking.id)) + 1;

  return {
    all() {
      return [...bookings];
    },
    list({ room, date, limit }) {
      return bookings
        .filter((booking) => room === undefined || booking.room === room)
        .filter((booking) => date === undefined || booking.date === date)
        .slice(0, limit);
    },
    get(id) {
      return bookings.find((booking) => booking.id === id);
    },
    add(input) {
      const booking: Booking = { ...input, id: nextId };
      nextId += 1;
      bookings.push(booking);
      return booking;
    },
    remove(id) {
      const index = bookings.findIndex((booking) => booking.id === id);
      if (index === -1) {
        return false;
      }
      bookings.splice(index, 1);
      return true;
    },
  };
}
```

- `createBookingStore` est une **fabrique** : chaque appel crée un stockage indépendant. Les
  tests de la leçon 5 en créeront un neuf pour chaque test.
- Les méthodes de l’objet renvoyé ne sont pas annotées : TypeScript leur applique le type
  `BookingStore` déclaré comme retour (typage contextuel). `list` reçoit des filtres déjà
  validés : `limit` est un `number`, jamais une chaîne.
- Dans `add`, l’`id` est placé **après** la décomposition : même si une entrée contenait un
  `id`, celui du serveur l’emporterait. Avec un schéma strict, c’est une seconde ligne de
  défense, pas la première.

## Valider dans Express

### Une erreur de validation qui porte ses détails

```ts
// src/http/errors.ts
import type { z } from 'zod';
import type { ApiIssue } from '../contracts/bookings.ts';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class ValidationError extends HttpError {
  readonly issues: ApiIssue[];

  constructor(error: z.ZodError) {
    super(400, 'Requête invalide');
    this.name = 'ValidationError';
    this.issues = error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));
  }
}
```

`ValidationError` **hérite** de `HttpError` : c’est une erreur HTTP 400, avec en plus la liste
des problèmes, convertie dans la forme publique `ApiIssue` (le chemin `['title']` devient
`'title'`). `import type { z }` suffit : `z` n’est utilisé que dans un type, `z.ZodError`.

### Deux outils : `parseInput` et `validateBody`

```ts
// src/http/validation.ts
import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from './errors.ts';

// Valide une valeur quelconque ; lève une ValidationError (400) si elle est invalide.
export function parseInput<Schema extends z.ZodType>(schema: Schema, value: unknown): z.output<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

// Middleware : valide req.body et le remplace par la donnée validée et transformée.
export function validateBody<Schema extends z.ZodType>(
  schema: Schema,
): RequestHandler<Record<string, string>, unknown, z.output<Schema>> {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}
```

Ces deux fonctions sont **génériques** :

- `Schema extends z.ZodType` : le paramètre de type accepte n’importe quel schéma Zod, et
  **retient lequel** a été passé.
- `z.output<Schema>` : le type des données validées **par ce schéma-là**. Appelée avec
  `listBookingsQuerySchema`, `parseInput` renvoie un `ListBookingsQuery` ; avec
  `bookingIdParamsSchema`, un `{ id: number }`. Aucune annotation à écrire à l’appel.

`validateBody` est une **fabrique de middleware**, comme celles de la compétence Express : elle
reçoit un schéma et renvoie un middleware. Son type de retour,
`RequestHandler<Record<string, string>, unknown, z.output<Schema>>`, annonce que **la suite de
la chaîne** verra un `req.body` du type de sortie du schéma. Et c’est vrai : le middleware
remplace `req.body` par `result.data`, la valeur validée, nettoyée et transformée. Le type de
`req.body` n’est plus un espoir, il découle de la validation.

En cas d’échec, le middleware ne répond pas lui-même : il appelle `next(erreur)`. Toutes les
réponses d’erreur restent produites par **un seul** gestionnaire.

### Pourquoi pas un middleware pour `req.query` ?

L’idée naturelle serait un `validateQuery` symétrique, qui remplacerait `req.query`. Essaie ce
middleware, placé avant le gestionnaire de `GET /` (on retire `limit`, un nombre, que le type
de `req.query` refuserait) :

```ts
(req, res, next) => {
  req.query = parseInput(listBookingsQuerySchema.omit({ limit: true }), req.query);
  next();
},
```

`tsc` l’accepte, car les types d’Express déclarent `query` comme une propriété ordinaire. Mais
une requête `GET /api/bookings?room=cap` reçoit une 500, et le serveur affiche :

```text
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

En Express 5, `req.query` est un **accesseur en lecture seule**, recalculé à chaque lecture
(la compétence Express l’a signalé). Les types ne le disent pas : encore un cas où ils sont plus
permissifs que la réalité. Pour la requête et les paramètres de route, on appelle donc
`parseInput` **dans** le gestionnaire, et on garde le résultat dans une variable.

### Le gestionnaire d’erreurs et l’assemblage

Deux changements dans `src/http/error-handler.ts` : `ApiError` vient maintenant des contrats, et
une branche répond aux erreurs de validation.

```diff
 // src/http/error-handler.ts
 import type { NextFunction, Request, Response } from 'express';
-import type { ApiError } from '../types.ts';
-import { HttpError } from './errors.ts';
+import type { ApiError } from '../contracts/bookings.ts';
+import { HttpError, ValidationError } from './errors.ts';
 
@@
     next(err);
     return;
   }
+  if (err instanceof ValidationError) {
+    res.status(400).json({ error: err.message, issues: err.issues });
+    return;
+  }
   if (err instanceof HttpError) {
     res.status(err.status).json({ error: err.message });
     return;
```

L’ordre compte : une `ValidationError` est aussi une `HttpError`. Testée en second, elle serait
traitée par la branche `HttpError`, sans ses détails.

L’application reçoit maintenant son stockage en paramètre, avec une valeur par défaut :

```diff
 // src/app.ts
 import express from 'express';
 import type { Express } from 'express';
+import { createBookingStore } from './bookings/store.ts';
+import type { BookingStore } from './bookings/store.ts';
 import { errorHandler, notFound } from './http/error-handler.ts';
-import { bookingsRouter } from './routes/bookings.ts';
+import { createBookingsRouter } from './routes/bookings.ts';
 
-export function createApp(): Express {
+export function createApp(store: BookingStore = createBookingStore()): Express {
   const app = express();
   app.use(express.json());
 
   app.get('/api/health', (req, res) => {
     res.json({ status: 'ok' });
   });
-  app.use('/api/bookings', bookingsRouter);
+  app.use('/api/bookings', createBookingsRouter(store));
```

Et `server.ts` crée le stockage avec une réservation de départ :

```ts
// src/server.ts
import { createApp } from './app.ts';
import { createBookingStore } from './bookings/store.ts';
import { config } from './config.ts';

const store = createBookingStore([
  { id: 1, room: 'atlas', title: 'Point hebdo', date: '2026-12-01', startHour: 9, durationHours: 1 },
]);
const app = createApp(store);

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Impossible d’écouter sur le port ${config.port} :`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`API (${config.env}) prête sur http://localhost:${config.port}`);
});
```

`config` est la version validée par Zod de la leçon 3.

### Les routes

```ts
// src/routes/bookings.ts
import { Router } from 'express';
import type { Response } from 'express';
import type { BookingStore } from '../bookings/store.ts';
import { findConflict } from '../bookings/rules.ts';
import {
  bookingIdParamsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
} from '../contracts/bookings.ts';
import type { ApiError, Booking } from '../contracts/bookings.ts';
import { HttpError } from '../http/errors.ts';
import { parseInput, validateBody } from '../http/validation.ts';

export function createBookingsRouter(store: BookingStore): Router {
  const router = Router();

  router.get('/', (req, res: Response<Booking[]>) => {
    const filters = parseInput(listBookingsQuerySchema, req.query);
    res.json(store.list(filters));
  });

  router.get('/:id', (req, res: Response<Booking>) => {
    const { id } = parseInput(bookingIdParamsSchema, req.params);
    const booking = store.get(id);
    if (booking === undefined) {
      throw new HttpError(404, `Réservation ${id} introuvable`);
    }
    res.json(booking);
  });

  router.post('/', validateBody(createBookingSchema), (req, res: Response<Booking | ApiError>) => {
    const conflict = findConflict(store.all(), req.body);
    if (conflict !== undefined) {
      throw new HttpError(409, `Créneau déjà réservé (réservation ${conflict.id})`);
    }
    const booking = store.add(req.body);
    res.status(201).location(`/api/bookings/${booking.id}`).json(booking);
  });

  router.delete('/:id', (req, res) => {
    const { id } = parseInput(bookingIdParamsSchema, req.params);
    if (!store.remove(id)) {
      throw new HttpError(404, `Réservation ${id} introuvable`);
    }
    res.sendStatus(204);
  });

  return router;
}
```

- **Plus aucune annotation sur `req`** : le type de `req.body` vient du schéma passé à
  `validateBody`, celui de `filters` et de `id` de `parseInput`.
- La route `POST` enchaîne deux contrôles de nature différente : la **forme** de la donnée
  (le schéma, dans le middleware) puis une **règle d’état** (le chevauchement, dans le
  gestionnaire), qui répond `409 Conflict`.
- Le routeur est créé par une fonction qui reçoit le stockage : aucune variable globale, donc
  une application par test sera possible.

Et la preuve que le lien est vérifié : remplace par erreur `validateBody(createBookingSchema)`
par `validateBody(listBookingsQuerySchema)`. `tsc` refuse aussitôt :

```text
src/routes/bookings.ts(33,48): error TS2739: Type '{ room?: "atlas" | "balise" | "cap" | undefined; date?: string | undefined; limit: number; }' is missing the following properties from type '{ room: "atlas" | "balise" | "cap"; title: string; date: string; startHour: number; durationHours: number; }': title, startHour, durationHours
src/routes/bookings.ts(37,31): error TS2739: Type '{ room?: "atlas" | "balise" | "cap" | undefined; date?: string | undefined; limit: number; }' is missing the following properties from type '{ room: "atlas" | "balise" | "cap"; title: string; date: string; startHour: number; durationHours: number; }': title, startHour, durationHours
```

Avec une annotation écrite à la main, `Request<{}, …, CreateBookingInput>`, cette erreur serait
passée inaperçue : l’annotation aurait affirmé le bon type quel que soit le schéma réellement
appliqué.

## Vérifier de bout en bout

`npm run typecheck` ne signale rien. Lance `npm run dev` et rejoue les requêtes de la leçon 2 :

```bash
B=http://localhost:3000/api/bookings
curl -s "$B?room=atlas&limit=5"
curl -s "$B?limit=abc&room=salle-99"
curl -s $B/abc
curl -s -i --json '{"room":"cap","title":"  Rétro  ","date":"2026-12-02","startHour":14,"durationHours":2}' $B
curl -s --json '{"room":"salle-99","title":42,"startHour":"neuf","admin":true}' $B
curl -s --json '{"id":1,"room":"cap","title":"Doublon","date":"2026-12-03","startHour":10,"durationHours":1}' $B
curl -s --json '{"room":"cap","title":"Tard","date":"2026-12-03","startHour":18,"durationHours":3}' $B
curl -s --json '{"room":"cap","title":"Chevauche","date":"2026-12-02","startHour":15,"durationHours":1}' $B
curl -s -X POST $B
```

Résultats (pour le `-i`, seules les lignes utiles sont reproduites) :

```text
[{"id":1,"room":"atlas","title":"Point hebdo","date":"2026-12-01","startHour":9,"durationHours":1}]
{"error":"Requête invalide","issues":[{"path":"room","message":"Invalid option: expected one of \"atlas\"|\"balise\"|\"cap\""},{"path":"limit","message":"Invalid input: expected number, received NaN"}]}
{"error":"Requête invalide","issues":[{"path":"id","message":"Invalid input: expected number, received NaN"}]}
HTTP/1.1 201 Created
Location: /api/bookings/2
{"room":"cap","title":"Rétro","date":"2026-12-02","startHour":14,"durationHours":2,"id":2}
{"error":"Requête invalide","issues":[{"path":"room","message":"Invalid option: expected one of \"atlas\"|\"balise\"|\"cap\""},{"path":"title","message":"Invalid input: expected string, received number"},{"path":"date","message":"Invalid input: expected string, received undefined"},{"path":"startHour","message":"Invalid input: expected number, received string"},{"path":"durationHours","message":"Invalid input: expected number, received undefined"},{"path":"","message":"Unrecognized key: \"admin\""}]}
{"error":"Requête invalide","issues":[{"path":"","message":"Unrecognized key: \"id\""}]}
{"error":"Requête invalide","issues":[{"path":"durationHours","message":"La réservation doit se terminer à 20 h au plus tard"}]}
{"error":"Créneau déjà réservé (réservation 2)"}
{"error":"Requête invalide","issues":[{"path":"","message":"Invalid input: expected object, received undefined"}]}
```

Chaque requête invalide de la leçon 2 reçoit maintenant une **400** qui explique tous les
problèmes à la fois. Le titre de la réservation créée a été nettoyé, l’`id` imposé est refusé,
et le chevauchement produit une 409. Un `DELETE` sur `/api/bookings/2` répond 204, puis 404 au
second essai.

## Pièges courants

- **Garder des types écrits à la main à côté des schémas** : ils divergent. Exporte
  `z.infer<typeof schéma>` depuis le module de contrats.
- **Déduire un type du mauvais schéma** : `z.infer<typeof createBookingSchema>` pour la
  réponse, alors que la réponse contient un `id`. Un schéma par contrat, un type par schéma.
- **Annoter `Request<…, CreateBookingInput>` après un middleware de validation** : l’annotation
  peut contredire le schéma appliqué sans que `tsc` le voie. Laisse le type venir du middleware.
- **Valider puis utiliser `req.query`** au lieu du résultat de `parseInput` : les conversions et
  valeurs par défaut sont perdues (`limit` redevient une chaîne, ou `undefined`).
- **Affecter `req.query` en Express 5** : `TypeError` à l’exécution, malgré `tsc`.
- **Faire dépendre le module de contrats d’Express** : il ne pourrait plus être importé ailleurs
  sans entraîner le serveur.
- **Tester `HttpError` avant `ValidationError`** dans le gestionnaire d’erreurs : les détails
  disparaissent.
- **Dériver un schéma de modification avec `.partial()` d’un schéma qui contient des
  `.default()`** : la valeur par défaut s’applique encore. Avec
  `priority: z.enum(['low', 'normal', 'high']).default('normal')`, le schéma partiel transforme
  `{}` en `{ priority: 'normal' }` : chaque modification partielle remettrait la priorité à
  `'normal'`. Construis le schéma de modification à partir de champs **sans** valeur par
  défaut, comme `bookingFields`.

## Exercices

### Exercice 1 — Ajouter un champ en suivant `tsc`

Ajoute aux réservations un nombre de participants `attendees`, entier de 1 à 20, obligatoire à
la création. Modifie **uniquement** le module de contrats, puis lance `npm run typecheck`.
Quels fichiers `tsc` te demande-t-il de modifier ? Pourquoi les routes, le stockage et les
règles n’ont-ils pas besoin de changer ?

:::solution
Dans `bookingFields`, ajoute une ligne :

```ts
  attendees: z.number().int().min(1).max(20),
```

`npm run typecheck` signale un seul fichier :

```text
src/server.ts(7,3): error TS2741: Property 'attendees' is missing in type '{ id: number; room: "atlas"; title: string; date: string; startHour: number; durationHours: number; }' but required in type '{ room: "atlas" | "balise" | "cap"; title: string; date: string; startHour: number; durationHours: number; attendees: number; id: number; }'.
```

La réservation de départ n’a pas de participants : ajoute `attendees: 4`. Les autres modules
n’ont pas besoin de changer, car ils ne recopient aucune définition : `Booking` et
`CreateBookingInput` sont déduits des schémas, le stockage copie l’entrée entière, et les
règles ne lisent que les quatre propriétés de `Slot`. Le nouveau champ est validé dès la
création (`bookingFields` alimente `createBookingSchema`) et apparaît dans les réponses. Une
requête `POST` sans `attendees` reçoit une 400 qui le signale. Avec des types écrits à la main,
il aurait fallu modifier au moins deux définitions, sans aucune alerte en cas d’oubli.
:::

### Exercice 2 — Renommer une réservation

Ajoute une route `PATCH /api/bookings/:id` qui ne modifie que le titre. Le corps accepte
uniquement `{ "title": "…" }`, avec les mêmes règles que le titre d’une réservation. Elle
répond la réservation modifiée, ou 404. Ne recopie pas les règles du titre : réutilise le
schéma existant. Vérifie avec ces quatre requêtes :

```bash
curl -s -X PATCH --json '{"title":"  Point mensuel "}' $B/1
curl -s -X PATCH --json '{"title":"Point","room":"cap"}' $B/1
curl -s -X PATCH --json '{"title":"Point"}' $B/42
curl -s -X PATCH --json '{"title":"Point"}' $B/abc
```

:::solution
Dans le module de contrats, le titre se réutilise par la propriété `shape` de `bookingSchema`,
qui donne accès aux schémas de chaque champ :

```ts
// Corps attendu pour PATCH /api/bookings/:id
export const renameBookingSchema = z.strictObject({ title: bookingSchema.shape.title });
```

Dans le stockage, une méthode de plus, déclarée dans le type puis implémentée :

```ts
  rename(id: number, title: string): Booking | undefined;
```

```ts
    rename(id, title) {
      const booking = bookings.find((item) => item.id === id);
      if (booking !== undefined) {
        booking.title = title;
      }
      return booking;
    },
```

Dans le routeur (avec `renameBookingSchema` ajouté à l’import des schémas) :

```ts
  router.patch('/:id', validateBody(renameBookingSchema), (req, res: Response<Booking>) => {
    const { id } = parseInput(bookingIdParamsSchema, req.params);
    const booking = store.rename(id, req.body.title);
    if (booking === undefined) {
      throw new HttpError(404, `Réservation ${id} introuvable`);
    }
    res.json(booking);
  });
```

```text
{"id":1,"room":"atlas","title":"Point mensuel","date":"2026-12-01","startHour":9,"durationHours":1}
{"error":"Requête invalide","issues":[{"path":"","message":"Unrecognized key: \"room\""}]}
{"error":"Réservation 42 introuvable"}
{"error":"Requête invalide","issues":[{"path":"id","message":"Invalid input: expected number, received NaN"}]}
```

`req.body.title` est une `string` nettoyée : son type vient de `renameBookingSchema`. Le titre
garde les mêmes règles que partout ailleurs, puisque c’est le même schéma. Le schéma strict
empêche de changer la salle par cette route : sinon, on contournerait le contrôle des
chevauchements. Note l’ordre : le corps est validé par le middleware **avant** que le
gestionnaire ne valide `:id`.
:::

### Exercice 3 — Valeur ou type ?

Pour chaque nom importé depuis `src/contracts/bookings.ts`, indique s’il faut `import` ou
`import type`, puis ce qui se passe à l’exécution avec `node` si l’on se trompe dans chaque
sens : `ROOMS`, `Booking`, `bookingSchema`, `ListBookingsQuery`, `CLOSING_HOUR`, `ApiIssue`.

:::solution
- **Valeurs** (`import`) : `ROOMS`, `bookingSchema`, `CLOSING_HOUR`. Elles existent à
  l’exécution.
- **Types** (`import type`) : `Booking`, `ListBookingsQuery`, `ApiIssue`. Ils sont déclarés
  avec `export type` et effacés.

Importer un type avec `import` : `tsc` signale `TS1484`, et Node.js, qui conserve la ligne,
cherche une vraie valeur `Booking` dans le module : `SyntaxError: The requested module
'../contracts/bookings.ts' does not provide an export named 'Booking'`. Le programme ne
démarre pas.

Importer une valeur avec `import type` : la ligne est effacée, et l’usage de `bookingSchema`
comme valeur (par exemple `bookingSchema.parse(…)`) est une erreur de `tsc` (le nom ne peut pas
être utilisé comme valeur parce qu’il a été importé avec `import type`). Exécuté malgré tout,
le code lèverait une `ReferenceError` : la ligne d’import ayant été effacée, `bookingSchema`
n’est défini nulle part dans le fichier.

On peut en revanche utiliser `typeof bookingSchema` dans un **type** avec un `import type` :
c’est une position de type, effacée elle aussi.
:::

## Récapitulatif

- Un module de contrats regroupe les schémas Zod et les types déduits avec `z.infer` : une seule
  définition par donnée, importée par les routes, les règles, le stockage et les tests.
- Il n’importe que Zod, pour rester utilisable partout.
- Les champs communs se partagent dans un objet de schémas ; un schéma qui porte un `refine` ne
  se dérive plus avec `.pick()` ou `.partial()`.
- `import` pour les valeurs (schémas, constantes), `import type` pour les types :
  `verbatimModuleSyntax` et Node.js l’exigent.
- `parseInput(schéma, valeur)` valide n’importe quelle entrée et lève une `ValidationError` ;
  `validateBody(schéma)` valide le corps, le remplace par la donnée validée et **transmet son
  type** au gestionnaire suivant.
- En Express 5, `req.query` ne se remplace pas : on valide la requête et les paramètres dans le
  gestionnaire.
- Le gestionnaire d’erreurs centralisé répond `400 { error, issues }` à toute erreur de
  validation, avant de traiter les autres `HttpError`.
