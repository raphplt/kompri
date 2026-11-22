---
title: Tables, lignes, colonnes et types
summary: Comprendre ce qu’est une base relationnelle, installer PostgreSQL, s’y connecter et découvrir les types de données courants.
durationMinutes: 50
sources:
  - title: PostgreSQL — Téléchargements officiels
    url: https://www.postgresql.org/download/
  - title: Docker Hub — Image officielle postgres
    url: https://hub.docker.com/_/postgres
  - title: PostgreSQL — Types de données
    url: https://www.postgresql.org/docs/current/datatype.html
  - title: PostgreSQL — Documentation de psql
    url: https://www.postgresql.org/docs/current/app-psql.html
---

Une application web passe son temps à mémoriser des choses : des comptes, des commandes, des
messages, des livres dans un catalogue. Tant que le programme tourne, ces informations vivent en
mémoire, dans des variables. Dès qu’il s’arrête, elles disparaissent. Tu pourrais les écrire dans
un fichier JSON, mais très vite les questions s’accumulent : que se passe-t-il si deux requêtes
modifient le fichier en même temps ? Comment retrouver en un instant les 20 livres les moins chers
parmi 200 000 ? Comment empêcher qu’un prix soit enregistré sous la forme `"gratuit"` ?

Une **base de données** répond à ces questions. Elle stocke les informations de façon durable,
les protège contre les écritures incohérentes et sait les retrouver très vite. Cette compétence
t’apprend à lui parler avec **SQL**, le langage standard des bases relationnelles, en utilisant
**PostgreSQL**.

## Le modèle relationnel : des tableaux très stricts

Une base relationnelle range les données dans des **tables**. Une table ressemble à un tableau de
tableur, avec une différence capitale : sa structure est fixée à l’avance et vérifiée à chaque
écriture.

Voici à quoi ressemble la table `books` que tu construiras dans la leçon suivante (extrait) :

```text
 id |           title           |    author     |    genre     | price
----+---------------------------+---------------+--------------+-------
  1 | Le Jardin des algorithmes | Claire Martin | informatique | 29.90
  2 | Nuit sur le port          | Hugo Bernard  | roman        | 18.50
  3 | La Cuisine du dimanche    | Lina Petit    | cuisine      | 24.00
(3 rows)
```

Le vocabulaire à maîtriser :

- une **table** regroupe des informations d’une même nature : ici, des livres ;
- une **colonne** (on dit aussi attribut ou champ) décrit une propriété : le titre, l’auteur, le
  prix. Chaque colonne a un **nom** et un **type** ;
- une **ligne** (on dit aussi enregistrement ou tuple) représente un élément précis : un livre ;
- une **valeur** est l’intersection d’une ligne et d’une colonne : le prix du livre 2 vaut 18,50.

Dans un tableur, rien ne t’empêche d’écrire « environ 20 € » dans la colonne des prix. Dans une
table, la colonne `price` a un type numérique : PostgreSQL refusera toute valeur qui n’est pas un
nombre. C’est cette rigueur qui rend les données fiables et les calculs possibles.

:::note[L’ordre des lignes n’existe pas]
Une table n’a pas d’ordre « naturel ». Si tu ne demandes pas explicitement un tri, PostgreSQL
renvoie les lignes dans l’ordre qui l’arrange, souvent l’ordre d’insertion sur une petite table
neuve, mais sans aucune garantie. Tu apprendras à trier avec `ORDER BY` dans la leçon 3.
:::

## SGBD, serveur et client

PostgreSQL est un **SGBD** : un système de gestion de base de données. Il fonctionne sur le
modèle client-serveur que tu connais déjà avec le Web :

- le **serveur** PostgreSQL est un programme qui tourne en permanence. Il détient les fichiers de
  données et attend des connexions réseau, par défaut sur le **port 5432** ;
- un **client** se connecte au serveur, envoie des requêtes SQL et reçoit des résultats. Le client
  peut être `psql` (l’outil en ligne de commande officiel), une interface graphique, ou ton
  application Node.js.

Un même serveur héberge plusieurs **bases** indépendantes (par exemple une par projet). Chaque
base contient des tables. Pour se connecter, un client indique donc : l’hôte (la machine), le
port, l’utilisateur (on dit aussi **rôle** dans PostgreSQL), son mot de passe et la base visée.

**SQL** (_Structured Query Language_) est un langage **déclaratif** : tu décris le résultat voulu
(« les livres de moins de 15 € »), pas l’algorithme pour l’obtenir. C’est le SGBD qui choisit
comment parcourir les données. SQL est normalisé (norme ISO/IEC 9075), mais chaque SGBD ajoute
ses extensions : quand une commande de ce cours est propre à PostgreSQL, elle est signalée.

## Installer PostgreSQL

Le parcours utilise PostgreSQL 18. Deux façons officielles de l’obtenir :

1. **Les installeurs et paquets officiels**, listés sur la page de téléchargement du projet
   (lien dans les sources). Elle indique, pour Windows, macOS et chaque distribution Linux, la
   méthode recommandée. Suis exactement les instructions de la page pour ton système : elles
   installent le serveur et l’outil `psql`.
2. **L’image Docker officielle** `postgres`, si Docker est déjà installé sur ta machine. Sa page
   Docker Hub (lien dans les sources) documente les variables reconnues, dont
   `POSTGRES_PASSWORD`, obligatoire pour définir le mot de passe du superutilisateur `postgres`.

Avec Docker, la commande suivante démarre un serveur PostgreSQL 18 en arrière-plan, nommé
`kompri-postgres`, accessible sur le port 5432 de ta machine :

```bash
docker run --name kompri-postgres -e POSTGRES_PASSWORD=devpassword -p 5432:5432 -d postgres:18
```

Chaque option a un rôle précis : `--name` donne un nom au conteneur, `-e` définit une variable
d’environnement, `-p 5432:5432` relie le port de ta machine à celui du conteneur, `-d` lance le
conteneur en arrière-plan et `postgres:18` désigne l’image et sa version majeure.

:::warning[Un mot de passe de développement seulement]
`devpassword` convient pour une base locale de test qui n’est accessible que depuis ta machine.
Pour tout serveur réel, le mot de passe est long, aléatoire et ne figure jamais dans un fichier
versionné avec Git.
:::

## Se connecter avec psql

`psql` se lance depuis le terminal. Les options utiles : `-h` pour l’hôte, `-p` pour le port,
`-U` pour l’utilisateur et `-d` pour la base.

```bash
psql -h localhost -p 5432 -U postgres -d postgres
```

`psql` demande le mot de passe, puis affiche une invite qui rappelle la base courante :

```text
postgres=#
```

Le `#` indique que tu es connecté en superutilisateur ; un rôle ordinaire voit `=>`. Si `psql`
n’est pas installé sur ta machine mais que tu utilises Docker, tu peux lancer celui qui est inclus
dans le conteneur :

```bash
docker exec -it kompri-postgres psql -U postgres
```

Quelques **méta-commandes** commencent par une barre oblique inverse. Elles sont interprétées par
`psql` lui-même, ce ne sont pas du SQL, et elles ne se terminent pas par un point-virgule :

| Méta-commande | Effet                                        |
| ------------- | -------------------------------------------- |
| `\q`          | quitter `psql`                               |
| `\l`          | lister les bases du serveur                  |
| `\?`          | afficher l’aide de toutes les méta-commandes |
| `\h SELECT`   | afficher la syntaxe d’une commande SQL       |

Tu en découvriras d’autres (`\c`, `\dt`, `\d`) dans la leçon suivante.

:::tip[Messages en français ou en anglais]
Selon la langue configurée sur ta machine et sur le serveur, `psql` et PostgreSQL affichent leurs
titres et leurs erreurs en anglais (`(1 row)`, `ERROR:`) ou en français (`(1 ligne)`, `ERREUR:`).
Les exemples de ce cours montrent la version anglaise ; le sens est identique.
:::

## Une première requête

Une instruction SQL se termine par un **point-virgule**. Tape ceci à l’invite puis valide avec
Entrée :

```sql
SELECT 1 + 1;
```

```text
 ?column?
----------
        2
(1 row)
```

`SELECT` calcule et renvoie un résultat sous forme de tableau. Ici, une colonne sans nom
(`?column?`) et une seule ligne. Tu peux nommer les colonnes avec `AS` :

```sql
SELECT 'Bonjour' AS greeting, 42 AS answer;
```

```text
 greeting | answer
----------+--------
 Bonjour  |     42
(1 row)
```

Remarque les **apostrophes simples** autour de `'Bonjour'` : en SQL, elles délimitent une chaîne
de caractères. Les guillemets doubles servent à autre chose (des noms de colonnes ou de tables),
tu le verras plus tard. Pour écrire une apostrophe dans une chaîne, on la double :

```sql
SELECT 'l''apostrophe' AS text_with_quote;
```

```text
 text_with_quote
-----------------
 l'apostrophe
(1 row)
```

:::warning[Le point-virgule oublié]
Si tu valides une ligne sans point-virgule, rien ne se passe : l’invite devient `postgres-#` (un
tiret à la place du `=`). `psql` attend la suite de l’instruction. Tape simplement `;` puis
Entrée pour l’exécuter.
:::

## Les types de données courants

Chaque colonne a un type. Choisir le bon type, c’est décider quelles valeurs sont acceptées et
quelles opérations sont possibles. La fonction `pg_typeof`, propre à PostgreSQL, révèle le type
d’une expression :

```sql
SELECT pg_typeof(42), pg_typeof(3.5), pg_typeof(true);
```

```text
 pg_typeof | pg_typeof | pg_typeof
-----------+-----------+-----------
 integer   | numeric   | boolean
(1 row)
```

Voici les types que tu utiliseras dans l’immense majorité des tables :

| Type           | Contenu                                                      | Exemple de valeur          |
| -------------- | ------------------------------------------------------------ | -------------------------- |
| `integer`      | entier sur 4 octets, de −2 147 483 648 à 2 147 483 647       | `320`                      |
| `bigint`       | entier sur 8 octets, pour les très grands nombres            | `3000000000`               |
| `numeric(p,s)` | nombre décimal exact, `p` chiffres dont `s` après la virgule | `29.90`                    |
| `text`         | chaîne de longueur quelconque                                | `'Nuit sur le port'`       |
| `varchar(n)`   | chaîne d’au plus `n` caractères                              | `'FR'`                     |
| `boolean`      | vrai ou faux                                                 | `true`, `false`            |
| `date`         | une date du calendrier, sans heure                           | `'2024-02-29'`             |
| `timestamptz`  | un instant précis, avec fuseau horaire                       | `'2024-06-10 14:30:00+00'` |

### Les entiers : integer et bigint

`integer` suffit pour un nombre de pages, une quantité, une année. Au-delà de sa limite,
PostgreSQL refuse le calcul au lieu de produire un résultat faux :

```sql
SELECT 2147483647 + 1;
```

```text
ERROR:  integer out of range
```

Avec `bigint`, le même calcul passe. La syntaxe `valeur::type` convertit une valeur dans un autre
type (c’est un raccourci PostgreSQL pour `CAST(valeur AS type)`) :

```sql
SELECT 2147483647::bigint + 1;
```

```text
  ?column?
------------
 2147483648
(1 row)
```

Attention aussi à la **division entière** : entre deux entiers, `/` tronque le résultat.

```sql
SELECT 7 / 2 AS integer_division, 7.0 / 2 AS decimal_division;
```

```text
 integer_division |  decimal_division
------------------+--------------------
                3 | 3.5000000000000000
(1 row)
```

### Les décimaux exacts : numeric

Pour de l’argent, on veut des calculs **exacts**. Les nombres à virgule flottante
(`double precision`, le même format que les nombres de JavaScript) ne le sont pas, alors que
`numeric` l’est :

```sql
SELECT 0.1 + 0.2 AS numeric_sum, 0.1::double precision + 0.2::double precision AS float_sum;
```

```text
 numeric_sum |      float_sum
-------------+---------------------
         0.3 | 0.30000000000000004
(1 row)
```

`numeric(6, 2)` signifie : six chiffres au total, dont deux après la virgule. Les valeurs vont
donc de −9999,99 à 9999,99, et une valeur plus précise est **arrondie** à deux décimales :

```sql
SELECT 12.345::numeric(6,2);
```

```text
 numeric
---------
   12.35
(1 row)
```

En SQL, le séparateur décimal est toujours le **point** : `29.90`, jamais `29,90`.

### Le texte : text et varchar

Dans PostgreSQL, `text` et `varchar(n)` sont stockés de la même façon. `varchar(n)` ajoute
seulement une vérification de longueur maximale. Utilise `text` par défaut et `varchar(n)` quand
une limite fait partie des règles métier (un code pays sur deux lettres, par exemple).

### Les booléens : boolean

`boolean` vaut `true` ou `false`. `psql` les affiche `t` et `f`. PostgreSQL accepte quelques
écritures en entrée (`'true'`, `'yes'`, `'1'`…), mais pas le français :

```sql
SELECT 'oui'::boolean;
```

```text
ERROR:  invalid input syntax for type boolean: "oui"
LINE 1: SELECT 'oui'::boolean;
               ^
```

Le `^` désigne l’endroit précis où PostgreSQL a détecté le problème : lis toujours les messages
d’erreur jusqu’au bout, ils sont précis.

### Les dates : date et timestamptz

On écrit les dates au format ISO `AAAA-MM-JJ`, entre apostrophes. PostgreSQL vérifie qu’elles
existent et sait calculer avec :

```sql
SELECT '2024-02-29'::date AS leap_day, '2024-02-29'::date + 1 AS next_day;
```

```text
  leap_day  |  next_day
------------+------------
 2024-02-29 | 2024-03-01
(1 row)
```

```sql
SELECT '2023-02-29'::date;
```

```text
ERROR:  date/time field value out of range: "2023-02-29"
LINE 1: SELECT '2023-02-29'::date;
               ^
```

Pour un **instant** (une commande passée, un message envoyé), utilise `timestamptz`
(abréviation de `timestamp with time zone`). PostgreSQL stocke l’instant de façon absolue et
l’affiche dans le fuseau de ta session. Le même instant, vu depuis deux fuseaux :

```sql
SET timezone = 'Europe/Paris';
SELECT '2024-06-10 14:30:00+00'::timestamptz AS meeting;
```

```text
SET
        meeting
------------------------
 2024-06-10 16:30:00+02
(1 row)
```

```sql
SET timezone = 'UTC';
SELECT '2024-06-10 14:30:00+00'::timestamptz AS meeting;
```

```text
SET
        meeting
------------------------
 2024-06-10 14:30:00+00
(1 row)
```

`+00` est l’heure UTC ; en juin, Paris est à UTC+2. La valeur stockée n’a pas changé, seul
l’affichage s’adapte. Il existe aussi `timestamp` sans fuseau, mais il ne sait pas à quel instant
réel il correspond : pour des événements datés, préfère `timestamptz`.

## La clé primaire : identifier chaque ligne

Imagine deux livres intitulés « Poèmes du matin », écrits par deux personnes différentes. Comment
désigner sans ambiguïté celui que tu veux modifier ? Ni le titre ni l’auteur ne suffisent à coup
sûr. Il faut une colonne dont la valeur est **unique** pour chaque ligne et **toujours
présente** : c’est la **clé primaire** (_primary key_).

Dans la table `books`, c’est la colonne `id` : un entier attribué automatiquement par PostgreSQL
(1, 2, 3…) à chaque nouvelle ligne. Ce genre de clé sans signification métier s’appelle une **clé
de substitution**. Elle a deux grands avantages : elle ne change jamais (un titre peut être
corrigé, un identifiant non) et elle est courte, donc rapide à comparer.

PostgreSQL garantit les deux propriétés d’une clé primaire :

- **unicité** : deux lignes ne peuvent pas avoir la même valeur ;
- **présence** : la valeur ne peut pas être absente.

Tu verras dans la leçon suivante comment la déclarer et ce qui se passe quand on essaie de la
violer.

## Pièges et idées reçues

- **« Une base, c’est un gros tableur. »** Non : le schéma (colonnes et types) est imposé, et
  chaque écriture est vérifiée. C’est une force, pas une contrainte inutile.
- **Utiliser des nombres flottants pour de l’argent.** `0.1 + 0.2` en `double precision` donne
  `0.30000000000000004`. Utilise `numeric`, ou stocke des centimes dans un `integer`.
- **Écrire `29,90` au lieu de `29.90`.** La virgule sépare des valeurs en SQL : `SELECT 29,90;`
  renvoie deux colonnes, 29 et 90.
- **Mettre une chaîne entre guillemets doubles.** `"roman"` désigne une colonne nommée `roman`,
  pas un texte. Le texte s’écrit `'roman'`.
- **Compter sur l’ordre d’affichage.** Sans tri explicite, l’ordre des lignes n’est pas garanti.

## Exercices

### Exercice 1 : prévoir des résultats

Sans exécuter la requête, prévois la valeur de chaque colonne, puis vérifie dans `psql`.

```sql
SELECT 10 / 4 AS a, 10 / 4.0 AS b, 10 % 4 AS c, round(10 / 4.0, 1) AS d;
SELECT '2024-12-31'::date + 1 AS e, '2025-03-01'::date - '2025-02-01'::date AS f;
```

:::solution

```text
 a |         b          | c |  d
---+--------------------+---+-----
 2 | 2.5000000000000000 | 2 | 2.5
(1 row)

     e      | f
------------+----
 2025-01-01 | 28
(1 row)
```

- `a` : division entre deux entiers, donc tronquée à 2.
- `b` : `4.0` est un `numeric`, la division est décimale.
- `c` : `%` donne le reste de la division entière (10 = 2 × 4 + 2).
- `d` : `round(valeur, 1)` arrondit à une décimale.
- `e` : ajouter un entier à une date avance d’autant de jours, en passant à l’année suivante.
- `f` : soustraire deux dates donne un nombre de jours ; février 2025 en compte 28.

:::

### Exercice 2 : choisir les types d’une table

Une association veut enregistrer ses adhérents : un identifiant, le nom, l’adresse e-mail, la
date de naissance, le montant de la cotisation payée (en euros, avec centimes), un indicateur
« a accepté la newsletter » et l’instant exact de l’inscription en ligne. Pour chaque
information, propose un nom de colonne en anglais et un type, et indique laquelle sera la clé
primaire. Justifie chaque choix en une phrase.

:::solution

| Colonne         | Type           | Justification                                                 |
| --------------- | -------------- | ------------------------------------------------------------- |
| `id`            | `integer`      | clé primaire de substitution, attribuée automatiquement       |
| `name`          | `text`         | longueur variable, pas de limite métier naturelle             |
| `email`         | `text`         | une chaîne ; sa validité sera vérifiée par l’application      |
| `birth_date`    | `date`         | une date sans heure ; PostgreSQL refuse les dates impossibles |
| `fee`           | `numeric(6,2)` | de l’argent : décimal exact, deux chiffres après la virgule   |
| `newsletter`    | `boolean`      | une réponse oui ou non                                        |
| `registered_at` | `timestamptz`  | un instant précis, comparable quel que soit le fuseau         |

L’adresse e-mail est peut-être unique, mais elle peut changer : on préfère une clé de
substitution `id`. Pour une association qui compterait des millions d’adhérents, `bigint` serait
plus prudent pour `id`, mais `integer` monte déjà jusqu’à 2 147 483 647.
:::

### Exercice 3 : lire un message d’erreur

Un camarade exécute `SELECT '2024-13-01'::date;` et `SELECT 1.5::integer;`. Prévois ce qui se
passe pour chacune, puis vérifie. Que t’apprend le second résultat ?

:::solution
La première requête échoue car il n’y a pas de treizième mois :

```text
ERROR:  date/time field value out of range: "2024-13-01"
LINE 1: SELECT '2024-13-01'::date;
               ^
HINT:  Perhaps you need a different "datestyle" setting.
```

La seconde réussit et renvoie `2` : la conversion d’un décimal en entier **arrondit** (elle ne
tronque pas comme la division entière). Conclusion : une conversion explicite peut modifier une
valeur sans erreur ; il faut savoir ce qu’elle fait avant de l’utiliser.

```text
 int4
------
    2
(1 row)
```

Le nom de colonne `int4` est le nom interne du type `integer`.
:::

## Récapitulatif

- Une base relationnelle range les données dans des **tables** faites de **colonnes** typées et de
  **lignes**. Les lignes n’ont pas d’ordre garanti.
- PostgreSQL est un **serveur** (port 5432 par défaut) ; `psql` est un **client** en ligne de
  commande. On l’installe avec les installeurs officiels ou l’image Docker `postgres`.
- `psql -h hôte -p port -U utilisateur -d base` ouvre une session ; `\q` la ferme, `\l` liste les
  bases, `\?` affiche l’aide.
- Une instruction SQL se termine par `;`. Les chaînes s’écrivent entre apostrophes simples.
- Types courants : `integer`, `bigint`, `numeric(p,s)` pour l’argent, `text`, `varchar(n)`,
  `boolean`, `date`, `timestamptz` pour les instants.
- La **clé primaire** identifie chaque ligne : valeur unique et toujours présente.
