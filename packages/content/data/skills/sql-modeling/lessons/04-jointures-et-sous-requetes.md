---
title: Jointures et sous-requêtes
summary: Croiser plusieurs tables avec INNER JOIN et LEFT JOIN, compter correctement à travers une jointure, et répondre à des questions en plusieurs étapes avec des sous-requêtes.
durationMinutes: 70
sources:
  - title: PostgreSQL — Tutoriel, jointures entre tables
    url: https://www.postgresql.org/docs/current/tutorial-join.html
  - title: PostgreSQL — La clause FROM et les jointures
    url: https://www.postgresql.org/docs/current/queries-table-expressions.html
  - title: PostgreSQL — Expressions de sous-requêtes (EXISTS, IN)
    url: https://www.postgresql.org/docs/current/functions-subquery.html
---

Un schéma normalisé range chaque information à un seul endroit. La contrepartie : pour afficher
« Bilal Mansour a emprunté Bases de données pour tous, à rendre le 22 octobre », il faut
rassembler des morceaux venus de trois tables (`members`, `loans`, `books`). C’est le rôle des
**jointures** : elles recollent les lignes de plusieurs tables en suivant les clés étrangères.

Cette leçon t’apprend les deux jointures dont tu auras besoin presque tout le temps, `INNER JOIN`
et `LEFT JOIN`, les pièges qui faussent les comptages, puis les **sous-requêtes**, des requêtes
imbriquées dans une autre.

Recharge le schéma complet avant de commencer :

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
```

## INNER JOIN : les lignes qui se correspondent

On veut le titre de chaque livre avec le **nom** de son genre. Le titre est dans `books`, le nom
dans `genres`, et le lien est `books.genre_id = genres.id` :

```sql
SELECT books.title, genres.name
FROM books
INNER JOIN genres ON books.genre_id = genres.id
ORDER BY books.title;
```

```text
           title            |     name
----------------------------+--------------
 Bases de données pour tous | informatique
 La Cuisine du dimanche     | cuisine
 Le Dernier Phare           | roman
 Le Jardin des algorithmes  | informatique
 Mystère à Lyon             | roman
 Nuit sur le port           | roman
 Poèmes du matin            | poésie
(7 rows)
```

Pour chaque livre, PostgreSQL cherche la ou les lignes de `genres` qui vérifient la condition
`ON`, et produit une ligne de résultat par correspondance. On écrit `table.colonne` pour lever
toute ambiguïté.

Il y a 8 livres mais seulement 7 lignes : « Carnet de voyage » n’a pas de genre (`genre_id` vaut
`NULL`), aucune ligne de `genres` ne lui correspond, il est **écarté**. C’est la règle d’une
jointure interne : seules les lignes qui ont un partenaire des deux côtés apparaissent. De même,
le genre « jeunesse », qui n’a aucun livre, n’apparaît pas. `JOIN` tout court signifie
`INNER JOIN`.

### Les alias de tables

Répéter `books.` et `genres.` alourdit vite les requêtes. On donne à chaque table un **alias**
court avec `AS` :

```sql
SELECT b.title, g.name AS genre
FROM books AS b
JOIN genres AS g ON b.genre_id = g.id;
```

Le résultat contient les mêmes 7 lignes que la requête précédente (dans un ordre non garanti,
faute d’`ORDER BY`), avec une seconde colonne nommée `genre`. Dès qu’une colonne existe dans les
deux tables, le préfixe est **obligatoire** :

```sql
SELECT id, title FROM books JOIN genres ON books.genre_id = genres.id;
```

```text
ERROR:  column reference "id" is ambiguous
LINE 1: SELECT id, title FROM books JOIN genres ON books.genre_id = ...
               ^
```

Prends l’habitude de préfixer **toutes** les colonnes dans une requête à plusieurs tables : la
requête reste lisible et ne cassera pas si une colonne du même nom est ajoutée plus tard.

### Le produit cartésien : la condition oubliée

Que se passe-t-il sans condition de jointure ? Chaque ligne de la première table est associée à
**chaque** ligne de la seconde :

```sql
SELECT count(*) FROM books CROSS JOIN genres;
```

```text
 count
-------
    40
(1 row)
```

8 livres × 5 genres = 40 lignes, presque toutes absurdes. L’ancienne syntaxe
`FROM books, genres` produit le même résultat si l’on oublie la condition dans le `WHERE`. Avec
des tables de 10 000 lignes, c’est 100 millions de lignes : une requête qui « ne répond plus »
cache souvent une condition de jointure oubliée. Préfère toujours la syntaxe `JOIN … ON`, qui
met la condition à côté de la table.

## Joindre plusieurs tables

Les jointures s’enchaînent. Pour lister les auteurs de chaque livre, on traverse la table
d’association :

```sql
SELECT b.title, a.name AS author
FROM books AS b
JOIN book_authors AS ba ON ba.book_id = b.id
JOIN authors AS a ON a.id = ba.author_id
ORDER BY b.title, a.name;
```

```text
           title            |    author
----------------------------+---------------
 Bases de données pour tous | Claire Martin
 Bases de données pour tous | Paul Garnier
 Carnet de voyage           | Sami Haddad
 La Cuisine du dimanche     | Lina Petit
 Le Dernier Phare           | Hugo Bernard
 Le Jardin des algorithmes  | Claire Martin
 Mystère à Lyon             | Emma Roux
 Nuit sur le port           | Hugo Bernard
 Poèmes du matin            | Emma Roux
(9 rows)
```

« Bases de données pour tous » apparaît deux fois : une jointure **multiplie** les lignes quand
il y a plusieurs correspondances. Pour obtenir une ligne par livre avec ses auteurs réunis, on
regroupe et on utilise `string_agg`, une fonction d’agrégat de PostgreSQL qui concatène des
textes avec un séparateur :

```sql
SELECT b.title, string_agg(a.name, ', ' ORDER BY a.name) AS authors
FROM books AS b
JOIN book_authors AS ba ON ba.book_id = b.id
JOIN authors AS a ON a.id = ba.author_id
GROUP BY b.id, b.title
ORDER BY b.title;
```

```text
           title            |           authors
----------------------------+-----------------------------
 Bases de données pour tous | Claire Martin, Paul Garnier
 Carnet de voyage           | Sami Haddad
 La Cuisine du dimanche     | Lina Petit
 Le Dernier Phare           | Hugo Bernard
 Le Jardin des algorithmes  | Claire Martin
 Mystère à Lyon             | Emma Roux
 Nuit sur le port           | Hugo Bernard
 Poèmes du matin            | Emma Roux
(8 rows)
```

On regroupe par `b.id` (et non seulement par le titre) : deux livres différents pourraient avoir
le même titre. Voilà l’affichage que l’ancienne colonne texte `author` donnait « gratuitement »,
mais cette fois chaque auteur n’est enregistré qu’une fois.

Les emprunts en cours, avec l’adhérent et le livre, traversent aussi trois tables :

```sql
SELECT m.name AS member, b.title, l.loaned_on, l.due_on
FROM loans AS l
JOIN members AS m ON m.id = l.member_id
JOIN books AS b ON b.id = l.book_id
WHERE l.returned_on IS NULL
ORDER BY l.due_on, m.name;
```

```text
    member     |           title            | loaned_on  |   due_on
---------------+----------------------------+------------+------------
 Bilal Mansour | Bases de données pour tous | 2024-10-01 | 2024-10-22
 Chloé Fabre   | Le Dernier Phare           | 2024-10-16 | 2024-11-06
 David Nguyen  | Bases de données pour tous | 2024-11-19 | 2024-12-10
(3 rows)
```

Le `WHERE` s’applique après les jointures, sur les lignes recollées : on peut y filtrer sur les
colonnes de n’importe quelle table jointe. Pour les retards au 20 novembre 2024, une
soustraction de dates donne le nombre de jours :

```sql
SELECT m.name AS member, b.title, l.due_on, DATE '2024-11-20' - l.due_on AS days_late
FROM loans AS l
JOIN members AS m ON m.id = l.member_id
JOIN books AS b ON b.id = l.book_id
WHERE l.returned_on IS NULL AND l.due_on < DATE '2024-11-20'
ORDER BY days_late DESC;
```

```text
    member     |           title            |   due_on   | days_late
---------------+----------------------------+------------+-----------
 Bilal Mansour | Bases de données pour tous | 2024-10-22 |        29
 Chloé Fabre   | Le Dernier Phare           | 2024-11-06 |        14
(2 rows)
```

`DATE '2024-11-20'` est une date littérale. Dans une application, on utiliserait `current_date`,
mais le résultat changerait chaque jour : la date fixe rend l’exemple reproductible.

## LEFT JOIN : garder toutes les lignes de gauche

« Tous les livres, avec leur genre **s’il existe** » : l’`INNER JOIN` perd « Carnet de voyage ».
`LEFT JOIN` (ou `LEFT OUTER JOIN`) garde **toutes** les lignes de la table de gauche, celle
écrite avant `LEFT JOIN`. Quand aucune ligne de droite ne correspond, les colonnes de droite
valent `NULL` :

```sql
SELECT b.title, g.name AS genre
FROM books AS b
LEFT JOIN genres AS g ON b.genre_id = g.id
ORDER BY b.title;
```

```text
           title            |    genre
----------------------------+--------------
 Bases de données pour tous | informatique
 Carnet de voyage           |
 La Cuisine du dimanche     | cuisine
 Le Dernier Phare           | roman
 Le Jardin des algorithmes  | informatique
 Mystère à Lyon             | roman
 Nuit sur le port           | roman
 Poèmes du matin            | poésie
(8 rows)
```

Les 8 livres sont là. Le genre vide du carnet est un `NULL` produit par la jointure.

### Trouver ce qui n’a pas de correspondance

Ce `NULL` est un outil précieux. Quels genres n’ont **aucun** livre ? On part des genres, on
joint à gauche les livres, et on garde les lignes où **rien** n’a été trouvé à droite :

```sql
SELECT g.name
FROM genres AS g
LEFT JOIN books AS b ON b.genre_id = g.id
WHERE b.id IS NULL;
```

```text
   name
----------
 jeunesse
(1 row)
```

On teste `b.id`, la clé primaire de la table de droite : elle n’est jamais `NULL` dans une vraie
ligne, donc un `NULL` signifie sans ambiguïté « pas de correspondance ».

### Compter à travers une jointure

Combien d’emprunts par adhérent, **y compris** ceux qui n’en ont aucun ? Le `LEFT JOIN` garde
Eva Rossi, qui n’a jamais emprunté. Mais attention à ce que l’on compte :

```sql
SELECT m.name, count(*) AS loans_count
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.id
GROUP BY m.id, m.name
ORDER BY m.name;
```

```text
     name      | loans_count
---------------+-------------
 Alice Durand  |           3
 Bilal Mansour |           1
 Chloé Fabre   |           2
 David Nguyen  |           2
 Eva Rossi     |           1
(5 rows)
```

Eva aurait un emprunt ? Non : `count(*)` compte les **lignes** du groupe, et le `LEFT JOIN` a
produit pour elle une ligne (avec des `NULL` à droite). Il faut compter une colonne de la table
de droite, que `count` ignore quand elle vaut `NULL` :

```sql
SELECT m.name, count(l.id) AS loans_count
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.id
GROUP BY m.id, m.name
ORDER BY m.name;
```

```text
     name      | loans_count
---------------+-------------
 Alice Durand  |           3
 Bilal Mansour |           1
 Chloé Fabre   |           2
 David Nguyen  |           2
 Eva Rossi     |           0
(5 rows)
```

### ON ou WHERE : le piège du LEFT JOIN

On veut chaque adhérent avec son emprunt **en cours**, ou rien s’il n’en a pas. Premier essai,
avec le filtre dans le `WHERE` :

```sql
SELECT m.name, b.title
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.id
LEFT JOIN books AS b ON b.id = l.book_id
WHERE l.returned_on IS NULL
ORDER BY m.name, b.title;
```

```text
     name      |           title
---------------+----------------------------
 Bilal Mansour | Bases de données pour tous
 Chloé Fabre   | Le Dernier Phare
 David Nguyen  | Bases de données pour tous
 Eva Rossi     |
(4 rows)
```

Alice a disparu ! Elle a trois emprunts, tous rendus : après la jointure, ses trois lignes ont un
`returned_on` renseigné, et le `WHERE` les élimine toutes. Eva reste, mais par hasard : sa ligne
sans emprunt a un `returned_on` `NULL`. Le `WHERE` s’applique **après** la jointure et annule
l’effet du `LEFT JOIN`.

La condition qui décrit **quelles lignes de droite joindre** doit aller dans le `ON` :

```sql
SELECT m.name, b.title
FROM members AS m
LEFT JOIN loans AS l ON l.member_id = m.id AND l.returned_on IS NULL
LEFT JOIN books AS b ON b.id = l.book_id
ORDER BY m.name, b.title;
```

```text
     name      |           title
---------------+----------------------------
 Alice Durand  |
 Bilal Mansour | Bases de données pour tous
 Chloé Fabre   | Le Dernier Phare
 David Nguyen  | Bases de données pour tous
 Eva Rossi     |
(5 rows)
```

Règle à retenir : avec un `LEFT JOIN`, une condition sur la table de **droite** va dans le `ON` ;
le `WHERE` sert à filtrer le résultat final (et un `WHERE … IS NULL` sur la clé de droite sert à
trouver les absents, comme plus haut).

## RIGHT JOIN et FULL JOIN

`RIGHT JOIN` est le miroir de `LEFT JOIN` : il garde toutes les lignes de la table de **droite**.
`genres RIGHT JOIN books` donne exactement le même résultat que `books LEFT JOIN genres` :

```sql
SELECT b.title, g.name AS genre
FROM genres AS g
RIGHT JOIN books AS b ON b.genre_id = g.id
ORDER BY b.title;
```

Le résultat est identique à celui du premier `LEFT JOIN` de cette leçon (8 lignes). En pratique,
on préfère presque toujours réécrire en `LEFT JOIN` : on lit la requête de gauche à droite, en
partant de la table dont on veut toutes les lignes, et mélanger les deux sens dans une même
requête la rend difficile à suivre.

`FULL JOIN` (ou `FULL OUTER JOIN`) garde les lignes **des deux côtés**, avec des `NULL` là où il
manque un partenaire :

```sql
SELECT b.title, g.name AS genre
FROM books AS b
FULL JOIN genres AS g ON b.genre_id = g.id
ORDER BY g.name, b.title;
```

```text
           title            |    genre
----------------------------+--------------
 La Cuisine du dimanche     | cuisine
 Bases de données pour tous | informatique
 Le Jardin des algorithmes  | informatique
                            | jeunesse
 Poèmes du matin            | poésie
 Le Dernier Phare           | roman
 Mystère à Lyon             | roman
 Nuit sur le port           | roman
 Carnet de voyage           |
(9 rows)
```

On y voit à la fois le genre sans livre et le livre sans genre. C’est utile pour comparer deux
listes et repérer les écarts, mais rare dans une application : la plupart des questions partent
d’une entité précise (« les livres », « les adhérents ») et appellent un `LEFT JOIN`.

## Les sous-requêtes

Une **sous-requête** est un `SELECT` entre parenthèses, utilisé à l’intérieur d’une autre
requête. Elle permet de répondre à une question en deux temps.

### Une valeur unique

Quels livres coûtent plus que le prix moyen ? Il faut d’abord calculer la moyenne, puis comparer :

```sql
SELECT title, price
FROM books
WHERE price > (SELECT avg(price) FROM books)
ORDER BY price DESC;
```

```text
           title            | price
----------------------------+-------
 Bases de données pour tous | 35.00
 Le Jardin des algorithmes  | 29.90
 La Cuisine du dimanche     | 24.00
 Mystère à Lyon             | 21.00
(4 rows)
```

La sous-requête renvoie une seule valeur (la moyenne vaut 20,1625) : on parle de sous-requête
**scalaire**. On ne peut pas écrire `WHERE price > avg(price)`, les agrégats étant interdits dans
le `WHERE`.

### Une liste avec IN

Quels adhérents ont emprunté au moins un roman ?

```sql
SELECT name
FROM members
WHERE id IN (
  SELECT l.member_id
  FROM loans AS l
  JOIN books AS b ON b.id = l.book_id
  JOIN genres AS g ON g.id = b.genre_id
  WHERE g.name = 'roman'
)
ORDER BY name;
```

```text
     name
--------------
 Alice Durand
 Chloé Fabre
(2 rows)
```

La même question avec une jointure directe renverrait **une ligne par emprunt de roman** :
Alice et Chloé y apparaissent chacune deux fois, et il faudrait ajouter `DISTINCT`. La
sous-requête exprime directement l’intention « les adhérents tels que… », sans doublon.

### Tester l’existence avec EXISTS

`EXISTS (sous-requête)` est vrai si la sous-requête renvoie au moins une ligne. On l’utilise
surtout sous sa forme négative. Quels livres n’ont jamais été empruntés ?

```sql
SELECT b.title
FROM books AS b
WHERE NOT EXISTS (
  SELECT 1 FROM loans AS l WHERE l.book_id = b.id
)
ORDER BY b.title;
```

```text
         title
------------------------
 Carnet de voyage
 La Cuisine du dimanche
 Poèmes du matin
(3 rows)
```

La sous-requête fait référence à `b.id`, une colonne de la requête extérieure : elle est dite
**corrélée**, et se lit « pour chaque livre `b`, existe-t-il un emprunt de ce livre ? ». Le
`SELECT 1` est une convention : seule l’existence d’une ligne compte, pas son contenu.

### Le piège de NOT IN, pour de vrai

Dans la compétence précédente, tu as vu que `NOT IN` ne renvoie rien si la liste contient un
`NULL`. Voici ce cas dans une situation réelle. Quels genres n’ont aucun livre ?

```sql
SELECT name FROM genres WHERE id NOT IN (SELECT genre_id FROM books);
```

```text
 name
------
(0 rows)
```

Zéro ligne, alors que « jeunesse » n’a aucun livre. La sous-requête renvoie les `genre_id` des
livres… dont le `NULL` de « Carnet de voyage ». Pour « jeunesse », PostgreSQL évalue « 5 n’est
égal à aucune valeur de la liste, et la liste contient une valeur inconnue » : le résultat est
inconnu, la ligne est écartée. `NOT EXISTS` n’a pas ce problème :

```sql
SELECT name FROM genres AS g
WHERE NOT EXISTS (SELECT 1 FROM books AS b WHERE b.genre_id = g.id);
```

```text
   name
----------
 jeunesse
(1 row)
```

Règle pratique : pour « ceux qui n’ont pas de… », utilise `NOT EXISTS` ou un `LEFT JOIN … WHERE
droite.id IS NULL`. Réserve `NOT IN` aux listes dont tu es certain qu’elles ne contiennent pas
de `NULL`.

### Une sous-requête dans le FROM

Une sous-requête peut aussi servir de table temporaire dans le `FROM`. Donne-lui un alias : il
permet de désigner ses colonnes (`stats.loans_count`). Depuis PostgreSQL 16, l’alias est devenu
facultatif, mais la plupart des autres SGBD et les versions plus anciennes l’exigent :

```sql
SELECT m.name, stats.loans_count
FROM members AS m
JOIN (
  SELECT member_id, count(*) AS loans_count
  FROM loans
  GROUP BY member_id
) AS stats ON stats.member_id = m.id
WHERE stats.loans_count >= 2
ORDER BY m.name;
```

```text
     name     | loans_count
--------------+-------------
 Alice Durand |           3
 Chloé Fabre  |           2
 David Nguyen |           2
(3 rows)
```

C’est une façon de découper un problème : d’abord un résultat intermédiaire (les comptes par
adhérent), ensuite son utilisation. Une jointure suivie d’un `GROUP BY … HAVING` donnerait ici
le même résultat ; choisis la forme que tu lis le plus facilement.

## Pièges et idées reçues

- **Oublier la condition de jointure** : produit cartésien, des lignes absurdes en masse.
- **Colonnes non préfixées** : erreur `ambiguous`, ou requête qui casse quand le schéma évolue.
- **`INNER JOIN` quand on veut « tous les… »** : les lignes sans partenaire disparaissent.
- **`count(*)` avec un `LEFT JOIN`** : compte 1 pour les lignes sans correspondance. Compte une
  colonne de droite.
- **Filtre sur la table de droite dans le `WHERE`** d’un `LEFT JOIN` : la jointure redevient
  interne. Mets-le dans le `ON`.
- **Doublons inattendus** : une jointure multiplie les lignes quand il y a plusieurs
  correspondances. Une sous-requête `IN` ou `EXISTS` l’évite.
- **`NOT IN (sous-requête)`** dont le résultat peut contenir `NULL` : zéro ligne.

## Exercices

Recharge `mediatheque.sql` avant de commencer.

### Exercice 1 : le nombre de livres par genre

Affiche chaque genre avec son nombre de livres, **y compris les genres sans livre**, du plus
fourni au moins fourni, puis par nom.

:::solution
```sql
SELECT g.name AS genre, count(b.id) AS books_count   -- count(b.id) : 0 pour un genre sans livre
FROM genres AS g
LEFT JOIN books AS b ON b.genre_id = g.id            -- on part des genres pour tous les garder
GROUP BY g.id, g.name
ORDER BY books_count DESC, g.name;
```

```text
    genre     | books_count
--------------+-------------
 roman        |           3
 informatique |           2
 cuisine      |           1
 poésie       |           1
 jeunesse     |           0
(5 rows)
```

Avec `count(*)`, « jeunesse » afficherait 1. Avec un `INNER JOIN`, il disparaîtrait. « Carnet de
voyage », sans genre, n’apparaît pas : on part des genres, pas des livres.
:::

### Exercice 2 : les retours en retard

Liste les emprunts **rendus après** leur date prévue : nom de l’adhérent, titre, date prévue,
date de retour et nombre de jours de retard.

:::solution
```sql
SELECT m.name AS member,
       b.title,
       l.due_on,
       l.returned_on,
       l.returned_on - l.due_on AS days_late
FROM loans AS l
JOIN members AS m ON m.id = l.member_id
JOIN books AS b ON b.id = l.book_id
WHERE l.returned_on > l.due_on      -- les emprunts non rendus (NULL) sont exclus d’office
ORDER BY days_late DESC;
```

```text
    member    |      title       |   due_on   | returned_on | days_late
--------------+------------------+------------+-------------+-----------
 Alice Durand | Nuit sur le port | 2024-10-11 | 2024-10-15  |         4
(1 row)
```

Ici, des `INNER JOIN` suffisent : chaque emprunt a forcément un adhérent et un livre, grâce aux
clés étrangères `NOT NULL`. Les emprunts non rendus ne sont pas comptés : `NULL > due_on` est
inconnu.
:::

### Exercice 3 : les auteurs jamais lus

Quels auteurs n’ont **aucun** livre emprunté (y compris ceux qui n’ont aucun livre au
catalogue) ? Écris deux versions : avec `NOT EXISTS`, puis avec des `LEFT JOIN`.

:::solution
Version `NOT EXISTS` : « il n’existe aucun emprunt d’un livre de cet auteur ».

```sql
SELECT a.name
FROM authors AS a
WHERE NOT EXISTS (
  SELECT 1
  FROM book_authors AS ba
  JOIN loans AS l ON l.book_id = ba.book_id
  WHERE ba.author_id = a.id          -- corrélée à l’auteur courant
)
ORDER BY a.name;
```

Version `LEFT JOIN` : on garde tous les auteurs, puis les groupes sans aucun emprunt.

```sql
SELECT a.name
FROM authors AS a
LEFT JOIN book_authors AS ba ON ba.author_id = a.id
LEFT JOIN loans AS l ON l.book_id = ba.book_id
GROUP BY a.id, a.name
HAVING count(l.id) = 0
ORDER BY a.name;
```

Les deux renvoient :

```text
     name
--------------
 Lina Petit
 Nora Lefèvre
 Sami Haddad
(3 rows)
```

Nora Lefèvre n’a aucun livre, Lina Petit et Sami Haddad ont des livres jamais empruntés. Emma
Roux n’y est pas : « Poèmes du matin » n’a jamais été emprunté, mais « Mystère à Lyon » l’a été.
:::

## Récapitulatif

- `JOIN … ON condition` (ou `INNER JOIN`) recolle les lignes qui se correspondent ; les lignes
  sans partenaire disparaissent.
- Alias de tables (`books AS b`) et colonnes toujours préfixées dans une requête multi-tables.
- Sans condition de jointure : produit cartésien.
- Une jointure multiplie les lignes en cas de correspondances multiples ; `GROUP BY` et
  `string_agg` (PostgreSQL) les regroupent.
- `LEFT JOIN` garde toutes les lignes de gauche, avec `NULL` à droite si rien ne correspond.
  `WHERE droite.id IS NULL` trouve les absents ; `count(droite.id)` compte correctement.
- Avec un `LEFT JOIN`, les conditions sur la table de droite vont dans le `ON`.
- `RIGHT JOIN` se réécrit en `LEFT JOIN` ; `FULL JOIN` sert surtout à comparer deux listes.
- Sous-requêtes : scalaire (`> (SELECT avg…)`), liste (`IN`), existence (`EXISTS`,
  `NOT EXISTS`), table dérivée dans le `FROM` (avec un alias, recommandé).
- `NOT IN` sur une sous-requête qui peut renvoyer `NULL` donne zéro ligne : préfère `NOT EXISTS`.
