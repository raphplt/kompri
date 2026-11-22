---
title: Construire l’API
summary: Assembler l’API Express 5 du projet — middlewares de sécurité, journaux, authentification, routes des tâches et gestion d’erreurs — et la vérifier avec curl.
durationMinutes: 75
sources:
  - title: Express — Guide du routage (express.Router)
    url: https://expressjs.com/en/guide/routing.html
  - title: Express — Gestion des erreurs
    url: https://expressjs.com/en/guide/error-handling.html
  - title: Express — Bonnes pratiques de sécurité en production
    url: https://expressjs.com/en/advanced/best-practice-security/
  - title: PostgreSQL — COALESCE
    url: https://www.postgresql.org/docs/current/functions-conditional.html
---

## Le problème : des briques connues, un ordre à respecter

Toutes les briques de l’API existent déjà dans tes compétences précédentes : routes Express,
requêtes paramétrées, hachage, sessions, contrôle d’accès, en-têtes de sécurité. Les assembler
pose deux questions nouvelles :

- **dans quel ordre** les middlewares s’exécutent-ils, et pourquoi cet ordre compte ;
- **comment découper** les routes pour que chaque fichier reste lisible.

Cette leçon écrit l’API complète du contrat défini à la leçon précédente.

## Les modules repris tels quels

Copie dans `src/` les quatre modules de la compétence « Authentification et sessions », sans
les modifier (seul le commentaire de première ligne peut changer) :

- `password.js` : `hashPassword` et `verifyPassword` (scrypt, sel, `timingSafeEqual`) ;
- `sessions.js` : `createSession`, `findSessionUser`, `deleteSession`,
  `deleteExpiredSessions`, constantes `SESSION_COOKIE` et `SESSION_DURATION_MS` ;
- `auth.js` : `readCookie`, `sessionCookieOptions`, `loadUser`, `requireAuth` ;
- `login-limiter.js` : `createLoginLimiter`.

Réutiliser du code testé plutôt que le réécrire est une compétence en soi : tu sais ce qu’il
fait, et ses tests existent.

## Sécurité et journaux

Deux middlewares transversaux, vus en « Sécurité web » :

```js
// src/security.js — en-têtes de sécurité et refus des requêtes intersites
export function securityHeaders({ hsts }) {
  return (req, res, next) => {
    res.set({
      'Content-Security-Policy':
        "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    if (hsts) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  };
}

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function checkOrigin(appOrigin) {
  return (req, res, next) => {
    if (safeMethods.has(req.method)) return next();
    const origin = req.get('Origin');
    if (origin && origin !== appOrigin) {
      return res.status(403).json({ error: 'Origine refusée' });
    }
    if (req.get('Sec-Fetch-Site') === 'cross-site') {
      return res.status(403).json({ error: 'Requête intersite refusée' });
    }
    next();
  };
}
```

```js
// src/logger.js — une ligne JSON par événement, jamais de données sensibles
export function createLogger({ silent = false } = {}) {
  return function log(level, message, fields = {}) {
    if (silent) return;
    // Les champs fixes en dernier : un champ « message » ne peut pas les écraser
    const entry = { ...fields, time: new Date().toISOString(), level, message };
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else console.log(line);
  };
}

export function requestLogger(log) {
  return (req, res, next) => {
    const start = performance.now();
    res.on('finish', () => {
      log('info', 'request', {
        method: req.method,
        path: req.originalUrl.split('?')[0], // chemin complet, sans la chaîne de requête
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
        userId: req.user?.id ?? null,
      });
    });
    next();
  };
}
```

Deux détails :

- `createLogger` renvoie une **fonction** `log`. L’application la reçoit en paramètre : les
  tests lui passeront une fonction vide pour des journaux muets.
- `req.originalUrl` plutôt que `req.path` : dans un routeur monté sur `/api/tasks`, `req.path`
  ne contient que la fin du chemin (`/2`), ce qui rendrait le journal ambigu.

## Les routes d’authentification

Un **routeur** (`express.Router()`) regroupe des routes qu’on monte ensuite sous un préfixe. Le
contenu reprend la compétence « Authentification », organisé en fabrique qui reçoit ses
dépendances :

```js
// src/routes/auth.js — inscription, connexion, déconnexion, utilisateur courant
import express from 'express';
import { hashPassword, verifyPassword } from '../password.js';
import { SESSION_COOKIE, createSession, deleteSession } from '../sessions.js';
import { requireAuth, sessionCookieOptions } from '../auth.js';
import { createLoginLimiter } from '../login-limiter.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

function readCredentials(body) {
  return {
    email: String(body?.email ?? '').trim().toLowerCase(),
    password: String(body?.password ?? ''),
  };
}

export function authRouter({ pool, secureCookies, log }) {
  const router = express.Router();
  const limiter = createLoginLimiter();
  const dummyHash = hashPassword('mot de passe factice pour égaliser les durées');
  const cookieOptions = sessionCookieOptions(secureCookies);
  const { maxAge, ...clearOptions } = cookieOptions;

  async function startSession(res, user) {
    const token = await createSession(pool, user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions);
  }

  router.post('/register', async (req, res) => {
    const { email, password } = readCredentials(req.body);
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide' });
    }
    if (password.length < 15 || password.length > 128) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir de 15 à 128 caractères' });
    }
    try {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, await hashPassword(password)],
      );
      const user = result.rows[0];
      await startSession(res, user);
      log('info', 'user registered', { userId: user.id });
      res.status(201).json({ user });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse' });
      }
      throw error;
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = readCredentials(req.body);
    const key = `${req.ip}|${email}`;
    const wait = limiter.retryAfter(key);
    if (wait > 0) {
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: 'Trop de tentatives, réessaie plus tard' });
    }
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    const ok = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
    if (!user || !ok) {
      limiter.recordFailure(key);
      log('warn', 'login failed', { ip: req.ip });
      return res.status(401).json({ error: 'E-mail ou mot de passe incorrect' });
    }
    limiter.reset(key);
    if (req.sessionToken) await deleteSession(pool, req.sessionToken);
    await startSession(res, user);
    log('info', 'login succeeded', { userId: user.id });
    res.json({ user: { id: user.id, email: user.email } });
  });

  router.post('/logout', async (req, res) => {
    if (req.sessionToken) await deleteSession(pool, req.sessionToken);
    res.clearCookie(SESSION_COOKIE, clearOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
```

`const { maxAge, ...clearOptions } = cookieOptions` retire `maxAge` des options de
`clearCookie` : Express 5 l’ignorerait de toute façon, et effacer un cookie exige seulement les
mêmes `path`, `httpOnly`, `secure` et `sameSite`. Les journaux notent les événements de
sécurité (inscription, succès, échec avec l’adresse IP) mais **jamais** l’e-mail tenté ni le mot
de passe.

## Les routes des tâches

```js
// src/routes/tasks.js — tâches de l’utilisateur connecté, et seulement les siennes
import express from 'express';
import { requireAuth } from '../auth.js';

const filters = new Map([
  ['all', ''],
  ['open', 'AND done = false'],
  ['done', 'AND done = true'],
]);

function parseId(value) {
  return /^[1-9][0-9]{0,9}$/.test(value) ? Number(value) : null;
}

function readTitle(body) {
  const title = String(body?.title ?? '').trim();
  return title.length >= 1 && title.length <= 200 ? title : null;
}

export function tasksRouter({ pool }) {
  const router = express.Router();
  router.use(requireAuth); // toutes les routes de ce routeur exigent une session

  router.get('/', async (req, res) => {
    const status = String(req.query.status ?? 'all');
    if (!filters.has(status)) {
      return res.status(400).json({ error: 'status doit valoir all, open ou done' });
    }
    const result = await pool.query(
      `SELECT id, title, done, created_at FROM tasks
       WHERE owner_id = $1 ${filters.get(status)}
       ORDER BY done, created_at DESC, id DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  });

  router.post('/', async (req, res) => {
    const title = readTitle(req.body);
    if (!title) return res.status(400).json({ error: 'Le titre doit contenir de 1 à 200 caractères' });
    const result = await pool.query(
      `INSERT INTO tasks (owner_id, title) VALUES ($1, $2)
       RETURNING id, title, done, created_at`,
      [req.user.id, title],
    );
    res.status(201).json(result.rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const changes = {};
    if (req.body?.title !== undefined) {
      changes.title = readTitle(req.body);
      if (!changes.title) {
        return res.status(400).json({ error: 'Le titre doit contenir de 1 à 200 caractères' });
      }
    }
    if (req.body?.done !== undefined) {
      if (typeof req.body.done !== 'boolean') {
        return res.status(400).json({ error: 'done doit être un booléen' });
      }
      changes.done = req.body.done;
    }
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'Rien à modifier' });
    }
    // COALESCE garde la valeur actuelle quand le champ n’est pas fourni
    const result = await pool.query(
      `UPDATE tasks SET title = COALESCE($1, title), done = COALESCE($2, done)
       WHERE id = $3 AND owner_id = $4
       RETURNING id, title, done, created_at`,
      [changes.title ?? null, changes.done ?? null, id, req.user.id],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json(result.rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2', [
      parseId(req.params.id),
      req.user.id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tâche introuvable' });
    res.status(204).end();
  });

  return router;
}
```

Ce qu’il faut savoir expliquer :

- **Le filtre `status`** : seuls trois fragments SQL, écrits dans le code, peuvent être insérés.
  La valeur reçue sert de **clé** dans la `Map`, jamais de texte SQL : c’est une liste blanche.
- **Le propriétaire** est dans chaque requête (`owner_id = $…` avec `req.user.id`).
- **`PATCH` partiel** : seuls les champs fournis changent. `COALESCE($1, title)` vaut `$1` s’il
  n’est pas `NULL`, sinon la valeur actuelle. On ne construit donc pas de requête dynamique à
  partir des clés du corps (ce qui ouvrirait la porte à l’assignation de masse).
- **Types stricts** : `done` doit être un vrai booléen JSON. `"oui"` ou `1` sont refusés au lieu
  d’être convertis au petit bonheur.
- **`router.use(requireAuth)`** protège d’un coup toutes les routes du routeur : impossible
  d’en oublier une.

## Assembler l’application

```js
// src/app.js — assemble l’application ; ne démarre rien (testable)
import path from 'node:path';
import express from 'express';
import { securityHeaders, checkOrigin } from './security.js';
import { requestLogger } from './logger.js';
import { loadUser } from './auth.js';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';

export function createApp({ pool, config, log }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  app.use(securityHeaders({ hsts: config.isProduction }));
  app.use(requestLogger(log));
  app.use(express.static(path.join(import.meta.dirname, '..', 'public')));
  app.use(checkOrigin(config.appOrigin));
  app.use(express.json({ limit: '10kb' }));
  app.use(loadUser(pool));

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api/auth', authRouter({ pool, secureCookies: config.secureCookies, log }));
  app.use('/api/tasks', tasksRouter({ pool }));

  // Route d’API inconnue : JSON plutôt que la page HTML par défaut
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Route inconnue' });
  });

  // Gestionnaire d’erreurs : détail dans les journaux, message générique au client
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Requête trop volumineuse' });
    }
    log('error', 'unhandled error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}
```

### L’ordre des middlewares

Chaque requête traverse la chaîne de haut en bas. L’ordre n’est pas arbitraire :

| Position | Middleware | Pourquoi à cet endroit |
| --- | --- | --- |
| 1 | `securityHeaders` | Toutes les réponses, y compris les fichiers statiques et les erreurs, reçoivent les en-têtes |
| 2 | `requestLogger` | Mesure la durée de tout le traitement et note chaque réponse |
| 3 | `express.static` | Sert `index.html`, `app.js`… sans toucher à la base ni aux sessions |
| 4 | `checkOrigin` | Refuse une requête intersite **avant** de lire son corps ou sa session |
| 5 | `express.json` | Lit le corps JSON, limité à 10 Kio |
| 6 | `loadUser` | Identifie l’utilisateur pour les routes qui suivent |
| 7 | routes `/api/…` | Logique métier |
| 8 | 404 de l’API | Toute route `/api` non trouvée répond en JSON |
| 9 | gestionnaire d’erreurs | Quatre paramètres ; reçoit toute erreur levée plus haut |

Express 5 transmet automatiquement au gestionnaire d’erreurs les promesses rejetées par une
route `async` : pas besoin de `try`/`catch` dans chaque route. Les erreurs du lecteur JSON ont
une propriété `type` (`entity.parse.failed`, `entity.too.large`) qui permet de répondre 400 ou
413 au lieu de 500.

## Le point d’entrée

```js
// src/server.js — point d’entrée : configuration, base, serveur, arrêt propre
import pg from 'pg';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createApp } from './app.js';
import { deleteExpiredSessions } from './sessions.js';

const config = loadConfig();
const log = createLogger();
const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on('error', (error) => log('error', 'postgres pool error', { error: error.message }));

const app = createApp({ pool, config, log });
const server = app.listen(config.port, () => {
  log('info', 'server started', { port: config.port, env: config.nodeEnv });
});

// Ménage des sessions expirées : au démarrage puis toutes les heures
async function cleanSessions() {
  try {
    const count = await deleteExpiredSessions(pool);
    log('info', 'expired sessions deleted', { count });
  } catch (error) {
    log('error', 'session cleanup failed', { error: error.message });
  }
}
cleanSessions();
const cleanup = setInterval(cleanSessions, 60 * 60 * 1000);

// Arrêt propre : l’hébergeur envoie SIGTERM avant d’arrêter le processus
function shutdown(signal) {
  log('info', 'shutdown requested', { signal });
  clearInterval(cleanup);
  server.close(async () => {
    await pool.end();
    log('info', 'shutdown complete');
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

L’arrêt propre sera détaillé à la leçon 5. `pool.on('error')` évite qu’une connexion inactive
coupée par la base fasse planter le processus.

## Vérifier l’API avec curl

Lance `npm run dev`, puis, dans un autre terminal :

```bash
B=http://localhost:3000
curl -s $B/api/health; echo
curl -s -c jar.txt -X POST $B/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}'; echo
curl -s -b jar.txt -X POST $B/api/tasks -H 'Content-Type: application/json' -d '{"title":"Acheter du pain"}'; echo
curl -s -b jar.txt -X POST $B/api/tasks -H 'Content-Type: application/json' -d '{"title":"Réviser les promesses"}'; echo
curl -s -b jar.txt -X PATCH $B/api/tasks/1 -H 'Content-Type: application/json' -d '{"done":true}'; echo
curl -s -b jar.txt "$B/api/tasks"; echo
curl -s -b jar.txt "$B/api/tasks?status=open"; echo
curl -s -b jar.txt -w ' %{http_code}\n' -X DELETE $B/api/tasks/2
```

```text
{"status":"ok"}
{"user":{"id":1,"email":"ada@example.fr"}}
{"id":1,"title":"Acheter du pain","done":false,"created_at":"2026-11-21T22:09:06.422Z"}
{"id":2,"title":"Réviser les promesses","done":false,"created_at":"2026-11-21T22:09:06.432Z"}
{"id":1,"title":"Acheter du pain","done":true,"created_at":"2026-11-21T22:09:06.422Z"}
[{"id":2,"title":"Réviser les promesses","done":false,"created_at":"2026-11-21T22:09:06.432Z"},{"id":1,"title":"Acheter du pain","done":true,"created_at":"2026-11-21T22:09:06.422Z"}]
[{"id":2,"title":"Réviser les promesses","done":false,"created_at":"2026-11-21T22:09:06.432Z"}]
 204
```

Puis les cas d’erreur :

```bash
curl -s -b jar.txt -X PATCH $B/api/tasks/1 -H 'Content-Type: application/json' -d '{"done":"oui"}'; echo
curl -s -b jar.txt -X POST $B/api/tasks -H 'Content-Type: application/json' -d '{"title":'; echo
curl -s -b jar.txt -X POST $B/api/tasks -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' -d '{"title":"x"}'; echo
curl -s $B/api/tasks; echo
curl -s $B/api/inconnue; echo
```

```text
{"error":"done doit être un booléen"}
{"error":"JSON invalide"}
{"error":"Origine refusée"}
{"error":"Authentification requise"}
{"error":"Route inconnue"}
```

Dans le terminal du serveur, chaque requête laisse une ligne (les heures et durées varient) :

```text
{"userId":1,"time":"2026-11-22T08:04:59.279Z","level":"info","message":"user registered"}
{"method":"POST","path":"/api/auth/register","status":201,"durationMs":430,"userId":null,"time":"2026-11-22T08:04:59.283Z","level":"info","message":"request"}
{"method":"POST","path":"/api/tasks","status":201,"durationMs":8,"userId":1,"time":"2026-11-22T08:04:59.300Z","level":"info","message":"request"}
{"method":"POST","path":"/api/tasks","status":403,"durationMs":1,"userId":null,"time":"2026-11-22T08:04:59.308Z","level":"info","message":"request"}
```

Les champs propres à l’événement viennent d’abord, puis `time`, `level` et `message` : placés en
dernier dans l’objet, ces trois champs ne peuvent pas être écrasés par un champ du même nom (une
première version de ce journal perdait son message quand on passait `{ message: error.message }`).
L’inscription prend environ 400 ms (le hachage scrypt), une création de tâche quelques
millisecondes. `userId` vaut `null` sur l’inscription, car l’utilisateur n’était pas encore
connecté **au début** de la requête.

## Pièges et idées reçues

- **Mettre `express.json()` avant `checkOrigin`.** Ça fonctionne, mais le serveur lit le corps
  d’une requête qu’il va refuser. Refuse le plus tôt possible.
- **Oublier la 404 de l’API.** Sans elle, `GET /api/inconnue` renvoie la page HTML d’erreur
  d’Express : l’interface, qui attend du JSON, plante sur `response.json()`.
- **Construire l’`UPDATE` à partir de `Object.keys(req.body)`.** Assignation de masse et
  injection par les noms de colonnes. Liste les champs modifiables dans le code.
- **Placer le gestionnaire d’erreurs avant les routes.** Il ne reçoit alors rien : il doit être
  le **dernier** middleware.
- **Un `count(*)` qui arrive en chaîne.** PostgreSQL renvoie `count(*)` en `bigint`, que `pg`
  convertit en **chaîne** (`'3'`) pour ne pas perdre de précision. Transtype en `::integer` si
  la valeur reste petite.

## Exercices

### Exercice 1 — Une route de statistiques

Ajoute `GET /api/tasks/stats`, qui renvoie `{ "total": …, "done": … }` pour l’utilisateur
connecté, en **une** requête SQL. Après le parcours curl ci-dessus, que renvoie-t-elle ?

:::solution
Dans `tasksRouter`, avant `router.post('/', …)` :

```js
router.get('/stats', async (req, res) => {
  const result = await pool.query(
    `SELECT count(*)::integer AS total,
            count(*) FILTER (WHERE done)::integer AS done
     FROM tasks WHERE owner_id = $1`,
    [req.user.id],
  );
  res.json(result.rows[0]);
});
```

Après le parcours (une tâche terminée restante) :

```text
{"total":1,"done":1}
```

- `FILTER (WHERE done)` compte seulement les lignes qui vérifient la condition, dans la même
  requête.
- `::integer` évite de recevoir `"1"` (chaîne) au lieu de `1`.
- La route hérite de `requireAuth` grâce à `router.use`, et filtre par `owner_id`.
- Il n’y a pas de conflit avec `/:id` : aucune route `GET /:id` n’existe. S’il y en avait une,
  il faudrait déclarer `/stats` **avant**, sinon `stats` serait pris pour un identifiant.

:::

### Exercice 2 — Prévoir le comportement

Sans exécuter, prévois le code HTTP et le corps de la réponse pour chaque requête, envoyée avec
la session d’Ada :

1. `PATCH /api/tasks/1` avec `{"title":"   "}`
2. `PATCH /api/tasks/1` avec `{"owner_id":2}`
3. `GET /api/tasks?status=done&status=open`
4. `POST /api/tasks` avec un titre de 20 000 caractères

:::solution
1. **400** `{"error":"Le titre doit contenir de 1 à 200 caractères"}` : `trim` laisse une chaîne
   vide.
2. **400** `{"error":"Rien à modifier"}` : `owner_id` n’est pas un champ lu ; `changes` reste
   vide. L’attaque par assignation de masse échoue sans même atteindre la base.
3. **400** `{"error":"status doit valoir all, open ou done"}` : avec deux paramètres de même nom,
   Express fournit un tableau ; `String(['done', 'open'])` donne `'done,open'`, absent de la
   `Map`.
4. **413** `{"error":"Requête trop volumineuse"}` : le corps dépasse la limite de 10 Kio de
   `express.json`, avant même la validation du titre.

:::

## Récapitulatif

- Les modules d’authentification sont repris sans modification ; les routes sont regroupées
  en routeurs (`express.Router`) construits par des fabriques qui reçoivent leurs dépendances.
- Ordre des middlewares : en-têtes, journal, fichiers statiques, origine, JSON, utilisateur,
  routes, 404 d’API, gestionnaire d’erreurs.
- Chaque requête sur les tâches filtre par `owner_id` ; `router.use(requireAuth)` protège tout
  le routeur.
- Listes blanches pour les filtres, `COALESCE` pour les mises à jour partielles, types JSON
  stricts.
- Erreurs : 400/413 pour le corps invalide, message générique pour le reste, détail dans les
  journaux JSON.
- `server.js` crée les ressources, nettoie les sessions expirées et gère l’arrêt.
