---
title: Faire évoluer le schéma avec des migrations
summary: Versionner chaque changement de schéma dans un fichier SQL numéroté, l’appliquer une seule fois par base grâce à une table de suivi et un petit script Node.js, et faire évoluer des données existantes sans les perdre.
durationMinutes: 55
sources:
  - title: PostgreSQL — ALTER TABLE
    url: https://www.postgresql.org/docs/current/sql-altertable.html
  - title: PostgreSQL — Tutoriel, transactions
    url: https://www.postgresql.org/docs/current/tutorial-transactions.html
  - title: node-postgres — Transactions
    url: https://node-postgres.com/features/transactions
  - title: Node.js — Système de fichiers (fs/promises)
    url: https://nodejs.org/api/fs.html
---

Jusqu’ici, tu reconstruisais la base avec `mediatheque.sql`, qui commence par
`DROP TABLE IF EXISTS`. C’est parfait pour s’entraîner, et inacceptable dès que la base contient
de vraies données : en production, on ne supprime pas la table des adhérents pour lui ajouter une
colonne « téléphone ».

Or un schéma évolue tout au long de la vie d’une application : une colonne de plus, un index pour
une requête devenue lente, une nouvelle table, une contrainte. Ces changements doivent être
appliqués **dans le même ordre** sur ta machine, celle de tes collègues, la base de test et la
production, **une seule fois** sur chacune, et **sans perte de données**. C’est le rôle des
**migrations**.

## Le principe

Une migration est un fichier qui décrit **un changement** du schéma, à partir de l’état laissé par
la migration précédente. Les règles du jeu :

1. Les migrations sont des fichiers SQL **numérotés** (`001_…`, `002_…`), rangés dans un dossier
   `migrations/` et **versionnés avec Git**, à côté du code qui en dépend.
2. Elles sont appliquées **dans l’ordre** de leur numéro.
3. Chaque base garde la liste des migrations déjà appliquées dans une **table de suivi**. Un
   script n’applique que celles qui manquent.
4. Une migration appliquée quelque part **n’est plus jamais modifiée**. Pour corriger ou changer
   d’avis, on écrit une **nouvelle** migration.
5. Chaque migration s’exécute dans une **transaction** : elle réussit entièrement ou ne laisse
   aucune trace.

Grâce à ces règles, la base de n’importe quel environnement peut être amenée au dernier état du
schéma avec une seule commande, et l’historique Git raconte comment le schéma a évolué.

## Les premiers fichiers de migration

Crée une nouvelle base vide pour l’API, distincte de la base d’entraînement :

```bash
createdb -h localhost -U postgres library_api
```

Puis, dans le projet `library-api`, un dossier `migrations/` avec trois fichiers. Ils reprennent
le schéma de la médiathèque, **sans** `DROP TABLE` et **sans** données d’exemple.

`migrations/001_create_catalog.sql` :

```sql
CREATE TABLE genres (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE authors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  isbn text NOT NULL UNIQUE,
  genre_id integer REFERENCES genres (id) ON DELETE SET NULL,
  published_year integer CHECK (published_year BETWEEN 1450 AND 2100),
  price numeric(6, 2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE book_authors (
  book_id integer NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  author_id integer NOT NULL REFERENCES authors (id) ON DELETE RESTRICT,
  PRIMARY KEY (book_id, author_id)
);
```

`migrations/002_create_members_and_loans.sql` :

```sql
CREATE TABLE members (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  joined_on date NOT NULL DEFAULT current_date
);

CREATE TABLE loans (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id integer NOT NULL REFERENCES books (id) ON DELETE RESTRICT,
  member_id integer NOT NULL REFERENCES members (id) ON DELETE RESTRICT,
  loaned_on date NOT NULL,
  due_on date NOT NULL,
  returned_on date,
  CONSTRAINT loans_due_after_loan CHECK (due_on > loaned_on),
  CONSTRAINT loans_return_after_loan CHECK (returned_on IS NULL OR returned_on >= loaned_on)
);
```

`migrations/003_index_loans_foreign_keys.sql`, qui ajoute les index sur les clés étrangères des
emprunts (PostgreSQL ne les crée pas automatiquement) :

```sql
CREATE INDEX loans_book_id_idx ON loans (book_id);
CREATE INDEX loans_member_id_idx ON loans (member_id);
```

Le numéro sur trois chiffres avec des zéros devant (`001`, `002`… `010`) permet de trier les noms
par ordre alphabétique et d’obtenir l’ordre d’application. Sans les zéros, `10_…` serait trié
avant `2_…`.

## Le script de migration

Le script doit : créer la table de suivi si elle n’existe pas, lister les fichiers, retrouver
ceux qui sont déjà appliqués, puis appliquer les autres un par un, chacun dans sa transaction.
Il réutilise `pool` et `withTransaction` de `src/db.js` (leçon 4). Crée `scripts/migrate.js` :

```js
import { readdir, readFile } from 'node:fs/promises';
import { pool, withTransaction } from '../src/db.js';

const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);
const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;

async function migrate() {
  // La table de suivi : une ligne par migration appliquée
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => MIGRATION_FILE.test(name)).sort();
  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.version));
  const pending = files.filter((name) => !applied.has(name));

  if (pending.length === 0) {
    console.log('Base à jour : aucune migration à appliquer.');
    return;
  }

  for (const name of pending) {
    const sql = await readFile(new URL(name, MIGRATIONS_DIR), 'utf8');
    // Le contenu du fichier et son enregistrement réussissent ou échouent ensemble
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [name]);
    });
    console.log(`Appliquée : ${name}`);
  }
}

try {
  await migrate();
} catch (error) {
  console.error(`Migration interrompue : ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
```

Les points délicats :

- **`new URL('../migrations/', import.meta.url)`** désigne le dossier `migrations/` par rapport
  au fichier du script, et non au dossier depuis lequel on lance la commande. Le script
  fonctionne donc quel que soit le dossier courant.
- **Le filtre `MIGRATION_FILE`** ignore les fichiers qui ne suivent pas la convention (un
  `README`, une copie de sauvegarde).
- **`client.query(sql)` sans paramètres** : le fichier contient plusieurs instructions, ce
  qu’autorise une requête sans paramètres. Ce n’est pas une faille ici : le contenu vient de
  fichiers écrits par l’équipe et relus dans Git, jamais d’un utilisateur.
- **La migration et son enregistrement** dans `schema_migrations` sont dans la **même**
  transaction. Si la migration échoue, rien n’est enregistré et elle sera retentée la fois
  suivante ; si elle réussit, elle ne sera plus jamais rejouée. PostgreSQL permet d’annuler la
  plupart des instructions de schéma (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`) dans une
  transaction, ce que tous les SGBD ne font pas.
- **`process.exitCode = 1`** signale l’échec au terminal ou à l’outil de déploiement qui lance le
  script, sans interrompre brutalement la fermeture du pool.

Ajoute une commande au `package.json` :

```json
{
  "scripts": {
    "db:migrate": "node --env-file=.env scripts/migrate.js"
  }
}
```

Mets à jour `DATABASE_URL` dans `.env` pour viser la base `library_api`, puis lance :

```bash
npm run db:migrate
```

```text
Appliquée : 001_create_catalog.sql
Appliquée : 002_create_members_and_loans.sql
Appliquée : 003_index_loans_foreign_keys.sql
```

(npm affiche aussi, avant, le nom de la commande qu’il exécute.) Relance-la immédiatement :

```text
Base à jour : aucune migration à appliquer.
```

Le script est **idempotent** : on peut le lancer autant de fois qu’on veut, il ne fait que ce qui
manque. C’est ce qui permet de l’exécuter automatiquement à chaque déploiement.

## Faire évoluer le schéma

La médiathèque veut enregistrer le téléphone des adhérents, facultatif, entre 6 et 20 caractères.
On ne modifie pas `002_create_members_and_loans.sql` : il a déjà été appliqué. On écrit une
**nouvelle** migration. Voici une première version, avec une faute de frappe volontaire dans le
nom de la table de la seconde instruction :

```sql
ALTER TABLE members ADD COLUMN phone text;
ALTER TABLE member ADD CONSTRAINT members_phone_length CHECK (length(phone) BETWEEN 6 AND 20);
```

Enregistre-la sous `migrations/004_add_members_phone.sql` et lance la migration, puis affiche le
code de sortie avec `echo $?` :

```text
Migration interrompue : relation "member" does not exist
```

```text
1
```

La première instruction avait réussi, mais toute la transaction a été annulée : `\d members`
dans `psql` montre que la colonne `phone` **n’existe pas**, et `schema_migrations` ne contient
toujours que trois lignes. La base n’est pas restée dans un état à moitié migré. Corrige le
fichier (`member` devient `members`) — c’est permis, puisqu’il n’a été appliqué nulle part — et
relance :

```sql
ALTER TABLE members ADD COLUMN phone text;
ALTER TABLE members ADD CONSTRAINT members_phone_length CHECK (length(phone) BETWEEN 6 AND 20);
```

```text
Appliquée : 004_add_members_phone.sql
```

La table de suivi raconte l’histoire de la base :

```sql
SELECT version FROM schema_migrations ORDER BY version;
```

```text
             version
----------------------------------
 001_create_catalog.sql
 002_create_members_and_loans.sql
 003_index_loans_foreign_keys.sql
 004_add_members_phone.sql
(4 rows)
```

La colonne `applied_at`, non affichée ici, indique quand chaque migration a été appliquée sur
cette base.

:::note[« Jamais modifiée », vraiment ?]
La règle porte sur les migrations **appliquées ailleurs que chez toi**. Tant qu’une migration n’a
quitté ni ta machine ni ta branche, tu peux la corriger (et, si tu l’as appliquée localement,
recréer ta base de développement). Dès qu’elle a été poussée et appliquée par un collègue ou en
production, elle est figée : une modification ne serait jamais rejouée sur les bases qui l’ont
déjà, et les environnements divergeraient sans que personne ne le voie.
:::

## Les migrations de données

Certaines évolutions touchent aussi les données existantes. Exemple : l’équipe veut garantir que
les e-mails sont toujours enregistrés en minuscules, avec une contrainte `CHECK (email =
lower(email))`. Si la base contient déjà `'Alice@Example.com'`, ajouter la contrainte seule
échoue :

```text
Migration interrompue : check constraint "members_email_lowercase" of relation "members" is violated by some row
```

La migration doit donc d’abord **transformer les données**, puis ajouter la règle, dans le même
fichier, donc dans la même transaction :

```sql
-- Données d'abord : les adresses existantes passent en minuscules
UPDATE members SET email = lower(email) WHERE email <> lower(email);
-- Puis la règle, pour toutes les écritures futures
ALTER TABLE members ADD CONSTRAINT members_email_lowercase CHECK (email = lower(email));
```

Tu mettras ce cas en pratique dans l’exercice 2.

Quelques précautions pour les migrations sur des données réelles :

- **Ajouter une colonne obligatoire à une table remplie** : `ADD COLUMN … NOT NULL` échoue si
  des lignes existent sans valeur par défaut. On ajoute la colonne avec un `DEFAULT`, ou on
  l’ajoute facultative, on la remplit, puis on ajoute `NOT NULL` dans une migration suivante.
- **Supprimer ou renommer** une colonne casse le code qui l’utilise encore. On procède en
  plusieurs étapes : le code cesse de l’utiliser, puis une migration la supprime.
- **Les grosses tables** : certaines modifications verrouillent la table pendant leur exécution.
  Sur une table volumineuse en production, cela se prépare (et se teste sur une copie).
- **Les données d’exemple** (`INSERT` de livres de démonstration) ne vont pas dans les
  migrations, qui s’appliquent aussi en production. Elles vont dans un script séparé, réservé au
  développement.

## Et les outils existants ?

Le petit script de cette leçon suffit pour un projet modeste, et surtout il te montre ce que font
les outils. Il existe des outils de migration éprouvés, par exemple `node-pg-migrate`, les
migrations de Knex, Prisma Migrate, ou, hors de l’écosystème Node.js, Flyway et Liquibase. Ils
reposent sur le même principe (fichiers ordonnés, table de suivi, une application par base) et
ajoutent des fonctions utiles : vérification qu’une migration appliquée n’a pas été modifiée,
verrou pour empêcher deux déploiements de migrer en même temps, migrations d’annulation,
génération de fichiers horodatés pour éviter que deux collègues créent le même numéro. Quand tu
en adopteras un, tu sauras lire ce qu’il fait.

## Pièges et idées reçues

- **Modifier une migration déjà appliquée ailleurs** : les bases divergent en silence. Écris une
  nouvelle migration.
- **Un script de schéma avec `DROP TABLE`** utilisé comme migration : perte de données.
- **Appliquer les changements à la main dans `psql`** sur une base partagée : personne ne saura
  les rejouer ailleurs.
- **Numéroter sans zéros** (`1_`, `2_`, `10_`) : l’ordre alphabétique devient faux.
- **Deux instructions sans transaction** : un échec au milieu laisse la base à moitié migrée.
- **Mettre des données de démonstration dans une migration** : elles arrivent en production.
- **Lancer les migrations depuis plusieurs serveurs à la fois** : sans verrou, deux processus
  peuvent appliquer la même migration. Lance-les depuis une seule étape de déploiement.

## Exercices

Travaille sur la base `library_api`, avec les migrations 001 à 004 déjà appliquées.

### Exercice 1 : une colonne et un index

La médiathèque veut stocker un résumé facultatif pour chaque livre, et la page « livres d’un
genre » a besoin d’un index sur `books.genre_id`. Écris la migration, applique-la et vérifie
qu’elle est enregistrée.

:::solution
`migrations/005_add_books_summary.sql` :

```sql
ALTER TABLE books ADD COLUMN summary text;           -- facultative : pas de NOT NULL
CREATE INDEX books_genre_id_idx ON books (genre_id); -- clé étrangère utilisée pour filtrer
```

```bash
npm run db:migrate
```

```text
Appliquée : 005_add_books_summary.sql
```

Seule la nouvelle migration est appliquée. Le numéro `005` suit le dernier existant ; dans
`psql`, `SELECT version FROM schema_migrations ORDER BY version;` affiche désormais cinq lignes,
et `\d books` montre la colonne `summary` et l’index `books_genre_id_idx`. Deux changements liés
au même besoin peuvent partager une migration ; des changements sans rapport méritent chacun la
leur.
:::

### Exercice 2 : normaliser les e-mails

Insère d’abord, dans `psql`, des adhérents dont certains e-mails contiennent des majuscules :

```sql
INSERT INTO members (name, email, phone) VALUES
  ('Alice Durand', 'Alice@Example.com', '06 00 00 00 01'),
  ('Bilal Mansour', 'bilal@example.com', NULL),
  ('Chloé Fabre', 'CHLOE@example.com', NULL);
```

Écris la migration 006 qui garantit que tous les e-mails, présents et futurs, sont en minuscules.
Essaie d’abord une version qui ne contient que la contrainte, observe l’échec, puis écris la
bonne version et vérifie le résultat.

:::solution
Première version, `migrations/006_lowercase_member_emails.sql` :

```sql
ALTER TABLE members ADD CONSTRAINT members_email_lowercase CHECK (email = lower(email));
```

```text
Migration interrompue : check constraint "members_email_lowercase" of relation "members" is violated by some row
```

PostgreSQL vérifie la contrainte sur les lignes existantes. La migration est annulée et n’est
pas enregistrée : on peut corriger le fichier.

```sql
-- Données d'abord : les adresses existantes passent en minuscules
UPDATE members SET email = lower(email) WHERE email <> lower(email);
-- Puis la règle, pour toutes les écritures futures
ALTER TABLE members ADD CONSTRAINT members_email_lowercase CHECK (email = lower(email));
```

```text
Appliquée : 006_lowercase_member_emails.sql
```

Vérification dans `psql` :

```sql
SELECT id, email FROM members ORDER BY id;
INSERT INTO members (name, email) VALUES ('Test', 'Test@Example.com');
```

```text
 id |       email
----+-------------------
  1 | alice@example.com
  2 | bilal@example.com
  3 | chloe@example.com
(3 rows)

ERROR:  new row for relation "members" violates check constraint "members_email_lowercase"
DETAIL:  Failing row contains (4, Test, Test@Example.com, 2026-11-21, null).
```

(La date affichée dans le détail est celle du jour.) Attention : si deux adresses ne différaient
que par la casse (`Alice@…` et `alice@…`), l’`UPDATE` violerait la contrainte `UNIQUE` et la
migration échouerait. Il faudrait d’abord décider, avec l’équipe, quoi faire des doublons. Côté
application, le `POST /members` de la leçon 4 enregistrait déjà l’e-mail en minuscules : la
contrainte garantit désormais la règle pour toutes les sources d’écriture.
:::

### Exercice 3 : une migration modifiée

Une collègue a appliqué `004_add_members_phone.sql` en production la semaine dernière. Aujourd’hui,
elle modifie ce fichier pour autoriser jusqu’à 25 caractères au lieu de 20, le pousse dans Git,
et lance `npm run db:migrate` en production. Que se passe-t-il ? Que fallait-il faire ?

:::solution
Le script répond `Base à jour : aucune migration à appliquer.` : `004_add_members_phone.sql`
figure déjà dans `schema_migrations`, il n’est pas relu. La production garde la limite de 20
caractères, alors que le fichier dans Git annonce 25. Pire, une nouvelle base créée de zéro
(un collègue, un environnement de test) aurait la limite de 25 : les environnements divergent
sans que personne ne le voie.

Il fallait écrire une **nouvelle** migration, par exemple
`migrations/007_widen_members_phone.sql` :

```sql
ALTER TABLE members DROP CONSTRAINT members_phone_length;
ALTER TABLE members ADD CONSTRAINT members_phone_length CHECK (length(phone) BETWEEN 6 AND 25);
```

Les deux instructions s’exécutent dans la même transaction : il n’y a aucun instant où la colonne
n’est pas protégée. Les outils de migration du marché détectent souvent ce genre d’erreur en
enregistrant une empreinte de chaque fichier appliqué ; notre script simple ne le fait pas,
d’où l’importance de la règle.
:::

## Récapitulatif

- Une **migration** est un fichier SQL numéroté, versionné dans Git, qui décrit un changement du
  schéma ; les migrations s’appliquent dans l’ordre, une seule fois par base.
- Une table **`schema_migrations`** enregistre les migrations appliquées ; le script n’applique
  que celles qui manquent et peut être relancé sans risque.
- Chaque migration s’exécute avec son enregistrement dans **une transaction** : en cas d’erreur,
  rien n’est appliqué ni enregistré, et le script se termine avec un code de sortie non nul.
- Une migration appliquée ailleurs ne se modifie jamais : on en écrit une nouvelle.
- Une migration de données transforme les lignes existantes **avant** d’ajouter la règle qui les
  contraint.
- Les données de démonstration restent hors des migrations.
- Des outils (`node-pg-migrate`, Knex, Prisma Migrate, Flyway, Liquibase) appliquent le même
  principe avec des garanties supplémentaires.
