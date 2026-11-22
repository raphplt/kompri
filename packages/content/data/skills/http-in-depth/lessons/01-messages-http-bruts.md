---
title: Lire des messages HTTP bruts
summary: Observer, écrire à la main et décortiquer requêtes et réponses HTTP octet par octet.
durationMinutes: 50
sources:
  - title: RFC 9112 — HTTP/1.1
    url: https://www.rfc-editor.org/rfc/rfc9112.html
  - title: RFC 9110 — HTTP Semantics
    url: https://www.rfc-editor.org/rfc/rfc9110.html
  - title: MDN — Messages HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Messages
  - title: Node.js — Module http
    url: https://nodejs.org/docs/latest-v24.x/api/http.html
---

Dans « Fonctionnement du web », tu as vu qu’un navigateur et un serveur échangent des
requêtes et des réponses. Tu les as observées dans le panneau Réseau, déjà mises en forme.
Un développeur back-end doit aller plus loin : savoir **exactement** ce qui circule, ligne
par ligne, pour comprendre pourquoi un serveur répond `400 Bad Request`, pourquoi un corps
arrive tronqué ou pourquoi un en-tête est ignoré.

Dans cette leçon, tu lances un petit serveur sur ta machine, tu observes les messages
avec `curl`, puis tu écris toi-même une requête HTTP caractère par caractère.

## Préparer ton laboratoire

Tu as besoin de **Node.js 24** et d’un terminal (voir la compétence « Terminal et ligne
de commande »), ainsi que de **curl**, un client HTTP en ligne de commande. curl est
installé d’office sur macOS et sur la plupart des distributions Linux. Windows 10 et 11
fournissent `curl.exe`.

:::warning[Windows et PowerShell]
Dans Windows PowerShell, le mot `curl` peut désigner une autre commande
(`Invoke-WebRequest`) qui n’accepte pas les mêmes options. Tape **`curl.exe`** pour être
sûr d’utiliser le vrai curl. Les guillemets se comportent aussi différemment de bash :
le plus simple est de suivre ce cours dans WSL ou dans Git Bash.
:::

Crée un dossier `http-lab`, puis un fichier `server.mjs` avec le contenu suivant. Tu n’as
pas besoin de comprendre le JavaScript pour l’instant : ce serveur répond à trois cas et
les commentaires disent ce qu’il fait.

```js
import { createServer } from 'node:http';

const port = 3000;

const server = createServer(async (req, res) => {
  // Lit le corps éventuel de la requête, morceau par morceau.
  let body = '';
  for await (const chunk of req) body += chunk;

  if (req.method === 'GET' && req.url === '/hello') {
    const html = '<!doctype html>\n<title>Salut</title>\n<p>Bonjour !</p>\n';
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
    return;
  }

  if (req.url.startsWith('/echo')) {
    // Reconstruit la requête telle que le serveur l’a reçue.
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    const text = `${lines.join('\n')}\n\n${body || '(corps vide)'}\n`;
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
    return;
  }

  const message = 'Ressource introuvable\n';
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
  });
  res.end(message);
});

server.listen(port, () => {
  console.log(`Serveur prêt sur http://localhost:${port}`);
});
```

Lance-le depuis le dossier `http-lab` :

```bash
node server.mjs
```

```text
Serveur prêt sur http://localhost:3000
```

Le terminal reste occupé : c’est normal, le serveur attend des requêtes. Ouvre un
**second terminal** pour la suite. Pour arrêter le serveur, reviens dans le premier et
appuie sur `Ctrl`+`C`.

## Voir une réponse complète avec curl -i

Par défaut, curl n’affiche que le **corps** de la réponse. L’option `-i` (*include*)
ajoute la ligne de statut et les en-têtes :

```bash
curl -i http://localhost:3000/hello
```

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 54
Date: Sat, 21 Nov 2026 21:37:59 GMT
Connection: keep-alive
Keep-Alive: timeout=5

<!doctype html>
<title>Salut</title>
<p>Bonjour !</p>
```

(La date sera évidemment celle de ton essai.) Une réponse HTTP/1.1 a toujours cette
forme :

1. la **ligne de statut** : version du protocole, **code de statut**, puis une **phrase
   explicative** (*reason phrase*) destinée aux humains. Les programmes ne regardent que
   le code ; la phrase peut même être absente ;
2. les **champs d’en-tête**, un par ligne, au format `Nom: valeur` ;
3. une **ligne vide**, qui marque la fin des en-têtes ;
4. le **corps**, ici 54 octets de HTML.

Les en-têtes de cette réponse :

| En-tête          | Rôle                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `Content-Type`   | Le type du corps (HTML) et son encodage (UTF-8)                         |
| `Content-Length` | La taille exacte du corps **en octets** : le client sait où il s’arrête |
| `Date`           | Le moment où la réponse a été produite, toujours en temps GMT           |
| `Connection` et `Keep-Alive` | La connexion reste ouverte quelques secondes pour d’autres requêtes |

:::note[Octets et caractères]
`Content-Length` compte des **octets**, pas des caractères. En UTF-8, « é » occupe deux
octets. C’est pour cela que le serveur calcule la taille avec `Buffer.byteLength` plutôt
qu’en comptant les lettres.
:::

## Voir la requête avec curl -v

L’option `-v` (*verbose*) montre aussi ce que curl **envoie** :

```bash
curl -v http://localhost:3000/echo?nom=Ada
```

```text
* Host localhost:3000 was resolved.
* IPv6: ::1
* IPv4: 127.0.0.1
*   Trying 127.0.0.1:3000...
* Connected to localhost (127.0.0.1) port 3000
> GET /echo?nom=Ada HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/8.5.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Content-Type: text/plain; charset=utf-8
< Content-Length: 97
< Date: Sat, 21 Nov 2026 21:37:59 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
<
{ [97 bytes data]
* Connection #0 to host localhost left intact
GET /echo?nom=Ada HTTP/1.1
Host: localhost:3000
User-Agent: curl/8.5.0
Accept: */*

(corps vide)
```

Trois préfixes à reconnaître :

- `*` : des informations de curl sur ce qu’il fait (résolution du nom, connexion). Leur
  contenu varie selon la version de curl et ton système ; ici, `localhost` a été résolu
  et la connexion établie sur le port 3000 ;
- `>` : les lignes **envoyées** au serveur, c’est-à-dire la requête ;
- `<` : les lignes **reçues**, c’est-à-dire la ligne de statut et les en-têtes de la
  réponse.

Le corps de la réponse s’affiche ensuite, sans préfixe. Ici, notre serveur d’écho
renvoie justement la requête qu’il a reçue : elle est identique à celle que curl affiche
avec `>`.

### Anatomie d’une requête

```http
GET /echo?nom=Ada HTTP/1.1
Host: localhost:3000
User-Agent: curl/8.5.0
Accept: */*

```

1. La **ligne de requête** contient la **méthode** (`GET`), la **cible** (`/echo?nom=Ada`,
   c’est-à-dire le chemin et la requête de l’URL, sans schéma, hôte ni fragment) et la
   version.
2. Les **en-têtes**. `Host` est **obligatoire** en HTTP/1.1 : il indique au serveur quel
   site est demandé, puisqu’une même adresse IP peut héberger plusieurs domaines.
   `Accept: */*` signifie « j’accepte n’importe quel type de contenu ».
3. La **ligne vide**, obligatoire même sans corps : elle dit « fin des en-têtes ».
4. Le **corps**, absent ici.

### Une requête avec un corps

L’option `-d` (*data*) envoie un corps, et fait passer curl en `POST` :

```bash
curl -i -d 'nom=Ada&langage=js' http://localhost:3000/echo
```

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 163
Date: Sat, 21 Nov 2026 21:37:59 GMT
Connection: keep-alive
Keep-Alive: timeout=5

POST /echo HTTP/1.1
Host: localhost:3000
User-Agent: curl/8.5.0
Accept: */*
Content-Length: 18
Content-Type: application/x-www-form-urlencoded

nom=Ada&langage=js
```

curl a ajouté deux en-têtes : `Content-Length: 18` (le corps `nom=Ada&langage=js` fait
18 octets) et `Content-Type: application/x-www-form-urlencoded`, le format des
formulaires HTML. Sans `Content-Length`, le serveur ne saurait pas où s’arrête le corps.

## Écrire une requête à la main

Pour vraiment comprendre le format, rien ne vaut d’écrire une requête soi-même. Ajoute
dans `http-lab` ce petit client, `raw.mjs`, qui envoie le contenu d’un fichier texte tel
quel au serveur et affiche la réponse brute :

```js
import { connect } from 'node:net';
import { readFile } from 'node:fs/promises';

// Usage : node raw.mjs fichier-requete.txt [hôte] [port]
const [file, host = 'localhost', port = '3000'] = process.argv.slice(2);
const text = await readFile(file, 'utf8');

// HTTP exige CRLF (\r\n) en fin de ligne : on convertit les fins de ligne du fichier.
const request = text.replace(/\r?\n/g, '\r\n');

const socket = connect(Number(port), host);
socket.setEncoding('utf8');
socket.write(request);

// Affiche tout ce que le serveur renvoie, jusqu’à la fermeture de la connexion.
for await (const chunk of socket) process.stdout.write(chunk);
```

En HTTP/1.1, chaque ligne se termine par deux caractères invisibles : retour chariot
(`\r`, *CR*) et saut de ligne (`\n`, *LF*), notés **CRLF**. Ton éditeur n’écrit en
général que `\n` ; le client fait la conversion pour toi.

Crée maintenant `request.txt`. **Termine-le par une ligne vide** : après
`Connection: close`, appuie deux fois sur Entrée.

```http
GET /hello HTTP/1.1
Host: localhost:3000
Connection: close

```

L’en-tête `Connection: close` demande au serveur de fermer la connexion après sa réponse ;
sans lui, le serveur la garderait ouverte quelques secondes en attendant d’autres
requêtes, et notre client attendrait aussi. Envoie la requête :

```bash
node raw.mjs request.txt
```

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 54
Date: Sat, 21 Nov 2026 21:38:13 GMT
Connection: close

<!doctype html>
<title>Salut</title>
<p>Bonjour !</p>
```

Tu viens de parler HTTP sans navigateur ni curl : ce ne sont que des lignes de texte
envoyées sur une connexion TCP.

### Expériences : casser la requête

Modifie `request.txt` et observe la réaction du serveur.

**Supprime la ligne `Host`.** Le serveur répond :

```http
HTTP/1.1 400 Bad Request
Connection: close
Date: Sat, 21 Nov 2026 21:38:13 GMT
Transfer-Encoding: chunked

0

```

`400 Bad Request` : la requête ne respecte pas le protocole, puisque `Host` est
obligatoire en HTTP/1.1. Remarque l’en-tête `Transfer-Encoding: chunked` à la place de
`Content-Length` : le corps est envoyé en **morceaux** (*chunks*), chacun précédé de sa
taille en hexadécimal ; le morceau de taille `0` signale la fin. C’est l’autre façon,
pour un émetteur, d’indiquer où s’arrête le corps quand il ne connaît pas sa taille à
l’avance. Ici le corps est vide.

**Écris la méthode en minuscules** (`get /hello HTTP/1.1`). Le serveur répond aussi
`400 Bad Request` : les noms de méthodes sont **sensibles à la casse** et s’écrivent en
majuscules.

**Envoie un corps avec une taille fausse.** Crée `post.txt` :

```http
POST /echo HTTP/1.1
Host: localhost:3000
Content-Type: text/plain
Content-Length: 30
Connection: close

Bonjour HTTP!
```

Le corps `Bonjour HTTP!` fait 13 octets, mais la requête en annonce 30. Le serveur
**attend** les 17 octets manquants, et `node raw.mjs post.txt` semble bloqué. Arrête-le
avec `Ctrl`+`C`, corrige en `Content-Length: 13` et relance : le serveur d’écho renvoie
ta requête complète.

Ces expériences montrent pourquoi le **découpage** (*framing*) des messages est si
important : c’est grâce à la ligne vide et à `Content-Length` (ou à `chunked`) que les
deux côtés savent où finit chaque partie.

## Les règles de syntaxe à retenir

- Les **noms d’en-têtes** sont **insensibles à la casse** : `Content-Type`,
  `content-type` et `CONTENT-TYPE` désignent le même champ. Les **valeurs**, elles,
  peuvent l’être.
- Un même en-tête peut parfois apparaître plusieurs fois ; c’est le cas de `Set-Cookie`,
  que tu verras dans une prochaine leçon.
- La **méthode** est sensible à la casse et s’écrit en majuscules.
- La ligne vide après les en-têtes est **obligatoire**, même sans corps.
- Un message avec corps indique sa longueur par `Content-Length` ou par
  `Transfer-Encoding: chunked`.

## HTTP/2 et HTTP/3 : le même sens, un autre format

HTTP/1.1 est un format **texte**. HTTP/2 et HTTP/3, utilisés par la plupart des grands
sites en HTTPS, découpent les messages en **trames binaires**, compressent les en-têtes
et permettent plusieurs échanges simultanés sur une même connexion. La **sémantique**,
elle, ne change pas : méthodes, codes de statut, en-têtes et corps ont le même sens. La
norme RFC 9110 décrit cette sémantique commune, et d’autres normes décrivent chaque format.

Quelques différences visibles quand tu observes un échange HTTP/2 :

- les noms d’en-têtes sont toujours en **minuscules** ;
- la ligne de requête est remplacée par des **pseudo-en-têtes** commençant par `:` :
  `:method`, `:path`, `:scheme`, `:authority` (qui remplace `Host`) ;
- la réponse a un pseudo-en-tête `:status` et **pas de phrase explicative** ; curl
  affiche par exemple `HTTP/2 200` ;
- il n’y a pas d’en-tête `Connection`.

Les outils de développement du navigateur affichent les en-têtes HTTP/2 sous une forme
lisible. Dans Chrome, le bouton ou la case **Raw** de l’onglet En-têtes montre une
version texte reconstituée.

## Pièges et idées reçues

**« `Content-Length` compte les caractères. »** Il compte des **octets**. Un corps
`Café` fait 5 octets en UTF-8, pas 4.

**« Le fragment `#section` fait partie de la cible de la requête. »** Le fragment ne
quitte jamais le client : la cible contient seulement le chemin et la requête.

**« Un serveur qui ne répond pas est forcément planté. »** Il attend peut-être la fin
d’une requête incomplète : ligne vide manquante, corps plus court que le
`Content-Length` annoncé.

**« La phrase explicative compte. »** Seul le code compte pour les programmes. `200 OK`,
`200 Tout va bien` et `200` sans phrase sont équivalents ; en HTTP/2, il n’y a plus de
phrase du tout.

**« curl -v affiche exactement les mêmes lignes partout. »** Les lignes préfixées par `*`
dépendent de la version de curl et du système. Seules les lignes `>` et `<` sont le
dialogue HTTP.

## Exercices

### Exercice 1 : annoter un échange

Voici un échange capturé avec `curl -v` (lignes `*` retirées) :

```text
> POST /api/messages?draft=true HTTP/1.1
> Host: api.example.com
> User-Agent: curl/8.5.0
> Accept: application/json
> Content-Type: application/json
> Content-Length: 18
>
< HTTP/1.1 201 Created
< Content-Type: application/json
< Location: /api/messages/57
< Content-Length: 26
<
{"id":57,"text":"Bonjour"}
```

1. Donne la méthode, la cible, le domaine et le type du corps envoyé.
2. Le corps de la requête n’est pas affiché. Propose un corps JSON plausible de 18 octets
   qui contient le mot « Bonjour », et vérifie le compte.
3. Que signifie la ligne `< HTTP/1.1 201 Created` ? À quoi sert probablement `Location` ?
4. Vérifie la cohérence du `Content-Length` de la réponse avec son corps.

:::solution
1. Méthode `POST`, cible `/api/messages?draft=true` (chemin `/api/messages`, requête
   `?draft=true`), domaine `api.example.com` (en-tête `Host`), corps en JSON
   (`Content-Type: application/json`).
2. Par exemple `{"text":"Bonjour"}`. Tous ses caractères occupent un octet en UTF-8 :
   `{` (1) + `"text"` (6) + `:` (1) + `"Bonjour"` (9) + `}` (1) = 18 octets. Avec une
   espace après les deux-points, `{"text": "Bonjour"}` ferait 19 octets et ne
   correspondrait plus : `Content-Length` compte exactement les octets envoyés.
3. Ligne de statut : version HTTP/1.1, code `201` (une ressource a été créée), phrase
   `Created`. `Location` indique l’URL de la nouvelle ressource, ici le message n° 57.
4. `{"id":57,"text":"Bonjour"}` : `{` (1) + `"id"` (4) + `:` (1) + `57` (2) + `,` (1) +
   `"text"` (6) + `:` (1) + `"Bonjour"` (9) + `}` (1) = 26 octets, exactement la valeur
   annoncée. Si le serveur avait annoncé 28, le client aurait attendu 2 octets de plus
   et serait resté bloqué, comme le serveur dans l’expérience de la leçon.
:::

### Exercice 2 : écrire un POST à la main

Avec `raw.mjs` et le serveur d’écho, envoie une requête `POST` vers `/echo` dont le corps
est exactement `prénom=Zoé` en `text/plain`, et qui ferme la connexion après la réponse.
Calcule toi-même le `Content-Length`.

:::solution
Le corps `prénom=Zoé` contient 10 caractères, dont deux lettres accentuées qui occupent
chacune 2 octets en UTF-8 : 8 × 1 + 2 × 2 = **12 octets**. Fichier `zoe.txt` (sans saut
de ligne après le corps) :

```http
POST /echo HTTP/1.1
Host: localhost:3000
Content-Type: text/plain; charset=utf-8
Content-Length: 12
Connection: close

prénom=Zoé
```

```bash
node raw.mjs zoe.txt
```

Le serveur renvoie `200 OK` et, dans son corps, ta requête complète terminée par
`prénom=Zoé`. Avec `Content-Length: 10` (le nombre de caractères), le serveur considère
que le corps s’arrête après 10 octets, au milieu du « é ». Les 2 octets restants sont lus
comme le début d’une nouvelle requête, invalide, et ce serveur Node.js répond seulement :

```http
HTTP/1.1 400 Bad Request
Connection: close

```

C’est un exemple concret de l’importance de compter des octets.

Si ton éditeur ajoute automatiquement un saut de ligne en fin de fichier, ce saut de
ligne est envoyé **après** les 12 octets du corps. Le serveur ne le compte pas dans le
corps ; ici il l’ignore, car la norme HTTP/1.1 tolère des lignes vides avant une
requête.

:::

### Exercice 3 : HTTP/1.1 ou HTTP/2 ?

Pour chacun de ces extraits, dis s’il vient d’un échange HTTP/1.1 ou HTTP/2, et
justifie.

```text
A.  < HTTP/2 404
    < content-type: text/html; charset=utf-8
    < content-length: 1256

B.  > GET /docs HTTP/1.1
    > Host: example.org

C.  :method: GET
    :path: /docs
    :authority: example.org
```

:::solution
- **A : HTTP/2.** La ligne de statut affichée par curl indique `HTTP/2`, n’a pas de
  phrase explicative et les en-têtes sont en minuscules.
- **B : HTTP/1.1.** Ligne de requête textuelle avec version, en-tête `Host`.
- **C : HTTP/2** (ou HTTP/3). Les pseudo-en-têtes `:method`, `:path` et `:authority`
  remplacent la ligne de requête et l’en-tête `Host`. Le sens est exactement le même que
  dans B.
:::

## Récapitulatif

- Un message HTTP/1.1 = **ligne de départ** (requête ou statut), **en-têtes**, **ligne
  vide**, **corps** facultatif ; chaque ligne se termine par **CRLF**.
- La ligne de requête contient la **méthode**, la **cible** (chemin et requête) et la
  version ; `Host` est obligatoire en HTTP/1.1.
- La ligne de statut contient la version, le **code** et une phrase explicative sans
  importance pour les programmes.
- La fin du corps est indiquée par **`Content-Length`** (en octets) ou par
  **`Transfer-Encoding: chunked`**.
- `curl -i` montre la réponse complète ; `curl -v` montre aussi la requête (`>`) et la
  réponse (`<`).
- Noms d’en-têtes insensibles à la casse, méthodes en majuscules.
- HTTP/2 et HTTP/3 utilisent un format binaire et des pseudo-en-têtes, mais gardent la
  même sémantique.
