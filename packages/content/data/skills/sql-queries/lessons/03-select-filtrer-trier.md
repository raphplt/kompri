---
title: Lire des données avec SELECT
summary: Choisir des colonnes, filtrer avec WHERE, LIKE, IN, BETWEEN et IS NULL, trier avec ORDER BY et paginer avec LIMIT et OFFSET.
durationMinutes: 60
sources:
  - title: PostgreSQL — SELECT
    url: https://www.postgresql.org/docs/current/sql-select.html
  - title: PostgreSQL — Recherche de motifs (LIKE)
    url: https://www.postgresql.org/docs/current/functions-matching.html
  - title: PostgreSQL — Opérateurs de comparaison
    url: https://www.postgresql.org/docs/current/functions-comparison.html
---

Dans une application, l’immense majorité des requêtes sont des lectures : afficher la liste des
livres disponibles, chercher un titre, montrer les dix derniers ajouts, passer à la page suivante.
Toutes s’écrivent avec `SELECT`. Cette leçon t’apprend à demander **exactement** les lignes et
les colonnes dont tu as besoin, dans l’ordre voulu.

Avant de commencer, recharge la table d’entraînement pour partir des mêmes données que les
exemples :

```bash
psql -h localhost -U postgres -d library -f books.sql
```

## Choisir les colonnes

La forme minimale d’une lecture est `SELECT colonnes FROM table;`. `*` signifie « toutes les
colonnes », pratique pour explorer, mais dans une application on liste les colonnes utiles : le
résultat est plus léger et ne change pas si quelqu’un ajoute une colonne à la table.

```sql
SELECT title, author, price FROM books;
```

```text
           title            |    author     | price
----------------------------+---------------+-------
 Le Jardin des algorithmes  | Claire Martin | 29.90
 Nuit sur le port           | Hugo Bernard  | 18.50
 La Cuisine du dimanche     | Lina Petit    | 24.00
 Bases de données pour tous | Claire Martin | 35.00
 Le Dernier Phare           | Hugo Bernard  |  9.90
 Petits plats rapides       | Lina Petit    | 15.00
 Carnet de voyage           | Sami Haddad   | 12.00
 Mystère à Lyon             | Emma Roux     | 21.00
 Apprendre SQL              | Paul Garnier  | 32.50
 Poèmes du matin            | Emma Roux     | 11.00
(10 rows)
```

Sur une table fraîchement chargée, les lignes sortent ici dans l’ordre d’insertion, mais rien ne
le garantit : seul `ORDER BY`, vu plus bas, impose un ordre.

Une colonne du résultat peut être **calculée**. `AS` lui donne un nom (un **alias**) :

```sql
SELECT title, round(price * 1.055, 2) AS price_with_tax FROM books WHERE id <= 3;
```

```text
           title           | price_with_tax
---------------------------+----------------
 Le Jardin des algorithmes |          31.54
 Nuit sur le port          |          19.52
 La Cuisine du dimanche    |          25.32
(3 rows)
```

Le calcul ne modifie pas la table : `SELECT` ne fait que **lire**. `round(valeur, 2)` arrondit à
deux décimales.

`DISTINCT` supprime les doublons du résultat. Pour connaître les auteurs présents au catalogue :

```sql
SELECT DISTINCT author FROM books ORDER BY author;
```

```text
    author
---------------
 Claire Martin
 Emma Roux
 Hugo Bernard
 Lina Petit
 Paul Garnier
 Sami Haddad
(6 rows)
```

## Filtrer avec WHERE

`WHERE condition` ne garde que les lignes pour lesquelles la condition est vraie. Les opérateurs
de comparaison sont `=`, `<>` (différent, on peut aussi écrire `!=`), `<`, `<=`, `>` et `>=`.
Attention : en SQL, l’égalité s’écrit avec **un seul** `=`.

```sql
SELECT title, price FROM books WHERE price < 15;
```

```text
      title       | price
------------------+-------
 Le Dernier Phare |  9.90
 Carnet de voyage | 12.00
 Poèmes du matin  | 11.00
(3 rows)
```

Pour comparer avec du texte, la valeur s’écrit entre apostrophes, et la comparaison respecte la
casse (majuscules et minuscules) :

```sql
SELECT title, genre FROM books WHERE genre = 'roman';
```

```text
      title       | genre
------------------+-------
 Nuit sur le port | roman
 Le Dernier Phare | roman
 Mystère à Lyon   | roman
(3 rows)
```

```sql
SELECT title, genre FROM books WHERE genre = 'Roman';
```

```text
 title | genre
-------+-------
(0 rows)
```

Zéro ligne n’est pas une erreur : la requête est valide, simplement aucune ligne ne correspond.
En revanche, oublier les apostrophes provoque une erreur, car PostgreSQL croit que `roman` est un
nom de colonne :

```sql
SELECT title FROM books WHERE genre = roman;
```

```text
ERROR:  column "roman" does not exist
LINE 1: SELECT title FROM books WHERE genre = roman;
                                              ^
```

### Combiner des conditions : AND, OR, NOT

`AND` exige que les deux conditions soient vraies, `OR` qu’au moins une le soit, `NOT` inverse.
Une colonne `boolean` est déjà une condition : `WHERE in_stock` suffit, inutile d’écrire
`in_stock = true`.

```sql
SELECT title, genre, in_stock FROM books WHERE genre = 'informatique' AND in_stock;
```

```text
           title            |    genre     | in_stock
----------------------------+--------------+----------
 Le Jardin des algorithmes  | informatique | t
 Bases de données pour tous | informatique | t
(2 rows)
```

Le piège classique est la **priorité** : `AND` est évalué avant `OR`, comme la multiplication
avant l’addition. Tu veux « les livres de cuisine ou les romans, à plus de 20 € » :

```sql
SELECT title, genre, price FROM books WHERE genre = 'cuisine' OR genre = 'roman' AND price > 20;
```

```text
         title          |  genre  | price
------------------------+---------+-------
 La Cuisine du dimanche | cuisine | 24.00
 Petits plats rapides   | cuisine | 15.00
 Mystère à Lyon         | roman   | 21.00
(3 rows)
```

« Petits plats rapides » à 15 € s’est glissé dans le résultat, car PostgreSQL a compris
`genre = 'cuisine' OR (genre = 'roman' AND price > 20)`. Les parenthèses rétablissent l’intention :

```sql
SELECT title, genre, price FROM books WHERE (genre = 'cuisine' OR genre = 'roman') AND price > 20;
```

```text
         title          |  genre  | price
------------------------+---------+-------
 La Cuisine du dimanche | cuisine | 24.00
 Mystère à Lyon         | roman   | 21.00
(2 rows)
```

Règle simple : dès que tu mélanges `AND` et `OR`, mets des parenthèses.

### Chercher un motif : LIKE et ILIKE

`LIKE` compare un texte à un **motif** où `%` remplace n’importe quelle suite de caractères (même
vide) et `_` exactement un caractère.

```sql
SELECT title FROM books WHERE title LIKE 'Le %';
```

```text
           title
---------------------------
 Le Jardin des algorithmes
 Le Dernier Phare
(2 rows)
```

```sql
SELECT title FROM books WHERE title LIKE '%de%';
```

```text
           title
----------------------------
 Le Jardin des algorithmes
 Bases de données pour tous
 Petits plats rapides
 Carnet de voyage
(4 rows)
```

Surprise : « Petits plats rapi**de**s » correspond aussi. `LIKE` cherche une suite de
caractères, pas un mot. Et `_` compte un caractère exactement :

```sql
SELECT title, author FROM books WHERE author LIKE '_mma%';
```

```text
      title      |  author
-----------------+-----------
 Mystère à Lyon  | Emma Roux
 Poèmes du matin | Emma Roux
(2 rows)
```

`LIKE` respecte la casse. `ILIKE`, une extension propre à PostgreSQL, l’ignore :

```sql
SELECT title FROM books WHERE title LIKE '%sql%';
```

```text
 title
-------
(0 rows)
```

```sql
SELECT title FROM books WHERE title ILIKE '%sql%';
```

```text
     title
---------------
 Apprendre SQL
(1 row)
```

### Appartenir à une liste : IN

`IN (valeurs)` remplace une série de `OR` sur la même colonne, et `NOT IN` l’inverse :

```sql
SELECT title, genre FROM books WHERE genre IN ('cuisine', 'poésie');
```

```text
         title          |  genre
------------------------+---------
 La Cuisine du dimanche | cuisine
 Petits plats rapides   | cuisine
 Poèmes du matin        | poésie
(3 rows)
```

### Un intervalle : BETWEEN

`BETWEEN a AND b` équivaut à `>= a AND <= b` : les **deux bornes sont incluses**.

```sql
SELECT title, published_year FROM books WHERE published_year BETWEEN 2019 AND 2021;
```

```text
           title           | published_year
---------------------------+----------------
 Le Jardin des algorithmes |           2019
 Nuit sur le port          |           2021
 Carnet de voyage          |           2020
 Apprendre SQL             |           2020
(4 rows)
```

Il fonctionne aussi avec des dates :

```sql
SELECT title, added_on FROM books WHERE added_on BETWEEN '2024-03-01' AND '2024-04-30';
```

```text
           title            |  added_on
----------------------------+------------
 Bases de données pour tous | 2024-03-11
 Le Dernier Phare           | 2024-03-28
 Petits plats rapides       | 2024-04-02
 Carnet de voyage           | 2024-04-19
(4 rows)
```

:::warning[BETWEEN et les instants]
Avec une colonne `timestamptz`, `BETWEEN '2024-03-01' AND '2024-04-30'` s’arrête au 30 avril à
minuit pile et exclut le reste de la journée. Pour un instant, préfère une borne supérieure
**exclue** : `created_at >= '2024-03-01' AND created_at < '2024-05-01'`.
:::

### Les valeurs absentes : IS NULL

Le livre « Carnet de voyage » n’a pas de genre : sa case vaut `NULL`, qui signifie « valeur
inconnue ». On pourrait croire qu’il suffit d’écrire `genre = NULL` :

```sql
SELECT title, genre FROM books WHERE genre = NULL;
```

```text
 title | genre
-------+-------
(0 rows)
```

Aucune ligne ! Comparer quoi que ce soit à une valeur inconnue donne un résultat inconnu, jamais
vrai. Pour tester l’absence, SQL fournit un opérateur dédié, `IS NULL` (et son contraire
`IS NOT NULL`) :

```sql
SELECT title, genre FROM books WHERE genre IS NULL;
```

```text
      title       | genre
------------------+-------
 Carnet de voyage |
(1 row)
```

Conséquence importante : `genre <> 'roman'` n’inclut **pas** le livre sans genre. Si tu veux
« tous les livres qui ne sont pas des romans, y compris ceux sans genre », il faut le dire :

```sql
SELECT title, genre FROM books WHERE genre NOT IN ('roman', 'cuisine') OR genre IS NULL ORDER BY title;
```

```text
           title            |    genre
----------------------------+--------------
 Apprendre SQL              | informatique
 Bases de données pour tous | informatique
 Carnet de voyage           |
 Le Jardin des algorithmes  | informatique
 Poèmes du matin            | poésie
(5 rows)
```

La leçon 5 approfondit ce comportement de `NULL`.

## Trier avec ORDER BY

`ORDER BY colonne` trie par ordre croissant (`ASC`, par défaut) ; `DESC` trie par ordre
décroissant.

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 3;
```

```text
           title            | price
----------------------------+-------
 Bases de données pour tous | 35.00
 Apprendre SQL              | 32.50
 Le Jardin des algorithmes  | 29.90
(3 rows)
```

On peut trier sur plusieurs colonnes : la deuxième départage les égalités de la première.

```sql
SELECT title, genre, price FROM books ORDER BY genre, price DESC;
```

```text
           title            |    genre     | price
----------------------------+--------------+-------
 La Cuisine du dimanche     | cuisine      | 24.00
 Petits plats rapides       | cuisine      | 15.00
 Bases de données pour tous | informatique | 35.00
 Apprendre SQL              | informatique | 32.50
 Le Jardin des algorithmes  | informatique | 29.90
 Poèmes du matin            | poésie       | 11.00
 Mystère à Lyon             | roman        | 21.00
 Nuit sur le port           | roman        | 18.50
 Le Dernier Phare           | roman        |  9.90
 Carnet de voyage           |              | 12.00
(10 rows)
```

Chaque direction s’applique à **sa** colonne : ici, `genre` croissant puis `price` décroissant.
Remarque aussi où se place le `NULL` : dans PostgreSQL, les valeurs absentes sont considérées
comme plus grandes que toutes les autres. Elles arrivent donc en dernier en ordre croissant… et
en premier en ordre décroissant :

```sql
SELECT title, published_year FROM books ORDER BY published_year DESC, title;
```

```text
           title            | published_year
----------------------------+----------------
 Poèmes du matin            |
 Mystère à Lyon             |           2024
 Petits plats rapides       |           2023
 Bases de données pour tous |           2022
 Nuit sur le port           |           2021
 Apprendre SQL              |           2020
 Carnet de voyage           |           2020
 Le Jardin des algorithmes  |           2019
 La Cuisine du dimanche     |           2018
 Le Dernier Phare           |           2016
(10 rows)
```

`NULLS LAST` ou `NULLS FIRST` choisit explicitement leur place :

```sql
SELECT title, published_year FROM books ORDER BY published_year DESC NULLS LAST, title LIMIT 3;
```

```text
           title            | published_year
----------------------------+----------------
 Mystère à Lyon             |           2024
 Petits plats rapides       |           2023
 Bases de données pour tous |           2022
(3 rows)
```

Le second critère `title` n’est pas décoratif : deux livres datent de 2020. Sans critère de
départage, leur ordre relatif n’est pas garanti et peut changer d’une exécution à l’autre.

:::note[L’ordre alphabétique dépend de la collation]
Le tri du texte suit les règles d’une **collation**, choisie à la création de la base (souvent
d’après la langue du système). Selon la collation, les majuscules, les accents ou les espaces ne
sont pas classés de la même façon. Les exemples de ce cours évitent ces cas ambigus ; dans une
vraie application, vérifie le tri avec des données accentuées.
:::

## Paginer avec LIMIT et OFFSET

`LIMIT n` garde au plus `n` lignes ; `OFFSET k` saute les `k` premières. Ensemble, ils
découpent un résultat en **pages**. Pour des pages de 4 livres :

```sql
SELECT id, title FROM books ORDER BY id LIMIT 4 OFFSET 0;
```

```text
 id |           title
----+----------------------------
  1 | Le Jardin des algorithmes
  2 | Nuit sur le port
  3 | La Cuisine du dimanche
  4 | Bases de données pour tous
(4 rows)
```

```sql
SELECT id, title FROM books ORDER BY id LIMIT 4 OFFSET 4;
```

```text
 id |        title
----+----------------------
  5 | Le Dernier Phare
  6 | Petits plats rapides
  7 | Carnet de voyage
  8 | Mystère à Lyon
(4 rows)
```

```sql
SELECT id, title FROM books ORDER BY id LIMIT 4 OFFSET 8;
```

```text
 id |      title
----+-----------------
  9 | Apprendre SQL
 10 | Poèmes du matin
(2 rows)
```

La formule générale : pour la page `p` (en comptant à partir de 1) de taille `n`, on écrit
`LIMIT n OFFSET (p - 1) * n`. La dernière page peut être incomplète.

:::warning[Pas de pagination sans ORDER BY]
`LIMIT` et `OFFSET` sans `ORDER BY` découpent un résultat dont l’ordre n’est pas garanti : un
livre peut apparaître sur deux pages, ou sur aucune. Paginer impose un tri **total**, c’est-à-dire
sans égalité possible : termine le tri par une colonne unique comme `id`.
:::

`OFFSET` a aussi un coût : pour sauter 10 000 lignes, PostgreSQL doit quand même les parcourir.
Pour des catalogues modestes, c’est sans importance.

## L’ordre d’évaluation d’une requête

On écrit `SELECT … FROM … WHERE … ORDER BY … LIMIT …`, mais PostgreSQL raisonne dans un autre
ordre :

1. `FROM` : quelle table lire ;
2. `WHERE` : quelles lignes garder ;
3. `SELECT` : quelles colonnes calculer ;
4. `ORDER BY` : dans quel ordre les présenter ;
5. `LIMIT` et `OFFSET` : combien en renvoyer.

Cela explique une erreur fréquente : un alias défini dans `SELECT` n’existe pas encore au moment
du `WHERE`.

```sql
SELECT title, round(price * 1.055, 2) AS price_with_tax FROM books WHERE price_with_tax > 30;
```

```text
ERROR:  column "price_with_tax" does not exist
LINE 1: ...ce * 1.055, 2) AS price_with_tax FROM books WHERE price_with...
                                                             ^
```

Dans le `WHERE`, il faut répéter l’expression. En revanche, `ORDER BY` vient après `SELECT` et
peut utiliser l’alias :

```sql
SELECT title, round(price * 1.055, 2) AS price_with_tax FROM books
WHERE price * 1.055 > 30
ORDER BY price_with_tax;
```

```text
           title            | price_with_tax
----------------------------+----------------
 Le Jardin des algorithmes  |          31.54
 Apprendre SQL              |          34.29
 Bases de données pour tous |          36.93
(3 rows)
```

Une requête peut s’étaler sur plusieurs lignes : seul le point-virgule la termine. Pour les
requêtes longues, une clause par ligne est bien plus lisible.

## Pièges et idées reçues

- **`WHERE genre = NULL`** ne renvoie jamais rien : utilise `IS NULL`.
- **`AND` et `OR` mélangés sans parenthèses** : le résultat semble plausible mais il est faux.
- **`LIKE '%de%'`** trouve aussi « rapi**de**s » : un motif n’est pas une recherche de mot.
- **Croire que `BETWEEN` exclut ses bornes** : il les inclut toutes les deux.
- **Paginer sans `ORDER BY`**, ou avec un tri qui laisse des égalités.
- **Utiliser un alias dans `WHERE`** : il n’existe pas encore à cette étape.
- **`SELECT *` dans une application** : liste plutôt les colonnes dont tu as besoin.

## Exercices

Recharge `books.sql` avant de commencer.

### Exercice 1 : les petits prix disponibles

Affiche le titre et le prix des livres **en stock** dont le prix est compris entre 10 € et 25 €
inclus, du moins cher au plus cher.

:::solution

```sql
SELECT title, price
FROM books
WHERE in_stock AND price BETWEEN 10 AND 25 -- bornes incluses
ORDER BY price;
```

```text
        title         | price
----------------------+-------
 Poèmes du matin      | 11.00
 Petits plats rapides | 15.00
 Nuit sur le port     | 18.50
 Mystère à Lyon       | 21.00
(4 rows)
```

« Le Dernier Phare » (9,90 €) est en dessous de la borne, « Carnet de voyage » (12 €) n’est pas
en stock, « La Cuisine du dimanche » (24 €) non plus. Ici il n’y a pas de mélange `AND`/`OR` :
`BETWEEN … AND …` forme un seul bloc et ne pose pas de problème de priorité.
:::

### Exercice 2 : la deuxième page du catalogue

Le site affiche le catalogue par **ordre alphabétique de titre**, trois livres par page. Écris la
requête de la page 2, en affichant `id` et `title`.

:::solution
Page 2 de taille 3 : `OFFSET (2 - 1) * 3`, soit 3.

```sql
SELECT id, title
FROM books
ORDER BY title, id -- id départage d’éventuels titres identiques
LIMIT 3 OFFSET 3;
```

```text
 id |           title
----+---------------------------
  3 | La Cuisine du dimanche
  5 | Le Dernier Phare
  1 | Le Jardin des algorithmes
(3 rows)
```

La page 1 contient « Apprendre SQL », « Bases de données pour tous » et « Carnet de voyage ».
Ajouter `id` au tri garantit un ordre total même si deux livres portent un jour le même titre.
:::

### Exercice 3 : les anciens et les inconnus

Affiche le titre et l’année de publication des livres publiés **avant 2020**, ainsi que ceux dont
l’année est **inconnue**. Les livres sans année doivent apparaître en premier, puis les autres
du plus ancien au plus récent.

:::solution

```sql
SELECT title, published_year
FROM books
WHERE published_year < 2020 OR published_year IS NULL
ORDER BY published_year NULLS FIRST, title;
```

```text
           title           | published_year
---------------------------+----------------
 Poèmes du matin           |
 Le Dernier Phare          |           2016
 La Cuisine du dimanche    |           2018
 Le Jardin des algorithmes |           2019
(4 rows)
```

Sans `OR published_year IS NULL`, « Poèmes du matin » disparaîtrait : `NULL < 2020` n’est pas
vrai. Sans `NULLS FIRST`, il serait affiché en dernier, puisque l’ordre croissant place les
`NULL` à la fin.
:::

## Récapitulatif

- `SELECT colonnes FROM table` lit des données ; `AS` nomme une colonne ; `DISTINCT` retire les
  doublons. `SELECT` ne modifie jamais la table.
- `WHERE` filtre avec `=`, `<>`, `<`, `<=`, `>`, `>=`, combinés par `AND`, `OR`, `NOT`. Des
  parenthèses dès que `AND` et `OR` se mélangent.
- `LIKE` cherche un motif (`%` : n’importe quelle suite, `_` : un caractère) en respectant la
  casse ; `ILIKE` (PostgreSQL) l’ignore.
- `IN (…)` teste l’appartenance à une liste ; `BETWEEN a AND b` inclut ses deux bornes.
- `NULL` se teste avec `IS NULL` ou `IS NOT NULL`, jamais avec `=`.
- `ORDER BY col [ASC|DESC] [NULLS FIRST|LAST]`, avec un critère de départage si besoin.
- `LIMIT n OFFSET (p - 1) * n` pagine, toujours avec un tri total.
- Ordre d’évaluation : `FROM`, `WHERE`, `SELECT`, `ORDER BY`, `LIMIT`.
