---
title: Orchestrer les services avec Docker Compose
summary: Décrire l’API, PostgreSQL et le job de migration dans un compose.yaml, avec volume nommé, réseaux, attente de la santé des dépendances, variables et secrets fournis par un fichier hors du dépôt.
durationMinutes: 70
sources:
  - title: Docker — Compose file reference
    url: https://docs.docker.com/reference/compose-file/
  - title: Docker — Control startup order in Compose
    url: https://docs.docker.com/compose/how-tos/startup-order/
  - title: Docker — Variable interpolation in Compose
    url: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
  - title: Docker Hub — Image officielle postgres
    url: https://hub.docker.com/_/postgres
---

## Le problème : plusieurs conteneurs qui dépendent les uns des autres

Le livre d’or a besoin de trois choses : une base PostgreSQL, les migrations appliquées sur
cette base, puis l’API. Avec `docker run`, il faudrait créer un réseau, un volume pour les
données, lancer la base, attendre qu’elle accepte les connexions, lancer les migrations,
attendre qu’elles aient réussi, puis lancer l’API, en répétant les mêmes variables à chaque
commande. Une erreur d’ordre, et l’API démarre sur une base vide ou absente.

**Docker Compose** décrit tout cela dans un fichier, `compose.yaml`, versionné avec le code.
Une commande crée ou met à jour l’ensemble, dans le bon ordre. Compose est inclus dans Docker
Desktop et s’installe avec Docker Engine (commande `docker compose`, avec une espace).

## Le fichier `compose.yaml`

À la racine du projet :

```yaml
# compose.yaml — l’API, sa base et le job de migration
name: guestbook

services:
  db:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_DB: guestbook
      POSTGRES_USER: guestbook
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant dans .env}
    volumes:
      - db-data:/var/lib/postgresql
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U guestbook -d guestbook"]
      interval: 5s
      timeout: 3s
      retries: 10

  migrate:
    image: guestbook:${APP_VERSION:?APP_VERSION manquant dans .env}
    command: ["node", "scripts/migrate.js"]
    environment:
      DATABASE_URL: postgres://guestbook:${POSTGRES_PASSWORD}@db:5432/guestbook
    networks: [backend]
    depends_on:
      db:
        condition: service_healthy

  api:
    image: guestbook:${APP_VERSION}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://guestbook:${POSTGRES_PASSWORD}@db:5432/guestbook
      TRUST_PROXY: 0
    networks: [backend, web]
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully

volumes:
  db-data:

networks:
  backend:
    internal: true
  web:
```

Prenons-le bloc par bloc.

### Les services

Un **service** décrit un conteneur à lancer. `name: guestbook` fixe le nom du **projet** :
Compose préfixe avec lui les conteneurs (`guestbook-api-1`), le volume et les réseaux.

- `image: postgres:18` : l’image officielle PostgreSQL, version majeure 18. On ne construit
  rien pour la base.
- `image: guestbook:${APP_VERSION}` : l’image du livre d’or, construite à la leçon 2 avec
  `docker build`. Compose ne la construit pas : on garde une étape explicite « construire et
  étiqueter », puis « lancer cette étiquette », ce qui simplifiera le retour arrière (leçon 6).
  Si l’étiquette n’existe pas sur la machine, Compose essaie de la télécharger depuis Docker
  Hub et échoue : une erreur claire plutôt qu’une mauvaise version.
- `restart: unless-stopped` : si le processus s’arrête (plantage, redémarrage du serveur),
  Docker le relance, sauf si tu l’as arrêté toi-même. Le service Docker doit être activé au
  démarrage du système, ce que fait l’installation officielle sous Linux.

### Les variables et le fichier `.env`

`${POSTGRES_PASSWORD}` n’est pas lu par le conteneur : c’est Compose qui **remplace** cette
expression avant de créer les conteneurs. Il prend les valeurs dans l’environnement du shell,
et dans un fichier `.env` placé à côté de `compose.yaml`, lu automatiquement.

La forme `${VARIABLE:?message}` rend la variable **obligatoire** : Compose refuse de continuer si
elle est absente ou vide. C’est l’échec rapide de la leçon 1, au niveau du déploiement :

```text
error while interpolating services.db.environment.POSTGRES_PASSWORD: required variable POSTGRES_PASSWORD is missing a value: POSTGRES_PASSWORD manquant dans .env
```

Sur le serveur, le fichier `.env` contient seulement les variables de Compose :

```bash
APP_VERSION=1.0.0
POSTGRES_PASSWORD=89d69ee2e06b984715ded6454e1f76cbd815ea0d553f6132ba81c030bb40bde3
```

(la valeur réelle sort de `openssl rand -hex 32`). Il est créé **à la main sur le serveur**,
jamais commité (le `.gitignore` de la leçon 1 l’exclut), et lisible par toi seul :

```bash
chmod 600 .env
ls -l .env
```

```text
-rw------- 1 deploy deploy 101 Nov 24 14:25 .env
```

`600` : lecture et écriture pour le propriétaire, rien pour les autres comptes de la machine.

La compétence précédente mettait en garde contre un `.env` copié sur le serveur « pour aller
vite » : le risque visé est la copie de ton fichier de **développement**, qui finit dans une
archive, une image ou une sauvegarde. Celui-ci est propre au serveur, créé sur place, exclu du
dépôt par `.gitignore` et de l’image par `.dockerignore`. Si ton hébergeur propose un
gestionnaire de secrets, il reste préférable.

`docker compose config` affiche le fichier final, variables remplacées : pratique pour vérifier,
mais il affiche aussi les mots de passe. Pour seulement valider la syntaxe :
`docker compose config --quiet` (aucune sortie si tout va bien).

Dans le bloc `environment`, l’API reçoit ses variables **à l’exécution**, comme avec
`docker run -e` : rien n’est écrit dans l’image. `NODE_ENV: production` et `TRUST_PROXY: 0` ne
sont pas secrets ; `DATABASE_URL` contient le mot de passe, assemblé par Compose.

### Le volume nommé : les données survivent aux conteneurs

Un conteneur est jetable : sa couche inscriptible disparaît avec lui. Les fichiers de
PostgreSQL doivent donc vivre ailleurs, dans un **volume** : un espace de stockage géré par
Docker, indépendant de tout conteneur. `db-data:/var/lib/postgresql` monte le volume nommé
`db-data` dans le dossier où l’image PostgreSQL 18 range ses données (dans un sous-dossier par
version majeure, `/var/lib/postgresql/18/docker`).

:::warning[L’ancien chemin, avec PostgreSQL 18]
Beaucoup d’exemples (et d’assistants d’IA) montent le volume sur `/var/lib/postgresql/data`,
le chemin des images jusqu’à la version 17. Avec `postgres:18`, le conteneur refuse alors de
démarrer, avec un long message qui commence par :

```text
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" (specifically, using
       major-version-specific directory names).
```

et recommande un seul montage sur `/var/lib/postgresql`. Sans aucun volume, en revanche, tout
démarre : les données vont dans un volume **anonyme** que l’image déclare. Il survit à une
recréation par `up -d`, mais après `docker compose down`, `up -d` en crée un neuf, vide.
L’ancien reste sur le disque, orphelin et sans nom.

:::

### Les réseaux

Compose crée des **réseaux** privés. Sur un même réseau, un conteneur en joint un autre par
son **nom de service** : l’API se connecte à `db:5432`, Docker résout `db` en l’adresse du
conteneur de la base.

- `backend` relie la base, le job de migration et l’API. `internal: true` coupe ce réseau
  d’Internet : la base n’a aucune raison d’en sortir.
- `web` relie l’API à ce qui doit la joindre de l’extérieur : le port publié ici, le proxy
  HTTPS à la leçon suivante.

La base **ne publie aucun port** : pas de bloc `ports`. Elle n’est joignable que depuis les
conteneurs du réseau `backend`. L’API publie le sien seulement sur `127.0.0.1`, le temps des
essais : à la leçon 4, c’est le proxy qui le remplacera.

:::warning[`5432:5432` et le pare-feu]
Écrire `ports: ["5432:5432"]` sur la base ouvre PostgreSQL sur **toutes** les interfaces du
serveur, donc à Internet. La documentation de Docker le précise : un port publié par Docker est
redirigé **avant** les règles du pare-feu `ufw` d’Ubuntu, qui ne le bloque donc pas. Des robots
balaient en permanence Internet à la recherche de bases ouvertes. Pour administrer la base,
utilise `docker compose exec db psql` (plus bas), ou publie sur `127.0.0.1` uniquement et passe
par un tunnel SSH.

:::

### Le contrôle de santé de la base et l’ordre de démarrage

`depends_on` décrit l’ordre. Sa forme courte, `depends_on: [db]`, garantit seulement que le
conteneur `db` est **lancé**, pas que PostgreSQL accepte déjà les connexions. Essai, sur un
volume neuf, avec cette forme courte pour le job de migration :

```text
migrate-1  | Error: connect ECONNREFUSED 172.20.0.2:5432
…
service "migrate" didn't complete successfully: exit 1
```

PostgreSQL initialisait encore sa base. Les conditions règlent le problème :

- `condition: service_healthy` : attendre que le `healthcheck` du service réussisse ;
- `condition: service_completed_successfully` : attendre que le service se **termine** avec le
  code 0. C’est ce qui fait de `migrate` un **job** : il s’exécute, puis s’arrête.

Le `healthcheck` de la base utilise `pg_isready`, fourni dans l’image. L’option
`-h 127.0.0.1` a une raison précise : à la première initialisation, l’image démarre un
PostgreSQL **temporaire** qui n’écoute que sur un fichier de socket local, puis le redémarre
pour de bon. Sans `-h`, `pg_isready` passe par ce socket et peut déclarer la base prête trop
tôt ; avec `-h 127.0.0.1`, il exige la vraie écoute réseau. Les journaux le montrent :

```text
… LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
PostgreSQL init process complete; ready for start up.
… LOG:  listening on IPv4 address "0.0.0.0", port 5432
```

### Pourquoi un job de migration séparé ?

On pourrait appliquer les migrations au démarrage de l’API. Le job dédié a trois avantages :

- **une seule exécution** : si un jour plusieurs conteneurs de l’API tournent, ils ne se
  disputent pas la même migration ;
- **un échec bloquant** : si une migration échoue, `migrate` sort avec le code 1, et
  l’API n’est **pas** remplacée (condition `service_completed_successfully`) ;
- **des droits séparés** : le job pourrait utiliser un rôle PostgreSQL propriétaire des tables,
  et l’API un rôle limité à `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

Le job réutilise l’image de l’API, avec une autre commande (`command`). Il hérite aussi de son
`HEALTHCHECK`, sans conséquence : il se termine en quelques secondes.

## Lancer l’ensemble

Construis l’image si ce n’est pas fait, crée `.env`, puis lance :

```bash
docker build --build-arg APP_VERSION=1.0.0 -t guestbook:1.0.0 .
docker compose up -d
```

```text
 Network guestbook_backend Creating
 Network guestbook_web Creating
 Volume guestbook_db-data Creating
 …
 Container guestbook-db-1 Started
 Container guestbook-db-1 Waiting
 Container guestbook-db-1 Healthy
 Container guestbook-migrate-1 Starting
 Container guestbook-migrate-1 Started
 Container guestbook-migrate-1 Waiting
 Container guestbook-migrate-1 Exited
 Container guestbook-api-1 Starting
 Container guestbook-api-1 Started
```

L’ordre est respecté : base saine, migrations terminées, puis API. `-d` rend la main
immédiatement ; les conteneurs tournent en arrière-plan.

```bash
docker compose ps -a
```

```text
NAME                  IMAGE             COMMAND                  SERVICE   CREATED          STATUS                            PORTS
guestbook-api-1       guestbook:1.0.0   "docker-entrypoint.s…"   api       10 seconds ago   Up 3 seconds (health: starting)   127.0.0.1:3000->3000/tcp
guestbook-db-1        postgres:18       "docker-entrypoint.s…"   db        10 seconds ago   Up 9 seconds (healthy)            5432/tcp
guestbook-migrate-1   guestbook:1.0.0   "docker-entrypoint.s…"   migrate   10 seconds ago   Exited (0) 3 seconds ago
```

`-a` affiche aussi les conteneurs arrêtés, dont le job terminé avec le code 0. `5432/tcp`
pour la base, sans flèche : le port existe dans le conteneur, mais n’est pas publié.

```bash
docker compose logs migrate
docker compose logs api
curl -s -X POST localhost:3000/api/messages -H 'Content-Type: application/json' \
  -d '{"author":"Ada","body":"Premier message en conteneur"}'; echo
```

```text
migrate-1  | migration appliquée : 001_init.sql
migrate-1  | Base à jour
api-1  | {"port":3000,"env":"production","version":"1.0.0","time":"2026-11-24T14:05:24.990Z","level":"info","message":"server started"}
{"id":1,"author":"Ada","body":"Premier message en conteneur","created_at":"2026-11-24T14:05:40.582Z"}
```

La version 1.0.0, inscrite dans l’image à la construction, apparaît dans le journal de
démarrage : on sait exactement ce qui tourne.

### Les commandes du quotidien

| Commande | Effet |
| --- | --- |
| `docker compose up -d` | Crée ou met à jour ce qui a changé (configuration, image), sans toucher au reste |
| `docker compose ps -a` | État des services, santé comprise |
| `docker compose logs -f api` | Journaux d’un service, en continu (`Ctrl`+`C` pour quitter) |
| `docker compose exec db psql -U guestbook -d guestbook` | Ouvre `psql` **dans** le conteneur de la base |
| `docker compose stop` / `start` | Arrête ou relance les conteneurs sans les supprimer |
| `docker compose down` | Supprime conteneurs et réseaux ; **garde** les volumes |
| `docker compose down -v` | Supprime **aussi les volumes** : toutes les données de la base |

Les données survivent à `down` :

```bash
docker compose down
docker compose up -d
docker compose exec db psql -U guestbook -d guestbook -c 'SELECT name FROM schema_migrations'
```

```text
     name
--------------
 001_init.sql
(1 row)
```

Le message d’Ada est toujours là, et `migrate` affiche simplement `Base à jour`. `psql` se
connecte ici sans mot de passe : dans le conteneur, l’image autorise les connexions locales
par socket. Le mot de passe protège les connexions **réseau**.

:::warning[`down -v` en production]
`-v` efface le volume, donc la base. C’est utile pour repartir de zéro sur ton poste, et
catastrophique sur le serveur. Ne tape jamais `down -v` en production sans une sauvegarde
restaurée et vérifiée (leçon 6).

:::

## L’arrêt propre, version Compose

`docker compose stop api` envoie `SIGTERM`, attend 10 secondes, puis `SIGKILL`, comme
`docker stop`. Mesures sur le livre d’or :

```text
avec gestionnaire SIGTERM :   real 0m0.354s   journal : shutdown requested, shutdown complete
sans gestionnaire SIGTERM :   real 0m10.344s  état : Exited (137)
```

Si ton application a besoin de plus de 10 secondes pour finir ses requêtes, la clé
`stop_grace_period: 20s` allonge le délai pour ce service. Garde alors le filet de sécurité de
`server.js` en dessous de ce délai.

## Faire tourner le mot de passe de la base

Les variables `POSTGRES_*` de l’image officielle ne servent qu’**à la création** de la base,
quand le volume est vide. Changer `POSTGRES_PASSWORD` dans `.env` puis relancer ne change donc
**pas** le mot de passe dans PostgreSQL : l’API et le job reçoivent le nouveau, la base attend
toujours l’ancien.

```text
error: password authentication failed for user "guestbook"
```

La bonne procédure suit l’ordre vu à la leçon 1 : la ressource d’abord, l’application ensuite.

```bash
NEW_PASSWORD=$(openssl rand -hex 32)
docker compose exec -T db psql -U guestbook -d guestbook -v pw="$NEW_PASSWORD" <<'SQL'
ALTER ROLE guestbook PASSWORD :'pw';
SQL
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env
docker compose up -d
```

```text
ALTER ROLE
```

- `-T` désactive le terminal interactif : indispensable quand on envoie du texte sur l’entrée
  standard (ici le document `<<'SQL'`).
- `-v pw=…` définit une variable `psql`, et `:'pw'` l’insère **comme une chaîne SQL
  correctement échappée**. Le mot de passe n’apparaît pas dans le texte de la commande SQL.
- `docker compose up -d` recrée les conteneurs dont la configuration a changé : `migrate` et
  `api`, avec le nouveau `DATABASE_URL`, mais aussi `db`, dont la variable `POSTGRES_PASSWORD` a
  changé. Pour `db`, c’est sans effet sur les données : le volume est conservé, et la variable
  n’est plus lue puisque la base existe déjà. Compte une coupure de quelques secondes.

## Pièges et idées reçues

- **`depends_on` sans condition** : le conteneur de la base est lancé, pas prêt ; migrations et
  API échouent au hasard selon la vitesse de la machine.
- **Pas de volume, ou le mauvais chemin** : la base vit dans la couche du conteneur et disparaît
  à la prochaine recréation.
- **Mot de passe écrit en clair dans `compose.yaml`** : ce fichier est versionné. Les valeurs
  vont dans `.env`, hors du dépôt, en `600`.
- **Mot de passe avec des caractères spéciaux dans `DATABASE_URL`** : `@`, `/` ou `:` cassent
  l’URL. Génère des secrets hexadécimaux, ou encode-les.
- **`image: postgres:latest`** : la prochaine version majeure arrivera un jour toute seule, et
  le conteneur refusera de lire des données d’une autre version majeure. Une montée de version
  majeure se prépare (sauvegarde, restauration ou `pg_upgrade`).
- **Confondre les deux `.env`** : celui de Compose sert à l’interpolation du fichier
  `compose.yaml` ; il n’est pas transmis tel quel aux conteneurs. Seul ce qui figure dans
  `environment` (ou `env_file`) y entre.

## Exercices

### Exercice 1 — Prévoir le démarrage

Pour chaque modification de `compose.yaml` (une à la fois, sur un projet neuf sans volume),
prévois ce que montre `docker compose ps -a` une minute après `docker compose up -d`, et ce qui
se passe lors d’un `docker compose down` suivi d’un `up -d`.

1. Le bloc `volumes` du service `db` est supprimé.
2. La condition de `migrate` sur `db` devient `service_started`.
3. Dans `.env`, `APP_VERSION=1.0.1`, alors qu’aucune image `guestbook:1.0.1` n’a été construite.

:::solution
1. Tout démarre normalement, les données allant dans un volume anonyme. Après `down` (qui
   supprime les conteneurs), `up -d` crée un nouveau volume anonyme : base vide, et `migrate`
   réapplique `001_init.sql`. Les messages ont disparu de l’application (ils dorment dans un
   volume orphelin qu’il faudrait retrouver parmi des identifiants sans nom).
2. Selon la vitesse de la machine, `migrate` peut échouer avec `ECONNREFUSED` pendant
   l’initialisation de PostgreSQL : `migrate` apparaît en `Exited (1)`, et l’API n’est pas
   démarrée (sa condition `service_completed_successfully` n’est pas remplie). Sur une base
   déjà initialisée, le démarrage est plus rapide et l’erreur peut ne pas se produire : c’est
   précisément ce qui rend ce défaut traître.
3. Compose ne trouve pas l’image localement et tente de la télécharger depuis Docker Hub ;
   l’opération échoue (aucune image publique de ce nom). Rien n’est remplacé : l’ancienne
   version continue de tourner si elle tournait.

:::

### Exercice 2 — Accéder à la base sans l’exposer

Un collègue veut ouvrir la base de production dans son client graphique. Il propose d’ajouter
`ports: ["5432:5432"]` au service `db`. Explique le risque, puis propose deux façons de faire
qui n’exposent pas la base à Internet.

:::solution
`5432:5432` publie PostgreSQL sur toutes les interfaces du serveur. Le pare-feu `ufw` ne le
protège pas, car Docker redirige le trafic avant ses règles. La base devient la cible des robots
qui essaient des mots de passe ; seule l’authentification la protège encore.

1. **Sans aucun port** : `docker compose exec db psql -U guestbook -d guestbook` depuis une
   session SSH sur le serveur. Pour un export, `pg_dump` dans le conteneur (leçon 6).
2. **Port publié sur la boucle locale seulement**, `ports: ["127.0.0.1:5432:5432"]`, puis un
   tunnel SSH depuis le poste du collègue :
   `ssh -L 5433:127.0.0.1:5432 deploy@serveur` ; le client graphique se connecte alors à
   `localhost:5433`. Le trafic est chiffré par SSH et seuls les comptes SSH y ont accès.

Dans les deux cas, la base reste derrière SSH. On peut en plus créer pour lui un rôle en lecture
seule.

:::

## Récapitulatif

- `compose.yaml`, versionné, décrit services, volumes et réseaux ; `docker compose up -d`
  crée ou met à jour l’ensemble dans le bon ordre.
- Variables `${VAR:?message}` remplacées par Compose depuis `.env`, créé à la main sur le
  serveur, jamais commité, en `chmod 600` ; les conteneurs reçoivent leurs variables par
  `environment`, rien n’est écrit dans l’image.
- Volume nommé monté sur `/var/lib/postgresql` (PostgreSQL 18) : les données survivent aux
  conteneurs ; `down -v` les efface.
- Réseaux : les services se joignent par leur nom ; `internal: true` pour la base ; aucun port
  publié pour PostgreSQL, et `127.0.0.1:` devant tout port d’administration.
- `depends_on` avec `service_healthy` (`pg_isready -h 127.0.0.1`) et
  `service_completed_successfully` pour le job de migration.
- Les variables `POSTGRES_*` ne servent qu’à l’initialisation : changer un mot de passe passe
  par `ALTER ROLE`, puis `.env`, puis `up -d`.
