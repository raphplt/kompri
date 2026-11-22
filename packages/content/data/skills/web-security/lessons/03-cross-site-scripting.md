---
title: Le cross-site scripting (XSS)
summary: Reconnaître les XSS réfléchie, stockée et DOM, échapper selon le contexte et ajouter une Content-Security-Policy.
durationMinutes: 60
sources:
  - title: MDN — Cross-site scripting (XSS)
    url: https://developer.mozilla.org/fr/docs/Web/Security/Attacks/XSS
  - title: OWASP — Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  - title: MDN — Content Security Policy (CSP)
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CSP
  - title: MDN — Node.textContent
    url: https://developer.mozilla.org/fr/docs/Web/API/Node/textContent
---

## Le problème : du code glissé dans ta page

L’injection SQL transformait une donnée en code SQL. Le **cross-site scripting** (XSS) fait la
même chose dans le navigateur : une donnée contrôlée par un attaquant est interprétée comme
du HTML, et donc comme du **JavaScript**, dans la page de ton site.

Ce script s’exécute avec tous les droits de ton site, dans le navigateur de la victime. Il
peut lire et modifier la page, afficher un faux formulaire de connexion, lire les données
affichées, et envoyer des requêtes à ton API **au nom de la victime**, avec ses cookies.
Même un cookie `HttpOnly`, illisible en JavaScript, ne l’empêche pas d’agir : le script
n’a pas besoin de voler le cookie, il lui suffit de faire travailler le navigateur.

Dans l’édition 2021 du Top 10 de l’OWASP, le XSS fait partie de **A03:2021 Injection**.

On distingue trois variantes selon le chemin suivi par la donnée :

| Variante | Chemin de la donnée | Exemple |
| --- | --- | --- |
| Réfléchie | Requête → réponse HTML immédiate du serveur | Un terme de recherche réaffiché dans la page |
| Stockée | Requête → base → page de **toutes** les personnes qui consultent | Un commentaire, un pseudo |
| DOM | URL ou donnée → JavaScript du navigateur → DOM, sans passer par le HTML du serveur | `innerHTML` avec un paramètre d’URL |

Dans les exemples, la charge utile change le titre de l’onglet en « XSS » : c’est inoffensif
et visible. Un vrai attaquant ferait bien pire.

## XSS réfléchie : le serveur recopie la saisie

Dans un dossier avec Express 5, crée `escape-html.js` et `xss-server.js` :

```js
// escape-html.js — échappement pour le contexte « contenu HTML » et attributs entre guillemets
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
```

```js
// xss-server.js — une page de recherche, en version vulnérable puis corrigée
import express from 'express';
import { escapeHtml } from './escape-html.js';

const app = express();

function page(body) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Recherche</title></head>
<body>${body}</body>
</html>`;
}

// Vulnérable : la saisie est insérée telle quelle dans le HTML
app.get('/vulnerable', (req, res) => {
  const q = req.query.q ?? '';
  res.send(page(`<p>Résultats pour ${q}</p>`));
});

// Corrigé : la saisie est échappée pour le contexte HTML
app.get('/safe', (req, res) => {
  const q = String(req.query.q ?? '');
  res.send(page(`<p>Résultats pour ${escapeHtml(q)}</p>`));
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

Lance `node xss-server.js` et envoie une balise d’image piégée, encodée pour l’URL :

```bash
curl -s "http://localhost:3000/vulnerable?q=%3Cimg%20src%3Dx%20onerror%3D%22document.title%3D'XSS'%22%3E"; echo
curl -s "http://localhost:3000/safe?q=%3Cimg%20src%3Dx%20onerror%3D%22document.title%3D'XSS'%22%3E"; echo
```

Sortie :

```text
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Recherche</title></head>
<body><p>Résultats pour <img src=x onerror="document.title='XSS'"></p></body>
</html>
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Recherche</title></head>
<body><p>Résultats pour &lt;img src=x onerror=&quot;document.title=&#39;XSS&#39;&quot;&gt;</p></body>
</html>
```

Dans la première réponse, le navigateur voit une vraie balise `img`. L’image `x` n’existe pas,
l’événement `error` se déclenche et le code de l’attribut `onerror` s’exécute : ouvre l’URL dans
ton navigateur, l’onglet s’intitule « XSS ». Dans la seconde, les caractères spéciaux sont
remplacés par des **entités HTML** : le navigateur affiche le texte `<img …>` tel quel, sans
créer d’élément.

Pour l’attaquant, il suffit d’envoyer ce lien à la victime, par e-mail ou sur un forum : c’est
le site légitime qui renvoie le script.

### Pourquoi ces cinq caractères ?

- `<` et `>` ouvrent et ferment des balises ;
- `&` commence une entité ; il doit être remplacé **en premier**, sinon on échapperait les `&`
  des entités qu’on vient de produire ;
- `"` et `'` ferment une valeur d’attribut.

## Échapper selon le contexte

Il n’existe pas d’échappement universel. La bonne transformation dépend de **l’endroit** où
la donnée est insérée :

| Contexte | Exemple | Protection |
| --- | --- | --- |
| Contenu d’un élément | `<p>DONNÉE</p>` | `escapeHtml` |
| Valeur d’attribut | `<input value="DONNÉE">` | `escapeHtml` **et** guillemets autour de la valeur |
| URL dans `href` ou `src` | `<a href="DONNÉE">` | Vérifier le schéma (`http:`/`https:`) puis `escapeHtml` |
| Code JavaScript | `<script>const x = 'DONNÉE'</script>` | Ne pas le faire : passer la donnée par un attribut `data-*` ou par `fetch` |
| Code CSS | `<style>… DONNÉE …</style>` | Ne pas le faire |

Deux cas méritent une explication.

**L’attribut sans guillemets.** Avec `<input value=DONNÉE>`, une simple espace suffit à
ajouter un attribut : la valeur `x onfocus=…` crée un gestionnaire d’événement sans utiliser
aucun des cinq caractères. Mets **toujours** les valeurs d’attribut entre guillemets.

**L’URL.** Le schéma `javascript:` exécute du code quand on clique sur le lien, et
`escapeHtml('javascript:alert(1)')` ne change rien à cette chaîne. Il faut une liste blanche
de schémas :

```js
// safe-url.js — n’accepter que des liens http(s) absolus
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null; // pas une URL absolue valide
  }
}

console.log(safeUrl('https://developer.mozilla.org/fr/'));
console.log(safeUrl('javascript:alert(1)'));
console.log(safeUrl('  JaVaScRiPt:alert(1)'));
console.log(safeUrl('data:text/html,<script>alert(1)</script>'));
console.log(safeUrl('/profil'));
```

Sortie (`node safe-url.js`) :

```text
https://developer.mozilla.org/fr/
null
null
null
null
```

`new URL` normalise l’entrée (espaces de tête, majuscules) avant qu’on lise `protocol` : un
test naïf comme `value.startsWith('javascript:')` serait contourné par la troisième ligne.

## XSS stockée : la donnée attend ses victimes

La variante stockée est la plus dangereuse : la charge utile est enregistrée une fois et
s’exécute chez **chaque** visiteur. Voici un livre d’or : une API JSON et une page qui
affiche les commentaires.

```js
// server.js — livre d’or : API JSON + fichiers statiques
import express from 'express';

const app = express();
const comments = []; // en mémoire pour l’exemple ; en vrai, une table PostgreSQL

app.use(express.json());
app.use(express.static('public'));

app.get('/api/comments', (req, res) => {
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const author = String(req.body?.author ?? '').trim();
  const text = String(req.body?.text ?? '').trim();
  if (author.length < 1 || author.length > 40 || text.length < 1 || text.length > 500) {
    return res.status(400).json({ error: 'Auteur (1 à 40) et texte (1 à 500) requis' });
  }
  const comment = { id: comments.length + 1, author, text };
  comments.push(comment);
  res.status(201).json(comment);
});

app.listen(3000, () => console.log('Livre d’or sur http://localhost:3000'));
```

```html
<!-- public/index.html -->
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Livre d’or</title>
  <script type="module" src="comments.js"></script>
</head>
<body>
  <h1>Livre d’or</h1>
  <ul id="comments"></ul>
</body>
</html>
```

La version dangereuse de `public/comments.js`, très fréquente, construit du HTML avec un
gabarit de chaîne :

```js
// public/comments.js — VERSION DANGEREUSE
const list = document.querySelector('#comments');
const response = await fetch('/api/comments');
const comments = await response.json();
list.innerHTML = comments.map((c) => `<li><strong>${c.author}</strong> : ${c.text}</li>`).join('');
```

Lance le serveur et publie deux commentaires :

```bash
curl -s -X POST localhost:3000/api/comments -H 'Content-Type: application/json' \
  -d '{"author":"Ada","text":"Très beau site !"}'; echo
curl -s -X POST localhost:3000/api/comments -H 'Content-Type: application/json' \
  -d "{\"author\":\"Mallory\",\"text\":\"<img src=x onerror=\\\"document.title='XSS'\\\">\"}"; echo
```

```text
{"id":1,"author":"Ada","text":"Très beau site !"}
{"id":2,"author":"Mallory","text":"<img src=x onerror=\"document.title='XSS'\">"}
```

L’API a stocké le texte tel quel, et c’est normal : ce n’est **pas** à l’entrée qu’il faut
transformer cette donnée. Ouvre `http://localhost:3000` : l’onglet s’intitule « XSS ». Le code
de Mallory s’exécute chez chaque visiteur.

### La correction : construire le DOM avec du texte

```js
// public/comments.js — version sûre
const list = document.querySelector('#comments');

function renderComments(comments) {
  const items = comments.map((comment) => {
    const item = document.createElement('li');
    const author = document.createElement('strong');
    author.textContent = comment.author; // texte, jamais interprété
    item.append(author, ` : ${comment.text}`); // une chaîne passée à append devient un nœud texte
    return item;
  });
  list.replaceChildren(...items);
}

const response = await fetch('/api/comments');
renderComments(await response.json());
```

Recharge la page : le titre reste « Livre d’or » et le commentaire de Mallory s’affiche comme
du texte, `<img src=x onerror="document.title='XSS'">`. Si tu inspectes la liste dans les
outils de développement, le HTML sérialisé montre `&lt;img …&gt;` : le navigateur a créé un
**nœud texte**, pas un élément.

`textContent`, `append` avec une chaîne, `createTextNode` et `setAttribute` sur un attribut
non dangereux insèrent du texte. En revanche, `innerHTML`, `outerHTML`,
`insertAdjacentHTML` et `document.write` analysent leur argument comme du HTML.

:::note[Une idée reçue sur innerHTML]
Une balise `script` insérée par `innerHTML` ne s’exécute pas : la spécification HTML le
prévoit. Cela ne protège de rien, car les attributs d’événement (`onerror`, `onload`…) d’un
élément inséré, eux, s’exécutent. C’est pourquoi les exemples utilisent `img`.

:::

## XSS DOM : tout se passe dans le navigateur

Dans la variante DOM, le serveur peut être irréprochable : c’est le JavaScript de la page qui
lit une donnée contrôlable (l’URL, `location.hash`, un message) et l’injecte dans le DOM.

```html
<!-- public/greet.html -->
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Accueil</title>
  <script type="module" src="greet.js"></script>
</head>
<body>
  <p id="unsafe"></p>
  <p id="safe"></p>
</body>
</html>
```

```js
// public/greet.js — lit ?name=… dans l’URL et l’affiche de deux façons
const name = new URLSearchParams(location.search).get('name') ?? 'inconnu';

// DANGEREUX : la chaîne est interprétée comme du HTML
document.querySelector('#unsafe').innerHTML = `Bonjour ${name}`;

// SÛR : la chaîne est insérée comme du texte
document.querySelector('#safe').textContent = `Bonjour ${name}`;
```

Avec l’adresse `greet.html?name=Ada`, les deux paragraphes affichent « Bonjour Ada ». Avec
`greet.html?name=%3Cimg%20src%3Dx%20onerror%3D%22document.title%3D'XSS'%22%3E`, le premier
paragraphe contient un vrai élément `img` et l’onglet s’intitule « XSS » ; le second affiche
le texte `Bonjour <img src=x onerror="document.title='XSS'">`.

## Défense en profondeur : la Content-Security-Policy

Échapper chaque sortie est indispensable, mais un seul oubli suffit. L’en-tête HTTP
**Content-Security-Policy** (CSP) ajoute une seconde barrière : il indique au navigateur
d’où la page a le droit de charger et d’exécuter du code. Exemple :

```http
Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

- `default-src 'self'` : scripts, styles, images, connexions `fetch`… uniquement depuis la
  même origine. Surtout, **aucun script en ligne** : ni balise `script` avec du code
  dedans, ni attribut `onclick`/`onerror`, ni URL `javascript:`.
- `object-src 'none'` : aucun plugin (`object`, `embed`).
- `base-uri 'self'` : empêche une balise `base` injectée de détourner les URL relatives.
- `frame-ancestors 'none'` : interdit d’afficher la page dans une `iframe` d’un autre site
  (protection contre le *clickjacking*).

Ajoute une route au serveur de recherche, identique à `/vulnerable` mais avec l’en-tête :

```js
app.get('/vulnerable-csp', (req, res) => {
  res.set('Content-Security-Policy', "default-src 'self'");
  const q = req.query.q ?? '';
  res.send(page(`<p>Résultats pour ${q}</p>`));
});
```

Ouvre cette route avec la même charge utile : l’élément `img` est bien injecté, mais le titre
reste « Recherche ». La console de Chromium affiche :

```text
Executing inline event handler violates the following Content Security Policy directive 'default-src 'self''. …
```

La faille existe toujours ; la CSP l’a rendue inexploitable dans ce cas. C’est exactement
le rôle d’une défense en profondeur. En contrepartie, ton propre code doit respecter la
politique : tout JavaScript dans des fichiers `.js` (ce que tu fais déjà avec
`script type="module" src="…"`), aucun `onclick` dans le HTML (utilise `addEventListener`),
pas de style en ligne si `style-src` n’est pas assoupli.

:::tip
Pour introduire une CSP sur un site existant sans rien casser, commence par l’en-tête
`Content-Security-Policy-Report-Only` : le navigateur signale les violations dans la console
sans rien bloquer. Corrige, puis passe à l’en-tête définitif.

:::

## Pièges et idées reçues

- **« J’échappe à l’entrée, avant d’enregistrer. »** La donnée sera alors doublement échappée
  si l’affichage échappe aussi (`&amp;lt;`), et elle sera fausse dans un autre contexte (JSON,
  e-mail, export CSV). On stocke la donnée brute et on l’encode **à la sortie**, selon le
  contexte.
- **« Je filtre les balises `script`. »** Liste noire : `img onerror`, `svg onload`, `a href`
  en `javascript:` et bien d’autres passent. On échappe tout, ou on utilise une bibliothèque
  d’assainissement éprouvée (comme DOMPurify) quand on doit vraiment accepter du HTML.
- **« Le cookie est `HttpOnly`, donc une XSS n’est pas grave. »** Le script ne peut pas lire le
  cookie, mais peut agir avec : modifier le mot de passe, lire les données de l’API, etc.
- **« `'unsafe-inline'` règle mes problèmes de CSP. »** Il autorise justement les scripts en
  ligne, donc les attributs `onerror` injectés : la CSP ne protège alors plus contre la XSS.
- **`req.query.q` n’est pas toujours une chaîne.** Avec `?q=a&q=b`, Express fournit un
  tableau. Convertis explicitement (`String(…)`) ou valide le type avant de l’utiliser.

## Exercices

### Exercice 1 — Contexte par contexte

Ce gabarit de page de profil est généré côté serveur. Les valeurs `user.name`,
`user.website` et `user.bio` sont choisies librement par l’utilisateur. Identifie le contexte
de chaque insertion, le risque, et corrige-le avec `escapeHtml` et `safeUrl`.

```js
function profilePage(user) {
  return `<h2>${user.name}</h2>
<a href="${user.website}">Site web</a>
<img alt=${user.name} src="/avatars/${user.id}.png">
<p>${user.bio}</p>`;
}
```

:::solution
- `h2` et `p` : contexte « contenu d’élément » → `escapeHtml`.
- `href` : contexte URL → `javascript:` permettrait d’exécuter du code au clic. On vérifie le
  schéma avec `safeUrl`, puis on échappe pour l’attribut. Sans URL valide, on n’affiche pas
  le lien.
- `alt=${user.name}` : attribut **sans guillemets**. Un nom comme `x onerror=…` ajouterait un
  attribut. On ajoute les guillemets et on échappe.
- `user.id` vient de la base (entier généré) : ce n’est pas une saisie libre, mais
  `escapeHtml` ne coûte rien.

```js
import { escapeHtml } from './escape-html.js';
import { safeUrl } from './safe-url.js';

function profilePage(user) {
  const website = safeUrl(user.website);
  const link = website ? `<a href="${escapeHtml(website)}">Site web</a>` : '';
  return `<h2>${escapeHtml(user.name)}</h2>
${link}
<img alt="${escapeHtml(user.name)}" src="/avatars/${escapeHtml(user.id)}.png">
<p>${escapeHtml(user.bio)}</p>`;
}

console.log(profilePage({
  id: 7,
  name: 'x onerror=alert(1)',
  website: 'javascript:alert(1)',
  bio: '<b>Salut</b>',
}));
```

Sortie :

```text
<h2>x onerror=alert(1)</h2>

<img alt="x onerror=alert(1)" src="/avatars/7.png">
<p>&lt;b&gt;Salut&lt;/b&gt;</p>
```

Le lien a disparu (URL refusée), le nom est enfermé dans des guillemets et la biographie
s’affiche comme du texte. En pratique, un moteur de gabarits qui échappe par défaut évite
d’oublier un `escapeHtml`.

:::

### Exercice 2 — Réécrire sans innerHTML

Réécris cette fonction pour qu’elle produise le même affichage sans `innerHTML`, ni
`insertAdjacentHTML`. Chaque tâche a un `title` (texte libre) et un booléen `done`.

```js
function renderTasks(ul, tasks) {
  ul.innerHTML = tasks
    .map((t) => `<li class="${t.done ? 'done' : ''}"><input type="checkbox" ${t.done ? 'checked' : ''}> ${t.title}</li>`)
    .join('');
}
```

:::solution
```js
function renderTasks(ul, tasks) {
  const items = tasks.map((task) => {
    const item = document.createElement('li');
    item.classList.toggle('done', task.done);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    item.append(checkbox, ` ${task.title}`); // le titre devient un nœud texte
    return item;
  });
  ul.replaceChildren(...items);
}
```

- `classList.toggle(nom, condition)` ajoute ou retire la classe selon le booléen.
- `checkbox.checked` est une **propriété** : pas de chaîne HTML à construire.
- `replaceChildren` vide la liste et insère les nouveaux éléments en une opération.
- Pour l’accessibilité, un vrai projet associerait un `label` à la case ; l’essentiel ici est
  qu’aucune donnée ne passe par un analyseur HTML.

:::

### Exercice 3 — Prévoir l’effet d’une CSP

Une page est servie avec `Content-Security-Policy: default-src 'self'`. Pour chaque élément,
dis s’il fonctionne ou non, et pourquoi.

1. `<script type="module" src="/app.js"></script>`
2. `<button onclick="save()">Enregistrer</button>`
3. `<script>console.log('hello')</script>`
4. `<img src="https://images.example.com/logo.png">`
5. Dans `/app.js` : `fetch('/api/tasks')`

:::solution
1. Fonctionne : script chargé depuis la même origine.
2. Bloqué : attribut d’événement en ligne. Remplace-le par
   `button.addEventListener('click', save)` dans `app.js`.
3. Bloqué : script en ligne.
4. Bloqué : image d’une autre origine. Il faudrait
   `img-src 'self' https://images.example.com`.
5. Fonctionne : `connect-src` hérite de `default-src 'self'`, et la requête vise la même
   origine.

:::

## Récapitulatif

- Le XSS insère du code dans ta page et l’exécute chez la victime, avec les droits de ton
  site. Variantes : réfléchie, stockée, DOM.
- Stocker la donnée brute, l’encoder **à la sortie** selon le contexte : contenu,
  attribut entre guillemets, URL avec liste blanche de schémas. Jamais dans du code
  JavaScript ou CSS.
- Côté navigateur : `textContent`, `createElement`, `append` ; éviter `innerHTML` et ses
  cousins avec des données.
- Côté serveur : un `escapeHtml` systématique, ou un moteur de gabarits qui échappe par défaut.
- La Content-Security-Policy bloque les scripts en ligne et les origines non prévues : une
  seconde barrière qui n’excuse pas l’oubli d’échappement.
