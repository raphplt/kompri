---
title: Préparer la mise en production
summary: Configurer l’application pour la production (variables d’environnement, NODE_ENV, HTTPS et proxy), journaliser utilement, arrêter proprement, gérer dépendances et migrations, et sauvegarder la base.
durationMinutes: 65
sources:
  - title: Express — Bonnes pratiques de production (performance et fiabilité)
    url: https://expressjs.com/en/advanced/best-practice-performance/
  - title: Express — Derrière un proxy (trust proxy)
    url: https://expressjs.com/en/guide/behind-proxies/
  - title: PostgreSQL — pg_dump
    url: https://www.postgresql.org/docs/current/app-pgdump.html
  - title: Node.js — Différences entre développement et production
    url: https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production
---

## Le problème : « ça marche sur ma machine »

Sur ton ordinateur, l’application tourne en HTTP sur `localhost`, avec une base que tu peux
recréer à volonté, et tu lis les messages dans ton terminal. En production, tout change :

- elle est servie en **HTTPS**, souvent derrière un **proxy inverse** ou la plateforme d’un
  hébergeur, qui reçoit les connexions et les transmet à Node.js ;
- la configuration et les secrets viennent de la **plateforme**, pas d’un fichier `.env` ;
- personne ne regarde le terminal : les **journaux** sont collectés et consultés après coup ;
- le processus est **redémarré** à chaque déploiement, et peut l’être à tout moment ;
- les données sont **réelles** : les perdre est irréversible.

Cette leçon passe en revue ce qu’il faut préparer, et termine par une liste de vérifications.
Elle ne traite pas d’un hébergeur particulier : les principes valent partout.

## `NODE_ENV` et la configuration de production

`NODE_ENV=production` est une **convention** largement suivie par l’écosystème Node.js. Express,
par exemple, n’affiche plus la pile d’erreur dans son gestionnaire par défaut (tu l’as observé
en « Sécurité web »). Dans notre projet, `loadConfig` en déduit aussi des réglages :

| Réglage | Développement | Production |
| --- | --- | --- |
| `secureCookies` | `false` (HTTP sur `localhost`) | `true` : cookie `Secure` |
| HSTS | absent | `Strict-Transport-Security: max-age=31536000` |
| `APP_ORIGIN` | `http://localhost:…` accepté | doit commencer par `https://` |

Une configuration incohérente **empêche le démarrage** :

```bash
NODE_ENV=production DATABASE_URL=postgres://app@db.internal/taskboard \
  APP_ORIGIN=http://taches.example.fr node src/server.js
```

```text
Error: Configuration invalide :
- APP_ORIGIN doit être une adresse https:// en production
```

(précédé de l’emplacement de l’erreur dans `config.js`, avec un code de sortie 1). Mieux vaut un
déploiement qui échoue tout de suite qu’une application qui démarre avec des cookies
transmissibles en clair.

Les variables à fournir à la plateforme sont celles de `.env.example` : `NODE_ENV`, `PORT`
(souvent imposé par l’hébergeur), `DATABASE_URL`, `APP_ORIGIN`, `TRUST_PROXY`. Le mot de passe de
la base n’apparaît que dans `DATABASE_URL`, saisi dans l’interface de l’hébergeur ou son
gestionnaire de secrets, jamais dans le dépôt.

## HTTPS, proxy et `trust proxy`

Le plus souvent, Node.js ne gère pas lui-même HTTPS : un proxy inverse (ou le répartiteur de
charge de l’hébergeur) termine la connexion chiffrée et transmet la requête en HTTP sur le réseau
interne. Il ajoute des en-têtes comme `X-Forwarded-For` (l’adresse IP du client) et
`X-Forwarded-Proto` (`https`).

Par défaut, Express **ignore** ces en-têtes : n’importe quel client pourrait les écrire.
`req.ip` vaut alors l’adresse du proxy, la même pour tout le monde, et notre limiteur de
connexion bloquerait tous les utilisateurs ensemble. Le réglage `trust proxy` indique combien
de proxys de confiance se trouvent devant l’application. Essai avec un en-tête
`X-Forwarded-For: 203.0.113.7` envoyé sur une connexion ratée :

```text
TRUST_PROXY=0: {"ip":"127.0.0.1", …,"message":"login failed"}
TRUST_PROXY=1: {"ip":"203.0.113.7", …,"message":"login failed"}
```

Avec `TRUST_PROXY=1`, Express prend l’adresse fournie par le dernier proxy. Ne l’active **que**
si un proxy existe vraiment : sans proxy, un attaquant changerait d’adresse apparente à chaque
requête et contournerait le limiteur. La valeur exacte dépend de ton hébergeur ; sa
documentation l’indique.

En production, avec `NODE_ENV=production`, `APP_ORIGIN=https://taches.example.fr` et
`TRUST_PROXY=1`, une connexion réussie renvoie :

```text
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=31536000
Set-Cookie: sid=9izpZ4uKBraWuVvxz7OotpCbqUiZtKp3riWiT74L3PI; Max-Age=604800; Path=/; Expires=Sun, 29 Nov 2026 08:05:18 GMT; HttpOnly; Secure; SameSite=Lax
```

Le cookie porte désormais `Secure`, et HSTS demande au navigateur de ne plus jamais utiliser HTTP
pour ce domaine pendant un an.

## Des journaux exploitables

L’application écrit une ligne JSON par événement sur la sortie standard. C’est la plateforme qui
les collecte, les conserve et permet de les filtrer. Extrait réel en production :

```text
{"port":3491,"env":"production","time":"2026-11-22T08:05:16.883Z","level":"info","message":"server started"}
{"count":0,"time":"2026-11-22T08:05:16.890Z","level":"info","message":"expired sessions deleted"}
{"userId":1,"time":"2026-11-22T08:05:18.187Z","level":"info","message":"login succeeded"}
{"method":"POST","path":"/api/auth/login","status":200,"durationMs":421,"userId":null,"time":"2026-11-22T08:05:18.190Z","level":"info","message":"request"}
{"ip":"203.0.113.7","time":"2026-11-22T08:05:18.633Z","level":"warn","message":"login failed"}
{"method":"POST","path":"/api/auth/login","status":401,"durationMs":436,"userId":null,"time":"2026-11-22T08:05:18.634Z","level":"info","message":"request"}
```

Ce qu’on y trouve, et pourquoi :

- **le démarrage**, avec l’environnement : on sait quelle version de la configuration tourne ;
- **une ligne par requête** : méthode, chemin **sans** chaîne de requête, statut, durée,
  utilisateur. On repère les erreurs 500, les routes lentes, les rafales de 401 ;
- **les événements de sécurité** : inscriptions, connexions réussies et ratées avec l’adresse IP.
  Une rafale de `login failed` depuis une même adresse signale une attaque (A09 du Top 10) ;
- **les erreurs** avec leur pile, côté serveur uniquement ;
- **jamais** de mot de passe, de cookie, de jeton, d’e-mail tenté ni de corps de requête.

Le niveau (`info`, `warn`, `error`) permet de filtrer, et d’alerter sur `error`.

## Vérifier l’état : la route de santé

`GET /api/health` exécute `SELECT 1`. Les hébergeurs et les outils de surveillance l’appellent
régulièrement : si elle ne répond plus 200, l’instance est redémarrée ou retirée du trafic, et
quelqu’un est prévenu. Démarrée avec une base inexistante, l’application le signale :

```text
{"status":"unavailable"} 503
```

et le journal contient
`{"error":"database \"base_inexistante_2710\" does not exist", …,"level":"error","message":"session cleanup failed"}`.
La route ne révèle rien d’autre que « indisponible » : le détail reste dans les journaux.

## Arrêter proprement

À chaque déploiement, la plateforme envoie le signal `SIGTERM` à l’ancien processus, attend
un délai, puis le tue. `server.js` profite de ce délai :

1. `server.close()` cesse d’accepter de nouvelles connexions et attend la fin des requêtes en
   cours ;
2. ensuite seulement, `pool.end()` ferme les connexions à PostgreSQL ;
3. le processus n’a plus rien à faire et se termine de lui-même.

```text
{"signal":"SIGTERM","time":"2026-11-22T08:05:18.646Z","level":"info","message":"shutdown requested"}
{"time":"2026-11-22T08:05:18.646Z","level":"info","message":"shutdown complete"}
```

Sans cela, une requête en plein enregistrement serait coupée, et l’utilisateur recevrait une
erreur réseau au pire moment. `clearInterval(cleanup)` est indispensable : un minuteur actif
garderait le processus en vie.

## Dépendances et installation

- **Installer exactement ce qui a été testé** : `npm ci` installe les versions de
  `package-lock.json`, et échoue si ce fichier ne correspond plus à `package.json`.
- **Sans outils de développement** : `npm ci --omit=dev` n’installe pas les `devDependencies`.
  Notre projet n’en a pas ; sur le projet, la commande affiche
  `added 79 packages, and audited 80 packages` (Express, `pg` et leurs dépendances).
- **Vérifier les failles connues** : `npm audit` doit afficher `found 0 vulnerabilities`, ou
  chaque avis restant doit être lu et justifié.
- **Version de Node.js** : la même qu’en développement (champ `engines`).

## Les migrations au déploiement

L’ordre d’un déploiement :

1. sauvegarder la base (section suivante) ;
2. `npm ci --omit=dev` ;
3. `npm run db:migrate` (idempotent : sans effet si tout est appliqué) ;
4. démarrer la nouvelle version avec `npm start` ;
5. vérifier `GET /api/health` et les journaux.

Une migration doit rester compatible avec la version **précédente** du code pendant le court
moment où les deux coexistent : ajouter une colonne facultative est sans risque ; supprimer ou
renommer une colonne utilisée se fait en deux déploiements (le code cesse d’abord de l’utiliser).

Idéalement, les migrations s’exécutent avec un rôle PostgreSQL propriétaire des tables, et
l’application avec un rôle qui n’a que `SELECT`, `INSERT`, `UPDATE`, `DELETE` : le moindre
privilège vu en « Sécurité web ».

## Sauvegarder et, surtout, restaurer

Une sauvegarde qu’on n’a jamais restaurée n’est qu’un espoir. `pg_dump` exporte une base
cohérente pendant qu’elle fonctionne ; le format `custom` est compressé et se restaure avec
`pg_restore` :

```bash
mkdir -p backups
pg_dump --format=custom --file=backups/taskboard-2026-11-21.dump taskboard
createdb taskboard_restore_test
pg_restore --dbname=taskboard_restore_test --no-owner backups/taskboard-2026-11-21.dump
psql taskboard_restore_test -c "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM tasks) AS tasks, (SELECT count(*) FROM schema_migrations) AS migrations"
```

```text
 users | tasks | migrations
-------+-------+------------
     2 |     3 |          1
(1 row)
```

Les nombres sont ceux de notre base d’essai : compare-les à ceux de ta base d’origine.
`--no-owner` évite d’exiger que les rôles propriétaires existent sur la base de destination.

Les règles qui rendent une sauvegarde utile :

- **régulière et automatique** (par exemple chaque nuit), plus une sauvegarde juste avant chaque
  déploiement ;
- **hors du serveur** : un disque qui lâche ou un serveur compromis ne doit pas emporter les
  sauvegardes ;
- **protégée** : un fichier de sauvegarde contient des données personnelles et les empreintes
  des mots de passe. Accès restreint, chiffrement au repos, jamais dans le dépôt Git
  (`backups/` est dans `.gitignore`) ;
- **conservée** pendant une durée décidée (puis supprimée : garder indéfiniment des données
  personnelles a aussi un coût et des obligations) ;
- **restaurée régulièrement** dans une base de test, en mesurant le temps nécessaire.

## La liste de vérifications avant la mise en ligne

- `npm test` passe ; `npm audit` est propre ou justifié.
- Variables définies sur la plateforme : `NODE_ENV=production`, `DATABASE_URL`,
  `APP_ORIGIN` en `https://`, `TRUST_PROXY` adapté ; aucun secret dans le dépôt.
- HTTPS actif ; cookie `Secure` et en-tête HSTS observés dans une vraie réponse.
- Rôle PostgreSQL de l’application au moindre privilège ; base non exposée à Internet.
- Migrations appliquées ; sauvegarde faite juste avant.
- `GET /api/health` surveillé ; journaux collectés et consultables.
- Sauvegardes automatiques hors du serveur, et une restauration testée.
- Parcours manuel rejoué sur la version déployée (inscription, tâches, déconnexion).

## Pièges et idées reçues

- **`NODE_ENV=Production`** : la comparaison est sensible à la casse. `loadConfig` le traite
  alors comme du développement : cookies sans `Secure`, pas de HSTS. Vérifie la valeur exacte.
- **Un `.env` copié sur le serveur « pour aller vite »** : il finit dans une archive, une image,
  une sauvegarde. Utilise le mécanisme de secrets de la plateforme.
- **`trust proxy` à `true` par facilité** : Express ferait alors confiance à toute la chaîne
  `X-Forwarded-For`, que le client peut préremplir. Indique le nombre exact de proxys.
- **Journaliser `req.body` pour déboguer un incident** : les mots de passe arrivent dans les
  journaux, qui sont conservés et partagés. Ajoute un champ précis, pas l’objet entier.
- **« On a des sauvegardes »** sans jamais avoir restauré : tu découvriras le problème le jour
  où tu en auras besoin.

## Exercices

### Exercice 1 — Relire une configuration

Un collègue prépare ces variables pour la production. Que se passe-t-il au démarrage ? Une fois
corrigé, que valent `secureCookies`, `trustProxy` et `port` ? Et si `NODE_ENV` valait
`Production` ?

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://app:secret@db.internal:5432/taskboard
APP_ORIGIN=http://taches.example.fr
TRUST_PROXY=1
```

:::solution
Le démarrage échoue (code de sortie 1) :

```text
Error: Configuration invalide :
- APP_ORIGIN doit être une adresse https:// en production
```

Avec `APP_ORIGIN=https://taches.example.fr`, `loadConfig` renvoie `secureCookies: true`,
`trustProxy: 1` et `port: 8080` (des nombres : `Number` a converti les chaînes de
l’environnement). `postgresql://` est accepté comme `postgres://`.

Avec `NODE_ENV=Production`, `isProduction` et `secureCookies` valent `false` : aucune erreur,
mais une application de production qui se croit en développement. Une amélioration possible :
refuser toute valeur de `NODE_ENV` autre que `development`, `test` ou `production`. Remarque
aussi que ce fichier contient un mot de passe : il ne doit exister que dans l’outil de secrets
de l’hébergeur.

:::

### Exercice 2 — Un script de sauvegarde

Écris `scripts/backup.sh`, qui crée une sauvegarde datée (heure UTC) au format `custom` dans
`BACKUP_DIR` (par défaut `backups`), affiche le fichier écrit et sa taille, puis supprime les
sauvegardes de **ce projet** vieilles de plus de 14 jours, sans toucher aux autres fichiers. Il
s’arrête avec une erreur si `DATABASE_URL` n’est pas défini.

:::solution
```bash
#!/usr/bin/env bash
# scripts/backup.sh — sauvegarde datée de la base, conservation 14 jours
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL doit être défini}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR"

file="$BACKUP_DIR/taskboard-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
pg_dump --format=custom --file="$file" "$DATABASE_URL"
echo "Sauvegarde écrite : $file ($(du -h "$file" | cut -f1))"

# Supprime les sauvegardes de plus de 14 jours, et seulement elles
find "$BACKUP_DIR" -maxdepth 1 -name 'taskboard-*.dump' -mtime +14 -print -delete
```

Essai dans un dossier qui contient une sauvegarde de 20 jours, une de 3 jours et un fichier
`notes.txt` de 30 jours (`chmod +x scripts/backup.sh` d’abord) :

```text
Sauvegarde écrite : backups/taskboard-2026-11-22T080529Z.dump (8.0K)
backups/taskboard-2026-11-01T020000Z.dump
```

La seconde ligne est l’ancienne sauvegarde supprimée (`-print`). Il reste la sauvegarde de
3 jours, la nouvelle et `notes.txt`. Sans `DATABASE_URL`, le script s’arrête avec
`DATABASE_URL: DATABASE_URL doit être défini` et le code de sortie 1.

- `set -euo pipefail` arrête le script à la première erreur, sur une variable non définie ou
  une commande ratée dans un tube : un `pg_dump` en échec n’est pas suivi d’une suppression.
- Le motif `taskboard-*.dump` et `-maxdepth 1` limitent la suppression aux seules sauvegardes du
  projet. Avant d’ajouter `-delete`, lance toujours la commande avec `-print` seul.
- Ce script écrit sur le serveur lui-même : il faut encore **copier** les sauvegardes ailleurs.

:::

### Exercice 3 — Lire les journaux d’un incident

Un matin, les journaux montrent des centaines de lignes
`{"ip":"198.51.100.23", … ,"level":"warn","message":"login failed"}` en quelques minutes, puis
des lignes `request` avec le statut 429 pour cette adresse. Que se passe-t-il ? Notre
application se défend-elle ? Que ferais-tu ?

:::solution
Il s’agit très probablement d’une attaque par force brute ou par *credential stuffing* depuis
une adresse. L’application se défend : après cinq échecs pour un même couple IP + e-mail, la
route répond 429 sans vérifier le mot de passe, et le message unique ne révèle pas quels comptes
existent. Les journaux ne contiennent ni les mots de passe essayés ni les e-mails visés.

Actions : vérifier qu’aucune ligne `login succeeded` suspecte n’apparaît pendant l’attaque
(sinon, fermer les sessions des comptes concernés) ; si les e-mails varient, ajouter une limite
par adresse IP seule (exercice de la compétence Authentification) ; bloquer l’adresse au niveau
du proxy ou de l’hébergeur ; et, si `ip` vaut toujours la même adresse interne pour tout le
monde, corriger `TRUST_PROXY`, car le limiteur bloquerait alors tous les utilisateurs.

:::

## Récapitulatif

- `NODE_ENV=production` (en minuscules) active les réglages sûrs : cookie `Secure`, HSTS,
  `APP_ORIGIN` en HTTPS ; une configuration incohérente empêche le démarrage.
- Derrière un proxy, `trust proxy` réglé sur le nombre exact de proxys donne la vraie adresse IP.
- Journaux JSON sur la sortie standard : requêtes, événements de sécurité, erreurs ; jamais de
  secrets ni de corps de requête.
- Route de santé surveillée ; arrêt propre sur `SIGTERM` (fermer le serveur, puis la base).
- `npm ci --omit=dev`, `npm audit`, même version de Node.js ; migrations idempotentes appliquées
  à chaque déploiement, compatibles avec la version précédente.
- Sauvegardes `pg_dump` régulières, hors du serveur, protégées, et restaurations testées.
