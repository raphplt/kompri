---
title: CSRF, cookies et politique de même origine
summary: Comprendre ce que le navigateur envoie et lit d’un site à l’autre, régler les attributs de cookies et bloquer les requêtes forgées.
durationMinutes: 60
sources:
  - title: MDN — Politique de même origine
    url: https://developer.mozilla.org/fr/docs/Web/Security/Defenses/Same-origin_policy
  - title: MDN — Set-Cookie
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Set-Cookie
  - title: OWASP — Cross-Site Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
  - title: MDN — Cross-Origin Resource Sharing (CORS)
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CORS
---

## Le problème : le navigateur travaille pour tout le monde

Quand tu es connecté à ta banque, ton navigateur garde un cookie de session. Il le renvoie
**automatiquement** à chaque requête vers la banque. Pratique : tu n’as pas à te reconnecter à
chaque clic. Mais ces requêtes peuvent aussi être déclenchées par **une autre page**, ouverte
dans un autre onglet : un formulaire caché, une image, un lien.

Le **Cross-Site Request Forgery** (CSRF, falsification de requête intersite) exploite ce
comportement : un site malveillant fait envoyer à ton navigateur une requête vers un site où
tu es connecté, avec tes cookies. Le serveur visé voit une requête authentifiée et l’exécute.

Pour s’en protéger, il faut comprendre trois mécanismes du navigateur : les attributs de
cookies, la politique de même origine et CORS. Tu as vu leur principe dans « HTTP en
profondeur » ; cette leçon les regarde du point de vue de l’attaquant.

## Origine et site

Une **origine** est le triplet **schéma + hôte + port**. Deux URL ont la même origine si les
trois sont identiques :

| URL comparée à `https://app.example.fr` | Même origine ? | Raison |
| --- | --- | --- |
| `https://app.example.fr/tasks?page=2` | Oui | Seuls le chemin et la requête changent |
| `http://app.example.fr` | Non | Schéma différent |
| `https://app.example.fr:8443` | Non | Port différent (443 par défaut en HTTPS) |
| `https://api.example.fr` | Non | Hôte différent |
| `https://example.fr` | Non | Hôte différent |

Le **site** est une notion plus large : schéma + domaine enregistrable (par exemple
`example.fr`). `https://app.example.fr` et `https://api.example.fr` sont deux origines
différentes mais le **même site**. Retiens que l’attribut `SameSite` des cookies raisonne en
sites, et la politique de même origine en origines.

## La politique de même origine (SOP)

La politique de même origine (*same-origin policy*) est la règle de base de la sécurité des
navigateurs : un script d’une origine **ne peut pas lire** les ressources d’une autre origine.
Concrètement, un script de `https://evil.example` qui appelle
`fetch('https://ta-banque.fr/api/comptes')` ne pourra pas lire la réponse.

Mais la SOP n’empêche pas tout. Elle bloque surtout la **lecture** ; elle laisse passer de
nombreux **envois** :

| Action depuis une autre origine | Autorisée par le navigateur ? |
| --- | --- |
| Soumettre un formulaire HTML (`GET` ou `POST`) | Oui, et la page cible s’affiche |
| Charger une image, un script, une feuille de style | Oui |
| Suivre un lien | Oui |
| `fetch` en `POST` avec un corps de formulaire ou du texte | La requête **part**, la réponse est illisible |
| `fetch` avec `Content-Type: application/json` ou un en-tête personnalisé | Pré-vérification CORS d’abord : la requête ne part que si le serveur l’autorise |
| Lire la réponse d’un `fetch`, le contenu d’une `iframe` | Non, sauf autorisation CORS |

C’est exactement la faille qu’exploite le CSRF : l’attaquant n’a pas besoin de lire la réponse,
il lui suffit que la requête **arrive** avec les cookies de la victime.

## Une attaque CSRF observée

Voici deux serveurs sur ta machine : une « banque » sur le port 3000 et un site malveillant
sur le port 4000. `http://localhost:3000` et `http://127.0.0.1:4000` sont deux sites
différents pour le navigateur.

```js
// csrf-demo.js — une banque naïve et un site malveillant
import express from 'express';

const bank = express();
bank.use(express.urlencoded({ extended: false }));

// Connexion simulée : pose un cookie avec l’attribut SameSite demandé
bank.get('/login', (req, res) => {
  const sameSite = req.query.samesite;
  const options = { httpOnly: true, path: '/' };
  if (sameSite === 'none') {
    options.sameSite = 'none';
    options.secure = true; // SameSite=None exige Secure
  } else if (sameSite) {
    options.sameSite = sameSite;
  }
  res.cookie('sid', 'session-' + (sameSite ?? 'default'), options);
  res.send('connecté');
});

bank.post('/transfer', (req, res) => {
  console.log('transfer: cookie =', req.headers.cookie ?? '(aucun)',
    '| origin =', req.get('Origin'), '| body =', JSON.stringify(req.body));
  res.send('ok');
});
bank.listen(3000);

// Le site malveillant soumet un formulaire caché dès l’ouverture de la page
const evil = express();
evil.get('/', (req, res) => {
  res.send(`<!doctype html>
<form method="post" action="http://localhost:3000/transfer">
  <input name="to" value="mallory"><input name="amount" value="500">
</form>
<script>document.forms[0].submit()</script>`);
});
evil.listen(4000);
```

Lance `node csrf-demo.js`. Dans Chromium, ouvre `http://localhost:3000/login?samesite=lax`
puis `http://127.0.0.1:4000/`. Recommence dans une fenêtre de navigation privée neuve avec
`strict`, `none`, puis sans paramètre. Voici ce qu’affiche le terminal du serveur, lors de
notre essai avec Chromium :

```text
transfer: cookie = (aucun) | origin = http://127.0.0.1:4000 | body = {"to":"mallory","amount":"500"}
transfer: cookie = (aucun) | origin = http://127.0.0.1:4000 | body = {"to":"mallory","amount":"500"}
transfer: cookie = sid=session-none | origin = http://127.0.0.1:4000 | body = {"to":"mallory","amount":"500"}
transfer: cookie = sid=session-default | origin = http://127.0.0.1:4000 | body = {"to":"mallory","amount":"500"}
```

Lis ces quatre lignes attentivement :

1. Avec `SameSite=Lax`, le formulaire intersite arrive **sans** cookie : le virement n’est pas
   authentifié.
2. Avec `SameSite=Strict`, même résultat.
3. Avec `SameSite=None`, le cookie est envoyé : l’attaque réussit.
4. **Sans attribut**, le cookie a été envoyé, alors que Chromium affiche cet attribut comme
   `Lax` par défaut. Chromium applique une tolérance temporaire aux cookies qui viennent
   d’être créés sans attribut explicite. D’autres navigateurs n’appliquent pas `Lax` par
   défaut. Conclusion : **déclare toujours `SameSite` explicitement**.

Remarque aussi l’en-tête `Origin` : le navigateur indique d’où vient la requête. C’est une
information précieuse pour la défense.

## Les attributs de cookies

Le serveur pose un cookie avec l’en-tête `Set-Cookie`. Avec Express :

```js
res.cookie('sid', sessionId, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 1000, // une heure, en millisecondes
});
```

En-tête produit (l’identifiant et la date varient) :

```http
Set-Cookie: sid=RX_lvaLzxVy0weSQw-ALOAEsSIhgMNuyZge4GGK-2O8; Max-Age=3600; Path=/; Expires=Sat, 21 Nov 2026 22:28:17 GMT; HttpOnly; SameSite=Lax
```

| Attribut | Effet | Réglage conseillé pour un cookie de session |
| --- | --- | --- |
| `HttpOnly` | Le cookie est invisible pour `document.cookie` | Toujours |
| `Secure` | Envoyé uniquement en HTTPS | Toujours en production |
| `SameSite=Strict` | Jamais envoyé depuis un autre site, même en suivant un lien | Applications sensibles |
| `SameSite=Lax` | Envoyé depuis un autre site seulement lors d’une navigation de premier niveau en `GET` (clic sur un lien) | Bon choix par défaut |
| `SameSite=None` | Toujours envoyé ; exige `Secure` | Seulement si un autre site doit vraiment l’utiliser |
| `Max-Age` / `Expires` | Durée de vie ; sans eux, cookie « de session » effacé à la fermeture du navigateur | Durée courte et adaptée |
| `Path` | Chemins pour lesquels le cookie est envoyé | `/` |
| `Domain` | Partage le cookie avec les sous-domaines | Ne pas le mettre |

`maxAge` s’exprime en **millisecondes** dans Express, et l’en-tête `Max-Age` en **secondes** :
Express fait la conversion.

### Lax et les requêtes GET

`Lax` laisse passer le cookie quand l’utilisateur **clique sur un lien** venant d’un autre
site. Dans notre essai avec Chromium, un lien vers `http://localhost:3000/delete-account`
publié sur le site malveillant a transmis le cookie `Lax` (mais pas le cookie `Strict`), alors
qu’une balise `img` pointant vers la même URL ne l’a transmis dans aucun cas. Si une route
`GET` modifie des données, `Lax` ne la protège donc pas. D’où une règle simple : **une requête
`GET` ne modifie jamais rien**. C’est aussi ce que demande la sémantique HTTP.

## Se défendre contre le CSRF

Plusieurs parades se combinent. Pour une API JSON appelée par ta propre interface :

1. **Cookie de session `SameSite=Lax` (ou `Strict`)**, `HttpOnly`, `Secure`.
2. **Aucune modification en `GET`.**
3. **Vérifier l’origine** des requêtes qui modifient : refuser un en-tête `Origin` inconnu, ou
   un en-tête `Sec-Fetch-Site: cross-site` (envoyé par les navigateurs récents).
4. **N’accepter que du JSON** : un formulaire HTML ne sait pas envoyer
   `Content-Type: application/json`, et un `fetch` intersite avec ce type déclenche une
   pré-vérification CORS que ton serveur n’autorisera pas.

```js
// api-protected.js — cookie de session, vérification d’origine et JSON obligatoire
import express from 'express';
import { randomBytes } from 'node:crypto';

const app = express();
const allowedOrigins = new Set(['http://localhost:3000']);
const isProduction = process.env.NODE_ENV === 'production';

// 1. Refuse les requêtes modifiantes venues d’une autre origine
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
function checkOrigin(req, res, next) {
  if (safeMethods.has(req.method)) return next();
  const origin = req.get('Origin');
  const fetchSite = req.get('Sec-Fetch-Site');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origine refusée' });
  }
  if (fetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Requête intersite refusée' });
  }
  next();
}

// 2. N’accepte que du JSON pour les requêtes avec corps
function requireJson(req, res, next) {
  if (safeMethods.has(req.method) || req.is('application/json')) return next();
  res.status(415).json({ error: 'Content-Type application/json attendu' });
}

app.use(checkOrigin);
app.use(requireJson);
app.use(express.json());

app.post('/api/login', (req, res) => {
  // (vérification du mot de passe omise : voir la compétence Authentification)
  const sessionId = randomBytes(32).toString('base64url');
  res.cookie('sid', sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
  res.status(204).end();
});

app.post('/api/notes', (req, res) => {
  res.status(201).json({ received: req.body });
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
```

Vérifie avec `curl` (qui, lui, envoie les en-têtes que tu lui donnes) :

```bash
curl -s -X POST http://localhost:3000/api/notes -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' -d '{"text":"hi"}'
curl -s -X POST http://localhost:3000/api/notes -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' -d '{"text":"hi"}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/notes \
  -H 'Content-Type: application/x-www-form-urlencoded' -d 'text=hi'
curl -s -X POST http://localhost:3000/api/notes -H 'Sec-Fetch-Site: cross-site' \
  -H 'Content-Type: application/json' -d '{"text":"hi"}'
```

```text
{"error":"Origine refusée"}
{"received":{"text":"hi"}}
415
{"error":"Requête intersite refusée"}
```

Une requête **sans** `Origin` ni `Sec-Fetch-Site` est acceptée : c’est le cas de `curl` ou d’un
script. Ce n’est pas un problème pour le CSRF, car ces clients ne possèdent pas les cookies de
la victime ; c’est l’authentification qui les arrêtera.

### Le jeton anti-CSRF pour les formulaires classiques

Quand le serveur produit des pages HTML avec de vrais formulaires, la parade de référence
est le **jeton synchronisé** (*synchronizer token*) : un secret aléatoire lié à la session,
placé dans un champ caché, et vérifié à chaque envoi. Le site malveillant ne peut pas le
deviner, et la SOP l’empêche de lire la page pour le récupérer.

```js
// csrf-token.js — jeton anti-CSRF « synchronisé » avec la session
import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const app = express();
app.use(express.urlencoded({ extended: false }));

const sessions = new Map(); // identifiant de session -> données de session

function readCookie(req, name) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

function loadSession(req, res, next) {
  req.session = sessions.get(readCookie(req, 'sid')) ?? null;
  next();
}

function sameToken(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function requireCsrfToken(req, res, next) {
  if (!req.session || !sameToken(req.body?._csrf ?? '', req.session.csrfToken)) {
    return res.status(403).send('Jeton CSRF invalide');
  }
  next();
}

app.use(loadSession);

// Connexion simulée : crée une session et son jeton CSRF
app.post('/login', (req, res) => {
  const sid = randomBytes(32).toString('base64url');
  sessions.set(sid, { email: 'ada@example.fr', csrfToken: randomBytes(32).toString('base64url') });
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.redirect(303, '/settings');
});

app.get('/settings', (req, res) => {
  if (!req.session) return res.status(401).send('Connecte-toi');
  // Le jeton est placé dans un champ caché : un autre site ne peut pas le lire
  res.send(`<form method="post" action="/settings/email">
  <input type="hidden" name="_csrf" value="${req.session.csrfToken}">
  <label>Nouvel e-mail <input name="email" type="email"></label>
  <button>Enregistrer</button>
</form>`);
});

app.post('/settings/email', requireCsrfToken, (req, res) => {
  req.session.email = req.body.email;
  res.send(`E-mail mis à jour : ${req.session.email.length} caractères`);
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

Test avec un fichier de cookies `curl` (`-c` enregistre, `-b` renvoie) :

```bash
curl -s -c jar.txt -b jar.txt -X POST localhost:3000/login -o /dev/null
TOKEN=$(curl -s -b jar.txt localhost:3000/settings | grep -o 'value="[^"]*"' | cut -d'"' -f2)
curl -s -b jar.txt -X POST localhost:3000/settings/email -d "email=mallory@example.com"; echo
curl -s -b jar.txt -X POST localhost:3000/settings/email -d "email=mallory@example.com&_csrf=devine"; echo
curl -s -b jar.txt -X POST localhost:3000/settings/email \
  --data-urlencode "email=ada@nouveau.fr" --data-urlencode "_csrf=$TOKEN"; echo
```

```text
Jeton CSRF invalide
Jeton CSRF invalide
E-mail mis à jour : 14 caractères
```

`timingSafeEqual` compare deux tampons en un temps qui ne dépend pas de la position de la
première différence : une comparaison avec `===` peut s’arrêter au premier caractère faux, ce
qui donne en théorie une information mesurable. La fonction exige deux tampons de même
longueur, d’où le test préalable. Le jeton, en base64url, ne contient que des lettres, des
chiffres, `-` et `_` : il peut être inséré dans l’attribut sans échappement.

:::warning[Le XSS contourne toutes ces parades]
Un script injecté dans ta page est **de la même origine** : il peut lire le jeton CSRF,
envoyer l’en-tête `Origin` attendu et du JSON. Les protections CSRF supposent l’absence de
XSS.

:::

## CORS : assouplir la SOP, pas protéger le serveur

Parfois, une autre origine doit **lire** ton API : une interface servie sur
`https://app.example.fr` qui appelle `https://api.example.fr`. Le mécanisme **CORS**
(*Cross-Origin Resource Sharing*) permet au serveur de dire au navigateur : « cette origine a
le droit de lire mes réponses ».

```js
// cors-api.js — autoriser une seule origine précise à lire l’API
import express from 'express';

const app = express();
const allowedOrigins = new Set(['https://app.example.fr']);

function cors(req, res, next) {
  const origin = req.get('Origin');
  res.vary('Origin'); // la réponse dépend de l’origine : prévenir les caches
  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    // Requête de pré-vérification (preflight)
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '600');
    return res.status(204).end();
  }
  next();
}

app.use(cors);
app.use(express.json());
app.get('/api/profile', (req, res) => res.json({ name: 'Ada' }));

app.listen(3001, () => console.log('API sur http://localhost:3001'));
```

```bash
curl -s -i http://localhost:3001/api/profile -H 'Origin: https://app.example.fr'
curl -s -i http://localhost:3001/api/profile -H 'Origin: https://evil.example'
```

En-têtes utiles des deux réponses :

```text
HTTP/1.1 200 OK
Vary: Origin
Access-Control-Allow-Origin: https://app.example.fr
Access-Control-Allow-Credentials: true

HTTP/1.1 200 OK
Vary: Origin
{"name":"Ada"}
```

Observe la seconde réponse : le serveur a **traité** la requête et renvoyé les données. CORS
ne bloque rien côté serveur. C’est le **navigateur** qui, ne voyant pas
`Access-Control-Allow-Origin`, refusera de donner la réponse au script de `evil.example`.
CORS n’est donc ni une authentification, ni une protection contre le CSRF.

Si ton interface et ton API ont la **même origine** (Express sert à la fois `public/` et
`/api`), tu n’as besoin d’aucune configuration CORS : c’est la situation la plus simple et la
plus sûre. Le paquet npm `cors` existe pour Express ; il fait la même chose que ce middleware,
avec plus d’options.

## Pièges et idées reçues

- **Refléter n’importe quelle origine** : `res.set('Access-Control-Allow-Origin', req.get('Origin'))`
  avec `Allow-Credentials: true` autorise **tous** les sites à lire les données de tes
  utilisateurs connectés. Utilise toujours une liste blanche.
- **`Access-Control-Allow-Origin: *` avec des cookies** : la spécification l’interdit ; le
  navigateur refuse la réponse. `*` convient seulement aux données publiques sans cookies.
- **« J’ai mis CORS, donc les autres sites ne peuvent pas appeler mon API. »** Les formulaires
  et les requêtes simples partent quand même. CORS protège la **lecture**, pas l’action.
- **Un `GET` qui supprime** : `SameSite=Lax` laisse passer le cookie sur un clic intersite.
- **Oublier `Vary: Origin`** : un cache intermédiaire pourrait servir à une origine la réponse
  préparée pour une autre.
- **Mettre `Domain=example.fr`** : le cookie est alors partagé avec **tous** les sous-domaines,
  y compris un sous-domaine mal maîtrisé.

## Exercices

### Exercice 1 — Origines et sites

Pour chaque paire, indique « même origine », « même site mais origine différente » ou « sites
différents ».

1. `https://shop.example.fr/panier` et `https://shop.example.fr/compte`
2. `https://shop.example.fr` et `https://api.example.fr`
3. `https://shop.example.fr` et `http://shop.example.fr`
4. `http://localhost:3000` et `http://localhost:5173`
5. `https://example.fr` et `https://example.com`

:::solution
1. Même origine : schéma, hôte et port identiques ; seul le chemin change.
2. Même site (`example.fr`), origines différentes (hôtes différents).
3. Origines différentes (schéma) et sites différents : la spécification HTML inclut le
   schéma dans la définition du site, donc HTTP et HTTPS ne forment pas le même site.
4. Origines différentes (port), même site : le port n’entre pas dans la notion de site.
   C’est la situation d’un serveur de développement front-end à côté d’une API.
5. Sites différents : domaines enregistrables différents.

:::

### Exercice 2 — Choisir les attributs

Pour chacun de ces cookies, propose les attributs et justifie.

1. Le cookie de session d’une application de gestion de tâches, servie en HTTPS, interface et
   API sur la même origine.
2. Un cookie qui mémorise la langue choisie, lu par le JavaScript de la page.
3. Le cookie de session d’une banque en ligne.

:::solution
1. `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…` (durée limitée, par exemple une
   semaine). `Lax` garde l’utilisateur connecté quand il arrive par un lien depuis un e-mail.
   Pas de `Domain`.
2. Pas `HttpOnly`, puisque le script doit le lire ; `Secure; SameSite=Lax; Path=/` et une
   longue durée. Ce cookie ne doit contenir **aucune** information sensible.
3. `HttpOnly; Secure; SameSite=Strict; Path=/` avec une durée courte. `Strict` impose de
   se reconnecter quand on arrive par un lien externe : un inconvénient accepté pour une
   application sensible.

:::

### Exercice 3 — Relire une configuration CORS

Une IA propose ce middleware pour « régler les erreurs CORS ». Explique le risque et corrige.

```js
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', req.get('Origin') ?? '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', '*');
  next();
});
```

:::solution
Le middleware **reflète** toute origine avec `Allow-Credentials: true`. N’importe quel site
peut donc faire un `fetch(…, { credentials: 'include' })` vers l’API et **lire** les réponses
avec les cookies de la victime : profil, tâches, données personnelles. C’est une fuite de
données (A01 Broken Access Control ou A05 Security Misconfiguration selon la lecture). Il
manque aussi `Vary: Origin`.

Correction : n’autoriser que des origines connues, comme `cors-api.js` :

```js
const allowedOrigins = new Set(['https://app.example.fr']);
app.use((req, res, next) => {
  const origin = req.get('Origin');
  res.vary('Origin');
  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
```

Et si l’interface est servie par la même origine que l’API, la meilleure correction est de
**supprimer** ce middleware.

:::

## Récapitulatif

- Origine = schéma + hôte + port. Site = schéma + domaine enregistrable.
- La politique de même origine bloque la **lecture** entre origines, pas l’**envoi** de
  formulaires, d’images ou de requêtes simples.
- Le CSRF fait envoyer par le navigateur de la victime une requête authentifiée par ses
  cookies.
- Cookie de session : `HttpOnly`, `Secure`, `SameSite=Lax` ou `Strict` déclaré explicitement,
  durée limitée, pas de `Domain`.
- Parades CSRF : aucune modification en `GET`, vérification de `Origin`/`Sec-Fetch-Site`,
  JSON obligatoire pour l’API, jeton synchronisé pour les formulaires classiques.
- CORS assouplit la SOP pour la lecture ; il ne protège pas le serveur. Liste blanche
  d’origines, `Vary: Origin`, jamais de reflet aveugle.
- Une XSS annule les protections CSRF.
