---
title: Se connecter avec pg et un pool
summary: Installer le client pg, lire la configuration dans DATABASE_URL, exécuter des requêtes avec un pool de connexions et comprendre la conversion des types PostgreSQL en valeurs JavaScript.
durationMinutes: 50
sources:
  - title: node-postgres — Documentation
    url: https://node-postgres.com/
  - title: node-postgres — Pooling
    url: https://node-postgres.com/features/pooling
  - title: Node.js — Options de la ligne de commande (--env-file)
    url: https://nodejs.org/api/cli.html
  - title: PostgreSQL — Chaînes de connexion
    url: https://www.postgresql.org/docs/current/libpq-connect.html
---

Jusqu’ici, tu parlais à PostgreSQL avec `psql`. Une application web, elle, doit envoyer ses
requêtes depuis son propre code : quand un visiteur demande la liste des livres, le serveur
Express interroge la base et renvoie le résultat en JSON. Il faut pour cela un **client
PostgreSQL** pour Node.js, une bibliothèque qui sait ouvrir une connexion réseau vers le serveur,
lui envoyer du SQL et convertir les réponses en objets JavaScript.

Le client le plus utilisé s’appelle `pg` (son projet s’appelle _node-postgres_). Cette leçon
t’apprend à l’installer, à le configurer proprement avec une variable d’environnement, à utiliser
un **pool** de connexions, et à comprendre ce que deviennent les types SQL côté JavaScript.

## Préparer le projet

Tu as besoin de la base `mediatheque` de la compétence précédente, chargée avec le fichier
`mediatheque.sql`. Rejoue-le pour repartir de données propres :

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
```

Crée ensuite un projet Node.js en modules ES et installe `pg` :

```bash
mkdir library-api
cd library-api
npm init -y
npm pkg set type=module
npm install pg
```

`npm pkg set type=module` ajoute `"type": "module"` dans `package.json` : les fichiers `.js` du
projet utilisent `import` et `export`.

## La configuration : DATABASE_URL

Pour se connecter, le client a besoin de l’hôte, du port, de l’utilisateur, du mot de passe et du
nom de la base. On les regroupe d’habitude dans une **URL de connexion** au format reconnu par
PostgreSQL :

```text
postgresql://utilisateur:motdepasse@hôte:port/base
```

Ces informations contiennent un secret (le mot de passe) et changent selon l’environnement (ta
machine, le serveur de test, la production). Elles n’ont donc rien à faire dans le code : on les
lit dans une **variable d’environnement**, par convention nommée `DATABASE_URL`.

Crée un fichier `.env` à la racine du projet, avec tes propres valeurs (ici celles du conteneur
Docker de la compétence « SQL : interroger des données ») :

```text
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/mediatheque
```

Et un fichier `.gitignore` pour que ce fichier ne soit **jamais** versionné :

```text
node_modules/
.env
```

Node.js 24 sait charger un tel fichier sans bibliothèque supplémentaire, grâce à l’option
`--env-file` :

```bash
node --env-file=.env script.js
```

Les variables du fichier sont alors disponibles dans `process.env`. Sur un serveur de production,
on ne crée pas de fichier `.env` : la plateforme d’hébergement définit directement la variable.

:::warning[Un secret ne se commite pas]
Une URL de connexion contient un mot de passe. Si elle arrive dans un dépôt Git, même une
minute, considère le mot de passe comme compromis et change-le : l’historique Git garde tout.
Le `.gitignore` est la première chose à écrire dans un projet qui utilise un `.env`.
:::

## Une première requête avec un client

Le plus simple pour commencer est un **client** unique, qui ouvre une seule connexion. Crée
`first-query.js` :

```js
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
const result = await client.query('SELECT id, title, price FROM books ORDER BY id LIMIT 3');
console.log(result.rows);
console.log(`${result.rowCount} lignes, commande ${result.command}`);
await client.end();
```

```bash
node --env-file=.env first-query.js
```

```text
[
  { id: 1, title: 'Le Jardin des algorithmes', price: '29.90' },
  { id: 2, title: 'Nuit sur le port', price: '18.50' },
  { id: 3, title: 'La Cuisine du dimanche', price: '24.00' }
]
3 lignes, commande SELECT
```

Quelques observations :

- On importe l’objet par défaut du paquet (`import pg from 'pg'`) puis on utilise `pg.Client`
  ou `pg.Pool`. Les versions récentes de `pg` acceptent aussi les imports nommés
  (`import { Pool } from 'pg'`), forme utilisée par sa documentation : les deux fonctionnent.
- Toutes les méthodes renvoient des **promesses** : on les attend avec `await`. Dans un module
  ES, `await` est permis au niveau principal du fichier.
- `client.query` renvoie un objet résultat : `rows` (un tableau d’objets, un par ligne, dont les
  clés sont les noms de colonnes), `rowCount` (le nombre de lignes renvoyées ou modifiées) et
  `command` (`SELECT`, `INSERT`…).
- `client.end()` ferme la connexion. Sans elle, le processus Node.js reste ouvert et ne se
  termine jamais : la connexion réseau le maintient en vie.

## Du SQL au JavaScript : les conversions de types

Remarque le prix : `'29.90'`, entre apostrophes. C’est une **chaîne**, pas un nombre. Le client
convertit chaque type PostgreSQL en une valeur JavaScript, et certains choix surprennent. Voici
ce que donne une ligne qui contient des types variés (`server_time` vaut `now()`, il change à
chaque exécution) :

```js
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT b.id, b.title, b.price, b.published_year, b.genre_id,
         l.loaned_on, l.returned_on, (l.returned_on IS NULL) AS ongoing,
         (SELECT count(*) FROM loans) AS loans_count,
         now() AS server_time
  FROM books AS b
  JOIN loans AS l ON l.book_id = b.id
  WHERE l.id = 3
`);
const row = rows[0];
for (const [key, value] of Object.entries(row)) {
  console.log(key.padEnd(14), typeof value, value instanceof Date ? 'Date' : '', key === 'server_time' ? '(variable)' : value);
}
await client.end();
```

Exécuté sur une machine réglée sur l’heure de Paris :

```text
id             number  4
title          string  Bases de données pour tous
price          string  35.00
published_year number  2022
genre_id       number  2
loaned_on      object Date 2024-09-30T22:00:00.000Z
returned_on    object  null
ongoing        boolean  true
loans_count    string  8
server_time    object Date (variable)
```

| Type PostgreSQL            | Valeur JavaScript reçue | Pourquoi                                                     |
| -------------------------- | ----------------------- | ------------------------------------------------------------ |
| `integer`                  | `number`                | tient sans perte dans un nombre JavaScript                   |
| `text`, `varchar`          | `string`                |                                                              |
| `boolean`                  | `boolean`               |                                                              |
| `NULL`                     | `null`                  | (`typeof null` vaut `'object'`, une bizarrerie historique de JS) |
| `numeric`                  | `string`                | un nombre JS perdrait la précision décimale exacte           |
| `bigint` (dont `count(*)`) | `string`                | un nombre JS ne représente pas exactement tous les `bigint`  |
| `timestamptz`              | `Date`                  | un instant, ce que représente un `Date`                      |
| `date`                     | `Date`                  | minuit **dans le fuseau du processus Node.js**               |

Deux conséquences pratiques.

**Les nombres en chaîne.** `count(*)` renvoie un `bigint`, donc `'8'`. Si tu additionnes sans
convertir, `'8' + 1` donne `'81'`. Convertis explicitement avec `Number(…)` quand la valeur tient
dans un nombre JavaScript (un comptage, un prix pour l’affichage). Pour des calculs monétaires
exacts, fais plutôt le calcul en SQL, où `numeric` est exact.

**Le piège des dates.** La date d’emprunt `2024-10-01` est devenue `2024-09-30T22:00:00.000Z` :
le client a créé un `Date` à minuit **heure de Paris**, soit 22 h la veille en UTC. Envoyée en
JSON à un navigateur, elle s’affichera peut-être au 30 septembre. Le même script lancé avec un
fuseau UTC afficherait `2024-10-01T00:00:00.000Z` : le résultat dépend de la machine. La solution
la plus simple est de garder les `date` en chaîne `'AAAA-MM-JJ'`, en le demandant une fois pour
toutes au module de conversion de `pg` :

```js
import pg from 'pg';

// 1082 est l’identifiant interne du type date : on garde la chaîne 'AAAA-MM-JJ' telle quelle.
pg.types.setTypeParser(1082, (value) => value);
```

Tu pourrais aussi convertir dans la requête (`loaned_on::text`), mais il faudrait y penser à
chaque fois.

## Le pool de connexions

Ouvrir une connexion PostgreSQL coûte cher : échange réseau, authentification, création d’un
processus côté serveur. Un serveur web qui ouvrirait une connexion par requête HTTP perdrait du
temps et, sous forte charge, épuiserait le nombre de connexions que PostgreSQL accepte.

Un **pool** garde un petit ensemble de connexions ouvertes et les **prête** aux requêtes qui en
ont besoin. Quand une requête est finie, la connexion retourne dans le pool, prête à resservir.
Si toutes les connexions sont occupées, les requêtes suivantes attendent leur tour.

```js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

pool.on('error', (error) => {
  console.error('Erreur inattendue sur une connexion inactive', error);
});

// Dix requêtes lancées en même temps : le pool les répartit sur 5 connexions au plus.
const titles = await Promise.all(
  [1, 2, 3, 4, 5, 6, 7, 8, 1, 2].map(async (id) => {
    const { rows } = await pool.query('SELECT title FROM books WHERE id = $1', [id]);
    return rows[0].title;
  }),
);
console.log(titles.length, 'titres lus');
console.log(`connexions ouvertes : ${pool.totalCount}, inactives : ${pool.idleCount}`);

await pool.end();
```

```text
10 titres lus
connexions ouvertes : 5, inactives : 5
```

- `max` fixe le nombre maximal de connexions (10 par défaut). Dix requêtes simultanées n’ont
  ouvert que cinq connexions.
- `pool.query(…)` emprunte une connexion, exécute la requête et rend la connexion
  automatiquement. C’est la méthode à utiliser pour une requête isolée.
- Le `$1` et le tableau `[id]` sont une **requête paramétrée** : c’est la seule façon correcte
  d’insérer une valeur dans une requête. La leçon suivante y est entièrement consacrée.
- L’écouteur `pool.on('error', …)` capte les erreurs qui surviennent sur une connexion **au
  repos** (le serveur redémarre, la connexion est coupée). Sans lui, une telle erreur ferait
  planter le processus.
- `pool.end()` ferme toutes les connexions. Dans un script, appelle-la à la fin ; dans un serveur
  web, à l’arrêt du serveur.

:::note[Que se passe-t-il sans pool.end() ?]
Avec un `Client`, le processus ne se termine jamais. Avec un `Pool`, il se termine une fois
toutes les connexions refermées pour inactivité, au bout de 10 secondes par défaut (option
`idleTimeoutMillis`). Dans les deux cas, ferme explicitement : un script qui « traîne » cache
souvent une connexion oubliée.
:::

## Un module de connexion unique

Dans une application, toutes les parties du code doivent partager **le même** pool. On le crée
donc une seule fois, dans un module dédié, qui vérifie aussi que la configuration est présente.
Crée `src/db.js` :

```js
import pg from 'pg';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('La variable d’environnement DATABASE_URL est manquante.');
}

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

pool.on('error', (error) => {
  console.error('Erreur inattendue du pool PostgreSQL :', error.message);
});
```

Un module ES n’est évalué qu’une fois : chaque fichier qui écrit `import { pool } from
'./src/db.js'` reçoit le même objet. La vérification de `DATABASE_URL` fait échouer
l’application **au démarrage**, avec un message clair, plutôt qu’à la première requête avec une
erreur réseau obscure. Sans elle, `pg` se rabattrait sur des valeurs par défaut (notamment
`localhost` et le port 5432) et l’erreur serait bien moins explicite.

Un script qui utilise ce module :

```js
import { pool } from './src/db.js';

try {
  const { rows } = await pool.query(`
    SELECT g.name, count(b.id) AS books_count, round(avg(b.price), 2) AS average_price
    FROM genres AS g
    LEFT JOIN books AS b ON b.genre_id = g.id
    GROUP BY g.id, g.name
    ORDER BY g.name
  `);
  for (const row of rows) {
    const count = Number(row.books_count); // count() renvoie un bigint, reçu en chaîne
    if (count === 0) {
      console.log(`${row.name} : aucun livre`);
    } else {
      console.log(`${row.name} : ${count} livre(s), prix moyen ${row.average_price} €`);
    }
  }
} finally {
  await pool.end();
}
```

```bash
node --env-file=.env genres.js
```

```text
cuisine : 1 livre(s), prix moyen 24.00 €
informatique : 2 livre(s), prix moyen 32.45 €
jeunesse : aucun livre
poésie : 1 livre(s), prix moyen 11.00 €
roman : 3 livre(s), prix moyen 16.47 €
```

Le bloc `try … finally` garantit que le pool est fermé même si la requête échoue. Lance le même
script **sans** `--env-file=.env` : il s’arrête immédiatement avec
`Error: La variable d’environnement DATABASE_URL est manquante.`

## Quand la connexion échoue

Les erreurs de connexion arrivent comme des promesses rejetées, avec une propriété `code`. Deux
cas fréquents :

```js
import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5999/mediatheque' });
try {
  await pool.query('SELECT 1');
} catch (error) {
  console.error('Connexion impossible :', error.code, error.message);
} finally {
  await pool.end();
}
```

```text
Connexion impossible : ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5999
```

`ECONNREFUSED` est une erreur **réseau** de Node.js : rien n’écoute sur ce port (serveur arrêté,
mauvais port). Si le serveur répond mais refuse la demande, l’erreur vient de PostgreSQL et son
`code` est un code **SQLSTATE** à cinq caractères. Par exemple, une base inexistante donne
`3D000` avec le message `database "…" does not exist`. Tu utiliseras ces codes dans la leçon 4
pour reconnaître les violations de contraintes.

## Pièges et idées reçues

- **Écrire l’URL de connexion dans le code** : le mot de passe finit dans Git. Utilise
  `process.env.DATABASE_URL` et un `.env` ignoré.
- **Oublier `--env-file=.env`** : sans vérification, `pg` tente `localhost:5432` et l’erreur est
  trompeuse.
- **Un nouveau `Pool` par requête** : c’est pire qu’un client unique. Un seul pool, partagé.
- **Oublier `client.end()` ou `pool.end()`** dans un script : le processus ne se termine pas (ou
  tarde).
- **Additionner des valeurs `numeric` ou `count(*)` sans conversion** : ce sont des chaînes.
- **Renvoyer des `date` converties en `Date`** : décalage d’un jour selon le fuseau. Garde-les en
  chaînes.
- **Pas d’écouteur `error` sur le pool** : une coupure réseau sur une connexion inactive fait
  planter le processus.

## Exercices

### Exercice 1 : le bilan des adhérents

Écris `members.js`, qui utilise `src/db.js` et affiche pour chaque adhérent son nom et son nombre
d’emprunts en cours, au format `Bilal Mansour : 1 emprunt(s) en cours`, par ordre alphabétique.
Le nombre doit être un vrai `number` JavaScript. Le pool doit être fermé même en cas d’erreur.

:::solution
```js
import { pool } from './src/db.js';

try {
  const { rows } = await pool.query(`
    SELECT m.name, count(l.id) AS ongoing_count
    FROM members AS m
    LEFT JOIN loans AS l ON l.member_id = m.id AND l.returned_on IS NULL
    GROUP BY m.id, m.name
    ORDER BY m.name
  `);
  for (const row of rows) {
    const ongoing = Number(row.ongoing_count); // bigint reçu en chaîne : conversion explicite
    console.log(`${row.name} : ${ongoing} emprunt(s) en cours`);
  }
} finally {
  await pool.end(); // exécuté même si la requête lève une erreur
}
```

```text
Alice Durand : 0 emprunt(s) en cours
Bilal Mansour : 1 emprunt(s) en cours
Chloé Fabre : 1 emprunt(s) en cours
David Nguyen : 1 emprunt(s) en cours
Eva Rossi : 0 emprunt(s) en cours
```

La condition `l.returned_on IS NULL` est dans le `ON` pour garder les adhérents sans emprunt en
cours (révision de la compétence précédente), et on compte `l.id`, pas `*`.
:::

### Exercice 2 : des dates fiables en JSON

Écris `loans-json.js`, qui affiche en JSON indenté les emprunts en cours (`id`, `book_id`,
`member_id`, `loaned_on`, `due_on`), triés par `id`. Les dates doivent apparaître au format
`"2024-10-01"`, quel que soit le fuseau horaire de la machine. Vérifie en lançant le script avec
`TZ=Europe/Paris` puis `TZ=UTC` devant la commande `node`.

:::solution
```js
import pg from 'pg';
import { pool } from './src/db.js';

// 1082 est l’identifiant interne du type date : on garde la chaîne 'AAAA-MM-JJ' telle quelle.
pg.types.setTypeParser(1082, (value) => value);

try {
  const { rows } = await pool.query(
    'SELECT id, book_id, member_id, loaned_on, due_on FROM loans WHERE returned_on IS NULL ORDER BY id',
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await pool.end();
}
```

```bash
TZ=Europe/Paris node --env-file=.env loans-json.js
```

```text
[
  {
    "id": 3,
    "book_id": 4,
    "member_id": 2,
    "loaned_on": "2024-10-01",
    "due_on": "2024-10-22"
  },
  {
    "id": 5,
    "book_id": 5,
    "member_id": 3,
    "loaned_on": "2024-10-16",
    "due_on": "2024-11-06"
  },
  {
    "id": 8,
    "book_id": 4,
    "member_id": 4,
    "loaned_on": "2024-11-19",
    "due_on": "2024-12-10"
  }
]
```

La sortie est identique avec `TZ=UTC`. Sans `setTypeParser`, `loaned_on` vaudrait
`"2024-09-30T22:00:00.000Z"` à Paris et `"2024-10-01T00:00:00.000Z"` en UTC. Le réglage est
global au processus : on le place en pratique dans `src/db.js`, pour qu’il s’applique partout.
:::

### Exercice 3 : expliquer un comportement

Un camarade a écrit ce script. Il affiche `81` au lieu de `9` et ne se termine pas tout de suite.
Explique les deux problèmes et corrige-les.

```js
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('SELECT count(*) AS n FROM loans');
console.log(rows[0].n + 1);
```

:::solution
- `count(*)` renvoie un `bigint`, que `pg` transmet sous forme de chaîne : `'8' + 1` est une
  concaténation, d’où `'81'`. Il faut `Number(rows[0].n) + 1`.
- Le pool n’est pas fermé : le processus attend que ses connexions inactives expirent (10
  secondes par défaut) avant de se terminer. Il faut `await pool.end()`, dans un `finally`.

```js
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query('SELECT count(*) AS n FROM loans');
  console.log(Number(rows[0].n) + 1);
} finally {
  await pool.end();
}
```

```text
9
```

Dans un vrai projet, on importerait aussi le pool partagé de `src/db.js` au lieu d’en créer un.
:::

## Récapitulatif

- `npm install pg`, puis `import pg from 'pg'` et `pg.Client` ou `pg.Pool`.
- La configuration vient de `process.env.DATABASE_URL`, chargée en développement avec
  `node --env-file=.env`. Le `.env` est dans `.gitignore`.
- Un **pool** partage quelques connexions entre toutes les requêtes ; `pool.query` emprunte et
  rend une connexion automatiquement. Un seul pool par application, créé dans un module dédié.
- Un écouteur `pool.on('error', …)` évite qu’une coupure ne fasse planter le processus ;
  `pool.end()` ferme proprement.
- `result.rows` contient les lignes, `result.rowCount` leur nombre.
- Conversions : `numeric` et `bigint` arrivent en chaînes, `date` en `Date` à minuit local
  (à garder en chaîne avec `setTypeParser(1082, …)`), `NULL` en `null`.
- Les erreurs PostgreSQL portent un `code` SQLSTATE ; les erreurs réseau un code Node.js comme
  `ECONNREFUSED`.
