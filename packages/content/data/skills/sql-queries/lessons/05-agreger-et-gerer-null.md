---
title: Agréger, regrouper et gérer NULL
summary: Calculer des totaux et des moyennes avec COUNT, SUM, AVG, MIN et MAX, regrouper avec GROUP BY, filtrer des groupes avec HAVING et raisonner correctement avec NULL.
durationMinutes: 60
sources:
  - title: PostgreSQL — Fonctions d’agrégat
    url: https://www.postgresql.org/docs/current/functions-aggregate.html
  - title: PostgreSQL — Tutoriel, fonctions d’agrégat
    url: https://www.postgresql.org/docs/current/tutorial-agg.html
  - title: PostgreSQL — Opérateurs de comparaison et IS NULL
    url: https://www.postgresql.org/docs/current/functions-comparison.html
---

Jusqu’ici, chaque ligne du résultat correspondait à une ligne de la table. Mais beaucoup de
questions portent sur des **ensembles** : combien de livres au catalogue ? Quel est le prix moyen
d’un roman ? Quels auteurs ont écrit au moins deux livres ? Pour y répondre, SQL fournit des
**fonctions d’agrégat**, qui résument plusieurs lignes en une seule valeur, et la clause
`GROUP BY`, qui forme des groupes de lignes à résumer séparément.

Ces calculs croisent constamment une valeur particulière : `NULL`. La seconde moitié de la leçon
t’apprend à raisonner avec elle sans te faire piéger.

Recharge la table d’entraînement avant de commencer :

```bash
psql -h localhost -U postgres -d library -f books.sql
```

## Les fonctions d’agrégat

Les cinq fonctions essentielles :

| Fonction         | Résultat                                             |
| ---------------- | ---------------------------------------------------- |
| `count(*)`       | nombre de lignes                                     |
| `count(colonne)` | nombre de valeurs **non `NULL`** de la colonne       |
| `sum(colonne)`   | somme des valeurs                                    |
| `avg(colonne)`   | moyenne des valeurs                                  |
| `min`, `max`     | plus petite et plus grande valeur                    |

```sql
SELECT count(*) AS total_books FROM books;
```

```text
 total_books
-------------
          10
(1 row)
```

```sql
SELECT sum(price) AS stock_value, avg(price) AS average_price, min(price) AS cheapest, max(price) AS most_expensive
FROM books;
```

```text
 stock_value |    average_price    | cheapest | most_expensive
-------------+---------------------+----------+----------------
      208.80 | 20.8800000000000000 |     9.90 |          35.00
(1 row)
```

La moyenne d’un `numeric` est calculée avec beaucoup de décimales. Arrondis-la pour l’affichage :

```sql
SELECT round(avg(price), 2) AS average_price FROM books;
```

```text
 average_price
---------------
         20.88
(1 row)
```

`min` et `max` fonctionnent aussi sur les dates et le texte :

```sql
SELECT max(added_on) AS last_added, min(published_year) AS oldest FROM books;
```

```text
 last_added | oldest
------------+--------
 2024-06-10 |   2016
(1 row)
```

### Les agrégats ignorent NULL

Compare ces comptages :

```sql
SELECT count(*) AS rows_count, count(genre) AS with_genre, count(pages) AS with_pages, count(DISTINCT author) AS authors
FROM books;
```

```text
 rows_count | with_genre | with_pages | authors
------------+------------+------------+---------
         10 |          9 |          9 |       6
(1 row)
```

`count(*)` compte les lignes, `count(genre)` seulement celles où le genre est connu, et
`count(DISTINCT author)` le nombre d’auteurs différents. De même, `sum`, `avg`, `min` et `max`
**ignorent les `NULL`**. C’est généralement ce qu’on veut, mais il faut le savoir :

```sql
SELECT sum(pages) AS total_pages, count(*) AS n, round(avg(pages), 2) AS avg_pages FROM books;
```

```text
 total_pages | n  | avg_pages
-------------+----+-----------
        2199 | 10 |    244.33
(1 row)
```

La moyenne vaut 2199 / 9 et non 2199 / 10 : le livre dont le nombre de pages est inconnu n’est
pas compté comme un livre de 0 page. Si tu calcules toi-même `sum(pages) / count(*)`, tu fais
deux erreurs d’un coup :

```sql
SELECT avg(pages) AS avg_pages, sum(pages) / count(*) AS wrong_avg FROM books;
```

```text
      avg_pages       | wrong_avg
----------------------+-----------
 244.3333333333333333 |       219
(1 row)
```

Le dénominateur inclut la ligne sans pages, **et** la division de deux entiers est tronquée.
Utilise `avg`.

## Regrouper avec GROUP BY

Sans `GROUP BY`, un agrégat résume **toute** la table en une ligne. Avec `GROUP BY colonne`,
PostgreSQL forme un groupe par valeur distincte de la colonne, puis calcule les agrégats **pour
chaque groupe** :

```sql
SELECT genre, count(*) AS books_count FROM books GROUP BY genre ORDER BY genre;
```

```text
    genre     | books_count
--------------+-------------
 cuisine      |           2
 informatique |           3
 poésie       |           1
 roman        |           3
              |           1
(5 rows)
```

Les livres sans genre forment **un groupe à part**, affiché en dernier. On peut calculer
plusieurs agrégats par groupe et trier sur l’un d’eux :

```sql
SELECT genre, count(*) AS books_count, round(avg(price), 2) AS average_price
FROM books
GROUP BY genre
ORDER BY books_count DESC, genre;
```

```text
    genre     | books_count | average_price
--------------+-------------+---------------
 informatique |           3 |         32.47
 roman        |           3 |         16.47
 cuisine      |           2 |         19.50
 poésie       |           1 |         11.00
              |           1 |         12.00
(5 rows)
```

Une colonne `boolean` se regroupe aussi :

```sql
SELECT in_stock, count(*), sum(price) FROM books GROUP BY in_stock ORDER BY in_stock;
```

```text
 in_stock | count |  sum
----------+-------+--------
 f        |     3 |  68.50
 t        |     7 | 140.30
(2 rows)
```

### La règle d’or de GROUP BY

Après un regroupement, chaque ligne du résultat représente **un groupe**. Une colonne du
`SELECT` doit donc avoir une seule valeur par groupe : soit elle figure dans le `GROUP BY`, soit
elle est à l’intérieur d’un agrégat. Sinon :

```sql
SELECT genre, title, count(*) FROM books GROUP BY genre;
```

```text
ERROR:  column "books.title" must appear in the GROUP BY clause or be used in an aggregate function
LINE 1: SELECT genre, title, count(*) FROM books GROUP BY genre;
                      ^
```

Le groupe « informatique » contient trois titres : lequel afficher ? PostgreSQL refuse de choisir
au hasard. Demande-toi ce que tu veux vraiment : le nombre de titres (`count(title)`), le premier
par ordre alphabétique (`min(title)`), ou une ligne par livre (alors pas de `GROUP BY`).

## Filtrer des groupes avec HAVING

« Quels auteurs ont au moins deux livres au catalogue ? » Le filtre porte sur un **agrégat**,
calculé après le regroupement. `WHERE` ne peut pas l’exprimer :

```sql
SELECT genre, count(*) FROM books WHERE count(*) > 1 GROUP BY genre;
```

```text
ERROR:  aggregate functions are not allowed in WHERE
LINE 1: SELECT genre, count(*) FROM books WHERE count(*) > 1 GROUP B...
                                                ^
```

C’est le rôle de `HAVING`, qui filtre les **groupes** :

```sql
SELECT author, count(*) AS books_count
FROM books
GROUP BY author
HAVING count(*) >= 2
ORDER BY author;
```

```text
    author     | books_count
---------------+-------------
 Claire Martin |           2
 Emma Roux     |           2
 Hugo Bernard  |           2
 Lina Petit    |           2
(4 rows)
```

`WHERE` et `HAVING` se combinent. « Les auteurs ayant au moins deux livres **en stock** » :

```sql
SELECT author, count(*) AS books_count
FROM books
WHERE in_stock
GROUP BY author
HAVING count(*) >= 2
ORDER BY author;
```

```text
    author     | books_count
---------------+-------------
 Claire Martin |           2
 Emma Roux     |           2
 Hugo Bernard  |           2
(3 rows)
```

Lina Petit a disparu : `WHERE in_stock` a d’abord écarté « La Cuisine du dimanche », il ne lui
reste qu’un livre dans son groupe. L’ordre d’évaluation complet d’une requête devient :

1. `FROM` : la table ;
2. `WHERE` : filtre des **lignes** ;
3. `GROUP BY` : formation des groupes ;
4. `HAVING` : filtre des **groupes** ;
5. `SELECT` : calcul des colonnes ;
6. `ORDER BY`, puis `LIMIT` et `OFFSET`.

:::tip[WHERE ou HAVING ?]
Si la condition porte sur une colonne de la ligne (`in_stock`, `price`), mets-la dans `WHERE` :
les lignes sont écartées avant le regroupement, c’est plus clair et plus efficace. Réserve
`HAVING` aux conditions sur des agrégats (`count(*)`, `avg(price)`).
:::

Un dernier exemple qui combine tout : l’écart de prix dans chaque genre connu comptant plusieurs
livres, du plus grand au plus petit.

```sql
SELECT genre, max(price) - min(price) AS price_spread
FROM books
WHERE genre IS NOT NULL
GROUP BY genre
HAVING count(*) > 1
ORDER BY price_spread DESC;
```

```text
    genre     | price_spread
--------------+--------------
 roman        |        11.10
 cuisine      |         9.00
 informatique |         5.10
(3 rows)
```

## NULL : la valeur inconnue

`NULL` ne veut pas dire zéro, ni chaîne vide, ni faux : il veut dire « **on ne sait pas** ». Toute
la logique de SQL en découle. Pour mieux les voir, demande à `psql` d’afficher les `NULL` de
façon visible (c’est un réglage d’affichage de `psql`, il ne change pas les données) :

```text
library=# \pset null '(null)'
Null display is "(null)".
```

### Les calculs avec NULL donnent NULL

Si une valeur est inconnue, le résultat d’un calcul qui l’utilise l’est aussi :

```sql
SELECT NULL = NULL AS eq, NULL IS NULL AS is_null, 1 + NULL AS addition, 'abc' || NULL AS concat;
```

```text
   eq   | is_null | addition | concat
--------+---------+----------+--------
 (null) | t       |   (null) | (null)
(1 row)
```

Même `NULL = NULL` n’est pas vrai : deux valeurs inconnues ne sont pas forcément égales. Le
résultat est lui-même inconnu. SQL utilise donc une **logique à trois valeurs** : vrai, faux et
inconnu. Et `WHERE` ne garde que les lignes où la condition est **vraie**, jamais celles où elle
est inconnue. Seuls `IS NULL` et `IS NOT NULL` répondent toujours par vrai ou faux.

### Le piège du « différent de »

Combien de livres ne sont pas des romans ? Sur dix livres dont trois romans, on attend sept :

```sql
SELECT count(*) FROM books WHERE genre <> 'roman';
```

```text
 count
-------
     6
(1 row)
```

Pour le livre sans genre, `NULL <> 'roman'` est inconnu : il est écarté. Deux corrections
possibles :

```sql
SELECT count(*) FROM books WHERE genre <> 'roman' OR genre IS NULL;
```

```text
 count
-------
     7
(1 row)
```

```sql
SELECT count(*) FROM books WHERE genre IS DISTINCT FROM 'roman';
```

```text
 count
-------
     7
(1 row)
```

`IS DISTINCT FROM` est une comparaison qui traite `NULL` comme une valeur ordinaire : `NULL` est
distinct de `'roman'`, et `NULL IS DISTINCT FROM NULL` est faux.

### Le piège de NOT IN

`NOT IN` cache le même piège, en plus sournois. Si la liste contient un `NULL`, la condition
n’est **jamais** vraie :

```sql
SELECT title, published_year FROM books WHERE published_year NOT IN (2020, NULL);
```

```text
 title | published_year
-------+----------------
(0 rows)
```

Pour 2019, PostgreSQL évalue « 2019 différent de 2020 **et** 2019 différent de `NULL` » : vrai et
inconnu donne inconnu. Écrit à la main, ce cas paraît absurde ; il apparaît en pratique quand la
liste provient d’une autre requête (tu le verras avec les sous-requêtes, dans la compétence
suivante).

### Remplacer NULL avec coalesce

`coalesce(a, b, …)` renvoie le premier argument non `NULL`. Idéal pour afficher une valeur par
défaut :

```sql
SELECT title, coalesce(genre, 'non classé') AS genre FROM books WHERE id IN (6, 7, 8) ORDER BY id;
```

```text
        title         |   genre
----------------------+------------
 Petits plats rapides | cuisine
 Carnet de voyage     | non classé
 Mystère à Lyon       | roman
(3 rows)
```

### Un agrégat sur zéro ligne

Que vaut la somme des prix d’un genre absent du catalogue ?

```sql
SELECT sum(price) FROM books WHERE genre = 'jeunesse';
```

```text
  sum
--------
 (null)
(1 row)
```

```sql
SELECT count(*) FROM books WHERE genre = 'jeunesse';
```

```text
 count
-------
     0
(1 row)
```

Sur un ensemble vide, `count` renvoie 0 mais `sum`, `avg`, `min` et `max` renvoient `NULL`. Si
ton application attend un nombre, convertis explicitement :

```sql
SELECT coalesce(sum(price), 0) AS total FROM books WHERE genre = 'jeunesse';
```

```text
 total
-------
     0
(1 row)
```

:::warning[coalesce n’est pas toujours la bonne réponse]
Remplacer `NULL` par 0 **avant** un agrégat change le sens du calcul. `avg(coalesce(pages, 0))`
vaut 219,9 : le carnet de voyage est compté comme un livre de zéro page, ce qui est faux. Ne
remplace une valeur inconnue que si la valeur de remplacement est vraiment correcte dans ce
contexte.
:::

## Pièges et idées reçues

- **`count(colonne)` pour compter des lignes** : il ignore les `NULL`. Pour compter des lignes,
  utilise `count(*)`.
- **Une colonne non agrégée absente du `GROUP BY`** : erreur, et c’est une bonne chose.
- **Un agrégat dans `WHERE`** : interdit, utilise `HAVING`.
- **`HAVING` pour filtrer des lignes** : ça peut marcher, mais `WHERE` est plus clair.
- **`= NULL` ou `<> valeur` sur une colonne qui peut être `NULL`** : les lignes inconnues
  disparaissent sans bruit.
- **`NOT IN` avec un `NULL` dans la liste** : zéro ligne.
- **`sum` sur un ensemble vide** : `NULL`, pas 0.
- **Moyenne faite à la main** : `sum / count(*)` compte les `NULL` et tronque la division
  entière.

## Exercices

Recharge `books.sql` avant de commencer.

### Exercice 1 : les auteurs les plus chers

Pour chaque auteur, affiche son nombre de livres et le prix moyen de ses livres arrondi au
centime. Ne garde que les auteurs dont le prix moyen dépasse 20 €, du plus cher au moins cher.

:::solution
```sql
SELECT author,
       count(*) AS books_count,
       round(avg(price), 2) AS average_price
FROM books
GROUP BY author
HAVING avg(price) > 20          -- condition sur un agrégat : HAVING
ORDER BY average_price DESC;    -- l’alias est utilisable dans ORDER BY
```

```text
    author     | books_count | average_price
---------------+-------------+---------------
 Paul Garnier  |           1 |         32.50
 Claire Martin |           2 |         32.45
(2 rows)
```

Dans `HAVING`, on répète `avg(price)` : comme pour `WHERE`, l’alias défini dans le `SELECT`
n’existe pas encore à cette étape, et PostgreSQL répond `column "average_price" does not exist`. Hugo Bernard (moyenne 14,20 €), Emma Roux
(16 €) ou Lina Petit (19,50 €) sont sous le seuil.
:::

### Exercice 2 : les pages disponibles par genre

Pour les livres **en stock** seulement, affiche par genre le nombre total de pages et le nombre
de livres, du genre le plus volumineux au moins volumineux. Un genre absent doit s’afficher
« non classé ».

:::solution
```sql
SELECT coalesce(genre, 'non classé') AS genre,
       sum(pages) AS total_pages,
       count(*) AS books_count
FROM books
WHERE in_stock          -- filtre sur les lignes, avant le regroupement
GROUP BY genre
ORDER BY total_pages DESC;
```

```text
    genre     | total_pages | books_count
--------------+-------------+-------------
 roman        |         768 |           3
 informatique |         730 |           2
 cuisine      |         150 |           1
 poésie       |          96 |           1
(4 rows)
```

Aucune ligne « non classé » n’apparaît : le seul livre sans genre, « Carnet de voyage », n’est
pas en stock et a été écarté par `WHERE` avant le regroupement. La consigne prévoyait le cas ;
le `coalesce` servira dès qu’un tel livre sera disponible. « Apprendre SQL » et « La Cuisine du
dimanche », indisponibles, ne comptent pas non plus.
:::

### Exercice 3 : prévoir des comptages

Sans exécuter, prévois le résultat de ces deux requêtes, puis vérifie et explique chaque écart
avec ta prévision.

```sql
SELECT count(*) FROM books WHERE published_year <> 2020;
SELECT count(*), count(published_year), count(DISTINCT published_year) FROM books;
```

:::solution
```text
 count
-------
     7
(1 row)

 count | count | count
-------+-------+-------
    10 |     9 |     8
(1 row)
```

- Première requête : deux livres datent de 2020 et un n’a pas d’année. `NULL <> 2020` est
  inconnu, donc ce livre est écarté : 10 − 2 − 1 = 7, et non 8.
- `count(*)` : 10 lignes.
- `count(published_year)` : 9, car « Poèmes du matin » n’a pas d’année.
- `count(DISTINCT published_year)` : 8 années différentes parmi les 9 connues, puisque 2020
  apparaît deux fois ; `NULL` n’est pas compté comme une valeur distincte.
:::

## Récapitulatif

- `count(*)` compte les lignes ; `count(col)` les valeurs non `NULL` ; `count(DISTINCT col)` les
  valeurs différentes.
- `sum`, `avg`, `min`, `max` ignorent les `NULL` ; sur zéro ligne, ils renvoient `NULL`
  (`count` renvoie 0). `round(avg(x), 2)` pour l’affichage.
- `GROUP BY` produit une ligne par groupe ; toute colonne du `SELECT` est dans le `GROUP BY` ou
  dans un agrégat. `NULL` forme son propre groupe.
- `WHERE` filtre les lignes avant le regroupement, `HAVING` filtre les groupes après.
- Ordre d’évaluation : `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`.
- `NULL` signifie « inconnu » : tout calcul ou comparaison avec lui donne `NULL`. On le teste
  avec `IS NULL`, on compare en sûreté avec `IS DISTINCT FROM`, on le remplace avec `coalesce`
  quand c’est justifié.
- Méfie-toi de `<>` et de `NOT IN` sur des colonnes qui peuvent être `NULL`.
