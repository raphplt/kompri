---
title: Entités, attributs et relations
summary: Passer d’un besoin exprimé en français à un ensemble de tables reliées, en traduisant les relations un-à-plusieurs et plusieurs-à-plusieurs.
durationMinutes: 55
sources:
  - title: PostgreSQL — Contraintes, dont les clés étrangères
    url: https://www.postgresql.org/docs/current/ddl-constraints.html
  - title: PostgreSQL — Tutoriel, clés étrangères
    url: https://www.postgresql.org/docs/current/tutorial-fk.html
---

Dans la compétence précédente, tout tenait dans une seule table `books`, avec une colonne
`author` contenant le nom de l’auteur en texte. C’était parfait pour apprendre `SELECT`, mais
cette table cache plusieurs problèmes dès qu’on veut aller plus loin :

- un livre écrit à quatre mains n’a qu’une case `author` : faut-il y écrire « Claire Martin, Paul
  Garnier » ? Comment retrouver ensuite tous les livres de Paul Garnier ?
- le nom « Claire Martin » est recopié sur chacun de ses livres. Une faute de frappe sur l’un
  d’eux (« Claire Martn ») et la base croit qu’il s’agit de deux personnes ;
- pour gérer des adhérents et des emprunts, où mettre ces informations ?

La réponse tient en une idée : **une table par type de chose**, et des **liens** entre les tables.
Cette leçon t’apprend à repérer ces « choses » dans un besoin exprimé en français, à identifier les
liens qui les unissent, puis à les traduire en tables PostgreSQL.

## Du besoin aux entités

Voici le besoin exprimé par une médiathèque :

> Nous voulons enregistrer nos livres (titre, ISBN, année de publication, prix) et leurs auteurs.
> Un livre peut avoir plusieurs auteurs. Chaque livre appartient au plus à un genre (roman,
> informatique…). Nos adhérents (nom, e-mail, date d’inscription) empruntent des livres : pour
> chaque emprunt, on note la date de sortie, la date de retour prévue et la date de retour réelle.

Une méthode simple pour analyser un tel texte :

1. **Les noms communs importants** deviennent des candidats **entités** : livre, auteur, genre,
   adhérent, emprunt. Une entité est un type d’objet dont on veut garder plusieurs exemplaires,
   chacun identifiable.
2. **Les propriétés** de ces noms deviennent des **attributs** : le titre et l’ISBN d’un livre, le
   nom et l’e-mail d’un adhérent.
3. **Les verbes et les liens** (« appartient à », « emprunte », « a plusieurs auteurs ») deviennent
   des **relations** entre entités.

Chaque entité deviendra une table, chaque attribut une colonne, et chaque instance de l’entité (un
livre précis) une ligne. Chaque entité reçoit aussi un **identifiant** : la clé primaire `id`, que
tu connais déjà.

:::tip[Entité ou attribut ?]
Le genre aurait pu être un simple attribut texte du livre. On en fait une entité parce qu’on veut
une liste fermée de genres, sans variantes orthographiques, et pouvoir un jour leur ajouter des
informations (une description, un rayon). Si une information n’est qu’une valeur sans vie propre
(le prix, l’année), c’est un attribut.
:::

## Les trois sortes de relations

Pour qualifier une relation entre deux entités A et B, pose-toi **deux questions**, une dans
chaque sens :

- un A peut-il être lié à plusieurs B ?
- un B peut-il être lié à plusieurs A ?

Les réponses donnent la **cardinalité** de la relation :

| Un A → plusieurs B ? | Un B → plusieurs A ? | Relation                  | Exemple                      |
| -------------------- | -------------------- | ------------------------- | ---------------------------- |
| non                  | non                  | un-à-un (1-1)             | un adhérent, une carte       |
| oui                  | non                  | un-à-plusieurs (1-N)      | un genre, plusieurs livres   |
| oui                  | oui                  | plusieurs-à-plusieurs (N-N) | des livres, des auteurs    |

Appliquons-le à la médiathèque :

- **genre et livre** : un genre regroupe plusieurs livres ; un livre a au plus un genre. C’est une
  relation **1-N**.
- **livre et auteur** : un livre peut avoir plusieurs auteurs ; un auteur peut avoir écrit
  plusieurs livres. C’est une relation **N-N**.
- **adhérent et livre**, à travers l’emprunt : un adhérent emprunte plusieurs livres au fil du
  temps ; un livre est emprunté par plusieurs adhérents successifs. C’est aussi une relation
  **N-N**, mais elle porte des informations propres (les dates) : on y reviendra.

On représente souvent ce résultat par un schéma. En texte, avec `1` et `N` aux extrémités :

```text
genres 1 ──── N books N ──── N authors
                  1
                  │
                  N
                loans
                  N
                  │
                  1
               members
```

## Traduire une relation 1-N : la clé étrangère

Pour relier un livre à son genre, on ajoute dans la table **du côté N** (`books`) une colonne qui
contient l’identifiant de la ligne liée du côté 1 (`genres`). Cette colonne est une **clé
étrangère** (_foreign key_). Elle se déclare avec `REFERENCES`.

Pour suivre les exemples, crée une base dédiée à cette compétence et connecte-toi dessus :

```sql
CREATE DATABASE mediatheque;
```

```text
\c mediatheque
```

Puis crée les deux tables :

```sql
CREATE TABLE genres (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  genre_id integer REFERENCES genres (id)
);
```

```text
CREATE TABLE
CREATE TABLE
```

`genre_id integer REFERENCES genres (id)` signifie : « la valeur de cette colonne doit exister
dans la colonne `id` de la table `genres` ». Le nom `genre_id` suit une convention répandue :
le nom de l’entité liée au singulier, suivi de `_id`. Ajoutons des données :

```sql
INSERT INTO genres (name) VALUES ('roman'), ('informatique');
INSERT INTO books (title, genre_id) VALUES
  ('Nuit sur le port', 1),
  ('Le Jardin des algorithmes', 2),
  ('Le Dernier Phare', 1);
SELECT * FROM books;
```

```text
INSERT 0 2
INSERT 0 3
 id |           title           | genre_id
----+---------------------------+----------
  1 | Nuit sur le port          |        1
  2 | Le Jardin des algorithmes |        2
  3 | Le Dernier Phare          |        1
(3 rows)
```

Le mot « roman » n’est écrit **qu’une seule fois**, dans `genres`. Les livres n’en contiennent que
l’identifiant. Pour renommer le genre, une seule ligne sera modifiée. Et PostgreSQL vérifie la
cohérence du lien dans les deux sens. Un livre ne peut pas pointer vers un genre inexistant :

```sql
INSERT INTO books (title, genre_id) VALUES ('Livre fantôme', 42);
```

```text
ERROR:  insert or update on table "books" violates foreign key constraint "books_genre_id_fkey"
DETAIL:  Key (genre_id)=(42) is not present in table "genres".
```

Et on ne peut pas supprimer un genre encore utilisé par des livres :

```sql
DELETE FROM genres WHERE id = 1;
```

```text
ERROR:  update or delete on table "genres" violates foreign key constraint "books_genre_id_fkey" on table "books"
DETAIL:  Key (id)=(1) is still referenced from table "books".
```

Cette garantie s’appelle l’**intégrité référentielle** : aucune référence ne pointe dans le vide.
Tu verras dans la leçon suivante comment choisir ce qui se passe lors d’une suppression
(interdire, supprimer en cascade, ou vider la référence).

:::warning[Pourquoi pas une liste de livres dans genres ?]
On pourrait être tenté d’écrire, dans la table `genres`, une colonne `book_ids` contenant
`'1,3'`. C’est une erreur de modélisation : PostgreSQL ne peut pas vérifier que ces numéros
existent, chercher les livres d’un genre devient une recherche de texte fragile, et retirer un
livre impose de réécrire la chaîne. Dans une relation 1-N, la clé étrangère va **toujours du côté
N** : chaque livre porte le numéro de son unique genre.
:::

## Traduire une relation N-N : la table d’association

Un livre peut avoir plusieurs auteurs et un auteur plusieurs livres. Une colonne `author_id` dans
`books` ne permet qu’un auteur par livre ; une colonne `book_id` dans `authors` qu’un livre par
auteur. Aucune des deux tables ne peut porter le lien.

La solution est une **troisième table**, dite **table d’association** (ou table de liaison), dont
chaque ligne représente **un lien** entre un livre et un auteur :

```sql
CREATE TABLE authors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE book_authors (
  book_id integer REFERENCES books (id),
  author_id integer REFERENCES authors (id),
  PRIMARY KEY (book_id, author_id)
);
```

`PRIMARY KEY (book_id, author_id)` déclare une **clé primaire composée** de deux colonnes : c’est
le **couple** qui doit être unique. Le même auteur peut apparaître sur plusieurs lignes (avec des
livres différents), le même livre aussi, mais un couple livre-auteur n’existe qu’une fois.

Ajoutons trois auteurs et un livre écrit à deux. Le livre reçoit l’identifiant renvoyé par
`RETURNING` :

```sql
INSERT INTO authors (name) VALUES ('Claire Martin'), ('Hugo Bernard'), ('Paul Garnier');
INSERT INTO books (title, genre_id) VALUES ('Bases de données pour tous', 2) RETURNING id;
```

```text
INSERT 0 3
 id
----
  5
(1 row)

INSERT 0 1
```

Pourquoi 5 et non 4 ? L’insertion refusée du « Livre fantôme » avait consommé le numéro 4.
C’est exactement pour cela qu’on ne devine jamais un identifiant : on le lit avec `RETURNING`.
Créons maintenant les liens :

```sql
INSERT INTO book_authors (book_id, author_id) VALUES (1, 2), (2, 1), (3, 2), (5, 1), (5, 3);
SELECT * FROM book_authors ORDER BY book_id, author_id;
```

```text
INSERT 0 5
 book_id | author_id
---------+-----------
       1 |         2
       2 |         1
       3 |         2
       5 |         1
       5 |         3
(5 rows)
```

Le livre 5 apparaît deux fois (deux auteurs), l’auteur 2 aussi (deux livres). Enregistrer deux
fois le même lien est refusé :

```sql
INSERT INTO book_authors (book_id, author_id) VALUES (5, 3);
```

```text
ERROR:  duplicate key value violates unique constraint "book_authors_pkey"
DETAIL:  Key (book_id, author_id)=(5, 3) already exists.
```

La description de la table montre tout ce que PostgreSQL a mis en place :

```text
mediatheque=# \d book_authors
             Table "public.book_authors"
  Column   |  Type   | Collation | Nullable | Default
-----------+---------+-----------+----------+---------
 book_id   | integer |           | not null |
 author_id | integer |           | not null |
Indexes:
    "book_authors_pkey" PRIMARY KEY, btree (book_id, author_id)
Foreign-key constraints:
    "book_authors_author_id_fkey" FOREIGN KEY (author_id) REFERENCES authors(id)
    "book_authors_book_id_fkey" FOREIGN KEY (book_id) REFERENCES books(id)
```

Les colonnes d’une clé primaire deviennent automatiquement `not null`, et chaque clé étrangère a
reçu un nom généré (`table_colonne_fkey`). Tu sauras dans la leçon 4 relire ces liens pour
afficher « Bases de données pour tous — Claire Martin, Paul Garnier » grâce aux **jointures**.

## Une association qui porte des informations : l’emprunt

L’emprunt relie un adhérent et un livre, comme `book_authors` relie un livre et un auteur. Mais
deux différences changent la traduction :

- l’emprunt porte ses **propres attributs** : date de sortie, date de retour ;
- le **même** adhérent peut emprunter le **même** livre plusieurs fois, à des dates différentes.

Une clé primaire `(book_id, member_id)` interdirait le second emprunt. L’emprunt devient donc une
entité à part entière, avec son propre `id`, et deux clés étrangères :

```sql
CREATE TABLE members (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE loans (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id integer NOT NULL REFERENCES books (id),
  member_id integer NOT NULL REFERENCES members (id),
  loaned_on date NOT NULL,
  returned_on date
);

INSERT INTO members (name) VALUES ('Alice Durand'), ('Bilal Mansour');
INSERT INTO loans (book_id, member_id, loaned_on, returned_on) VALUES
  (1, 1, '2024-09-02', '2024-09-20'),
  (1, 1, '2024-11-04', NULL),
  (2, 2, '2024-10-01', NULL);
SELECT * FROM loans;
```

```text
CREATE TABLE
CREATE TABLE
INSERT 0 2
INSERT 0 3
 id | book_id | member_id | loaned_on  | returned_on
----+---------+-----------+------------+-------------
  1 |       1 |         1 | 2024-09-02 | 2024-09-20
  2 |       1 |         1 | 2024-11-04 |
  3 |       2 |         2 | 2024-10-01 |
(3 rows)
```

Alice a emprunté deux fois le livre 1. `returned_on` vide (`NULL`) signifie « pas encore rendu ».
Remarque `NOT NULL` sur les deux clés étrangères : un emprunt sans livre ou sans adhérent n’a pas
de sens. À l’inverse, `books.genre_id` accepte `NULL` car le besoin dit « **au plus** un genre ».

:::note[Et la relation 1-1 ?]
Une relation un-à-un est plus rare : souvent, les deux entités peuvent être fusionnées en une
seule table. Quand on les sépare (par exemple pour isoler des informations rarement lues ou
sensibles), on la traduit comme une 1-N dont la clé étrangère est en plus déclarée unique : ainsi,
chaque ligne ne peut être référencée qu’une fois. La contrainte `UNIQUE` est présentée dans la
leçon suivante.
:::

## Pièges et idées reçues

- **Stocker une liste dans une colonne** (`'1,3,7'`, `'Claire Martin, Paul Garnier'`) : ni
  vérifiable, ni interrogeable proprement. Une relation se traduit par une clé étrangère ou une
  table d’association.
- **Mettre la clé étrangère du mauvais côté** d’une relation 1-N : elle va dans la table qui a
  « plusieurs » lignes pour une seule ligne de l’autre.
- **Clé composée sur une association qui peut se répéter** : un emprunt, une commande, une
  inscription datée qui peut être refaite. Dans ce cas, donne-lui son propre `id`.
- **Deviner les identifiants** : un numéro peut avoir été consommé par une insertion refusée.
  Lis-le avec `RETURNING`.
- **Oublier `NOT NULL` sur une clé étrangère obligatoire** : `REFERENCES` vérifie que la valeur
  existe, pas qu’elle est présente. Une clé étrangère `NULL` est acceptée.

## Exercices

### Exercice 1 : analyser un besoin

Une plateforme de cours en ligne décrit son besoin :

> Chaque cours a un titre et est animé par un seul enseignant ; un enseignant peut animer
> plusieurs cours. Les étudiants s’inscrivent aux cours qu’ils veulent ; on note la date
> d’inscription et, plus tard, la note finale obtenue. Un étudiant ne peut s’inscrire qu’une fois
> à un même cours.

Liste les entités et leurs attributs, puis qualifie chaque relation (1-1, 1-N ou N-N) en
justifiant par les deux questions.

:::solution
Entités et attributs :

- **enseignant** : nom ;
- **cours** : titre ;
- **étudiant** : nom.

Relations :

- **enseignant – cours** : un enseignant anime plusieurs cours (oui) ; un cours est animé par
  plusieurs enseignants (non, « un seul »). Relation **1-N**.
- **étudiant – cours** : un étudiant suit plusieurs cours (oui) ; un cours accueille plusieurs
  étudiants (oui). Relation **N-N**, qui porte des attributs : la date d’inscription et la note.

Comme « un étudiant ne peut s’inscrire qu’une fois à un même cours », le couple (cours,
étudiant) est unique : l’inscription peut avoir une clé primaire composée, contrairement à
l’emprunt de la médiathèque.
:::

### Exercice 2 : traduire en tables

Écris les `CREATE TABLE` correspondant à l’exercice 1, puis vérifie avec quelques insertions que :
une inscription en double est refusée, et un cours sans enseignant aussi.

:::solution
```sql
CREATE TABLE teachers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE courses (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  teacher_id integer NOT NULL REFERENCES teachers (id) -- côté N de la relation 1-N
);

CREATE TABLE students (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE enrollments (
  course_id integer REFERENCES courses (id),
  student_id integer REFERENCES students (id),
  enrolled_on date NOT NULL,
  grade numeric(4, 2),                  -- NULL tant que la note n’est pas connue
  PRIMARY KEY (course_id, student_id)   -- une seule inscription par couple
);

INSERT INTO teachers (name) VALUES ('Mme Lopez');
INSERT INTO courses (title, teacher_id) VALUES ('SQL débutant', 1), ('HTML et CSS', 1);
INSERT INTO students (name) VALUES ('Jade'), ('Malik');
INSERT INTO enrollments (course_id, student_id, enrolled_on)
VALUES (1, 1, '2024-09-01'), (1, 2, '2024-09-02'), (2, 1, '2024-09-03');
```

Les vérifications :

```sql
INSERT INTO enrollments (course_id, student_id, enrolled_on) VALUES (1, 1, '2024-09-10');
INSERT INTO courses (title) VALUES ('Cours sans enseignant');
```

```text
ERROR:  duplicate key value violates unique constraint "enrollments_pkey"
DETAIL:  Key (course_id, student_id)=(1, 1) already exists.
ERROR:  null value in column "teacher_id" of relation "courses" violates not-null constraint
DETAIL:  Failing row contains (3, Cours sans enseignant, null).
```

Sans `NOT NULL` sur `teacher_id`, le cours sans enseignant aurait été accepté : `REFERENCES`
seul ne l’interdit pas. Les tables se créent dans l’ordre des dépendances : `teachers` avant
`courses`, `courses` et `students` avant `enrollments`. Pour les supprimer, c’est l’ordre
inverse. Supprime-les maintenant en une seule instruction, car la leçon 3 réutilise ces noms :
`DROP TABLE enrollments, students, courses, teachers;`.

:::

### Exercice 3 : repérer l’erreur de modélisation

Un développeur propose ce schéma pour des recettes de cuisine, où une recette utilise plusieurs
ingrédients et un ingrédient sert dans plusieurs recettes, chacun avec une quantité :

```sql
CREATE TABLE recipes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  ingredients text -- par exemple : 'farine 250 g, œufs 3, lait 50 cl'
);
```

Explique les problèmes concrets de ce choix et propose un meilleur schéma.

:::solution
Problèmes :

- impossible de répondre proprement à « quelles recettes utilisent des œufs ? » : il faut
  chercher un motif dans du texte (`LIKE '%œufs%'`), qui trouverait aussi « blancs d’œufs » ;
- aucune vérification : « farinne » ou « 250 gr » sont acceptés ;
- l’ingrédient « farine » est réécrit dans chaque recette, avec des variantes possibles ;
- impossible de calculer la quantité totale de farine d’un menu.

Recettes et ingrédients forment une relation N-N qui porte des attributs (quantité, unité) :

```sql
CREATE TABLE recipes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL
);

CREATE TABLE ingredients (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE recipe_ingredients (
  recipe_id integer REFERENCES recipes (id),
  ingredient_id integer REFERENCES ingredients (id),
  quantity numeric(7, 2) NOT NULL,
  unit text NOT NULL,                     -- 'g', 'cl', 'pièce'…
  PRIMARY KEY (recipe_id, ingredient_id)  -- un ingrédient apparaît une fois par recette
);
```

La clé composée convient ici parce qu’un ingrédient n’apparaît qu’une fois dans une recette.
Si tu as créé la première version de `recipes`, supprime-la d’abord avec `DROP TABLE recipes;`.

:::

## Récapitulatif

- Analyser un besoin : les noms importants donnent les **entités**, leurs propriétés les
  **attributs**, les verbes les **relations**.
- La cardinalité se trouve avec deux questions, une dans chaque sens : 1-1, 1-N ou N-N.
- **1-N** : une clé étrangère (`colonne REFERENCES table (id)`) dans la table du côté N.
- **N-N** : une table d’association avec deux clés étrangères, souvent une clé primaire composée
  `PRIMARY KEY (a_id, b_id)`.
- Une association qui porte des dates ou peut se répéter (un emprunt) devient une entité avec son
  propre `id`.
- La clé étrangère garantit l’**intégrité référentielle** : pas de référence vers une ligne
  inexistante, pas de suppression d’une ligne encore référencée (par défaut).
- `REFERENCES` n’interdit pas `NULL` : ajoute `NOT NULL` si le lien est obligatoire.
