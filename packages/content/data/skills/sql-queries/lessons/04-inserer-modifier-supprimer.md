---
title: Insérer, modifier et supprimer sans accident
summary: Ajouter des lignes avec INSERT, les modifier avec UPDATE, les supprimer avec DELETE, contrôler le résultat avec RETURNING et adopter une méthode qui évite les modifications massives involontaires.
durationMinutes: 50
sources:
  - title: PostgreSQL — INSERT
    url: https://www.postgresql.org/docs/current/sql-insert.html
  - title: PostgreSQL — UPDATE
    url: https://www.postgresql.org/docs/current/sql-update.html
  - title: PostgreSQL — DELETE
    url: https://www.postgresql.org/docs/current/sql-delete.html
---

Lire des données ne présente aucun risque : au pire, la requête renvoie un résultat inattendu.
Les modifier, c’est une autre affaire. Une seule instruction `UPDATE` ou `DELETE` mal écrite peut
toucher **toutes** les lignes d’une table en une fraction de seconde, sans confirmation ni
corbeille. Cette leçon t’apprend les trois instructions d’écriture et, surtout, une façon de
travailler qui rend ces accidents très improbables.

Recharge la table d’entraînement, puis exécute les exemples **dans l’ordre** : chacun part de
l’état laissé par le précédent, et les identifiants affichés en dépendent.

```bash
psql -h localhost -U postgres -d library -f books.sql
```

## INSERT : ajouter des lignes

La forme recommandée nomme explicitement les colonnes, puis donne les valeurs dans le **même
ordre** :

```sql
INSERT INTO books (title, author, genre, published_year, pages, price, in_stock, added_on)
VALUES ('Le Code des étoiles', 'Nora Lefèvre', 'informatique', 2025, 188, 27.00, true, '2024-07-01');
```

```text
INSERT 0 1
```

`id` n’apparaît pas dans la liste : la colonne d’identité s’en charge. Les colonnes que tu
n’indiques pas reçoivent leur valeur par défaut, c’est-à-dire `NULL` si aucune autre valeur par
défaut n’a été déclarée.

### RETURNING : voir ce qui a été écrit

`INSERT 0 1` dit qu’une ligne a été insérée, mais pas laquelle ni quel `id` elle a reçu. La
clause `RETURNING`, une extension de PostgreSQL, renvoie les colonnes de ton choix pour chaque
ligne écrite, comme un `SELECT` :

```sql
INSERT INTO books (title, author, price, in_stock, added_on)
VALUES ('Contes de la forêt', 'Nora Lefèvre', 14.50, true, '2024-07-02')
RETURNING id, title, genre;
```

```text
 id |       title        | genre
----+--------------------+-------
 12 | Contes de la forêt |
(1 row)

INSERT 0 1
```

Le livre a reçu l’`id` 12, et son genre, non fourni, vaut `NULL`. Dans une application,
`RETURNING id` est la façon standard de connaître l’identifiant de la ligne créée.

### Plusieurs lignes d’un coup

Une seule instruction peut insérer plusieurs lignes, séparées par des virgules. C’est plus rapide
que plusieurs `INSERT`, et c’est **tout ou rien** : si une ligne est invalide, aucune n’est
insérée.

```sql
INSERT INTO books (title, author, price, in_stock, added_on)
VALUES
  ('Recettes du marché', 'Lina Petit', 19.00, true, '2024-07-03'),
  ('Python sans peur', 'Paul Garnier', 31.00, false, '2024-07-04')
RETURNING id, title;
```

```text
 id |       title
----+--------------------
 13 | Recettes du marché
 14 | Python sans peur
(2 rows)

INSERT 0 2
```

### Ce que PostgreSQL refuse

Le schéma de la table protège les données. Une colonne obligatoire oubliée :

```sql
INSERT INTO books (title, price, in_stock, added_on) VALUES ('Sans auteur', 10.00, true, '2024-07-05');
```

```text
ERROR:  null value in column "author" of relation "books" violates not-null constraint
DETAIL:  Failing row contains (15, Sans auteur, null, null, null, null, 10.00, t, 2024-07-05).
```

Le détail montre la ligne refusée : elle avait déjà reçu l’`id` 15, qui est désormais perdu (tu
le constateras plus bas).

Sans liste de colonnes, PostgreSQL remplit les colonnes **dans l’ordre de la table**, en
commençant par `id`. Le titre atterrit dans une colonne entière :

```sql
INSERT INTO books VALUES ('Livre mystère', 'Anonyme', 'roman', 2020, 100, 9.00, true, '2024-07-05');
```

```text
ERROR:  invalid input syntax for type integer: "Livre mystère"
LINE 1: INSERT INTO books VALUES ('Livre mystère', 'Anonyme', 'roman...
                                  ^
```

C’est la meilleure raison de **toujours** nommer les colonnes : le jour où la table gagne une
colonne, un `INSERT` sans liste casse ou, pire, range des valeurs au mauvais endroit sans erreur
si les types concordent.

Un type invalide et un nombre trop grand pour `numeric(6, 2)` sont refusés eux aussi :

```sql
INSERT INTO books (title, author, price, in_stock, added_on) VALUES ('Prix invalide', 'Anonyme', 'gratuit', true, '2024-07-05');
```

```text
ERROR:  invalid input syntax for type numeric: "gratuit"
LINE 1: ...ck, added_on) VALUES ('Prix invalide', 'Anonyme', 'gratuit',...
                                                             ^
```

```sql
INSERT INTO books (title, author, price, in_stock, added_on) VALUES ('Trop cher', 'Anonyme', 12345.00, true, '2024-07-05');
```

```text
ERROR:  numeric field overflow
DETAIL:  A field with precision 6, scale 2 must round to an absolute value less than 10^4.
```

Enfin, une apostrophe dans une valeur se double :

```sql
INSERT INTO books (title, author, price, in_stock, added_on) VALUES ('L''Atelier', 'Anonyme', 8.00, true, '2024-07-05') RETURNING id, title;
```

```text
 id |   title
----+-----------
 16 | L'Atelier
(1 row)

INSERT 0 1
```

L’`id` 15 a bien été sauté : il avait été consommé par l’insertion refusée.

:::note[Les données viennent rarement de ton clavier]
Ici tu tapes les valeurs toi-même. Dans une application, elles viendront d’un formulaire et
seront transmises séparément de la requête, grâce aux **requêtes paramétrées**. Ne construis
jamais une requête en collant du texte saisi par un utilisateur : tu l’apprendras en détail dans
la compétence sur l’accès à la base depuis Node.js.
:::

## UPDATE : modifier des lignes

`UPDATE table SET colonne = valeur WHERE condition` modifie les lignes qui vérifient la
condition. Regardons d’abord le livre 5 :

```sql
SELECT id, title, price FROM books WHERE id = 5;
```

```text
 id |      title       | price
----+------------------+-------
  5 | Le Dernier Phare |  9.90
(1 row)
```

```sql
UPDATE books SET price = 10.90 WHERE id = 5;
```

```text
UPDATE 1
```

`UPDATE 1` indique le nombre de lignes modifiées : **lis toujours ce nombre**. Plusieurs colonnes
se modifient en une fois, séparées par des virgules, et `RETURNING` montre le résultat :

```sql
UPDATE books SET price = 12.90, in_stock = false WHERE id = 5 RETURNING id, title, price, in_stock;
```

```text
 id |      title       | price | in_stock
----+------------------+-------+----------
  5 | Le Dernier Phare | 12.90 | f
(1 row)

UPDATE 1
```

La nouvelle valeur peut dépendre de l’ancienne. Une remise de 10 % sur tous les romans :

```sql
UPDATE books SET price = price * 0.9 WHERE genre = 'roman' RETURNING title, price;
```

```text
      title       | price
------------------+-------
 Nuit sur le port | 16.65
 Mystère à Lyon   | 18.90
 Le Dernier Phare | 11.61
(3 rows)

UPDATE 3
```

Le calcul produit trois décimales (`18.50 * 0.9` donne `16.650`), mais la colonne `numeric(6, 2)`
arrondit toute valeur à deux décimales au moment de l’écriture. Ici l’arrondi ne change rien ;
avec une remise de 15 %, `18.50 * 0.85` donnerait `15.725`, stocké `15.73`. Comme
pour un `SELECT` sans `ORDER BY`, l’ordre des lignes renvoyées par `RETURNING` n’est pas garanti.

Si aucune ligne ne correspond, ce n’est pas une erreur :

```sql
UPDATE books SET genre = 'voyage' WHERE id = 999;
```

```text
UPDATE 0
```

Dans une application, `UPDATE 0` signifie souvent « l’élément demandé n’existe pas » : c’est à
toi de le détecter et de répondre en conséquence (une page 404, par exemple).

## DELETE : supprimer des lignes

`DELETE FROM table WHERE condition` supprime les lignes qui vérifient la condition. Commence par
regarder ce que tu vas supprimer :

```sql
SELECT id, title FROM books WHERE author = 'Nora Lefèvre';
```

```text
 id |        title
----+---------------------
 11 | Le Code des étoiles
 12 | Contes de la forêt
(2 rows)
```

```sql
DELETE FROM books WHERE author = 'Nora Lefèvre' RETURNING id, title;
```

```text
 id |        title
----+---------------------
 11 | Le Code des étoiles
 12 | Contes de la forêt
(2 rows)

DELETE 2
```

Les deux nombres concordent : tu as supprimé exactement ce que tu voulais. Supprimer une ligne
qui n’existe pas renvoie simplement `DELETE 0`.

## La méthode anti-accident

Voici l’erreur que chaque développeur redoute : oublier le `WHERE`.

```sql
UPDATE books SET in_stock = false;
DELETE FROM books;
```

La première instruction marque **tous** les livres comme indisponibles, la seconde **vide la
table**. PostgreSQL ne demande aucune confirmation : du point de vue de SQL, ce sont des
instructions parfaitement valides. Une méthode simple, en quatre étapes, évite presque tous les
accidents.

1. **Écrire d’abord un `SELECT`** avec exactement le `WHERE` prévu, et vérifier les lignes
   renvoyées (et leur nombre).
2. **Transformer** ce `SELECT` en `UPDATE` ou en `DELETE` en gardant le `WHERE` à l’identique,
   idéalement en copiant-collant la ligne.
3. **Ajouter `RETURNING`** pour voir ce qui a réellement été modifié.
4. **Comparer** le nombre affiché (`UPDATE n`, `DELETE n`) avec celui de l’étape 1.

Pour les opérations sensibles, `psql` offre en plus un filet de sécurité : une **transaction**.
`BEGIN;` ouvre une transaction ; les modifications qui suivent ne sont définitives qu’après
`COMMIT;`, et `ROLLBACK;` les annule toutes. Démonstration avec un `WHERE` oublié volontairement :

```sql
BEGIN;
UPDATE books SET in_stock = false;
SELECT count(*) FROM books WHERE in_stock;
```

```text
BEGIN
UPDATE 13
 count
-------
     0
(1 row)
```

`UPDATE 13` : bien plus de lignes que prévu ! Puisque la transaction n’est pas validée, on annule :

```sql
ROLLBACK;
SELECT count(*) FROM books WHERE in_stock;
```

```text
ROLLBACK
 count
-------
     8
(1 row)
```

Les huit livres en stock le sont toujours. Tu étudieras les transactions en profondeur dans la
compétence suivante ; retiens pour l’instant le réflexe `BEGIN` … vérification … `COMMIT` ou
`ROLLBACK` avant une modification importante faite à la main.

:::warning[Pas d’annulation après coup]
Sans transaction ouverte, `psql` valide chaque instruction immédiatement (on parle
d’_autocommit_). Une fois `DELETE 13` affiché, aucune commande ne ramène les lignes : seule une
sauvegarde le pourrait. Et si tu oublies le `COMMIT` puis fermes `psql`, la transaction est
annulée : vérifie toujours que tu as conclu.
:::

Il existe aussi `TRUNCATE books;`, qui vide une table entière plus vite que `DELETE`. Il n’a pas
de `WHERE` : réserve-le aux tables d’essai.

## Pièges et idées reçues

- **Oublier le `WHERE`** dans `UPDATE` ou `DELETE` : toutes les lignes sont touchées.
- **Un `WHERE` trop large** : `WHERE author LIKE '%Petit%'` touche aussi un futur « Jean
  Petitjean ». Pour viser une ligne précise, filtre sur sa clé primaire.
- **Insérer sans nommer les colonnes** : fragile dès que la table évolue.
- **Ignorer le compte renvoyé** : `UPDATE 0` signale souvent un identifiant inexistant,
  `UPDATE 13` un filtre oublié.
- **Croire qu’un `id` manquant est un bug** : les séquences ne reviennent pas en arrière après
  une insertion refusée.
- **Mettre à jour un prix sans penser à l’arrondi** : la colonne `numeric(6, 2)` arrondit, mais
  autant arrondir explicitement avec `round(…, 2)` pour savoir ce qui sera stocké.

## Exercices

Recharge `books.sql`, puis enchaîne les trois exercices dans l’ordre.

### Exercice 1 : deux nouveautés

Ajoute en une seule instruction ces deux livres, et affiche leur `id`, leur titre et leur prix :

- « Les Secrets du pain », Lina Petit, cuisine, 2024, 210 pages, 22 €, en stock, ajouté le
  15 septembre 2024 ;
- « Atlas des phares », Sami Haddad, genre inconnu, 2022, 144 pages, 39 €, en stock, ajouté le
  16 septembre 2024.

:::solution
```sql
INSERT INTO books (title, author, genre, published_year, pages, price, in_stock, added_on)
VALUES
  ('Les Secrets du pain', 'Lina Petit', 'cuisine', 2024, 210, 22.00, true, '2024-09-15'),
  ('Atlas des phares', 'Sami Haddad', NULL, 2022, 144, 39.00, true, '2024-09-16') -- genre inconnu : NULL
RETURNING id, title, price;
```

```text
 id |        title        | price
----+---------------------+-------
 11 | Les Secrets du pain | 22.00
 12 | Atlas des phares    | 39.00
(2 rows)

INSERT 0 2
```

On écrit `NULL` sans apostrophes : `'NULL'` serait le texte de quatre lettres « NULL ». On aurait
aussi pu omettre `genre` de la liste des colonnes, mais il faudrait alors deux instructions,
puisque le premier livre a un genre.
:::

### Exercice 2 : une hausse de prix maîtrisée

Les livres d’informatique augmentent de 8 %, prix arrondi au centime. Applique la méthode
anti-accident : prévisualise d’abord les anciens et nouveaux prix, puis fais la modification en
affichant le résultat.

:::solution
Étape 1, prévisualisation avec exactement le même `WHERE` :

```sql
SELECT title, price, round(price * 1.08, 2) AS new_price
FROM books
WHERE genre = 'informatique'
ORDER BY id;
```

```text
           title            | price | new_price
----------------------------+-------+-----------
 Le Jardin des algorithmes  | 29.90 |     32.29
 Bases de données pour tous | 35.00 |     37.80
 Apprendre SQL              | 32.50 |     35.10
(3 rows)
```

Étapes 2 à 4, la modification, puis comparaison des comptes (3 et 3) :

```sql
UPDATE books
SET price = round(price * 1.08, 2)
WHERE genre = 'informatique'
RETURNING id, title, price;
```

```text
 id |           title            | price
----+----------------------------+-------
  1 | Le Jardin des algorithmes  | 32.29
  4 | Bases de données pour tous | 37.80
  9 | Apprendre SQL              | 35.10
(3 rows)

UPDATE 3
```

Le calcul `price * 1.08` utilise l’ancienne valeur de la ligne : dans un `UPDATE`, les
expressions à droite du `=` voient toujours la ligne **avant** modification.
:::

### Exercice 3 : un ménage ciblé

Supprime les livres qui ne sont **pas en stock** et qui ont été ajoutés **avant le 1er mai
2024**. Prévois d’abord combien de lignes seront supprimées, puis vérifie le nombre de livres
restants.

:::solution
```sql
SELECT id, title, in_stock, added_on
FROM books
WHERE NOT in_stock AND added_on < '2024-05-01'
ORDER BY id;
```

```text
 id |         title          | in_stock |  added_on
----+------------------------+----------+------------
  3 | La Cuisine du dimanche | f        | 2024-02-20
  7 | Carnet de voyage       | f        | 2024-04-19
(2 rows)
```

« Apprendre SQL » n’est pas en stock, mais il a été ajouté le 21 mai : il reste. Deux lignes
prévues, donc :

```sql
DELETE FROM books
WHERE NOT in_stock AND added_on < '2024-05-01'
RETURNING id, title;
SELECT count(*) FROM books;
```

```text
 id |         title
----+------------------------
  3 | La Cuisine du dimanche
  7 | Carnet de voyage
(2 rows)

DELETE 2
 count
-------
    10
(1 row)
```

Douze livres après l’exercice 1, moins deux : il en reste dix. La comparaison `added_on <
'2024-05-01'` exclut le 1er mai lui-même, conformément à « avant le 1er mai ».
:::

## Récapitulatif

- `INSERT INTO table (colonnes) VALUES (…), (…)` ajoute une ou plusieurs lignes, en tout ou rien.
  Nomme toujours les colonnes et laisse PostgreSQL générer l’`id`.
- `RETURNING` (PostgreSQL) renvoie les lignes écrites : idéal pour récupérer l’`id` créé ou
  contrôler une modification.
- `UPDATE table SET col = expr, … WHERE …` modifie ; l’expression peut utiliser l’ancienne valeur.
- `DELETE FROM table WHERE …` supprime. `TRUNCATE` vide une table entière.
- Le compte affiché (`UPDATE n`, `DELETE n`) se lit toujours ; `0` n’est pas une erreur.
- Méthode anti-accident : `SELECT` avec le même `WHERE`, puis écriture avec `RETURNING`, puis
  comparaison des comptes ; à la main, `BEGIN` … vérification … `COMMIT` ou `ROLLBACK`.
- Les apostrophes se doublent dans une chaîne ; les valeurs saisies par un utilisateur passeront
  par des requêtes paramétrées, jamais par concaténation.
