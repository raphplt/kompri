---
title: L’injection SQL
summary: Comprendre comment une donnée devient du code SQL, l’exploiter sur une base de test, puis la rendre impossible.
durationMinutes: 55
sources:
  - title: OWASP — SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
  - title: OWASP Top 10 2021 — A03 Injection
    url: https://owasp.org/Top10/2021/A03_2021-Injection/
  - title: node-postgres — Queries
    url: https://node-postgres.com/features/queries
  - title: PostgreSQL — Pattern Matching (LIKE)
    url: https://www.postgresql.org/docs/current/functions-matching.html
---

## Le problème : quand une donnée devient du code

Dans la compétence « Base de données depuis Node », tu as appris à écrire des requêtes
paramétrées avec `pool.query(texte, valeurs)`. Cette leçon montre **pourquoi** cette règle
n’a pas d’exception, en attaquant volontairement une requête mal écrite.

L’injection se produit quand un programme **assemble du code** (ici du SQL) en y collant des
données venues de l’extérieur. Le moteur SQL reçoit une seule chaîne de caractères : il ne
peut plus distinguer la partie écrite par le développeur de la partie fournie par
l’utilisateur. Si cette dernière contient une apostrophe, elle ferme la chaîne SQL et tout ce
qui suit devient du SQL exécuté. C’est la catégorie **A03:2021 Injection** du Top 10.

:::warning[Uniquement sur ta base de test]
Les attaques de cette leçon s’exécutent sur une base créée pour l’occasion, sur ta machine.
Tester une application qui ne t’appartient pas sans autorisation écrite est illégal en
France (articles 323-1 et suivants du Code pénal).

:::

## Préparer la base de test

Crée une base dédiée et une table de produits, dont un produit masqué :

```bash
createdb shop_security
psql shop_security
```

```sql
CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  is_hidden boolean NOT NULL DEFAULT false
);
INSERT INTO products (name, price_cents, is_hidden) VALUES
  ('Théière en fonte', 3900, false),
  ('Tasse en grès', 1200, false),
  ('Prototype secret', 99900, true);
```

Dans un dossier de projet en modules ES avec `pg` installé (`npm install pg`), indique
l’adresse de la base dans une variable d’environnement. Adapte l’utilisateur, le mot de passe
et le port à ton installation :

```bash
export DATABASE_URL=postgres://postgres@localhost:5432/shop_security
```

## Attaquer une requête concaténée

Voici une recherche de produits telle qu’on en trouve encore, y compris dans du code
proposé par une IA pressée :

```js
// search-vulnerable.js — NE PAS REPRODUIRE : exemple volontairement vulnérable
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const term = process.argv[2] ?? '';

const sql =
  "SELECT id, name, price_cents FROM products " +
  "WHERE is_hidden = false AND name ILIKE '%" + term + "%'";

console.log('Requête envoyée :', sql);
try {
  const result = await pool.query(sql);
  console.table(result.rows);
} catch (error) {
  console.error('Erreur SQL :', error.message);
} finally {
  await pool.end();
}
```

### Utilisation normale

```bash
node search-vulnerable.js tasse
```

```text
Requête envoyée : SELECT id, name, price_cents FROM products WHERE is_hidden = false AND name ILIKE '%tasse%'
┌─────────┬────┬─────────────────┬─────────────┐
│ (index) │ id │ name            │ price_cents │
├─────────┼────┼─────────────────┼─────────────┤
│ 0       │ 2  │ 'Tasse en grès' │ 1200        │
└─────────┴────┴─────────────────┴─────────────┘
```

### Premier symptôme : l’apostrophe

Un client cherche « l’eau » en tapant une apostrophe droite :

```bash
node search-vulnerable.js "l'eau"
```

```text
Requête envoyée : SELECT id, name, price_cents FROM products WHERE is_hidden = false AND name ILIKE '%l'eau%'
Erreur SQL : syntax error at or near "eau"
```

Une erreur de syntaxe sur une saisie ordinaire est le signe classique d’une injection
possible : l’apostrophe de l’utilisateur a **fermé** la chaîne SQL ouverte par le développeur.

### Contourner un filtre

L’attaquant ferme la chaîne, ajoute une condition toujours vraie et neutralise la fin de la
requête avec `--`, qui commence un commentaire en SQL :

```bash
node search-vulnerable.js "%' OR 1=1 --"
```

```text
Requête envoyée : SELECT id, name, price_cents FROM products WHERE is_hidden = false AND name ILIKE '%%' OR 1=1 --%'
┌─────────┬────┬────────────────────┬─────────────┐
│ (index) │ id │ name               │ price_cents │
├─────────┼────┼────────────────────┼─────────────┤
│ 0       │ 1  │ 'Théière en fonte' │ 3900        │
│ 1       │ 2  │ 'Tasse en grès'    │ 1200        │
│ 2       │ 3  │ 'Prototype secret' │ 99900       │
└─────────┴────┴────────────────────┴─────────────┘
```

Lis la requête envoyée : `AND` étant prioritaire sur `OR`, la condition devient
« (non masqué et nom quelconque) **ou** vrai ». Le produit masqué apparaît. Sur un formulaire
de connexion écrit de la même façon, la même technique permet d’entrer sans mot de passe.

### Lire d’autres données

Avec `UNION`, l’attaquant ajoute ses propres lignes au résultat, à condition d’avoir le même
nombre de colonnes :

```bash
node search-vulnerable.js "zzz' UNION SELECT 0, current_user, 0 --"
```

```text
Requête envoyée : SELECT id, name, price_cents FROM products WHERE is_hidden = false AND name ILIKE '%zzz' UNION SELECT 0, current_user, 0 --%'
┌─────────┬────┬────────────┬─────────────┐
│ (index) │ id │ name       │ price_cents │
├─────────┼────┼────────────┼─────────────┤
│ 0       │ 0  │ 'postgres' │ 0           │
└─────────┴────┴────────────┴─────────────┘
```

Le nom affiché est celui de l’utilisateur PostgreSQL de ta connexion. À la place de
`current_user`, l’attaquant peut lire n’importe quelle colonne de n’importe quelle table
accessible : adresses e-mail, empreintes de mots de passe…

### Modifier la base

Sans paramètres, `pg` envoie la chaîne avec le protocole « simple » de PostgreSQL, qui
accepte **plusieurs instructions** séparées par des points-virgules :

```bash
node search-vulnerable.js "zzz'; UPDATE products SET price_cents = 1; --"
psql shop_security -c "SELECT id, name, price_cents FROM products ORDER BY id"
```

```text
Requête envoyée : SELECT id, name, price_cents FROM products WHERE is_hidden = false AND name ILIKE '%zzz'; UPDATE products SET price_cents = 1; --%'
undefined
 id |       name       | price_cents
----+------------------+-------------
  1 | Théière en fonte |           1
  2 | Tasse en grès    |           1
  3 | Prototype secret |           1
(3 rows)
```

Tous les prix valent désormais 1 centime. (Le `undefined` vient de `console.table` : avec
plusieurs instructions, `pg` renvoie un tableau de résultats et `result.rows` n’existe pas.)
Remets la table en état avant de continuer, par exemple en la recréant.

## La parade : les requêtes paramétrées

Avec une requête paramétrée, le texte SQL et les valeurs voyagent **séparément** jusqu’à
PostgreSQL. Le texte est analysé seul, avec des emplacements `$1`, `$2`… ; les valeurs sont
ensuite fournies comme des données, jamais analysées comme du SQL. Une apostrophe dans la
valeur reste une apostrophe.

```js
// search-safe.js — recherche avec requête paramétrée
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Neutralise les jokers de LIKE pour chercher le texte tel quel
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => '\\' + char);
}

// Seules ces colonnes peuvent servir au tri : liste blanche
const sortColumns = { name: 'name', price: 'price_cents' };

async function searchProducts(term, sort = 'name') {
  const column = sortColumns[sort];
  if (!column) throw new Error(`Tri non autorisé : ${sort}`);
  const sql =
    'SELECT id, name, price_cents FROM products ' +
    "WHERE is_hidden = false AND name ILIKE '%' || $1 || '%' " +
    `ORDER BY ${column}`;
  const result = await pool.query(sql, [escapeLike(term)]);
  return result.rows;
}

const [term = '', sort] = process.argv.slice(2);
try {
  console.table(await searchProducts(term, sort));
} catch (error) {
  console.error('Erreur :', error.message);
} finally {
  await pool.end();
}
```

Rejoue les attaques sur la table remise en état :

```bash
node search-safe.js "%' OR 1=1 --"
node search-safe.js "zzz'; UPDATE products SET price_cents = 1; --"
node search-safe.js "" price
node search-safe.js "" "price_cents; DROP TABLE products"
```

```text
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
┌─────────┬────┬────────────────────┬─────────────┐
│ (index) │ id │ name               │ price_cents │
├─────────┼────┼────────────────────┼─────────────┤
│ 0       │ 2  │ 'Tasse en grès'    │ 1200        │
│ 1       │ 1  │ 'Théière en fonte' │ 3900        │
└─────────┴────┴────────────────────┴─────────────┘
Erreur : Tri non autorisé : price_cents; DROP TABLE products
```

Les deux premières recherches ne trouvent rien : aucun produit ne s’appelle littéralement
`%' OR 1=1 --`. Le tri par prix fonctionne, et le tri malveillant est refusé avant même
d’atteindre la base.

### Trois détails de ce code

1. **`'%' || $1 || '%'`** : la concaténation des jokers se fait **dans** PostgreSQL, avec
   l’opérateur `||`. Le paramètre reste une donnée.
2. **`escapeLike`** : dans un motif `LIKE`/`ILIKE`, `%` signifie « n’importe quelle suite » et
   `_` « un caractère ». Sans échappement, chercher `%` renverrait tout. Ce n’est pas une
   injection SQL (on ne sort pas de la chaîne), mais un comportement inattendu. PostgreSQL
   utilise par défaut la barre oblique inverse comme caractère d’échappement dans `LIKE`.
3. **La liste blanche pour `ORDER BY`** : un paramètre `$1` ne peut remplacer qu’une
   **valeur**, jamais un nom de table, de colonne ni un mot-clé comme `ASC`/`DESC`.

### Ce que les paramètres ne peuvent pas remplacer

Vérifie-le toi-même :

```js
// params-limits.js — ce que $1 accepte et refuse
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const byIds = await pool.query(
  'SELECT id, name FROM products WHERE id = ANY($1) ORDER BY id',
  [[1, 3, 99]],
);
console.log(byIds.rows);

const page = await pool.query(
  'SELECT id, name FROM products ORDER BY id LIMIT $1 OFFSET $2',
  [2, 1],
);
console.log(page.rows);

try {
  await pool.query('SELECT id FROM $1', ['products']);
} catch (error) {
  console.log('Erreur :', error.message);
}
try {
  await pool.query("SELECT 1; SELECT 2 WHERE $1 = 'a'", ['a']);
} catch (error) {
  console.log('Erreur :', error.message);
}
await pool.end();
```

Sortie :

```text
[
  { id: 1, name: 'Théière en fonte' },
  { id: 3, name: 'Prototype secret' }
]
[
  { id: 2, name: 'Tasse en grès' },
  { id: 3, name: 'Prototype secret' }
]
Erreur : syntax error at or near "$1"
Erreur : cannot insert multiple commands into a prepared statement
```

- Une **liste de valeurs** passe en un seul paramètre : `pg` convertit le tableau JavaScript en
  tableau PostgreSQL, et `= ANY($1)` remplace un `IN (…)` construit à la main.
- `LIMIT` et `OFFSET` acceptent des paramètres.
- Un **nom de table** ne peut pas être un paramètre : erreur de syntaxe.
- Avec des paramètres, une seule instruction est acceptée : les instructions empilées sont
  impossibles.

:::note
`ORDER BY $1` ne provoque pas d’erreur, mais ne fait pas ce que tu crois : PostgreSQL trie par
la **valeur constante** du paramètre, identique pour toutes les lignes, donc l’ordre n’est pas
garanti. Pour un tri dynamique, utilise toujours une liste blanche de colonnes.

:::

## Limiter les dégâts : moindre privilège

Les requêtes paramétrées empêchent l’injection. La défense en profondeur consiste à limiter
ce qu’un attaquant pourrait faire si une requête fautive t’échappait. L’API n’a pas besoin
d’être propriétaire des tables. Crée un rôle dédié, avec les seuls droits nécessaires :

```sql
-- Exécuté par le propriétaire de la base (ici postgres)
CREATE ROLE shop_app LOGIN PASSWORD 'change-me-in-dev';
GRANT CONNECT ON DATABASE shop_security TO shop_app;
GRANT USAGE ON SCHEMA public TO shop_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO shop_app;
```

Connecte-toi avec ce rôle et tente une destruction :

```bash
psql "postgres://shop_app:change-me-in-dev@localhost:5432/shop_security" \
  -c "DROP TABLE products" -c "CREATE TABLE t (x int)"
```

```text
ERROR:  must be owner of table products
ERROR:  permission denied for schema public
LINE 1: CREATE TABLE t (x int)
                     ^
```

Le rôle ne peut ni supprimer la table ni en créer d’autres. Il pourrait toujours modifier
les prix par une injection : le moindre privilège **réduit** les dégâts, il ne **remplace**
pas les requêtes paramétrées. Les migrations, elles, s’exécutent avec un rôle propriétaire,
utilisé seulement au déploiement.

## Ne pas aider l’attaquant : les messages d’erreur

Dans la version vulnérable, le message `syntax error at or near "eau"` affiché à l’utilisateur
confirme l’injection et guide l’attaquant. Côté API, journalise l’erreur détaillée pour toi,
et renvoie au client un message générique :

```js
app.use((error, req, res, next) => {
  console.error(error); // détail dans les journaux du serveur
  res.status(500).json({ error: 'Erreur interne' }); // rien d’exploitable pour le client
});
```

Afficher le détail d’une erreur SQL en production relève de la catégorie **A05:2021 Security
Misconfiguration**.

## Pièges et idées reçues

- **« J’échappe les apostrophes avec `replace`. »** L’échappement manuel oublie toujours un
  cas (barre oblique inverse, encodages, champs numériques sans guillemets). Les paramètres
  sont la solution, pas un `replace`.
- **« Les gabarits de chaînes protègent. »** `` `WHERE id = ${id}` `` est exactement une
  concaténation : même vulnérabilité, en plus lisible.
- **« Ce champ est un nombre, il n’y a pas d’apostrophe à fermer. »** Avec
  `"WHERE id = " + req.params.id`, l’attaquant n’a même pas besoin d’apostrophe :
  `1 OR 1=1` suffit.
- **« La donnée vient de ma base, elle est sûre. »** Un pseudo enregistré hier par un
  utilisateur et réinjecté par concaténation dans une autre requête produit une injection
  « de second ordre ». Paramètre **toutes** les valeurs, quelle que soit leur origine.
- **« J’utilise un ORM, je suis protégé. »** Les ORM paramètrent leurs requêtes générées,
  mais proposent presque tous une fonction de SQL brut, vulnérable si on y concatène.

## Exercices

### Exercice 1 — Trouver et corriger

Cette fonction de connexion est vulnérable. Donne une valeur de `email` qui permet de se
connecter comme le premier utilisateur sans connaître son mot de passe, explique pourquoi,
puis corrige la requête. (Le stockage du mot de passe en clair est un autre défaut grave,
traité dans la compétence suivante.)

```js
async function findUser(pool, email, password) {
  const result = await pool.query(
    `SELECT id, email FROM users WHERE email = '${email}' AND password = '${password}'`,
  );
  return result.rows[0] ?? null;
}
```

:::solution
Avec `email` valant `' OR 1=1 --` et un mot de passe quelconque, la requête devient :

```sql
SELECT id, email FROM users WHERE email = '' OR 1=1 --' AND password = 'x'
```

Tout ce qui suit `--` est un commentaire : la vérification du mot de passe disparaît, la
condition est toujours vraie, et `rows[0]` est le premier utilisateur de la table, souvent
l’administrateur. Correction :

```js
async function findUserByEmail(pool, email) {
  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}
```

On cherche l’utilisateur par son e-mail seulement ; la vérification du mot de passe se fera en
JavaScript, avec une fonction de hachage adaptée. La valeur malveillante est alors comparée
littéralement à des e-mails et ne trouve personne.

:::

### Exercice 2 — Tri et filtre dynamiques

Écris une fonction `listProducts(pool, { maxPrice, sort, direction })` qui renvoie les
produits non masqués dont le prix est inférieur ou égal à `maxPrice` (en centimes), triés par
`name` ou `price` dans l’ordre `asc` ou `desc`. Valeurs par défaut : pas de limite de prix,
tri par nom croissant. Toute valeur non prévue provoque une erreur.

:::solution
```js
const sortColumns = { name: 'name', price: 'price_cents' };
const directions = { asc: 'ASC', desc: 'DESC' };

export async function listProducts(pool, { maxPrice, sort = 'name', direction = 'asc' } = {}) {
  const column = sortColumns[sort];
  const order = directions[direction];
  if (!column || !order) throw new Error('Tri invalide');
  if (maxPrice !== undefined && !(Number.isInteger(maxPrice) && maxPrice >= 0)) {
    throw new Error('Prix maximal invalide');
  }
  const result = await pool.query(
    `SELECT id, name, price_cents FROM products
     WHERE is_hidden = false AND ($1::integer IS NULL OR price_cents <= $1)
     ORDER BY ${column} ${order}, id`,
    [maxPrice ?? null],
  );
  return result.rows;
}
```

Avec la table de départ, `await listProducts(pool, { maxPrice: 2000, sort: 'price', direction: 'desc' })`
renvoie `[ { id: 2, name: 'Tasse en grès', price_cents: 1200 } ]`.

- Seuls les **identifiants** (colonne, sens) sont insérés dans le texte, et uniquement depuis
  des objets dont tu écris les valeurs : l’entrée sert de clé, jamais de contenu.
- La **valeur** `maxPrice` passe en paramètre. `$1::integer IS NULL OR …` rend le filtre
  facultatif sans construire deux requêtes ; le transtypage `::integer` indique à PostgreSQL le
  type d’un paramètre qui peut valoir `null`.
- `, id` en fin de tri rend l’ordre stable quand deux produits ont le même prix.
- Attention à un détail : `sortColumns['constructor']` renverrait une fonction (héritée de
  `Object.prototype`), pas `undefined`. Ici la fonction ne serait pas une chaîne SQL valide et
  la requête échouerait ; pour une liste blanche stricte, préfère une `Map` ou
  `Object.hasOwn(sortColumns, sort)`.

:::

### Exercice 3 — Expliquer à l’oral

Sans code, explique en cinq phrases maximum pourquoi une requête paramétrée est immunisée
contre l’injection alors qu’un échappement manuel ne l’est pas toujours.

:::solution
Une réponse possible : « Avec une requête paramétrée, PostgreSQL reçoit d’abord le texte SQL
avec des emplacements, l’analyse et fixe sa structure. Les valeurs arrivent séparément et
sont traitées uniquement comme des données du type attendu : elles ne sont jamais relues
comme du SQL, quelle que soit leur contenu. Avec un échappement manuel, on reconstruit une
seule chaîne que le moteur analyse en entier ; la sécurité dépend alors de la capacité de
notre fonction à prévoir tous les caractères et contextes dangereux. Un oubli, un champ
numérique sans guillemets ou un encodage inattendu suffit à rouvrir la faille. »

:::

## Récapitulatif

- L’injection SQL survient quand une donnée est concaténée dans le texte d’une requête :
  l’apostrophe ferme la chaîne et la suite devient du SQL.
- Symptômes et exploitations : erreur de syntaxe sur une apostrophe, `OR 1=1`, `UNION`,
  instructions empilées avec `;`.
- Parade unique : requêtes paramétrées `pool.query(texte, valeurs)` pour **toutes** les
  valeurs, y compris celles qui viennent de la base.
- Les identifiants (colonnes, sens de tri) ne se paramètrent pas : liste blanche.
- Pour `LIKE`, échapper `%`, `_` et la barre oblique inverse ; pour une liste,
  `= ANY($1)` avec un tableau.
- Défense en profondeur : rôle PostgreSQL au moindre privilège et messages d’erreur
  génériques côté client.
