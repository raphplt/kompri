---
title: Typer un serveur Express
summary: Profiter des types d’Express, préciser paramètres, corps, requête et réponse avec Request et Response, typer les erreurs, et comprendre ce que ces types ne garantissent pas.
durationMinutes: 65
sources:
  - title: Express 5 — Référence de l’API
    url: https://expressjs.com/en/5x/api.html
  - title: Express — Gestion des erreurs
    url: https://expressjs.com/en/guide/error-handling.html
  - title: OWASP — Mass Assignment Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
---

## Ce que TypeScript peut savoir d’une requête HTTP

Quand tu écris `app.post('/api/bookings', (req, res) => { … })`, TypeScript connaît la forme
générale de `req` et `res` grâce à `@types/express` : `req.method` est une chaîne, `res.status`
une fonction qui prend un nombre. Mais il ne peut pas deviner ce que **ton** API attend dans le
corps ni ce qu’elle renvoie : c’est à toi de le lui dire.

Il y a pourtant une limite que rien ne contourne : le corps d’une requête est écrit par
**n’importe qui**, sur Internet. Un type, effacé à l’exécution, ne peut pas garantir son
contenu. Cette leçon apprend à typer un serveur Express **et** à repérer précisément où les
types deviennent des promesses non tenues. La leçon suivante comblera ce trou.

On repart du projet `bookings-api` de la leçon 1. Pour l’instant, les types du domaine sont
écrits à la main dans un fichier dédié :

```ts
// src/types.ts
// Types écrits à la main pour l'instant : la leçon 4 les déduira de schémas.
export type Room = 'atlas' | 'balise' | 'cap';

export type Booking = {
  id: number;
  room: Room;
  title: string;
  date: string; // AAAA-MM-JJ
  startHour: number; // de 8 à 19
  durationHours: number; // de 1 à 4
};

export type CreateBookingInput = Omit<Booking, 'id'>;

export type ApiError = {
  error: string;
};
```

`Omit<Booking, 'id'>` est le type utilitaire vu dans la compétence précédente : une
réservation sans identifiant, celle que le client envoie pour en créer une.

## Ce que `@types/express` déduit tout seul

Écris ce fichier d’essai, sans aucune annotation sur `req` ni `res`, puis lance
`npx tsc --noEmit` :

```ts
// src/demo.ts
import express from 'express';

const app = express();

app.get('/api/rooms/:room/bookings/:id', (req, res) => {
  const id: number = req.params.id;
  console.log(req.params.room.toUpperCase(), req.params.date);
  res.json({ ok: true });
});

app.get('/api/bookings', (req, res) => {
  const limit = req.query.limit;
  console.log(limit.trim());
  res.json([]);
});

app.post('/api/bookings', (req, res) => {
  console.log(req.body.titel.toUpperCase());
  res.json(req.body);
});
```

```text
src/demo.ts(7,9): error TS2322: Type 'string' is not assignable to type 'number'.
src/demo.ts(8,57): error TS2339: Property 'date' does not exist on type '{ room: string; } & { id: string; }'.
src/demo.ts(14,15): error TS18048: 'limit' is possibly 'undefined'.
src/demo.ts(14,21): error TS2339: Property 'trim' does not exist on type 'string | (string | ParsedQs)[] | ParsedQs'.
  Property 'trim' does not exist on type '(string | ParsedQs)[]'.
```

Trois comportements très différents.

### Les paramètres de route sont déduits du chemin

`@types/express` lit la chaîne `'/api/rooms/:room/bookings/:id'` et en déduit que `req.params`
contient exactement `room` et `id`, de type `string`. Une faute de frappe (`req.params.date`) est
signalée, et l’erreur `TS2322` rappelle qu’un paramètre de route est **toujours une chaîne** :
`'42'`, pas `42`. Il faut le convertir, et contrôler la conversion.

Les segments optionnels d’Express 5 sont compris aussi : avec le chemin
`'/api/agenda{/:date}'`, `req.params.date` est de type `string | undefined`.

### `req.query` est typé… très largement

Le type de `req.query.limit` est `string | (string | ParsedQs)[] | ParsedQs | undefined` :
absent, une chaîne, un tableau (`?limit=5&limit=6`) ou un objet imbriqué. Ce type décrit tout
ce que peut produire l’analyseur `qs`, l’analyseur « étendu ». Express 5 utilise par défaut
l’analyseur « simple », qui ne produit que des chaînes et des tableaux de chaînes : le type est
donc plus large que la réalité. Il a le mérite de t’obliger à vérifier avant d’utiliser la
valeur, ce que tu feras proprement avec un schéma dans la leçon 4.

### `req.body` est `any`

Aucune erreur sur `req.body.titel.toUpperCase()` : la faute de frappe passe, et `req.body`
renvoyé tel quel aussi. Par défaut, `req.body` est de type `any`, le type qui désactive toute
vérification. C’est honnête de la part d’Express (il ne peut pas savoir ce qu’enverra le
client), mais dangereux : tout ce que tu tires de `req.body` devient `any` à son tour.

Supprime `src/demo.ts` avant de continuer.

## Préciser les types : `Request<Params, ResBody, ReqBody, Query>`

Le type `Request` d’Express a des **paramètres de type**, comme les génériques de la
compétence précédente :

```text
Request<Params, ResBody, ReqBody, Query, Locals>
```

| Paramètre | Décrit                                   | Valeur par défaut              |
| --------- | ---------------------------------------- | ------------------------------ |
| `Params`  | `req.params`                             | un dictionnaire de chaînes     |
| `ResBody` | le corps de la réponse (voir `Response`) | `any`                          |
| `ReqBody` | `req.body`                               | `any`                          |
| `Query`   | `req.query`                              | `ParsedQs`                     |
| `Locals`  | `res.locals`, rarement utile             | un dictionnaire                |

Ils sont positionnels : pour préciser le corps (le troisième), il faut aussi écrire les deux
premiers. `Response` en a deux : `Response<ResBody, Locals>`.

Voici le routeur des réservations, avec des données en mémoire comme dans la compétence
Express :

```ts
// src/routes/bookings.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpError } from '../http/errors.ts';
import type { ApiError, Booking, CreateBookingInput } from '../types.ts';

const bookings: Booking[] = [
  { id: 1, room: 'atlas', title: 'Point hebdo', date: '2026-12-01', startHour: 9, durationHours: 1 },
];
let nextId = 2;

export const bookingsRouter = Router();

bookingsRouter.get('/', (req, res: Response<Booking[]>) => {
  res.json(bookings);
});

bookingsRouter.get('/:id', (req, res: Response<Booking>) => {
  const booking = bookings.find((item) => item.id === Number(req.params.id));
  if (booking === undefined) {
    throw new HttpError(404, `Réservation ${req.params.id} introuvable`);
  }
  res.json(booking);
});

// Version naïve : le type annoncé du corps n'est vérifié par personne
bookingsRouter.post(
  '/',
  (req: Request<{}, Booking | ApiError, CreateBookingInput>, res: Response<Booking | ApiError>) => {
    const booking: Booking = { id: nextId, ...req.body };
    nextId += 1;
    bookings.push(booking);
    res.status(201).json(booking);
  },
);
```

- Dans la route `POST`, `Request<{}, Booking | ApiError, CreateBookingInput>` dit : pas de
  paramètre de route (`{}`), une réponse qui est une réservation ou une erreur, un corps de
  type `CreateBookingInput`. Dans la fonction, `req.body.room` est maintenant de type `Room`
  et une faute de frappe sur `req.body.titel` serait signalée.
- On n’annote `req` que lorsqu’on a besoin d’en préciser un paramètre. Dans les routes `GET`,
  on laisse Express déduire `req.params.id` du chemin et on n’annote que `res`.
- Les imports qui ne servent qu’aux types utilisent `import type`, comme l’exige
  `verbatimModuleSyntax`. `Router` et `HttpError` sont de vraies valeurs : import ordinaire.

### Ce que l’annotation ne fait pas

Le code compile, `tsc` ne dit rien. Lance le serveur (`npm run dev`) et envoie quelques
requêtes :

```bash
curl -s --json '{"room":"cap","title":"Rétro","date":"2026-12-02","startHour":14,"durationHours":2}' http://localhost:3000/api/bookings
curl -s --json '{"room":"salle-99","title":42,"startHour":"neuf","admin":true}' http://localhost:3000/api/bookings
curl -s --json '{"id":1,"room":"cap","title":"Doublon","date":"2026-12-03","startHour":10,"durationHours":1}' http://localhost:3000/api/bookings
curl -s -X POST http://localhost:3000/api/bookings
curl -s --json '[1,2]' http://localhost:3000/api/bookings
```

```text
{"id":2,"room":"cap","title":"Rétro","date":"2026-12-02","startHour":14,"durationHours":2}
{"id":3,"room":"salle-99","title":42,"startHour":"neuf","admin":true}
{"id":1,"room":"cap","title":"Doublon","date":"2026-12-03","startHour":10,"durationHours":1}
{"id":5}
{"0":1,"1":2,"id":6}
```

Seule la première requête est correcte. Toutes les autres reçoivent un `201 Created` et sont
**enregistrées** :

1. une salle qui n’existe pas, un titre numérique, une heure en lettres, une date absente et une
   propriété `admin` que personne n’a prévue ;
2. une réservation qui impose son propre `id` : `{ id: nextId, ...req.body }` copie les
   propriétés du corps **après** `id`, donc celui du client l’emporte. Il existe maintenant
   deux réservations numéro 1, et le numéro 4 n’a jamais été attribué. Laisser le client
   écrire des propriétés qu’il ne devrait pas contrôler porte un nom : l’**affectation de
   masse** (_mass assignment_), une faille répertoriée par l’OWASP ;
3. une requête sans corps : `req.body` vaut `undefined`, la décomposition `...undefined` ne
   copie rien ;
4. un tableau, dont les indices deviennent des propriétés.

Pour TypeScript, `req.body` était un `CreateBookingInput` à chaque fois. Annoter
`Request<…, CreateBookingInput>` revient exactement à écrire `req.body as CreateBookingInput` :
une **affirmation** que rien ne contrôle. Le type de `req.body` est ce que tu **espères**
recevoir ; seule une validation à l’exécution transforme cet espoir en garantie.

:::warning[Règle de conduite]
Un type sur `req.body`, `req.query` ou `req.params` n’est jamais une validation. Tant que la
donnée n’a pas été contrôlée à l’exécution, considère-la comme `unknown`.
:::

## Typer les réponses avec `Response<ResBody>`

Le premier paramètre de `Response` décrit ce que tu envoies avec `res.json()` ou `res.send()`.
Ici, la protection est réelle, car c’est **ton** code qui produit la réponse :

```ts
// src/responses.ts
import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import type { ApiError, Booking } from './types.ts';

export const router = Router();

router.get('/a/:id', (req, res: Response<Booking>) => {
  res.status(404).json({ error: 'Réservation introuvable' });
});

router.get('/b/:id', (req, res: Response<Booking | ApiError>) => {
  res.json({ id: Number(req.params.id), room: 'atlas', title: 'Point', date: '2026-12-01', startHour: 9 });
});
```

```text
src/responses.ts(9,26): error TS2353: Object literal may only specify known properties, and 'error' does not exist in type 'Booking'.
src/responses.ts(13,12): error TS2345: Argument of type '{ id: number; room: "atlas"; title: string; date: string; startHour: number; }' is not assignable to parameter of type 'ApiError | Booking | undefined'.
  Property 'durationHours' is missing in type '{ id: number; room: "atlas"; title: string; date: string; startHour: number; }' but required in type 'Booking'.
```

- Une route déclarée `Response<Booking>` ne peut pas envoyer `{ error: … }` : si elle peut
  échouer **en répondant elle-même**, son type de réponse est une union, `Booking | ApiError`.
  Une route qui **lève** une `HttpError` (comme `GET /:id` plus haut) n’a pas besoin de
  l’union : c’est le gestionnaire d’erreurs qui répondra.
- Une propriété oubliée dans la réponse est signalée : le contrat de l’API est vérifié à
  chaque modification du code.
- Le **statut** n’est pas relié au corps : TypeScript accepte `res.status(201).json(erreur)`.
  À toi d’associer le bon code au bon corps.

## Déclarer un gestionnaire à part : `RequestHandler`

Quand un gestionnaire est défini hors de l’appel `router.get(…)`, il ne profite plus de la
déduction depuis le chemin : il faut le typer entièrement. Le type `RequestHandler` prend les
mêmes paramètres que `Request` :

```ts
const showBooking: RequestHandler<{ id: string }, Booking | ApiError> = (req, res) => {
  res.status(404).json({ error: `Réservation ${req.params.id} introuvable` });
};
router.get('/c/:id', showBooking);
router.get('/d', showBooking);
```

Ajouté à `src/responses.ts`, ce code compile entièrement… y compris la dernière ligne, qui
monte le gestionnaire sur un chemin **sans** paramètre `:id`. À l’exécution, `req.params.id`
vaudra `undefined`. Le lien entre un chemin et un gestionnaire déclaré ailleurs n’est pas
vérifié : c’est une raison de plus pour écrire les gestionnaires simples directement dans
l’appel de route, où le chemin fournit les types. Supprime `src/responses.ts`.

## Typer les erreurs

### Une classe d’erreur compatible avec le retrait des types

```ts
// src/http/errors.ts
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
```

Tu croiseras souvent la forme raccourcie `constructor(public readonly status: number, …)`,
appelée **propriété de paramètre**. Elle génère du code (l’affectation `this.status = status`),
donc Node.js ne peut pas simplement l’effacer ; `erasableSyntaxOnly` la refuse :

```text
src/http/errors.ts(3,15): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

D’où la déclaration explicite de la propriété, puis son affectation. `readonly` est effaçable :
il empêche seulement, à la compilation, de modifier `status` après la construction.

### Le gestionnaire d’erreurs : `any` contre `unknown`

`@types/express` fournit le type `ErrorRequestHandler`. Il est pratique, mais son premier
paramètre est déclaré `any`. Voici ce que cela laisse passer :

```ts
// src/any-handler.ts
import express from 'express';
import type { ErrorRequestHandler } from 'express';

const app = express();

app.get('/crash', () => {
  JSON.parse('{oops'); // lève une SyntaxError, sans propriété status
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status).json({ error: err.mesage });
};
app.use(errorHandler);

const server = app.listen(3111, async () => {
  const response = await fetch('http://localhost:3111/crash');
  console.log(response.status, response.headers.get('content-type'));
  server.close();
});
```

`tsc` ne signale rien, ni la faute de frappe `mesage`, ni le fait qu’une erreur quelconque n’a
pas de `status`. `node src/any-handler.ts` affiche :

```text
500 text/html; charset=utf-8
TypeError: Invalid status code: undefined. Status code must be an integer.
    at ServerResponse.status (/…/node_modules/express/lib/response.js:68:11)
    at errorHandler (file:///…/src/any-handler.ts:12:7)
```

Le gestionnaire d’erreurs **plante lui-même** : Express 5 refuse `res.status(undefined)`. C’est
alors le gestionnaire par défaut d’Express qui répond, en HTML et, hors production, avec la pile
d’appels dans la page : exactement la fuite d’information que le gestionnaire centralisé devait
empêcher.

La correction tient en un mot : annoter `err: unknown`. `tsc` exige alors de rétrécir le type
avant usage :

```text
src/any-handler.ts(12,14): error TS18046: 'err' is of type 'unknown'.
src/any-handler.ts(12,40): error TS18046: 'err' is of type 'unknown'.
```

Ce qui est levé en JavaScript peut être **n’importe quoi** : une `HttpError`, une `TypeError`,
une erreur d’`express.json()`, ou même une chaîne. `unknown` décrit cette réalité ; `any` la
cache. Voici le gestionnaire du projet, qui reprend celui de la compétence Express :

```ts
// src/http/error-handler.ts
import type { NextFunction, Request, Response } from 'express';
import type { ApiError } from '../types.ts';
import { HttpError } from './errors.ts';

// Les erreurs d'express.json() portent une propriété type (« entity.parse.failed »…)
function bodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') {
    return err.type;
  }
  return undefined;
}

export function notFound(req: Request, res: Response, next: NextFunction): void {
  next(new HttpError(404, `Route ${req.method} ${req.path} introuvable`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ApiError>,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (bodyParserType(err) === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corps JSON mal formé' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
```

- `err instanceof HttpError` rétrécit `err` : `err.status` et `err.message` sont alors connus.
- `bodyParserType` est une petite fonction qui rétrécit pas à pas un `unknown`, comme dans la
  leçon sur `unknown` de la compétence précédente.
- `Response<ApiError>` garantit que **toutes** les réponses d’erreur ont la même forme.
- Les **quatre paramètres** restent obligatoires : c’est à leur nombre qu’Express reconnaît un
  gestionnaire d’erreurs à l’exécution. Le typage n’y change rien ; `next` est bien utilisé ici,
  pour déléguer quand les en-têtes sont déjà partis.

### Les gestionnaires asynchrones

Le type `RequestHandler` déclare un retour `unknown` : une fonction `async`, qui renvoie une
promesse, est acceptée. Et tu sais qu’Express 5 transmet au gestionnaire d’erreurs toute
promesse rejetée **renvoyée** par un gestionnaire. Le piège est la promesse **ni attendue ni
renvoyée** :

```ts
// src/floating.ts
import express from 'express';
import { setTimeout as delay } from 'node:timers/promises';

async function saveBooking(title: string): Promise<{ id: number; title: string }> {
  await delay(10); // simule un stockage lent
  if (title === 'panne') {
    throw new Error('Stockage indisponible');
  }
  return { id: 1, title };
}

const app = express();
app.use(express.json());

app.post('/bookings', (req, res) => {
  saveBooking(req.body.title).then((booking) => {
    res.status(201).json(booking);
  });
});

app.listen(3112, () => console.log('Prêt'));
```

Avec `{"title":"Rétro"}`, tout va bien. Avec `{"title":"panne"}`, la promesse rejetée n’est
rattachée à rien : Express ne la voit pas, et Node.js arrête **tout le processus** (`curl`
reçoit une réponse vide, code de sortie 52) :

```text
Prêt
file:///…/src/floating.ts:8
    throw new Error('Stockage indisponible');
          ^

Error: Stockage indisponible
    at saveBooking (file:///…/src/floating.ts:8:11)

Node.js v24.21.0
```

`tsc` accepte ce code sans rien dire : oublier un `await` n’est pas une erreur de type. Écris
`async (req, res) => { const booking = await saveBooking(…); … }`, ou au minimum
`return saveBooking(…).then(…)`. Des outils d’analyse comme ESLint, avec les règles de
typescript-eslint, savent signaler ces promesses « flottantes » ; `tsc` seul ne le fait pas.

## Assembler l’application

```ts
// src/app.ts
import express from 'express';
import type { Express } from 'express';
import { errorHandler, notFound } from './http/error-handler.ts';
import { bookingsRouter } from './routes/bookings.ts';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/bookings', bookingsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

```ts
// src/server.ts
import { createApp } from './app.ts';
import { config } from './config.ts';

const app = createApp();

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Impossible d’écouter sur le port ${config.port} :`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`API (${config.env}) prête sur http://localhost:${config.port}`);
});
```

Le type de retour `Express` de `createApp` est importé avec `import type`. Annoter le retour
d’une fonction exportée documente ce qu’elle promet, et localise l’erreur dans la fonction si
son contenu change par mégarde. Dans `server.ts`, `error` est de type `Error | undefined` : le
`if (error)` le rétrécit avant d’accéder à `error.message`.

## Pièges courants

- **`Request<{}, …, CreateBookingInput>` vu comme une validation** : c’est une assertion
  déguisée, équivalente à `req.body as CreateBookingInput`.
- **`{ id: nextId, ...req.body }`** : les propriétés du client écrasent celles du serveur.
  Place les valeurs imposées par le serveur **après** la décomposition, et surtout ne
  décompose qu’une donnée validée.
- **`ErrorRequestHandler` sans annoter `err`** : `err` est `any`, les fautes de frappe et les
  erreurs sans `status` passent.
- **Supprimer `next` d’un gestionnaire d’erreurs parce qu’il semble inutile** : Express ne le
  reconnaît plus.
- **Une promesse ni attendue ni renvoyée** dans une route : un rejet arrête le serveur.
- **Croire que le statut est vérifié** : seul le corps l’est.

## Exercices

### Exercice 1 — Annoter une route de recherche

Ajoute au routeur une route `GET /api/bookings/rooms/:room` qui renvoie les réservations d’une
salle, ou une erreur 404 `{ "error": "Salle inconnue" }` si la salle n’est pas `atlas`,
`balise` ou `cap`. La route répond elle-même (sans lever d’erreur). Donne à `res` le type
exact, sans `as` ni `any`, et vérifie avec `npx tsc --noEmit` puis `curl`.

:::solution
La route répond soit un tableau de réservations, soit une erreur : son type de réponse est
l’union `Booking[] | ApiError`. Pour vérifier la salle sans assertion, on teste l’appartenance
à une liste, puis on filtre :

```ts
const rooms: readonly string[] = ['atlas', 'balise', 'cap'];

bookingsRouter.get('/rooms/:room', (req, res: Response<Booking[] | ApiError>) => {
  const { room } = req.params;
  if (!rooms.includes(room)) {
    res.status(404).json({ error: 'Salle inconnue' });
    return;
  }
  res.json(bookings.filter((booking) => booking.room === room));
});
```

`req.params.room` est déduit du chemin (`string`). La comparaison `booking.room === room`
compare un `Room` à une `string`, ce que TypeScript accepte. Place cette route **avant**
`'/:id'` ou après : les deux chemins ne se recouvrent pas, car `/rooms/atlas` a deux segments.

```bash
curl -s http://localhost:3000/api/bookings/rooms/atlas
curl -s http://localhost:3000/api/bookings/rooms/salle-99
```

```text
[{"id":1,"room":"atlas","title":"Point hebdo","date":"2026-12-01","startHour":9,"durationHours":1}]
{"error":"Salle inconnue"}
```

Le `return` après la réponse 404 est indispensable : sans lui, la fonction enverrait une
seconde réponse.
:::

### Exercice 2 — Trois défauts dans un gestionnaire

Ce code a été proposé pour remplacer la route `POST`. `tsc` ne signale aucune erreur. Trouve
trois défauts et explique pourquoi TypeScript ne pouvait pas les voir.

```ts
bookingsRouter.post('/', (req, res) => {
  const input = req.body as CreateBookingInput;
  const booking = { id: nextId++, ...input };
  bookings.push(booking);
  res.status(201).json(booking);
});

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status ?? 500).json({ error: err.message });
};
```

:::solution
1. **`req.body as CreateBookingInput`** : aucune validation. Une salle inconnue, un titre
   numérique ou une heure en lettres sont enregistrés. `as` affirme un type sans le vérifier,
   et `req.body` est `any` : TypeScript n’a aucune raison de protester.
2. **`{ id: nextId++, ...input }`** : l’`id` envoyé par le client écrase celui du serveur
   (affectation de masse), et des propriétés imprévues comme `admin` sont stockées. Pour
   TypeScript, `input` n’a que les propriétés de `CreateBookingInput` : il ne peut pas
   savoir que l’objet réel en contient d’autres.
3. **`err.message` renvoyé au client pour toutes les erreurs**, y compris les 500 : un message
   interne (`Cannot read properties of undefined (reading 'theme')`, un chemin de fichier…)
   fuit vers le client. Et si une erreur porte un `status` qui n’est pas un code HTTP valide
   (une chaîne, par exemple), `res.status` lève une exception. `err` est `any` dans
   `ErrorRequestHandler` : `tsc` accepte tout.

Correction : valider le corps (leçon 3), et écrire le gestionnaire avec `err: unknown`, en ne
renvoyant `err.message` que pour une `HttpError`, comme dans `src/http/error-handler.ts`.
:::

### Exercice 3 — Prévoir le type

Pour chaque expression, écris le type que TypeScript lui donne dans le gestionnaire indiqué,
puis vérifie en provoquant une erreur volontaire (par exemple `const x: boolean = …`).

1. `req.params.slot` dans `app.get('/api/rooms/:room/slots/:slot', (req, res) => …)`.
2. `req.params.date` dans `app.get('/api/agenda{/:date}', (req, res) => …)`.
3. `req.body` dans `app.post('/api/bookings', (req, res) => …)`.
4. `req.query.room` dans le même gestionnaire.

:::solution
1. `string` : déduit du chemin. Un paramètre de route est toujours une chaîne.
2. `string | undefined` : le segment entre accolades est optionnel en Express 5.
3. `any` : sans annotation, Express ne peut pas connaître le corps.
4. `string | (string | ParsedQs)[] | ParsedQs | undefined` : le type de l’analyseur `qs`.

L’astuce `const x: boolean = req.params.slot;` provoque une erreur `TS2322` dont le message
contient le type réel : `Type 'string' is not assignable to type 'boolean'`. Pour `req.body`,
il n’y a **pas** d’erreur : une valeur `any` est assignable à tout, ce qui confirme son type.
:::

## Récapitulatif

- `@types/express` déduit `req.params` du chemin de la route (chaînes, segments optionnels
  compris), donne à `req.query` un type large qui oblige à vérifier, et laisse `req.body` en
  `any`.
- `Request<Params, ResBody, ReqBody, Query>` et `Response<ResBody>` précisent les types ; les
  paramètres sont positionnels.
- Typer la **réponse** protège vraiment : c’est ton code qui la produit. Le statut, lui, n’est
  pas vérifié.
- Typer le **corps de la requête** ne valide rien : c’est une assertion, et l’API accepte des
  données absurdes ou dangereuses (affectation de masse).
- Un gestionnaire déclaré à part se type avec `RequestHandler`, mais son lien avec le chemin
  n’est pas contrôlé.
- Le gestionnaire d’erreurs prend `err: unknown`, garde ses quatre paramètres et rétrécit
  l’erreur avant de l’utiliser. Une classe d’erreur déclare ses propriétés explicitement
  (pas de propriétés de paramètres).
- Une promesse ni attendue ni renvoyée dans une route échappe à Express et peut arrêter le
  serveur, sans que `tsc` le signale.
