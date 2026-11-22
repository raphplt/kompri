---
title: Sessions par cookie
summary: Connecter un utilisateur avec une session stockée côté serveur, un cookie sûr, une expiration, la régénération et la déconnexion, et limiter les tentatives.
durationMinutes: 70
sources:
  - title: OWASP — Session Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - title: MDN — Set-Cookie
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Set-Cookie
  - title: OWASP — Credential Stuffing Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
  - title: Express — API res.cookie()
    url: https://expressjs.com/en/5x/api.html#res.cookie
---

## Le problème : HTTP ne se souvient de rien

HTTP est **sans état** : chaque requête arrive seule, sans souvenir des précédentes. Après une
connexion réussie, comment le serveur sait-il, à la requête suivante, que c’est toujours Ada ?
On ne va pas lui redemander son mot de passe à chaque clic.

La solution classique est la **session** :

1. à la connexion, le serveur vérifie le mot de passe, puis crée une session : un
   enregistrement côté serveur qui dit « ce jeton appartient à Ada, jusqu’à telle date » ;
2. il remet au navigateur le **jeton de session**, un identifiant aléatoire, dans un cookie ;
3. le navigateur renvoie ce cookie automatiquement à chaque requête ;
4. le serveur retrouve la session à partir du jeton et sait qui parle.

Le jeton devient donc l’équivalent temporaire du mot de passe : quiconque le possède **est**
Ada pour le serveur. Toute cette leçon consiste à le protéger.

Express 5 sait écrire un cookie (`res.cookie`) mais ne fournit pas de gestion de session.
Des bibliothèques existent (par exemple `express-session`) ; on va écrire la nôtre, en une
soixantaine de lignes, pour comprendre chaque décision.

## Les règles d’un bon jeton de session

D’après la fiche Session Management de l’OWASP :

- **Imprévisible** : au moins 64 bits d’entropie, produits par un générateur cryptographique.
  On utilisera `randomBytes(32)`, soit 256 bits.
- **Sans signification** : le jeton ne contient ni identifiant d’utilisateur ni rôle ; c’est
  une simple clé vers des données gardées sur le serveur.
- **Limité dans le temps** : une expiration côté serveur, pas seulement dans le cookie.
- **Renouvelé** à chaque changement de privilège, en particulier à la connexion.
- **Détruit** à la déconnexion, côté serveur.
- **Transporté dans un cookie protégé** : `HttpOnly`, `Secure`, `SameSite`.

## Le stockage des sessions : `src/sessions.js`

La table `sessions` a été créée à la première leçon. On y range l’**empreinte SHA-256** du
jeton plutôt que le jeton lui-même : si la table fuit, les valeurs lues ne permettent pas de se
faire passer pour un utilisateur. SHA-256 suffit ici, contrairement aux mots de passe : un jeton
de 256 bits aléatoires est impossible à deviner, la lenteur n’apporte rien.

```js
// sessions.js — sessions stockées côté serveur, dans PostgreSQL
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'sid';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// En base, on ne garde que l’empreinte du jeton : une fuite de la table
// ne donne pas de jetons utilisables
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(pool, userId) {
  const token = randomBytes(32).toString('base64url'); // 256 bits aléatoires
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + $3 * interval '1 millisecond')`,
    [hashToken(token), userId, SESSION_DURATION_MS],
  );
  return token;
}

export async function findSessionUser(pool, token) {
  const result = await pool.query(
    `SELECT users.id, users.email
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(pool, token) {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function deleteExpiredSessions(pool) {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  return result.rowCount;
}
```

- `$3 * interval '1 millisecond'` calcule la date d’expiration **dans PostgreSQL**, avec
  l’horloge de la base, en gardant la durée en paramètre.
- `findSessionUser` vérifie l’expiration à chaque requête : une session périmée est ignorée
  même si le navigateur a gardé le cookie.
- `deleteExpiredSessions` fait le ménage ; on l’appellerait périodiquement (au démarrage, ou
  par une tâche planifiée).

## Le cookie et les middlewares : `src/auth.js`

Express 5 n’analyse pas l’en-tête `Cookie` tout seul ; une petite fonction suffit.

```js
// auth.js — lecture du cookie de session et middlewares d’authentification
import { SESSION_COOKIE, SESSION_DURATION_MS, findSessionUser } from './sessions.js';

export function readCookie(req, name) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function sessionCookieOptions(secure) {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DURATION_MS };
}

// Pour chaque requête : retrouve l’utilisateur à partir du cookie, s’il y en a un
export function loadUser(pool) {
  return async (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    req.sessionToken = token;
    req.user = token ? await findSessionUser(pool, token) : null;
    next();
  };
}

// Bloque les routes réservées aux utilisateurs connectés
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
}
```

Les options du cookie reprennent la compétence « Sécurité web » :

- `httpOnly: true` : un script injecté ne peut pas lire le jeton avec `document.cookie` ;
- `secure` : en production, le cookie ne voyage qu’en HTTPS. On le passe en paramètre pour
  pouvoir travailler en HTTP sur `localhost` ;
- `sameSite: 'lax'` : le cookie n’accompagne pas les formulaires `POST` envoyés depuis un autre
  site (protection CSRF) ;
- `maxAge` : le navigateur oublie le cookie après sept jours ; le serveur, lui, applique sa
  propre expiration.

## Limiter les tentatives : `src/login-limiter.js`

Sans limite, un attaquant peut essayer des milliers de mots de passe sur un compte (force
brute), ou tester des couples e-mail/mot de passe volés ailleurs (*credential stuffing*). On
compte les **échecs** par couple « adresse IP + e-mail » sur une fenêtre de temps :

```js
// login-limiter.js — limite les échecs de connexion par adresse IP et par e-mail
export function createLoginLimiter({ maxFailures = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const failures = new Map(); // clé -> { count, resetAt }

  function entry(key) {
    const current = failures.get(key);
    if (!current || current.resetAt <= now()) return null;
    return current;
  }

  return {
    // Nombre de secondes à attendre, ou 0 si la tentative est permise
    retryAfter(key) {
      const current = entry(key);
      if (!current || current.count < maxFailures) return 0;
      return Math.ceil((current.resetAt - now()) / 1000);
    },
    recordFailure(key) {
      const current = entry(key) ?? { count: 0, resetAt: now() + windowMs };
      current.count += 1;
      failures.set(key, current);
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
```

La fonction `now` est injectable : les tests pourront simuler le passage du temps sans
attendre quinze minutes. Ce limiteur vit **en mémoire** : il se vide au redémarrage et ne
fonctionne que pour un seul processus. Avec plusieurs instances du serveur, il faudrait un
stockage partagé (une table PostgreSQL, par exemple).

## Les routes : `src/app.js`

L’application est construite par une fonction `createApp`, qui reçoit le pool : les tests
pourront lui donner une base de test.

```js
// app.js — API avec comptes et sessions (les notes viendront à la leçon 4)
import express from 'express';
import { hashPassword, verifyPassword } from './password.js';
import { SESSION_COOKIE, createSession, deleteSession } from './sessions.js';
import { loadUser, requireAuth, sessionCookieOptions } from './auth.js';
import { createLoginLimiter } from './login-limiter.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

function readCredentials(body) {
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { email, password };
}

export function createApp({ pool, secureCookies = false }) {
  const app = express();
  const limiter = createLoginLimiter();
  // Empreinte factice : une connexion avec un e-mail inconnu coûte autant qu’une vraie
  const dummyHash = hashPassword('mot de passe factice pour égaliser les durées');

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  app.use(loadUser(pool));

  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = readCredentials(req.body);
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide' });
    }
    if (password.length < 15 || password.length > 128) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir de 15 à 128 caractères' });
    }
    const passwordHash = await hashPassword(password);
    try {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, passwordHash],
      );
      const user = result.rows[0];
      const token = await createSession(pool, user.id);
      res.cookie(SESSION_COOKIE, token, sessionCookieOptions(secureCookies));
      res.status(201).json({ user });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse' });
      }
      throw error;
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = readCredentials(req.body);
    const limiterKey = `${req.ip}|${email}`;
    const wait = limiter.retryAfter(limiterKey);
    if (wait > 0) {
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: 'Trop de tentatives, réessaie plus tard' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    // Même calcul que l’utilisateur existe ou non
    const passwordOk = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
    if (!user || !passwordOk) {
      limiter.recordFailure(limiterKey);
      return res.status(401).json({ error: 'E-mail ou mot de passe incorrect' });
    }

    limiter.reset(limiterKey);
    // Régénération : l’ancien jeton éventuel est détruit, un nouveau est créé
    if (req.sessionToken) await deleteSession(pool, req.sessionToken);
    const token = await createSession(pool, user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(secureCookies));
    res.json({ user: { id: user.id, email: user.email } });
  });

  app.post('/api/auth/logout', async (req, res) => {
    if (req.sessionToken) await deleteSession(pool, req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/' });
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}
```

Et le point d’entrée `src/server.js` :

```js
// server.js — démarre l’API
import pg from 'pg';
import { createApp } from './app.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = createApp({ pool, secureCookies: process.env.NODE_ENV === 'production' });
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => console.log(`API sur http://localhost:${port}`));
```

### Les décisions de sécurité, une par une

- **Message unique** à l’échec : « E-mail ou mot de passe incorrect », que le compte existe ou
  non. Un message différent permettrait d’énumérer les comptes.
- **Durée égale** : si l’e-mail est inconnu, on vérifie quand même le mot de passe contre une
  empreinte factice. Sans cela, la réponse arriverait en une milliseconde pour un compte
  inexistant et en un tiers de seconde pour un compte existant : la durée trahirait
  l’existence du compte. `dummyHash` est une **promesse** calculée une fois au démarrage.
- **Régénération** : à chaque connexion, on détruit le jeton présenté (s’il existe) et on en
  crée un nouveau. Cela déjoue la **fixation de session** : un attaquant qui aurait réussi à
  placer un jeton connu dans le navigateur de la victime ne profite pas de sa connexion.
- **Déconnexion côté serveur** : `deleteSession` rend le jeton inutilisable, même si quelqu’un
  l’a copié. `clearCookie` demande en plus au navigateur d’oublier le cookie, avec les mêmes
  attributs `path` qu’à la création, sinon le navigateur ne le reconnaîtrait pas.
- **Limitation** : au-delà de cinq échecs en quinze minutes pour un couple IP + e-mail, la
  route répond 429 avec `Retry-After`, sans même consulter la base.

:::note[req.ip derrière un proxy]
En production, l’application est souvent derrière un proxy inverse ou un hébergeur : `req.ip`
vaudrait alors l’adresse du proxy pour tout le monde. Il faut configurer Express avec
`app.set('trust proxy', …)` en indiquant précisément le proxy de confiance ; voir la page
« Express behind proxies » de la documentation. Ne fais jamais confiance à
`X-Forwarded-For` sans cette configuration.

:::

## Essayer le parcours complet

Si tu as gardé le compte d’Ada créé à la leçon précédente, repars d’une base vide pour obtenir
les mêmes sorties : `psql notes_auth -c "TRUNCATE users RESTART IDENTITY CASCADE"` (la cascade
vide aussi `sessions` et `notes`, `RESTART IDENTITY` remet les identifiants à 1).

Lance `node src/server.js` (avec `DATABASE_URL`), puis, dans un autre terminal, utilise un
fichier de cookies `curl` (`-c` l’écrit, `-b` le relit) :

```bash
B=http://localhost:3000
curl -s -i -c jar.txt -X POST $B/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}'
curl -s -b jar.txt $B/api/auth/me; echo
curl -s -i -b jar.txt -c jar.txt -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ADA@example.fr","password":"cheval agrafe batterie correcte"}'
curl -s -i -b jar.txt -c jar.txt -X POST $B/api/auth/logout
curl -s -b jar.txt $B/api/auth/me; echo
```

Lignes utiles de la sortie (les jetons et les dates varient) :

```text
HTTP/1.1 201 Created
Set-Cookie: sid=nbfILNqXwIwBEVTC_Pt6NVDDdPl_cJbX53myJXDbCXI; Max-Age=604800; Path=/; Expires=Sat, 28 Nov 2026 21:51:05 GMT; HttpOnly; SameSite=Lax
{"user":{"id":1,"email":"ada@example.fr"}}
{"user":{"id":1,"email":"ada@example.fr"}}
HTTP/1.1 200 OK
Set-Cookie: sid=tR3nljAqSwthSauEGqeDkM1WX1tRhQmga7w8m-A4hpI; Max-Age=604800; Path=/; Expires=Sat, 28 Nov 2026 21:51:05 GMT; HttpOnly; SameSite=Lax
{"user":{"id":1,"email":"ada@example.fr"}}
HTTP/1.1 204 No Content
Set-Cookie: sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
{"error":"Authentification requise"}
```

Lis-la ligne par ligne : l’inscription ouvre une session ; `me` reconnaît Ada ; la connexion
(avec un e-mail en majuscules, normalisé) remet un **nouveau** jeton ; la déconnexion envoie un
cookie vide déjà expiré ; ensuite, `me` répond 401.

Puis teste la limitation avec un mauvais mot de passe :

```bash
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w '%{http_code} ' -X POST $B/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"ada@example.fr","password":"mauvais mot de passe"}'
done; echo
curl -s -i -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}'
```

```text
401 401 401 401 401 429
HTTP/1.1 429 Too Many Requests
Retry-After: 899
…
{"error":"Trop de tentatives, réessaie plus tard"}
```

Même le bon mot de passe est refusé pendant le blocage : sinon, l’attaquant n’aurait qu’à
continuer jusqu’à recevoir autre chose qu’un 429.

### L’expiration côté serveur

Le compte d’Ada est encore bloqué par le limiteur : **redémarre le serveur** (le limiteur, en
mémoire, repart de zéro), reconnecte-toi, puis simule une session périmée directement en base :

```bash
curl -s -c jar.txt -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}' > /dev/null
curl -s -b jar.txt $B/api/auth/me; echo
psql notes_auth -c "UPDATE sessions SET expires_at = now() - interval '1 minute'"
curl -s -b jar.txt $B/api/auth/me; echo
psql notes_auth -c "DELETE FROM sessions WHERE expires_at <= now()"
```

```text
{"user":{"id":1,"email":"ada@example.fr"}}
UPDATE 1
{"error":"Authentification requise"}
DELETE 1
```

La mise à jour rend la session invalide : `me` répond `{"error":"Authentification requise"}`,
alors que le navigateur (ou `curl`) envoie toujours le cookie. Le `DELETE` supprime ensuite les
sessions périmées.

## Pièges et idées reçues

- **Mettre l’identifiant de l’utilisateur dans le cookie** (`userId=1`) : il suffit de le
  modifier pour devenir quelqu’un d’autre. Le cookie ne contient qu’un jeton aléatoire.
- **Un jeton prévisible** : `Date.now()`, un compteur, `Math.random()` ou un UUID non
  cryptographique ne conviennent pas. Utilise `randomBytes`.
- **Une déconnexion seulement côté navigateur** : effacer le cookie ne sert à rien si le jeton
  reste valide sur le serveur pour quiconque en a gardé une copie.
- **Une session éternelle** : sans expiration côté serveur, un jeton volé reste utilisable pour
  toujours.
- **Oublier la régénération** : réutiliser le jeton d’avant la connexion ouvre la porte à la
  fixation de session.
- **Bloquer le compte définitivement après N échecs** : un attaquant pourrait verrouiller les
  comptes de tout le monde (déni de service). On préfère une attente temporaire.

## Exercices

### Exercice 1 — Se déconnecter partout

Ada a perdu son téléphone, sur lequel elle était connectée. Ajoute une route
`POST /api/auth/logout-all`, réservée aux utilisateurs connectés, qui ferme **toutes** ses
sessions et renvoie leur nombre. Vérifie avec deux fichiers de cookies.

:::solution
```js
app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  const result = await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/' });
  res.json({ closedSessions: result.rowCount });
});
```

À placer dans `createApp`, avant le gestionnaire d’erreurs. Vérification :

```bash
curl -s -c laptop.txt -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}' > /dev/null
curl -s -c phone.txt -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}' > /dev/null
curl -s -b phone.txt -X POST $B/api/auth/logout-all; echo
curl -s -b laptop.txt $B/api/auth/me; echo
```

```text
{"closedSessions":2}
{"error":"Authentification requise"}
```

`rowCount` indique le nombre de lignes supprimées. La même requête doit être exécutée quand
un utilisateur **change son mot de passe** : les sessions ouvertes avec l’ancien doivent être
fermées (sauf, éventuellement, la session courante, régénérée).

:::

### Exercice 2 — Le pulvérisateur de mots de passe

Un attaquant essaie un seul mot de passe très courant sur des milliers d’e-mails différents
(*password spraying*), depuis la même adresse IP. Notre limiteur l’arrête-t-il ? Propose une
modification.

:::solution
Non : la clé est `IP|e-mail`, et chaque e-mail n’échoue qu’une fois. On ajoute une seconde
limite, **par adresse IP seule**, avec un seuil plus élevé pour ne pas gêner plusieurs
personnes derrière la même connexion (un bureau, une école) :

```js
const accountLimiter = createLoginLimiter(); // 5 échecs / 15 min par IP + e-mail
const ipLimiter = createLoginLimiter({ maxFailures: 50, windowMs: 15 * 60 * 1000 });

// Dans la route de connexion :
const wait = Math.max(accountLimiter.retryAfter(limiterKey), ipLimiter.retryAfter(req.ip));
// … et en cas d’échec :
accountLimiter.recordFailure(limiterKey);
ipLimiter.recordFailure(req.ip);
```

En cas de succès, on remet seulement `accountLimiter` à zéro pour cette clé : un attaquant qui
connaît un compte valide ne doit pas pouvoir effacer son compteur d’IP. Ces limites
ralentissent l’attaque sans l’arrêter totalement (l’attaquant peut changer d’adresse IP) ;
l’authentification multifacteur et le refus des mots de passe déjà divulgués complètent la
défense.

:::

### Exercice 3 — Expliquer la fixation de session

Explique, sans code, le scénario d’une fixation de session sur une application qui garderait
le même jeton avant et après la connexion, et pourquoi notre route de connexion y résiste.

:::solution
1. L’attaquant obtient un jeton valide mais anonyme (en visitant le site) ou en fabrique un
   que le serveur acceptera.
2. Il parvient à le placer dans le navigateur de la victime (par exemple via un sous-domaine
   qu’il contrôle et qui pose un cookie, ou une faille XSS).
3. La victime se connecte : l’application associe son compte **au jeton existant**.
4. L’attaquant, qui connaît ce jeton, est désormais connecté comme la victime.

Notre route détruit le jeton présenté et en crée un nouveau, aléatoire, au moment où le
privilège change : le jeton connu de l’attaquant ne vaut plus rien. De plus, notre serveur ne
crée jamais de session anonyme : un jeton inconnu n’est associé à aucune session.

:::

## Récapitulatif

- Une session associe, côté serveur, un jeton aléatoire à un utilisateur et à une date
  d’expiration ; le navigateur ne détient que le jeton, dans un cookie.
- Jeton : `randomBytes(32)`, sans signification, stocké en base sous forme d’empreinte SHA-256.
- Cookie : `HttpOnly`, `Secure` en production, `SameSite=Lax`, durée limitée ; expiration
  revérifiée côté serveur à chaque requête.
- Connexion : message unique, durée égale, nouveau jeton à chaque connexion (contre la
  fixation de session), limitation des échecs avec 429 et `Retry-After`.
- Déconnexion : suppression de la session en base et `clearCookie` avec les mêmes attributs.
- Le limiteur en mémoire suffit pour un seul processus ; plusieurs instances exigent un
  stockage partagé, et `req.ip` derrière un proxy exige `trust proxy`.
