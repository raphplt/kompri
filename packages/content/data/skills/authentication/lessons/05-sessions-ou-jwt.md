---
title: Sessions ou jetons JWT ?
summary: Comprendre la structure et la signature d’un JWT, ses pièges (lisibilité, algorithme, stockage, révocation) et savoir quand le préférer à une session.
durationMinutes: 55
sources:
  - title: RFC 7519 — JSON Web Token (JWT)
    url: https://www.rfc-editor.org/rfc/rfc7519
  - title: RFC 8725 — JSON Web Token Best Current Practices
    url: https://www.rfc-editor.org/rfc/rfc8725
  - title: OWASP — JSON Web Token Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
  - title: Node.js — crypto.createHmac()
    url: https://nodejs.org/api/crypto.html
---

## Le problème : deux façons de se souvenir de l’utilisateur

Avec une session, le serveur **garde** l’information : la table `sessions` dit quel jeton
appartient à qui, jusqu’à quand. Le jeton du navigateur n’est qu’une clé sans signification.
À chaque requête, le serveur consulte sa table.

Il existe une autre approche : donner au client un jeton qui **contient** l’information
(« je suis l’utilisateur 42, valable jusqu’à 9 h 15 ») et qui est **signé**, pour que le
serveur puisse vérifier qu’il ne l’a pas modifié. Plus besoin de table : la signature suffit.
Le format standard de ce type de jeton est le **JWT** (*JSON Web Token*, RFC 7519).

On entend souvent que les JWT sont « plus modernes ». C’est un raccourci trompeur : ce sont
des outils différents, avec des compromis différents. Cette leçon démonte un JWT pièce par
pièce pour que tu puisses choisir en connaissance de cause.

## La structure d’un JWT

Un JWT est formé de trois parties encodées en **base64url** (une variante de base64 sans
caractères spéciaux pour les URL), séparées par des points :

```text
en-tête.contenu.signature
```

- l’**en-tête** (*header*) indique l’algorithme de signature, par exemple `{"alg":"HS256","typ":"JWT"}` ;
- le **contenu** (*payload*) contient des **revendications** (*claims*). La RFC 7519 en
  définit plusieurs, dont `sub` (le sujet, souvent l’identifiant de l’utilisateur), `iat`
  (date d’émission), `exp` (date d’expiration), `iss` (l’émetteur) et `aud` (le destinataire
  prévu). Les dates sont des nombres de **secondes** depuis le 1er janvier 1970 ;
- la **signature** est calculée sur `en-tête.contenu` avec une clé.

Avec l’algorithme **HS256**, la signature est un HMAC-SHA-256 : un code calculé à partir des
données et d’un **secret partagé**. Seul celui qui connaît le secret peut produire une
signature valide ; le même secret sert à vérifier. D’autres algorithmes (RS256, ES256)
utilisent une paire de clés : une clé privée pour signer, une clé publique pour vérifier,
utile quand plusieurs services doivent vérifier sans pouvoir signer.

## Un JWT écrit à la main

En production, on utilise une bibliothèque maintenue (comme `jose`). Pour **comprendre**,
écrivons-en un avec `node:crypto`, en une quarantaine de lignes :

```js
// jwt.js — un JWT HS256 écrit à la main, pour comprendre (en production : une bibliothèque éprouvée)
import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(object) {
  return Buffer.from(JSON.stringify(object)).toString('base64url');
}

function decode(part) {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Jeton mal formé');
  }
}

function hmac(data, secret) {
  return createHmac('sha256', secret).update(data).digest();
}

export function signJwt(claims, secret, { expiresInSeconds = 900, now = Date.now() } = {}) {
  const issuedAt = Math.floor(now / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, iat: issuedAt, exp: issuedAt + expiresInSeconds });
  const signature = hmac(`${header}.${payload}`, secret).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyJwt(token, secret, { now = Date.now() } = {}) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Jeton mal formé');
  const [header, payload, signature] = parts;

  // 1. N’accepter QUE l’algorithme prévu, quoi qu’annonce l’en-tête
  if (decode(header).alg !== 'HS256') throw new Error('Algorithme refusé');

  // 2. Recalculer la signature et comparer en temps constant
  const expected = hmac(`${header}.${payload}`, secret);
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error('Signature invalide');
  }

  // 3. Vérifier la date d’expiration
  const claims = decode(payload);
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(now / 1000)) {
    throw new Error('Jeton expiré');
  }
  return claims;
}
```

Et un script qui le met à l’épreuve. Le paramètre `now` fixe la date pour obtenir un résultat
reproductible :

```js
// try-jwt.js — fabriquer, lire, falsifier un JWT
import { signJwt, verifyJwt } from './jwt.js';

const secret = 'secret-de-demonstration-a-ne-pas-reutiliser';
const now = Date.UTC(2026, 0, 15, 9, 0, 0); // date fixe pour un résultat reproductible

const token = signJwt({ sub: '42', role: 'user' }, secret, { now });
console.log(token);

// 1. Tout le monde peut lire le contenu : il est encodé, pas chiffré
const [header, payload] = token.split('.');
console.log(Buffer.from(header, 'base64url').toString());
console.log(Buffer.from(payload, 'base64url').toString());

// 2. Vérification normale
console.log(verifyJwt(token, secret, { now }));

function tryVerify(label, candidate, options = { now }) {
  try {
    verifyJwt(candidate, secret, options);
    console.log(label, '→ accepté');
  } catch (error) {
    console.log(label, '→', error.message);
  }
}

// 3. Modifier le contenu sans connaître le secret
const forgedPayload = Buffer.from(JSON.stringify({ sub: '42', role: 'admin', iat: 1768467600, exp: 1768468500 })).toString('base64url');
const [h, , s] = token.split('.');
tryVerify('rôle modifié', `${h}.${forgedPayload}.${s}`);

// 4. L’attaque « alg: none » : un en-tête qui prétend ne pas avoir de signature
const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
tryVerify('alg none', `${noneHeader}.${forgedPayload}.`);

// 5. Un mauvais secret
tryVerify('autre secret', signJwt({ sub: '42' }, 'autre-secret', { now }));

// 6. Jeton expiré : 16 minutes plus tard
tryVerify('16 min plus tard', token, { now: now + 16 * 60 * 1000 });
```

Sortie (`node try-jwt.js`) :

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NDY3NjAwLCJleHAiOjE3Njg0Njg1MDB9.pbixdAk_X-4Snv_VbH7yysgJ6XnppQw5eKz-Zybs3Hg
{"alg":"HS256","typ":"JWT"}
{"sub":"42","role":"user","iat":1768467600,"exp":1768468500}
{ sub: '42', role: 'user', iat: 1768467600, exp: 1768468500 }
rôle modifié → Signature invalide
alg none → Algorithme refusé
autre secret → Signature invalide
16 min plus tard → Jeton expiré
```

Ce que montre chaque ligne :

1. Le jeton est une longue chaîne en trois parties. Le décoder **ne demande aucun secret** :
   n’importe qui lit l’en-tête et le contenu. Un JWT signé n’est **pas chiffré**.
2. Avec le bon secret et avant `exp` (900 secondes après `iat`), le jeton est accepté.
3. Changer `role` en `admin` invalide la signature : l’intégrité est protégée.
4. Un jeton qui annonce `alg: none` est refusé **parce que le vérificateur impose HS256**.
5. Un jeton signé avec un autre secret est refusé.
6. Seize minutes plus tard, le jeton a expiré.

### Le piège de l’algorithme choisi par le jeton

Pourquoi le point 4 mérite-t-il une ligne dédiée ? Parce que l’en-tête est écrit… par celui
qui fabrique le jeton. Voici un vérificateur naïf, tel qu’on en a vu dans de vraies
bibliothèques par le passé :

```js
// naive-jwt.js — NE PAS REPRODUIRE : le vérificateur fait confiance à l’en-tête
import { createHmac } from 'node:crypto';

function naiveVerify(token, secret) {
  const [header, payload, signature] = token.split('.');
  const { alg } = JSON.parse(Buffer.from(header, 'base64url').toString());
  if (alg === 'HS256') {
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expected) throw new Error('Signature invalide');
  }
  // Pour tout autre algorithme… rien n’est vérifié
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ sub: '42', role: 'admin' })).toString('base64url');
console.log(naiveVerify(`${noneHeader}.${payload}.`, 'peu importe'));
```

```text
{ sub: '42', role: 'admin' }
```

L’attaquant devient administrateur sans connaître aucun secret. La règle, rappelée par la
RFC 8725 (bonnes pratiques JWT) : le serveur **décide** quel algorithme il accepte et refuse
tout le reste. Avec une bibliothèque, on passe toujours la liste des algorithmes autorisés.

## Un JWT dans une API Express

Le JWT voyage généralement dans l’en-tête `Authorization: Bearer …` :

```js
// jwt-api.js — une route protégée par un JWT dans l’en-tête Authorization
import express from 'express';
import { signJwt, verifyJwt } from './jwt.js';

const secret = process.env.JWT_SECRET; // 32 octets aléatoires au moins, hors du code
if (!secret) throw new Error('JWT_SECRET manquant');

const app = express();

function requireJwt(req, res, next) {
  const header = req.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Jeton manquant' });
  }
  try {
    req.claims = verifyJwt(header.slice('Bearer '.length), secret);
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

// Pour la démonstration seulement : délivre un jeton sans vérifier de mot de passe
app.post('/api/demo-token', (req, res) => {
  res.json({ token: signJwt({ sub: '42' }, secret, { expiresInSeconds: 600 }) });
});

app.get('/api/profile', requireJwt, (req, res) => {
  res.json({ userId: req.claims.sub });
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

```bash
export JWT_SECRET=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")
node jwt-api.js
```

Dans un autre terminal (en récupérant le jeton renvoyé par `/api/demo-token` dans `TOKEN`) :

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/profile; echo
curl -s http://localhost:3000/api/profile; echo
curl -s -H "Authorization: Bearer ${TOKEN}x" http://localhost:3000/api/profile; echo
curl -s -H "Authorization: Bearer a.b.c" http://localhost:3000/api/profile; echo
```

```text
{"userId":"42"}
{"error":"Jeton manquant"}
{"error":"Signature invalide"}
{"error":"Jeton mal formé"}
```

Remarque : aucune requête à la base pour vérifier le jeton. C’est l’avantage principal… et la
source des difficultés qui suivent.

## Les pièges des JWT

### Le contenu est public

Puisque le contenu se décode sans secret, on n’y met **rien de confidentiel** : ni mot de
passe, ni donnée personnelle inutile. Seulement des identifiants et des dates.

### Le secret doit être fort

Avec HS256, quiconque possède un jeton peut tester des secrets **hors ligne**, sans limite de
tentatives : il recalcule la signature et compare. Un secret comme `secret` ou `motdepasse`
tombe vite. Utilise au moins 32 octets aléatoires (`randomBytes(32)`), stockés dans
l’environnement.

### La révocation est difficile

Une session se révoque en supprimant une ligne. Un JWT, lui, reste valide **jusqu’à `exp`**,
puisque le serveur ne consulte rien. Conséquences :

- la « déconnexion » ne fait qu’oublier le jeton côté client ; une copie volée reste utilisable ;
- un utilisateur banni ou dont le rôle a changé garde ses anciens droits jusqu’à l’expiration.

Les parades connues réintroduisent toutes un **état côté serveur** : une durée de vie courte
(quelques minutes) avec un second jeton de renouvellement (*refresh token*) stocké et
révocable sur le serveur, ou une liste de jetons révoqués consultée à chaque requête. À ce
stade, on a reconstruit… une session.

### Où le stocker dans le navigateur ?

| Emplacement | Avantage | Risque |
| --- | --- | --- |
| `localStorage` | Simple à lire en JavaScript pour l’en-tête `Authorization` | Lisible par **tout** script de la page : une XSS vole le jeton, utilisable ailleurs jusqu’à `exp` |
| Cookie `HttpOnly` | Illisible par les scripts | Envoyé automatiquement : on retrouve les questions CSRF, comme pour une session |

Il n’y a pas de solution magique : un JWT dans un cookie `HttpOnly; Secure; SameSite` a les
mêmes protections qu’un cookie de session, sans la révocation simple.

### Valider toutes les revendications utiles

Vérifier la signature ne suffit pas : il faut aussi `exp`, et, quand plusieurs services
existent, `iss` (qui a émis le jeton) et `aud` (à qui il est destiné). Sans contrôle de `aud`, un
jeton émis pour un autre service du même émetteur pourrait être accepté par ton API.

## Sessions ou JWT : comment choisir ?

| Critère | Session côté serveur | JWT signé |
| --- | --- | --- |
| Vérification | Lecture en base à chaque requête | Calcul de signature, sans base |
| Révocation immédiate | Oui, supprimer la ligne | Non, sauf état côté serveur ajouté |
| Contenu visible du client | Rien (jeton opaque) | Tout le contenu, décodable |
| Taille du cookie ou de l’en-tête | Petite | Grandit avec les revendications |
| Vérification par plusieurs services | Chacun doit accéder au stockage des sessions | Possible avec la clé publique (RS256, ES256) |
| Complexité de mise en œuvre sûre | Faible | Plus élevée (algorithmes, clés, révocation) |

En pratique :

- pour une application web classique, dont l’interface et l’API sont servies par le même
  serveur, la **session par cookie** est le choix le plus simple et le plus sûr. C’est celui
  de ce parcours ;
- les JWT sont adaptés aux jetons **de courte durée** échangés entre services, ou aux
  protocoles d’identité fédérée comme OpenID Connect, où un fournisseur d’identité émet des
  jetons que d’autres applications vérifient avec sa clé publique.

## Pièges et idées reçues

- **« Le JWT est chiffré. »** Non, il est **signé** : intégrité, pas confidentialité.
- **« Les JWT sont sans état, donc plus sûrs. »** Sans état veut dire sans révocation simple.
- **« Je décode le jeton côté serveur avec une fonction de décodage. »** Décoder n’est pas
  vérifier. Une fonction `decode` de bibliothèque ne contrôle pas la signature.
- **« Mon jeton n’expire jamais, c’est plus pratique. »** Un jeton volé serait alors valable à
  vie. Toujours un `exp`, court.
- **Faire confiance à l’en-tête `alg`.** Le serveur impose l’algorithme.

## Exercices

### Exercice 1 — Lire un jeton

On te transmet ce jeton trouvé dans le `localStorage` d’une application :

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NDY3NjAwLCJleHAiOjE3Njg0Njg1MDB9.pbixdAk_X-4Snv_VbH7yysgJ6XnppQw5eKz-Zybs3Hg
```

Sans connaître le secret, donne l’algorithme, l’utilisateur, le rôle, et la durée de validité.
Quelle commande Node.js utilises-tu ? Que peux-tu faire de plus avec ce jeton ?

:::solution
```bash
node -e "const [h, p] = process.argv[1].split('.'); console.log(Buffer.from(h, 'base64url').toString(), Buffer.from(p, 'base64url').toString())" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NDY3NjAwLCJleHAiOjE3Njg0Njg1MDB9.pbixdAk_X-4Snv_VbH7yysgJ6XnppQw5eKz-Zybs3Hg"
```

```text
{"alg":"HS256","typ":"JWT"} {"sub":"42","role":"user","iat":1768467600,"exp":1768468500}
```

Algorithme HS256, utilisateur `42`, rôle `user`, validité de 1768468500 − 1768467600 = 900
secondes, soit 15 minutes. Avec ce jeton, tu peux appeler l’API **en tant que l’utilisateur
42** jusqu’à son expiration : c’est pourquoi un jeton dans le `localStorage` est une cible de
choix pour une XSS. Tu ne peux pas, en revanche, changer le rôle sans invalider la signature.

:::

### Exercice 2 — Vérifier l’émetteur et l’audience

Écris `verifyAccessToken(token, secret, { issuer, audience })`, qui s’appuie sur `verifyJwt`
et refuse en plus un jeton dont `iss` ou `aud` ne correspond pas. Teste avec un jeton destiné à
`notes-api` et un jeton destiné à `billing-api`.

:::solution
```js
import { signJwt, verifyJwt } from './jwt.js';

export function verifyAccessToken(token, secret, { issuer, audience, now = Date.now() } = {}) {
  const claims = verifyJwt(token, secret, { now }); // signature, algorithme, expiration
  if (claims.iss !== issuer) throw new Error('Émetteur inattendu');
  if (claims.aud !== audience) throw new Error('Audience inattendue');
  return claims;
}

const secret = 'secret-de-demonstration-a-ne-pas-reutiliser';
const expected = { issuer: 'https://auth.example.fr', audience: 'notes-api' };

const good = signJwt({ sub: '42', iss: 'https://auth.example.fr', aud: 'notes-api' }, secret);
const otherApi = signJwt({ sub: '42', iss: 'https://auth.example.fr', aud: 'billing-api' }, secret);

console.log(verifyAccessToken(good, secret, expected).sub);
try {
  verifyAccessToken(otherApi, secret, expected);
} catch (error) {
  console.log(error.message);
}
```

```text
42
Audience inattendue
```

Les contrôles viennent **après** la vérification de signature : inutile de lire des
revendications non authentifiées. La RFC 7519 autorise aussi `aud` sous forme de tableau ; une
version complète devrait accepter un tableau qui contient l’audience attendue.

:::

### Exercice 3 — Choisir

Pour chaque projet, choisis session ou JWT et justifie en deux phrases.

1. Une application de prise de notes : une interface web et une API Express sur le même domaine.
2. Un service de génération de PDF interne, appelé par trois autres services de l’entreprise,
   qui doit savoir quel utilisateur a demandé le document.
3. Une banque en ligne qui doit pouvoir couper immédiatement l’accès d’un client.

:::solution
1. **Session par cookie** : même origine, révocation immédiate, rien à exposer au client.
   Un JWT n’apporterait que de la complexité.
2. **JWT de courte durée**, signé par le service d’authentification avec une clé privée
   (RS256 ou ES256) : le service PDF vérifie avec la clé publique, sans accès à la base des
   sessions. On contrôle `aud` pour qu’un jeton prévu pour un autre service soit refusé.
3. **Session** (ou jetons très courts adossés à un état serveur) : l’exigence de coupure
   immédiate impose de pouvoir révoquer, ce que la session fait naturellement.

:::

## Récapitulatif

- Un JWT = `en-tête.contenu.signature` en base64url ; HS256 signe avec un secret partagé,
  RS256/ES256 avec une paire de clés.
- Le contenu est lisible par tous : signé, pas chiffré. N’y mettre que des identifiants et des
  dates.
- Vérifier : algorithme imposé par le serveur, signature en temps constant, `exp`, et `iss`/`aud`
  quand c’est pertinent. Secret de 32 octets aléatoires au moins.
- Révocation difficile : durée courte et état serveur (renouvellement ou liste de révocation).
- Stockage : `localStorage` exposé à la XSS, cookie `HttpOnly` exposé au CSRF comme une session.
- Pour une application web sur une seule origine, la session par cookie reste le choix le plus
  simple et le plus sûr ; les JWT servent surtout entre services et dans l’identité fédérée.
