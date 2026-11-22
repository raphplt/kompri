---
title: Les en-têtes courants
summary: Décrire le corps avec Content-Type, négocier le format avec Accept, s’authentifier avec Authorization et piloter le cache avec Cache-Control.
durationMinutes: 60
sources:
  - title: MDN — En-têtes HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers
  - title: MDN — Cache HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Caching
  - title: MDN — Authentification HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Authentication
  - title: RFC 9111 — HTTP Caching
    url: https://www.rfc-editor.org/rfc/rfc9111.html
---

Méthode et code de statut disent **quoi** ; les en-têtes disent **comment**. Dans quel
format est ce corps ? Quel format le client sait-il lire ? Qui envoie cette requête ?
Combien de temps peut-on réutiliser cette réponse ? Un en-tête mal choisi produit des
bugs déroutants : un serveur qui ne comprend pas un corps pourtant correct, une page
privée gardée dans un cache partagé, un jeton qui fuit dans des journaux.

Cette leçon étudie quatre en-têtes que tu manipuleras en permanence : `Content-Type`,
`Accept`, `Authorization` et `Cache-Control`, avec ceux qui les accompagnent.

## Le serveur de la leçon

Crée `headers-server.mjs` dans `http-lab`. Il a quatre routes, une par en-tête étudié.

```js
import { createServer } from 'node:http';

const port = 3000;

// Le jeton attendu vient de l’environnement, jamais du code source.
const apiToken = process.env.API_TOKEN;
if (!apiToken) {
  console.error('Définis la variable API_TOKEN avant de lancer le serveur.');
  process.exit(1);
}

const quote = { author: 'Ada Lovelace', year: 1843 };
const article = 'Version 1 de l’article.\n';
const articleTag = '"article-v1"';

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  // 1. Négociation de contenu avec Accept.
  if (pathname === '/quote') {
    const accept = req.headers.accept ?? '*/*';
    const vary = { Vary: 'Accept' };
    if (accept.includes('application/json') || accept.includes('*/*')) {
      return send(res, 200, `${JSON.stringify(quote)}\n`, {
        'Content-Type': 'application/json; charset=utf-8',
        ...vary,
      });
    }
    if (accept.includes('text/plain')) {
      return send(res, 200, `${quote.author} (${quote.year})\n`, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...vary,
      });
    }
    return send(res, 406, 'Formats disponibles : JSON ou texte\n', {
      'Content-Type': 'text/plain; charset=utf-8',
      ...vary,
    });
  }

  // 2. Interpréter le corps selon Content-Type.
  if (pathname === '/parse' && req.method === 'POST') {
    const type = req.headers['content-type'] ?? '';
    const raw = await readBody(req);
    let data;
    if (type.startsWith('application/json')) {
      data = JSON.parse(raw);
    } else if (type.startsWith('application/x-www-form-urlencoded')) {
      data = Object.fromEntries(new URLSearchParams(raw));
    } else {
      return send(res, 415, 'Types acceptés : JSON ou formulaire\n', {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }
    return send(res, 200, `${JSON.stringify({ received: data })}\n`, {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }

  // 3. Authentification par jeton porteur (Bearer).
  if (pathname === '/private') {
    const authorization = req.headers.authorization ?? '';
    if (authorization !== `Bearer ${apiToken}`) {
      return send(res, 401, 'Authentification requise\n', {
        'Content-Type': 'text/plain; charset=utf-8',
        'WWW-Authenticate': 'Bearer',
      });
    }
    return send(res, 200, 'Bienvenue dans la zone privée\n', {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
  }

  // 4. Cache : durée de fraîcheur et validation par ETag.
  if (pathname === '/article') {
    const headers = {
      'Cache-Control': 'max-age=60',
      ETag: articleTag,
    };
    if (req.headers['if-none-match'] === articleTag) {
      res.writeHead(304, headers);
      return res.end();
    }
    return send(res, 200, article, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...headers,
    });
  }

  return send(res, 404, 'Ressource introuvable\n', {
    'Content-Type': 'text/plain; charset=utf-8',
  });
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return send(res, 400, 'JSON invalide\n', {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }
    console.error(error);
    send(res, 500, 'Erreur interne\n', {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }
});

server.listen(port, () => {
  console.log(`Serveur des en-têtes prêt sur http://localhost:${port}`);
});
```

Ce serveur attend un **jeton** (une chaîne secrète) dans la variable d’environnement
`API_TOKEN`. Il ne contient aucun secret dans son code : c’est la bonne pratique, même
pour un exercice. Lance-le en définissant la variable pour cette seule commande :

```bash
API_TOKEN=demo-123 node headers-server.mjs
```

```text
Serveur des en-têtes prêt sur http://localhost:3000
```

Dans PowerShell, écris d’abord `$env:API_TOKEN="demo-123"`, puis `node headers-server.mjs`.
Sans la variable, le serveur refuse de démarrer avec le message
`Définis la variable API_TOKEN avant de lancer le serveur.`

Dans les sorties ci-dessous, les lignes `Date`, `Connection` et `Keep-Alive` sont
omises.

## Content-Type : décrire le corps envoyé

`Content-Type` indique le **type de média** (*media type*, aussi appelé type MIME) du
corps du message, éventuellement suivi de paramètres comme l’encodage :

```http
Content-Type: application/json; charset=utf-8
```

Un type de média a la forme `type/sous-type`. Les plus courants :

| Type de média                       | Contenu                                       |
| ----------------------------------- | --------------------------------------------- |
| `text/html`                         | Page HTML                                     |
| `text/css`, `text/javascript`       | Feuille de style, script                      |
| `text/plain`                        | Texte brut                                    |
| `application/json`                  | Données JSON                                  |
| `application/x-www-form-urlencoded` | Formulaire HTML classique (`nom=valeur&…`)    |
| `multipart/form-data`               | Formulaire avec envoi de fichiers             |
| `image/png`, `image/jpeg`, `image/svg+xml` | Images                                 |

Il vaut **dans les deux sens** : dans une réponse, il dit au client comment interpréter
le corps ; dans une requête, il dit au serveur comment lire les données envoyées.

La route `/parse` lit le corps différemment selon `Content-Type` :

```bash
curl -i -H 'Content-Type: application/json' -d '{"city":"Lyon","days":3}' http://localhost:3000/parse
```

```http
HTTP/1.1 200 OK
Content-Length: 38
Content-Type: application/json; charset=utf-8

{"received":{"city":"Lyon","days":3}}
```

```bash
curl -i -d 'city=Lyon&days=3' http://localhost:3000/parse
```

```http
HTTP/1.1 200 OK
Content-Length: 40
Content-Type: application/json; charset=utf-8

{"received":{"city":"Lyon","days":"3"}}
```

Le même contenu logique arrive de deux façons. Remarque que `days` est un **nombre** en
JSON mais une **chaîne** `"3"` dans un formulaire : ce format ne connaît que du texte.

### Le piège du Content-Type oublié

Envoie maintenant du JSON **sans** préciser son type :

```bash
curl -i -d '{"city":"Lyon"}' http://localhost:3000/parse
```

```http
HTTP/1.1 200 OK
Content-Length: 40
Content-Type: application/json; charset=utf-8

{"received":{"{\"city\":\"Lyon\"}":""}}
```

Avec `-d`, curl annonce par défaut `application/x-www-form-urlencoded`. Le serveur l’a cru
et a lu tout le JSON comme… un nom de champ de formulaire sans valeur. Le serveur ne
devine pas : il fait confiance à `Content-Type`. Avec un type qu’il ne gère pas, il
répond `415 Unsupported Media Type` :

```bash
curl -i -H 'Content-Type: text/plain' -d 'city=Lyon' http://localhost:3000/parse
```

```http
HTTP/1.1 415 Unsupported Media Type
Content-Length: 37
Content-Type: text/plain; charset=utf-8

Types acceptés : JSON ou formulaire
```

:::tip
L’option `--json` de curl (disponible depuis la version 7.82) envoie un corps JSON en
ajoutant d’un coup `Content-Type: application/json` et `Accept: application/json` :
`curl --json '{"city":"Lyon"}' http://localhost:3000/parse`. Vérifie ta version avec
`curl --version`.

:::

## Accept : dire ce que l’on sait lire

`Accept` est l’en-tête symétrique côté client : il liste les types de médias que le
client **accepte en réponse**. Le serveur choisit alors une représentation : c’est la
**négociation de contenu**.

```bash
curl -i http://localhost:3000/quote
```

```http
HTTP/1.1 200 OK
Content-Length: 38
Content-Type: application/json; charset=utf-8
Vary: Accept

{"author":"Ada Lovelace","year":1843}
```

curl envoie `Accept: */*` (« n’importe quoi ») : le serveur choisit JSON.

```bash
curl -i -H 'Accept: text/plain' http://localhost:3000/quote
```

```http
HTTP/1.1 200 OK
Content-Length: 20
Content-Type: text/plain; charset=utf-8
Vary: Accept

Ada Lovelace (1843)
```

```bash
curl -i -H 'Accept: text/html' http://localhost:3000/quote
```

```http
HTTP/1.1 406 Not Acceptable
Content-Length: 36
Content-Type: text/plain; charset=utf-8
Vary: Accept

Formats disponibles : JSON ou texte
```

`406 Not Acceptable` : le serveur n’a aucune représentation acceptable pour ce client. En
pratique, beaucoup de serveurs préfèrent renvoyer leur format par défaut plutôt qu’une
`406`.

Un vrai `Accept` peut contenir plusieurs types avec des **poids** de préférence, de 0 à 1 :

```http
Accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.8
```

Ici le client préfère HTML (poids 1 par défaut), puis XHTML (0,9), puis n’importe quoi
(0,8). Notre serveur simplifié ignore ces poids ; un serveur réel en tient compte.

L’en-tête de réponse **`Vary: Accept`** prévient les caches : « ma réponse dépend de
l’en-tête `Accept` de la requête ». Sans lui, un cache pourrait servir la version JSON à
un client qui a demandé du texte. Le même principe existe pour la langue (`Accept-Language`
et `Content-Language`) et la compression (`Accept-Encoding` et `Content-Encoding`).

## Authorization : prouver qui l’on est

Quand une ressource est protégée, le client envoie ses **identifiants** dans l’en-tête
`Authorization`, sous la forme `Schéma identifiants`. Sans identifiants valides, le
serveur répond `401 Unauthorized` avec un en-tête `WWW-Authenticate` qui annonce le
schéma attendu :

```bash
curl -i http://localhost:3000/private
```

```http
HTTP/1.1 401 Unauthorized
Content-Length: 25
Content-Type: text/plain; charset=utf-8
WWW-Authenticate: Bearer

Authentification requise
```

### Le schéma Bearer

`Bearer` (« porteur ») signifie : « quiconque porte ce jeton est autorisé ». C’est le
schéma utilisé par la plupart des API, avec des clés d’API ou des jetons d’accès.

```bash
curl -i -H 'Authorization: Bearer demo-123' http://localhost:3000/private
```

```http
HTTP/1.1 200 OK
Content-Length: 31
Content-Type: text/plain; charset=utf-8
Cache-Control: no-store

Bienvenue dans la zone privée
```

Avec un mauvais jeton (`Bearer mauvais`), la réponse est de nouveau `401`. La réponse
privée porte `Cache-Control: no-store` : aucun cache ne doit la conserver.

### Le schéma Basic

`Basic` transporte un nom d’utilisateur et un mot de passe. curl le construit avec `-u` :

```bash
curl -v -u ada:secret http://localhost:3000/private
```

```text
> GET /private HTTP/1.1
> Host: localhost:3000
> Authorization: Basic YWRhOnNlY3JldA==
> User-Agent: curl/8.5.0
> Accept: */*
```

(Notre serveur n’accepte que `Bearer`, il répond donc `401`.) La valeur
`YWRhOnNlY3JldA==` ressemble à du chiffrement, mais ce n’est qu’un **encodage Base64**,
réversible par n’importe qui :

```bash
echo 'YWRhOnNlY3JldA==' | base64 --decode
```

```text
ada:secret
```

:::warning[Identifiants et jetons]
- `Basic` et `Bearer` ne protègent rien par eux-mêmes : sans **HTTPS**, quiconque
  observe le trafic lit le mot de passe ou vole le jeton.
- Ne mets jamais un jeton dans l’URL (`?token=…`) : les URL finissent dans
  l’historique, les journaux des serveurs et des proxys. L’en-tête `Authorization` est
  fait pour cela.
- Un jeton est un secret : pas dans le code source, pas dans un dépôt Git, pas dans une
  capture d’écran.

:::

`401` ou `403` ? `401` signifie « je ne sais pas qui tu es, authentifie-toi » ; `403`
signifie « je sais qui tu es, mais tu n’as pas le droit ».

## Cache-Control : réutiliser une réponse

Retélécharger une ressource inchangée gaspille du temps et de la bande passante. HTTP
permet aux **caches** (celui du navigateur, ou des caches partagés entre utilisateurs
comme les réseaux de diffusion de contenu) de garder des réponses. L’en-tête
`Cache-Control` de la réponse dit ce qu’ils ont le droit de faire.

| Directive         | Sens                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `max-age=60`      | La réponse est **fraîche** 60 secondes : réutilisable sans rien demander   |
| `no-cache`        | Peut être stockée, mais doit être **revalidée** auprès du serveur avant chaque réutilisation |
| `no-store`        | Ne **jamais** stocker : données sensibles                                  |
| `private`         | Seul le cache du navigateur de l’utilisateur peut la stocker, pas un cache partagé |
| `public`          | Les caches partagés peuvent la stocker                                     |

:::warning[no-cache ne veut pas dire « pas de cache »]
`no-cache` autorise le stockage et impose une vérification à chaque fois. Pour interdire
tout stockage, c’est `no-store`.

:::

### Revalider avec ETag et If-None-Match

Quand une réponse n’est plus fraîche, le cache n’a pas besoin de tout retélécharger : il
peut demander « ma copie est-elle encore bonne ? ». Pour cela, le serveur attache à sa
réponse un **validateur**, l’en-tête `ETag` (une étiquette qui change quand le contenu
change) :

```bash
curl -i http://localhost:3000/article
```

```http
HTTP/1.1 200 OK
Content-Length: 26
Content-Type: text/plain; charset=utf-8
Cache-Control: max-age=60
ETag: "article-v1"

Version 1 de l’article.
```

Pour revalider, le client renvoie l’étiquette dans `If-None-Match` :

```bash
curl -i -H 'If-None-Match: "article-v1"' http://localhost:3000/article
```

```http
HTTP/1.1 304 Not Modified
Cache-Control: max-age=60
ETag: "article-v1"
```

`304 Not Modified` sans corps : « ta copie est toujours valable, et elle est de nouveau
fraîche pour 60 secondes ». Seuls quelques octets ont circulé. Un mécanisme équivalent
utilise des dates : `Last-Modified` dans la réponse, `If-Modified-Since` dans la requête.

Fais l’essai dans le navigateur : ouvre `http://localhost:3000/article` avec le panneau
Réseau ouvert, puis recharge. Selon le navigateur et la façon de recharger, tu verras
soit la réponse servie depuis le cache, soit une requête avec `If-None-Match` et une
réponse `304`.

### Choisir une politique de cache

- Données personnelles ou sensibles (compte, panier, jeton) : `no-store`.
- Page qui change souvent mais peut être revalidée : `no-cache` avec un `ETag`.
- Fichier qui ne change jamais à une URL donnée (par exemple `app.3f9c2b.js`, dont le
  nom change à chaque version) : un `max-age` très long.

## Autres en-têtes à reconnaître

| En-tête             | Sens                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `Host`              | Domaine demandé (requête, obligatoire en HTTP/1.1)                |
| `User-Agent`        | Logiciel client (requête), purement déclaratif                    |
| `Content-Length`    | Taille du corps en octets                                         |
| `Location`          | Adresse d’une redirection ou d’une ressource créée (réponse)      |
| `Allow`             | Méthodes acceptées (réponse, avec `405`)                          |
| `WWW-Authenticate`  | Schéma d’authentification attendu (réponse, avec `401`)          |
| `Retry-After`       | Délai avant de réessayer (réponse, avec `429` ou `503`)           |
| `Cookie`, `Set-Cookie` | Cookies : prochaine leçon                                      |

## Pièges et idées reçues

**« Le serveur reconnaîtra que c’est du JSON. »** Il se fie à `Content-Type`. Oublie-le
et ton JSON sera lu comme un formulaire, ou refusé.

**« Accept et Content-Type, c’est pareil. »** `Content-Type` décrit le corps **de ce
message** ; `Accept` dit ce que le client veut **en réponse**.

**« Basic, c’est chiffré. »** C’est du Base64, décodable par tous. Seul HTTPS protège.

**« Je peux me fier au User-Agent pour la sécurité. »** N’importe quel client peut
envoyer n’importe quelle valeur ; il en va de même pour tous les en-têtes de requête.

## Exercices

### Exercice 1 : lire des en-têtes

Une réponse contient :

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: private, max-age=300
ETag: "p-42-v7"
Vary: Accept-Language
Content-Language: fr
```

1. Que contient le corps, et dans quel encodage ?
2. Qui peut garder cette réponse en cache, et combien de temps sans redemander ?
3. Après ce délai, quelle requête le navigateur peut-il envoyer pour éviter de tout
   retélécharger, et quelle réponse attend-il si rien n’a changé ?
4. Pourquoi `Vary: Accept-Language` ?

:::solution
1. Une page HTML encodée en UTF-8 (`Content-Type`), rédigée en français
   (`Content-Language: fr`).
2. `private` : seulement le cache du navigateur de l’utilisateur, pas un cache partagé.
   `max-age=300` : fraîche pendant 300 secondes, soit 5 minutes, sans contacter le
   serveur.
3. Une requête de revalidation avec `If-None-Match: "p-42-v7"`. Si l’`ETag` n’a pas
   changé, le serveur répond `304 Not Modified` sans corps, et la copie redevient
   fraîche.
4. La réponse dépend de la langue demandée par le client : un cache doit garder une
   version par valeur d’`Accept-Language`, pour ne pas servir la page française à
   quelqu’un qui a demandé l’anglais.

:::

### Exercice 2 : écrire les bonnes commandes

Avec `headers-server.mjs` lancé (`API_TOKEN=demo-123`), écris la commande curl qui :

1. envoie `{"city":"Brest","days":2}` à `/parse` en JSON, en utilisant `-H` et `-d` ;
2. demande `/quote` en texte brut ;
3. accède à `/private` avec le bon jeton, en affichant les en-têtes de réponse ;
4. revalide `/article` avec la bonne étiquette.

Pour chacune, prévois le code de statut, puis vérifie.

:::solution
```bash
curl -i -H 'Content-Type: application/json' -d '{"city":"Brest","days":2}' http://localhost:3000/parse
curl -i -H 'Accept: text/plain' http://localhost:3000/quote
curl -i -H 'Authorization: Bearer demo-123' http://localhost:3000/private
curl -i -H 'If-None-Match: "article-v1"' http://localhost:3000/article
```

Statuts : `200` avec `{"received":{"city":"Brest","days":2}}`, `200` avec
`Ada Lovelace (1843)`, `200` avec le message de bienvenue, `304` sans corps.

Erreurs fréquentes : oublier `Content-Type` à la première commande (le JSON est lu comme
un formulaire) ; écrire `Authorization: demo-123` sans le schéma `Bearer` (réponse
`401`) ; oublier les guillemets doubles de l’`ETag`, qui font partie de sa valeur
(réponse `200` au lieu de `304`).

:::

### Exercice 3 : choisir Cache-Control

Propose un en-tête `Cache-Control` pour chaque réponse et justifie :

1. `GET /api/me` qui renvoie le profil de l’utilisateur connecté.
2. `GET /assets/logo.8c1d2e.svg`, dont le nom change à chaque nouvelle version.
3. `GET /news`, la liste des actualités, mise à jour plusieurs fois par jour, avec un
   `ETag`.

:::solution
1. `Cache-Control: no-store` : données personnelles, à ne garder nulle part (au minimum
   `private`, mais `no-store` est plus sûr pour des données sensibles).
2. `Cache-Control: public, max-age=31536000` (un an) : le contenu à cette URL ne change
   jamais, puisqu’une nouvelle version aura un autre nom.
3. `Cache-Control: no-cache` : les caches peuvent garder la liste mais doivent la
   revalider à chaque fois avec `If-None-Match` ; le serveur répond `304` tant qu’elle
   n’a pas changé. Un court `max-age` (par exemple 60) est aussi défendable si quelques
   secondes de retard sont acceptables.

:::

## Récapitulatif

- `Content-Type` décrit le corps **du message où il apparaît**, requête ou réponse ;
  sans lui, le serveur ne sait pas lire le corps (`415` s’il ne gère pas le type).
- `Accept` liste les formats acceptés en réponse ; le serveur négocie, ou répond `406`.
  `Vary` prévient les caches que la réponse dépend d’un en-tête de requête.
- `Authorization: Bearer <jeton>` ou `Basic <base64>` transporte les identifiants ;
  `401` + `WWW-Authenticate` quand ils manquent. Base64 n’est pas du chiffrement :
  HTTPS obligatoire, jamais de jeton dans l’URL ni dans le code.
- `Cache-Control` : `max-age` (fraîcheur), `no-cache` (revalider), `no-store` (ne rien
  garder), `private` / `public`.
- `ETag` + `If-None-Match` permettent une revalidation légère : `304 Not Modified`.
