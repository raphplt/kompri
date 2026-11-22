---
title: Sérialiser avec JSON
summary: Transformer des données en texte pour les envoyer ou les stocker, les relire, et connaître les limites de JSON.
durationMinutes: 45
sources:
  - title: MDN — JSON
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON
  - title: MDN — JSON.stringify()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN — JSON.parse()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
  - title: IETF — RFC 8259, The JSON Data Interchange Format
    url: https://www.rfc-editor.org/rfc/rfc8259.html
---

## Pourquoi transformer des données en texte ?

Un objet JavaScript n’existe que dans la mémoire du programme qui l’a créé. Dès qu’il faut le
faire voyager — l’envoyer à un serveur, le recevoir d’une API, l’enregistrer dans un fichier ou
dans le stockage du navigateur — il faut le transformer en une suite de caractères que l’autre
côté saura relire. Cette opération s’appelle la **sérialisation** ; l’opération inverse, la
**désérialisation**.

**JSON** (*JavaScript Object Notation*) est le format texte le plus utilisé pour cela sur le
web. Il reprend la syntaxe des objets et tableaux littéraux de JavaScript, en plus strict. Il
est décrit par une norme (la RFC 8259 de l’IETF) et presque tous les langages savent le lire
et l’écrire : un serveur en Python, en Java ou en Node.js échange du JSON avec ton code de
navigateur sans difficulté.

JavaScript fournit deux fonctions : `JSON.stringify` (objet → texte) et `JSON.parse`
(texte → objet).

## `JSON.stringify` : des données vers le texte

```js
const product = {
  id: 3,
  name: 'Écran 27"',
  price: 189,
  tags: ['bureau', 'image'],
  inStock: true,
  discount: null,
};

const text = JSON.stringify(product);
console.log(text);
console.log(typeof text);

console.log(JSON.stringify(product, null, 2));
```

Sortie (`node example.js`) :

```text
{"id":3,"name":"Écran 27\"","price":189,"tags":["bureau","image"],"inStock":true,"discount":null}
string
{
  "id": 3,
  "name": "Écran 27\"",
  "price": 189,
  "tags": [
    "bureau",
    "image"
  ],
  "inStock": true,
  "discount": null
}
```

- Le résultat est une **chaîne** : c’est elle qui voyagera.
- Les clés sont entourées de **guillemets doubles**, comme les chaînes. Le guillemet contenu
  dans le nom du produit est **échappé** (`\"`) pour ne pas terminer la chaîne.
- Le troisième argument donne une indentation (ici 2 espaces) pour un texte lisible par un
  humain : pratique pour afficher, déboguer ou écrire un fichier de configuration. Le deuxième
  argument, `null` ici, est présenté plus bas.

## `JSON.parse` : du texte vers les données

```js
const text = '{"id":3,"name":"Écran","tags":["bureau","image"],"inStock":true}';

const product = JSON.parse(text);
console.log(product.name);
console.log(product.tags.length);
console.log(typeof product.inStock);

console.log(JSON.parse('42'), JSON.parse('"bonjour"'), JSON.parse('[1, 2]'));
```

Sortie :

```text
Écran
2
boolean
42 bonjour [ 1, 2 ]
```

`JSON.parse` reconstruit des objets, des tableaux, des nombres, des chaînes, des booléens et
`null`. Un texte JSON n’est pas forcément un objet : `42`, `"bonjour"` ou `[1, 2]` sont
aussi du JSON valide.

Chaque appel à `JSON.parse` crée de **nouveaux** objets. `JSON.parse(JSON.stringify(obj))` ne
renvoie donc jamais le même objet que `obj`, mais une copie… avec des pertes, comme on va le
voir.

## La syntaxe JSON est stricte

JSON ressemble à JavaScript mais n’accepte pas tout ce que JavaScript accepte :

| Autorisé en JavaScript       | En JSON                                  |
| ---------------------------- | ---------------------------------------- |
| `'texte'` (guillemets simples) | interdit : uniquement `"texte"`         |
| `{ name: 1 }` (clé sans guillemets) | interdit : `{ "name": 1 }`         |
| virgule finale `[1, 2,]`     | interdite                                |
| commentaires `// …`          | interdits                                |
| `undefined`, `NaN`, `Infinity`, fonctions | n’existent pas               |
| —                            | types : objet, tableau, chaîne, nombre, `true`, `false`, `null` |

Un texte qui ne respecte pas ces règles fait lever une `SyntaxError` à `JSON.parse` :

```js
const attempts = [
  "{'name': 'Ada'}",
  '{"name": "Ada",}',
  '{name: "Ada"}',
  '',
];

for (const attempt of attempts) {
  try {
    JSON.parse(attempt);
  } catch (error) {
    console.log(`${error.name}: ${error.message}`);
  }
}
```

Sortie avec Node.js 24 :

```text
SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
SyntaxError: Expected double-quoted property name in JSON at position 15 (line 1 column 16)
SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
SyntaxError: Unexpected end of JSON input
```

Le nom de l’erreur, `SyntaxError`, est garanti ; le texte du message, lui, varie selon le moteur
(Firefox ne formule pas les choses comme Chrome ou Node). Ne teste donc jamais le contenu du
message dans ton code. La position indiquée est en revanche très utile pour trouver l’erreur :
compte les caractères à partir de 0.

:::warning[Un texte reçu de l’extérieur peut être invalide]
Un fichier corrompu, une réponse de serveur tronquée, une valeur modifiée à la main dans le
stockage du navigateur : dès que le texte vient d’ailleurs, entoure `JSON.parse` d’un
`try…catch`. Une `SyntaxError` non gérée arrêterait ton script.
:::

## Les limites de JSON

JSON ne connaît que six sortes de valeurs. Tout le reste est converti, ou perdu, **sans
erreur** — et c’est là que les bugs se cachent.

```js
const data = {
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  nickname: undefined,
  greet() {
    return 'bonjour';
  },
  list: [1, undefined, () => 2],
  ratio: NaN,
  limit: Infinity,
  roles: new Set(['admin', 'auteur']),
  scores: new Map([['ada', 12]]),
};

const text = JSON.stringify(data);
console.log(text);

const back = JSON.parse(text);
console.log(typeof back.createdAt);
console.log(Object.hasOwn(back, 'nickname'));
```

Sortie :

```text
{"createdAt":"2026-03-01T10:00:00.000Z","list":[1,null,null],"ratio":null,"limit":null,"roles":{},"scores":{}}
string
false
```

Analysons chaque perte :

- **Les dates deviennent des chaînes** au format ISO 8601. Au retour, `JSON.parse` ne sait pas
  que cette chaîne était une date : `back.createdAt` est une `string`, ses méthodes de date
  n’existent plus.
- **`undefined` et les fonctions disparaissent** quand ce sont des valeurs de propriétés : les
  clés `nickname` et `greet` ont tout simplement disparu.
- **Dans un tableau**, ils deviennent `null`, pour ne pas décaler les positions.
- **`NaN` et `Infinity` deviennent `null`** : un calcul raté se transforme en « pas de valeur ».
- **`Map` et `Set` deviennent `{}`** : leur contenu est perdu, sans avertissement.

D’autres cas provoquent une erreur :

```js
try {
  JSON.stringify({ views: 10n });
} catch (error) {
  console.log(`${error.name}: ${error.message}`);
}

const node = { name: 'racine' };
node.self = node;
try {
  JSON.stringify(node);
} catch (error) {
  console.log(error.name);
}

console.log(JSON.stringify(undefined));
console.log(JSON.stringify(() => 1));
```

Sortie :

```text
TypeError: Do not know how to serialize a BigInt
TypeError
undefined
undefined
```

- Un `BigInt` (entier de taille arbitraire, écrit avec un `n` final) lève une `TypeError`.
- Un objet qui se contient lui-même (**référence circulaire**) aussi : sa sérialisation serait
  infinie.
- `JSON.stringify(undefined)` ne renvoie pas une chaîne mais `undefined`. Si tu enregistres ce
  résultat quelque part, tu n’enregistres rien de valide.

## Contourner les limites

La stratégie est toujours la même : **avant d’écrire**, convertir ce que JSON ne sait pas
représenter ; **après lecture**, reconstruire les types.

```js
const event = {
  title: 'Atelier JavaScript',
  startsAt: new Date('2026-03-01T10:00:00.000Z'),
  attendees: new Set(['ada', 'grace']),
};

// Avant d’écrire : convertir ce que JSON ne sait pas représenter
const text = JSON.stringify({
  ...event,
  attendees: Array.from(event.attendees),
});
console.log(text);

// Après lecture : reconstruire les types
const raw = JSON.parse(text);
const restored = {
  ...raw,
  startsAt: new Date(raw.startsAt),
  attendees: new Set(raw.attendees),
};
console.log(restored.startsAt instanceof Date, restored.startsAt.toISOString());
console.log(restored.attendees.has('grace'));
```

Sortie :

```text
{"title":"Atelier JavaScript","startsAt":"2026-03-01T10:00:00.000Z","attendees":["ada","grace"]}
true 2026-03-01T10:00:00.000Z
true
```

La date n’a pas besoin d’être convertie avant l’écriture : `JSON.stringify` appelle
automatiquement sa méthode `toJSON`, qui produit la chaîne ISO. En revanche, le `Set` doit être
transformé en tableau, sinon il deviendrait `{}`.

### Les arguments optionnels : `replacer` et `reviver`

```js
const text = '{"title":"Atelier","startsAt":"2026-03-01T10:00:00.000Z","seats":12}';

const event = JSON.parse(text, (key, value) => (key === 'startsAt' ? new Date(value) : value));
console.log(event.startsAt instanceof Date);
console.log(event.seats);

const user = { name: 'Ada', password: 'secret', age: 36 };
console.log(JSON.stringify(user, ['name', 'age']));
```

Sortie :

```text
true
12
{"name":"Ada","age":36}
```

- Le deuxième argument de `JSON.parse`, appelé **reviver**, est une fonction appelée pour
  chaque clé ; ce qu’elle renvoie remplace la valeur. Ici, on reconstruit la date au passage.
- Le deuxième argument de `JSON.stringify`, appelé **replacer**, peut être un tableau des clés à
  garder (ou une fonction). Ici, le mot de passe n’est pas sérialisé.

:::warning[Ne compte pas sur le replacer pour protéger des secrets]
Filtrer `password` au moment de la sérialisation est une bonne habitude, mais la vraie règle
est de ne jamais faire circuler de mot de passe ou de secret dans des objets destinés à être
envoyés ou enregistrés. Construis plutôt explicitement l’objet à envoyer, avec seulement les
champs nécessaires.
:::

### JSON pour copier : une mauvaise idée

On rencontre encore `JSON.parse(JSON.stringify(obj))` pour faire une copie profonde. Compare :

```js
const original = {
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  tags: new Set(['js']),
  note: undefined,
};

const viaJson = JSON.parse(JSON.stringify(original));
const viaClone = structuredClone(original);

console.log(viaJson);
console.log(viaClone);
```

Sortie :

```text
{ createdAt: '2026-03-01T10:00:00.000Z', tags: {} }
{
  createdAt: 2026-03-01T10:00:00.000Z,
  tags: Set(1) { 'js' },
  note: undefined
}
```

La copie via JSON a transformé la date en chaîne, vidé le `Set` et perdu `note`. `structuredClone`,
vu dans la leçon précédente, conserve tout cela. Pour copier, utilise `structuredClone` ; JSON
sert à **échanger** des données.

## JSON et sécurité

- `JSON.parse` est sûr : il ne fait que lire des données, il n’exécute jamais de code. N’utilise
  **jamais** `eval` pour lire du JSON : `eval` exécuterait n’importe quel code contenu dans le
  texte.
- Un JSON syntaxiquement valide n’est pas pour autant un JSON **correct**. Si tu attends
  `{ "age": 36 }` et que tu reçois `{ "age": "trente-six" }` ou `[]`, `JSON.parse` ne dira rien.
  Vérifie la forme et le type des valeurs reçues avant de t’en servir, surtout si elles
  viennent d’un utilisateur ou d’un service extérieur.

## Exercices

### Exercice 1 — Réparer un texte JSON

Ce texte, écrit à la main, est refusé par `JSON.parse`. Trouve toutes les erreurs, explique
chacune, puis écris la version corrigée et vérifie-la avec `JSON.parse`. La langue préférée
n’est pas connue.

```text
{
  'name': "Ada",
  "age": 36,
  "languages": ["fr", "en",],
  // langue préférée
  "favorite": undefined
}
```

:::solution
Quatre erreurs :

1. `'name'` : les clés (comme les chaînes) exigent des guillemets doubles.
2. `"en",]` : la virgule finale est interdite dans un tableau (et dans un objet).
3. `// langue préférée` : JSON n’a pas de commentaires.
4. `undefined` n’existe pas en JSON. Pour « valeur inconnue », on utilise `null` (ou on omet
   la clé, ce qui n’a pas tout à fait le même sens).

```js
const fixed = `{
  "name": "Ada",
  "age": 36,
  "languages": ["fr", "en"],
  "favorite": null
}`;
console.log(JSON.parse(fixed));
```

Sortie :

```text
{ name: 'Ada', age: 36, languages: [ 'fr', 'en' ], favorite: null }
```

Le gabarit de chaîne (accents graves) permet d’écrire le texte sur plusieurs lignes et de
garder les guillemets doubles sans les échapper.
:::

### Exercice 2 — Lire sans planter

Écris `safeParse(text)` qui ne lève jamais d’erreur : elle renvoie `{ ok: true, value }` si le
texte est du JSON valide, sinon `{ ok: false, error }` avec le message d’erreur. Teste un texte
valide, un texte invalide, `undefined` et le texte `'null'`.

:::solution
```js
function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

console.log(safeParse('{"theme":"sombre"}'));
console.log(safeParse('{theme: sombre}').ok);
console.log(safeParse(undefined).ok);
console.log(safeParse('null'));
```

Sortie :

```text
{ ok: true, value: { theme: 'sombre' } }
false
false
{ ok: true, value: null }
```

Renvoyer un objet `{ ok, … }` oblige l’appelant à regarder `ok` avant d’utiliser la valeur.
`JSON.parse(undefined)` convertit d’abord son argument en chaîne (`'undefined'`), qui n’est pas
du JSON : on obtient bien `ok: false`. Le dernier cas montre pourquoi il ne faut pas tester
`if (result.value)` : `null` est un résultat valide mais falsy.
:::

### Exercice 3 — Enregistrer une `Map`

Un stock est représenté par une `Map` produit → quantité. Écris `saveStock(stock)` qui renvoie
un texte JSON, et `loadStock(text)` qui reconstruit une `Map`. Montre d’abord ce que donne
`JSON.stringify` directement sur la `Map`.

:::solution
```js
function saveStock(stock) {
  return JSON.stringify(Array.from(stock));
}

function loadStock(text) {
  return new Map(JSON.parse(text));
}

const stock = new Map([
  ['pomme', 12],
  ['poire', 0],
]);

console.log(JSON.stringify(stock));
const text = saveStock(stock);
console.log(text);
const restored = loadStock(text);
console.log(restored.get('poire'), restored.size);
console.log(restored === stock);
```

Sortie :

```text
{}
[["pomme",12],["poire",0]]
0 2
false
```

Sérialisée directement, la `Map` donne `{}` : tout est perdu. `Array.from(map)` produit un
tableau de paires `[clé, valeur]`, que JSON sait représenter, et le constructeur `new Map`
accepte justement un tableau de paires. On aurait aussi pu passer par un objet avec
`Object.fromEntries(map)` puis `new Map(Object.entries(obj))`, mais seulement si les clés sont
des chaînes. La `Map` restaurée est une copie, pas l’objet d’origine.
:::

## Récapitulatif

- JSON est un format texte normalisé pour échanger des données entre programmes et langages.
- `JSON.stringify(valeur, replacer, indentation)` produit une chaîne ; `JSON.parse(texte,
  reviver)` reconstruit de nouvelles valeurs.
- Syntaxe stricte : guillemets doubles, pas de virgule finale, pas de commentaire, pas
  d’`undefined`. Un texte invalide lève une `SyntaxError` : protège `JSON.parse` avec
  `try…catch`.
- Pertes silencieuses : dates → chaînes, `undefined` et fonctions → supprimés (ou `null` dans un
  tableau), `NaN`/`Infinity` → `null`, `Map`/`Set` → `{}`.
- Erreurs : `BigInt` et références circulaires lèvent une `TypeError`.
- Convertis avant d’écrire, reconstruis après lecture (ou utilise un reviver).
- Pour copier, `structuredClone` ; pour échanger, JSON. Jamais `eval`.
