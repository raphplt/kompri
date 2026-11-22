---
title: Secrets, dépendances, en-têtes et journaux
summary: Garder les secrets hors du code, surveiller les dépendances vulnérables, envoyer les bons en-têtes et journaliser sans fuite.
durationMinutes: 55
sources:
  - title: OWASP — Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  - title: npm Docs — npm audit
    url: https://docs.npmjs.com/cli/commands/npm-audit/
  - title: OWASP — HTTP Security Response Headers Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
  - title: OWASP — Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---

## Le problème : les failles qui ne sont pas dans ta logique

Tes requêtes sont paramétrées, ton HTML est échappé, tes cookies sont bien réglés. Il reste
des failles qui ne tiennent pas à la logique de tes routes, mais à **tout ce qui l’entoure** :

- un mot de passe de base de données écrit dans le code et publié sur GitHub ;
- une dépendance npm qui contient une faille connue ;
- une réponse HTTP qui ne dit pas au navigateur de se protéger ;
- une trace d’erreur qui affiche la configuration, un journal qui contient des mots de passe.

Dans le Top 10 de l’OWASP 2021, ces défauts relèvent surtout de **A05 Security
Misconfiguration**, **A06 Vulnerable and Outdated Components**, **A08 Software and Data
Integrity Failures** et **A09 Security Logging and Monitoring Failures**. Cette leçon les
traite un par un.

## Les secrets hors du code

Un **secret** est une valeur qui donne un accès : mot de passe de base, clé d’API d’un
service de paiement ou d’envoi d’e-mails, clé de signature. Règle absolue : **un secret ne
s’écrit jamais dans le code source** et n’entre jamais dans Git. Un dépôt se copie, se
partage, devient public par erreur ; et l’historique Git garde tout.

Tu as vu dans « Node.js » comment lire la configuration dans `process.env`. Voici la mise en
place complète pour un projet.

### Le fichier `.env` et `.gitignore`

En développement, on range les variables dans un fichier `.env` à la racine du projet :

```bash
PORT=3000
DATABASE_URL=postgres://app:motdepasse-de-dev@localhost:5432/notes_dev
SESSION_SECRET=remplace-moi-par-une-valeur-aleatoire
```

Ce fichier est **ignoré** par Git, et un fichier `.env.example`, lui versionné, documente les
variables attendues avec des valeurs factices :

```text
# .gitignore
node_modules/
.env
```

Vérifie que Git ignore bien le fichier :

```bash
git status --short
git check-ignore -v .env
```

```text
?? .env.example
?? .gitignore
?? server.js
.gitignore:2:.env	.env
```

`.env` n’apparaît pas dans la liste des fichiers à ajouter, et `git check-ignore` indique la
règle qui l’exclut (ligne 2 de `.gitignore`).

Node.js sait lire ce fichier sans dépendance supplémentaire :

```bash
node --env-file=.env server.js
```

Pour générer un secret aléatoire solide :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

La commande affiche 43 caractères différents à chaque exécution : 32 octets aléatoires
encodés en base64url.

### Valider la configuration au démarrage

Un serveur qui démarre sans sa configuration finit par planter plus tard, au pire moment, ou
pire : fonctionne avec une valeur vide. Mieux vaut **échouer tout de suite** :

```js
// config.js — lit et valide la configuration au démarrage
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d’environnement manquante : ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET'),
  isProduction: process.env.NODE_ENV === 'production',
};
```

Sans `.env`, `node server.js` s’arrête immédiatement avec
`Error: Variable d’environnement manquante : DATABASE_URL` et un code de sortie 1. Le message
nomme la variable, **jamais sa valeur**.

En production, les variables ne viennent pas d’un fichier `.env` posé sur le serveur, mais de
la plateforme d’hébergement (variables d’environnement de l’hébergeur, gestionnaire de
secrets). Chaque environnement (développement, test, production) a ses **propres** secrets.

:::warning[Un secret publié est un secret perdu]
Si un secret a été poussé dans un dépôt, même quelques minutes, considère-le comme
compromis. Supprimer le commit ne suffit pas : des copies existent peut-être déjà. Il faut
**révoquer** et **remplacer** le secret (changer le mot de passe, régénérer la clé), puis
nettoyer l’historique si nécessaire.

:::

Le code JavaScript envoyé au navigateur est **public** : n’y mets aucun secret, même
« caché » dans une variable. Une clé qui doit rester secrète ne peut être utilisée que côté
serveur.

## Les dépendances vulnérables

Chaque paquet npm installé exécute du code dans ton application, avec les mêmes droits
qu’elle. Et chaque paquet a ses propres dépendances : quelques lignes dans `package.json`
peuvent représenter des centaines de paquets dans `node_modules`. Une faille dans l’un d’eux
est une faille chez toi (A06).

### `npm audit`

`npm audit` compare les versions installées, d’après `package-lock.json`, à une base d’avis
de sécurité publiés. Pour l’essayer, installe volontairement une ancienne version de
`lodash` dans un dossier de test :

```bash
mkdir audit-demo && cd audit-demo
npm init -y
npm install lodash@4.17.20
npm audit
```

Sortie obtenue au moment de la rédaction (la liste exacte dépend de la base d’avis le jour où
tu lances la commande) :

```text
# npm audit report

lodash  <=4.17.23
Severity: high
Command Injection in lodash - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
Regular Expression Denial of Service (ReDoS) in lodash - https://github.com/advisories/GHSA-29mw-wpgm-hmr9
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions - https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix`
node_modules/lodash

1 high severity vulnerability

To address all issues, run:
  npm audit fix
```

Comment lire ce rapport :

- **le paquet et la plage vulnérable** : toutes les versions jusqu’à `4.17.23` incluse ;
- **la gravité** (`low`, `moderate`, `high`, `critical`) ;
- **les avis**, chacun avec un lien vers sa description : lis-les pour savoir si **ton usage**
  est concerné (utilises-tu `_.template` ?) ;
- **la correction** : `npm audit fix` met à jour vers une version corrigée compatible avec la
  plage déclarée dans `package.json`.

`npm audit` se termine avec un code de sortie non nul quand il trouve des vulnérabilités : on
peut donc le lancer dans une intégration continue pour bloquer une fusion. Après
`npm audit fix`, la commande affiche `found 0 vulnerabilities`.

:::warning
`npm audit fix --force` peut installer une version **majeure** différente, avec des
changements incompatibles. Ne l’utilise pas à l’aveugle : lis ce qui change, puis lance tes
tests.

:::

### Hygiène des dépendances

- **Versionne `package-lock.json`** et installe en intégration continue et en production avec
  `npm ci`, qui respecte exactement le fichier de verrouillage.
- **Ajoute peu de dépendances.** Avant `npm install`, vérifie le nom exact (des paquets
  malveillants imitent des noms connus), l’activité du projet et son nombre de dépendances.
  Dix lignes de code écrites et testées par toi valent parfois mieux qu’un paquet.
- **Mets à jour régulièrement.** `npm outdated` liste les paquets en retard ; mieux vaut
  avancer par petites étapes, tests à l’appui, que tout rattraper en urgence.
- **Ne charge pas de script tiers sans contrôle.** Un script chargé depuis un CDN peut être
  modifié à ton insu (A08) ; l’attribut `integrity` (Subresource Integrity) permet au
  navigateur de vérifier son empreinte.

## Les en-têtes de sécurité

Certaines protections sont dans le navigateur, mais ne s’activent que si le serveur les
demande, par des en-têtes HTTP. Un middleware suffit :

```js
// security-headers.js — en-têtes de sécurité appliqués à toutes les réponses
export function securityHeaders(options = {}) {
  const { hsts = false } = options;
  return (req, res, next) => {
    res.set({
      'Content-Security-Policy':
        "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    if (hsts) {
      // Seulement derrière HTTPS : le navigateur refusera ensuite le HTTP
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}
```

| En-tête | Ce qu’il demande au navigateur |
| --- | --- |
| `Content-Security-Policy` | Ne charger scripts, styles, images… que des sources listées ; ici, en plus : pas de plugin, pas de `base` détournée, pas d’affichage dans une `iframe` étrangère, formulaires envoyés seulement à la même origine |
| `X-Content-Type-Options: nosniff` | Respecter le `Content-Type` annoncé au lieu de « deviner » le type d’un fichier (un texte envoyé par un utilisateur ne sera pas exécuté comme script) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Vers un autre site, n’envoyer que l’origine dans `Referer`, pas le chemin ni la chaîne de requête |
| `Cross-Origin-Opener-Policy: same-origin` | Isoler la fenêtre des pages d’autres origines qu’elle ouvre ou qui l’ouvrent |
| `Strict-Transport-Security` | Pendant `max-age` secondes (ici un an), ne plus jamais contacter le site en HTTP |

Le serveur complet, avec la configuration et un journal des requêtes :

```js
// server.js — point d’entrée
import express from 'express';
import { config } from './config.js';
import { securityHeaders } from './security-headers.js';
import { log, requestLogger } from './logger.js';

const app = express();
app.disable('x-powered-by'); // inutile d’annoncer la technologie utilisée
app.use(securityHeaders({ hsts: config.isProduction }));
app.use(requestLogger);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/login', (req, res) => {
  // Ne JAMAIS faire : log('info', 'login', { body: req.body });
  log('info', 'login attempt', { email: req.body?.email ? 'fourni' : 'absent' });
  res.status(401).json({ error: 'Identifiants invalides' });
});

app.listen(config.port, () => log('info', 'server started', { port: config.port }));
```

Après avoir créé `logger.js` (section suivante), lance `node --env-file=.env server.js` puis
`curl -s -i http://localhost:3000/api/health` :

```text
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Content-Type: application/json; charset=utf-8
Content-Length: 15

{"status":"ok"}
```

(Les en-têtes `Date`, `ETag`, `Connection` et `Keep-Alive`, qui varient, ont été retirés de
l’affichage.)

L’en-tête `X-Powered-By: Express` a disparu, et HSTS est absent car on n’est pas en
production. Le paquet npm `helmet` regroupe ces en-têtes (et d’autres) avec des valeurs par
défaut raisonnables ; il est très utilisé avec Express. Le middleware écrit à la main a
l’avantage de te faire comprendre chaque ligne : à l’oral, c’est ce qu’on te demandera.

### Les erreurs : ne rien montrer en production

Que renvoie Express quand une route lève une erreur que tu n’as pas interceptée ? Essaie :

```js
// err.js — une route qui échoue
import express from 'express';
const app = express();
app.get('/boom', async () => {
  throw new Error('connexion à postgres://app:secret@db/prod impossible');
});
app.listen(3002);
```

Avec `node err.js`, `curl -s localhost:3002/boom` renvoie une page HTML qui contient le message
**et la pile d’appels** : `Error: connexion à postgres://app:secret@db/prod impossible`, suivi
des chemins de fichiers du serveur. Avec `NODE_ENV=production node err.js`, la même requête
renvoie seulement :

```text
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Internal Server Error</pre>
</body>
</html>
```

Le gestionnaire d’erreurs par défaut d’Express affiche les détails tant que `NODE_ENV` ne vaut
pas `production`. Deux mesures : définir `NODE_ENV=production` en production, et écrire ton
propre gestionnaire d’erreurs qui journalise le détail et renvoie un message générique.

## Journaliser sans fuite

Les journaux (*logs*) servent à comprendre un incident : qui a fait quoi, quand, avec quel
résultat. Sans eux, une attaque passe inaperçue (A09). Mais un journal est aussi une copie
des données, lue par plus de monde et conservée longtemps : il ne doit contenir **aucun
secret**.

| À journaliser | À ne jamais journaliser |
| --- | --- |
| Connexions réussies et échouées (identifiant visé, heure, adresse IP) | Mots de passe, même faux |
| Refus d’accès (403), erreurs de validation répétées | Identifiants de session, cookies, en-tête `Authorization` |
| Erreurs serveur avec leur pile (côté serveur seulement) | Jetons, clés d’API, chaîne de connexion à la base |
| Démarrage, arrêt, changement de configuration | Données personnelles au-delà du nécessaire |

```js
// logger.js — journal JSON d’une ligne par événement, sans données sensibles
export function log(level, message, fields = {}) {
  const entry = { time: new Date().toISOString(), level, message, ...fields };
  console.log(JSON.stringify(entry));
}

export function requestLogger(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: req.path, // sans la chaîne de requête, qui peut contenir des données
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
    });
  });
  next();
}
```

Avec le serveur précédent, la requête
`curl -s -X POST 'http://localhost:3000/api/login?token=abc' -H 'Content-Type: application/json' -d '{"email":"ada@example.fr","password":"secret"}'`
produit dans le terminal du serveur (heures et durées variables) :

```text
{"time":"2026-11-21T21:28:51.946Z","level":"info","message":"login attempt","email":"fourni"}
{"time":"2026-11-21T21:28:51.947Z","level":"info","message":"request","method":"POST","path":"/api/login","status":401,"durationMs":6}
```

Ni le mot de passe, ni le `token` de l’URL n’apparaissent. Le format **JSON d’une ligne**
se trie et se filtre facilement par les outils d’analyse, et `JSON.stringify` échappe les
retours à la ligne : un utilisateur ne peut pas fabriquer une fausse ligne de journal en
glissant `\n` dans son e-mail (injection dans les journaux).

## Pièges et idées reçues

- **« Le dépôt est privé, je peux y mettre la clé. »** Les dépôts privés sont clonés sur des
  postes, partagés avec des prestataires, parfois rendus publics. Jamais de secret dans Git.
- **« Mon `.env` est dans `.gitignore`, donc il n’a jamais été publié. »** Vérifie
  l’historique : s’il a été ajouté **avant** la règle, il est déjà dans un commit.
- **« `npm audit` ne trouve rien, donc mes dépendances sont sûres. »** Il ne connaît que les
  failles **publiées**. Il ne remplace ni la mise à jour régulière ni la sobriété.
- **« J’ajoute `includeSubDomains` à HSTS sans réfléchir. »** Le navigateur ignore HSTS reçu
  en HTTP ; mais reçu en HTTPS avec `includeSubDomains`, il interdit le HTTP à **tous** les
  sous-domaines pendant `max-age`. Un sous-domaine encore servi en HTTP devient inaccessible
  pour un an. Active cette option seulement si tous les sous-domaines sont en HTTPS.
- **« Je journalise `req.body` pour déboguer. »** C’est ainsi que des mots de passe finissent
  dans les journaux. Journalise des champs choisis, pas des objets entiers.

## Exercices

### Exercice 1 — Revue de secrets

Relève tous les problèmes de ce fichier et propose une correction.

```js
// db.js
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: 'postgres://admin:Sup3rS3cret@prod-db.example.fr:5432/shop',
});

pool.on('error', (error) => {
  console.error('Erreur PostgreSQL', pool.options.connectionString, error);
});
```

:::solution
- Le mot de passe de production est **écrit dans le code** : il sera versionné. Il faut le
  considérer comme compromis s’il a déjà été poussé, donc le changer.
- L’application se connecte avec l’utilisateur `admin` : contraire au moindre privilège. Un
  rôle dédié avec les seuls droits nécessaires est préférable.
- Le journal d’erreur **affiche la chaîne de connexion**, mot de passe compris.
- Le même code sert tous les environnements : impossible d’avoir une base de développement
  distincte sans modifier le code.

```js
// db.js
import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on('error', (error) => {
  console.error('Erreur PostgreSQL inattendue :', error.message);
});
```

`config.js` lit `DATABASE_URL` dans l’environnement et refuse de démarrer si elle manque.

:::

### Exercice 2 — Une configuration plus stricte

Écris une fonction `loadConfig(env)` qui reçoit un objet de variables (par défaut
`process.env`) et vérifie que : `PORT` est un entier entre 1 et 65535 (3000 par défaut),
`DATABASE_URL` commence par `postgres://` ou `postgresql://`, `SESSION_SECRET` contient au moins
32 caractères. Toutes les erreurs sont signalées **en une fois**. Le résultat est un objet gelé.

:::solution
```js
// config.js — configuration validée, toutes les erreurs signalées d’un coup
export function loadConfig(env = process.env) {
  const errors = [];

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT doit être un entier entre 1 et 65535');
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL doit commencer par postgres:// ou postgresql://');
  }

  const sessionSecret = env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) {
    errors.push('SESSION_SECRET doit contenir au moins 32 caractères');
  }

  if (errors.length > 0) {
    // Le message liste les variables fautives, jamais leurs valeurs
    throw new Error(`Configuration invalide :\n- ${errors.join('\n- ')}`);
  }
  return Object.freeze({ port, databaseUrl, sessionSecret, isProduction: env.NODE_ENV === 'production' });
}
```

Test rapide :

```js
import { loadConfig } from './config.js';

try {
  loadConfig({ PORT: 'abc', DATABASE_URL: 'mysql://x', SESSION_SECRET: 'court' });
} catch (error) {
  console.log(error.message);
}
const config = loadConfig({
  DATABASE_URL: 'postgres://app@localhost/notes',
  SESSION_SECRET: 'x'.repeat(43),
});
console.log(config.port, config.isProduction, Object.isFrozen(config));
```

```text
Configuration invalide :
- PORT doit être un entier entre 1 et 65535
- DATABASE_URL doit commencer par postgres:// ou postgresql://
- SESSION_SECRET doit contenir au moins 32 caractères
3000 false true
```

Recevoir `env` en paramètre rend la fonction **testable** sans modifier `process.env`.
`Object.freeze` empêche une partie du code de modifier la configuration en cours de route.

:::

### Exercice 3 — Masquer avant de journaliser

Écris une fonction `redact(value)` qui renvoie une copie d’un objet (éventuellement imbriqué,
avec des tableaux) où les valeurs des clés `password`, `token`, `authorization`, `cookie`,
`sessionId` et `secret` sont remplacées par `'[masqué]'`, quelle que soit la casse de la clé.

:::solution
```js
// redact.js — masque les champs sensibles avant journalisation
const sensitiveKeys = new Set(['password', 'token', 'authorization', 'cookie', 'sessionid', 'secret']);

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== 'object') return value;
  const copy = {};
  for (const [key, inner] of Object.entries(value)) {
    copy[key] = sensitiveKeys.has(key.toLowerCase()) ? '[masqué]' : redact(inner);
  }
  return copy;
}

console.log(JSON.stringify(redact({
  email: 'ada@example.fr',
  password: 'hunter2',
  headers: { Authorization: 'Bearer abc', 'User-Agent': 'curl/8' },
  attempts: [{ token: 't1' }],
})));
```

```text
{"email":"ada@example.fr","password":"[masqué]","headers":{"Authorization":"[masqué]","User-Agent":"curl/8"},"attempts":[{"token":"[masqué]"}]}
```

La fonction est **récursive** : elle descend dans les objets et les tableaux. Elle ne modifie
pas l’objet d’origine, qui peut encore servir au traitement. C’est une protection de
secours : la règle reste de journaliser des champs choisis plutôt que des objets entiers.

:::

## Récapitulatif

- Aucun secret dans le code ni dans Git : `.env` ignoré, `.env.example` versionné,
  `node --env-file=.env` en développement, variables de la plateforme en production.
- Valider la configuration au démarrage et nommer les variables fautives sans afficher leur
  valeur. Un secret publié se révoque et se remplace.
- `npm audit` signale les failles publiées ; lire les avis, corriger avec `npm audit fix`,
  tester. Versionner `package-lock.json`, utiliser `npm ci`, limiter les dépendances.
- En-têtes : CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Cross-Origin-Opener-Policy`, HSTS seulement en HTTPS ; supprimer `X-Powered-By`. `helmet`
  automatise cela.
- `NODE_ENV=production` empêche Express d’afficher les piles d’erreurs ; un gestionnaire
  d’erreurs maison renvoie un message générique.
- Journaliser les événements de sécurité en JSON d’une ligne, sans mots de passe, jetons,
  cookies ni chaînes de connexion.
