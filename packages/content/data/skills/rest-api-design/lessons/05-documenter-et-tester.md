---
title: Documenter et tester une API
summary: Rédiger une documentation utile, décrire l’API avec OpenAPI et vérifier son comportement avec des requêtes reproductibles.
durationMinutes: 60
sources:
  - title: Spécification OpenAPI 3.1.0
    url: https://spec.openapis.org/oas/v3.1.0
  - title: curl — manuel de la ligne de commande
    url: https://curl.se/docs/manpage.html
  - title: RFC 9457 — Problem Details for HTTP APIs
    url: https://www.rfc-editor.org/rfc/rfc9457
  - title: Node.js — Documentation de fetch et des API globales
    url: https://nodejs.org/api/globals.html
---

## Une API sans documentation n’existe pas vraiment

Tu as conçu une API cohérente : ressources claires, statuts justes, validation, erreurs
au format Problem Details, pagination. Mais un développeur qui veut l’utiliser ne lit
pas ton code. Il a besoin de savoir, sans deviner :

- quelles ressources existent et à quelles URL ;
- quels paramètres et quels corps chaque opération accepte ;
- quels statuts et quels corps il recevra, **y compris en cas d’erreur** ;
- quelles conventions tu as choisies (422 pour la validation, enveloppe de pagination,
  champs inconnus refusés…).

Et toi, tu as besoin de **vérifier** que l’API respecte ce contrat, aujourd’hui et après
chaque modification. Cette leçon traite les deux faces : documenter, puis tester avec des
requêtes **reproductibles**.

## Documenter pour des humains : le README

La documentation minimale tient dans le fichier `README.md` du projet. Voici un extrait
de ce qu’on attend pour l’API de la bibliothèque :

```text
# API de la bibliothèque

Démarrage : npm install, puis npm start (port 3000 par défaut, variable PORT).
Les données sont en mémoire et réinitialisées à chaque démarrage.

## Conventions
- Corps de requête et de réponse en JSON ; en-tête Content-Type: application/json.
- Erreurs au format Problem Details (RFC 9457), type application/problem+json.
- 400 : requête illisible ou paramètre de requête invalide ; 422 : données invalides,
  détaillées dans le tableau errors ; 409 : code d'inventaire déjà utilisé.
- Champs inconnus refusés (422).

## Livres
| Méthode | URL             | Corps        | Succès          | Erreurs            |
| ------- | --------------- | ------------ | --------------- | ------------------ |
| GET     | /api/books      | —            | 200 page        | 400                |
| POST    | /api/books      | livre        | 201 + Location  | 400, 409, 415, 422 |
| GET     | /api/books/:id  | —            | 200             | 404                |
| PUT     | /api/books/:id  | livre        | 200             | 400, 404, 409, 415, 422 |
| PATCH   | /api/books/:id  | champs       | 200             | 400, 404, 409, 415, 422 |
| DELETE  | /api/books/:id  | —            | 204             | 404                |

Paramètres de GET /api/books : page (1), limit (10, max 50), author, q, available
(true|false), sort (id, title, author, year ; préfixe - pour décroissant).

Exemple :
curl -s 'http://localhost:3000/api/books?author=zola&sort=-year'
```

Ce qui rend une documentation utile : des **exemples copiables** avec leur réponse, les
**erreurs** autant que les succès, et les **choix de conception** écrits noir sur blanc.
Le danger : la documentation écrite à la main **dérive** du code au fil des
modifications. D’où l’intérêt d’une description structurée que des outils peuvent
exploiter et vérifier.

## Décrire l’API pour des machines : OpenAPI

**OpenAPI** est une spécification qui décrit une API HTTP dans un document JSON ou YAML :
chemins, méthodes, paramètres, corps, réponses, schémas des données. Elle s’appelait
auparavant *Swagger*, nom resté attaché à plusieurs outils. Un tel document permet :

- de générer une **documentation interactive** (par exemple avec Swagger UI ou Redoc),
  où l’on peut essayer chaque requête ;
- de **valider** automatiquement des requêtes et des réponses ;
- de **générer** du code client dans différents langages ;
- de partager un **contrat** entre l’équipe qui fait l’API et celles qui l’utilisent.

Les schémas de données d’OpenAPI 3.1 s’appuient sur JSON Schema : `type`, `required`,
`minLength`, `pattern`, `additionalProperties`… Tu y reconnaîtras les règles de
`validateBook`. Voici une description partielle de notre API (liste, création et lecture
d’un livre), dans un fichier `openapi.json` :

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "API de la bibliothèque",
    "version": "1.0.0",
    "description": "Catalogue de livres stocké en mémoire."
  },
  "servers": [{ "url": "http://localhost:3000/api" }],
  "paths": {
    "/books": {
      "get": {
        "summary": "Lister les livres (pagination, filtres, tri)",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "minimum": 1, "default": 1 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 50, "default": 10 } },
          { "name": "author", "in": "query", "schema": { "type": "string" }, "description": "Partie du nom de l’auteur, sans tenir compte de la casse." },
          { "name": "available", "in": "query", "schema": { "type": "boolean" } },
          { "name": "q", "in": "query", "schema": { "type": "string" }, "description": "Partie du titre." },
          {
            "name": "sort",
            "in": "query",
            "schema": { "type": "string", "enum": ["id", "-id", "title", "-title", "author", "-author", "year", "-year"], "default": "id" }
          }
        ],
        "responses": {
          "200": {
            "description": "Une page de livres",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BookPage" } } }
          },
          "400": { "$ref": "#/components/responses/Problem" }
        }
      },
      "post": {
        "summary": "Créer un livre",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BookInput" } } }
        },
        "responses": {
          "201": {
            "description": "Livre créé",
            "headers": {
              "Location": { "description": "URL du nouveau livre", "schema": { "type": "string" } }
            },
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Book" } } }
          },
          "400": { "$ref": "#/components/responses/Problem" },
          "409": { "$ref": "#/components/responses/Problem" },
          "415": { "$ref": "#/components/responses/Problem" },
          "422": { "$ref": "#/components/responses/Problem" }
        }
      }
    },
    "/books/{id}": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }],
      "get": {
        "summary": "Lire un livre",
        "responses": {
          "200": {
            "description": "Le livre",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Book" } } }
          },
          "404": { "$ref": "#/components/responses/Problem" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "BookInput": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "title", "author", "year"],
        "properties": {
          "code": { "type": "string", "pattern": "^[A-Z]{3}-\\d{3}$", "examples": ["HUG-001"] },
          "title": { "type": "string", "minLength": 1, "maxLength": 200 },
          "author": { "type": "string", "minLength": 1, "maxLength": 100 },
          "year": { "type": "integer", "minimum": 1000 },
          "available": { "type": "boolean", "default": true }
        }
      },
      "Book": {
        "type": "object",
        "required": ["id", "code", "title", "author", "year", "available"],
        "properties": {
          "id": { "type": "integer" },
          "code": { "type": "string", "examples": ["HUG-001"] },
          "title": { "type": "string" },
          "author": { "type": "string" },
          "year": { "type": "integer" },
          "available": { "type": "boolean" }
        }
      },
      "BookPage": {
        "type": "object",
        "properties": {
          "data": { "type": "array", "items": { "$ref": "#/components/schemas/Book" } },
          "pagination": {
            "type": "object",
            "properties": {
              "page": { "type": "integer" },
              "limit": { "type": "integer" },
              "totalItems": { "type": "integer" },
              "totalPages": { "type": "integer" }
            }
          }
        }
      },
      "Problem": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "title": { "type": "string" },
          "status": { "type": "integer" },
          "detail": { "type": "string" },
          "instance": { "type": "string" },
          "errors": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": { "field": { "type": "string" }, "message": { "type": "string" } }
            }
          }
        }
      }
    },
    "responses": {
      "Problem": {
        "description": "Erreur au format Problem Details (RFC 9457)",
        "content": { "application/problem+json": { "schema": { "$ref": "#/components/schemas/Problem" } } }
      }
    }
  }
}
```

Comment le lire :

- `servers` donne l’URL de base ; chaque clé de `paths` est un chemin relatif à elle.
  `{id}` est un paramètre de chemin (la syntaxe d’OpenAPI, différente du `:id`
  d’Express).
- Sous chaque méthode, `parameters` décrit la query string, `requestBody` le corps
  attendu, `responses` chaque statut possible.
- `components` regroupe ce qui est réutilisé : schémas (`BookInput`, `Book`…) et réponses
  (`Problem`). `$ref` y fait référence, comme un import.
- `additionalProperties: false` traduit notre refus des champs inconnus ; `required`, nos
  champs obligatoires ; `pattern`, le format du code. Dans une chaîne JSON, la barre
  oblique inverse est doublée : `\\d` représente `\d`.
- `Book` décrit ce que le serveur renvoie : tous les champs, `id` compris. On ne peut pas
  l’écrire comme « `BookInput` plus un `id` » avec `allOf` (« toutes ces conditions ») :
  le `additionalProperties: false` de `BookInput` refuserait alors le champ `id`, et
  aucun livre réel ne serait valide. C’est un piège classique de JSON Schema.

Ce document a été vérifié avec un validateur OpenAPI. Il est volontairement incomplet :
l’exercice 1 te fait ajouter `PATCH` et `DELETE`. Dans un vrai projet, on peut écrire ce
fichier à la main (souvent en YAML, plus lisible), ou le générer à partir du code ou des
schémas de validation. Quelle que soit la méthode, il faut une étape qui vérifie que le
document et le comportement réel concordent : c’est le rôle des tests.

## Tester à la main avec curl

Tu utilises curl depuis le début du parcours. Quelques options sont particulièrement
utiles pour tester une API :

| Option                 | Effet                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `-s`                   | Silencieux : pas de barre de progression.                          |
| `-i`                   | Affiche la ligne de statut et les en-têtes de la réponse.          |
| `-X MÉTHODE`           | Choisit la méthode (`PUT`, `PATCH`, `DELETE`…).                     |
| `-H 'Nom: valeur'`     | Ajoute un en-tête.                                                 |
| `-d 'données'`         | Envoie un corps (et passe en `POST` si `-X` est absent).           |
| `--json 'données'`     | Envoie du JSON avec les en-têtes `Content-Type` et `Accept` adaptés. |
| `-o /dev/null`         | Jette le corps de la réponse.                                      |
| `-w '%{http_code}'`    | Affiche des informations après la réponse, ici le code de statut. |

Par exemple, pour n’afficher que le statut :

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/books/999
```

```text
404
```

Pratique pour explorer, mais une suite de commandes tapées à la main n’est pas
**reproductible** : impossible de garantir qu’on a refait exactement les mêmes vérifications
après une modification.

## Un fichier de requêtes

Plusieurs éditeurs (par exemple avec l’extension REST Client de Visual Studio Code, ou
le client HTTP intégré aux IDE de JetBrains) savent exécuter des requêtes écrites dans un
fichier texte d’extension `.http`. Chaque requête est séparée par une ligne qui commence
par `###`, suivie de la ligne de requête, des en-têtes, d’une ligne vide et du corps :

```http
### Lister les livres disponibles, triés par titre
GET http://localhost:3000/api/books?available=true&sort=title
Accept: application/json

### Créer un livre
POST http://localhost:3000/api/books
Content-Type: application/json

{"code":"TST-001","title":"Livre de test","author":"Ada","year":2020}

### Erreur de validation attendue (422)
POST http://localhost:3000/api/books
Content-Type: application/json

{"code":"x","year":"2020"}

### Supprimer le livre 2
DELETE http://localhost:3000/api/books/2
```

Ce fichier, versionné avec le projet, sert de documentation vivante : un nouveau venu
l’ouvre et rejoue chaque exemple d’un clic. Chaque outil ajoute ses propres extensions
(variables, scripts), propres à cet outil : reste sur la syntaxe de base pour qu’il
fonctionne partout. En revanche, ce fichier ne **vérifie** rien tout seul : c’est toi qui
lis les réponses.

## Un script de tests avec curl

Pour vérifier automatiquement, écris un script qui compare chaque statut obtenu au statut
attendu, et qui se termine avec un code de sortie non nul en cas d’échec (ce qui permet de
l’utiliser dans une intégration continue) :

```bash
#!/usr/bin/env bash
# Tests reproductibles de l'API : à lancer serveur démarré, données d'exemple chargées.
# Usage : ./api-test.sh [url_de_base]
set -u
BASE_URL="${1:-http://localhost:3000/api}"
failures=0

# check "description" statut_attendu statut_obtenu
check() {
  if [ "$2" = "$3" ]; then
    echo "OK    $1 ($3)"
  else
    echo "ÉCHEC $1 : attendu $2, obtenu $3"
    failures=$((failures + 1))
  fi
}

# status MÉTHODE CHEMIN [CORPS_JSON] : affiche seulement le code de statut
status() {
  if [ $# -ge 3 ]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$1" -H 'Content-Type: application/json' -d "$3" "$BASE_URL$2"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$1" "$BASE_URL$2"
  fi
}

check "liste paginée" 200 "$(status GET '/books?limit=2&sort=-year')"
check "paramètre invalide" 400 "$(status GET '/books?limit=500')"
check "livre existant" 200 "$(status GET /books/1)"
check "livre inexistant" 404 "$(status GET /books/999)"
check "création" 201 "$(status POST /books '{"code":"TST-001","title":"Livre de test","author":"Ada","year":2020}')"
check "code déjà pris" 409 "$(status POST /books '{"code":"TST-001","title":"Doublon","author":"Ada","year":2020}')"
check "données invalides" 422 "$(status POST /books '{"code":"x","year":"2020"}')"
check "JSON mal formé" 400 "$(status POST /books '{"title":')"
check "modification partielle" 200 "$(status PATCH /books/1 '{"available":false}')"
check "suppression" 204 "$(status DELETE /books/2)"
check "suppression répétée" 404 "$(status DELETE /books/2)"

echo "$failures échec(s)"
[ "$failures" -eq 0 ]
```

Rends-le exécutable avec `chmod +x api-test.sh`, démarre le serveur avec `npm start` dans
un terminal, puis lance le script dans un autre :

```bash
./api-test.sh
echo "code de sortie : $?"
```

```text
OK    liste paginée (200)
OK    paramètre invalide (400)
OK    livre existant (200)
OK    livre inexistant (404)
OK    création (201)
OK    code déjà pris (409)
OK    données invalides (422)
OK    JSON mal formé (400)
OK    modification partielle (200)
OK    suppression (204)
OK    suppression répétée (404)
0 échec(s)
code de sortie : 0
```

Quelques détails du script :

- `set -u` arrête le script si une variable non définie est utilisée (une faute de frappe
  dans un nom de variable, par exemple).
- `"${1:-http://localhost:3000/api}"` prend le premier argument, ou l’URL par défaut.
- `$(status …)` exécute la fonction et récupère ce qu’elle affiche : le code de statut.
- Les corps JSON sont entre apostrophes simples pour que le shell ne touche pas aux
  guillemets doubles.
- La dernière ligne `[ "$failures" -eq 0 ]` donne au script son code de sortie : 0 si tout
  va bien, 1 sinon.

### Le piège de l’état

Relance le script **sans redémarrer le serveur** :

```text
OK    liste paginée (200)
OK    paramètre invalide (400)
OK    livre existant (200)
OK    livre inexistant (404)
ÉCHEC création : attendu 201, obtenu 409
OK    code déjà pris (409)
OK    données invalides (422)
OK    JSON mal formé (400)
OK    modification partielle (200)
ÉCHEC suppression : attendu 204, obtenu 404
OK    suppression répétée (404)
2 échec(s)
```

L’API n’a pas changé, mais son **état**, si : le livre `TST-001` existe déjà, et le livre 2
a été supprimé lors du premier passage. Un test n’est reproductible que s’il part d’un
**état connu**. Ici, il suffit de redémarrer le serveur (les données d’exemple sont
rechargées). Avec une base de données, on prévoit une base de test réinitialisée avant
chaque passage.

## Un script de vérification en JavaScript

On peut aller plus loin : un script Node.js qui crée lui-même l’application, avec des
données connues, sur un port libre. Plus besoin de serveur lancé à côté, et l’état de
départ est garanti à chaque exécution. C’est possible parce que `app.js` construit
l’application sans la démarrer et que le stockage expose `resetBooks`.

```js
// Vérifications automatiques : démarre l'API sur un port libre avec des données connues.
import assert from 'node:assert/strict';
import { createApp } from './src/app.js';
import { sampleBooks } from './src/seed.js';
import { resetBooks } from './src/store/books-store.js';

resetBooks(sampleBooks);
const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://localhost:${server.address().port}/api`;

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { response, body: text === '' ? null : JSON.parse(text) };
}

try {
  let result = await request('GET', '/books?limit=2&sort=-year');
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.data.map((book) => book.code), ['ZOL-001', 'MAU-001']);
  assert.equal(result.body.pagination.totalItems, 7);

  result = await request('POST', '/books', { code: 'TST-001', title: 'Test', author: 'Ada', year: 2020 });
  assert.equal(result.response.status, 201);
  assert.equal(result.response.headers.get('location'), `/api/books/${result.body.id}`);

  result = await request('POST', '/books', { code: 'TST-001', title: 'Doublon', author: 'Ada', year: 2020 });
  assert.equal(result.response.status, 409);
  assert.equal(result.response.headers.get('content-type'), 'application/problem+json; charset=utf-8');

  result = await request('POST', '/books', { code: 'x', year: '2020' });
  assert.equal(result.response.status, 422);
  assert.deepEqual(result.body.errors.map((error) => error.field), ['code', 'title', 'author', 'year']);

  result = await request('DELETE', '/books/2');
  assert.equal(result.response.status, 204);
  result = await request('DELETE', '/books/2');
  assert.equal(result.response.status, 404);

  console.log('Toutes les vérifications sont passées.');
} finally {
  server.close();
}
```

```bash
node check-api.js
```

```text
Toutes les vérifications sont passées.
```

Lance-le deux fois de suite : il passe à chaque fois, puisqu’il recharge les données
d’exemple au début. Si une vérification échoue, `assert` lève une `AssertionError` qui
affiche la valeur obtenue et la valeur attendue, le bloc `finally` arrête le serveur, et
le processus se termine avec un code de sortie non nul.

Ce script vérifie davantage que des statuts : l’en-tête `Location`, le type
`application/problem+json`, l’ordre du tri, la liste des champs en erreur. Le module de
tests intégré à Node.js, `node:test`, organise ce genre de vérifications en tests nommés
et indépendants : il est étudié dans le cours consacré aux tests.

## Pièges courants

- **Documenter seulement les succès** : les clients passent beaucoup de temps sur les
  erreurs.
- **Documentation écrite une fois puis oubliée** : elle dérive du code. Garde-la près du
  code, relis-la à chaque changement de contrat, vérifie-la par des tests.
- **Tests qui dépendent de l’ordre ou de l’état** laissé par une exécution précédente.
- **Ne vérifier que le statut** : un 200 avec un corps faux reste un bug.
- **Oublier les en-têtes** dans les vérifications (`Location`, `Content-Type`).
- **Mettre des secrets** (jetons, mots de passe) dans un fichier `.http` ou un script
  versionné : utilise des variables d’environnement.

## Exercices

### Exercice 1 — Compléter la description OpenAPI

Ajoute à `openapi.json` les opérations `PATCH` et `DELETE` sur `/books/{id}`, avec leurs
réponses possibles, et un schéma `BookPatch` où tous les champs sont facultatifs mais où
les champs inconnus restent interdits.

:::solution

Ajoute les membres `"patch"` et `"delete"` dans l’objet `"/books/{id}"`, à côté de
`"get"` (les accolades extérieures ne servent qu’à présenter un JSON valide) :

```json
{
  "patch": {
    "summary": "Modifier une partie d’un livre",
    "requestBody": {
      "required": true,
      "content": { "application/json": { "schema": { "$ref": "#/components/schemas/BookPatch" } } }
    },
    "responses": {
      "200": {
        "description": "Le livre modifié",
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Book" } } }
      },
      "400": { "$ref": "#/components/responses/Problem" },
      "404": { "$ref": "#/components/responses/Problem" },
      "409": { "$ref": "#/components/responses/Problem" },
      "415": { "$ref": "#/components/responses/Problem" },
      "422": { "$ref": "#/components/responses/Problem" }
    }
  },
  "delete": {
    "summary": "Supprimer un livre",
    "responses": {
      "204": { "description": "Livre supprimé, aucun corps" },
      "404": { "$ref": "#/components/responses/Problem" }
    }
  }
}
```

Et le membre `"BookPatch"` dans `components.schemas` :

```json
{
  "BookPatch": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "code": { "type": "string", "pattern": "^[A-Z]{3}-\\d{3}$" },
      "title": { "type": "string", "minLength": 1, "maxLength": 200 },
      "author": { "type": "string", "minLength": 1, "maxLength": 100 },
      "year": { "type": "integer", "minimum": 1000 },
      "available": { "type": "boolean" }
    }
  }
}
```

- Le paramètre `id` est déclaré au niveau du chemin : il s’applique à toutes ses
  opérations, inutile de le répéter.
- `BookPatch` n’a pas de `required` : un `PATCH` peut ne contenir qu’un champ. Les
  contraintes de chaque champ restent les mêmes que dans `BookInput`.
- `204` n’a pas de `content` : la réponse n’a pas de corps.
- Le document complété passe la validation OpenAPI. Les statuts listés correspondent à
  ce que le code produit : 415 et 400 viennent de `requireJsonObject` et de
  `express.json()`, 404 de `findBookOr404`, 422 de la validation, 409 du contrôle
  d’unicité. Pour être exhaustif, on documenterait aussi 413 (corps trop volumineux),
  que toute route avec corps peut renvoyer.

:::

### Exercice 2 — Étendre le script curl

Ajoute deux vérifications à `api-test.sh` : une page au-delà de la fin renvoie 200, et un
corps envoyé comme formulaire (`-d 'title=x'` sans `Content-Type` JSON) renvoie 415. La
fonction `status` force le `Content-Type` JSON : comment fais-tu pour le second cas ?

:::solution

Avant la ligne `echo "$failures échec(s)"` :

```bash
check "page au-delà de la fin" 200 "$(status GET '/books?page=99')"
check "corps non JSON" 415 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -d 'title=x' "$BASE_URL/books")"
```

Sur un serveur fraîchement démarré, les dernières lignes deviennent :

```text
OK    suppression répétée (404)
OK    page au-delà de la fin (200)
OK    corps non JSON (415)
0 échec(s)
```

- Pour le cas 415, on appelle curl directement : avec `-d` seul, curl envoie
  `Content-Type: application/x-www-form-urlencoded`, exactement ce qu’on veut tester.
- Les apostrophes autour de `'/books?page=99'` évitent que le shell interprète `?`.
- Un test qui vérifie un **refus** est aussi important qu’un test de succès : il
  garantit que la protection ne disparaît pas lors d’une modification.

:::

### Exercice 3 — Vérifier l’idempotence de PUT

Ajoute à `check-api.js`, avant le message final, une vérification qui envoie deux fois le
même `PUT` sur le livre 1, puis contrôle que les deux réponses sont identiques et qu’une
lecture renvoie bien la représentation envoyée.

:::solution

```js
const replacement = { code: 'HUG-001', title: 'Les Misérables', author: 'Victor Hugo', year: 1862, available: false };
const first = await request('PUT', '/books/1', replacement);
const second = await request('PUT', '/books/1', replacement);
assert.equal(first.response.status, 200);
assert.deepEqual(second.body, first.body);
assert.deepEqual((await request('GET', '/books/1')).body, { id: 1, ...replacement });
```

Le script affiche toujours `Toutes les vérifications sont passées.`

- `deepEqual` compare le contenu des objets, pas leur identité : deux réponses JSON
  distinctes mais identiques sont égales.
- La dernière vérification prouve que `PUT` a bien **remplacé** la ressource :
  l’état final ne dépend pas du nombre d’envois.
- La même vérification sur un `POST` échouerait : le second envoi répondrait 409 à
  cause du code d’inventaire unique (et créerait un doublon sans cette règle).

:::

## Récapitulatif

- Une API se documente pour ses utilisateurs : ressources, paramètres, corps, statuts,
  **erreurs**, conventions choisies et exemples copiables.
- OpenAPI décrit l’API dans un document structuré (JSON ou YAML) : chemins, opérations,
  paramètres, schémas fondés sur JSON Schema, réponses. Il alimente documentation
  interactive, validation et génération de code.
- curl permet d’explorer (`-i`, `-w '%{http_code}'`, `--json`) ; un fichier `.http`
  rend les exemples rejouables dans l’éditeur.
- Un test reproductible part d’un **état connu** et signale l’échec par son code de
  sortie : script curl sur un serveur fraîchement démarré, ou script Node.js qui crée
  l’application et ses données lui-même.
- Vérifie les statuts, mais aussi les en-têtes et les corps, y compris pour les refus.
