---
title: Tester un projet TypeScript avec node:test
summary: Exécuter des tests écrits en TypeScript avec node --test, tester un module pur, des schémas et une route HTTP, et combiner tests et vérification des types.
durationMinutes: 70
sources:
  - title: Node.js — Test runner
    url: https://nodejs.org/api/test.html
  - title: Node.js — Modules TypeScript (type stripping)
    url: https://nodejs.org/api/typescript.html
  - title: Node.js — Assert
    url: https://nodejs.org/api/assert.html
---

## Ce que les types ne testent pas

`tsc` garantit que chaque valeur est **utilisée** conformément à son type. Il ne dit rien de
ce que le code **calcule**. Si `overlaps` répond `true` pour deux créneaux qui se suivent
(9 h-11 h puis 11 h-12 h), le code est parfaitement typé… et refuse des réservations
légitimes. Les tests vérifient le comportement ; les types vérifient la cohérence. Les deux
sont nécessaires.

Tu connais `node:test` et `node:assert/strict` par la compétence sur les tests : `describe`,
`it`, `beforeEach`, `assert.equal`, `assert.deepEqual`, `assert.throws`, les tests asynchrones,
le serveur sur le port 0 interrogé avec `fetch`. Cette leçon les applique à `bookings-api`, en
TypeScript, et montre ce qui change : la découverte des fichiers, la vérification des types des
tests, et l’usage des contrats dans les tests.

## `node --test` exécute directement les fichiers `.ts`

Aucun outil supplémentaire n’est nécessaire : le lanceur de tests de Node.js 24 trouve et
exécute les fichiers TypeScript avec le même retrait des types que `node src/server.ts`. Le
script `"test": "node --test"` de la leçon 1 suffit.

### Quels fichiers sont lancés ?

Sans argument, `node --test` cherche dans le dossier courant et ses sous-dossiers les fichiers
dont le chemin correspond à ces motifs :

```text
**/*.test.{cjs,mjs,js}      **/*.test.{cts,mts,ts}
**/*-test.{cjs,mjs,js}      **/*-test.{cts,mts,ts}
**/*_test.{cjs,mjs,js}      **/*_test.{cts,mts,ts}
**/test-*.{cjs,mjs,js}      **/test-*.{cts,mts,ts}
**/test.{cjs,mjs,js}        **/test.{cts,mts,ts}
**/test/**/*.{cjs,mjs,js}   **/test/**/*.{cts,mts,ts}
```

Les motifs TypeScript (colonne de droite) ne s’appliquent que si le retrait des types est
actif, ce qui est le cas par défaut dans Node.js 24. Les conditions à connaître, vérifiées
avec ce projet :

- **Avec `--no-strip-types`**, les fichiers `.ts` ne sont plus cherchés :
  `node --no-strip-types --test` affiche `ℹ tests 0`.
- **Les dossiers `node_modules` sont ignorés.**
- **Tout fichier `.ts` d’un dossier `test/` est exécuté**, même s’il ne contient aucun test.
  Un fichier d’aide `test/helpers.ts` serait chargé comme un fichier de test (il apparaît dans
  le rapport comme un test réussi). Range les aides ailleurs, par exemple dans `test-helpers/`.
- **Un dossier en argument ne fonctionne pas** : `node --test test/` essaie de charger le
  dossier comme un module et échoue avec `Error: Cannot find module '/…/bookings-api/test'`.
  Donne des fichiers (`node --test test/rules.test.ts`) ou un motif entre guillemets
  (`node --test "test/**/*.test.ts"`), que Node.js interprète lui-même.
- Les fichiers de test obéissent aux mêmes règles que le reste : imports relatifs en `.ts`,
  `import type` pour les types, pas d’`enum`.

### Les tests ne vérifient pas les types

`node --test` **efface** les types comme `node` : un test mal typé s’exécute quand même. Dans
le test de route plus bas, remplace la lecture prudente de l’adresse du serveur par la version
courte :

```ts
    baseUrl = `http://127.0.0.1:${server.address().port}/api/bookings`;
```

`node --test test/bookings-api.test.ts` affiche `ℹ pass 4` (et `npm test` réussit aussi),
mais `npm run typecheck` proteste :

```text
test/bookings-api.test.ts(35,35): error TS2531: Object is possibly 'null'.
test/bookings-api.test.ts(35,52): error TS2339: Property 'port' does not exist on type 'string | AddressInfo'.
  Property 'port' does not exist on type 'string'.
```

C’est pour cela que `tsconfig.json` inclut le dossier `test` et que le script `check`, écrit
dans l’exercice 2 de la leçon 1, enchaîne les deux vérifications :

```json
{
  "scripts": {
    "check": "npm run typecheck && npm test"
  }
}
```

`npm run check` est la commande à lancer avant chaque commit.

## Tester un module pur

`src/bookings/rules.ts` ne dépend ni d’Express ni du stockage : ses tests appellent des
fonctions et comparent des résultats, sans rien démarrer.

```ts
// test/rules.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { endHour, findConflict, overlaps } from '../src/bookings/rules.ts';
import type { Booking, CreateBookingInput } from '../src/contracts/bookings.ts';

const weekly: Booking = {
  id: 1,
  room: 'atlas',
  title: 'Point hebdo',
  date: '2026-12-01',
  startHour: 9,
  durationHours: 2,
};

describe('endHour', () => {
  it('ajoute la durée à l’heure de début', () => {
    assert.equal(endHour(weekly), 11);
  });
});

describe('overlaps', () => {
  it('détecte un créneau qui commence pendant un autre', () => {
    assert.equal(overlaps(weekly, { ...weekly, startHour: 10, durationHours: 1 }), true);
  });

  it('accepte deux créneaux qui se suivent, dans les deux sens', () => {
    const next = { ...weekly, startHour: 11, durationHours: 1 };
    assert.equal(overlaps(weekly, next), false);
    assert.equal(overlaps(next, weekly), false);
  });

  it('ignore les réservations d’une autre salle ou d’un autre jour', () => {
    assert.equal(overlaps(weekly, { ...weekly, room: 'cap' }), false);
    assert.equal(overlaps(weekly, { ...weekly, date: '2026-12-02' }), false);
  });
});

describe('findConflict', () => {
  const candidate: CreateBookingInput = {
    room: 'atlas',
    title: 'Rétro',
    date: '2026-12-01',
    startHour: 8,
    durationHours: 2,
  };

  it('renvoie la réservation qui chevauche le créneau demandé', () => {
    assert.equal(findConflict([weekly], candidate), weekly);
  });

  it('renvoie undefined quand le créneau est libre', () => {
    assert.equal(findConflict([weekly], { ...candidate, startHour: 14 }), undefined);
  });
});
```

```bash
node --test test/rules.test.ts
```

```text
▶ endHour
  ✔ ajoute la durée à l’heure de début (0.450233ms)
✔ endHour (1.2019ms)
▶ overlaps
  ✔ détecte un créneau qui commence pendant un autre (0.154136ms)
  ✔ accepte deux créneaux qui se suivent, dans les deux sens (0.105296ms)
  ✔ ignore les réservations d’une autre salle ou d’un autre jour (0.117427ms)
✔ overlaps (0.620213ms)
▶ findConflict
  ✔ renvoie la réservation qui chevauche le créneau demandé (0.124843ms)
  ✔ renvoie undefined quand le créneau est libre (0.166051ms)
✔ findConflict (0.460423ms)
ℹ tests 6
ℹ suites 3
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 87.623263
```

Les durées varient d’une exécution à l’autre. Ce que TypeScript apporte ici :

- Les **données de test sont typées par les contrats** (`weekly: Booking`). Si le contrat
  gagne un champ obligatoire, `tsc` signale ces données au lieu de laisser les tests tourner
  sur des objets incomplets.
- `{ ...weekly, room: 'cap' }` est vérifié : `room: 'salle-99'` serait refusé par `tsc`. Pour
  tester une valeur **invalide**, il faut donc passer par une fonction qui accepte `unknown`,
  comme `safeParse` : c’est le cas des tests de schémas, plus bas.
- `import type` pour les types, `import` pour les fonctions, extension `.ts` : les mêmes règles
  que dans `src`.

### Un cas limite testé dans les deux sens

Le deuxième test vérifie `overlaps(weekly, next)` **et** `overlaps(next, weekly)`. Pourquoi
deux fois ? Introduis une régression dans `overlaps` en remplaçant `a.startHour < endHour(b)`
par `a.startHour <= endHour(b)`. Avec la seule première assertion, le test passerait encore :
dans cet ordre, c’est la seconde condition, restée stricte, qui donne `false`. Avec les deux
assertions, la régression est détectée :

```text
✖ failing tests:

test at test/rules.test.ts:27:3
✖ accepte deux créneaux qui se suivent, dans les deux sens (0.743098ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  true !== false
  
      at TestContext.<anonymous> (file:///…/bookings-api/test/rules.test.ts:30:12)
```

La ligne 30 est la seconde assertion. Une relation symétrique (« A chevauche B » équivaut à
« B chevauche A ») se teste dans les deux sens, et un cas limite (« à l’heure de fin
exactement ») mérite un test à lui seul.

## Tester les schémas du contrat

Les schémas contiennent des règles : bornes, nettoyage, conversion, `refine`. Elles se testent
comme des fonctions pures, avec des entrées valides et invalides.

```ts
// test/contracts.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingSchema, listBookingsQuerySchema } from '../src/contracts/bookings.ts';
import type { CreateBookingInput } from '../src/contracts/bookings.ts';

// Une entrée valide, typée par le contrat : si le contrat change, tsc le signale ici
const valid: CreateBookingInput = {
  room: 'cap',
  title: 'Rétro',
  date: '2026-12-02',
  startHour: 14,
  durationHours: 2,
};

describe('createBookingSchema', () => {
  it('nettoie le titre', () => {
    const input = createBookingSchema.parse({ ...valid, title: '  Rétro  ' });
    assert.equal(input.title, 'Rétro');
  });

  it('refuse une propriété inconnue, comme un id choisi par le client', () => {
    const result = createBookingSchema.safeParse({ ...valid, id: 1 });
    assert.equal(result.success, false);
  });

  it('refuse une réservation qui finit après la fermeture', () => {
    const result = createBookingSchema.safeParse({ ...valid, startHour: 18, durationHours: 3 });
    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues.map((issue) => issue.path), [['durationHours']]);
  });
});

describe('listBookingsQuerySchema', () => {
  it('convertit limit et applique la valeur par défaut', () => {
    assert.deepEqual(listBookingsQuerySchema.parse({ limit: '5' }), { limit: 5 });
    assert.deepEqual(listBookingsQuerySchema.parse({}), { limit: 20 });
  });

  it('refuse une limite vide, qui deviendrait 0', () => {
    assert.equal(listBookingsQuerySchema.safeParse({ limit: '' }).success, false);
  });
});
```

```text
▶ createBookingSchema
  ✔ nettoie le titre (2.282895ms)
  ✔ refuse une propriété inconnue, comme un id choisi par le client (0.519318ms)
  ✔ refuse une réservation qui finit après la fermeture (0.921333ms)
✔ createBookingSchema (4.682ms)
▶ listBookingsQuerySchema
  ✔ convertit limit et applique la valeur par défaut (0.746516ms)
  ✔ refuse une limite vide, qui deviendrait 0 (0.143857ms)
✔ listBookingsQuerySchema (1.087656ms)
ℹ tests 5
ℹ suites 2
ℹ pass 5
```

- `{ ...valid, id: 1 }` est accepté par `tsc` alors que `CreateBookingInput` n’a pas d’`id` :
  la vérification des propriétés en trop ne s’applique qu’aux objets littéraux affectés
  directement à un type, et `safeParse` attend de toute façon un `unknown`. C’est précisément
  ce qui permet de tester des entrées invalides.
- Le troisième test vérifie **où** porte l’erreur (`['durationHours']`), pas seulement qu’il y
  en a une : un test qui se contente de `success === false` passerait aussi si l’objet était
  refusé pour une tout autre raison.
- Le dernier test fixe le piège de la coercition vu en leçon 3 : sans `min(1)`, `''` deviendrait
  `0` sans erreur.

## Tester une route

Les tests de route démarrent une vraie application sur un port libre et l’interrogent avec
`fetch`, comme dans la compétence sur les tests. Deux choix du projet les rendent simples :
`createApp` ne démarre rien, et elle reçoit son stockage en paramètre.

```ts
// test/bookings-api.test.ts
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { createBookingStore } from '../src/bookings/store.ts';
import { apiErrorSchema, bookingSchema } from '../src/contracts/bookings.ts';
import type { CreateBookingInput } from '../src/contracts/bookings.ts';

const retro: CreateBookingInput = {
  room: 'cap',
  title: 'Rétro',
  date: '2026-12-02',
  startHour: 14,
  durationHours: 2,
};

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API /api/bookings', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    // Une application neuve, avec un stockage vide, pour chaque test
    server = createApp(createBookingStore()).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Le serveur devrait écouter sur un port TCP');
    }
    baseUrl = `http://127.0.0.1:${address.port}/api/bookings`;
  });

  afterEach(() => {
    server.close();
  });

  it('POST crée une réservation nettoyée et répond 201', async () => {
    const response = await postJson(baseUrl, { ...retro, title: '  Rétro  ' });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get('location'), '/api/bookings/1');
    const booking = bookingSchema.parse(await response.json());
    assert.deepEqual(booking, { ...retro, id: 1 });
  });

  it('POST refuse un corps invalide avec 400 et le détail des erreurs', async () => {
    const response = await postJson(baseUrl, { ...retro, startHour: 'neuf', admin: true });

    assert.equal(response.status, 400);
    const body = apiErrorSchema.parse(await response.json());
    assert.equal(body.error, 'Requête invalide');
    assert.deepEqual(
      body.issues?.map((issue) => issue.path),
      ['startHour', ''],
    );
  });

  it('POST refuse un créneau déjà pris avec 409', async () => {
    await postJson(baseUrl, retro);
    const response = await postJson(baseUrl, { ...retro, title: 'Autre', startHour: 15 });

    assert.equal(response.status, 409);
    assert.deepEqual(apiErrorSchema.parse(await response.json()), {
      error: 'Créneau déjà réservé (réservation 1)',
    });
  });

  it('GET convertit et contrôle les paramètres de requête', async () => {
    await postJson(baseUrl, retro);
    await postJson(baseUrl, { ...retro, room: 'atlas' });

    const filtered = await fetch(`${baseUrl}?room=atlas&limit=10`);
    assert.equal(filtered.status, 200);
    const bookings = bookingSchema.array().parse(await filtered.json());
    assert.deepEqual(bookings.map((booking) => booking.room), ['atlas']);

    const invalid = await fetch(`${baseUrl}?limit=0`);
    assert.equal(invalid.status, 400);
  });
});
```

```text
▶ API /api/bookings
  ✔ POST crée une réservation nettoyée et répond 201 (50.421805ms)
  ✔ POST refuse un corps invalide avec 400 et le détail des erreurs (10.247128ms)
  ✔ POST refuse un créneau déjà pris avec 409 (6.668509ms)
  ✔ GET convertit et contrôle les paramètres de requête (10.105919ms)
✔ API /api/bookings (78.680274ms)
```

### Une application neuve pour chaque test

`beforeEach` crée une application avec un stockage **vide** et la démarre ; `afterEach`
l’arrête. Chaque test part donc d’un état connu : dans le premier, la réservation créée a l’`id`
1, quel que soit l’ordre d’exécution. Si l’application utilisait un tableau global, les tests
dépendraient les uns des autres. Démarrer une application par test coûte quelques
millisecondes : un prix raisonnable pour des tests indépendants.

### `server.address()` : rétrécir au lieu d’affirmer

`server.address()` est typé `string | AddressInfo | null` : une chaîne pour un serveur qui
écoute sur un fichier de socket, `null` s’il n’écoute pas encore. Le `if` élimine ces deux cas,
et TypeScript sait ensuite que `address.port` existe. On voit souvent à la place
`server.address() as AddressInfo` : c’est une affirmation que rien ne vérifie, exactement le
genre de `as` que tu chasses depuis le début de la compétence. Le `throw` donne un message clair
si l’hypothèse est fausse un jour.

### `response.json()` renvoie `any` : on le valide avec le contrat

Le type de `response.json()` est `Promise<any>`. Écrire
`const booking: Booking = await response.json();` est accepté par `tsc`, et revient à affirmer
que l’API respecte son contrat… dans le test même qui doit le vérifier.

Les tests utilisent donc les **schémas du module de contrats** pour lire les réponses :
`bookingSchema.parse(…)`, `bookingSchema.array().parse(…)` (`.array()` construit le schéma d’un
tableau), `apiErrorSchema.parse(…)`. Si une route renvoie un jour un champ manquant ou mal
typé, le test échoue avec une `ZodError` qui dit lequel. C’est le dernier usage du partage des
contrats : **la même définition** valide les requêtes dans les routes et les réponses dans les
tests, sans aucune duplication.

`postJson` prend un corps de type `unknown` : il doit pouvoir envoyer des corps invalides
(`startHour: 'neuf'`, `admin: true`), qu’un paramètre de type `CreateBookingInput` refuserait.

### Ce qu’on vérifie dans un test de route

Le statut **et** le corps, toujours. Un test qui ne regarde que le corps ne verrait pas un
`200` à la place d’un `201`, ni une erreur renvoyée avec le statut `200`. Le premier test
vérifie aussi l’en-tête `Location`. Les détails purement internes (le contenu exact du
stockage, l’ordre des appels) ne se testent pas : ils peuvent changer sans que le comportement
change.

## Lancer toute la suite

```bash
npm run check
```

```text
> bookings-api@1.0.0 check
> npm run typecheck && npm test


> bookings-api@1.0.0 typecheck
> tsc --noEmit


> bookings-api@1.0.0 test
> node --test

▶ API /api/bookings
  ✔ POST crée une réservation nettoyée et répond 201 (51.114133ms)
…
ℹ tests 15
ℹ suites 6
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 462.669398
```

Quinze tests, trois fichiers, aucune erreur de type : le projet est vérifié dans ses deux
dimensions.

## Pièges courants

- **Croire que `npm test` vérifie les types** : il les efface. Lance `npm run check`.
- **`server.address() as AddressInfo`** et **`const booking: Booking = await response.json()`** :
  deux assertions déguisées. Rétrécis l’adresse, valide la réponse avec le contrat.
- **Un fichier d’aide dans `test/`** : il est exécuté comme un test.
- **`node --test test/`** : un dossier n’est pas accepté ; donne un motif entre guillemets.
- **Une assertion dans un `if`** : si la condition est fausse, le test passe sans rien vérifier.
- **`assert.ok(response)`** : un objet est toujours truthy. Vérifie `response.status`.
- **Oublier `server.close()`** : le processus de test ne se termine pas.
- **Un état partagé entre tests** (stockage global) : les résultats dépendent de l’ordre.
- **Tester une relation symétrique dans un seul sens** : une régression peut passer.

## Exercices

### Exercice 1 — Tester la suppression

Ajoute à `test/bookings-api.test.ts` deux tests pour `DELETE /api/bookings/:id` : une
suppression réussie (204, corps vide) suivie d’une seconde tentative (404 avec le message
d’erreur exact), puis un identifiant non numérique (400).

:::solution
À ajouter dans le `describe`, après les autres tests :

```ts
  it('DELETE supprime une réservation, puis répond 404', async () => {
    await postJson(baseUrl, retro);

    const first = await fetch(`${baseUrl}/1`, { method: 'DELETE' });
    assert.equal(first.status, 204);
    assert.equal(await first.text(), '');

    const second = await fetch(`${baseUrl}/1`, { method: 'DELETE' });
    assert.equal(second.status, 404);
    assert.deepEqual(apiErrorSchema.parse(await second.json()), {
      error: 'Réservation 1 introuvable',
    });
  });

  it('DELETE refuse un identifiant qui n’est pas un nombre', async () => {
    const response = await fetch(`${baseUrl}/abc`, { method: 'DELETE' });
    assert.equal(response.status, 400);
  });
```

```text
  ✔ DELETE supprime une réservation, puis répond 404 (6.313836ms)
  ✔ DELETE refuse un identifiant qui n’est pas un nombre (2.603878ms)
```

- Le stockage est vide au début de chaque test : il faut d’abord **créer** la réservation, qui
  reçoit l’`id` 1.
- Une réponse 204 n’a pas de corps : `response.text()` renvoie la chaîne vide, alors que
  `response.json()` lèverait une `SyntaxError`.
- Le message 404 est lu avec `apiErrorSchema` : le test vérifie aussi la forme de l’erreur.
:::

### Exercice 2 — Des tests qui ne testent rien

Ces trois tests passent. Pour l’un d’eux au moins, ils passeraient aussi si la règle testée
disparaissait du schéma. Explique pourquoi, en précisant ce qui se passe quand on retire
`.min(OPENING_HOUR)`, `.min(3)` ou `.min(1)` du contrat, puis corrige-les.

```ts
// test/useless.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingSchema } from '../src/contracts/bookings.ts';

const valid = {
  room: 'cap',
  title: 'Rétro',
  date: '2026-12-02',
  startHour: 14,
  durationHours: 2,
};

describe('createBookingSchema', () => {
  it('refuse une réservation avant l’ouverture', () => {
    const result = createBookingSchema.safeParse({ ...valid, startHour: 7 });
    if (!result.success) {
      assert.deepEqual(result.error.issues[0]?.path, ['startHour']);
    }
  });

  it('refuse un titre trop court', () => {
    const result = createBookingSchema.safeParse({ ...valid, title: 'ab' });
    assert.ok(result);
  });

  it('refuse une durée de zéro heure', () => {
    assert.throws(() => createBookingSchema.parse({ ...valid, durationHours: 0 }));
  });
});
```

:::solution
Expérience faite en retirant les trois règles du contrat : les deux premiers tests **passent
encore**, le troisième échoue.

1. **L’assertion est dans un `if`.** Si le schéma accepte `startHour: 7`, `result.success`
   vaut `true`, le bloc est sauté et le test se termine sans avoir rien vérifié. Il faut
   d’abord affirmer l’échec, sans condition.
2. **`assert.ok(result)`** vérifie seulement que `result` est truthy, ce qu’un objet est
   toujours, qu’il représente un succès ou un échec.
3. Le troisième échoue bien quand la règle disparaît, mais il est **fragile** : `assert.throws`
   sans erreur attendue accepte n’importe quelle exception. Si `valid` devenait invalide
   (une date `2026-12-32` par exemple), `parse` lèverait une erreur pour une autre raison et le
   test passerait même sans la règle de durée. Vérifié : avec cette date et sans `.min(1)`, il
   passe.

Version corrigée : on vérifie l’échec **et** l’endroit de l’erreur, et on type `valid` avec le
contrat pour que `tsc` garantisse qu’il est complet.

```ts
const valid: CreateBookingInput = { /* … mêmes valeurs … */ };

function failingPaths(input: unknown): unknown[][] {
  const result = createBookingSchema.safeParse(input);
  assert.equal(result.success, false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

it('refuse une réservation avant l’ouverture', () => {
  assert.deepEqual(failingPaths({ ...valid, startHour: 7 }), [['startHour']]);
});

it('refuse un titre trop court', () => {
  assert.deepEqual(failingPaths({ ...valid, title: 'ab' }), [['title']]);
});

it('refuse une durée de zéro heure', () => {
  assert.deepEqual(failingPaths({ ...valid, durationHours: 0 }), [['durationHours']]);
});
```

`failingPaths` vérifie d’abord l’échec (`assert.equal` lève une exception sinon), puis renvoie
les chemins des erreurs. Avec une entrée de départ invalide, il y aurait **deux** chemins et
le test échouerait : il ne peut plus passer pour une mauvaise raison. N’oublie pas
`import type { CreateBookingInput } from '../src/contracts/bookings.ts';`.
:::

### Exercice 3 — Tester `parseInput`

Écris `test/validation.test.ts` pour vérifier que `parseInput` renvoie la donnée convertie
(`{ id: '12' }` devient `{ id: 12 }` avec `bookingIdParamsSchema`), et qu’avec `{ id: 'abc' }`
elle lève une `ValidationError` de statut 400 dont les `issues` sont exactement
`[{ path: 'id', message: 'Invalid input: expected number, received NaN' }]`.

:::solution
```ts
// test/validation.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bookingIdParamsSchema } from '../src/contracts/bookings.ts';
import { ValidationError } from '../src/http/errors.ts';
import { parseInput } from '../src/http/validation.ts';

describe('parseInput', () => {
  it('renvoie la donnée validée et convertie', () => {
    const params = parseInput(bookingIdParamsSchema, { id: '12' });
    assert.deepEqual(params, { id: 12 });
  });

  it('lève une ValidationError 400 qui décrit chaque problème', () => {
    assert.throws(() => parseInput(bookingIdParamsSchema, { id: 'abc' }), {
      name: 'ValidationError',
      status: 400,
      message: 'Requête invalide',
      issues: [{ path: 'id', message: 'Invalid input: expected number, received NaN' }],
    });
  });

  it('lève bien une instance de ValidationError', () => {
    assert.throws(() => parseInput(bookingIdParamsSchema, {}), ValidationError);
  });
});
```

```text
▶ parseInput
  ✔ renvoie la donnée validée et convertie (1.986372ms)
  ✔ lève une ValidationError 400 qui décrit chaque problème (0.871613ms)
  ✔ lève bien une instance de ValidationError (0.164334ms)
✔ parseInput (3.89868ms)
```

- Passé en second argument de `assert.throws`, un **objet** décrit les propriétés attendues de
  l’erreur : chacune est comparée strictement, y compris `issues` en profondeur. Changer un
  seul caractère du message attendu fait échouer le test.
- Passée en second argument, une **classe** vérifie `instanceof`.
- Ces tests n’ont besoin ni d’Express ni d’un serveur : `parseInput` est une fonction ordinaire
  qui lève une erreur. Tester au plus près du code est plus rapide et localise mieux les
  problèmes que de tout tester par HTTP.
:::

## Récapitulatif

- Node.js 24 exécute les tests TypeScript sans outil supplémentaire : `node --test` trouve les
  fichiers `*.test.ts` et tous les `.ts` des dossiers `test/`, sauf avec `--no-strip-types`.
- Les tests ne vérifient pas les types : `tsconfig.json` inclut `test/`, et `npm run check`
  enchaîne `tsc --noEmit` et `node --test`.
- Un module pur se teste par simples appels ; les données de test sont typées par les contrats,
  ce qui les garde complètes quand le contrat évolue.
- Les schémas se testent avec des entrées valides et invalides, en vérifiant **où** porte
  l’erreur.
- Une route se teste avec une application neuve par test, sur le port 0, en vérifiant statut et
  corps ; l’adresse du serveur se rétrécit, les réponses se valident avec les schémas du contrat.
- Un test doit pouvoir échouer : pas d’assertion conditionnelle, pas d’`assert.ok` sur un
  objet, pas d’`assert.throws` sans erreur attendue.
