---
title: Configurer par l’environnement et protéger les secrets
summary: Séparer le code de sa configuration, valider l’environnement au démarrage pour échouer vite, et garder les secrets hors du dépôt, de l’image et des journaux.
durationMinutes: 60
sources:
  - title: The Twelve-Factor App — Configuration
    url: https://12factor.net/fr/config
  - title: OWASP — Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  - title: Node.js — process (process.env, signaux)
    url: https://nodejs.org/api/process.html
---

## Le problème : un seul code, plusieurs endroits

Ton application tourne déjà sur ta machine. Elle va bientôt tourner aussi dans un conteneur
sur ton poste, dans l’intégration continue, puis sur un serveur de production. Le **code** est
le même partout ; ce qui change, c’est la **configuration** : l’adresse de la base, le port,
le nombre de proxys devant l’application, les mots de passe.

Si ces valeurs sont écrites dans le code, il faut le modifier à chaque déploiement, et le mot de
passe de production finit dans Git. Cette compétence commence donc par la règle qui rend tout
le reste possible : **la configuration vient de l’environnement, et les secrets ne quittent
jamais l’endroit où ils sont utilisés**.

La compétence « Application full-stack » t’a fait préparer la production (variables
d’environnement, `NODE_ENV`, journaux JSON, arrêt propre). On approfondit ici : validation
stricte, cycle de vie d’un secret, et ce qu’on fait quand un secret a fui.

## L’application fil rouge : un livre d’or

Pour des listings courts, toute la compétence utilise un **livre d’or** : les visiteurs laissent
un nom et un message, la page affiche les cinquante derniers. Tout s’applique tel quel à
l’application « Tâches » de la compétence précédente.

```text
guestbook/
├── package.json, package-lock.json, .env.example, .gitignore
├── migrations/001_init.sql
├── scripts/migrate.js    commande « npm run db:migrate »
├── src/                  config.js, logger.js, migrate.js, app.js, server.js
├── public/               index.html, app.js
└── test/                 tests node:test (leçon 5)
```

Crée le projet et installe les dépendances :

```bash
mkdir guestbook && cd guestbook
npm init -y
npm install express@5 pg
mkdir -p migrations scripts src public test
```

Remplace `package.json` par ce contenu, en gardant les numéros de version que `npm install` a
inscrits chez toi :

```json
{
  "name": "guestbook",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch --env-file=.env src/server.js",
    "db:migrate": "node --env-file-if-exists=.env scripts/migrate.js",
    "test": "node --env-file-if-exists=.env.test --test --test-concurrency=1 \"test/**/*.test.js\""
  },
  "dependencies": {
    "express": "^5.3.0",
    "pg": "^8.23.1"
  }
}
```

Le schéma, dans `migrations/001_init.sql` :

```sql
-- 001_init.sql — messages du livre d’or
CREATE TABLE messages (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 50),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Copie sans les modifier `src/migrate.js` et `scripts/migrate.js` de la compétence « Application
full-stack » (leçon 1) : l’exécuteur de migrations idempotent, qui note les fichiers appliqués
dans `schema_migrations`.

### La configuration, en un seul endroit

```js
// src/config.js — toute la configuration vient de l’environnement, validée au démarrage
const NODE_ENVS = ['development', 'test', 'production'];

export function loadConfig(env = process.env) {
  const errors = [];

  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV doit valoir ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT doit être un entier entre 1 et 65535');
  }

  // Aucune valeur par défaut : sans base, l’application ne sert à rien
  const databaseUrl = env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL doit commencer par postgres:// ou postgresql://');
  }

  // Nombre de proxys inverses de confiance devant l’application (0 sans proxy)
  const trustProxy = Number(env.TRUST_PROXY ?? 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) {
    errors.push('TRUST_PROXY doit être un entier positif ou nul');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration invalide :\n- ${errors.join('\n- ')}`);
  }

  return Object.freeze({
    nodeEnv,
    port,
    databaseUrl,
    trustProxy,
    version: env.APP_VERSION ?? 'dev',
  });
}
```

Par rapport à la version de la compétence précédente, deux durcissements :

- `NODE_ENV` est comparé à une **liste blanche**. `Production` (avec une majuscule) n’est plus
  traité silencieusement comme du développement : il bloque le démarrage.
- `DATABASE_URL` n’a **aucune valeur par défaut**. Une valeur par défaut est acceptable pour
  un réglage anodin (`PORT`), jamais pour une ressource ou un secret : l’application se
  connecterait sans prévenir à une mauvaise base.

`APP_VERSION`, non secret, indiquera la version dans les journaux (leçon 2).

### Journaux, routes et démarrage

Copie `src/logger.js` de « Application full-stack ». Une seule modification : le journal des
requêtes note l’adresse IP et le protocole au lieu de l’utilisateur (il n’y a pas de comptes
ici), ce qui servira derrière un proxy (leçon 4).

```diff
         durationMs: Math.round(performance.now() - start),
-        userId: req.user?.id ?? null,
+        ip: req.ip,
+        protocol: req.protocol,
```

```js
// src/app.js — assemble l’application sans la démarrer (testable)
import path from 'node:path';
import express from 'express';
import { requestLogger } from './logger.js';

function readText(value, max) {
  const text = String(value ?? '').trim();
  return text.length >= 1 && text.length <= max ? text : null;
}

export function createApp({ pool, config, log }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  app.use(requestLogger(log));
  app.use(express.static(path.join(import.meta.dirname, '..', 'public')));
  app.use(express.json({ limit: '10kb' }));

  // Vivacité : le processus répond, sans dépendre de la base
  app.get('/api/health/live', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Disponibilité : l’application peut servir des requêtes, base comprise
  app.get('/api/health/ready', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (error) {
      log('error', 'readiness check failed', { error: error.message });
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.get('/api/messages', async (req, res) => {
    const result = await pool.query(
      'SELECT id, author, body, created_at FROM messages ORDER BY id DESC LIMIT 50',
    );
    res.json(result.rows);
  });

  app.post('/api/messages', async (req, res) => {
    const author = readText(req.body?.author, 50);
    const body = readText(req.body?.body, 500);
    if (!author || !body) {
      return res.status(400).json({ error: 'Nom (1 à 50 caractères) et message (1 à 500) requis' });
    }
    const result = await pool.query(
      'INSERT INTO messages (author, body) VALUES ($1, $2) RETURNING id, author, body, created_at',
      [author, body],
    );
    res.status(201).json(result.rows[0]);
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  app.use((error, req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    log('error', 'unhandled error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}
```

Le gestionnaire d’erreurs nomme son quatrième paramètre `_next` : Express a besoin des quatre
paramètres pour le reconnaître, et le `_` signale qu’il est volontairement inutilisé (l’outil de
vérification de la leçon 5 en tiendra compte). Les deux routes de santé seront expliquées à la
leçon 6 ; retiens pour l’instant que `/api/health/ready` interroge la base.

```js
// src/server.js — point d’entrée : configuration, base, serveur, arrêt propre
import pg from 'pg';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createApp } from './app.js';

const log = createLogger();

let config;
try {
  config = loadConfig();
} catch (error) {
  // Échec rapide : on refuse de démarrer avec une configuration invalide
  log('error', 'invalid configuration', { error: error.message });
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: config.databaseUrl });
pool.on('error', (error) => log('error', 'postgres pool error', { error: error.message }));

const app = createApp({ pool, config, log });
const server = app.listen(config.port, (error) => {
  if (error) {
    log('error', 'listen failed', { error: error.message });
    process.exit(1);
  }
  log('info', 'server started', { port: config.port, env: config.nodeEnv, version: config.version });
});

// Arrêt propre : Docker envoie SIGTERM, attend 10 secondes, puis envoie SIGKILL
function shutdown(signal) {
  log('info', 'shutdown requested', { signal });
  server.close(async () => {
    await pool.end();
    log('info', 'shutdown complete');
  });
  // Filet de sécurité : ne jamais dépasser le délai accordé
  setTimeout(() => {
    log('error', 'shutdown timeout, forcing exit');
    process.exit(1);
  }, 8000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
```

Le minuteur de 8 secondes est un filet de sécurité : si une requête traîne, le processus
s’arrête quand même **avant** que Docker ne le tue de force (leçon 2). `.unref()` empêche ce
minuteur de garder à lui seul le processus en vie. Le journal de démarrage contient le port,
l’environnement et la version, **jamais** `DATABASE_URL`, qui contient un mot de passe.

### L’interface

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Livre d’or</title>
    <script type="module" src="app.js"></script>
  </head>
  <body>
    <main>
      <h1>Livre d’or</h1>
      <form id="message-form">
        <label for="author">Ton nom</label>
        <input id="author" name="author" required maxlength="50">
        <label for="body">Ton message</label>
        <textarea id="body" name="body" required maxlength="500"></textarea>
        <button>Publier</button>
        <p id="status" role="status"></p>
      </form>
      <ul id="messages"></ul>
    </main>
  </body>
</html>
```

```js
// public/app.js — affiche les messages et envoie le formulaire
const form = document.querySelector('#message-form');
const list = document.querySelector('#messages');
const status = document.querySelector('#status');

async function loadMessages() {
  const response = await fetch('/api/messages');
  const messages = await response.json();
  list.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = `${message.author} : ${message.body}`; // jamais innerHTML
      return item;
    }),
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  status.textContent = response.ok ? 'Message publié' : 'Échec de la publication';
  if (response.ok) {
    form.reset();
    await loadMessages();
  }
});

loadMessages().catch(() => {
  status.textContent = 'Impossible de charger les messages';
});
```

Un script `type="module"` est différé : il s’exécute après l’analyse du HTML.

## La configuration selon les douze facteurs

*The Twelve-Factor App* est un ensemble de recommandations, publié par des praticiens, pour
écrire des applications faciles à déployer. Ce n’est pas une norme, mais un **consensus**
largement suivi. Son troisième facteur dit : stocke la configuration dans l’environnement. Il
propose un test simple : pourrais-tu rendre ton dépôt public à l’instant, sans exposer
aucun identifiant ?

Concrètement, distingue trois choses :

| Nature | Exemples | Où elle vit |
| --- | --- | --- |
| Code | routes, requêtes SQL, règles de validation | le dépôt Git |
| Configuration | `PORT`, `NODE_ENV`, `TRUST_PROXY` | l’environnement du processus |
| Secret (configuration sensible) | mot de passe de la base, clé d’API | l’environnement, alimenté par un emplacement protégé |

La même image, le même commit, tournent partout ; seules les variables changent. C’est aussi
ce qui rend le retour arrière simple : on relance l’ancienne version avec la même configuration.

D’autres facteurs reviendront : les **journaux** sont un flux écrit sur la sortie standard,
les processus sont **jetables** (démarrage rapide, arrêt propre sur `SIGTERM`).

## Valider au démarrage et échouer vite

Lance le serveur sans configuration :

```bash
node src/server.js; echo "code de sortie : $?"
```

```text
{"error":"Configuration invalide :\n- DATABASE_URL doit commencer par postgres:// ou postgresql://","time":"2026-11-24T14:00:16.138Z","level":"error","message":"invalid configuration"}
code de sortie : 1
```

Puis avec plusieurs erreurs à la fois :

```bash
NODE_ENV=Production PORT=abc node src/server.js
```

```text
{"error":"Configuration invalide :\n- NODE_ENV doit valoir development, test, production\n- PORT doit être un entier entre 1 et 65535\n- DATABASE_URL doit commencer par postgres:// ou postgresql://","time":"2026-11-24T14:00:16.039Z","level":"error","message":"invalid configuration"}
```

Ce comportement s’appelle **échouer vite** (*fail fast*) :

- l’erreur apparaît **au déploiement**, pas trois jours plus tard ;
- le message est **lisible** par la personne qui déploie, et liste **toutes** les erreurs d’un
  coup ;
- le **code de sortie 1** permet aux outils (Docker, l’intégration continue) de détecter
  l’échec et de ne pas remplacer une version qui fonctionne par une version cassée.

`process.exit(1)` est acceptable ici : rien n’est encore en cours.

:::note[Ce qu’on ne valide pas au démarrage]
`loadConfig` vérifie la **forme** de `DATABASE_URL`, pas que la base répond. Une base
temporairement indisponible ne doit pas empêcher le démarrage : la route `/api/health/ready`
répondra 503 jusqu’à son retour. Une configuration fausse, elle, ne se corrigera jamais seule.

:::

## Les fichiers `.env` : pratiques en local, jamais versionnés

En développement, taper toutes les variables à chaque lancement serait pénible. Node.js lit un
fichier `.env` avec `--env-file` (script `dev`) ou `--env-file-if-exists` (scripts
`db:migrate` et `test`, qui doivent aussi fonctionner sans fichier, en intégration continue).

Le dépôt contient un **modèle**, `.env.example`, avec des valeurs factices :

```bash
# Copie ce fichier en .env et remplace les valeurs. Ne versionne jamais .env.

# --- Application lancée avec « npm run dev » ---
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres@localhost:5432/guestbook
# Nombre de proxys inverses de confiance devant l’application (0 sans proxy)
TRUST_PROXY=0

# --- Docker Compose (serveur ou atelier local) ---
APP_VERSION=1.0.0
# Génère-le avec : openssl rand -hex 32
POSTGRES_PASSWORD=remplace-moi
SITE_ADDRESS=localhost
```

La seconde partie servira à partir de la leçon 3. Le `.gitignore` exclut tous les fichiers
`.env`, sauf le modèle :

```text
node_modules/
.env
.env.*
!.env.example
backups/
```

La ligne `!.env.example` est une **exception** : elle réintègre ce fichier, que `.env.*` avait
exclu. Vérifie la règle qui s’applique à chaque fichier avec `git check-ignore -v` :

```bash
git check-ignore -v .env .env.test .env.example
```

```text
.gitignore:2:.env	.env
.gitignore:3:.env.*	.env.test
.gitignore:4:!.env.example	.env.example
```

Chaque ligne donne le fichier `.gitignore`, le numéro de ligne et la règle qui a décidé. Pour
`.env.example`, c’est l’exception `!.env.example` : le `!` signifie que le fichier n’est **pas**
ignoré, il sera versionné. Pour finir, crée la base, copie le modèle et lance l’application :

```bash
createdb guestbook
cp .env.example .env
npm run db:migrate
npm run dev
```

Dans un autre terminal :

```bash
curl -s localhost:3000/api/health/ready; echo
curl -s -X POST localhost:3000/api/messages -H 'Content-Type: application/json' \
  -d '{"author":"Ada","body":"Bravo"}'; echo
curl -s localhost:3000/api/messages; echo
```

```text
{"status":"ok"}
{"id":1,"author":"Ada","body":"Bravo","created_at":"2026-11-24T14:00:21.252Z"}
[{"id":1,"author":"Ada","body":"Bravo","created_at":"2026-11-24T14:00:21.252Z"}]
```

## Qu’est-ce qu’un secret ?

Un **secret** est une valeur qui donne un accès ou un pouvoir : mot de passe de la base, clé
d’API d’un service de paiement ou d’envoi de courriels, clé de signature de jetons, clé SSH du
serveur, jeton d’accès à un registre d’images. Quiconque le lit peut agir **à ta place**.

Un secret ne doit apparaître :

- ni dans le **dépôt Git** : copié sur chaque poste et chaque sauvegarde, il reste dans
  l’**historique** même après suppression ;
- ni dans une **image Docker** : ses couches et ses métadonnées se lisent (leçon 2) ;
- ni dans les **journaux** : conservés, transmis à des outils, lus par plus de monde ;
- ni dans une **URL** ou un **message d’erreur** renvoyé au client ;
- ni dans une conversation, un ticket ou une question posée à un assistant d’IA : remplace les
  valeurs par `…` avant de partager.

## Où vivent les secrets

Le secret doit exister **là où il sert**, et nulle part ailleurs :

- **en développement** : dans `.env`, sur ton poste, avec des valeurs propres au développement
  (jamais celles de la production) ;
- **sur le serveur** : dans un fichier de configuration lisible par le seul compte qui déploie
  (`chmod 600`), créé à la main sur le serveur, hors du dépôt (leçon 3), ou dans le gestionnaire
  de secrets de l’hébergeur s’il en propose un ;
- **en intégration continue** : dans les secrets chiffrés du dépôt GitHub, injectés au moment du
  job (leçon 5).

Chaque environnement a **ses propres** secrets. Si le mot de passe de développement fuit, la
production n’est pas touchée.

Pour générer un secret, laisse faire la machine :

```bash
openssl rand -hex 32
```

```text
e74ad3b378651dd0a717ed79b6f651b8192c21de288fd957f76302f07b1a243d
```

(ta valeur sera différente). 32 octets aléatoires en hexadécimal : aucun caractère spécial à
échapper quand le mot de passe est placé dans une URL comme `DATABASE_URL`.

## La rotation : changer un secret sans tout casser

**Faire tourner** (*rotate*) un secret, c’est le remplacer par une nouvelle valeur et
invalider l’ancienne. On le fait :

- **immédiatement** quand il a fui, ou qu’on le soupçonne ;
- quand une personne qui le connaissait quitte le projet ;
- **régulièrement**, selon la politique de l’équipe, pour limiter la durée d’utilité d’une fuite
  passée inaperçue.

L’ordre compte. Pour le mot de passe d’une base : d’abord le changer **dans PostgreSQL**
(`ALTER ROLE`), puis mettre à jour la variable de l’application, puis redémarrer
l’application. Dans l’autre ordre, l’application ne peut plus se connecter entre-temps. La
leçon 3 fait l’exercice avec Docker Compose.

Une rotation n’est simple que si le secret est rangé **à un seul endroit** : un secret copié
dans le code, une image et trois scripts est un secret qu’on n’ose plus changer.

## Un secret a fui : que faire ?

Démonstration dans un dépôt d’essai : on commite un `.env` par erreur, on s’en aperçoit, on le
retire.

```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Retire .env du dépôt"
```

`git rm --cached` retire le fichier de l’index sans l’effacer du disque. Le dernier commit ne le
contient plus. Mais l’**historique**, si :

```bash
git log --oneline -- .env
git show HEAD~1:.env
```

```text
10c02c1 Retire .env du dépôt
e63dd4d Premier commit
DATABASE_URL=postgres://app:MotDePasse42@db.internal:5432/guestbook
```

(tes empreintes de commits seront différentes). Si ce dépôt a été poussé, le mot de passe est
**compromis** : quelqu’un a pu cloner, un robot a pu le lire. La procédure :

1. **Faire tourner le secret** tout de suite. C’est la seule mesure qui protège réellement.
2. Vérifier dans les journaux de la ressource (connexions à la base, appels à l’API) qu’il n’a
   pas été utilisé.
3. Retirer le fichier du suivi et compléter `.gitignore`, comme ci-dessus.
4. Éventuellement réécrire l’historique pour en effacer la valeur. C’est utile, mais ça ne
   remplace jamais l’étape 1 : les clones existants gardent l’ancienne valeur.

`git log -p -S 'MotDePasse42'` liste les commits qui ajoutent ou retirent une chaîne : pratique
pour vérifier qu’une valeur n’a jamais été commitée. Des outils de détection automatique
existent aussi (l’analyse de secrets de GitHub, par exemple).

## Pièges et idées reçues

- **« Le dépôt est privé, ce n’est pas grave. »** Il est copié sur chaque poste et dans des
  sauvegardes, et peut devenir public par erreur.
- **Une valeur par défaut pour un secret** (`process.env.DB_PASSWORD ?? 'postgres'`) : en
  production, une variable oubliée fait démarrer l’application avec un mot de passe connu de
  tous. Pas de défaut : échec au démarrage.
- **Journaliser la configuration au démarrage** (`log('info', 'config', config)`) pour
  « vérifier » : le mot de passe contenu dans `DATABASE_URL` part dans les journaux. Journalise
  des champs choisis, jamais l’objet entier.
- **Le même mot de passe en développement et en production** : la fuite d’un poste devient
  une fuite de production.

## Exercices

### Exercice 1 — Prévoir le démarrage

Pour chaque environnement, prévois si `node src/server.js` démarre, et sinon le message exact.
Pour ceux qui démarrent, donne `port`, `trustProxy` et `version`.

1. `DATABASE_URL=postgresql://app@db/guestbook PORT=8080`
2. `DATABASE_URL=mysql://app@db/guestbook TRUST_PROXY=-1`
3. `DATABASE_URL=postgres://app@db/guestbook NODE_ENV=prod APP_VERSION=1.2.0`
4. `DATABASE_URL=postgres://app@db/guestbook PORT=3000.5`

:::solution
1. Démarre : `port` vaut `8080` (nombre), `trustProxy` `0` (défaut), `version` `'dev'` (défaut).
   `postgresql://` est accepté par l’expression régulière `postgres(ql)?`.
2. Refusé, avec les deux erreurs d’un coup :
   `Configuration invalide :\n- DATABASE_URL doit commencer par postgres:// ou postgresql://\n- TRUST_PROXY doit être un entier positif ou nul`
   (dans le champ `error` de la ligne JSON, code de sortie 1).
3. Refusé : `- NODE_ENV doit valoir development, test, production`. `prod` n’est pas dans la
   liste blanche. Sans cette liste, l’application aurait démarré en se croyant en développement.
4. Refusé : `- PORT doit être un entier entre 1 et 65535`. `Number('3000.5')` vaut `3000.5`,
   que `Number.isInteger` rejette.

Vérifie en lançant chaque ligne devant `node src/server.js` (dans un terminal où ces variables
ne sont pas déjà définies).

:::

### Exercice 2 — Une clé d’API obligatoire en production

Le livre d’or doit envoyer un courriel de modération par un service externe. Ajoute à
`loadConfig` une variable `MAIL_API_KEY` : obligatoire (au moins 20 caractères) quand
`NODE_ENV` vaut `production`, facultative sinon. Écris deux tests `node:test` qui le
prouvent. Que doit contenir `.env.example` ?

:::solution
Dans `loadConfig`, après la validation de `NODE_ENV` :

```js
const mailApiKey = env.MAIL_API_KEY ?? null;
if (nodeEnv === 'production' && (mailApiKey === null || mailApiKey.length < 20)) {
  errors.push('MAIL_API_KEY (20 caractères au moins) est obligatoire en production');
}
```

et `mailApiKey` dans l’objet renvoyé. Les tests, dans `test/config.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

const base = { DATABASE_URL: 'postgres://app@localhost:5432/guestbook' };

test('MAIL_API_KEY est obligatoire en production', () => {
  assert.throws(
    () => loadConfig({ ...base, NODE_ENV: 'production' }),
    /MAIL_API_KEY \(20 caractères au moins\) est obligatoire en production/,
  );
});

test('MAIL_API_KEY est facultative en développement', () => {
  assert.equal(loadConfig(base).mailApiKey, null);
});
```

`npm test` affiche deux lignes `✔` de plus. Dans `.env.example`, une ligne
`MAIL_API_KEY=` vide, avec un commentaire indiquant où obtenir la clé : on documente
**l’existence** de la variable, jamais sa valeur. Ne journalise jamais `mailApiKey`, même
partiellement.

:::

## Récapitulatif

- Le code est le même partout ; la configuration vient de l’**environnement** (troisième des
  douze facteurs) ; un secret est une configuration qui donne un accès.
- Un seul module lit et valide l’environnement : liste blanche pour `NODE_ENV`, conversions et
  bornes pour les nombres, **aucun défaut pour une ressource ou un secret**.
- **Échouer vite** : configuration invalide, message JSON lisible listant toutes les erreurs,
  code de sortie 1, avant d’accepter la moindre requête.
- `.env` pour le développement, jamais versionné ; `.env.example` versionné, valeurs factices ;
  `git check-ignore -v` pour vérifier.
- Un secret ne va ni dans Git, ni dans une image, ni dans les journaux, ni dans une URL ; il vit
  là où il sert, avec des valeurs différentes par environnement ; `openssl rand -hex 32` pour
  le générer.
- Rotation : nouvelle valeur dans la ressource, puis dans l’application, puis redémarrage. Un
  secret commité est compromis : on le fait tourner d’abord, on nettoie ensuite.
