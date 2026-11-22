---
title: Cookies, origine et CORS
summary: Comprendre comment un serveur garde une session avec les cookies, ce qu’est une origine et comment CORS assouplit la politique de même origine.
durationMinutes: 70
sources:
  - title: MDN — Utiliser les cookies HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Cookies
  - title: MDN — Politique de même origine
    url: https://developer.mozilla.org/fr/docs/Web/Security/Defenses/Same-origin_policy
  - title: MDN — Cross-Origin Resource Sharing (CORS)
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CORS
  - title: WHATWG — Fetch Standard (protocole CORS)
    url: https://fetch.spec.whatwg.org/
---

HTTP est sans état : chaque requête est indépendante. Pourtant, quand tu te connectes à
un site, il te reconnaît à chaque page. Et quand une page de `https://boutique.example`
essaie de lire des données sur `https://api.autre.example`, le navigateur bloque parfois
la réponse avec une erreur « CORS » qui déroute tous les débutants.

Ces deux sujets sont liés : les **cookies** sont envoyés automatiquement par le
navigateur, et c’est justement pour éviter qu’un site malveillant profite de tes cookies
sur un autre site que le navigateur applique la **politique de même origine**. **CORS**
est le mécanisme qui permet à un serveur d’assouplir cette politique, de façon contrôlée.

## Le laboratoire : deux serveurs

Crée `cookies-cors-lab.mjs` dans `http-lab`. Ce fichier lance **deux** serveurs : un
« site » sur le port 3000 et une « API » sur le port 4000. Chacun écrit dans le terminal
chaque requête qu’il reçoit.

```js
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

// Sessions en mémoire : identifiant de session -> nom de l’utilisateur.
const sessions = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readCookies(req) {
  const cookies = new Map();
  for (const pair of (req.headers.cookie ?? '').split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies.set(name, rest.join('='));
  }
  return cookies;
}

// Site principal, origine http://localhost:3000
const site = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  console.log(`[site 3000] ${req.method} ${pathname}`);

  if (pathname === '/') {
    const page = '<!doctype html><title>Site</title><h1>Port 3000</h1>';
    return send(res, 200, page, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  if (pathname === '/login' && req.method === 'POST') {
    const sessionId = randomUUID();
    sessions.set(sessionId, 'ada');
    return send(res, 200, 'Connectée en tant que ada\n', {
      'Set-Cookie': `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`,
    });
  }
  if (pathname === '/me') {
    const user = sessions.get(readCookies(req).get('session'));
    return user
      ? send(res, 200, `Tu es ${user}\n`)
      : send(res, 401, 'Non connecté\n');
  }
  if (pathname === '/logout' && req.method === 'POST') {
    sessions.delete(readCookies(req).get('session'));
    return send(res, 200, 'Déconnectée\n', {
      'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    });
  }
  return send(res, 404, 'Ressource introuvable\n');
});

// API séparée, origine http://localhost:4000
const allowedOrigin = 'http://localhost:3000';

const api = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  console.log(
    `[api 4000] ${req.method} ${pathname} (Origin: ${req.headers.origin ?? 'aucune'})`,
  );
  const data = `${JSON.stringify({ temperature: 18 })}\n`;
  const json = { 'Content-Type': 'application/json; charset=utf-8' };

  if (pathname === '/no-cors') {
    return send(res, 200, data, json);
  }
  if (pathname === '/with-cors') {
    if (req.method === 'OPTIONS') {
      // Réponse à la requête préliminaire (preflight).
      res.writeHead(204, {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      });
      return res.end();
    }
    return send(res, 200, data, {
      ...json,
      'Access-Control-Allow-Origin': allowedOrigin,
      Vary: 'Origin',
    });
  }
  return send(res, 404, 'Ressource introuvable\n');
});

site.listen(3000, () => console.log('Site prêt sur http://localhost:3000'));
api.listen(4000, () => console.log('API prête sur http://localhost:4000'));
```

Arrête les serveurs précédents, puis :

```bash
node cookies-cors-lab.mjs
```

```text
Site prêt sur http://localhost:3000
API prête sur http://localhost:4000
```

## Les cookies

### Le principe

Un **cookie** est une petite donnée qu’un serveur demande au client de conserver, puis de
lui renvoyer à chaque requête suivante. Deux en-têtes suffisent :

1. le serveur envoie **`Set-Cookie`** dans une réponse ;
2. le client renvoie **`Cookie`** dans ses requêtes suivantes vers le même site.

Le cas d’usage principal est la **session** : à la connexion, le serveur crée un
identifiant aléatoire, le garde en mémoire (ou en base) avec le nom de l’utilisateur, et
l’envoie en cookie. À chaque requête, il retrouve l’utilisateur grâce à cet identifiant.

### Une session avec curl

curl ne garde pas les cookies tout seul. `-c fichier` enregistre les cookies reçus,
`-b fichier` les renvoie :

```bash
curl -i -X POST -c cookies.txt http://localhost:3000/login
```

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 27
Set-Cookie: session=10cb5bc0-bf54-4c2f-ab82-f6ab0b898aed; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600

Connectée en tant que ada
```

L’identifiant est aléatoire, le tien sera différent. Sans cookie, `/me` refuse :

```bash
curl -i http://localhost:3000/me
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: text/plain; charset=utf-8
Content-Length: 14

Non connecté
```

Avec le cookie, observe la requête envoyée :

```bash
curl -v -b cookies.txt http://localhost:3000/me
```

```text
> GET /me HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/8.5.0
> Accept: */*
> Cookie: session=10cb5bc0-bf54-4c2f-ab82-f6ab0b898aed
>
< HTTP/1.1 200 OK
< Content-Type: text/plain; charset=utf-8
< Content-Length: 10
<
Tu es ada
```

Enfin, la déconnexion supprime la session côté serveur **et** demande au client
d’effacer le cookie, en le renvoyant vide avec `Max-Age=0` :

```bash
curl -i -X POST -b cookies.txt -c cookies.txt http://localhost:3000/logout
```

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 14
Set-Cookie: session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0

Déconnectée
```

Un nouvel appel à `/me` avec `-b cookies.txt` renvoie de nouveau `401`.

:::note
Le cookie ne contient **que** l’identifiant de session, pas le nom d’utilisateur ni ses
droits. Le client peut modifier un cookie à volonté : le serveur ne doit jamais faire
confiance à une donnée de cookie qu’il n’a pas les moyens de vérifier. Ici, un
identifiant inventé ne correspond à aucune session.
:::

### Les attributs de Set-Cookie

Après `nom=valeur`, `Set-Cookie` accepte des **attributs** séparés par `;`. Ils ne sont
jamais renvoyés au serveur : l’en-tête `Cookie` ne contient que `nom=valeur`.

| Attribut            | Effet                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| `Max-Age=3600`      | Durée de vie en secondes ; `0` supprime le cookie                     |
| `Expires=<date>`    | Date d’expiration (ancienne alternative à `Max-Age`)                  |
| *(aucun des deux)*  | **Cookie de session** : supprimé à la fermeture du navigateur          |
| `Path=/`            | Envoyé seulement pour les chemins qui commencent par cette valeur     |
| `Domain=example.com`| Envoyé aussi aux sous-domaines ; sans lui, seulement au domaine exact qui l’a créé |
| `Secure`            | Envoyé seulement en HTTPS                                             |
| `HttpOnly`          | Invisible pour le JavaScript de la page (`document.cookie`)           |
| `SameSite=Strict`, `Lax` ou `None` | Contrôle l’envoi lors de requêtes venant d’**autres sites** |

Les trois derniers sont des protections essentielles pour un cookie de session :

- **`HttpOnly`** : si un attaquant parvient à injecter du JavaScript dans ta page (faille
  XSS, vue dans la compétence sécurité), il ne pourra pas lire le cookie de session.
- **`Secure`** : le cookie ne circule jamais en clair sur HTTP. Le laboratoire tourne en
  HTTP sur `localhost`, c’est pourquoi il ne l’utilise pas ; en production, en HTTPS,
  il est indispensable.
- **`SameSite`** : avec `Strict`, le cookie n’est jamais envoyé quand la requête est
  déclenchée depuis un autre site ; avec `Lax`, il l’est seulement pour une navigation
  de premier niveau en `GET` (un clic sur un lien) ; avec `None` (qui exige `Secure`), il
  l’est toujours. `Lax` est un bon choix par défaut ; déclare-le explicitement, car tous
  les navigateurs n’appliquent pas la même valeur par défaut.

### Voir les cookies dans le navigateur

Ouvre `http://localhost:3000/` dans ton navigateur, puis la console des outils de
développement, et colle :

```js
await fetch('/login', { method: 'POST' });
document.cookie;
```

`fetch` envoie une requête HTTP depuis la page (tu l’étudieras en détail dans la
compétence sur l’asynchrone). La console affiche une chaîne vide `''` pour
`document.cookie` : le cookie existe, mais `HttpOnly` le cache au JavaScript. Tu le
vois pourtant dans l’onglet **Application** (Chrome, rubrique Cookies) ou **Stockage**
(Firefox), avec ses attributs. Ouvre maintenant `http://localhost:3000/me` dans un
nouvel onglet : la page affiche `Tu es ada`, car le navigateur a envoyé le cookie
automatiquement.

## L’origine et la politique de même origine

### Qu’est-ce qu’une origine ?

L’**origine** d’une URL est le triplet **schéma + hôte + port**. Deux URL ont la même
origine si les trois sont identiques.

| URL comparée à `http://localhost:3000/page` | Même origine ? | Raison                       |
| ------------------------------------------- | -------------- | ---------------------------- |
| `http://localhost:3000/autre?x=1`           | Oui            | Seuls chemin et requête diffèrent |
| `http://localhost:4000/page`                | Non            | Port différent               |
| `https://localhost:3000/page`               | Non            | Schéma différent             |
| `http://127.0.0.1:3000/page`                | Non            | Hôte différent (même machine, mais autre nom) |

Le navigateur joint un en-tête **`Origin`** à beaucoup de requêtes, en particulier à
toutes les requêtes `fetch` vers une autre origine : `Origin: http://localhost:3000`.

### La politique de même origine

Imagine que tu es connecté à ta banque dans un onglet, et que tu visites un site
malveillant dans un autre. Si le JavaScript de ce site pouvait faire
`fetch('https://ma-banque.example/comptes')` et **lire la réponse**, il obtiendrait tes
données : ton navigateur enverrait tes cookies de la banque avec la requête.

La **politique de même origine** (*same-origin policy*) l’empêche : par défaut, le
JavaScript d’une page ne peut **pas lire** les réponses provenant d’une autre origine.

Elle n’interdit pas tout pour autant :

- une page peut **afficher** des ressources d’autres origines : images, feuilles de
  style, scripts, vidéos ;
- une page peut **envoyer** certaines requêtes vers une autre origine, par exemple en
  soumettant un formulaire. C’est ce qui rend possibles les attaques CSRF, étudiées dans
  la compétence sécurité, contre lesquelles `SameSite` aide.

Ce qui est bloqué, c’est la **lecture** de la réponse par le script.

## CORS : assouplir la règle, côté serveur

Parfois, tu **veux** qu’une autre origine lise tes réponses : ton interface sur
`http://localhost:3000` appelle ton API sur `http://localhost:4000`. **CORS**
(*Cross-Origin Resource Sharing*) permet au **serveur** de dire au navigateur « telle
origine a le droit de lire mes réponses », avec des en-têtes `Access-Control-*`.

### Une requête bloquée

Dans la console de la page `http://localhost:3000/`, colle :

```js
await fetch('http://localhost:4000/no-cors');
```

Chrome affiche :

```text
Access to fetch at 'http://localhost:4000/no-cors' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

suivi d’une erreur `TypeError: Failed to fetch`. Firefox affiche un message équivalent
qui mentionne l’en-tête `Access-Control-Allow-Origin` manquant. Regarde maintenant le
terminal du serveur :

```text
[api 4000] GET /no-cors (Origin: http://localhost:3000)
```

**La requête est bien arrivée et le serveur a répondu `200`.** C’est le navigateur qui a
refusé de donner la réponse au script, faute d’autorisation. Retiens-le : CORS ne
protège pas le serveur, il protège l’utilisateur contre la lecture de données par un
autre site.

### Une requête autorisée

```js
const response = await fetch('http://localhost:4000/with-cors');
await response.json();
```

La console affiche un objet contenant `temperature: 18`. La réponse portait l’en-tête :

```http
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
```

`Access-Control-Allow-Origin` (souvent abrégé ACAO) vaut soit une origine précise, soit
`*` (« toutes les origines », pour des données publiques sans cookies). `Vary: Origin`
prévient les caches que la réponse dépend de l’origine du demandeur.

### Requêtes simples et requêtes avec prévol

Pour certaines requêtes, le navigateur demande la permission **avant** d’envoyer la
vraie requête : c’est la requête de **prévol** (*preflight*), une requête `OPTIONS`.

Une requête est « simple » (pas de prévol) si elle utilise `GET`, `HEAD` ou `POST`, sans
en-tête personnalisé, et avec un `Content-Type` limité à `text/plain`,
`application/x-www-form-urlencoded` ou `multipart/form-data`. Tout le reste déclenche un
prévol : une méthode `PUT` ou `DELETE`, un corps `application/json`, un en-tête
`Authorization`…

```js
await fetch('http://localhost:4000/with-cors', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: '{"temperature":20}',
});
```

La réponse a le statut `200`, et le terminal montre **deux** requêtes :

```text
[api 4000] OPTIONS /with-cors (Origin: http://localhost:3000)
[api 4000] PUT /with-cors (Origin: http://localhost:3000)
```

Le prévol ressemble à ceci, et tu peux le reproduire avec curl :

```bash
curl -i -X OPTIONS -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: content-type' http://localhost:4000/with-cors
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, PUT
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
Vary: Origin
```

Le navigateur demande « puis-je envoyer un `PUT` avec un en-tête `content-type` ? » ; le
serveur répond quelles méthodes et quels en-têtes il accepte, et pendant combien de
secondes le navigateur peut mémoriser cette autorisation (`Access-Control-Max-Age`).

Essaie maintenant la même requête vers `/no-cors` :

```js
await fetch('http://localhost:4000/no-cors', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: '{"temperature":20}',
});
```

Chrome indique cette fois `Response to preflight request doesn't pass access control
check`, et le terminal ne montre que `OPTIONS /no-cors` : le prévol a échoué, **le `PUT`
n’a jamais été envoyé**.

### Cookies et CORS

Par défaut, une requête `fetch` vers une autre origine n’envoie **pas** les cookies. Pour
les inclure, le client doit le demander (`credentials: 'include'`) et le serveur doit
répondre `Access-Control-Allow-Credentials: true` avec une origine **précise** : `*` est
alors refusé par le navigateur.

### CORS n’est pas un pare-feu

```bash
curl -i http://localhost:4000/no-cors
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 19

{"temperature":18}
```

curl, un script Node.js ou n’importe quel client hors navigateur ignore CORS : il n’y a
pas d’utilisateur à protéger, donc pas de politique de même origine. Une API doit
toujours vérifier l’authentification et les droits de **chaque** requête, quelle que
soit sa configuration CORS.

## Pièges et idées reçues

**« J’ai une erreur CORS, il faut corriger mon code JavaScript. »** CORS se règle **côté
serveur**, en ajoutant les bons en-têtes. Côté client, on ne peut que changer la requête
(par exemple éviter un en-tête inutile qui déclenche un prévol).

**« Je mets `Access-Control-Allow-Origin: *` partout et c’est réglé. »** Pour des données
publiques, oui. Pour une API avec cookies, c’est refusé par les navigateurs ; et
autoriser n’importe quelle origine à lire des données privées serait dangereux.

**« CORS bloque les requêtes. »** Il bloque la **lecture** de la réponse. Une requête
simple arrive au serveur et est traitée ; seule une requête avec prévol refusé n’est pas
envoyée.

**« `localhost:3000` et `localhost:4000`, c’est la même origine. »** Le port fait partie de
l’origine.

**« Le cookie contient mes informations de compte. »** Un cookie de session ne contient
qu’un identifiant aléatoire ; les informations restent sur le serveur.

## Exercices

### Exercice 1 : même origine ?

Pour chaque URL, dis si elle a la même origine que `https://app.example.com/tableau`,
et justifie.

1. `https://app.example.com/profil?id=4`
2. `http://app.example.com/tableau`
3. `https://api.example.com/tableau`
4. `https://app.example.com:443/tableau`
5. `https://app.example.com:8443/tableau`

:::solution
1. **Oui** : même schéma, même hôte, même port (443 implicite) ; seul le chemin change.
2. **Non** : schéma `http` au lieu de `https` (et donc port 80 au lieu de 443).
3. **Non** : hôte différent. Un sous-domaine différent est une autre origine.
4. **Oui** : 443 est le port par défaut de `https`, l’URL est équivalente.
5. **Non** : port 8443 au lieu de 443.
:::

### Exercice 2 : prévoir le comportement du navigateur

Une page servie depuis `https://shop.example` exécute chacune de ces requêtes vers
`https://api.example`. L’API répond toujours avec
`Access-Control-Allow-Origin: https://shop.example`, et à `OPTIONS` avec
`Access-Control-Allow-Methods: GET, POST` et **sans** `Access-Control-Allow-Headers`.
Pour chacune : y a-t-il un prévol ? La requête principale est-elle envoyée ? Le script
peut-il lire la réponse ?

1. `fetch('https://api.example/products')`
2. `fetch('https://api.example/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"id":3}' })`
3. `fetch('https://api.example/cart/3', { method: 'DELETE' })`

:::solution
1. `GET` sans en-tête particulier : **requête simple, pas de prévol**. Elle est envoyée,
   la réponse autorise `https://shop.example` : le script **peut lire** la réponse.
2. `POST` avec `Content-Type: application/json` : **prévol**, car ce type n’est pas
   autorisé pour une requête simple. La réponse au prévol autorise `POST` mais ne liste
   pas l’en-tête `content-type` dans `Access-Control-Allow-Headers` : le prévol
   **échoue**, la requête `POST` **n’est pas envoyée**, le script reçoit une erreur.
   Correction côté serveur : ajouter `Access-Control-Allow-Headers: Content-Type`.
3. `DELETE` : **prévol**. `DELETE` ne figure pas dans `Access-Control-Allow-Methods` :
   le prévol échoue, la requête **n’est pas envoyée**. Correction côté serveur :
   ajouter `DELETE` à la liste.
:::

### Exercice 3 : un cookie de session correct

Un collègue propose cet en-tête après la connexion d’un utilisateur, sur un site en
HTTPS :

```http
Set-Cookie: user=alice; role=admin; Expires=Fri, 31 Dec 2027 23:59:59 GMT
```

1. Quels problèmes de sécurité vois-tu ?
2. Écris un en-tête `Set-Cookie` correct pour une session de 2 heures.

:::solution
1. Problèmes :
   - le cookie contient le **nom** de l’utilisateur au lieu d’un identifiant de session
     aléatoire : n’importe qui peut écrire `user=bob` dans son navigateur et se faire
     passer pour Bob ;
   - `role=admin` n’est pas un second cookie mais un **attribut inconnu**, ignoré par le
     navigateur ; et un rôle ne doit de toute façon jamais être confié au client ;
   - pas de `HttpOnly` : un script injecté pourrait lire le cookie ;
   - pas de `Secure` : le cookie pourrait circuler en clair sur HTTP ;
   - pas de `SameSite` explicite ;
   - une durée de vie de plus d’un an pour une session, beaucoup trop longue.
2. Par exemple (l’identifiant est généré aléatoirement à chaque connexion et associé à
   l’utilisatrice côté serveur) :

```http
Set-Cookie: session=6f1c2a9e-3b7d-4e0f-9a51-c2d8e4b7f013; Max-Age=7200; Path=/; Secure; HttpOnly; SameSite=Lax
```

:::

## Récapitulatif

- Un **cookie** est déposé par `Set-Cookie` et renvoyé automatiquement par le
  navigateur dans `Cookie` ; il sert surtout à transporter un **identifiant de
  session** aléatoire.
- Attributs : `Max-Age`/`Expires`, `Path`, `Domain`, et les protections **`Secure`**,
  **`HttpOnly`**, **`SameSite`** ; `Max-Age=0` supprime le cookie.
- L’**origine** = schéma + hôte + port. La **politique de même origine** empêche un script
  de **lire** les réponses d’une autre origine.
- **CORS** permet au serveur d’autoriser des origines avec `Access-Control-Allow-Origin`.
  Les requêtes non simples déclenchent un **prévol** `OPTIONS` ; s’il échoue, la requête
  n’est pas envoyée.
- Cookies et CORS : `credentials: 'include'` côté client,
  `Access-Control-Allow-Credentials: true` et une origine précise côté serveur.
- CORS est appliqué par les **navigateurs** seulement : ce n’est pas une protection du
  serveur, qui doit vérifier chaque requête.
