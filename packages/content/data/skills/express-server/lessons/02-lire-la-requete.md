---
title: Lire la requête — query string, en-têtes et corps JSON
summary: Extraire les paramètres de requête, les en-têtes et le corps JSON, sans faire confiance à ce qui arrive.
durationMinutes: 50
sources:
  - title: Express 5 — Référence de l’API (objet Request)
    url: https://expressjs.com/en/5x/api.html
  - title: Express — Migrer vers Express 5
    url: https://expressjs.com/en/guide/migrating-5.html
  - title: MDN — En-têtes HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers
---

## Trois endroits où le client met des informations

Dans la leçon précédente, tu as lu les **paramètres de route** (`/books/:id`). Une requête
HTTP transporte d’autres informations, à trois endroits que tu connais depuis le cours
sur HTTP :

```http
POST /api/notes?draft=true HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept-Language: fr-FR

{"title":"Courses","tags":["maison"]}
```

- la **query string** après le `?` de l’URL (`draft=true`) : des options, des filtres ;
- les **en-têtes** (`Content-Type`, `Accept-Language`…) : des métadonnées sur la requête ;
- le **corps** (body) après la ligne vide : les données envoyées, ici en JSON.

Express range chacun dans une propriété de `req`. Cette leçon montre comment les lire,
ce qu’elles contiennent exactement, et pourquoi tu ne dois jamais supposer qu’elles ont
la forme attendue : **tout ce qui vient du client est une entrée non fiable**.

## Vue d’ensemble de l’objet `req`

```js
// inspect.js
import express from 'express';

const app = express();

app.get('/inspect/:section', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    host: req.hostname,
  });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s 'http://localhost:3000/inspect/books?sort=title&page=2'
```

```text
{"method":"GET","path":"/inspect/books","originalUrl":"/inspect/books?sort=title&page=2","params":{"section":"books"},"query":{"sort":"title","page":"2"},"host":"localhost"}
```

`req.path` est le chemin sans la query string ; `req.originalUrl` est l’URL complète
telle que demandée. Les apostrophes autour de l’URL dans la commande curl sont
nécessaires : sans elles, le shell interpréterait `&` comme « lance en arrière-plan ».

## La query string : `req.query`

### Lecture de base

```js
// query.js
import express from 'express';

const app = express();

app.get('/search', (req, res) => {
  console.log(req.query);
  res.json(req.query);
});

app.listen(3000, () => console.log('Prêt'));
```

Lance-le et essaie plusieurs formes :

```bash
curl -s 'http://localhost:3000/search?q=hugo&page=2'
curl -s 'http://localhost:3000/search?tag=roman&tag=classique'
curl -s 'http://localhost:3000/search?q=&empty'
curl -s 'http://localhost:3000/search?q=Victor%20Hugo&x=a+b'
curl -s 'http://localhost:3000/search'
```

```text
{"q":"hugo","page":"2"}
{"tag":["roman","classique"]}
{"q":"","empty":""}
{"q":"Victor Hugo","x":"a b"}
{}
```

Retiens les règles :

| Query string             | `req.query`                       |
| ------------------------ | --------------------------------- |
| `?page=2`                | `{ page: '2' }` : une **chaîne**  |
| `?tag=a&tag=b`           | `{ tag: ['a', 'b'] }` : un tableau |
| `?q=` ou `?q`            | `{ q: '' }` : chaîne vide         |
| (rien)                   | `{}` : la clé est absente         |
| `%20` ou `+`             | décodés en espace                 |

Conséquence importante : **une même clé peut être une chaîne, un tableau ou absente**. Un
code comme `req.query.name.toUpperCase()` plante avec `?name=a&name=b` (un tableau n’a pas
de méthode `toUpperCase`) et sans `?name` (on ne peut pas lire une propriété de
`undefined`). Vérifie toujours le type avec `typeof … === 'string'` avant d’utiliser la
valeur.

### Express 5 : l’analyseur « simple » par défaut

Express 4 utilisait par défaut un analyseur dit « étendu », qui transformait
`?filter[author]=hugo` en objet imbriqué `{ filter: { author: 'hugo' } }`. Express 5 a
changé ce défaut pour l’analyseur **simple** :

```bash
curl -s -g 'http://localhost:3000/search?filter[author]=hugo'
```

```text
{"filter[author]":"hugo"}
```

(L’option `-g` empêche curl d’interpréter les crochets.) La clé est la chaîne
`filter[author]`, sans imbrication. C’est plus prévisible et réduit les surprises : avec
l’analyseur étendu, un client pouvait envoyer des objets là où tu attendais des chaînes.
Préfère des noms à plat : `?author=hugo`.

### `req.query` est en lecture seule

Dans Express 5, `req.query` n’est plus une propriété modifiable mais un **accesseur**
(getter) : à chaque lecture, Express analyse à nouveau l’URL. Observe :

```js
// readonly.js
import express from 'express';

const app = express();

app.get('/readonly', (req, res) => {
  req.query.page = '99';
  console.log('Après modification :', req.query.page);
  try {
    req.query = { page: '99' };
  } catch (error) {
    console.log(error.constructor.name, ':', error.message);
  }
  res.json(req.query);
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s 'http://localhost:3000/readonly?page=1'
```

```text
{"page":"1"}
```

Et dans le terminal du serveur :

```text
Après modification : 1
TypeError : Cannot set property query of #<IncomingMessage> which has only a getter
```

La modification `req.query.page = '99'` est **silencieusement perdue** (la lecture
suivante recrée un objet neuf), et la réaffectation `req.query = …` lève une
`TypeError` (les modules ES sont toujours en mode strict). Beaucoup de vieux middlewares
« normalisent » `req.query` en le modifiant : en Express 5, range plutôt tes valeurs
converties dans une variable locale.

```js
// Bonne pratique : lire, convertir, ranger dans une constante
const page = Number(req.query.page ?? '1');
```

## Les en-têtes : `req.get()` et `req.headers`

```js
// headers.js
import express from 'express';

const app = express();

app.get('/whoami', (req, res) => {
  res.json({
    userAgent: req.get('User-Agent'),
    accept: req.get('accept'),
    language: req.headers['accept-language'] ?? null,
    custom: req.get('X-Request-Id') ?? null,
  });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/whoami
curl -s -H 'Accept-Language: fr-FR' -H 'x-request-id: abc-123' -H 'Accept: application/json' http://localhost:3000/whoami
```

```text
{"userAgent":"curl/8.5.0","accept":"*/*","language":null,"custom":null}
{"userAgent":"curl/8.5.0","accept":"application/json","language":"fr-FR","custom":"abc-123"}
```

(Ta version de curl peut différer.) Deux façons de lire un en-tête :

- `req.get('Nom')` ne tient pas compte de la casse : `req.get('accept')` et
  `req.get('Accept')` sont équivalents. C’est la méthode recommandée.
- `req.headers` est l’objet brut fourni par Node.js : ses clés sont **toujours en
  minuscules** (`req.headers['accept-language']`). `req.headers['Accept-Language']`
  vaudrait `undefined`.

Les noms d’en-têtes HTTP sont insensibles à la casse selon la norme ; c’est pour cela que
Node.js les normalise en minuscules. Un en-tête absent donne `undefined`. Et comme le
reste, un en-tête est choisi par le client : `User-Agent` peut contenir n’importe quoi.

## Le corps JSON : `express.json()`

### Sans analyseur, pas de corps

Le corps d’une requête arrive par morceaux sur le réseau. Express ne le lit **pas** tout
seul : il faut un middleware (une fonction placée avant tes routes, détaillée dans la
leçon suivante) qui lit le flux, vérifie le type et analyse le JSON. Express 5 en fournit
un : `express.json()`. Tu n’as pas besoin d’installer le paquet `body-parser` séparément,
comme le montrent d’anciens tutoriels.

```js
// body.js
import express from 'express';

const app = express();

app.post('/without-parser', (req, res) => {
  res.json({ body: req.body ?? 'undefined' });
});

app.use(express.json());

app.post('/notes', (req, res) => {
  console.log('Content-Type :', req.get('Content-Type'), '| body :', req.body);
  res.status(201).json({ received: req.body });
});

app.listen(3000, () => console.log('Prêt'));
```

`app.use(express.json())` installe l’analyseur pour **toutes les routes déclarées
après**. La route `/without-parser` est déclarée avant : elle ne voit pas le corps.

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"Courses"}' http://localhost:3000/without-parser
curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"Courses","tags":["maison"]}' http://localhost:3000/notes
```

```text
{"body":"undefined"}
{"received":{"title":"Courses","tags":["maison"]}}
```

En Express 5, `req.body` vaut `undefined` tant qu’aucun analyseur ne l’a rempli (Express 4
renvoyait un objet vide `{}`). Avec `express.json()`, `req.body` contient l’objet
JavaScript obtenu par `JSON.parse`.

:::tip[L’option --json de curl]
Les versions récentes de curl acceptent `--json '{"title":"Courses"}'` : c’est un
raccourci qui envoie le corps en `POST` avec les en-têtes `Content-Type: application/json`
et `Accept: application/json`. Les exemples suivants l’utilisent.

:::

### Le `Content-Type` décide de tout

`express.json()` n’analyse le corps que si l’en-tête `Content-Type` indique du JSON.
Oublie l’en-tête et observe :

```bash
curl -s -X POST -d '{"title":"Courses"}' http://localhost:3000/notes
curl -s -X POST http://localhost:3000/notes
curl -s --json '{"title":"Avec --json"}' http://localhost:3000/notes
```

```text
{}
{}
{"received":{"title":"Avec --json"}}
```

Côté serveur :

```text
Content-Type : application/x-www-form-urlencoded | body : undefined
Content-Type : undefined | body : undefined
Content-Type : application/json | body : { title: 'Avec --json' }
```

Avec `-d` seul, curl annonce `application/x-www-form-urlencoded` (le format des
formulaires HTML) : l’analyseur JSON ignore la requête et `req.body` reste `undefined`.
Pourquoi la réponse vaut-elle `{}` et pas `{"received":undefined}` ? Parce que
`JSON.stringify` **omet** les propriétés qui valent `undefined`. C’est un piège classique
en débogage : un `{}` dans la réponse peut cacher un corps jamais lu.

### JSON invalide, corps trop gros, valeurs inattendues

`express.json()` protège aussi ton application :

```bash
curl -s -i -X POST -H 'Content-Type: application/json' -d '{"title": Courses}' http://localhost:3000/notes
```

La réponse a le statut `400 Bad Request` et le serveur journalise l’erreur :

```text
SyntaxError: Unexpected token 'C', "{"title": Courses}" is not valid JSON
  …
  expose: true,
  statusCode: 400,
  status: 400,
  body: '{"title": Courses}',
  type: 'entity.parse.failed'
}
```

L’erreur porte un `status` (400) et un `type` (`entity.parse.failed`) : tu les
exploiteras dans ton gestionnaire d’erreurs centralisé. Par défaut, Express renvoie une
page HTML qui contient la **trace de la pile** (stack trace) en développement ; avec la
variable `NODE_ENV=production`, il n’affiche plus que `Bad Request`. Tu remplaceras
bientôt ce comportement par une réponse JSON propre.

D’autres protections sont actives par défaut :

- **Taille limitée** : un corps de plus de 100 Ko est refusé avec le statut
  `413 Payload Too Large` (erreur de type `entity.too.large`). Tu peux changer la limite :
  `express.json({ limit: '10kb' })`.
- **Mode strict** : seuls un objet ou un tableau sont acceptés à la racine. Un corps
  `"juste une chaîne"` ou `null` reçoit 400. Un tableau, lui, passe :

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '[1,2]' http://localhost:3000/notes
```

```text
{"received":[1,2]}
```

Autrement dit, même avec `express.json()`, `req.body` peut être **un objet, un tableau
ou `undefined`**, et ses propriétés peuvent avoir n’importe quel type. Un client peut
envoyer `{"title": 42}` ou `{"title": ["a"]}`. La validation complète des entrées sera
étudiée dans le cours sur les API REST ; pour l’instant, retiens le réflexe :

```js
// Lecture défensive : ?. évite le plantage si req.body est undefined
const title = req.body?.title;
if (typeof title !== 'string' || title.trim() === '') {
  res.status(400).json({ error: 'Le champ title est obligatoire' });
  return;
}
```

### Les formulaires HTML : `express.urlencoded()`

Un formulaire HTML classique (`method="post"`) envoie ses champs au format
`application/x-www-form-urlencoded`. L’analyseur correspondant est `express.urlencoded()` :

```js
// form.js
import express from 'express';

const app = express();
app.use(express.json());
app.use(express.urlencoded());

app.post('/contact', (req, res) => {
  res.json({ body: req.body, isJson: req.is('application/json') });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s -d 'name=Ada&message=Bonjour+%C3%A0+tous' http://localhost:3000/contact
curl -s --json '{"name":"Ada"}' http://localhost:3000/contact
```

```text
{"body":{"name":"Ada","message":"Bonjour à tous"},"isJson":false}
{"body":{"name":"Ada"},"isJson":"application/json"}
```

Les deux analyseurs cohabitent : chacun ne traite que son type de contenu. La méthode
`req.is(type)` renvoie le type reconnu s’il correspond, `false` sinon, et `null` si la
requête n’a pas de corps. En Express 5, `express.urlencoded()` utilise par défaut le mode
non étendu (`extended: false`) : les champs restent à plat, comme pour la query string.

## Pièges courants

- **Oublier `express.json()`** ou le déclarer **après** les routes : `req.body` vaut
  `undefined` et `req.body.title` lève
  `TypeError: Cannot read properties of undefined (reading 'title')`.
- **Oublier l’en-tête `Content-Type`** côté client : même symptôme, alors que le
  serveur est correct. Vérifie la requête avant d’accuser le code.
- **Croire qu’un paramètre de requête est un nombre** : `req.query.page` vaut `'2'`.
  `'2' + 1` donne `'21'`.
- **Supposer une chaîne** : `?tag=a&tag=b` donne un tableau.
- **Modifier `req.query`** comme en Express 4 : la modification est perdue.
- **Faire confiance au corps** : `{"price": "-5"}` est un JSON parfaitement valide.

## Exercices

### Exercice 1 — Salutation paramétrable

Écris `GET /api/greet` qui lit `name` et `lang` dans la query string. Valeurs par défaut :
`inconnu` et `fr`. La réponse est `{"message":"Bonjour, Ada !"}`, ou
`{"message":"Hello, Ada!"}` si `lang=en`. Réponds 400 si `name` ou `lang` apparaît
plusieurs fois, ou si `name` dépasse 50 caractères.

:::solution

```js
// greet.js
import express from 'express';

const app = express();

app.get('/api/greet', (req, res) => {
  const { name = 'inconnu', lang = 'fr' } = req.query;
  if (typeof name !== 'string' || typeof lang !== 'string') {
    res.status(400).json({ error: 'name et lang doivent apparaître une seule fois' });
    return;
  }
  if (name.length > 50) {
    res.status(400).json({ error: 'name ne doit pas dépasser 50 caractères' });
    return;
  }
  const message = lang === 'en' ? `Hello, ${name}!` : `Bonjour, ${name} !`;
  res.json({ message });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s 'http://localhost:3000/api/greet?name=Ada'
curl -s 'http://localhost:3000/api/greet?name=Ada&lang=en'
curl -s 'http://localhost:3000/api/greet'
curl -s 'http://localhost:3000/api/greet?name=Ada&name=Bob'
curl -s 'http://localhost:3000/api/greet?name='
```

```text
{"message":"Bonjour, Ada !"}
{"message":"Hello, Ada!"}
{"message":"Bonjour, inconnu !"}
{"error":"name et lang doivent apparaître une seule fois"}
{"message":"Bonjour,  !"}
```

- La destructuration avec valeurs par défaut ne s’applique que si la clé est **absente**
  (`undefined`). Avec `?name=`, `name` vaut `''` et la valeur par défaut n’est pas
  utilisée : d’où `Bonjour,  !`. Pour traiter la chaîne vide comme une absence, il
  faudrait un test supplémentaire, par exemple `name.trim() === ''`.
- `typeof name !== 'string'` attrape le cas du tableau (`?name=Ada&name=Bob`).
- La réponse est en JSON : le nom n’est jamais interprété comme du HTML.

:::

### Exercice 2 — Convertisseur de température

Écris `POST /api/temperatures` qui reçoit `{"celsius": 21.5}` et répond
`{"celsius":21.5,"fahrenheit":70.7}` (formule : °F = °C × 9 / 5 + 32). Réponds 400 si le
corps est absent, si ce n’est pas un objet, ou si `celsius` n’est pas un nombre fini.
Teste aussi `{"celsius": "21.5"}` et un envoi sans `Content-Type`, puis explique chaque
résultat.

:::solution

```js
// temperatures.js
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/temperatures', (req, res) => {
  const celsius = req.body?.celsius;
  if (typeof celsius !== 'number' || !Number.isFinite(celsius)) {
    res.status(400).json({ error: 'celsius doit être un nombre, envoyé en JSON' });
    return;
  }
  const fahrenheit = (celsius * 9) / 5 + 32;
  res.json({ celsius, fahrenheit });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s --json '{"celsius": 21.5}' http://localhost:3000/api/temperatures
curl -s --json '{"celsius": -40}' http://localhost:3000/api/temperatures
curl -s --json '{"celsius": "21.5"}' http://localhost:3000/api/temperatures
curl -s -d '{"celsius": 21.5}' http://localhost:3000/api/temperatures
curl -s --json '[21.5]' http://localhost:3000/api/temperatures
```

```text
{"celsius":21.5,"fahrenheit":70.7}
{"celsius":-40,"fahrenheit":-40}
{"error":"celsius doit être un nombre, envoyé en JSON"}
{"error":"celsius doit être un nombre, envoyé en JSON"}
{"error":"celsius doit être un nombre, envoyé en JSON"}
```

- `"21.5"` est une chaîne en JSON : `typeof` vaut `'string'`, refusée. Tu pourrais choisir
  de la convertir, mais accepter les deux types rend l’API moins prévisible.
- Avec `-d` seul, le `Content-Type` est celui d’un formulaire : `express.json()` ne lit
  pas le corps, `req.body` vaut `undefined` et `req.body?.celsius` aussi, sans plantage
  grâce à `?.`.
- `[21.5]` est un tableau : il passe le mode strict, mais n’a pas de propriété `celsius`.

:::

### Exercice 3 — Prédire `req.query` et `req.body`

Sans exécuter, donne la valeur de `req.query.page` pour : `?page=3`, `?page=3&page=4`,
`?page`, `?PAGE=3`, et aucune query string. Puis donne `req.body` pour un `POST` envoyé
avec `curl -d 'a=1'` vers une application qui n’utilise que `express.json()`.

:::solution

```text
?page=3          '3'          (chaîne, pas nombre)
?page=3&page=4   ['3', '4']   (tableau)
?page            ''           (chaîne vide)
?PAGE=3          undefined    (les clés sont sensibles à la casse : la clé est PAGE)
(rien)           undefined    (req.query vaut {})
curl -d 'a=1'    undefined    (type urlencoded, non lu par express.json())
```

Contrairement aux noms d’en-têtes, les clés de la query string sont sensibles à la casse.
Pour le dernier cas, il faudrait `express.urlencoded()`, ou que le client envoie du JSON.

:::

## Récapitulatif

- `req.params` (chemin), `req.query` (query string), `req.get()` / `req.headers`
  (en-têtes) et `req.body` (corps) contiennent tout ce que le client envoie : ce sont des
  **entrées non fiables**.
- `req.query` contient des chaînes, des tableaux si une clé est répétée, ou rien.
  Express 5 utilise l’analyseur simple (pas d’objets imbriqués) et `req.query` est en
  lecture seule : range tes valeurs converties dans des variables.
- `req.get('Nom')` lit un en-tête sans tenir compte de la casse ; `req.headers` a des
  clés en minuscules.
- `app.use(express.json())`, déclaré avant les routes, remplit `req.body` si le
  `Content-Type` est `application/json`. Sinon, `req.body` vaut `undefined` en Express 5.
- `express.json()` répond 400 pour un JSON invalide, 413 au-delà de 100 Ko, et n’accepte
  qu’un objet ou un tableau à la racine.
- Vérifie le type de chaque valeur avant de l’utiliser (`typeof`, `Number.isFinite`).
