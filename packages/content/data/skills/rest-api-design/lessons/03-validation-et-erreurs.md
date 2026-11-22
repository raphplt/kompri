---
title: Valider les entrées et renvoyer des erreurs utiles
summary: Écrire une fonction de validation, choisir entre 400, 415 et 422, et adopter un format d’erreur cohérent inspiré de la RFC 9457.
durationMinutes: 70
sources:
  - title: RFC 9457 — Problem Details for HTTP APIs
    url: https://www.rfc-editor.org/rfc/rfc9457
  - title: RFC 9110 — HTTP Semantics (400, 415, 422)
    url: https://www.rfc-editor.org/rfc/rfc9110
  - title: MDN — Codes de statut de réponse HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status
---

## Pourquoi valider côté serveur ?

L’API de la leçon précédente accepte des choses étranges. Avec `readBook`, un `PATCH`
contenant `{"available": "oui"}` met `available` à `false` sans rien dire, un titre fait
d’espaces est accepté, et une faute de frappe comme `"tilte"` est ignorée en silence.
Le client croit avoir réussi alors que les données sont fausses.

Le serveur est le **dernier rempart** : un formulaire HTML peut valider les champs, mais
n’importe qui peut envoyer une requête avec curl, un script ou une application modifiée.
La validation côté client améliore le confort ; **seule la validation côté serveur
protège les données**.

Une bonne validation :

1. vérifie le **type**, le **format** et les **bornes** de chaque champ ;
2. **normalise** ce qui doit l’être (espaces superflus) ;
3. rejette ce qui n’est pas prévu ;
4. signale **toutes** les erreurs d’un coup, champ par champ, dans un format que le
   client peut exploiter.

## Quel code de statut pour quelle erreur ?

Les erreurs liées au corps d’une requête se rangent en plusieurs catégories :

| Situation                                                  | Statut | Fondement      |
| ---------------------------------------------------------- | ------ | -------------- |
| Le corps n’est pas du JSON (`Content-Type` absent ou autre) | 415    | Norme          |
| Le JSON est syntaxiquement invalide (`{"title":`)          | 400    | Norme          |
| Le JSON est valide mais n’est pas un objet (`[1]`)          | 400    | Convention     |
| L’objet ne respecte pas les règles (titre vide, année texte) | 422 ou 400 | Convention |
| La donnée entre en conflit avec l’existant (code déjà pris) | 409    | Norme          |
| La ressource visée n’existe pas                            | 404    | Norme          |

### 400 ou 422 : une convention à choisir

La norme HTTP (RFC 9110) définit :

- **400 Bad Request** : le serveur ne peut pas ou ne veut pas traiter la requête à cause
  de ce qu’il considère comme une erreur du client, par exemple une syntaxe incorrecte ;
- **422 Unprocessable Content** : le serveur comprend le type de contenu, sa syntaxe
  est correcte, mais il ne peut pas traiter les instructions qu’il contient.

Les deux définitions se recouvrent pour une validation échouée : `{"year": "1863"}` est
du JSON correct dont le contenu est inacceptable. Deux conventions coexistent dans les
API publiques :

- **tout en 400** : simple, un seul code pour « ta requête est incorrecte » ;
- **400 pour la forme, 422 pour le fond** : 400 quand le message est illisible
  (JSON invalide, mauvais type de corps), 422 quand il est lisible mais que les données
  ne respectent pas les règles métier.

Il n’y a pas de réponse unique : ce cours choisit la seconde, parce qu’elle permet au
client de distinguer « mon code envoie n’importe quoi » de « l’utilisateur a mal rempli
un champ ». L’important est d’**être cohérent** dans toute l’API et de **documenter** le
choix. Tu remarqueras que Node.js affiche la ligne de statut `422 Unprocessable Entity` :
c’est l’ancien intitulé, la RFC 9110 parle désormais de « Unprocessable Content ». Seul le
code numérique compte pour les programmes.

## Un format d’erreur cohérent : les « Problem Details »

### Le problème des formats improvisés

Dans beaucoup d’API, chaque route invente son format d’erreur : `{ "error": "…" }` ici,
`{ "message": "…", "code": 12 }` ailleurs, du texte brut pour une 404. Le client doit
traiter chaque cas à part.

La **RFC 9457** (« Problem Details for HTTP APIs », publiée en 2023, qui remplace la
RFC 7807) propose un format standard pour décrire une erreur dans une réponse HTTP. Il est
servi avec le type de média `application/problem+json` et contient ces membres, tous
facultatifs :

| Membre     | Rôle                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `type`     | URI qui identifie la **catégorie** de problème. Absent, il vaut `about:blank`.    |
| `title`    | Résumé court de la catégorie ; ne change pas d’une occurrence à l’autre.          |
| `status`   | Le code HTTP, recopié pour commodité ; il doit être identique au statut réel.     |
| `detail`   | Explication propre à **cette** occurrence, pour aider le client à corriger.      |
| `instance` | URI qui identifie cette occurrence précise du problème.                          |

On peut ajouter des **membres d’extension** : la RFC donne elle-même l’exemple d’un
tableau `errors` qui détaille chaque erreur de validation.

Quelques règles de la RFC utiles en pratique :

- avec `type` égal à `about:blank`, le problème n’a pas d’autre sens que le code HTTP,
  et `title` devrait être l’intitulé standard du code (« Not Found » pour 404), éventuellement
  traduit ;
- un `type` propre à ton API est de préférence une URI absolue, idéalement une page de
  documentation ; une URI relative est permise si elle contient le chemin complet
  (comme `/problems/validation-error`) ;
- le client ne devrait pas analyser le texte de `detail` : les informations exploitables
  par un programme vont dans des membres d’extension.

Voici ce que produira notre API pour une création invalide :

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json; charset=utf-8

{"type":"/problems/validation-error","title":"Données invalides","status":422,"detail":"Certains champs sont invalides.","errors":[{"field":"year","message":"Entier entre 1000 et 2026."}],"instance":"/api/books"}
```

Ici, `instance` contient le chemin de la requête : c’est un choix simple et courant,
qui aide à relier l’erreur à la requête dans les journaux.

## Mise en œuvre

On repart du projet de la leçon précédente. Trois fichiers sont ajoutés
(`validation/book.js`, `middlewares/json-body.js`) ou réécrits (`errors.js`,
`middlewares/error-handler.js`), et le routeur change légèrement.

### Des erreurs qui portent leurs extensions

```js
// src/errors.js
export class HttpError extends Error {
  // extensions : champs supplémentaires du « problem details » (type, title, errors…)
  constructor(status, detail, extensions = {}) {
    super(detail);
    this.name = 'HttpError';
    this.status = status;
    this.extensions = extensions;
  }
}

export function validationError(errors) {
  return new HttpError(422, 'Certains champs sont invalides.', {
    type: '/problems/validation-error',
    title: 'Données invalides',
    errors,
  });
}
```

La signature `new HttpError(404, message)` reste valable : les routes existantes ne
changent pas.

### La fonction de validation

```js
// src/validation/book.js
const CODE_PATTERN = /^[A-Z]{3}-\d{3}$/;
const ALLOWED_FIELDS = ['code', 'title', 'author', 'year', 'available'];

function checkText(input, field, maxLength, errors, value) {
  const raw = input[field];
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors.push({ field, message: 'Texte obligatoire.' });
  } else if (raw.trim().length > maxLength) {
    errors.push({ field, message: `${maxLength} caractères au maximum.` });
  } else {
    value[field] = raw.trim();
  }
}

/**
 * Valide un livre reçu du client.
 * partial = true pour PATCH : seuls les champs présents sont contrôlés.
 * Renvoie { value, errors } : value ne contient que des champs valides et normalisés.
 */
export function validateBook(input, { partial = false } = {}) {
  const errors = [];
  const value = {};

  for (const field of Object.keys(input)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      errors.push({ field, message: 'Champ inconnu.' });
    }
  }

  const has = (field) => input[field] !== undefined;

  if (!partial || has('code')) {
    if (typeof input.code !== 'string' || !CODE_PATTERN.test(input.code)) {
      errors.push({
        field: 'code',
        message: 'Format attendu : trois majuscules, un tiret, trois chiffres (ex. HUG-001).',
      });
    } else {
      value.code = input.code;
    }
  }
  if (!partial || has('title')) {
    checkText(input, 'title', 200, errors, value);
  }
  if (!partial || has('author')) {
    checkText(input, 'author', 100, errors, value);
  }
  if (!partial || has('year')) {
    const maxYear = new Date().getFullYear();
    if (!Number.isInteger(input.year) || input.year < 1000 || input.year > maxYear) {
      errors.push({ field: 'year', message: `Entier entre 1000 et ${maxYear}.` });
    } else {
      value.year = input.year;
    }
  }
  if (has('available')) {
    if (typeof input.available !== 'boolean') {
      errors.push({ field: 'available', message: 'Booléen attendu (true ou false).' });
    } else {
      value.available = input.available;
    }
  } else if (!partial) {
    value.available = true;
  }

  return { value, errors };
}
```

Les choix de conception :

- **Une fonction pure** : elle reçoit une donnée et renvoie un résultat, sans toucher à
  Express ni au stockage. Elle se teste seule, sans serveur.
- **`{ value, errors }`** : `errors` accumule **toutes** les erreurs, pour que le client
  corrige tout en une fois. `value` ne contient que des champs contrôlés et normalisés :
  c’est lui, et jamais `req.body`, qui sera enregistré.
- **Liste blanche** des champs : un champ inconnu est une erreur. C’est une politique
  **stricte** qui attrape les fautes de frappe (`tilte`) et empêche un client d’envoyer
  `id`. Une politique **tolérante** (ignorer les champs inconnus) existe aussi ; elle
  facilite l’évolution des clients mais masque leurs erreurs. Choisis et documente.
- **Types exacts** : `Number.isInteger(input.year)` refuse `"1863"` (une chaîne) et
  `1862.5`. On ne convertit pas en silence : un client qui envoie le mauvais type a un
  bug, autant le lui dire. (Pour la query string, au contraire, tout arrive en chaîne et
  la conversion est obligatoire : voir la leçon suivante.)
- **Bornes** : longueurs maximales et années plausibles. Sans limite, un client pourrait
  stocker un titre de plusieurs mégaoctets.
- **`partial`** : pour `PATCH`, un champ absent n’est pas une erreur ; un champ présent
  est contrôlé comme pour `POST`.

Teste la fonction seule avec un petit script, sans lancer le serveur :

```js
// try-validation.js
import { validateBook } from './src/validation/book.js';

console.log(validateBook({ code: 'HUG-001', title: ' Les Misérables ', author: 'Victor Hugo', year: 1862 }));
console.log(validateBook({ year: 1863 }, { partial: true }));
console.log(validateBook({ title: 42, year: 1862.5 }, { partial: true }).errors);
```

```bash
node try-validation.js
```

```text
{
  value: {
    code: 'HUG-001',
    title: 'Les Misérables',
    author: 'Victor Hugo',
    year: 1862,
    available: true
  },
  errors: []
}
{ value: { year: 1863 }, errors: [] }
[
  { field: 'title', message: 'Texte obligatoire.' },
  { field: 'year', message: 'Entier entre 1000 et 2026.' }
]
```

L’année maximale est calculée à l’exécution : le message affiche l’année en cours.

### Exiger un objet JSON

Avant de valider les champs, il faut s’assurer que le corps est bien un objet JSON :

```js
// src/middlewares/json-body.js
import { HttpError } from '../errors.js';

// Pour POST, PUT et PATCH : exige un corps JSON qui soit un objet.
export function requireJsonObject(req, res, next) {
  if (!req.is('application/json')) {
    throw new HttpError(415, 'Envoie le corps en JSON avec l’en-tête Content-Type: application/json.');
  }
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    throw new HttpError(400, 'Le corps doit être un objet JSON.');
  }
  next();
}
```

Rappel : `express.json()` laisse `req.body` à `undefined` si le `Content-Type` n’est pas
JSON, et accepte un tableau. Ce middleware transforme ces cas en erreurs explicites. Le
`throw` dans un middleware synchrone est transmis au gestionnaire d’erreurs.

### Le gestionnaire d’erreurs au format Problem Details

```js
// src/middlewares/error-handler.js
import { STATUS_CODES } from 'node:http';
import { HttpError } from '../errors.js';

export function notFound(req, res, next) {
  next(new HttpError(404, `Aucune route ne correspond à ${req.method} ${req.path}.`));
}

function toProblem(err) {
  if (err instanceof HttpError) {
    return { status: err.status, detail: err.message, ...err.extensions };
  }
  if (err.type === 'entity.parse.failed') {
    return { status: 400, detail: 'Le corps de la requête n’est pas un JSON valide.' };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, detail: 'Le corps de la requête est trop volumineux.' };
  }
  return null;
}

// Toutes les erreurs au format « Problem Details » (RFC 9457)
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  let problem = toProblem(err);
  if (!problem) {
    console.error(err);
    problem = { status: 500, detail: 'Une erreur inattendue est survenue.' };
  }
  const body = {
    type: problem.type ?? 'about:blank',
    title: problem.title ?? STATUS_CODES[problem.status],
    ...problem,
    instance: req.originalUrl,
  };
  res.status(problem.status).type('application/problem+json').json(body);
}
```

- `STATUS_CODES` (module `node:http`) associe chaque code à son intitulé standard :
  `STATUS_CODES[404]` vaut `'Not Found'`. C’est le `title` recommandé avec `about:blank`.
  Node.js garde quelques anciens intitulés : `STATUS_CODES[413]` vaut
  `'Payload Too Large'`, que la RFC 9110 appelle désormais « Content Too Large ».
- `res.type('application/problem+json')` fixe le type **avant** `res.json()`, qui le
  conserve au lieu de mettre `application/json`.
- Les erreurs imprévues deviennent une 500 au message neutre ; le détail reste dans le
  journal du serveur.

### Le routeur

Seules les routes qui reçoivent un corps changent : elles passent par
`requireJsonObject`, puis par la validation.

```js
// src/routes/books.js
import { Router } from 'express';
import { HttpError, validationError } from '../errors.js';
import { requireJsonObject } from '../middlewares/json-body.js';
import {
  createBook,
  deleteBook,
  findBookByCode,
  getBook,
  listBooks,
  replaceBook,
} from '../store/books-store.js';
import { validateBook } from '../validation/book.js';

export const booksRouter = Router();

function findBookOr404(idParam) {
  const book = getBook(Number(idParam));
  if (!book) {
    throw new HttpError(404, `Le livre ${idParam} n’existe pas.`);
  }
  return book;
}

function ensureCodeIsFree(code, currentId) {
  const existing = findBookByCode(code);
  if (existing && existing.id !== currentId) {
    throw new HttpError(409, `Le code ${code} est déjà utilisé par le livre ${existing.id}.`);
  }
}

function validOrThrow(input, options) {
  const { value, errors } = validateBook(input, options);
  if (errors.length > 0) {
    throw validationError(errors);
  }
  return value;
}

booksRouter.get('/', (req, res) => {
  res.json(listBooks());
});

booksRouter.get('/:id', (req, res) => {
  res.json(findBookOr404(req.params.id));
});

booksRouter.post('/', requireJsonObject, (req, res) => {
  const data = validOrThrow(req.body);
  ensureCodeIsFree(data.code);
  const book = createBook(data);
  res.status(201).location(`${req.baseUrl}/${book.id}`).json(book);
});

booksRouter.put('/:id', requireJsonObject, (req, res) => {
  const current = findBookOr404(req.params.id);
  const data = validOrThrow(req.body);
  ensureCodeIsFree(data.code, current.id);
  res.json(replaceBook(current.id, data));
});

booksRouter.patch('/:id', requireJsonObject, (req, res) => {
  const current = findBookOr404(req.params.id);
  const changes = validOrThrow(req.body, { partial: true });
  if (changes.code !== undefined) {
    ensureCodeIsFree(changes.code, current.id);
  }
  res.json(replaceBook(current.id, { ...current, ...changes }));
});

booksRouter.delete('/:id', (req, res) => {
  const book = findBookOr404(req.params.id);
  deleteBook(book.id);
  res.sendStatus(204);
});
```

L’ordre des contrôles a un sens : d’abord la forme (415, 400), puis l’existence (404),
puis le contenu (422), enfin la cohérence avec les autres données (409). Pour `PATCH`,
la fusion `{ ...current, ...changes }` ne porte plus que sur des champs validés.

### Vérification avec curl

Relance le serveur, puis :

```bash
curl -s -i --json '{"code":"ver-1","title":"  ","year":"1863","tilte":"Cinq semaines"}' http://localhost:3000/api/books
```

```http
HTTP/1.1 422 Unprocessable Entity
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 461
ETag: W/"1cd-U0uV0NNf37M54JMQMyRePTMd5dk"
Date: Sat, 21 Nov 2026 21:52:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"/problems/validation-error","title":"Données invalides","status":422,"detail":"Certains champs sont invalides.","errors":[{"field":"tilte","message":"Champ inconnu."},{"field":"code","message":"Format attendu : trois majuscules, un tiret, trois chiffres (ex. HUG-001)."},{"field":"title","message":"Texte obligatoire."},{"field":"author","message":"Texte obligatoire."},{"field":"year","message":"Entier entre 1000 et 2026."}],"instance":"/api/books"}
```

Cinq erreurs signalées d’un coup. Les autres cas :

```bash
curl -s --json '{"code":"VER-001","title":"  Cinq semaines en ballon ","author":"Jules Verne","year":1863}' http://localhost:3000/api/books
curl -s --json '{"code":"ZOL-001","title":"Copie","author":"X","year":1900}' http://localhost:3000/api/books
curl -s -X POST -d 'title=x' http://localhost:3000/api/books
curl -s --json '[1]' http://localhost:3000/api/books
curl -s --json '{oops' http://localhost:3000/api/books
curl -s http://localhost:3000/api/books/42
curl -s -X PATCH --json '{"available":"oui","id":99}' http://localhost:3000/api/books/1
```

```text
{"id":8,"code":"VER-001","title":"Cinq semaines en ballon","author":"Jules Verne","year":1863,"available":true}
{"type":"about:blank","title":"Conflict","status":409,"detail":"Le code ZOL-001 est déjà utilisé par le livre 3.","instance":"/api/books"}
{"type":"about:blank","title":"Unsupported Media Type","status":415,"detail":"Envoie le corps en JSON avec l’en-tête Content-Type: application/json.","instance":"/api/books"}
{"type":"about:blank","title":"Bad Request","status":400,"detail":"Le corps doit être un objet JSON.","instance":"/api/books"}
{"type":"about:blank","title":"Bad Request","status":400,"detail":"Le corps de la requête n’est pas un JSON valide.","instance":"/api/books"}
{"type":"about:blank","title":"Not Found","status":404,"detail":"Le livre 42 n’existe pas.","instance":"/api/books/42"}
{"type":"/problems/validation-error","title":"Données invalides","status":422,"detail":"Certains champs sont invalides.","errors":[{"field":"id","message":"Champ inconnu."},{"field":"available","message":"Booléen attendu (true ou false)."}],"instance":"/api/books/1"}
```

Le titre a été nettoyé de ses espaces. Toutes les erreurs ont désormais **la même forme**,
quelle que soit leur origine : route, middleware, `express.json()` ou route inconnue.

## Et les bibliothèques de validation ?

Écrire la validation à la main, comme ici, apprend ce qu’elle doit faire. Dans un vrai
projet, on utilise souvent une bibliothèque qui décrit le **schéma** attendu de façon
déclarative : **Zod**, **Joi**, ou **Ajv** (qui valide selon la spécification JSON Schema,
sur laquelle s’appuie aussi OpenAPI). Par exemple, avec Zod 4, le même contrôle s’écrirait :

```js
import { z } from 'zod';

const BookInput = z.strictObject({
  code: z.string().regex(/^[A-Z]{3}-\d{3}$/),
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(100),
  year: z.number().int().min(1000),
  available: z.boolean().default(true),
});

const result = BookInput.safeParse({ code: 'ver-1', title: '  ', year: '1870' });
console.log(result.success);
console.log(result.error.issues.map((issue) => issue.path.join('.')));
```

```text
false
[ 'code', 'title', 'author', 'year' ]
```

Ce cours n’en dépend pas : notre fonction suffit, et tu sais maintenant ce qu’une telle
bibliothèque fait pour toi. Avant d’en ajouter une à un projet, vérifie sa version, sa
maintenance et la façon dont elle formule les erreurs.

## Pièges courants

- **Valider seulement côté client** : n’importe qui peut appeler l’API directement.
- **Enregistrer `req.body`** au lieu de la valeur validée : les champs non contrôlés
  passent.
- **S’arrêter à la première erreur** : le client corrige, renvoie, découvre la suivante…
- **Conversions silencieuses** (`Number(input.year)`, `Boolean("false")` qui vaut
  `true`) : elles masquent les bugs des clients.
- **Oublier les bornes** (longueur, valeurs extrêmes).
- **Mélanger les formats d’erreur** selon les routes.
- **Renvoyer des détails internes** (pile, message d’exception, requête SQL) dans
  `detail`.
- **Utiliser 500 pour une erreur du client** : 5xx signifie « le serveur a échoué ».

## Exercices

### Exercice 1 — Un champ facultatif

Ajoute un champ facultatif `pages` : un entier entre 1 et 10000. Il est accepté par
`POST`, `PUT` et `PATCH`, et rejeté avec un message clair s’il est invalide. Quelles
lignes de `validateBook` modifies-tu ?

:::solution

Deux modifications dans `src/validation/book.js`. Ajouter le champ à la liste blanche :

```js
const ALLOWED_FIELDS = ['code', 'title', 'author', 'year', 'available', 'pages'];
```

Puis ajouter son contrôle, par exemple juste avant celui de `available` :

```js
if (has('pages')) {
  if (!Number.isInteger(input.pages) || input.pages < 1 || input.pages > 10000) {
    errors.push({ field: 'pages', message: 'Entier entre 1 et 10000.' });
  } else {
    value.pages = input.pages;
  }
}
```

```bash
curl -s --json '{"code":"TST-001","title":"Livre de test","author":"Ada","year":2020,"pages":0}' http://localhost:3000/api/books
curl -s --json '{"code":"TST-001","title":"Livre de test","author":"Ada","year":2020,"pages":320}' http://localhost:3000/api/books
curl -s -X PATCH --json '{"pages":"320"}' http://localhost:3000/api/books/1
```

```text
{"type":"/problems/validation-error","title":"Données invalides","status":422,"detail":"Certains champs sont invalides.","errors":[{"field":"pages","message":"Entier entre 1 et 10000."}],"instance":"/api/books"}
{"id":8,"code":"TST-001","title":"Livre de test","author":"Ada","year":2020,"pages":320,"available":true}
{"type":"/problems/validation-error","title":"Données invalides","status":422,"detail":"Certains champs sont invalides.","errors":[{"field":"pages","message":"Entier entre 1 et 10000."}],"instance":"/api/books/1"}
```

- Le champ est contrôlé seulement s’il est présent (`has('pages')`), quel que soit
  `partial` : il est facultatif partout.
- Sans l’ajout à `ALLOWED_FIELDS`, `pages` serait refusé comme « Champ inconnu. ».
- Le routeur ne change pas : c’est l’intérêt d’avoir isolé la validation.
- Attention à `PUT` : un livre qui avait des pages et qui est remplacé sans ce champ
  les perd. C’est le sens de « remplacer ».

:::

### Exercice 2 — Valider un adhérent

Écris `validateMember(input)` dans `src/validation/member.js`, sur le même modèle que
`validateBook` : champs autorisés `name` (texte obligatoire, 100 caractères au plus) et
`email` (normalisé en minuscules sans espaces autour ; doit contenir un `@` qui n’est ni
le premier ni le dernier caractère, pas d’espace, 254 caractères au plus). Teste-la avec
un script.

:::solution

```js
// src/validation/member.js
export function validateMember(input) {
  const errors = [];
  const value = {};

  for (const field of Object.keys(input)) {
    if (field !== 'name' && field !== 'email') {
      errors.push({ field, message: 'Champ inconnu.' });
    }
  }

  if (typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push({ field: 'name', message: 'Texte obligatoire.' });
  } else if (input.name.trim().length > 100) {
    errors.push({ field: 'name', message: '100 caractères au maximum.' });
  } else {
    value.name = input.name.trim();
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1 || email.includes(' ') || email.length > 254) {
    errors.push({ field: 'email', message: 'Adresse électronique invalide.' });
  } else {
    value.email = email;
  }

  return { value, errors };
}
```

```js
// try-member.js
import { validateMember } from './src/validation/member.js';

console.log(validateMember({ name: ' Ada ', email: ' Ada@Example.org ' }));
console.log(validateMember({ name: '', email: 'ada@', role: 'admin' }));
console.log(validateMember({ email: '@example.org' }).errors);
```

```text
{ value: { name: 'Ada', email: 'ada@example.org' }, errors: [] }
{
  value: {},
  errors: [
    { field: 'role', message: 'Champ inconnu.' },
    { field: 'name', message: 'Texte obligatoire.' },
    { field: 'email', message: 'Adresse électronique invalide.' }
  ]
}
[
  { field: 'name', message: 'Texte obligatoire.' },
  { field: 'email', message: 'Adresse électronique invalide.' }
]
```

- Un type inattendu (`email: 42`) devient une chaîne vide, donc invalide : pas de
  plantage sur `.trim()`.
- `indexOf('@')` vaut `-1` sans arobase et `0` s’il est en premier : `at < 1` couvre
  les deux.
- Le champ `role` est refusé : un client ne doit pas pouvoir se donner un rôle en
  l’ajoutant au corps. C’est un exemple concret de l’intérêt de la liste blanche.
- Dans la route, on utilise `validationError(errors)` pour répondre 422 au même format.

:::

### Exercice 3 — Classer les erreurs

Avec les conventions de cette leçon, quel statut renvoie l’API pour chaque requête ?

```text
1. POST  /api/books   Content-Type: text/plain        corps : Germinal
2. POST  /api/books   Content-Type: application/json  corps : {"title": "Germinal",}
3. POST  /api/books   Content-Type: application/json  corps : {"code":"ZOL-001","title":"G","author":"Z","year":1885}
4. POST  /api/books   Content-Type: application/json  corps : {"code":"ZOL-009","title":"G","author":"Z","year":"1885"}
5. PATCH /api/books/1 Content-Type: application/json  corps : {}
6. PUT   /api/books/99 Content-Type: application/json corps : un livre valide
7. GET   /api/books/1 alors que le serveur a un bug qui lève une TypeError
```

:::solution

```text
1. 415  le corps n’est pas annoncé comme du JSON
2. 400  JSON syntaxiquement invalide (virgule finale) : erreur levée par express.json()
3. 409  données valides, mais le code ZOL-001 appartient déjà au livre 3
4. 422  JSON valide, mais year est une chaîne
5. 200  aucun champ à modifier : le livre est renvoyé inchangé
6. 404  le livre 99 n’existe pas (vérifié avant le contenu)
7. 500  erreur du serveur, message neutre, détail dans le journal
```

Pour le cas 5, on pourrait aussi décider de refuser un `PATCH` vide avec 422 : c’est
une règle de conception, à documenter. Pour le cas 6, si le corps était **aussi**
invalide, la réponse resterait 404, parce que la route vérifie l’existence en premier.

:::

## Récapitulatif

- La validation côté serveur est obligatoire ; celle du client n’est qu’un confort.
- Une fonction de validation pure renvoie `{ value, errors }` : toutes les erreurs d’un
  coup, et une valeur normalisée qui seule sera enregistrée.
- Liste blanche des champs, types exacts sans conversion silencieuse, bornes de taille.
- 415 pour un mauvais type de contenu, 400 pour un message illisible, 422 (ou 400 selon
  la convention choisie) pour des données qui ne respectent pas les règles, 409 pour un
  conflit, 404 pour une ressource absente, 500 pour une panne du serveur.
- La RFC 9457 définit un format d’erreur standard, `application/problem+json`, avec
  `type`, `title`, `status`, `detail`, `instance` et des extensions comme `errors`.
- Un gestionnaire d’erreurs central garantit le même format partout.
- Zod, Joi ou Ajv automatisent la validation ; comprendre la version manuelle permet de
  bien les utiliser.
