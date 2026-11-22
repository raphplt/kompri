---
title: Requêtes paramétrées et injection SQL
summary: Comprendre l’injection SQL en la provoquant sur une base d’entraînement, puis l’empêcher systématiquement avec des requêtes paramétrées et des listes blanches.
durationMinutes: 55
sources:
  - title: OWASP — SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
  - title: OWASP — SQL Injection
    url: https://owasp.org/www-community/attacks/SQL_Injection
  - title: node-postgres — Queries (requêtes paramétrées)
    url: https://node-postgres.com/features/queries
---

Une application reçoit sans arrêt des données venues de l’extérieur : un terme de recherche, un
identifiant dans l’URL, une adresse e-mail dans un formulaire. Ces données doivent finir dans des
requêtes SQL. La façon dont tu les y places décide de la sécurité de toute ta base.

Cette leçon commence par une démonstration : tu vas attaquer ta propre base, pour comprendre
concrètement ce qu’est une **injection SQL**. Ensuite, tu apprendras la seule défense fiable, les
**requêtes paramétrées**, et ce qu’elles ne couvrent pas.

:::warning[Uniquement sur ta base d’entraînement]
Les exemples d’attaque de cette leçon modifient des données. Lance-les seulement sur ta base
`mediatheque` locale, que tu peux recharger avec `mediatheque.sql`. Tester une attaque sur un
système qui ne t’appartient pas est illégal, même « pour voir ».
:::

## Le problème : coller une valeur dans du SQL

Une page « mot de passe oublié » cherche un adhérent par son adresse e-mail. Le réflexe naturel
est de construire la requête avec un gabarit de chaîne. Crée `injection.js` dans ton projet
`library-api` :

```js
import { pool } from './src/db.js';

// VERSION VULNÉRABLE : ne jamais écrire ceci
async function findMemberByEmail(email) {
  const sql = `SELECT id, name FROM members WHERE email = '${email}'`;
  console.log('SQL envoyé :', sql);
  const { rows } = await pool.query(sql);
  return rows;
}

try {
  console.log(await findMemberByEmail('bilal@example.com'));
  console.log(await findMemberByEmail("' OR '1'='1"));
} finally {
  await pool.end();
}
```

```bash
node --env-file=.env injection.js
```

```text
SQL envoyé : SELECT id, name FROM members WHERE email = 'bilal@example.com'
[ { id: 2, name: 'Bilal Mansour' } ]
SQL envoyé : SELECT id, name FROM members WHERE email = '' OR '1'='1'
[
  { id: 1, name: 'Alice Durand' },
  { id: 2, name: 'Bilal Mansour' },
  { id: 3, name: 'Chloé Fabre' },
  { id: 4, name: 'David Nguyen' },
  { id: 5, name: 'Eva Rossi' }
]
```

Avec une adresse normale, tout va bien. Avec la saisie `' OR '1'='1`, l’apostrophe **ferme** la
chaîne SQL prévue par le développeur, et la suite devient du code SQL : la condition
`email = '' OR '1'='1'` est vraie pour toutes les lignes. La « recherche d’un adhérent » renvoie
tous les adhérents. Sur un formulaire de connexion, la même technique peut contourner une
vérification ; sur une page de recherche, elle peut faire fuiter le contenu d’autres tables.

C’est cela, une **injection SQL** : une donnée fournie par l’utilisateur est interprétée comme
du **code** SQL, parce que code et données ont été mélangés dans une même chaîne.

### Pire : exécuter n’importe quelle instruction

Quand une requête est envoyée sans paramètres, PostgreSQL accepte **plusieurs instructions**
séparées par des points-virgules. Une saisie bien choisie peut donc ajouter sa propre instruction
(`injection2.js`) :

```js
import { pool } from './src/db.js';

async function findMemberByEmail(email) {
  const sql = `SELECT id, name FROM members WHERE email = '${email}'`;
  const { rows } = await pool.query(sql);
  return rows;
}

try {
  const result = await findMemberByEmail("'; DELETE FROM loans; --");
  console.log(result);
  const { rows } = await pool.query('SELECT count(*) AS n FROM loans');
  console.log('emprunts restants :', rows[0].n);
} finally {
  await pool.end();
}
```

```text
undefined
emprunts restants : 0
```

Le SQL réellement exécuté était :

```sql
SELECT id, name FROM members WHERE email = ''; DELETE FROM loans; --'
```

Trois morceaux : un `SELECT` sans résultat, un `DELETE` qui **vide la table des emprunts**, et
`--`, qui transforme la fin de la ligne en commentaire pour neutraliser l’apostrophe restante.
L’historique des prêts a disparu. (Le `undefined` vient de ce que `pool.query` renvoie un tableau
de résultats quand il y a plusieurs instructions.) Recharge ta base avant de continuer :

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
```

L’OWASP, la fondation de référence en sécurité applicative, classe l’injection parmi les risques
majeurs des applications web. Ce n’est pas un cas d’école : c’est une faille réelle, facile à
exploiter, et facile à éviter.

## La solution : les requêtes paramétrées

Une **requête paramétrée** sépare définitivement le code et les données. Le texte SQL contient
des **marqueurs** `$1`, `$2`… à la place des valeurs, et les valeurs sont passées à part, dans un
tableau :

```js
import { pool } from './src/db.js';

async function findMemberByEmail(email) {
  const { rows } = await pool.query('SELECT id, name FROM members WHERE email = $1', [email]);
  return rows;
}

try {
  console.log(await findMemberByEmail('bilal@example.com'));
  console.log(await findMemberByEmail("' OR '1'='1"));
  console.log(await findMemberByEmail("'; DELETE FROM loans; --"));
  const { rows } = await pool.query('SELECT count(*) AS n FROM loans');
  console.log('emprunts restants :', rows[0].n);
} finally {
  await pool.end();
}
```

```text
[ { id: 2, name: 'Bilal Mansour' } ]
[]
[]
emprunts restants : 8
```

Les deux attaques ne renvoient rien et ne cassent rien : aucun adhérent n’a pour adresse le texte
`' OR '1'='1`. Pourquoi est-ce sûr, et pas seulement « mieux » ? Avec des paramètres, `pg`
utilise un mode du protocole PostgreSQL où le texte de la requête et les valeurs voyagent dans
des **messages séparés**. Le serveur analyse d’abord le SQL, avec ses marqueurs, puis reçoit les
valeurs. À ce moment-là, l’analyse est terminée : une valeur ne peut plus jamais être lue comme du
code, quelles que soient les apostrophes, points-virgules ou commentaires qu’elle contient.

Ce mode refuse d’ailleurs plusieurs instructions dans une même requête paramétrée. Avec un texte
SQL comme `'SELECT id FROM members WHERE email = $1; DELETE FROM loans'`, PostgreSQL répond par
une erreur dont le code et le message sont :

```text
42601 cannot insert multiple commands into a prepared statement
```

:::tip[Une règle sans exception]
Toute valeur qui vient de l’extérieur du code (requête HTTP, fichier, variable d’environnement,
autre base…) passe par un paramètre `$n`. Même un identifiant numérique « déjà vérifié », même
une valeur « qui ne peut pas contenir d’apostrophe ». Une règle sans exception ne demande aucun
jugement au cas par cas, et c’est ce qui la rend fiable.
:::

## Utiliser les paramètres au quotidien

### Plusieurs paramètres

Les marqueurs sont numérotés dans l’ordre du tableau de valeurs. Un même marqueur peut être
réutilisé plusieurs fois dans la requête.

```js
const r1 = await pool.query(
  'SELECT title, price FROM books WHERE price BETWEEN $1 AND $2 ORDER BY price',
  [10, 20],
);
console.log(r1.rows);
```

```text
[
  { title: 'Poèmes du matin', price: '11.00' },
  { title: 'Carnet de voyage', price: '12.00' },
  { title: 'Nuit sur le port', price: '18.50' }
]
```

Le nombre de valeurs doit correspondre aux marqueurs. Une valeur manquante produit une erreur
explicite. Dans les exemples d’erreur de cette leçon, on capture l’erreur avec `try … catch` et
on affiche `error.code` suivi de `error.message` :

```text
08P01 bind message supplies 1 parameters, but prepared statement "" requires 2
```

### Les recherches avec LIKE

Le marqueur remplace **une valeur entière**. Pour une recherche « contient », on construit le
motif en JavaScript, et c’est ce motif complet qui devient le paramètre :

```js
const term = 'phare';
const r2 = await pool.query('SELECT title FROM books WHERE title ILIKE $1', [`%${term}%`]);
console.log(r2.rows);
```

```text
[ { title: 'Le Dernier Phare' } ]
```

Le gabarit de chaîne est ici sans danger : il fabrique une **valeur**, pas du SQL. Remarque qu’un
utilisateur qui tape `%` ou `_` élargit la recherche, ces caractères gardant leur sens de joker
dans la valeur. Ce n’est pas une injection (aucun code n’est exécuté), mais si cela pose
problème, on peut échapper ces caractères avant de construire le motif.

Écrire le marqueur entre apostrophes est une erreur fréquente : `'$1'` est alors un simple texte
de deux caractères, et PostgreSQL ne voit **aucun** marqueur.

```js
await pool.query("SELECT id FROM members WHERE email = '$1'", ['bilal@example.com']);
```

```text
08P01 bind message supplies 1 parameters, but prepared statement "" requires 0
```

### Une liste de valeurs

`IN ($1)` ne fonctionne pas avec un tableau : il attend des valeurs séparées. On passe un
**tableau** JavaScript, converti par `pg` en tableau PostgreSQL, et on utilise `= ANY($1)` :

```js
const r3 = await pool.query('SELECT id, title FROM books WHERE id = ANY($1) ORDER BY id', [[2, 5, 7]]);
console.log(r3.rows);
```

```text
[
  { id: 2, title: 'Nuit sur le port' },
  { id: 5, title: 'Le Dernier Phare' },
  { id: 7, title: 'Mystère à Lyon' }
]
```

Note les doubles crochets : le tableau des valeurs contient **un** paramètre, qui est lui-même un
tableau.

### Les types des valeurs

`pg` convertit les valeurs JavaScript : un nombre, une chaîne, `true`/`false`, `null` (qui devient
`NULL`), un `Date` (qui devient un instant), un tableau. PostgreSQL vérifie ensuite que la valeur
convient au type attendu :

```js
await pool.query('SELECT title FROM books WHERE id = $1', ['abc']);
```

```text
22P02 invalid input syntax for type integer: "abc"
```

La requête échoue proprement avec le code SQLSTATE `22P02`, sans rien exécuter d’imprévu. Il
reste préférable de valider les entrées **avant** la requête (un identifiant doit être un entier
positif), pour renvoyer une erreur claire à l’utilisateur.

## Ce que les paramètres ne peuvent pas faire : les identifiants

Un paramètre remplace une **valeur**, jamais un nom de table, de colonne, un mot-clé comme
`ASC`/`DESC`. Un nom de table en paramètre est une erreur de syntaxe :

```js
await pool.query('SELECT title FROM $1', ['books']);
```

```text
42601 syntax error at or near "$1"
```

Plus sournois, un tri passé en paramètre ne produit **aucune erreur** :

```js
const { rows } = await pool.query('SELECT title, price FROM books ORDER BY $1 LIMIT 3', ['price']);
console.log(rows);
```

```text
[
  { title: 'Le Jardin des algorithmes', price: '29.90' },
  { title: 'Nuit sur le port', price: '18.50' },
  { title: 'La Cuisine du dimanche', price: '24.00' }
]
```

Les livres ne sont pas triés par prix : PostgreSQL trie par la **valeur** `'price'`, la même
chaîne pour toutes les lignes, ce qui revient à ne pas trier du tout.

Quand l’utilisateur choisit une colonne de tri, on utilise une **liste blanche** : on associe
chaque choix autorisé à un nom de colonne **écrit par le développeur**, et on refuse tout le
reste. Seule la valeur choisie dans la liste est insérée dans le SQL.

```js
import { pool } from './src/db.js';

// Liste blanche : clé reçue de l'extérieur → nom de colonne écrit par nous
const SORTABLE_COLUMNS = new Map([
  ['title', 'title'],
  ['price', 'price'],
  ['year', 'published_year'],
]);

async function listBooks(sort = 'title', direction = 'asc') {
  const column = SORTABLE_COLUMNS.get(sort);
  if (column === undefined) {
    throw new Error(`Tri non autorisé : ${sort}`);
  }
  const order = direction === 'desc' ? 'DESC' : 'ASC';
  const { rows } = await pool.query(
    `SELECT title, price, published_year FROM books ORDER BY ${column} ${order} NULLS LAST, id LIMIT $1`,
    [3],
  );
  return rows;
}

try {
  console.log(await listBooks('price', 'desc'));
  console.log(await listBooks('year'));
  console.log(await listBooks('price; DROP TABLE books'));
} catch (error) {
  console.log(error.message);
} finally {
  await pool.end();
}
```

```text
[
  {
    title: 'Bases de données pour tous',
    price: '35.00',
    published_year: 2022
  },
  {
    title: 'Le Jardin des algorithmes',
    price: '29.90',
    published_year: 2019
  },
  {
    title: 'La Cuisine du dimanche',
    price: '24.00',
    published_year: 2018
  }
]
[
  { title: 'Le Dernier Phare', price: '9.90', published_year: 2016 },
  {
    title: 'La Cuisine du dimanche',
    price: '24.00',
    published_year: 2018
  },
  {
    title: 'Le Jardin des algorithmes',
    price: '29.90',
    published_year: 2019
  }
]
Tri non autorisé : price; DROP TABLE books
```

Trois détails comptent :

- la valeur insérée dans le SQL (`column`, `order`) ne vient **jamais** directement de
  l’utilisateur : elle est choisie parmi des chaînes écrites dans le code ;
- `direction` n’est pas recopié : on choisit `'DESC'` ou `'ASC'` selon une comparaison ;
- on utilise une `Map` plutôt qu’un objet littéral. Avec un objet `{ title: 'title' }`, la clé
  `'constructor'` renverrait une fonction héritée de `Object`, et la vérification serait
  contournée (sans injection, mais avec une erreur SQL imprévue).

Les autres valeurs, comme la limite ici, restent des paramètres.

## Les idées reçues sur la protection

- **« J’échappe les apostrophes moi-même. »** Remplacer `'` par `''` couvre un cas, pas tous les
  contextes (nombres sans apostrophes, noms de colonnes, encodages). Les recommandations de
  l’OWASP placent les requêtes paramétrées en première ligne, l’échappement manuel n’est pas une
  défense à privilégier.
- **« Je valide les entrées, donc je peux concaténer. »** La validation est utile pour la qualité
  des données, mais une règle oubliée suffit. Les paramètres protègent même quand la validation
  est incomplète. On fait les deux.
- **« Mon ORM me protège. »** Les ORM et constructeurs de requêtes utilisent des paramètres, mais
  presque tous offrent aussi une porte de sortie pour écrire du SQL brut. Là, la même règle
  s’applique.
- **« C’est une donnée interne, pas une saisie. »** Une valeur lue en base, dans un fichier ou
  dans une autre API peut avoir été fournie par un utilisateur à un moment. Paramètre.

## Pièges et idées reçues

- **Un gabarit de chaîne `${…}` dans le texte SQL** avec une valeur extérieure : injection.
- **`'$1'` entre apostrophes** : ce n’est plus un marqueur.
- **`IN ($1)` avec un tableau** : utilise `= ANY($1)`.
- **Un nom de colonne ou un sens de tri en paramètre** : erreur ou tri silencieusement ignoré.
  Liste blanche.
- **Un objet littéral comme liste blanche** : les clés héritées (`constructor`, `toString`)
  passent le test. Utilise une `Map` ou `Object.hasOwn`.
- **Oublier les apostrophes ou les guillemets dans les données de test** : teste toujours tes
  fonctions avec des valeurs comme `O'Brien` ou `' OR '1'='1`.

## Exercices

### Exercice 1 : corriger une recherche vulnérable

Cette fonction cherche des livres par titre et prix maximum. Réécris-la avec des paramètres, puis
appelle-la avec `('le', 25)` et avec `("' OR 1=1 --", 100)`.

```js
async function searchBooks(term, maxPrice) {
  const { rows } = await pool.query(
    `SELECT title, price FROM books
     WHERE title ILIKE '%${term}%' AND price <= ${maxPrice}
     ORDER BY price, id`,
  );
  return rows;
}
```

:::solution
```js
import { pool } from './src/db.js';

async function searchBooks(term, maxPrice) {
  const { rows } = await pool.query(
    `SELECT title, price
     FROM books
     WHERE title ILIKE $1 AND price <= $2
     ORDER BY price, id`,
    [`%${term}%`, maxPrice], // le motif est une valeur, construite en JavaScript
  );
  return rows;
}

try {
  console.log(await searchBooks('le', 25));
  console.log(await searchBooks("' OR 1=1 --", 100));
} finally {
  await pool.end();
}
```

```text
[
  { title: 'Le Dernier Phare', price: '9.90' },
  { title: 'Nuit sur le port', price: '18.50' }
]
[]
```

Les deux valeurs étaient injectables dans la version d’origine : le terme (par une apostrophe)
**et** le prix, qui n’était même pas entre apostrophes (`maxPrice = '100 OR 1=1'` aurait suffi).
Le gabarit de chaîne restant (`%${term}%`) construit une valeur passée en paramètre : il est sûr.
:::

### Exercice 2 : une pagination triable

Écris `listBooksPage({ sort, direction, page, pageSize })` qui renvoie `id`, `title` et `price`
d’une page du catalogue. Tri autorisé sur `title` ou `price` (par défaut `title`), sens `asc` ou
`desc`, `page` à partir de 1, `pageSize` de 1 à 50 (par défaut 3). Un tri non autorisé ou une page
invalide lève une erreur. Affiche la page 2 triée par prix décroissant, puis essaie
`sort: 'constructor'`.

:::solution
```js
import { pool } from './src/db.js';

const SORTABLE_COLUMNS = new Map([
  ['title', 'title'],
  ['price', 'price'],
]);

async function listBooksPage({ sort = 'title', direction = 'asc', page = 1, pageSize = 3 } = {}) {
  const column = SORTABLE_COLUMNS.get(sort);
  if (column === undefined) throw new Error(`Tri non autorisé : ${sort}`);
  const order = direction === 'desc' ? 'DESC' : 'ASC';
  if (!Number.isInteger(page) || page < 1) throw new Error('Page invalide');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('Taille de page invalide');

  const { rows } = await pool.query(
    `SELECT id, title, price FROM books ORDER BY ${column} ${order}, id LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize], // les nombres restent des paramètres
  );
  return rows;
}

try {
  console.log(await listBooksPage({ sort: 'price', direction: 'desc', page: 2 }));
  console.log(await listBooksPage({ sort: 'constructor' }));
} catch (error) {
  console.log(error.message);
} finally {
  await pool.end();
}
```

```text
[
  { id: 7, title: 'Mystère à Lyon', price: '21.00' },
  { id: 2, title: 'Nuit sur le port', price: '18.50' },
  { id: 6, title: 'Carnet de voyage', price: '12.00' }
]
Tri non autorisé : constructor
```

La colonne et le sens de tri viennent de la liste blanche et d’une comparaison, jamais de la
saisie ; `LIMIT` et `OFFSET` sont des paramètres. Le `, id` final garantit un ordre total pour la
pagination. La `Map` refuse `constructor`, qu’un objet littéral aurait laissé passer.
:::

### Exercice 3 : sûr ou pas ?

Pour chaque extrait, dis s’il est vulnérable à l’injection, et pourquoi. `req.query` contient des
valeurs envoyées par le navigateur.

```js
// A
pool.query(`SELECT * FROM books WHERE id = ${Number(req.query.id)}`);
// B
pool.query('SELECT * FROM books WHERE genre_id = $1', [req.query.genre]);
// C
pool.query(`SELECT * FROM books ORDER BY ${req.query.sort}`);
// D
const email = req.query.email.replaceAll("'", "''");
pool.query(`SELECT * FROM members WHERE email = '${email}'`);
```

:::solution
- **A** : pas injectable en pratique, car `Number(…)` ne produit qu’un nombre ou `NaN` (qui
  donnera une erreur SQL). Mais c’est une exception qui demande de réfléchir : écris
  `WHERE id = $1` avec `[id]`, et valide que `id` est un entier.
- **B** : sûr. La valeur est un paramètre ; une valeur non numérique provoquera seulement une
  erreur `22P02`, qu’il vaut mieux prévenir par une validation.
- **C** : **vulnérable**. N’importe quel texte devient du SQL. Il faut une liste blanche.
- **D** : protection fragile. L’échappement manuel couvre ce cas précis, mais c’est une défense
  que l’OWASP ne recommande pas en première intention : un contexte oublié, une autre fonction
  écrite sans échappement, et la faille revient. Utilise `$1`.

La règle simple qui évite d’avoir à raisonner : les valeurs en paramètres, les identifiants par
liste blanche, aucune saisie dans le texte SQL.
:::

## Récapitulatif

- Une **injection SQL** survient quand une donnée extérieure est collée dans le texte d’une
  requête et interprétée comme du code : fuite de données, contournement, destruction.
- Sans paramètres, PostgreSQL accepte plusieurs instructions en une requête : `'; DELETE … --`
  peut vider une table.
- Une **requête paramétrée** (`pool.query('… $1 …', [valeur])`) envoie le SQL et les valeurs
  séparément : une valeur ne peut jamais devenir du code.
- Le motif d’un `LIKE` se construit en JavaScript puis passe en paramètre ; une liste passe en
  tableau avec `= ANY($1)` ; `'$1'` entre apostrophes n’est pas un marqueur.
- Les noms de colonnes, de tables et `ASC`/`DESC` ne peuvent pas être des paramètres : liste
  blanche (`Map`) de valeurs écrites dans le code.
- L’échappement manuel et la seule validation ne remplacent pas les paramètres ; on valide **et**
  on paramètre.
