---
title: Sélectionner, créer et modifier des éléments
summary: Trouver des éléments, changer leur contenu, leurs classes et leurs attributs, en créer et en supprimer, et insérer du texte sans faille XSS.
durationMinutes: 60
sources:
  - title: MDN — Document.querySelector()
    url: https://developer.mozilla.org/fr/docs/Web/API/Document/querySelector
  - title: MDN — Node.textContent
    url: https://developer.mozilla.org/fr/docs/Web/API/Node/textContent
  - title: MDN — Element.classList
    url: https://developer.mozilla.org/fr/docs/Web/API/Element/classList
  - title: OWASP — Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
---

## Ce que cette leçon permet de faire

Une interface web passe son temps à transformer des **données** (un tableau de produits, une
liste de messages) en **éléments affichés**, puis à mettre ces éléments à jour : cocher une
tâche, masquer un message, afficher un compteur. Tu sais déjà manipuler les données ; il te
reste à savoir agir sur le DOM.

Cette leçon couvre les quatre gestes de base — **sélectionner, modifier, créer, supprimer** —
et une règle de sécurité essentielle : comment insérer du texte venu d’un utilisateur sans
ouvrir une faille.

Tous les exemples sont des pages complètes à servir avec le `serve.js` de la leçon précédente
(`node serve.js`, puis `http://localhost:8000/`). Les sorties indiquées sont celles de la
console du navigateur (Chromium).

## Sélectionner des éléments

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Sélectionner</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <main>
      <h1 id="page-title">Mes lectures</h1>
      <ul class="books">
        <li class="book" data-id="b1">Dune</li>
        <li class="book done" data-id="b2">Fondation</li>
        <li class="book" data-id="b3">Hypérion</li>
      </ul>
      <p class="empty" hidden>Aucun livre.</p>
    </main>
  </body>
</html>
```

```js
const title = document.querySelector('#page-title');
const sameTitle = document.getElementById('page-title');
console.log(title === sameTitle);

const firstBook = document.querySelector('.book');
console.log(firstBook.textContent);

const books = document.querySelectorAll('.book');
console.log(books.length);
books.forEach((book) => console.log(book.dataset.id));

const titles = Array.from(books).map((book) => book.textContent);
console.log(titles.join(', '));

const list = document.querySelector('.books');
console.log(list.querySelector('.done').textContent);
console.log(document.querySelector('.missing'));
console.log(document.querySelectorAll('.missing').length);

console.log(firstBook.closest('main').tagName);
console.log(typeof books.map);
```

Console :

```text
true
Dune
3
b1
b2
b3
Dune, Fondation, Hypérion
Fondation
null
0
MAIN
undefined
```

| Méthode                       | Renvoie                                          | Si rien ne correspond |
| ----------------------------- | ------------------------------------------------ | --------------------- |
| `querySelector(selecteur)`    | le **premier** élément correspondant             | `null`                |
| `querySelectorAll(selecteur)` | une `NodeList` de **tous** les éléments          | une liste vide        |
| `getElementById(id)`          | l’élément de cet `id` (sans `#`)                 | `null`                |
| `element.closest(selecteur)`  | l’élément lui-même ou son plus proche ancêtre qui correspond | `null`   |

- Les sélecteurs sont ceux du CSS : `#id`, `.classe`, `balise`, `.a.b` (les deux classes),
  `nav a` (descendant), `[data-id="b2"]` (attribut)…
- On peut appeler `querySelector` **sur un élément** (`list.querySelector('.done')`) pour ne
  chercher qu’à l’intérieur. C’est plus rapide à lire et évite de toucher un élément homonyme
  ailleurs dans la page.
- `querySelectorAll` renvoie une **`NodeList`**, pas un tableau : elle a `length`, `forEach`
  et se parcourt avec `for…of`, mais n’a pas `map` ni `filter`. Convertis-la avec
  `Array.from(liste)` pour utiliser les méthodes de la compétence précédente.
- Cette `NodeList` est une **photographie** : si tu ajoutes un `.book` ensuite, elle ne le
  contiendra pas. Refais la sélection si nécessaire.

## Modifier le contenu, les classes et les attributs

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Modifier</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <a id="help" href="/aide">Aide</a>
    <button id="menu-button" type="button" aria-expanded="false">Menu</button>
    <p id="notice" class="notice">Bienvenue</p>
    <p id="product" data-product-id="42" data-in-stock="false">Lampe</p>
  </body>
</html>
```

```js
const link = document.querySelector('#help');
console.log(link.getAttribute('href'));
console.log(link.href);

const button = document.querySelector('#menu-button');
button.setAttribute('aria-expanded', 'true');
button.disabled = true;
console.log(button.outerHTML);

const notice = document.querySelector('#notice');
notice.classList.add('notice--success');
notice.classList.remove('notice');
notice.classList.toggle('is-hidden');
console.log(notice.className);
console.log(notice.classList.contains('is-hidden'));
notice.classList.toggle('is-hidden', false);
console.log(notice.className);

notice.hidden = true;
console.log(notice.outerHTML);

const product = document.querySelector('#product');
console.log(product.dataset.productId, typeof product.dataset.productId);
console.log(product.dataset.inStock === 'false', Boolean(product.dataset.inStock));
product.dataset.inStock = 'true';
console.log(product.outerHTML);
```

Console :

```text
/aide
http://localhost:8000/aide
<button id="menu-button" type="button" aria-expanded="true" disabled="">Menu</button>
notice--success is-hidden
true
notice--success
<p id="notice" class="notice--success" hidden="">Bienvenue</p>
42 string
true true
<p id="product" data-product-id="42" data-in-stock="true">Lampe</p>
```

### Attributs et propriétés

Un attribut HTML (`href="/aide"`) devient, en général, une **propriété** de l’objet élément
(`link.href`). Les deux ne sont pas toujours identiques : `getAttribute('href')` renvoie le
texte écrit dans le HTML, alors que la propriété `href` donne l’adresse complète calculée.

- Pour les attributs courants, utilise la propriété : `button.disabled = true`,
  `element.hidden = true`, `image.alt = '…'`, `input.value`.
- Pour les autres, en particulier les attributs ARIA, utilise `setAttribute(nom, valeur)` et
  `getAttribute(nom)`. `removeAttribute(nom)` supprime un attribut.
- `hidden` masque un élément (comme `display: none`) : il disparaît de l’affichage **et** des
  technologies d’assistance. C’est la manière la plus simple d’afficher ou de masquer un
  message. Attention : une règle CSS qui donne un `display` à l’élément (par exemple
  `.notice { display: flex; }`) l’emporte sur `hidden`, et l’élément reste visible.

### `classList` : changer l’apparence par les classes

Plutôt que de modifier les styles un par un en JavaScript, on ajoute ou retire des **classes**
définies dans le CSS. Le JavaScript décide de l’état, le CSS décide de l’apparence.

- `add(nom)` et `remove(nom)` ajoutent et retirent une classe ;
- `toggle(nom)` l’ajoute si elle est absente, la retire sinon ; `toggle(nom, condition)`
  l’ajoute si la condition est vraie et la retire sinon, ce qui évite un `if` ;
- `contains(nom)` teste sa présence.

La propriété `element.style.propriete` existe aussi (`element.style.width = '40%'`). Réserve-la
aux valeurs réellement calculées (une largeur de barre de progression), pas aux changements
d’état.

### `dataset` : des données attachées à un élément

Les attributs `data-*` servent à ranger une information dans le HTML, typiquement l’identifiant
de l’objet qu’un élément représente. On les lit et les écrit avec `dataset` : `data-product-id`
devient `dataset.productId` (les tirets deviennent une majuscule).

Attention : **les valeurs de `dataset` sont toujours des chaînes**. `'42'` n’est pas `42`, et
`Boolean('false')` vaut `true` car toute chaîne non vide est truthy. Compare à la chaîne
(`dataset.inStock === 'true'`) ou convertis explicitement (`Number(dataset.productId)`).

## Créer, insérer et supprimer des éléments

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Créer et supprimer</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Courses</h1>
    <ul id="list">
      <li>Pain</li>
    </ul>
  </body>
</html>
```

```js
const list = document.querySelector('#list');
const names = () => Array.from(list.children, (li) => li.textContent).join(', ');

const item = document.createElement('li');
item.textContent = 'Lait';
item.classList.add('urgent');
list.append(item);

const first = document.createElement('li');
first.textContent = 'Café';
list.prepend(first);
console.log(names());

const intro = document.createElement('p');
intro.textContent = 'Liste du jour';
list.before(intro);
console.log(list.previousElementSibling.textContent);

list.querySelector('li').remove();
console.log(names());

list.replaceChildren();
console.log(list.children.length);
```

Console :

```text
Café, Pain, Lait
Liste du jour
Pain, Lait
0
```

1. `document.createElement('li')` crée un élément **détaché** : il existe en mémoire mais
   n’apparaît pas tant qu’il n’est pas inséré.
2. On le configure (texte, classes, attributs), puis on l’insère :
   - `parent.append(...)` à la fin du parent, `parent.prepend(...)` au début ;
   - `element.before(...)` et `element.after(...)` comme frère, avant ou après.
   Ces méthodes acceptent plusieurs arguments, et des chaînes, insérées comme **texte**.
3. `element.remove()` retire l’élément du DOM.
4. `parent.replaceChildren(...enfants)` remplace tout le contenu ; sans argument, il le vide.

`Array.from(list.children, fn)` combine la conversion en tableau et un `map` en un seul appel.

### Afficher un tableau de données

Le motif le plus courant consiste à écrire une fonction qui crée l’élément d’**un** objet,
puis à l’appliquer à tout le tableau avec `map` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Catalogue</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Catalogue</h1>
    <ul id="products"></ul>
    <p id="summary"></p>
  </body>
</html>
```

```js
const products = [
  { id: 'p1', name: 'Clavier', price: 49.9, inStock: true },
  { id: 'p2', name: 'Souris', price: 19.9, inStock: false },
  { id: 'p3', name: 'Écran', price: 189, inStock: true },
];

function createProductItem(product) {
  const item = document.createElement('li');
  item.dataset.id = product.id;
  item.classList.toggle('out-of-stock', !product.inStock);

  const name = document.createElement('strong');
  name.textContent = product.name;

  const price = document.createElement('span');
  price.textContent = ` — ${product.price.toFixed(2)} €`;

  item.append(name, price);
  return item;
}

function renderProducts(list) {
  const container = document.querySelector('#products');
  container.replaceChildren(...list.map(createProductItem));
  const available = list.filter((product) => product.inStock).length;
  document.querySelector('#summary').textContent = `${available} produits disponibles`;
}

renderProducts(products);
console.log(document.querySelector('#products').innerHTML);
console.log(document.querySelector('#summary').textContent);
```

Console :

```text
<li data-id="p1"><strong>Clavier</strong><span> — 49.90 €</span></li><li data-id="p2" class="out-of-stock"><strong>Souris</strong><span> — 19.90 €</span></li><li data-id="p3"><strong>Écran</strong><span> — 189.00 €</span></li>
2 produits disponibles
```

`renderProducts` peut être rappelée à chaque changement des données : `replaceChildren`
remplace l’ancien affichage par le nouveau. La décomposition `...` transforme le tableau
d’éléments en arguments séparés. Chaque `li` porte l’`id` du produit dans `data-id` : la
leçon suivante s’en servira pour savoir sur quel produit l’utilisateur a cliqué.

## `textContent` contre `innerHTML` : la faille XSS

`textContent` lit ou remplace le **texte** d’un élément. `innerHTML` lit ou remplace son
**contenu HTML** : la chaîne fournie est **analysée comme du HTML**, et les balises qu’elle
contient deviennent de vrais éléments.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Commentaires</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h2>Avec innerHTML</h2>
    <p id="unsafe"></p>
    <h2>Avec textContent</h2>
    <p id="safe"></p>
  </body>
</html>
```

```js
// Imagine que ce texte a été saisi par un visiteur dans un formulaire de commentaire.
const comment = 'Super article <img src="x" onerror="alert(\'Code exécuté !\')">';

document.querySelector('#unsafe').innerHTML = comment;
document.querySelector('#safe').textContent = comment;

console.log(document.querySelector('#unsafe').children.length);
console.log(document.querySelector('#safe').children.length);
console.log(document.querySelector('#safe').innerHTML);
```

Console :

```text
1
0
Super article &lt;img src="x" onerror="alert('Code exécuté !')"&gt;
```

Et surtout, **une boîte de dialogue « Code exécuté ! » s’ouvre**. Avec `innerHTML`, le texte du
visiteur a créé une vraie image ; son chargement échoue, ce qui déclenche l’attribut `onerror`,
qui exécute du JavaScript **écrit par le visiteur**. Avec `textContent`, la même chaîne
s’affiche telle quelle, caractères `<` et `>` compris : elle devient un simple nœud texte. Quand
on relit `innerHTML`, le navigateur représente ces caractères par `&lt;` et `&gt;`, preuve qu’ils
ne sont pas du HTML.

C’est une **injection de code** côté client, appelée **XSS** (*Cross-Site Scripting*). Ici, ce
n’est qu’une alerte ; un vrai attaquant lirait les données de la page, agirait au nom de la
victime ou la redirigerait vers une fausse page. Si le commentaire est enregistré sur le
serveur, **chaque visiteur** qui l’affiche exécute ce code.

Note qu’une balise `script` insérée par `innerHTML` n’est pas exécutée, mais cela ne protège
de rien : les attributs d’événement comme `onerror` suffisent.

:::warning[La règle]
Toute donnée qui ne vient pas de ton propre code — saisie d’un utilisateur, réponse d’une API,
paramètre d’adresse, contenu d’une base — s’insère avec `textContent` (ou `append` d’une chaîne,
ou un attribut via une propriété). Réserve `innerHTML` à du HTML **entièrement écrit par toi**,
sans aucune donnée interpolée. Dans le doute, crée les éléments avec `createElement`.
:::

`innerHTML` a un autre défaut : `liste.innerHTML += '…'` reconstruit **tout** le contenu de la
liste à partir de texte. Les anciens éléments sont détruits et remplacés par des copies : les
écouteurs d’événements qui y étaient attachés (leçon suivante) sont perdus, ainsi que la
saisie en cours dans un champ.

## Pièges courants

1. **Travailler sur `null`** : `querySelector` n’a rien trouvé. Vérifie le sélecteur (`#` pour
   un `id`, `.` pour une classe) et le moment d’exécution.
2. **Utiliser `map` sur une `NodeList`** : `TypeError: … .map is not a function`. Passe par
   `Array.from`.
3. **Oublier d’insérer l’élément créé** : `createElement` seul n’affiche rien.
4. **Prendre `dataset` pour des nombres ou des booléens** : ce sont des chaînes.
5. **Construire du HTML avec des gabarits et `innerHTML`** :
   `` list.innerHTML = `<li>${user.name}</li>` `` est une faille XSS dès que `name` vient de
   l’extérieur.
6. **Modifier le style au lieu des classes** : le code mélange alors logique et apparence, et
   le CSS ne peut plus être changé sans toucher au JavaScript.

## Exercices

### Exercice 1 — La messagerie

Crée une page avec un titre, un paragraphe `#unread-count` et une liste vide `#messages`.
Affiche les messages ci-dessous : chaque `li` porte `data-id`, la classe `unread` si le message
n’est pas lu, l’auteur en gras suivi de « : » puis le texte. Affiche ensuite le nombre de
messages non lus. N’utilise pas `innerHTML`.

```js
const messages = [
  { id: 'm1', author: 'Inès', text: 'On se voit demain ?', read: false },
  { id: 'm2', author: 'Hugo', text: 'Merci pour le lien <3', read: true },
  { id: 'm3', author: 'Léa', text: 'Le cours commence à 9 h.', read: false },
];
```

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Messagerie</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Messages</h1>
    <p id="unread-count"></p>
    <ul id="messages"></ul>
  </body>
</html>
```

```js
const messages = [
  { id: 'm1', author: 'Inès', text: 'On se voit demain ?', read: false },
  { id: 'm2', author: 'Hugo', text: 'Merci pour le lien <3', read: true },
  { id: 'm3', author: 'Léa', text: 'Le cours commence à 9 h.', read: false },
];

function createMessageItem(message) {
  const item = document.createElement('li');
  item.dataset.id = message.id;
  item.classList.toggle('unread', !message.read);

  const author = document.createElement('strong');
  author.textContent = `${message.author} : `;

  const text = document.createElement('span');
  text.textContent = message.text;

  item.append(author, text);
  return item;
}

const list = document.querySelector('#messages');
list.replaceChildren(...messages.map(createMessageItem));

const unread = messages.filter((message) => !message.read).length;
document.querySelector('#unread-count').textContent = `${unread} message(s) non lu(s)`;

console.log(list.querySelectorAll('.unread').length);
console.log(list.children[1].textContent);
```

Console :

```text
2
Hugo : Merci pour le lien <3
```

Le message de Hugo contient `<3` : avec `textContent`, il s’affiche toujours tel quel. Avec
`innerHTML`, ce texte précis passerait par chance (une balise ne peut pas commencer par un
chiffre, vérifié dans Chromium), mais un message comme `<b>bravo</b>` ou
`<img src=x onerror=…>` serait interprété comme du HTML. Le compteur est
calculé à partir des **données** (`filter`), pas en comptant les éléments affichés : les données
sont la source de vérité, le DOM n’en est que la représentation.
:::

### Exercice 2 — Repérer la faille

Ce code, proposé par une IA, affiche un commentaire. Explique les deux problèmes qu’il pose et
réécris-le de façon sûre.

```js
function renderComment(comment) {
  const list = document.querySelector('#comments');
  list.innerHTML += `<li><strong>${comment.author}</strong> ${comment.text}</li>`;
}
```

:::solution
1. **Faille XSS** : `author` et `text` viennent d’un utilisateur et sont interprétés comme du
   HTML. Un texte comme `<img src=x onerror="…">` exécute du code chez chaque lecteur.
2. **`innerHTML +=` reconstruit toute la liste** : les éléments existants sont remplacés par des
   copies. Un bouton « J’aime » déjà présent dans la liste perd son écouteur de clic, et le
   travail est refait pour chaque commentaire ajouté.

```js
function renderComment(comment) {
  const item = document.createElement('li');
  const author = document.createElement('strong');
  author.textContent = comment.author;
  item.append(author, ` ${comment.text}`);
  document.querySelector('#comments').append(item);
}
```

`append` reçoit une chaîne pour le texte du commentaire : elle est insérée comme un nœud texte,
jamais interprétée. Seul le nouvel élément est ajouté ; les autres ne sont pas touchés. En
testant les deux versions avec un bouton déjà présent dans la liste, on constate qu’après
`innerHTML +=`, `document.querySelector('#comments button')` n’est plus le même objet qu’avant.
:::

### Exercice 3 — Retirer les livres lus

Sur une page qui contient un compteur `#counter`, une liste de `li.book` (certains avec la
classe `done`) et un paragraphe `.empty` masqué par `hidden`, écris une fonction
`removeFinishedBooks()` qui supprime les livres lus, met à jour le compteur au format
`N livre(s)` et affiche le paragraphe `.empty` seulement s’il ne reste aucun livre. Teste avec
trois livres lus.

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Mes lectures</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Mes lectures</h1>
    <p id="counter">3 livres</p>
    <ul class="books">
      <li class="book done">Dune</li>
      <li class="book done">Fondation</li>
      <li class="book done">Hypérion</li>
    </ul>
    <p class="empty" hidden>Aucun livre en cours.</p>
  </body>
</html>
```

```js
function removeFinishedBooks() {
  document.querySelectorAll('.book.done').forEach((book) => book.remove());

  const remaining = document.querySelectorAll('.book').length;
  document.querySelector('#counter').textContent = `${remaining} livre(s)`;
  document.querySelector('.empty').hidden = remaining > 0;
}

removeFinishedBooks();
console.log(document.querySelector('#counter').textContent);
console.log(document.querySelector('.empty').hidden);
```

Console :

```text
0 livre(s)
false
```

`.book.done` (sans espace) cible les éléments qui ont **les deux** classes. On refait une
sélection après la suppression, car la première `NodeList` est une photographie. Affecter
directement le booléen `remaining > 0` à `hidden` évite un `if`/`else` : s’il reste des livres,
le message est masqué ; sinon, il est affiché.
:::

## Récapitulatif

- `querySelector` renvoie le premier élément ou `null` ; `querySelectorAll` une `NodeList`
  (photographie, sans `map` : utilise `Array.from`) ; `closest` remonte vers un ancêtre.
- Propriétés pour les attributs courants (`hidden`, `disabled`, `value`), `setAttribute` pour
  les autres, notamment ARIA.
- `classList.add/remove/toggle/contains` : l’état en JavaScript, l’apparence en CSS.
- `dataset` lit et écrit les attributs `data-*`, toujours sous forme de chaînes.
- `createElement` crée, `append`/`prepend`/`before`/`after` insèrent, `remove` supprime,
  `replaceChildren` remplace tout.
- Affiche des données avec une fonction « un objet → un élément » et `map`.
- **`textContent` pour toute donnée externe** ; `innerHTML` avec des données = faille XSS.
