---
title: Clés étrangères et contraintes
summary: Protéger les données avec NOT NULL, DEFAULT, UNIQUE, CHECK et des clés étrangères dont le comportement à la suppression est choisi.
durationMinutes: 55
sources:
  - title: PostgreSQL — Contraintes
    url: https://www.postgresql.org/docs/current/ddl-constraints.html
  - title: PostgreSQL — CREATE TABLE
    url: https://www.postgresql.org/docs/current/sql-createtable.html
  - title: PostgreSQL — ALTER TABLE
    url: https://www.postgresql.org/docs/current/sql-altertable.html
---

Une application vérifie les données saisies : un formulaire refuse un prix négatif, un e-mail
déjà utilisé. Pourquoi les vérifier **aussi** dans la base ? Parce que l’application n’est pas
seule. Un script d’import, un collègue qui corrige une donnée dans `psql`, une deuxième
application, un bug dans une validation : tous écrivent dans la même base. Les **contraintes**
sont la dernière ligne de défense. Déclarées une fois dans le schéma, elles s’appliquent à
**toutes** les écritures, sans exception.

Cette leçon fait le tour des contraintes de PostgreSQL et t’apprend à choisir ce qui se passe
quand on supprime une ligne référencée.

## Le schéma complet de la médiathèque

Dans la base `mediatheque`, crée un fichier `mediatheque.sql` avec le schéma complet et des
données d’exemple. Il remplace les tables de la leçon précédente. Les titres, les noms et les
ISBN sont fictifs.

```sql
DROP TABLE IF EXISTS loans, members, book_authors, books, authors, genres;

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

INSERT INTO genres (name) VALUES ('roman'), ('informatique'), ('cuisine'), ('poésie'), ('jeunesse');

INSERT INTO authors (name) VALUES
  ('Claire Martin'), ('Hugo Bernard'), ('Lina Petit'), ('Emma Roux'),
  ('Paul Garnier'), ('Sami Haddad'), ('Nora Lefèvre');

INSERT INTO books (title, isbn, genre_id, published_year, price) VALUES
  ('Le Jardin des algorithmes', '978-2-0000-0001-1', 2, 2019, 29.90),
  ('Nuit sur le port', '978-2-0000-0002-2', 1, 2021, 18.50),
  ('La Cuisine du dimanche', '978-2-0000-0003-3', 3, 2018, 24.00),
  ('Bases de données pour tous', '978-2-0000-0004-4', 2, 2022, 35.00),
  ('Le Dernier Phare', '978-2-0000-0005-5', 1, 2016, 9.90),
  ('Carnet de voyage', '978-2-0000-0006-6', NULL, 2020, 12.00),
  ('Mystère à Lyon', '978-2-0000-0007-7', 1, 2024, 21.00),
  ('Poèmes du matin', '978-2-0000-0008-8', 4, NULL, 11.00);

INSERT INTO book_authors (book_id, author_id) VALUES
  (1, 1), (2, 2), (3, 3), (4, 1), (4, 5), (5, 2), (6, 6), (7, 4), (8, 4);

INSERT INTO members (name, email, joined_on) VALUES
  ('Alice Durand', 'alice@example.com', '2023-09-01'),
  ('Bilal Mansour', 'bilal@example.com', '2023-11-15'),
  ('Chloé Fabre', 'chloe@example.com', '2024-01-10'),
  ('David Nguyen', 'david@example.com', '2024-03-05'),
  ('Eva Rossi', 'eva@example.com', '2024-06-20');

INSERT INTO loans (book_id, member_id, loaned_on, due_on, returned_on) VALUES
  (1, 1, '2024-09-02', '2024-09-23', '2024-09-20'),
  (2, 1, '2024-09-20', '2024-10-11', '2024-10-15'),
  (4, 2, '2024-10-01', '2024-10-22', NULL),
  (2, 3, '2024-10-16', '2024-11-06', '2024-11-01'),
  (5, 3, '2024-10-16', '2024-11-06', NULL),
  (7, 1, '2024-11-02', '2024-11-23', '2024-11-15'),
  (1, 4, '2024-11-04', '2024-11-25', '2024-11-18'),
  (4, 4, '2024-11-19', '2024-12-10', NULL);
```

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
```

L’ordre du fichier compte : on crée une table avant celles qui la référencent, et on insère les
genres avant les livres. Le `DROP TABLE` en tête supprime les six tables d’un coup ; c’est un
script d’entraînement, à ne jamais lancer sur des données réelles. Les sections suivantes
expliquent chaque contrainte de ce schéma. Recharge ce fichier avant chaque série d’exemples.

## NOT NULL et DEFAULT

Tu connais `NOT NULL` : la colonne est obligatoire. `DEFAULT` fournit une valeur quand
l’insertion ne mentionne pas la colonne. Ici, `joined_on` vaut par défaut la date du jour :

```sql
INSERT INTO members (name, email) VALUES ('Farid Benali', 'farid@example.com') RETURNING id, name, joined_on;
```

```text
 id |     name     | joined_on
----+--------------+------------
  6 | Farid Benali | 2026-11-21
(1 row)

INSERT 0 1
```

Tu verras bien sûr la date du jour où tu exécutes la requête. `DEFAULT` ne rend pas la colonne
obligatoire : c’est `NOT NULL` qui s’en charge. Les deux se combinent souvent, comme ici.

## UNIQUE : pas de doublon

`UNIQUE` interdit que deux lignes aient la même valeur dans une colonne. Deux adhérents ne
peuvent pas partager une adresse e-mail, deux livres pas le même ISBN, deux genres pas le même
nom :

```sql
INSERT INTO members (name, email) VALUES ('Alice Dupont', 'alice@example.com');
```

```text
ERROR:  duplicate key value violates unique constraint "members_email_key"
DETAIL:  Key (email)=(alice@example.com) already exists.
```

Comme pour la clé primaire, PostgreSQL crée un **index** pour vérifier l’unicité rapidement ; il
le nomme `table_colonne_key`. Deux limites à connaître :

- **La casse compte.** `'Alice@Example.com'` est différent de `'alice@example.com'` pour
  PostgreSQL, et serait accepté. La pratique courante est de normaliser l’e-mail (en minuscules)
  avant de l’enregistrer.
- **Plusieurs `NULL` sont acceptés.** Par défaut, deux valeurs inconnues ne sont pas considérées
  comme égales : une colonne `UNIQUE` sans `NOT NULL` peut contenir plusieurs `NULL`.

L’unicité peut aussi porter sur **plusieurs colonnes ensemble**, en contrainte de table :
`UNIQUE (book_id, author_id)` interdit un même couple, comme le fait la clé primaire composée de
`book_authors`.

:::note[Clé primaire ou UNIQUE ?]
Une clé primaire, c’est `UNIQUE` + `NOT NULL`, et il n’y en a qu’une par table : c’est
l’identifiant officiel, celui que les clés étrangères référencent. Une table peut avoir plusieurs
colonnes `UNIQUE` en plus, comme `books.isbn`. On garde pourtant `id` comme clé primaire : un ISBN
peut être saisi avec une erreur et corrigé, et certains livres anciens n’en ont pas.
:::

## CHECK : une règle métier

`CHECK (condition)` refuse toute ligne pour laquelle la condition est **fausse**. Elle exprime
une règle métier simple, vérifiable sur la ligne seule :

```sql
INSERT INTO books (title, isbn, price) VALUES ('Prix négatif', '978-2-0000-0099-9', -5);
```

```text
ERROR:  new row for relation "books" violates check constraint "books_price_check"
DETAIL:  Failing row contains (9, Prix négatif, 978-2-0000-0099-9, null, null, -5.00).
```

```sql
INSERT INTO books (title, isbn, published_year, price) VALUES ('Futur lointain', '978-2-0000-0098-8', 3024, 10);
```

```text
ERROR:  new row for relation "books" violates check constraint "books_published_year_check"
DETAIL:  Failing row contains (10, Futur lointain, 978-2-0000-0098-8, null, 3024, 10.00).
```

Mais une année inconnue est acceptée :

```sql
INSERT INTO books (title, isbn, published_year, price) VALUES ('Année inconnue', '978-2-0000-0097-7', NULL, 10) RETURNING id, title, published_year;
```

```text
 id |     title      | published_year
----+----------------+----------------
 11 | Année inconnue |
(1 row)

INSERT 0 1
```

C’est la règle la plus surprenante de `CHECK` : une ligne est refusée seulement si la condition
est **fausse**. Avec `NULL`, `NULL BETWEEN 1450 AND 2100` est inconnu, pas faux, donc la ligne
passe. Si la valeur doit être présente **et** valide, il faut `NOT NULL` en plus du `CHECK`, comme
pour `price`.

Une contrainte qui porte sur **plusieurs colonnes** s’écrit après les colonnes, en contrainte de
table. Donne-lui un nom avec `CONSTRAINT nom` : sinon PostgreSQL l’appellerait `loans_check`,
puis `loans_check1`, et les messages d’erreur seraient bien moins parlants.

```sql
INSERT INTO loans (book_id, member_id, loaned_on, due_on) VALUES (3, 5, '2024-11-20', '2024-11-10');
```

```text
ERROR:  new row for relation "loans" violates check constraint "loans_due_after_loan"
DETAIL:  Failing row contains (9, 3, 5, 2024-11-20, 2024-11-10, null).
```

La contrainte `loans_return_after_loan` s’écrit `returned_on IS NULL OR returned_on >=
loaned_on`. Le `IS NULL` explicite n’est pas indispensable (un `NULL` passerait de toute façon),
mais il rend l’intention lisible : « pas encore rendu, ou rendu après la sortie ».

:::warning[CHECK ne voit que la ligne]
Un `CHECK` ne peut pas consulter d’autres lignes ni d’autres tables. « Un adhérent n’a pas plus
de trois emprunts en cours » ou « un livre n’est pas prêté deux fois en même temps » ne
s’expriment pas avec `CHECK` : ces règles se vérifient dans l’application, idéalement à
l’intérieur d’une transaction (leçon 5).
:::

## Les clés étrangères et ON DELETE

Une clé étrangère interdit de pointer vers une ligne inexistante. Mais que faire quand on
**supprime** une ligne référencée ? `ON DELETE` choisit le comportement, relation par relation :

| Option                    | Effet de la suppression de la ligne référencée                        |
| ------------------------- | --------------------------------------------------------------------- |
| `NO ACTION` (par défaut)  | refusée tant que des lignes la référencent                            |
| `RESTRICT`                | refusée aussi ; s’écrit pour rendre l’intention explicite             |
| `CASCADE`                 | les lignes qui la référencent sont **supprimées** avec elle           |
| `SET NULL`                | la clé étrangère des lignes qui la référencent passe à `NULL`         |

`NO ACTION` et `RESTRICT` ne diffèrent que dans un cas avancé (les contraintes dites différées),
hors du programme de ce cours. Voyons chaque choix du schéma à l’œuvre, après avoir rechargé
`mediatheque.sql`.

### SET NULL : le genre supprimé

Un livre peut exister sans genre. Supprimer le genre « cuisine » ne doit pas supprimer les livres
de cuisine, seulement les « déclasser » :

```sql
DELETE FROM genres WHERE name = 'cuisine';
SELECT id, title, genre_id FROM books WHERE id = 3;
```

```text
DELETE 1
 id |         title          | genre_id
----+------------------------+----------
  3 | La Cuisine du dimanche |
(1 row)
```

`SET NULL` n’a de sens que si la colonne accepte `NULL`.

### CASCADE : les liens d’un livre supprimé

Une ligne de `book_authors` n’a aucun sens sans son livre. Supprimer un livre supprime donc ses
liens avec ses auteurs :

```sql
SELECT * FROM book_authors WHERE book_id = 6;
DELETE FROM books WHERE id = 6;
SELECT * FROM book_authors WHERE book_id = 6;
```

```text
 book_id | author_id
---------+-----------
       6 |         6
(1 row)

DELETE 1
 book_id | author_id
---------+-----------
(0 rows)
```

L’auteur Sami Haddad, lui, existe toujours : la cascade va de `books` vers `book_authors`, pas
vers `authors`. Comme il n’est plus référencé, on peut maintenant le supprimer :

```sql
DELETE FROM authors WHERE name = 'Sami Haddad';
```

```text
DELETE 1
```

### RESTRICT : protéger l’historique

Supprimer un auteur qui a encore des livres est refusé :

```sql
DELETE FROM authors WHERE name = 'Claire Martin';
```

```text
ERROR:  update or delete on table "authors" violates foreign key constraint "book_authors_author_id_fkey" on table "book_authors"
DETAIL:  Key (id)=(1) is still referenced from table "book_authors".
```

De même, un livre qui a déjà été emprunté, ou un adhérent qui a des emprunts, ne peut pas être
supprimé : l’historique des prêts est protégé.

```sql
DELETE FROM books WHERE id = 4;
DELETE FROM members WHERE name = 'Alice Durand';
```

```text
ERROR:  update or delete on table "books" violates foreign key constraint "loans_book_id_fkey" on table "loans"
DETAIL:  Key (id)=(4) is still referenced from table "loans".
ERROR:  update or delete on table "members" violates foreign key constraint "loans_member_id_fkey" on table "loans"
DETAIL:  Key (id)=(1) is still referenced from table "loans".
```

Eva Rossi n’a jamais emprunté : sa suppression passe.

```sql
DELETE FROM members WHERE name = 'Eva Rossi';
```

```text
DELETE 1
```

:::tip[Comment choisir ?]
Pose-toi la question : « la ligne qui référence a-t-elle encore un sens sans la ligne
référencée ? »

- **Non, c’est une partie de l’autre** (les liens d’un livre, les lignes d’une commande) :
  `CASCADE`.
- **Oui, le lien est facultatif** (un livre sans genre) : `SET NULL`.
- **Oui, et c’est de l’historique à garder** (des emprunts, des factures) : `RESTRICT` ; on
  archive ou on désactive plutôt que de supprimer.

`CASCADE` est puissant et dangereux : une seule suppression peut effacer des milliers de lignes
dans plusieurs tables. Ne le choisis que lorsque la disparition des lignes dépendantes est
vraiment voulue.
:::

Il existe aussi `ON UPDATE`, pour le cas où la valeur référencée change. Avec des identifiants
générés qui ne changent jamais, on en a rarement besoin.

## Voir et ajouter des contraintes

`\d loans` récapitule tout :

```text
mediatheque=# \d loans
                            Table "public.loans"
   Column    |  Type   | Collation | Nullable |           Default
-------------+---------+-----------+----------+------------------------------
 id          | integer |           | not null | generated always as identity
 book_id     | integer |           | not null |
 member_id   | integer |           | not null |
 loaned_on   | date    |           | not null |
 due_on      | date    |           | not null |
 returned_on | date    |           |          |
Indexes:
    "loans_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "loans_due_after_loan" CHECK (due_on > loaned_on)
    "loans_return_after_loan" CHECK (returned_on IS NULL OR returned_on >= loaned_on)
Foreign-key constraints:
    "loans_book_id_fkey" FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
    "loans_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT
```

Selon ta version de `psql`, la présentation peut légèrement différer (une section
supplémentaire, par exemple), mais les contraintes listées sont les mêmes.

Sur une table existante, `ALTER TABLE … ADD CONSTRAINT` ajoute une contrainte. PostgreSQL
vérifie alors **toutes les lignes déjà présentes** :

```sql
ALTER TABLE members ADD CONSTRAINT members_email_check CHECK (email LIKE '%_@_%');
ALTER TABLE books ADD CONSTRAINT books_price_max CHECK (price <= 30);
```

```text
ALTER TABLE
ERROR:  check constraint "books_price_max" of relation "books" is violated by some row
```

La première passe : tous les e-mails contiennent un caractère, une arobase, puis un caractère.
La seconde échoue car un livre coûte 35 € : il faudrait d’abord corriger les données, ou revoir
la règle. Désormais, une adresse sans arobase est refusée :

```sql
INSERT INTO members (name, email) VALUES ('Sans arobase', 'pas-un-email');
```

```text
ERROR:  new row for relation "members" violates check constraint "members_email_check"
DETAIL:  Failing row contains (6, Sans arobase, pas-un-email, 2026-11-21).
```

(La date affichée est celle du jour.) Ce contrôle est volontairement grossier : valider
complètement une adresse e-mail est le travail de l’application. Une contrainte se supprime avec
`ALTER TABLE members DROP CONSTRAINT members_email_check;`.

Une clé étrangère s’ajoute de la même façon, avec la forme `FOREIGN KEY (colonne) REFERENCES
table (colonne)` que tu as vue dans la sortie de `\d`. On ne peut pas modifier le `ON DELETE`
d’une clé existante : on la supprime puis on la recrée, en une seule instruction pour qu’il n’y
ait aucun instant sans contrôle. Par exemple, pour que la suppression d’un adhérent supprime ses
emprunts (un mauvais choix ici, puisque c’est l’historique à protéger : si tu l’essaies,
recharge ensuite `mediatheque.sql`) :

```sql
ALTER TABLE loans
  DROP CONSTRAINT loans_member_id_fkey,
  ADD CONSTRAINT loans_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE;
```

```text
ALTER TABLE
```

Le nom de la contrainte à supprimer se lit dans `\d loans`.

## Pièges et idées reçues

- **Compter sur l’application seule** : toute autre source d’écriture contourne ses validations.
- **Croire que `CHECK` refuse `NULL`** : une condition inconnue laisse passer la ligne. Ajoute
  `NOT NULL`.
- **Croire que `UNIQUE` ignore la casse** : `'Alice@Example.com'` et `'alice@example.com'` sont
  deux valeurs différentes.
- **`CASCADE` par réflexe** : supprimer un adhérent effacerait tout son historique d’emprunts.
- **`SET NULL` sur une colonne `NOT NULL`** : la suppression échouera au moment de mettre
  `NULL`.
- **Contraintes sans nom sur plusieurs colonnes** : `loans_check1` n’aide personne à comprendre
  une erreur. Nomme-les.
- **Créer les tables dans le désordre** : une clé étrangère exige que la table référencée existe
  déjà.

## Exercices

Recharge `mediatheque.sql` avant chaque exercice.

### Exercice 1 : la carte d’adhérent

Chaque adhérent peut avoir **au plus une** carte. Une carte a un numéro unique, une date
d’émission (par défaut la date du jour) et une date d’expiration postérieure à l’émission. Si un
adhérent est supprimé, sa carte disparaît avec lui. Écris la table `member_cards`, puis vérifie
qu’une deuxième carte pour l’adhérent 1 est refusée, qu’une carte qui expire avant d’être émise
aussi, et que la suppression d’un adhérent sans emprunt supprime sa carte.

:::solution
```sql
CREATE TABLE member_cards (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id integer NOT NULL UNIQUE                -- UNIQUE : au plus une carte (relation 1-1)
    REFERENCES members (id) ON DELETE CASCADE,     -- la carte n’a pas de sens sans adhérent
  card_number text NOT NULL UNIQUE,
  issued_on date NOT NULL DEFAULT current_date,
  expires_on date NOT NULL,
  CONSTRAINT member_cards_expiry_after_issue CHECK (expires_on > issued_on)
);

INSERT INTO member_cards (member_id, card_number, issued_on, expires_on) VALUES (1, 'MED-0001', '2024-09-01', '2025-09-01');
INSERT INTO member_cards (member_id, card_number, issued_on, expires_on) VALUES (1, 'MED-0002', '2024-10-01', '2025-10-01');
INSERT INTO member_cards (member_id, card_number, issued_on, expires_on) VALUES (2, 'MED-0003', '2024-10-01', '2024-09-01');
```

```text
CREATE TABLE
INSERT 0 1
ERROR:  duplicate key value violates unique constraint "member_cards_member_id_key"
DETAIL:  Key (member_id)=(1) already exists.
ERROR:  new row for relation "member_cards" violates check constraint "member_cards_expiry_after_issue"
DETAIL:  Failing row contains (3, 2, MED-0003, 2024-10-01, 2024-09-01).
```

La cascade, avec Eva Rossi (adhérente 5, sans emprunt) :

```sql
INSERT INTO member_cards (member_id, card_number, issued_on, expires_on) VALUES (5, 'MED-0004', '2024-10-01', '2025-10-01');
DELETE FROM members WHERE id = 5;
SELECT member_id, card_number FROM member_cards;
```

```text
INSERT 0 1
DELETE 1
 member_id | card_number
-----------+-------------
         1 | MED-0001
(1 row)
```

C’est la traduction d’une relation 1-1 : une clé étrangère rendue unique. Tu ne peux pas tester
la cascade avec Alice : la contrainte `RESTRICT` de `loans` l’empêcherait d’être supprimée.
Supprime ensuite la table avec `DROP TABLE member_cards;`.
:::

### Exercice 2 : choisir ON DELETE

Pour une boutique en ligne, choisis `CASCADE`, `SET NULL` ou `RESTRICT` pour chaque clé
étrangère, et justifie en une phrase :

1. `orders.customer_id` (une commande appartient à un client) ;
2. `order_lines.order_id` (une ligne de commande appartient à une commande) ;
3. `products.category_id` (facultatif : un produit peut ne pas être classé) ;
4. `order_lines.product_id` (le produit commandé).

:::solution
1. **`RESTRICT`** : une commande est une pièce comptable, elle doit survivre ; on ne supprime
   pas un client qui a commandé (on peut le désactiver ou anonymiser ses données).
2. **`CASCADE`** : une ligne de commande n’a aucun sens sans sa commande ; supprimer une
   commande (par exemple un panier abandonné) supprime ses lignes.
3. **`SET NULL`** : supprimer une catégorie ne doit pas supprimer les produits, ils deviennent
   « non classés ». La colonne doit accepter `NULL`.
4. **`RESTRICT`** : une ligne de commande doit continuer à désigner ce qui a été vendu ; on retire
   plutôt un produit de la vente qu’on ne le supprime.

D’autres choix peuvent se défendre selon le contexte, mais un `CASCADE` en 1 ou 4 ferait
disparaître des ventes : c’est la réponse à éviter.
:::

### Exercice 3 : prévoir l’effet de CHECK

Prévois le résultat de chaque instruction, puis vérifie.

```sql
CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  price numeric(6, 2) CHECK (price >= 0)
);
INSERT INTO products (name, price) VALUES ('Stylo', 1.50);
INSERT INTO products (name, price) VALUES ('Cahier', NULL);
INSERT INTO products (name, price) VALUES ('Gomme', -0.50);
SELECT * FROM products;
```

:::solution
```text
CREATE TABLE
INSERT 0 1
INSERT 0 1
ERROR:  new row for relation "products" violates check constraint "products_price_check"
DETAIL:  Failing row contains (3, Gomme, -0.50).
 id |  name  | price
----+--------+-------
  1 | Stylo  |  1.50
  2 | Cahier |
(2 rows)
```

Le cahier sans prix est accepté : `NULL >= 0` est inconnu, et `CHECK` ne refuse que ce qui est
faux. Si tout produit doit avoir un prix, il faut écrire `price numeric(6, 2) NOT NULL CHECK
(price >= 0)`. Remarque aussi que l’`id` 3 a été consommé par l’insertion refusée. Supprime la
table avec `DROP TABLE products;`.
:::

## Récapitulatif

- Les contraintes protègent les données contre **toutes** les sources d’écriture.
- `NOT NULL` rend obligatoire ; `DEFAULT` fournit une valeur quand la colonne est omise.
- `UNIQUE` interdit les doublons (casse comprise, `NULL` multiples acceptés) ; il crée un index.
  Il peut porter sur plusieurs colonnes.
- `CHECK (condition)` refuse les lignes où la condition est **fausse** ; `NULL` passe. Nomme les
  contraintes avec `CONSTRAINT nom`.
- `REFERENCES table (id)` crée une clé étrangère ; `ON DELETE` choisit `RESTRICT`/`NO ACTION`
  (refus), `CASCADE` (suppression en chaîne) ou `SET NULL` (référence vidée).
- Une relation 1-1 se traduit par une clé étrangère `UNIQUE`.
- `ALTER TABLE … ADD CONSTRAINT` vérifie les lignes existantes ; `\d table` liste les contraintes.
