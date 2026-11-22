---
title: Transactions et index
summary: Regrouper plusieurs écritures en une opération tout-ou-rien avec BEGIN, COMMIT et ROLLBACK, puis accélérer les lectures avec des index choisis à bon escient et vérifiés avec EXPLAIN.
durationMinutes: 65
sources:
  - title: PostgreSQL — Tutoriel, transactions
    url: https://www.postgresql.org/docs/current/tutorial-transactions.html
  - title: PostgreSQL — Index
    url: https://www.postgresql.org/docs/current/indexes.html
  - title: PostgreSQL — Utiliser EXPLAIN
    url: https://www.postgresql.org/docs/current/using-explain.html
  - title: PostgreSQL — Isolation des transactions
    url: https://www.postgresql.org/docs/current/transaction-iso.html
---

Deux questions se posent dès qu’une base sert une vraie application. La première : que se
passe-t-il si une opération en plusieurs étapes échoue au milieu ? Ajouter un livre **et** ses
auteurs, enregistrer un retour **et** le prêt suivant : si la seconde étape échoue, la base reste
dans un état à moitié fait. La seconde : comment garder des lectures rapides quand une table
passe de dix lignes à des millions ?

Les **transactions** répondent à la première, les **index** à la seconde. Cette leçon te montre
comment et quand les utiliser, et surtout comment vérifier qu’ils font ce que tu crois.

Recharge le schéma avant de commencer :

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
```

## Le problème : une opération à moitié faite

La médiathèque ajoute un livre écrit par Nora Lefèvre (auteure 7) et un second auteur. La
personne qui saisit se trompe sur le numéro du second auteur (42 au lieu de 1) :

```sql
INSERT INTO books (title, isbn, genre_id, published_year, price)
VALUES ('Données et vie privée', '978-2-0000-0009-9', 2, 2025, 26.00) RETURNING id;
INSERT INTO book_authors (book_id, author_id) VALUES (9, 7), (9, 42);
```

```text
 id
----
  9
(1 row)

INSERT 0 1
ERROR:  insert or update on table "book_authors" violates foreign key constraint "book_authors_author_id_fkey"
DETAIL:  Key (author_id)=(42) is not present in table "authors".
```

La seconde instruction a échoué en entier (une instruction est toujours tout ou rien), mais la
première avait déjà été validée. Résultat :

```sql
SELECT b.id, b.title, count(ba.author_id) AS authors_count
FROM books AS b
LEFT JOIN book_authors AS ba ON ba.book_id = b.id
WHERE b.id = 9
GROUP BY b.id, b.title;
```

```text
 id |         title         | authors_count
----+-----------------------+---------------
  9 | Données et vie privée |             0
(1 row)
```

Un livre sans auteur est désormais au catalogue. Personne ne l’a voulu : c’est la trace d’une
opération interrompue. Supprime-le avant de continuer :

```sql
DELETE FROM books WHERE id = 9;
```

```text
DELETE 1
```

## BEGIN, COMMIT, ROLLBACK

Une **transaction** regroupe plusieurs instructions en une seule unité : soit **toutes** sont
appliquées, soit **aucune**. On l’ouvre avec `BEGIN`, on la valide avec `COMMIT`, on l’annule
avec `ROLLBACK`. Rejouons l’erreur, dans une transaction cette fois :

```sql
BEGIN;
INSERT INTO books (title, isbn, genre_id, published_year, price)
VALUES ('Données et vie privée', '978-2-0000-0009-9', 2, 2025, 26.00) RETURNING id;
INSERT INTO book_authors (book_id, author_id) VALUES (10, 7), (10, 42);
```

```text
BEGIN
 id
----
 10
(1 row)

INSERT 0 1
ERROR:  insert or update on table "book_authors" violates foreign key constraint "book_authors_author_id_fkey"
DETAIL:  Key (author_id)=(42) is not present in table "authors".
```

Le livre a reçu l’`id` 10 (le 9 a été consommé par l’essai précédent). Après une erreur, la
transaction est **interrompue** : PostgreSQL refuse toute autre instruction jusqu’à sa fin.

```sql
INSERT INTO book_authors (book_id, author_id) VALUES (10, 7);
```

```text
ERROR:  current transaction is aborted, commands ignored until end of transaction block
```

Il ne reste qu’à annuler :

```sql
ROLLBACK;
SELECT count(*) FROM books WHERE isbn = '978-2-0000-0009-9';
```

```text
ROLLBACK
 count
-------
     0
(1 row)
```

Le livre inséré au début de la transaction a disparu : l’opération n’a laissé **aucune trace**.
Avec les bonnes valeurs, on recommence et on valide :

```sql
BEGIN;
INSERT INTO books (title, isbn, genre_id, published_year, price)
VALUES ('Données et vie privée', '978-2-0000-0009-9', 2, 2025, 26.00) RETURNING id;
INSERT INTO book_authors (book_id, author_id) VALUES (11, 7), (11, 1);
COMMIT;
```

```text
BEGIN
 id
----
 11
(1 row)

INSERT 0 1
INSERT 0 2
COMMIT
```

Les identifiants 9 et 10 sont perdus, ce qui est normal : une séquence ne revient jamais en
arrière, même après un `ROLLBACK`.

:::warning[COMMIT après une erreur]
Si tu tapes `COMMIT` dans une transaction interrompue par une erreur, `psql` affiche
`ROLLBACK` : PostgreSQL annule au lieu de valider. Lis toujours la réponse à ton `COMMIT`. Dans
une application, c’est le code qui doit détecter l’erreur et envoyer `ROLLBACK` lui-même : tu le
feras dans la compétence sur Node.js.
:::

### Les quatre garanties

On résume les garanties d’une transaction par l’acronyme **ACID** :

- **Atomicité** : tout ou rien, comme on vient de le voir ;
- **Cohérence** : une transaction validée respecte toutes les contraintes du schéma ;
- **Isolation** : les transactions simultanées ne voient pas les modifications non validées des
  autres ;
- **Durabilité** : une fois `COMMIT` confirmé, les données survivent à un arrêt brutal du serveur.

Sans `BEGIN`, chaque instruction forme sa propre petite transaction, validée immédiatement :
c’est le mode _autocommit_ de `psql` et du client Node.js.

## L’isolation en pratique

Ouvre **deux terminaux** connectés à `mediatheque`, A et B. Dans A, modifie un prix sans valider :

```sql
-- Terminal A
BEGIN;
UPDATE books SET price = 19.90 WHERE id = 2;
SELECT price FROM books WHERE id = 2;
```

```text
BEGIN
UPDATE 1
 price
-------
 19.90
(1 row)
```

Dans B, lis le même livre :

```sql
-- Terminal B
SELECT price FROM books WHERE id = 2;
```

```text
 price
-------
 18.50
(1 row)
```

B voit encore l’ancien prix : la modification de A n’est pas validée. Dans B, essaie maintenant de
modifier la même ligne :

```sql
-- Terminal B
UPDATE books SET price = 21.00 WHERE id = 2;
```

La commande **attend** : A détient un **verrou** sur cette ligne jusqu’à la fin de sa transaction.
Tape `COMMIT;` dans A : l’`UPDATE` de B s’exécute aussitôt et affiche `UPDATE 1`, et le prix final
est 21,00. Une longue transaction laissée ouverte bloque donc les autres : une transaction doit
être **courte**, et ne jamais attendre une action humaine entre `BEGIN` et `COMMIT`.

Ce comportement correspond au niveau d’isolation par défaut de PostgreSQL, appelé _Read
Committed_ : chaque instruction voit les données validées au moment où elle démarre. D’autres
niveaux, plus stricts, existent ; ils dépassent le cadre de ce cours.

:::note[Vérifier une règle avant d’écrire]
« Un adhérent ne peut pas avoir plus de trois emprunts en cours » ne s’exprime pas avec `CHECK`.
On la vérifie par un `SELECT count(*)` puis on insère, dans la même transaction. Mais deux
transactions simultanées pourraient compter toutes les deux « deux emprunts » et insérer chacune
le troisième. Une technique courante consiste à commencer la transaction par
`SELECT … FROM members WHERE id = … FOR UPDATE`, qui verrouille la ligne de l’adhérent : une
seconde transaction qui fait la même chose attend que la première se termine.
:::

## Les index : retrouver vite

Sur dix lignes, PostgreSQL lit toute la table en un instant. Sur des millions, lire chaque ligne
pour en trouver une poignée devient coûteux. Un **index** est une structure annexe, triée, qui
permet d’aller directement aux lignes qui correspondent à une valeur, comme l’index alphabétique
à la fin d’un livre. Le type par défaut de PostgreSQL est le **B-tree** (arbre équilibré), adapté
aux égalités, aux comparaisons (`<`, `>=`, `BETWEEN`) et aux tris.

Pour le constater, il faut une table volumineuse. La fonction `generate_series` de PostgreSQL
produit une suite de nombres, ce qui permet de fabriquer 500 000 emprunts d’archive en une
instruction :

```sql
CREATE TABLE loan_archive (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id integer NOT NULL,
  book_id integer NOT NULL,
  loaned_on date NOT NULL,
  returned boolean NOT NULL
);

INSERT INTO loan_archive (member_id, book_id, loaned_on, returned)
SELECT i % 5000 + 1, i % 800 + 1, DATE '2020-01-01' + i % 1800, i % 50 <> 0
FROM generate_series(1, 500000) AS i;

ANALYZE loan_archive;
```

```text
CREATE TABLE
INSERT 0 500000
ANALYZE
```

Chaque adhérent (5 000 au total) a 100 emprunts ; un emprunt sur cinquante n’est pas rendu.
`ANALYZE` met à jour les **statistiques** que PostgreSQL utilise pour choisir sa façon d’exécuter
les requêtes (il le fait aussi automatiquement, de temps en temps).

### EXPLAIN : voir le plan

`EXPLAIN` devant une requête affiche le **plan d’exécution** choisi, sans exécuter la requête :

```sql
EXPLAIN SELECT * FROM loan_archive WHERE member_id = 42;
```

```text
                                   QUERY PLAN
--------------------------------------------------------------------------------
 Gather  (cost=1000.00..6799.17 rows=100 width=17)
   Workers Planned: 2
   ->  Parallel Seq Scan on loan_archive  (cost=0.00..5789.17 rows=42 width=17)
         Filter: (member_id = 42)
(4 rows)
```

L’essentiel est sur la ligne `Seq Scan` : un **parcours séquentiel**, c’est-à-dire la lecture de
toute la table, ligne par ligne, en gardant celles qui passent le `Filter`. Ici PostgreSQL répartit
même ce travail entre plusieurs processus (`Parallel`, `Workers Planned: 2`). `cost` est une
estimation en unités arbitraires, et `rows` le nombre de lignes estimé.

:::note[Tes chiffres seront différents]
Les coûts, les estimations de lignes et même la forme exacte du plan dépendent de la version de
PostgreSQL, de sa configuration, de la machine et des statistiques (calculées sur un
échantillon). Ne cherche pas à retrouver les mêmes nombres : regarde le **type de parcours**
(`Seq Scan`, `Index Scan`…) et l’ordre de grandeur des coûts.
:::

Créons un index sur `member_id` :

```sql
CREATE INDEX loan_archive_member_id_idx ON loan_archive (member_id);
EXPLAIN SELECT * FROM loan_archive WHERE member_id = 42;
```

```text
CREATE INDEX
                                        QUERY PLAN
-------------------------------------------------------------------------------------------
 Bitmap Heap Scan on loan_archive  (cost=5.20..350.09 rows=100 width=17)
   Recheck Cond: (member_id = 42)
   ->  Bitmap Index Scan on loan_archive_member_id_idx  (cost=0.00..5.17 rows=100 width=0)
         Index Cond: (member_id = 42)
(4 rows)
```

PostgreSQL utilise maintenant l’index (`Bitmap Index Scan on loan_archive_member_id_idx`) pour
repérer les 100 lignes, puis va les lire dans la table (`Bitmap Heap Scan`). Le coût estimé est
passé d’environ 6 800 à 350. `\timing on` dans `psql` affiche la durée réelle de chaque requête :
sur la machine de test, un `count(*)` sur cet adhérent est passé d’environ 20 ms à moins d’une
milliseconde. Tes durées seront différentes, mais l’écart sera du même ordre.

`EXPLAIN ANALYZE` va plus loin : il **exécute** la requête et ajoute les nombres réels (lignes,
temps) à côté des estimations. Attention, il exécute vraiment : devant un `DELETE`, il supprime.

### Les index que tu as déjà

Tu as créé des index sans le savoir : chaque `PRIMARY KEY` et chaque `UNIQUE` en crée un.

```sql
EXPLAIN SELECT * FROM loan_archive WHERE id = 1234;
```

```text
                                      QUERY PLAN
---------------------------------------------------------------------------------------
 Index Scan using loan_archive_pkey on loan_archive  (cost=0.42..8.44 rows=1 width=17)
   Index Cond: (id = 1234)
(2 rows)
```

En revanche, PostgreSQL ne crée **pas** d’index pour une clé étrangère. Or les colonnes de clé
étrangère (`loans.member_id`, `loans.book_id`) servent constamment dans les jointures et les
filtres (« les emprunts de cet adhérent »). Sur une table qui grossit, les indexer est souvent le
premier index utile à créer. `\di` liste les index de la base.

### Quand un index ne sert pas

Un index n’est utile que s’il permet d’éviter de lire une grande partie de la table. Quand la
condition garde presque toutes les lignes, lire la table entière est plus rapide :

```sql
EXPLAIN SELECT * FROM loan_archive WHERE member_id > 10;
```

```text
                             QUERY PLAN
---------------------------------------------------------------------
 Seq Scan on loan_archive  (cost=0.00..9435.00 rows=499025 width=17)
   Filter: (member_id > 10)
(2 rows)
```

L’index existe, mais PostgreSQL l’ignore : la condition est **peu sélective**. Même phénomène
avec un booléen. Un index sur `returned` sert pour la valeur rare, pas pour la valeur courante :

```sql
CREATE INDEX loan_archive_returned_idx ON loan_archive (returned);
EXPLAIN SELECT * FROM loan_archive WHERE returned;
EXPLAIN SELECT * FROM loan_archive WHERE NOT returned;
```

```text
CREATE INDEX
                             QUERY PLAN
---------------------------------------------------------------------
 Seq Scan on loan_archive  (cost=0.00..8185.00 rows=489800 width=17)
   Filter: returned
(2 rows)

                                              QUERY PLAN
------------------------------------------------------------------------------------------------------
 Index Scan using loan_archive_returned_idx on loan_archive  (cost=0.42..1318.83 rows=10200 width=17)
   Index Cond: (returned = false)
(2 rows)
```

Autre cas fréquent : une fonction appliquée à la colonne empêche d’utiliser un index sur cette
colonne. Avec un index sur `loaned_on`, comparons deux façons de demander « les emprunts de
décembre 2024 » :

```sql
CREATE INDEX loan_archive_loaned_on_idx ON loan_archive (loaned_on);
EXPLAIN SELECT count(*) FROM loan_archive
WHERE extract(year FROM loaned_on) = 2024 AND extract(month FROM loaned_on) = 12;
```

```text
CREATE INDEX
                                                             QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------------
 Finalize Aggregate  (cost=8351.89..8351.90 rows=1 width=8)
   ->  Gather  (cost=8351.68..8351.89 rows=2 width=8)
         Workers Planned: 2
         ->  Partial Aggregate  (cost=7351.68..7351.69 rows=1 width=8)
               ->  Parallel Seq Scan on loan_archive  (cost=0.00..7351.67 rows=5 width=0)
                     Filter: ((EXTRACT(year FROM loaned_on) = '2024'::numeric) AND (EXTRACT(month FROM loaned_on) = '12'::numeric))
(6 rows)
```

```sql
EXPLAIN SELECT count(*) FROM loan_archive
WHERE loaned_on >= '2024-12-01' AND loaned_on < '2025-01-01';
```

```text
                                             QUERY PLAN
----------------------------------------------------------------------------------------------------
 Aggregate  (cost=2261.42..2261.43 rows=1 width=8)
   ->  Bitmap Heap Scan on loan_archive  (cost=15.71..2258.67 rows=1101 width=0)
         Recheck Cond: ((loaned_on >= '2024-12-01'::date) AND (loaned_on < '2025-01-01'::date))
         ->  Bitmap Index Scan on loan_archive_loaned_on_idx  (cost=0.00..15.43 rows=1101 width=0)
               Index Cond: ((loaned_on >= '2024-12-01'::date) AND (loaned_on < '2025-01-01'::date))
(5 rows)
```

L’index est trié par `loaned_on`, pas par `extract(month FROM loaned_on)`. Écrire la condition
sous forme d’intervalle sur la colonne brute permet de l’utiliser : le coût estimé passe
d’environ 8 350 à 2 260. Si tu relances ce `EXPLAIN` plus tard, tu verras peut-être un
`Index Only Scan` : une fois la table nettoyée par `VACUUM` (que PostgreSQL lance aussi
automatiquement), l’index suffit à répondre sans lire la table. Pour la même raison que
`extract`, `LIKE '%mot%'` ne profite pas d’un index B-tree ordinaire : il n’y a pas de début de
chaîne connu pour s’y repérer.

Un index B-tree sert aussi aux tris avec `LIMIT` : `ORDER BY loaned_on DESC LIMIT 10` peut lire
les dix dernières entrées de l’index au lieu de trier 500 000 lignes. Fais l’essai avec
`EXPLAIN` : tu devrais voir `Index Scan Backward using loan_archive_loaned_on_idx`.

### Le coût des index

Un index n’est pas gratuit :

- il occupe de la place sur le disque ;
- **chaque** `INSERT`, `UPDATE` ou `DELETE` doit aussi mettre à jour chaque index concerné : plus
  une table a d’index, plus ses écritures sont lentes ;
- un index inutilisé ne coûte que ces inconvénients.

D’où la règle : on crée un index pour **une requête fréquente et lente, vérifiée avec
`EXPLAIN`**, pas « au cas où ». Sur une table de quelques centaines de lignes, PostgreSQL lira
souvent la table entière même si un index existe, et il a raison.

Nettoie la table d’essai, ce qui supprime aussi ses index :

```sql
DROP TABLE loan_archive;
```

## Pièges et idées reçues

- **Plusieurs écritures liées sans transaction** : une erreur au milieu laisse des données
  incohérentes.
- **Continuer après une erreur dans une transaction** : tout est refusé jusqu’au `ROLLBACK`, et
  un `COMMIT` devient un `ROLLBACK`.
- **Une transaction ouverte trop longtemps** : elle garde ses verrous et bloque les autres.
- **« Un `ROLLBACK` remet les compteurs à zéro »** : non, les numéros de séquence consommés sont
  perdus.
- **« Plus d’index, c’est plus rapide »** : les lectures concernées peut-être, les écritures
  sûrement pas.
- **Supposer qu’un index est utilisé** sans regarder `EXPLAIN`.
- **Envelopper la colonne indexée dans une fonction** dans le `WHERE` : l’index B-tree
  ordinaire n’est plus utilisable.
- **Oublier d’indexer les clés étrangères** des grosses tables : PostgreSQL ne le fait pas pour
  toi.

## Exercices

Recharge `mediatheque.sql` avant l’exercice 1.

### Exercice 1 : un retour et un nouveau prêt

Chloé Fabre rapporte « Le Dernier Phare » (emprunt 5) le 21 novembre 2024, et Eva Rossi
(adhérente 5) l’emprunte aussitôt pour trois semaines. Ces deux écritures doivent réussir ou
échouer ensemble.

1. Écris la transaction, mais commets volontairement une erreur dans le prêt d’Eva (une date de
   retour prévue **avant** la date de prêt) et termine par `COMMIT`. Que se passe-t-il ? Le
   retour de Chloé est-il enregistré ?
2. Corrige et rejoue la transaction, puis affiche l’historique des emprunts de ce livre.

:::solution
Première tentative :

```sql
BEGIN;
UPDATE loans SET returned_on = '2024-11-21'
WHERE id = 5 AND returned_on IS NULL      -- ne « rend » pas deux fois le même emprunt
RETURNING id, book_id, returned_on;
INSERT INTO loans (book_id, member_id, loaned_on, due_on)
VALUES (5, 5, '2024-11-21', '2024-11-14') RETURNING id;   -- erreur volontaire sur due_on
COMMIT;
SELECT id, returned_on FROM loans WHERE id = 5;
```

```text
BEGIN
 id | book_id | returned_on
----+---------+-------------
  5 |       5 | 2024-11-21
(1 row)

UPDATE 1
ERROR:  new row for relation "loans" violates check constraint "loans_due_after_loan"
DETAIL:  Failing row contains (9, 5, 5, 2024-11-21, 2024-11-14, null).
ROLLBACK
 id | returned_on
----+-------------
  5 |
(1 row)
```

Le `COMMIT` a répondu `ROLLBACK` : la transaction était interrompue. Le retour de Chloé, pourtant
réussi à l’intérieur de la transaction, a été annulé avec le reste. C’est exactement ce qu’on
veut : pas de demi-opération.

Seconde tentative, avec une date de retour prévue trois semaines plus tard :

```sql
BEGIN;
UPDATE loans SET returned_on = '2024-11-21'
WHERE id = 5 AND returned_on IS NULL
RETURNING id, book_id, returned_on;
INSERT INTO loans (book_id, member_id, loaned_on, due_on)
VALUES (5, 5, '2024-11-21', '2024-12-12') RETURNING id;
COMMIT;

SELECT l.id, m.name, l.loaned_on, l.returned_on
FROM loans AS l
JOIN members AS m ON m.id = l.member_id
WHERE l.book_id = 5
ORDER BY l.id;
```

```text
BEGIN
 id | book_id | returned_on
----+---------+-------------
  5 |       5 | 2024-11-21
(1 row)

UPDATE 1
 id
----
 10
(1 row)

INSERT 0 1
COMMIT
 id |    name     | loaned_on  | returned_on
----+-------------+------------+-------------
  5 | Chloé Fabre | 2024-10-16 | 2024-11-21
 10 | Eva Rossi   | 2024-11-21 |
(2 rows)
```

Le nouvel emprunt a l’`id` 10 : le 9 a été consommé par l’insertion refusée. La condition
`returned_on IS NULL` dans l’`UPDATE` est une précaution : si le retour avait déjà été saisi,
on verrait `UPDATE 0` et on saurait qu’il faut annuler.
:::

### Exercice 2 : quel index pour quelle requête ?

Recrée la table `loan_archive` avec ses 500 000 lignes (sans aucun index autre que la clé
primaire), puis, pour chaque requête, prévois si un index sur la colonne filtrée sera utilisé.
Vérifie avec `CREATE INDEX` et `EXPLAIN`.

1. `SELECT * FROM loan_archive WHERE book_id = 17;`
2. `SELECT * FROM loan_archive WHERE loaned_on >= '2024-12-01';`
3. `SELECT * FROM loan_archive WHERE loaned_on >= '2021-01-01';`

:::solution
1. **Oui.** 800 livres différents : `book_id = 17` garde environ 625 lignes sur 500 000. Après
   `CREATE INDEX loan_archive_book_id_idx ON loan_archive (book_id);`, le plan passe d’un
   `Parallel Seq Scan` à :

   ```text
    Bitmap Heap Scan on loan_archive  (cost=9.25..1569.44 rows=623 width=17)
      Recheck Cond: (book_id = 17)
      ->  Bitmap Index Scan on loan_archive_book_id_idx  (cost=0.00..9.09 rows=623 width=0)
            Index Cond: (book_id = 17)
   ```

2. **Oui.** Les dates vont du 1er janvier 2020 au 4 décembre 2024 : cette condition garde
   1 108 lignes. Avec `CREATE INDEX loan_archive_loaned_on_idx ON loan_archive (loaned_on);` :

   ```text
    Bitmap Heap Scan on loan_archive  (cost=12.96..2253.16 rows=1101 width=17)
      Recheck Cond: (loaned_on >= '2024-12-01'::date)
      ->  Bitmap Index Scan on loan_archive_loaned_on_idx  (cost=0.00..12.68 rows=1101 width=0)
            Index Cond: (loaned_on >= '2024-12-01'::date)
   ```

3. **Non.** Environ quatre cinquièmes de la table sont postérieurs au 1er janvier 2021 : lire
   toute la table est moins coûteux que de passer par l’index pour la plupart des lignes.

   ```text
    Seq Scan on loan_archive  (cost=0.00..9435.00 rows=397516 width=17)
      Filter: (loaned_on >= '2021-01-01'::date)
   ```

Le même index est utilisé ou non selon la **sélectivité** de la condition. Tes coûts et
estimations différeront légèrement ; le type de parcours devrait être le même.
:::

### Exercice 3 : diagnostiquer un problème de verrou

Une collègue raconte : « J’ai ouvert `psql`, tapé `BEGIN;` puis un `UPDATE` sur un livre, et je
suis partie déjeuner. Pendant ce temps, l’application n’arrivait plus à modifier ce livre, les
requêtes restaient bloquées. » Explique ce qui s’est passé et ce qu’il aurait fallu faire.

:::solution
L’`UPDATE` a posé un **verrou** sur la ligne du livre. Ce verrou est conservé jusqu’à la fin de
la transaction, `COMMIT` ou `ROLLBACK`. Toute autre transaction qui voulait modifier cette ligne
(ici, l’application) a dû **attendre**, exactement comme le terminal B de la leçon. Ses lectures,
elles, n’étaient pas bloquées, mais voyaient l’ancienne valeur.

Il fallait conclure la transaction tout de suite : vérifier le résultat de l’`UPDATE`, puis
`COMMIT` (ou `ROLLBACK`). Une transaction doit être courte et ne jamais rester ouverte en
attendant une action humaine. Pour débloquer la situation, il suffit que la collègue termine sa
transaction ou ferme sa session `psql`, ce qui annule la transaction en cours.
:::

## Récapitulatif

- Une **transaction** (`BEGIN` … `COMMIT`) rend plusieurs écritures atomiques ; `ROLLBACK`
  annule tout. Sans `BEGIN`, chaque instruction est validée seule (_autocommit_).
- Après une erreur, la transaction est interrompue : seules `ROLLBACK` (ou `COMMIT`, qui annule)
  sont utiles.
- **ACID** : atomicité, cohérence, isolation, durabilité. Par défaut (_Read Committed_), une
  transaction ne voit pas les modifications non validées des autres.
- Une ligne modifiée reste verrouillée jusqu’à la fin de la transaction : transactions courtes.
- Un **index** B-tree accélère égalités, intervalles et tris ; `PRIMARY KEY` et `UNIQUE` en
  créent un, les clés étrangères non.
- `EXPLAIN` montre le plan (`Seq Scan`, `Index Scan`, `Bitmap Index Scan`) ; `EXPLAIN ANALYZE`
  exécute la requête et donne les valeurs réelles.
- Un index sert pour des conditions sélectives sur la colonne brute ; il ralentit les écritures.
  On l’ajoute pour une requête fréquente et lente, après vérification.
