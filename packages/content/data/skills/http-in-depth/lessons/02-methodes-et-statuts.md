---
title: Méthodes, codes de statut, sûreté et idempotence
summary: Choisir la bonne méthode et le bon code de statut, et savoir quelles requêtes peuvent être répétées sans danger.
durationMinutes: 60
sources:
  - title: RFC 9110 — HTTP Semantics (méthodes et codes de statut)
    url: https://www.rfc-editor.org/rfc/rfc9110.html
  - title: MDN — Méthodes de requête HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Methods
  - title: MDN — Codes de statut de réponse HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status
---

La **méthode** de la requête et le **code** de la réponse portent l’essentiel du sens
d’un échange : « je veux lire », « je veux créer », « c’est fait », « c’est ma faute ».
Clients, caches et outils de surveillance décident à partir d’eux, sans lire le corps.

Une mauvaise méthode ou un mauvais code a des conséquences concrètes : paiement envoyé
deux fois, données supprimées par un robot, erreur prise pour un succès. Cette leçon te
donne les règles de la norme (RFC 9110) et te les fait expérimenter sur une petite API.

## Le serveur de la leçon : une API de notes

Dans ton dossier `http-lab`, crée `notes-server.mjs`. C’est une petite API qui gère des
notes en mémoire, au format JSON. Repère les codes de statut
utilisés : c’est exactement ce que la leçon explique.

```js
import { createServer } from 'node:http';

const port = 3000;

// Les données vivent en mémoire : elles disparaissent quand le serveur s’arrête.
const notes = new Map([[1, { id: 1, text: 'Lire la RFC 9110', done: false }]]);
let nextId = 2;

// Envoie une réponse JSON, ou une réponse sans corps si data est absent.
function send(res, status, data, headers = {}) {
  if (data === undefined) {
    // Une réponse 204 ne doit pas avoir d’en-tête Content-Length.
    const length = status === 204 ? {} : { 'Content-Length': 0 };
    res.writeHead(status, { ...length, ...headers });
    res.end();
    return;
  }
  const body = `${JSON.stringify(data)}\n`;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw);
}

function isValidText(text) {
  return typeof text === 'string' && text.trim() !== '';
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const method = req.method === 'HEAD' ? 'GET' : req.method;

  if (pathname === '/old-notes') {
    return send(res, 301, undefined, { Location: '/notes' });
  }

  if (pathname === '/notes') {
    if (method === 'GET') return send(res, 200, [...notes.values()]);
    if (method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) {
        return send(res, 415, { error: 'Le corps doit être en JSON' });
      }
      const input = await readJson(req);
      if (!isValidText(input?.text)) {
        return send(res, 400, { error: 'Le champ text est obligatoire' });
      }
      const note = { id: nextId++, text: input.text.trim(), done: false };
      notes.set(note.id, note);
      return send(res, 201, note, { Location: `/notes/${note.id}` });
    }
    const allow = { Allow: 'GET, HEAD, POST, OPTIONS' };
    if (method === 'OPTIONS') return send(res, 204, undefined, allow);
    return send(res, 405, { error: 'Méthode non autorisée' }, allow);
  }

  const match = pathname.match(/^\/notes\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const note = notes.get(id);
    if (method === 'GET') {
      return note
        ? send(res, 200, note)
        : send(res, 404, { error: 'Note introuvable' });
    }
    if (method === 'PUT') {
      if (!note) return send(res, 404, { error: 'Note introuvable' });
      const input = await readJson(req);
      if (!isValidText(input?.text) || typeof input?.done !== 'boolean') {
        return send(res, 400, { error: 'text et done sont obligatoires' });
      }
      const replaced = { id, text: input.text.trim(), done: input.done };
      notes.set(id, replaced);
      return send(res, 200, replaced);
    }
    if (method === 'DELETE') {
      if (!note) return send(res, 404, { error: 'Note introuvable' });
      notes.delete(id);
      return send(res, 204);
    }
    const allow = { Allow: 'GET, HEAD, PUT, DELETE' };
    return send(res, 405, { error: 'Méthode non autorisée' }, allow);
  }

  return send(res, 404, { error: 'Ressource introuvable' });
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    // Corps JSON illisible : c’est la faute du client.
    if (error instanceof SyntaxError)
      return send(res, 400, { error: 'JSON invalide' });
    console.error(error);
    send(res, 500, { error: 'Erreur interne du serveur' });
  }
});

server.listen(port, () => {
  console.log(`API des notes prête sur http://localhost:${port}`);
});
```

Arrête le serveur de la leçon précédente s’il tourne encore (`Ctrl`+`C`), puis lance
celui-ci :

```bash
node notes-server.mjs
```

```text
API des notes prête sur http://localhost:3000
```

Les données sont en mémoire : chaque redémarrage repart de la seule note n° 1. Pour
obtenir les sorties de la leçon, exécute les commandes dans l’ordre, sans redémarrer.
La ligne `Date` différera ; les lignes `Connection`, `Keep-Alive` et parfois `Date` sont
omises ci-dessous pour gagner de la place.

## Les méthodes

Une méthode exprime l’**intention** du client envers la ressource désignée par l’URL :

| Méthode   | Intention                                              | Corps de requête          |
| --------- | ------------------------------------------------------ | ------------------------- |
| `GET`     | Obtenir une représentation de la ressource             | Non                       |
| `HEAD`    | Comme `GET`, mais sans le corps de la réponse          | Non                       |
| `POST`    | Faire traiter des données par la ressource (souvent : créer un élément dans une collection) | Oui |
| `PUT`     | Remplacer entièrement la ressource par celle envoyée   | Oui                       |
| `PATCH`   | Modifier partiellement la ressource                    | Oui                       |
| `DELETE`  | Supprimer la ressource                                 | En général non            |
| `OPTIONS` | Demander les options de communication (méthodes permises…) | En général non       |

Avec curl, `-X` choisit la méthode, `-H` ajoute un en-tête et `-d` envoie un corps.

### GET : lire

```bash
curl -i http://localhost:3000/notes
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 50
Date: Sat, 21 Nov 2026 21:41:39 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":1,"text":"Lire la RFC 9110","done":false}]
```

`200 OK` : la représentation demandée est dans le corps.

### POST : créer dans une collection

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"text":"Acheter du pain"}' http://localhost:3000/notes
```

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 47
Location: /notes/2
Date: Sat, 21 Nov 2026 21:41:39 GMT

{"id":2,"text":"Acheter du pain","done":false}
```

`201 Created` dit plus que `200` : une nouvelle ressource existe, et l’en-tête `Location`
donne son adresse. Le client n’a pas choisi l’identifiant : c’est le serveur qui l’a
attribué. (Avec `-d`, curl utilise déjà `POST` ; `-X POST` est ici redondant mais rend
l’intention explicite.)

**Relance exactement la même commande.** Tu obtiens `201 Created` avec `Location: /notes/3`
et `"id":3` : une **deuxième** note identique a été créée. Garde ce résultat en tête pour
la partie sur l’idempotence.

### HEAD : les en-têtes sans le corps

```bash
curl -I http://localhost:3000/notes/2
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 47
Date: Sat, 21 Nov 2026 21:41:39 GMT
```

`-I` envoie une requête `HEAD` : mêmes en-têtes qu’un `GET` (y compris
`Content-Length: 47`), aucun corps. Pratique pour vérifier qu’une ressource existe sans
la télécharger.

### PUT : remplacer

```bash
curl -i -X PUT -H 'Content-Type: application/json' -d '{"text":"Acheter du pain complet","done":true}' http://localhost:3000/notes/2
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 54

{"id":2,"text":"Acheter du pain complet","done":true}
```

`PUT` envoie la **représentation complète** : ce serveur exige `text` **et** `done`, sinon
`400 Bad Request`. La norme permet aussi à `PUT` de **créer** la ressource si elle
n’existe pas (`201`) ; notre serveur répond plutôt `404` pour une note inconnue.

### PATCH : modifier partiellement

`PATCH` envoie seulement les changements, par exemple `{"done":true}`. Notre serveur ne
l’implémente pas :

```bash
curl -i -X PATCH -H 'Content-Type: application/json' -d '{"done":true}' http://localhost:3000/notes/2
```

```http
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json; charset=utf-8
Content-Length: 36
Allow: GET, HEAD, PUT, DELETE

{"error":"Méthode non autorisée"}
```

`405 Method Not Allowed` signifie : « la ressource existe, mais elle n’accepte pas cette
méthode ». La norme exige alors un en-tête `Allow` qui liste les méthodes acceptées.

### DELETE : supprimer

```bash
curl -i -X DELETE http://localhost:3000/notes/3
```

```http
HTTP/1.1 204 No Content
Date: Sat, 21 Nov 2026 21:41:39 GMT
```

`204 No Content` : succès, et rien à renvoyer. Une réponse `204` n’a jamais de corps (ni
d’en-tête `Content-Length`). Relance la commande : tu obtiens `404 Not Found` avec
`{"error":"Note introuvable"}`, puisque la note n’existe plus.

### OPTIONS : que puis-je faire ici ?

```bash
curl -i -X OPTIONS http://localhost:3000/notes
```

```http
HTTP/1.1 204 No Content
Allow: GET, HEAD, POST, OPTIONS
```

Tu reverras `OPTIONS` dans la leçon sur CORS.

## Sûreté, idempotence, mise en cache

La norme classe les méthodes selon trois propriétés. Ce ne sont pas des détails
théoriques : navigateurs, caches, robots et bibliothèques s’en servent pour décider ce
qu’ils ont le droit de faire **sans te demander**.

### Méthodes sûres

Une méthode est **sûre** (*safe*) si le client ne demande **aucune modification** sur le
serveur : il ne fait que lire. `GET`, `HEAD` et `OPTIONS` sont sûres.

Conséquence : n’importe quel programme peut envoyer un `GET` sans risque. Robots
d’indexation, préchargements du navigateur, aperçus de liens dans les messageries font
des `GET` automatiques. Si ton application supprime une note sur
`GET /notes/2/delete`, un robot qui suit ce lien supprime la note.

:::warning[Jamais de modification sur GET]
Une action qui modifie des données (supprimer, payer, s’abonner, se déconnecter) ne doit
jamais être déclenchée par un `GET`. Utilise `POST`, `PUT`, `PATCH` ou `DELETE`.
:::

« Sûre » concerne l’**intention** : un serveur peut écrire un journal ou compter les
visites lors d’un `GET`, tant que le client ne demande pas de changement et n’en est pas
tenu pour responsable.

### Méthodes idempotentes

Une méthode est **idempotente** si envoyer la même requête une ou plusieurs fois laisse
le serveur dans **le même état** qu’une seule fois. Toutes les méthodes sûres le sont,
ainsi que `PUT` et `DELETE`.

Vérifie-le avec les expériences précédentes :

- deux `PUT` identiques sur `/notes/2` : après le premier comme après le second, la note
  vaut `{"id":2,"text":"Acheter du pain complet","done":true}` ;
- deux `DELETE` sur `/notes/3` : après le premier comme après le second, la note n’existe
  pas. Les **codes** diffèrent (`204` puis `404`), mais l’idempotence porte sur **l’état
  du serveur**, pas sur la réponse ;
- deux `POST` identiques sur `/notes` ont créé **deux** notes : `POST` n’est **pas**
  idempotent.

`PATCH` n’est pas idempotent en général : `{"done":true}` l’est en pratique, mais
« ajoute 1 au compteur » ne l’est pas.

Pourquoi c’est important : une réponse peut se perdre, et le client ne sait alors pas si
sa requête a été traitée. Il peut **réessayer sans risque** une requête idempotente, mais
pas un `POST` : ce serait risquer de passer une commande deux fois. C’est pour cela qu’un
navigateur avertit quand tu actualises une page obtenue après un formulaire en `POST`.

### Mise en cache

Les réponses à `GET` et `HEAD` peuvent être **mises en cache** (gardées et réutilisées) ;
la leçon suivante détaille les en-têtes qui pilotent le cache.

| Méthode   | Sûre | Idempotente | Réponse mise en cache |
| --------- | ---- | ----------- | --------------------- |
| `GET`     | Oui  | Oui         | Oui                   |
| `HEAD`    | Oui  | Oui         | Oui                   |
| `OPTIONS` | Oui  | Oui         | Non                   |
| `POST`    | Non  | Non         | Rarement              |
| `PUT`     | Non  | Oui         | Non                   |
| `PATCH`   | Non  | Non         | Non                   |
| `DELETE`  | Non  | Oui         | Non                   |

:::note
Ces propriétés sont des **promesses** que le serveur doit tenir : rien n’empêche
techniquement un serveur mal écrit de supprimer des données sur un `GET`.
:::

## Les codes de statut

Au-delà des cinq familles, voici les codes que tu dois savoir choisir.

### 2xx : succès

| Code  | Nom          | Quand l’utiliser                                                       |
| ----- | ------------ | ---------------------------------------------------------------------- |
| `200` | OK           | Succès avec un corps : lecture, modification qui renvoie la ressource  |
| `201` | Created      | Une ressource a été créée ; idéalement avec `Location`                 |
| `204` | No Content   | Succès sans corps : suppression, modification qui ne renvoie rien      |

### 3xx : redirections

```bash
curl -i http://localhost:3000/old-notes
```

```http
HTTP/1.1 301 Moved Permanently
Content-Length: 0
Location: /notes
```

curl ne suit pas les redirections par défaut ; avec `-L`, il les suit comme un
navigateur.

| Code  | Nom                | Sens                                                                   |
| ----- | ------------------ | ---------------------------------------------------------------------- |
| `301` | Moved Permanently  | Déplacé définitivement ; les clients peuvent mémoriser la nouvelle adresse |
| `302` | Found              | Déplacé temporairement                                                 |
| `303` | See Other          | « Va voir ailleurs avec un `GET` » : typique après un `POST` de formulaire |
| `307` | Temporary Redirect | Temporaire, et la méthode et le corps **doivent** être conservés       |
| `308` | Permanent Redirect | Permanent, et la méthode et le corps **doivent** être conservés        |
| `304` | Not Modified       | Pas une vraie redirection : « ta copie en cache est encore bonne »     |

Pour des raisons historiques, un client peut transformer un `POST` en `GET` en suivant
une `301` ou une `302` ; pour conserver la méthode, on utilise `307` ou `308`.

### 4xx : le client doit changer sa requête

| Code  | Nom                    | Quand l’utiliser                                                       |
| ----- | ---------------------- | ---------------------------------------------------------------------- |
| `400` | Bad Request            | Requête mal formée ou invalide : JSON illisible, champ obligatoire absent |
| `401` | Unauthorized           | **Authentification** absente ou invalide (malgré son nom) ; avec `WWW-Authenticate` |
| `403` | Forbidden              | Authentifié (ou non), mais **pas autorisé** à faire cela               |
| `404` | Not Found              | Ressource inexistante (ou que l’on préfère ne pas révéler)             |
| `405` | Method Not Allowed     | La ressource n’accepte pas cette méthode ; avec `Allow`                |
| `409` | Conflict               | Conflit avec l’état actuel : doublon, modification concurrente          |
| `415` | Unsupported Media Type | Le format du corps envoyé n’est pas accepté                            |
| `422` | Unprocessable Content  | Corps bien formé mais contenu invalide (certaines API l’utilisent au lieu de `400`) |
| `429` | Too Many Requests      | Trop de requêtes en peu de temps                                       |

Notre serveur en illustre plusieurs. Envoie un formulaire au lieu de JSON :

```bash
curl -i -d 'text=Coucou' http://localhost:3000/notes
```

```http
HTTP/1.1 415 Unsupported Media Type
Content-Type: application/json; charset=utf-8
Content-Length: 40

{"error":"Le corps doit être en JSON"}
```

Envoie du JSON invalide, puis un texte vide :

```bash
curl -i -H 'Content-Type: application/json' -d '{text:Coucou}' http://localhost:3000/notes
curl -i -H 'Content-Type: application/json' -d '{"text":""}' http://localhost:3000/notes
```

Les deux réponses ont le statut `400 Bad Request`, avec pour corps respectivement
`{"error":"JSON invalide"}` et `{"error":"Le champ text est obligatoire"}`.

### 5xx : le serveur a échoué

| Code  | Nom                   | Sens                                                                   |
| ----- | --------------------- | ---------------------------------------------------------------------- |
| `500` | Internal Server Error | Erreur inattendue dans le code du serveur                              |
| `502` | Bad Gateway           | Un intermédiaire (proxy) a reçu une réponse invalide du serveur suivant |
| `503` | Service Unavailable   | Serveur temporairement indisponible (surcharge, maintenance)           |
| `504` | Gateway Timeout       | Un intermédiaire n’a pas reçu de réponse à temps du serveur suivant    |

Dans notre serveur, toute erreur imprévue devient une `500` avec un message générique ;
le détail est écrit dans le terminal du serveur, jamais envoyé au client, à qui il
révélerait des informations utiles pour attaquer.

### Choisir : quelques règles

1. **Le client peut-il corriger sa requête ?** Alors `4xx`. Sinon, si le serveur a échoué,
   `5xx`. Une donnée invalide envoyée par le client n’est **jamais** une `500`.
2. **Sois précis dans la bonne famille.** `201` plutôt que `200` après une création,
   `204` quand il n’y a rien à renvoyer, `404` plutôt que `400` pour une ressource
   inexistante.
3. **Ne renvoie jamais `200` avec un corps `{"error": …}`.** Les clients, les caches et
   les outils de surveillance lisent le code : pour eux, c’est un succès.

## Pièges et idées reçues

**« POST pour créer, PUT pour modifier, c’est la règle. »** C’est une convention
courante. La norme dit plutôt : `POST` fait traiter des données par la ressource cible
(le serveur choisit le résultat), `PUT` remplace la ressource à l’URL donnée (le client
choisit l’URL). `PUT` peut donc créer.

**« DELETE n’est pas idempotent puisque le second renvoie 404. »** L’idempotence porte sur
l’état du serveur, identique après une ou plusieurs suppressions.

**« Une erreur de validation, c’est une 500 puisque le serveur a levé une exception. »**
L’origine de l’erreur compte : la donnée vient du client, c’est une `4xx`.

## Exercices

### Exercice 1 : choisir méthode et code

Pour chaque action sur une API de bibliothèque, donne la méthode, l’URL et le code de
statut de la réponse en cas de succès, puis le code d’une erreur plausible.

1. Lister les livres.
2. Ajouter un livre (le serveur attribue l’identifiant).
3. Remplacer complètement la fiche du livre 12.
4. Marquer le livre 12 comme emprunté, sans renvoyer toute la fiche.
5. Supprimer le livre 12.
6. Ajouter un livre dont l’ISBN existe déjà.

:::solution
1. `GET /books` → `200` avec la liste. Erreur plausible : `500` ou `503` côté serveur.
2. `POST /books` → `201` avec `Location: /books/<id>` et la fiche créée. Erreur : `400`
   si un champ obligatoire manque, `415` si le corps n’est pas en JSON.
3. `PUT /books/12` avec la fiche complète → `200` (avec la fiche) ou `204`. Erreur :
   `404` si le livre n’existe pas et que le serveur ne crée pas par `PUT`, `400` si la
   fiche est incomplète.
4. `PATCH /books/12` avec par exemple `{"borrowed":true}` → `200` ou `204`. Erreur : `404`,
   ou `409` si le livre est déjà emprunté (conflit avec l’état actuel).
5. `DELETE /books/12` → `204`. Erreur : `404` s’il n’existe pas (ou déjà supprimé), `403`
   si l’utilisateur n’a pas le droit de supprimer.
6. `POST /books` → `409 Conflict` : la requête est valide en soi mais entre en conflit
   avec une ressource existante. `400` est acceptable si l’API le documente, mais `409`
   est plus précis.
:::

### Exercice 2 : idempotence en pratique

Une application mobile envoie une requête, puis la connexion coupe avant la réponse.
L’application réessaie automatiquement. Pour chaque requête, dis si le nouvel essai est
sans risque et explique.

1. `GET /notes`
2. `POST /orders` avec un panier
3. `PUT /profile` avec le profil complet
4. `DELETE /notes/7`
5. `PATCH /counters/visits` avec `{"increment":1}`

:::solution
1. **Sans risque** : `GET` est sûre, donc idempotente.
2. **Risqué** : `POST` n’est pas idempotent ; si la première requête a été traitée, le
   nouvel essai crée une **deuxième commande**. Certaines API font envoyer par le client
   un identifiant unique par commande pour détecter ces doublons.
3. **Sans risque** : `PUT` remplace par la même représentation ; l’état final est le même.
4. **Sans risque** : `DELETE` est idempotent. Le second essai peut recevoir `404`, mais
   l’état (note supprimée) est le même.
5. **Risqué** : cet incrément n’est pas idempotent, chaque essai ajoute 1. `PATCH` n’est
   pas idempotent par nature ; seul le contenu précis de la modification permet de dire
   si la répéter est sans effet.
:::

### Exercice 3 : corriger des réponses

Un collègue a écrit une API qui répond ainsi. Pour chaque cas, explique le problème et
propose le bon code.

1. `POST /notes` réussi → `200 OK`, corps `{"id":8,"text":"…"}`.
2. `GET /notes/99` (inexistante) → `200 OK`, corps `{"error":"not found"}`.
3. `POST /notes` avec un corps JSON sans `text` → `500 Internal Server Error`.
4. `GET /admin` sans être connecté → `403 Forbidden`.

:::solution
1. Acceptable mais imprécis : une création devrait renvoyer `201 Created` avec
   `Location: /notes/8`.
2. **Faux** : un client ou un outil de surveillance lit `200` et croit que tout va bien.
   Il faut `404 Not Found` (le corps JSON d’erreur peut rester).
3. **Faux** : la faute vient du client, qui peut corriger sa requête : `400 Bad Request`
   (ou `422` si l’API distingue JSON mal formé et contenu invalide). Une `500` fait
   croire à un bug serveur et peut déclencher des alertes inutiles.
4. Discutable : l’utilisateur n’est pas authentifié, et se connecter pourrait régler le
   problème : `401 Unauthorized`, avec un en-tête `WWW-Authenticate`. `403` convient
   quand l’utilisateur est connecté mais n’a pas les droits.
:::

## Récapitulatif

- `GET` lit, `HEAD` lit sans corps, `POST` fait traiter des données (souvent : créer),
  `PUT` remplace, `PATCH` modifie partiellement, `DELETE` supprime, `OPTIONS` décrit les
  possibilités.
- **Sûres** : `GET`, `HEAD`, `OPTIONS` (aucune modification demandée). Jamais de
  modification sur un `GET`.
- **Idempotentes** : les méthodes sûres, plus `PUT` et `DELETE` ; l’idempotence porte sur
  l’état du serveur, pas sur le code renvoyé. `POST` et `PATCH` ne le sont pas en général.
- Une requête idempotente peut être réessayée sans risque après une coupure.
- Succès : `200`, `201` (avec `Location`), `204` (sans corps).
- Redirections : `301`/`308` permanentes, `302`/`307` temporaires, `303` après un `POST` ;
  `307` et `308` conservent la méthode. `304` concerne le cache.
- Erreurs client : `400`, `401` (authentification), `403` (autorisation), `404`, `405`
  (avec `Allow`), `409`, `415`, `422`, `429`.
- Erreurs serveur : `500`, `502`, `503`, `504`. Une donnée invalide du client n’est jamais
  une `500`, et une erreur n’est jamais une `200`.
