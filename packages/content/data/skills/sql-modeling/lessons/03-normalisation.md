---
title: Normaliser un schéma
summary: Repérer les redondances et les anomalies d’une table « tableur », puis appliquer les trois premières formes normales pour obtenir un schéma sain.
durationMinutes: 55
sources:
  - title: PostgreSQL — Contraintes et clés étrangères
    url: https://www.postgresql.org/docs/current/ddl-constraints.html
  - title: PostgreSQL — Tutoriel, clés étrangères
    url: https://www.postgresql.org/docs/current/tutorial-fk.html
---

Beaucoup de projets commencent par un tableur : une ligne par emprunt, avec tout ce qu’on sait
dessus. C’est pratique pour saisir, et c’est souvent ce qu’un premier jet généré produit aussi.
Mais dès qu’on y stocke durablement des données qui évoluent, des incohérences apparaissent :
deux adresses pour la même personne, un livre qui disparaît du catalogue sans qu’on l’ait voulu.

La **normalisation** est une démarche pour éviter ces problèmes : on découpe les données en
tables de sorte que **chaque information soit enregistrée à un seul endroit**. Cette leçon te
montre les anomalies concrètes d’une table mal conçue, puis les trois premières **formes
normales**, des règles qui permettent de les éliminer méthodiquement.

## Une table « tableur » et ses anomalies

Voici l’export du tableur des emprunts de la médiathèque, chargé tel quel dans une table. Tu peux
l’exécuter dans la base `mediatheque` : la table `loan_sheet` est indépendante des autres.

```sql
DROP TABLE IF EXISTS loan_sheet;
CREATE TABLE loan_sheet (
  loan_id integer PRIMARY KEY,
  member_email text NOT NULL,
  member_name text NOT NULL,
  book_isbn text NOT NULL,
  book_title text NOT NULL,
  book_authors text NOT NULL,
  genre text,
  loaned_on date NOT NULL,
  returned_on date
);
INSERT INTO loan_sheet VALUES
  (1, 'alice@example.com', 'Alice Durand', '978-2-0000-0001-1', 'Le Jardin des algorithmes', 'Claire Martin', 'informatique', '2024-09-02', '2024-09-20'),
  (2, 'alice@example.com', 'Alice Durand', '978-2-0000-0002-2', 'Nuit sur le port', 'Hugo Bernard', 'roman', '2024-09-20', '2024-10-15'),
  (3, 'bilal@example.com', 'Bilal Mansour', '978-2-0000-0004-4', 'Bases de données pour tous', 'Claire Martin, Paul Garnier', 'informatique', '2024-10-01', NULL),
  (4, 'chloe@example.com', 'Chloé Fabre', '978-2-0000-0002-2', 'Nuit sur le port', 'Hugo Bernard', 'roman', '2024-10-16', '2024-11-01'),
  (5, 'chloe@example.com', 'Chloé Fabre', '978-2-0000-0005-5', 'Le Dernier Phare', 'Hugo Bernard', 'roman', '2024-10-16', NULL),
  (6, 'alice@example.com', 'Alice Durand', '978-2-0000-0007-7', 'Mystère à Lyon', 'Emma Roux', 'roman', '2024-11-02', NULL);
SELECT loan_id, member_name, book_title, book_authors FROM loan_sheet ORDER BY loan_id;
```

```text
 loan_id |  member_name  |         book_title         |        book_authors
---------+---------------+----------------------------+-----------------------------
       1 | Alice Durand  | Le Jardin des algorithmes  | Claire Martin
       2 | Alice Durand  | Nuit sur le port           | Hugo Bernard
       3 | Bilal Mansour | Bases de données pour tous | Claire Martin, Paul Garnier
       4 | Chloé Fabre   | Nuit sur le port           | Hugo Bernard
       5 | Chloé Fabre   | Le Dernier Phare           | Hugo Bernard
       6 | Alice Durand  | Mystère à Lyon             | Emma Roux
(6 rows)
```

Le nom et l’e-mail d’Alice sont écrits trois fois, « Nuit sur le port » deux fois avec son ISBN,
son auteur et son genre. Cette **redondance** n’est pas seulement du gaspillage de place : elle
provoque trois sortes d’**anomalies**.

### L’anomalie de modification

Alice change d’adresse e-mail. Quelqu’un met à jour « sa » ligne la plus récente :

```sql
UPDATE loan_sheet SET member_email = 'alice.durand@example.com' WHERE loan_id = 6;
SELECT DISTINCT member_name, member_email FROM loan_sheet ORDER BY member_name, member_email;
```

```text
UPDATE 1
  member_name  |       member_email
---------------+--------------------------
 Alice Durand  | alice.durand@example.com
 Alice Durand  | alice@example.com
 Bilal Mansour | bilal@example.com
 Chloé Fabre   | chloe@example.com
(4 rows)
```

Alice a maintenant deux adresses, et personne ne sait laquelle est la bonne. Même chose si l’on
corrige le genre d’un livre sur une seule ligne :

```sql
UPDATE loan_sheet SET genre = 'polar' WHERE loan_id = 2;
SELECT DISTINCT book_title, genre FROM loan_sheet WHERE book_isbn = '978-2-0000-0002-2';
```

```text
UPDATE 1
    book_title    | genre
------------------+-------
 Nuit sur le port | polar
 Nuit sur le port | roman
(2 rows)
```

Quand une même information est copiée sur plusieurs lignes, chaque modification doit toucher
**toutes** les copies. Tôt ou tard, l’une est oubliée.

### L’anomalie de suppression

Bilal rend « Bases de données pour tous » et on efface la ligne de l’emprunt :

```sql
DELETE FROM loan_sheet WHERE loan_id = 3;
SELECT count(*) FROM loan_sheet WHERE book_isbn = '978-2-0000-0004-4';
```

```text
DELETE 1
 count
-------
     0
(1 row)
```

Le livre a disparu de la base, avec son titre et ses auteurs, alors qu’il est toujours dans les
rayons. Et Bilal aussi a disparu : c’était son seul emprunt. Supprimer un fait (un emprunt) a
détruit d’autres faits (un livre, un adhérent).

### L’anomalie d’insertion

La médiathèque achète un nouveau livre. Comment l’enregistrer ? Chaque ligne exige un `loan_id`,
un adhérent et une date d’emprunt (`NOT NULL`). Un livre jamais emprunté **ne peut pas exister**
dans cette table, sauf à inventer un faux emprunt. Même problème pour un nouvel adhérent.

Ces trois anomalies ont la même cause : la table mélange plusieurs **sujets** (les adhérents,
les livres, les auteurs, les genres, les emprunts). La normalisation consiste à les séparer.

## La notion de dépendance

Une idée sert de fil conducteur : la **dépendance fonctionnelle**. On dit que B dépend de A si,
connaissant A, on connaît forcément B. Dans `loan_sheet` :

- `book_isbn` → `book_title` : un ISBN désigne un seul livre, donc un seul titre ;
- `member_email` → `member_name` : une adresse correspond à une seule personne ;
- `loan_id` → `loaned_on` : un emprunt a une seule date de sortie.

Une table est saine quand chaque colonne dépend **de la clé, de toute la clé, et de rien d’autre
que la clé**. Les trois formes normales qui suivent reprennent chacune un morceau de cette
phrase.

## Première forme normale (1NF) : des valeurs atomiques

> Chaque case contient **une seule valeur**, et il n’y a pas de groupe de colonnes répétées.

La colonne `book_authors` viole cette règle : `'Claire Martin, Paul Garnier'` contient deux
valeurs. Les conséquences sont concrètes. Réexécute le script de création de `loan_sheet` du
début de la leçon pour retrouver les six emprunts, puis cherche les livres de Claire Martin avec
une égalité :

```sql
SELECT DISTINCT book_title FROM loan_sheet WHERE book_authors = 'Claire Martin';
```

```text
        book_title
---------------------------
 Le Jardin des algorithmes
(1 row)
```

« Bases de données pour tous », qu’elle a coécrit, est oublié.

Et la recherche par motif `LIKE '%Martin%'` trouverait aussi un futur « Martine Leroy ». Les
colonnes répétées (`author1`, `author2`, `author3`) ne valent pas mieux : que faire au quatrième
auteur, et comment chercher dans trois colonnes ?

**Correction** : une ligne par valeur, dans une table à part. C’est exactement la table
d’association `book_authors (book_id, author_id)` de la leçon 1, avec une table `authors`.

:::note[Atomique, relativement à l’usage]
Une adresse postale complète dans une colonne `text` est acceptable si on ne l’interroge jamais
par morceaux. Si l’on doit trier par ville ou filtrer par code postal, il faut des colonnes
séparées. La question à se poser : « aurai-je besoin d’accéder à une partie de cette valeur ? »
:::

## Deuxième forme normale (2NF) : dépendre de toute la clé

> La table est en 1NF, et chaque colonne qui ne fait pas partie de la clé dépend de **toute** la
> clé primaire, pas seulement d’une partie.

Cette règle ne concerne que les tables à **clé composée**. Supposons qu’on ait corrigé la 1NF en
créant une ligne par couple livre-auteur, mais en gardant des informations au passage :

```sql
CREATE TABLE book_author_rows (
  isbn text,
  author_name text,
  book_title text NOT NULL,
  author_country text,
  PRIMARY KEY (isbn, author_name)
);
INSERT INTO book_author_rows VALUES
  ('978-2-0000-0004-4', 'Claire Martin', 'Bases de données pour tous', 'France'),
  ('978-2-0000-0004-4', 'Paul Garnier', 'Bases de données pour tous', 'Belgique'),
  ('978-2-0000-0001-1', 'Claire Martin', 'Le Jardin des algorithmes', 'France');
SELECT * FROM book_author_rows ORDER BY isbn, author_name;
```

```text
       isbn        |  author_name  |         book_title         | author_country
-------------------+---------------+----------------------------+----------------
 978-2-0000-0001-1 | Claire Martin | Le Jardin des algorithmes  | France
 978-2-0000-0004-4 | Claire Martin | Bases de données pour tous | France
 978-2-0000-0004-4 | Paul Garnier  | Bases de données pour tous | Belgique
(3 rows)
```

La clé est le couple `(isbn, author_name)`. Mais `book_title` ne dépend que de `isbn`, et
`author_country` que de `author_name` : ce sont des **dépendances partielles**. Résultat, le titre
« Bases de données pour tous » est répété pour chaque auteur, et le pays de Claire Martin pour
chacun de ses livres : les anomalies reviennent.

**Correction** : chaque information va dans la table de ce dont elle dépend. Le titre dans
`books`, le pays dans `authors`, et la table d’association ne garde que le couple :

```text
books (id, isbn, title)
authors (id, name, country)
book_authors (book_id, author_id)
```

Supprime la table d’essai avec `DROP TABLE book_author_rows;`.

## Troisième forme normale (3NF) : rien d’autre que la clé

> La table est en 2NF, et aucune colonne non clé ne dépend d’une **autre colonne non clé**.

Une dépendance qui passe par une colonne intermédiaire s’appelle une **dépendance transitive**.
Exemple : la médiathèque propose des formules d’abonnement, et quelqu’un les enregistre ainsi :

```text
subscribers (id, name, plan_code, plan_label, plan_yearly_fee)
```

`id` → `plan_code` (chaque abonné a une formule) et `plan_code` → `plan_yearly_fee` (chaque
formule a un tarif). Le tarif dépend donc de l’abonné **à travers** la formule. Conséquence : le
tarif de la formule « Standard » est recopié chez chaque abonné Standard, et augmenter le tarif
oblige à modifier toutes ces lignes, avec le risque d’en oublier. Et une formule sans abonné ne
peut pas exister.

**Correction** : la formule devient une table, référencée par une clé étrangère.

```sql
CREATE TABLE plans (
  code text PRIMARY KEY,
  label text NOT NULL,
  yearly_fee numeric(6, 2) NOT NULL CHECK (yearly_fee >= 0)
);

CREATE TABLE subscribers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  plan_code text NOT NULL REFERENCES plans (code)
);

INSERT INTO plans (code, label, yearly_fee) VALUES ('STD', 'Standard', 20.00), ('FAM', 'Famille', 35.00);
INSERT INTO subscribers (name, plan_code) VALUES ('Alice Durand', 'STD'), ('Bilal Mansour', 'FAM'), ('Chloé Fabre', 'STD');
UPDATE plans SET yearly_fee = 22.00 WHERE code = 'STD';
```

```text
CREATE TABLE
CREATE TABLE
INSERT 0 2
INSERT 0 3
UPDATE 1
```

`UPDATE 1` : la hausse de tarif touche une seule ligne, quel que soit le nombre d’abonnés.
Remarque que la clé primaire de `plans` est ici un code texte court et stable (`'STD'`) : une
clé primaire n’est pas forcément un entier généré, à condition qu’elle ne change pas. Supprime
ces tables d’essai avec `DROP TABLE subscribers, plans;`.

Le même raisonnement explique la table `genres` de la médiathèque : avec une colonne `genre_name`
dans `books` à côté de `genre_id`, le nom dépendrait de `genre_id` et non du livre.

## Le schéma normalisé de la médiathèque

En appliquant ces règles à `loan_sheet`, on obtient, sujet par sujet :

| Sujet          | Table          | Ce qu’elle contient                              |
| -------------- | -------------- | ------------------------------------------------ |
| adhérents      | `members`      | nom, e-mail, date d’inscription                  |
| livres         | `books`        | titre, ISBN, année, prix, référence au genre     |
| auteurs        | `authors`      | nom                                              |
| auteurs/livres | `book_authors` | un couple livre-auteur par ligne                 |
| genres         | `genres`       | nom du genre                                     |
| emprunts       | `loans`        | références au livre et à l’adhérent, dates       |

C’est exactement le schéma de `mediatheque.sql` que tu as créé à la leçon 2. Vérifie que les
trois anomalies ont disparu : changer l’e-mail d’Alice modifie une ligne de `members` ; supprimer
un emprunt ne touche ni `books` ni `members` ; un livre peut être ajouté sans emprunt. Le prix à
payer : pour afficher « Alice Durand a emprunté Nuit sur le port », il faut maintenant **croiser**
trois tables. C’est le sujet de la leçon suivante, les jointures.

## Dénormaliser : quand et pourquoi

La normalisation est la règle par défaut, pas un dogme. Deux situations justifient de garder une
valeur « en double » :

- **Une valeur historique n’est pas une copie.** Dans une ligne de commande, on enregistre le
  prix unitaire **au moment de l’achat**. Si le prix du produit change demain, la facture
  d’hier ne doit pas changer. Ce `unit_price` ne dépend pas du produit, mais de la vente : ce
  n’est pas de la redondance.
- **La performance mesurée.** Sur de gros volumes, on stocke parfois un résultat calculé (un
  total, un compteur) pour éviter de le recalculer. C’est une décision à prendre après avoir
  constaté un problème, en sachant qu’il faudra maintenir la cohérence de cette copie.

## Pièges et idées reçues

- **« Normaliser, c’est créer le plus de tables possible. »** Non : c’est faire en sorte que
  chaque fait soit enregistré une fois. Une table par sujet, pas une table par colonne.
- **Une liste dans une colonne** viole la 1NF, même si elle « marche » avec `LIKE`.
- **Dupliquer le nom à côté de la clé étrangère** (`genre_id` et `genre_name` dans `books`) : la
  copie finit toujours par diverger.
- **Confondre redondance et historique** : le prix payé ou l’adresse de livraison d’une commande
  passée doivent être figés, pas référencés.
- **Corriger une anomalie à la main** au lieu de corriger le schéma : la suivante arrivera.

## Exercices

### Exercice 1 : diagnostiquer une table

Une boutique stocke ses commandes ainsi :

```text
orders_sheet (order_id, ordered_on, customer_email, customer_name, product_codes, total)
exemple : (17, '2024-11-02', 'jade@example.com', 'Jade Morel', 'TEA-01, MUG-03', 27.80)
```

Quelles règles de normalisation sont violées ? Quelles anomalies cela peut-il provoquer ?
Propose un découpage en tables (noms et colonnes, sans SQL).

:::solution
- **1NF** : `product_codes` contient plusieurs valeurs. Impossible de compter proprement les
  ventes d’un produit ou d’enregistrer une quantité par produit.
- **3NF** : `customer_name` dépend de `customer_email` (une colonne non clé), pas de la commande.
  Le nom est recopié à chaque commande : anomalie de modification si Jade change de nom, et un
  client sans commande ne peut pas exister (anomalie d’insertion).
- `total` se calcule à partir des lignes : c’est une valeur dérivée. On peut le garder comme
  instantané figé de la facture, mais il faut alors le faire consciemment.

Découpage proposé :

```text
customers (id, email, name)
products (id, code, name, price)
orders (id, customer_id, ordered_on)
order_lines (order_id, product_id, quantity, unit_price)
```

`order_lines` est une table d’association N-N entre commandes et produits, avec une clé
composée `(order_id, product_id)`. `unit_price` y est le prix **au moment de la commande** :
c’est de l’historique, pas une redondance avec `products.price`.
:::

### Exercice 2 : décomposer jusqu’en 3NF

Un établissement suit les notes ainsi, avec la clé primaire `(student_id, course_code)` :

```text
results (student_id, course_code, student_name, course_title, teacher_name, teacher_email, grade)
```

Chaque cours a un seul enseignant ; un enseignant peut avoir plusieurs cours. Identifie les
dépendances partielles et transitives, puis écris les `CREATE TABLE` d’un schéma en 3NF. La note
va de 0 à 20 et peut être encore inconnue.

:::solution
Dépendances :

- `student_id` → `student_name` : partielle (une partie de la clé), viole la 2NF ;
- `course_code` → `course_title`, `teacher_name` : partielles, violent la 2NF ;
- `teacher_name` → `teacher_email` : transitive (via le cours), viole la 3NF ;
- `(student_id, course_code)` → `grade` : seule la note dépend de toute la clé.

```sql
CREATE TABLE teachers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE courses (
  code text PRIMARY KEY,               -- code court et stable, utilisable comme clé
  title text NOT NULL,
  teacher_id integer NOT NULL REFERENCES teachers (id)
);

CREATE TABLE students (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE enrollments (
  student_id integer REFERENCES students (id),
  course_code text REFERENCES courses (code),
  grade numeric(4, 2) CHECK (grade BETWEEN 0 AND 20), -- NULL accepté : note pas encore connue
  PRIMARY KEY (student_id, course_code)
);
```

Chaque information n’apparaît qu’une fois : changer l’e-mail d’un enseignant modifie une seule
ligne, quel que soit son nombre de cours et d’étudiants. Supprime les tables avec
`DROP TABLE enrollments, students, courses, teachers;`.
:::

### Exercice 3 : redondance ou historique ?

Pour chacune de ces colonnes, dis s’il s’agit d’une redondance à éliminer ou d’une valeur
légitime à conserver, et pourquoi :

1. `loans.member_name`, à côté de `loans.member_id` ;
2. `order_lines.unit_price`, à côté de `order_lines.product_id` ;
3. `orders.shipping_address`, alors que le client a une adresse dans `customers`.

:::solution
1. **Redondance** : le nom de l’adhérent dépend de `member_id`, il est déjà dans `members`. La
   copie divergera au premier changement de nom.
2. **Historique légitime** : c’est le prix payé lors de cette vente, qui ne doit pas changer
   quand le catalogue change.
3. **Historique légitime** dans la plupart des cas : l’adresse où **cette** commande a été
   livrée est un fait de la commande. Si le client déménage, la commande passée n’a pas été
   livrée à sa nouvelle adresse.

Le critère : la valeur dépend-elle de l’entité référencée **aujourd’hui** (redondance), ou de
l’événement enregistré **à ce moment-là** (historique) ?
:::

## Récapitulatif

- Une table qui mélange plusieurs sujets provoque des **anomalies** de modification, de
  suppression et d’insertion.
- Une **dépendance fonctionnelle** A → B signifie : connaître A suffit à connaître B.
- **1NF** : une seule valeur par case, pas de colonnes répétées.
- **2NF** : chaque colonne non clé dépend de **toute** la clé (concerne les clés composées).
- **3NF** : aucune colonne non clé ne dépend d’une autre colonne non clé.
- En résumé : chaque colonne dépend de la clé, de toute la clé, et de rien d’autre que la clé.
- On corrige en déplaçant l’information dans la table du sujet dont elle dépend, reliée par une
  clé étrangère.
- Une valeur historique (prix payé, adresse de livraison) n’est pas une redondance ; une
  dénormalisation pour la performance se décide après mesure.
