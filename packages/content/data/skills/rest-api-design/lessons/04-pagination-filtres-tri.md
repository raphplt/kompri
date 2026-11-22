---
title: Paginer, filtrer et trier une collection
summary: Concevoir les paramètres de requête d’une collection, les valider et renvoyer des pages stables avec leurs métadonnées.
durationMinutes: 60
sources:
  - title: Express 5 — Référence de l’API (req.query)
    url: https://expressjs.com/en/5x/api.html
  - title: RFC 9110 — HTTP Semantics
    url: https://www.rfc-editor.org/rfc/rfc9110
  - title: RFC 9457 — Problem Details for HTTP APIs
    url: https://www.rfc-editor.org/rfc/rfc9457
---

## Pourquoi ne pas tout renvoyer ?

`GET /api/books` renvoie aujourd’hui les sept livres d’exemple. Avec 50 000 livres, la
même requête produirait une réponse de plusieurs mégaoctets, lente à calculer, à
transmettre et à afficher, alors que l’utilisateur n’en regarde qu’une vingtaine. Et il
voudra sans doute chercher « les livres de Zola disponibles, du plus récent au plus
ancien ».

Trois besoins, une seule technique : des **paramètres de requête** (query string) sur
la collection.

```text
GET /api/books?page=2&limit=10                pagination
GET /api/books?author=zola&available=true     filtres
GET /api/books?sort=-year                     tri
GET /api/books?author=zola&sort=-year&limit=5 tout combiné
```

Ces paramètres ne désignent pas une autre ressource : ils précisent **quelle vue** de la
collection on veut. C’est pourquoi ils vont dans la query string et non dans le chemin
(`/api/books/author/zola` mélangerait identifiants et critères).

## Concevoir les paramètres

### Pagination : trois approches

| Approche          | Paramètres                    | Avantages                         | Limites                                         |
| ----------------- | ----------------------------- | --------------------------------- | ----------------------------------------------- |
| Par page          | `page=3&limit=10`             | Intuitive, « aller à la page 3 ». | Décalages si des éléments sont ajoutés entre deux pages. |
| Par décalage      | `offset=20&limit=10`          | Même principe, plus brut.         | Mêmes décalages.                                |
| Par curseur       | `after=<repère>&limit=10`     | Stable même si la liste change.   | Pas d’accès direct à une page ; plus complexe.  |

Les deux premières sont équivalentes (`offset = (page - 1) × limit`). La pagination par
curseur renvoie un repère opaque (par exemple l’identifiant du dernier élément vu) que le
client renvoie pour obtenir la suite ; on la rencontre surtout dans les flux très
volumineux. Ce cours utilise la pagination **par page**, la plus simple à comprendre.

Deux règles de sécurité et de robustesse :

- **une valeur par défaut** (`limit=10`) : sans paramètre, le client reçoit une page, pas
  toute la base ;
- **un plafond** (`limit` ≤ 50) : sinon, `?limit=1000000` annule tout l’intérêt de la
  pagination et peut servir à surcharger le serveur.

### Filtres

Le plus simple : un paramètre par champ filtrable, avec un sens documenté.

- `available=true` : égalité stricte sur un booléen ;
- `author=zola` : « l’auteur **contient** ce texte », sans tenir compte de la casse ;
- `q=les` : recherche dans le titre.

Des API plus riches utilisent des opérateurs (`year[gte]=1850`, `yearFrom=1850`…). Garde
des noms à plat : rappelle-toi qu’Express 5 utilise l’analyseur simple, qui ne crée pas
d’objets imbriqués.

### Tri

Une convention répandue : `sort=champ` pour l’ordre croissant, `sort=-champ` pour
l’ordre décroissant. On n’accepte que des champs prévus (**liste blanche**) : trier sur
un champ inconnu n’a pas de sens, et accepter n’importe quel nom de champ devient
dangereux le jour où il est transmis tel quel à une base de données.

### La forme de la réponse

Le client a besoin de la page **et** de quoi naviguer : nombre total d’éléments, nombre
de pages. Deux familles de solutions :

1. une **enveloppe** JSON :

   ```json
   {
     "data": [{ "id": 3, "title": "Germinal" }],
     "pagination": { "page": 1, "limit": 10, "totalItems": 2, "totalPages": 1 }
   }
   ```

2. le tableau seul dans le corps, et les métadonnées dans des **en-têtes**. L’en-tête
   standard `Link` (RFC 8288) peut porter les liens vers les pages suivante et
   précédente ; un en-tête comme `X-Total-Count` donne le total (c’est une convention,
   pas une norme).

L’enveloppe est plus facile à lire et à utiliser avec `fetch` ; c’est ce que fait ce
cours. Mais attention : passer d’un tableau à une enveloppe **change le contrat** de
`GET /api/books`. Dans une vraie API déjà utilisée, ce serait une rupture pour les clients
existants ; mieux vaut décider de la forme dès le départ.

## La validation des paramètres

Tout ce qui arrive dans `req.query` est une **chaîne** (ou un tableau si le paramètre est
répété, ou rien). Contrairement au corps JSON, la conversion est donc obligatoire ici —
mais elle doit être **contrôlée**. Un paramètre invalide reçoit une erreur 400, au même
format que les autres erreurs de l’API.

```js
// src/validation/list-query.js
const SORTABLE_FIELDS = ['id', 'title', 'author', 'year'];
const MAX_LIMIT = 50;

/**
 * Lit et valide les paramètres de GET /api/books.
 * Renvoie { value, errors } ; value contient des valeurs converties et des défauts.
 */
export function parseListQuery(query) {
  const errors = [];
  const value = { page: 1, limit: 10, sortField: 'id', sortDirection: 1 };

  // Chaque paramètre doit apparaître au plus une fois
  const single = (name) => {
    const raw = query[name];
    if (Array.isArray(raw)) {
      errors.push({ field: name, message: 'Ce paramètre ne doit apparaître qu’une fois.' });
      return undefined;
    }
    return raw;
  };

  const page = single('page');
  if (page !== undefined) {
    const number = Number(page);
    if (!Number.isInteger(number) || number < 1) {
      errors.push({ field: 'page', message: 'Entier supérieur ou égal à 1.' });
    } else {
      value.page = number;
    }
  }

  const limit = single('limit');
  if (limit !== undefined) {
    const number = Number(limit);
    if (!Number.isInteger(number) || number < 1 || number > MAX_LIMIT) {
      errors.push({ field: 'limit', message: `Entier entre 1 et ${MAX_LIMIT}.` });
    } else {
      value.limit = number;
    }
  }

  const available = single('available');
  if (available !== undefined) {
    if (available !== 'true' && available !== 'false') {
      errors.push({ field: 'available', message: 'true ou false.' });
    } else {
      value.available = available === 'true';
    }
  }

  for (const name of ['author', 'q']) {
    const text = single(name);
    if (text !== undefined && text.trim() !== '') {
      value[name] = text.trim().toLowerCase();
    }
  }

  const sort = single('sort');
  if (sort !== undefined) {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    if (!SORTABLE_FIELDS.includes(field)) {
      errors.push({
        field: 'sort',
        message: `Valeurs possibles : ${SORTABLE_FIELDS.join(', ')}, précédées de - pour l’ordre décroissant.`,
      });
    } else {
      value.sortField = field;
      value.sortDirection = descending ? -1 : 1;
    }
  }

  return { value, errors };
}
```

Points à remarquer :

- **Même structure** que `validateBook` : `{ value, errors }`, toutes les erreurs d’un
  coup.
- `single` refuse les paramètres répétés (`?limit=2&limit=3`) au lieu de choisir
  arbitrairement l’un des deux.
- `Number('')` vaut `0` et `Number('1.5')` vaut `1.5` : le test
  `Number.isInteger(number) && number >= 1` rejette `?page=`, `?page=1.5`, `?page=abc` et
  `?page=0`.
- `available` n’accepte que les chaînes exactes `'true'` et `'false'`. Surtout pas
  `Boolean(available)` : `Boolean('false')` vaut `true`, comme toute chaîne non vide.
- Un filtre texte vide (`?author=`) est ignoré : c’est un choix de confort.
- `req.query` est en lecture seule en Express 5 : on construit un **nouvel** objet
  `value` au lieu de modifier `req.query`.

## Sélectionner la page

La logique de filtrage, de tri et de découpage ne dépend pas d’Express. On la place dans
un module à part, qui reçoit la liste complète et les options validées :

```js
// src/services/list-books.js
function compareBooks(field, direction) {
  return (a, b) => {
    const result =
      typeof a[field] === 'string' ? a[field].localeCompare(b[field], 'fr') : a[field] - b[field];
    // À égalité, l'identifiant départage : l'ordre reste stable d'une page à l'autre
    return result * direction || a.id - b.id;
  };
}

export function selectBooks(books, options) {
  const filtered = books.filter(
    (book) =>
      (options.available === undefined || book.available === options.available) &&
      (options.author === undefined || book.author.toLowerCase().includes(options.author)) &&
      (options.q === undefined || book.title.toLowerCase().includes(options.q)),
  );
  const sorted = filtered.toSorted(compareBooks(options.sortField, options.sortDirection));
  const start = (options.page - 1) * options.limit;
  return {
    data: sorted.slice(start, start + options.limit),
    pagination: {
      page: options.page,
      limit: options.limit,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / options.limit),
    },
  };
}
```

L’ordre des opérations est essentiel : **filtrer, puis trier, puis découper**. Découper
avant de filtrer donnerait des pages à moitié vides et un total faux.

- **`localeCompare(b, 'fr')`** compare les chaînes selon les règles du français. Le tri
  par défaut de JavaScript compare les codes des caractères : « Émile Zola » finirait
  après « Victor Hugo », car `É` a un code plus grand que toutes les lettres non
  accentuées.
- **Départage par identifiant** : deux livres de 1885 (Germinal et Bel-Ami) sont à
  égalité pour `sort=-year`. Sans règle de départage, leur ordre relatif ne serait pas
  garanti d’un appel à l’autre (en particulier avec une base de données), et un livre
  pourrait apparaître sur deux pages ou sur aucune. `result * direction || a.id - b.id` :
  si `result * direction` vaut `0`, l’opérateur `||` passe à la comparaison des
  identifiants.
- **`toSorted`** renvoie un nouveau tableau trié, sans modifier l’original, alors que
  `sort` trie **sur place**. Ici, `filter` a déjà créé un nouveau tableau, mais
  l’habitude est bonne : trier sur place le tableau du stockage modifierait l’ordre des
  données pour toutes les requêtes suivantes.
- **`slice(start, start + limit)`** : page 1 → éléments 0 à 9, page 2 → 10 à 19.
  `slice` au-delà de la fin renvoie simplement un tableau vide.
- **`Math.ceil`** arrondit à l’entier supérieur : 7 éléments par pages de 3 font 3 pages.

Dans le routeur, la route de liste devient :

```js
booksRouter.get('/', (req, res) => {
  const { value: options, errors } = parseListQuery(req.query);
  if (errors.length > 0) {
    throw new HttpError(400, 'Certains paramètres de requête sont invalides.', {
      type: '/problems/invalid-query',
      title: 'Paramètres de requête invalides',
      errors,
    });
  }
  res.json(selectBooks(listBooks(), options));
});
```

avec, en haut du fichier, les deux imports :

```js
import { selectBooks } from '../services/list-books.js';
import { parseListQuery } from '../validation/list-query.js';
```

Ici, tout se passe en mémoire : on charge toute la liste puis on la découpe. Avec une
base de données, le filtrage, le tri et le découpage seront faits par la base elle-même
(clauses `WHERE`, `ORDER BY`, `LIMIT` et `OFFSET`), mais le **contrat HTTP** restera
exactement le même.

## Vérification avec curl

Relance le serveur avec les sept livres d’exemple. Les réponses sont longues ; lis-les
attentivement au moins une fois.

```bash
curl -s 'http://localhost:3000/api/books?limit=3&page=3'
```

```text
{"data":[{"id":7,"code":"MAU-001","title":"Bel-Ami","author":"Guy de Maupassant","year":1885,"available":true}],"pagination":{"page":3,"limit":3,"totalItems":7,"totalPages":3}}
```

Sept livres par pages de trois : la troisième page n’en contient qu’un.

```bash
curl -s 'http://localhost:3000/api/books?author=zola&sort=-year'
```

```text
{"data":[{"id":3,"code":"ZOL-001","title":"Germinal","author":"Émile Zola","year":1885,"available":false},{"id":4,"code":"ZOL-002","title":"L’Assommoir","author":"Émile Zola","year":1877,"available":true}],"pagination":{"page":1,"limit":10,"totalItems":2,"totalPages":1}}
```

```bash
curl -s 'http://localhost:3000/api/books?sort=-year&limit=2'
```

```text
{"data":[{"id":3,"code":"ZOL-001","title":"Germinal","author":"Émile Zola","year":1885,"available":false},{"id":7,"code":"MAU-001","title":"Bel-Ami","author":"Guy de Maupassant","year":1885,"available":true}],"pagination":{"page":1,"limit":2,"totalItems":7,"totalPages":4}}
```

Les deux livres de 1885 sont départagés par leur identifiant (3 avant 7).

```bash
curl -s 'http://localhost:3000/api/books?page=0&limit=500&sort=price&available=oui'
```

```text
{"type":"/problems/invalid-query","title":"Paramètres de requête invalides","status":400,"detail":"Certains paramètres de requête sont invalides.","errors":[{"field":"page","message":"Entier supérieur ou égal à 1."},{"field":"limit","message":"Entier entre 1 et 50."},{"field":"available","message":"true ou false."},{"field":"sort","message":"Valeurs possibles : id, title, author, year, précédées de - pour l’ordre décroissant."}],"instance":"/api/books?page=0&limit=500&sort=price&available=oui"}
```

Quatre erreurs d’un coup, au format Problem Details.

```bash
curl -s 'http://localhost:3000/api/books?page=9'
curl -s 'http://localhost:3000/api/books?author=emile'
```

```text
{"data":[],"pagination":{"page":9,"limit":10,"totalItems":7,"totalPages":1}}
{"data":[],"pagination":{"page":1,"limit":10,"totalItems":0,"totalPages":0}}
```

Une page au-delà de la dernière renvoie `200` avec une liste vide : la requête est
valide, il n’y a simplement rien à cette position. (Certaines API préfèrent 404 ; c’est
un choix à documenter.) La recherche `emile` ne trouve pas « Émile » : `toLowerCase`
ne retire pas les accents. L’exercice 2 corrige ce point.

## Pièges courants

- **Pas de limite par défaut ni de plafond** : un client peut demander toute la base.
- **Découper avant de filtrer** : pages incomplètes et total faux.
- **Trier sans départage** : éléments dupliqués ou manquants d’une page à l’autre.
- **`sort` qui modifie le stockage** : l’ordre des données change pour tout le monde.
- **`Boolean('false')`** vaut `true` : compare aux chaînes `'true'` et `'false'`.
- **`parseInt('10abc')`** vaut `10` : `Number` est plus strict et refuse les chaînes
  partiellement numériques.
- **Champ de tri libre** : n’accepte qu’une liste blanche.
- **Total calculé sur la page** au lieu de la collection filtrée.
- **Comparaison de chaînes sans `localeCompare`** : accents mal classés.

## Exercices

### Exercice 1 — Filtrer par période

Ajoute deux filtres `yearFrom` et `yearTo` (bornes incluses). Chacun doit être un entier ;
si les deux sont présents, `yearFrom` ne peut pas dépasser `yearTo`. Teste
`?yearFrom=1850&yearTo=1880&sort=year` et `?yearFrom=1900&yearTo=1800`.

:::solution

Dans `parseListQuery`, avant le bloc du tri :

```js
for (const name of ['yearFrom', 'yearTo']) {
  const raw = single(name);
  if (raw !== undefined) {
    const number = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(number)) {
      errors.push({ field: name, message: 'Année entière attendue.' });
    } else {
      value[name] = number;
    }
  }
}
if (value.yearFrom !== undefined && value.yearTo !== undefined && value.yearFrom > value.yearTo) {
  errors.push({ field: 'yearTo', message: 'yearTo doit être supérieur ou égal à yearFrom.' });
}
```

Dans `selectBooks`, deux conditions de plus dans le filtre :

```js
(options.yearFrom === undefined || book.year >= options.yearFrom) &&
(options.yearTo === undefined || book.year <= options.yearTo)
```

```bash
curl -s 'http://localhost:3000/api/books?yearFrom=1850&yearTo=1880&sort=year'
curl -s 'http://localhost:3000/api/books?yearFrom=1900&yearTo=1800'
```

```text
{"data":[{"id":5,"code":"FLA-001","title":"Madame Bovary","author":"Gustave Flaubert","year":1857,"available":true},{"id":1,"code":"HUG-001","title":"Les Misérables","author":"Victor Hugo","year":1862,"available":true},{"id":4,"code":"ZOL-002","title":"L’Assommoir","author":"Émile Zola","year":1877,"available":true}],"pagination":{"page":1,"limit":10,"totalItems":3,"totalPages":1}}
{"type":"/problems/invalid-query","title":"Paramètres de requête invalides","status":400,"detail":"Certains paramètres de requête sont invalides.","errors":[{"field":"yearTo","message":"yearTo doit être supérieur ou égal à yearFrom."}],"instance":"/api/books?yearFrom=1900&yearTo=1800"}
```

- `raw.trim() === ''` est nécessaire ici : `Number('')` vaut `0`, qui est un entier, et
  `?yearFrom=` serait accepté comme l’an 0. Pour `page`, le test `number >= 1` couvrait
  déjà ce cas.
- Le contrôle croisé se fait après la conversion des deux valeurs.
- Le filtre s’ajoute aux autres : `?yearFrom=1850&author=hugo` combine les deux.

:::

### Exercice 2 — Recherche insensible aux accents

Fais en sorte que `?author=emile` trouve « Émile Zola » et que `?q=miserables` trouve
« Les Misérables ». Indice : `texte.normalize('NFD')` décompose les lettres accentuées
en une lettre de base suivie d’un accent séparé, et l’expression régulière
`/\p{Diacritic}/gu` reconnaît ces accents.

:::solution

Une fonction utilitaire, exportée depuis `list-query.js` :

```js
export function simplify(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
```

Dans `parseListQuery`, la ligne qui range les filtres texte devient :

```js
value[name] = simplify(text.trim());
```

Dans `selectBooks` (avec `import { simplify } from '../validation/list-query.js';`) :

```js
(options.author === undefined || simplify(book.author).includes(options.author)) &&
(options.q === undefined || simplify(book.title).includes(options.q))
```

```bash
curl -s 'http://localhost:3000/api/books?author=emile'
curl -s 'http://localhost:3000/api/books?author=%C3%89MILE'
curl -s 'http://localhost:3000/api/books?q=miserables'
```

Les deux premières trouvent les deux livres d’Émile Zola (`"totalItems":2`) ; la
troisième renvoie « Les Misérables ».

- Il faut simplifier **les deux côtés** de la comparaison : le texte cherché et le
  champ du livre.
- `%C3%89` est l’encodage de `É` dans une URL ; Express le décode avant de remplir
  `req.query`.
- `normalize('NFD')` ne traite pas les ligatures : `Œ` reste `œ` après passage en
  minuscules. Pour une recherche plus poussée, on utilise les fonctions de recherche
  plein texte d’une base de données.

:::

### Exercice 3 — Calculs de pagination

Une collection filtrée contient 23 éléments, avec `limit=10`. Sans exécuter de code :
combien de pages ? Quels indices du tableau trié (en partant de 0) sont renvoyés pour
`page=3` ? Que renvoie `page=4` ? Et si un élément est ajouté au début de la liste entre
la lecture de la page 1 et celle de la page 2 ?

:::solution

```text
totalPages = Math.ceil(23 / 10) = 3
page=3 : start = (3 - 1) × 10 = 20 → slice(20, 30) → indices 20, 21, 22 (3 éléments)
page=4 : start = 30 → slice(30, 40) → [] ; réponse 200, data vide, totalPages 3
```

Si un élément est inséré en tête entre deux lectures, tous les autres reculent d’un
rang : le dernier élément de la page 1 se retrouve premier de la page 2, et le client
le voit deux fois. C’est la limite de la pagination par page ou par décalage. Une
pagination par curseur (« les 10 éléments après l’identifiant X ») évite ce problème,
au prix d’une conception plus complexe.

:::

## Récapitulatif

- Les vues d’une collection se demandent par la query string : `page`, `limit`,
  filtres, `sort` (avec `-` pour l’ordre décroissant).
- Toujours une limite par défaut et un plafond ; une liste blanche pour les champs de
  tri.
- Les paramètres arrivent en chaînes : conversion **contrôlée**, erreurs en 400 au même
  format que le reste de l’API, sans modifier `req.query`.
- Filtrer, trier, puis découper. Départager les égalités pour des pages stables.
  `toSorted` plutôt que `sort` sur des données partagées, `localeCompare` pour le texte.
- Renvoie les métadonnées (`page`, `limit`, `totalItems`, `totalPages`) dans une
  enveloppe ou dans des en-têtes, et choisis cette forme dès le départ.
- Page vide au-delà de la fin : `200` et `[]` (ou un autre choix, documenté).
