---
title: Créer une base et une table avec psql
summary: Créer une base, déclarer une table avec une clé primaire auto-générée, l’inspecter avec les méta-commandes de psql et charger des données depuis un fichier.
durationMinutes: 50
sources:
  - title: PostgreSQL — CREATE TABLE
    url: https://www.postgresql.org/docs/current/sql-createtable.html
  - title: PostgreSQL — Documentation de psql
    url: https://www.postgresql.org/docs/current/app-psql.html
  - title: PostgreSQL — CREATE DATABASE
    url: https://www.postgresql.org/docs/current/sql-createdatabase.html
---

Tu sais te connecter au serveur et exécuter un `SELECT`. Il est temps de créer un espace à toi :
une base dédiée au projet, puis une table qui accueillera un catalogue de livres. C’est cette
table `books` que tu interrogeras dans toutes les leçons suivantes de la compétence.

Tu vas apprendre à écrire une instruction `CREATE TABLE` propre, à choisir une clé primaire
générée automatiquement, et à vérifier le résultat avec les méta-commandes de `psql`.

## Créer une base et s’y connecter

Connecte-toi avec `psql` comme dans la leçon précédente, puis crée une base nommée `library` :

```sql
CREATE DATABASE library;
```

```text
CREATE DATABASE
```

`psql` affiche le nom de la commande exécutée : c’est sa façon de dire « c’est fait ». La base
existe, mais tu es toujours connecté à la base `postgres`. Pour changer de base, utilise la
méta-commande `\c` (pour _connect_) :

```text
postgres=# \c library
You are now connected to database "library" as user "postgres".
library=#
```

L’invite affiche désormais `library=#`. Prends l’habitude de la regarder avant chaque commande :
créer une table dans la mauvaise base est une erreur fréquente.

Tu peux aussi créer une base sans ouvrir `psql`, avec le programme `createdb` installé en même
temps que PostgreSQL, puis ouvrir directement une session dessus :

```bash
createdb -h localhost -U postgres library
psql -h localhost -U postgres -d library
```

La méta-commande `\l` liste toutes les bases du serveur avec leur propriétaire et leur encodage.
Les colonnes affichées varient selon la version de `psql` ; ce qui compte, c’est d’y voir
`library`.

## Déclarer une table

Voici la table `books`. Lis-la attentivement, chaque ligne est expliquée ensuite.

```sql
CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  author text NOT NULL,
  genre text,
  published_year integer,
  pages integer,
  price numeric(6, 2) NOT NULL,
  in_stock boolean NOT NULL,
  added_on date NOT NULL
);
```

```text
CREATE TABLE
```

- `CREATE TABLE books ( … );` crée la table ; les colonnes sont séparées par des virgules, **sans
  virgule après la dernière**.
- Chaque colonne s’écrit `nom type`, éventuellement suivi d’options.
- `NOT NULL` rend la colonne **obligatoire** : une ligne sans titre sera refusée. Une colonne sans
  `NOT NULL` accepte l’absence de valeur, appelée `NULL` (le genre ou le nombre de pages peuvent
  être inconnus). Tu étudieras `NULL` en détail dans la leçon 5, et les autres contraintes dans
  la compétence suivante.
- `price numeric(6, 2)` : un montant exact jusqu’à 9999,99.
- `id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY` mérite sa propre section.

### Conventions de nommage

Les noms de tables et de colonnes s’écrivent en anglais, en minuscules, avec des tirets bas entre
les mots (`published_year`) : c’est la convention la plus répandue avec PostgreSQL, appelée
_snake_case_. Les noms de tables sont souvent au pluriel (`books`), ce n’est qu’une convention.

Il y a une raison technique à préférer les minuscules : PostgreSQL **convertit en minuscules** les
noms écrits sans guillemets. `CREATE TABLE Books` crée en réalité une table `books`. En revanche,
un nom entre guillemets doubles garde sa casse exacte, et il faudra alors **toujours** l’écrire
entre guillemets :

```sql
CREATE TABLE "Authors" (name text);
SELECT * FROM Authors;
```

```text
CREATE TABLE
ERROR:  relation "authors" does not exist
LINE 1: SELECT * FROM Authors;
                      ^
```

`Authors` sans guillemets est devenu `authors`, qui n’existe pas. Évite donc les majuscules et
les guillemets dans les noms. Si tu as essayé cet exemple, supprime la table avec
`DROP TABLE "Authors";`.

## La clé primaire auto-générée

`PRIMARY KEY` déclare la clé primaire : PostgreSQL garantit que `id` est unique et jamais absent.
Pour l’unicité, il crée automatiquement un **index** nommé `books_pkey`, une structure qui permet
de vérifier et de retrouver une valeur très vite.

`GENERATED ALWAYS AS IDENTITY` fait de `id` une **colonne d’identité** : PostgreSQL attribue
lui-même 1, 2, 3… à chaque nouvelle ligne, grâce à un compteur interne appelé **séquence**. Le mot
`ALWAYS` signifie que c’est toujours lui qui choisit : une valeur fournie à la main est refusée.

Tu rencontreras souvent, dans des tutoriels ou du code existant, une autre écriture : `serial`.
C’est un raccourci historique de PostgreSQL qui crée lui aussi une séquence. Comparons les deux
sur des tables jetables :

```sql
CREATE TABLE notes_serial (
  id serial PRIMARY KEY,
  body text NOT NULL
);
INSERT INTO notes_serial (id, body) VALUES (1, 'insérée avec un id choisi à la main');
INSERT INTO notes_serial (body) VALUES ('insérée sans id');
```

```text
CREATE TABLE
INSERT 0 1
ERROR:  duplicate key value violates unique constraint "notes_serial_pkey"
DETAIL:  Key (id)=(1) already exists.
```

Avec `serial`, l’insertion manuelle de l’`id` 1 est acceptée, mais la séquence n’en sait rien :
elle propose ensuite 1 à son tour, et l’insertion suivante échoue. Le bug apparaît **plus tard**,
loin de sa cause. Avec une colonne d’identité, l’erreur est immédiate et explicite :

```sql
CREATE TABLE notes_identity (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  body text NOT NULL
);
INSERT INTO notes_identity (id, body) VALUES (1, 'insérée avec un id choisi à la main');
```

```text
CREATE TABLE
ERROR:  cannot insert a non-DEFAULT value into column "id"
DETAIL:  Column "id" is an identity column defined as GENERATED ALWAYS.
HINT:  Use OVERRIDING SYSTEM VALUE to override.
```

```sql
INSERT INTO notes_identity (body) VALUES ('première note'), ('deuxième note');
SELECT * FROM notes_identity;
```

```text
INSERT 0 2
 id |     body
----+---------------
  1 | première note
  2 | deuxième note
(2 rows)
```

Les colonnes d’identité font partie de la norme SQL, alors que `serial` est propre à PostgreSQL.
Pour une nouvelle table, utilise `GENERATED ALWAYS AS IDENTITY`. Sache seulement reconnaître
`serial` quand tu le croises. Nettoie ensuite :

```sql
DROP TABLE notes_serial, notes_identity;
```

```text
DROP TABLE
```

:::note[Des trous dans la numérotation]
Une séquence ne revient jamais en arrière, même quand une insertion échoue. Si une insertion est
refusée (valeur obligatoire manquante, par exemple), le numéro qu’elle avait réservé est perdu et
tu verras des `id` 1, 2, 4. C’est normal : un identifiant sert à désigner une ligne, pas à
compter les lignes.
:::

## Inspecter avec \dt et \d

La méta-commande `\dt` liste les tables de la base courante :

```text
library=# \dt
         List of relations
 Schema | Name  | Type  |  Owner
--------+-------+-------+----------
 public | books | table | postgres
(1 row)
```

`public` est le **schéma** par défaut : un espace de noms à l’intérieur de la base. Tu n’as pas
besoin d’en créer d’autres pour l’instant.

`\d books` décrit la table : colonnes, types, obligation et index.

```text
library=# \d books
                                Table "public.books"
     Column     |     Type     | Collation | Nullable |           Default
----------------+--------------+-----------+----------+------------------------------
 id             | integer      |           | not null | generated always as identity
 title          | text         |           | not null |
 author         | text         |           | not null |
 genre          | text         |           |          |
 published_year | integer      |           |          |
 pages          | integer      |           |          |
 price          | numeric(6,2) |           | not null |
 in_stock       | boolean      |           | not null |
 added_on       | date         |           | not null |
Indexes:
    "books_pkey" PRIMARY KEY, btree (id)
```

La colonne `Nullable` affiche `not null` pour les colonnes obligatoires, et la section `Indexes`
montre l’index créé par la clé primaire. Selon ta version de `psql`, quelques détails de
présentation peuvent différer ; les informations sont les mêmes.

## Charger des données depuis un fichier

Taper dix insertions à la main dans `psql` est fastidieux et impossible à rejouer. On écrit
plutôt les instructions dans un **fichier SQL**. Crée un fichier `books.sql` dans ton dossier de
travail :

```sql
DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  author text NOT NULL,
  genre text,
  published_year integer,
  pages integer,
  price numeric(6, 2) NOT NULL,
  in_stock boolean NOT NULL,
  added_on date NOT NULL
);

INSERT INTO books (title, author, genre, published_year, pages, price, in_stock, added_on)
VALUES
  ('Le Jardin des algorithmes', 'Claire Martin', 'informatique', 2019, 320, 29.90, true, '2024-01-15'),
  ('Nuit sur le port', 'Hugo Bernard', 'roman', 2021, 214, 18.50, true, '2024-02-03'),
  ('La Cuisine du dimanche', 'Lina Petit', 'cuisine', 2018, 180, 24.00, false, '2024-02-20'),
  ('Bases de données pour tous', 'Claire Martin', 'informatique', 2022, 410, 35.00, true, '2024-03-11'),
  ('Le Dernier Phare', 'Hugo Bernard', 'roman', 2016, 298, 9.90, true, '2024-03-28'),
  ('Petits plats rapides', 'Lina Petit', 'cuisine', 2023, 150, 15.00, true, '2024-04-02'),
  ('Carnet de voyage', 'Sami Haddad', NULL, 2020, NULL, 12.00, false, '2024-04-19'),
  ('Mystère à Lyon', 'Emma Roux', 'roman', 2024, 256, 21.00, true, '2024-05-06'),
  ('Apprendre SQL', 'Paul Garnier', 'informatique', 2020, 275, 32.50, false, '2024-05-21'),
  ('Poèmes du matin', 'Emma Roux', 'poésie', NULL, 96, 11.00, true, '2024-06-10');
```

Les titres et les auteurs sont fictifs. Exécute le fichier depuis le terminal avec l’option `-f` :

```bash
psql -h localhost -U postgres -d library -f books.sql
```

```text
psql:books.sql:1: NOTICE:  table "books" does not exist, skipping
DROP TABLE
CREATE TABLE
INSERT 0 10
```

Depuis une session `psql` déjà ouverte, la méta-commande `\i books.sql` fait la même chose (le
chemin est relatif au dossier depuis lequel tu as lancé `psql`).

Que signifie chaque ligne ?

- `DROP TABLE IF EXISTS books;` supprime la table si elle existe. La première fois, elle
  n’existe pas : PostgreSQL émet un simple avertissement (`NOTICE`), pas une erreur. Grâce à
  cette ligne, tu peux **rejouer le fichier** à tout moment pour repartir de données propres.
  C’est ce que tu feras au début de chaque leçon.
- `INSERT 0 10` : dix lignes insérées. Le `0` est un vestige historique que tu peux ignorer.

:::warning[DROP TABLE est définitif]
`DROP TABLE` supprime la table **et toutes ses données**, sans corbeille ni confirmation. Ce
fichier est fait pour une base d’entraînement. Ne lance jamais un script contenant `DROP` sur une
base dont tu n’es pas certain qu’elle est jetable.
:::

Vérifie le contenu :

```sql
SELECT * FROM books;
```

```text
 id |           title            |    author     |    genre     | published_year | pages | price | in_stock |  added_on
----+----------------------------+---------------+--------------+----------------+-------+-------+----------+------------
  1 | Le Jardin des algorithmes  | Claire Martin | informatique |           2019 |   320 | 29.90 | t        | 2024-01-15
  2 | Nuit sur le port           | Hugo Bernard  | roman        |           2021 |   214 | 18.50 | t        | 2024-02-03
  3 | La Cuisine du dimanche     | Lina Petit    | cuisine      |           2018 |   180 | 24.00 | f        | 2024-02-20
  4 | Bases de données pour tous | Claire Martin | informatique |           2022 |   410 | 35.00 | t        | 2024-03-11
  5 | Le Dernier Phare           | Hugo Bernard  | roman        |           2016 |   298 |  9.90 | t        | 2024-03-28
  6 | Petits plats rapides       | Lina Petit    | cuisine      |           2023 |   150 | 15.00 | t        | 2024-04-02
  7 | Carnet de voyage           | Sami Haddad   |              |           2020 |       | 12.00 | f        | 2024-04-19
  8 | Mystère à Lyon             | Emma Roux     | roman        |           2024 |   256 | 21.00 | t        | 2024-05-06
  9 | Apprendre SQL              | Paul Garnier  | informatique |           2020 |   275 | 32.50 | f        | 2024-05-21
 10 | Poèmes du matin            | Emma Roux     | poésie       |                |    96 | 11.00 | t        | 2024-06-10
(10 rows)
```

L’`id` a bien été généré de 1 à 10. Les cases vides du livre 7 et du livre 10 sont des `NULL` :
`psql` les affiche comme des cases vides par défaut.

:::tip[Un affichage plus lisible]
Quand une ligne est trop large pour ton terminal, la méta-commande `\x` bascule en affichage
étendu : une colonne par ligne. Retape `\x` pour revenir à l’affichage en tableau.
:::

## Pièges et idées reçues

- **La virgule en trop ou manquante.** Une virgule après la dernière colonne donne
  `syntax error at or near ")"`. Une virgule oubliée entre deux colonnes donne une erreur sur le
  nom de la colonne suivante. Lis le numéro de ligne et le `^` dans le message.
- **La mauvaise base.** Si `SELECT * FROM books;` répond `relation "books" does not exist`,
  vérifie l’invite : tu es peut-être resté connecté à `postgres`.
- **Une faute de frappe dans un nom de colonne.** PostgreSQL aide souvent :
  `SELECT titel FROM books;` affiche `column "titel" does not exist` suivi de
  `HINT:  Perhaps you meant to reference the column "books.title".`
- **Fournir l’`id` à la main.** Avec une colonne d’identité, ne mentionne pas `id` dans
  `INSERT` : PostgreSQL s’en charge.
- **Confondre méta-commande et SQL.** `\dt` n’a pas de point-virgule et ne fonctionne que dans
  `psql`. Une application Node.js ne peut pas l’envoyer au serveur.

## Exercices

### Exercice 1 : la table des adhérents

Dans la base `library`, crée la table `members` correspondant à l’exercice 2 de la leçon
précédente (identifiant, nom, e-mail, date de naissance facultative, cotisation, newsletter,
instant d’inscription). Seule la date de naissance est facultative. Insère ensuite ces deux
adhérents en une seule instruction, puis affiche la table et sa description :

- Alice Durand, `alice@example.com`, née le 12 avril 1990, cotisation 30 €, accepte la newsletter,
  inscrite le 1er septembre 2024 à 18 h 05, heure de Paris ;
- Bilal Mansour, `bilal@example.com`, date de naissance inconnue, cotisation 15 €, refuse la
  newsletter, inscrit le 3 septembre 2024 à 9 h 30, heure de Paris.

:::solution

```sql
CREATE TABLE members (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  birth_date date,            -- facultative : pas de NOT NULL
  fee numeric(6, 2) NOT NULL, -- de l’argent : décimal exact
  newsletter boolean NOT NULL,
  registered_at timestamptz NOT NULL
);

INSERT INTO members (name, email, birth_date, fee, newsletter, registered_at)
VALUES
  ('Alice Durand', 'alice@example.com', '1990-04-12', 30.00, true, '2024-09-01 18:05:00+02'),
  ('Bilal Mansour', 'bilal@example.com', NULL, 15.00, false, '2024-09-03 09:30:00+02');

SET timezone = 'Europe/Paris';
SELECT * FROM members;
```

```text
CREATE TABLE
INSERT 0 2
SET
 id |     name      |       email       | birth_date |  fee  | newsletter |     registered_at
----+---------------+-------------------+------------+-------+------------+------------------------
  1 | Alice Durand  | alice@example.com | 1990-04-12 | 30.00 | t          | 2024-09-01 18:05:00+02
  2 | Bilal Mansour | bilal@example.com |            | 15.00 | f          | 2024-09-03 09:30:00+02
(2 rows)
```

Le suffixe `+02` indique le décalage horaire de Paris en septembre (heure d’été). Sans
`SET timezone`, l’affichage dépend du fuseau configuré sur le serveur, mais l’instant stocké est
le même. `\d members` montre que `registered_at` a pour type complet
`timestamp with time zone`, et que seule `birth_date` est sans `not null`.
:::

### Exercice 2 : réparer une déclaration

Cette instruction échoue. Trouve les deux erreurs à partir des messages de PostgreSQL, en les
corrigeant une par une.

```sql
CREATE TABLE events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
);
```

:::solution
Premier message :

```text
ERROR:  syntax error at or near "title"
LINE 3:   title text NOT NULL,
          ^
```

PostgreSQL ne s’attendait pas à trouver `title` : il manque la virgule à la fin de la ligne
précédente. Après correction, deuxième message :

```text
ERROR:  syntax error at or near ")"
LINE 5: );
        ^
```

La virgule après `starts_at timestamptz NOT NULL` annonce une colonne qui ne vient jamais. Version
corrigée :

```sql
CREATE TABLE events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  starts_at timestamptz NOT NULL
);
```

```text
CREATE TABLE
```

Le numéro de ligne d’une erreur de syntaxe désigne l’endroit où PostgreSQL s’est aperçu du
problème, qui est souvent juste **après** la vraie faute.
:::

### Exercice 3 : supprimer sans erreur

Exécute deux fois de suite `DROP TABLE events;`. Que se passe-t-il la seconde fois ? Comment
écrire une suppression qui ne provoque pas d’erreur si la table n’existe plus, et pourquoi est-ce
utile dans un fichier comme `books.sql` ?

:::solution

```text
DROP TABLE
ERROR:  table "events" does not exist
```

La seconde exécution échoue car la table n’existe plus. Avec `IF EXISTS`, PostgreSQL se contente
d’un avertissement :

```sql
DROP TABLE IF EXISTS events;
```

```text
NOTICE:  table "events" does not exist, skipping
DROP TABLE
```

Dans un script de mise en place, cela rend le fichier **rejouable** : il fonctionne que la table
existe déjà ou non. C’est précisément pour une base d’entraînement qu’on l’utilise ; sur des
données réelles, un tel script serait dangereux.
:::

## Récapitulatif

- `CREATE DATABASE library;` crée une base ; `\c library` s’y connecte ; `\l` liste les bases.
- `CREATE TABLE nom (colonne type options, …);` déclare une table. Pas de virgule après la
  dernière colonne.
- `NOT NULL` rend une colonne obligatoire ; sans lui, elle accepte `NULL`.
- Clé primaire recommandée : `id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY`. `serial` est
  un raccourci historique qui laisse passer des valeurs manuelles et désynchronise la séquence.
- Noms en minuscules et _snake_case_, sans guillemets doubles.
- `\dt` liste les tables, `\d table` décrit une table, `\x` bascule l’affichage étendu, `\q` quitte.
- Un fichier `.sql` s’exécute avec `psql -f fichier.sql` ou `\i fichier.sql` ; un `DROP TABLE IF
EXISTS` en tête le rend rejouable, sur une base d’entraînement uniquement.
