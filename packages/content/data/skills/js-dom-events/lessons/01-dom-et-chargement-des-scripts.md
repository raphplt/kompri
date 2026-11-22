---
title: Le DOM et le chargement des scripts
summary: Comprendre ce qu’est le DOM, pourquoi un script peut ne pas trouver un élément, et charger son code avec defer ou type module.
durationMinutes: 45
sources:
  - title: MDN — DOM (Document Object Model)
    url: https://developer.mozilla.org/fr/docs/Web/API/Document_Object_Model
  - title: MDN — Les modules JavaScript
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Modules
  - title: WHATWG — HTML, l’élément script
    url: https://html.spec.whatwg.org/multipage/scripting.html#the-script-element
---

## Du HTML à une page qu’on peut modifier

Jusqu’ici, ton JavaScript affichait des résultats dans le terminal ou la console. Une page web,
elle, doit réagir : afficher un message après un clic, ajouter une ligne à une liste, signaler
une erreur dans un formulaire. Pour cela, le code doit pouvoir **lire et modifier la page
affichée**.

Quand le navigateur reçoit un fichier HTML, il ne garde pas ce texte tel quel. Il le lit (on
dit qu’il le **parse**) et construit en mémoire un **arbre d’objets** : chaque balise devient
un objet **élément**, chaque morceau de texte un **nœud texte**, et ces objets sont reliés par
des relations parent-enfant. Cet arbre s’appelle le **DOM** (*Document Object Model*). C’est lui
que le navigateur affiche, et c’est lui que JavaScript manipule.

Retiens bien la différence :

- le **code source HTML** est le texte envoyé par le serveur ; il ne change jamais ;
- le **DOM** est la structure vivante en mémoire ; JavaScript peut la modifier à tout moment,
  et l’affichage suit.

L’onglet **Éléments** (ou **Inspecteur**) des outils de développement montre le DOM, pas le
source. Pour voir le source d’origine, il faut « Afficher le code source de la page ».

## Explorer l’arbre

Prenons cette page. Pour l’instant, accepte la ligne `script type="module"` telle quelle :
elle sera expliquée plus bas.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Explorer le DOM</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <nav>
      <ul>
        <li>Accueil</li>
        <li>Cours</li>
        <li>Contact</li>
      </ul>
    </nav>
    <table>
      <tr><td>Une cellule</td></tr>
    </table>
  </body>
</html>
```

Et le fichier `main.js` :

```js
console.log(document.title);
console.log(document.documentElement.tagName);

const list = document.querySelector('ul');
console.log(list.children.length);
console.log(list.firstElementChild.textContent);
console.log(list.parentElement.tagName);
console.log(list.childNodes.length);

const table = document.querySelector('table');
console.log(table.firstElementChild.tagName);
```

Affichage dans la console du navigateur :

```text
Explorer le DOM
HTML
3
Accueil
NAV
7
TBODY
```

- `document` est l’objet qui représente toute la page ; c’est la racine de l’arbre.
  `document.documentElement` est l’élément `html`.
- `document.querySelector('ul')` renvoie le premier élément qui correspond au **sélecteur
  CSS** `ul`. Tu connais déjà les sélecteurs ; ils servent aussi en JavaScript.
- `children` contient les **éléments** enfants (les trois `li`), `parentElement` remonte au
  parent (`nav`). Les noms de balises sont renvoyés en majuscules par `tagName`.
- `childNodes` contient **tous** les nœuds enfants, y compris les nœuds texte formés par les
  retours à la ligne et l’indentation entre les `li` : 3 éléments + 4 nœuds texte = 7. C’est
  pourquoi on utilise presque toujours `children` et `firstElementChild`.
- Le source ne contient pas de `tbody`, et pourtant le premier enfant de `table` est un
  `TBODY` : le navigateur l’a ajouté en construisant le DOM, comme le prévoit la norme HTML.
  Preuve que le DOM n’est pas une copie du source.

## Où et comment charger un script

### Le problème : un script trop pressé

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Premier script</title>
    <script src="app.js"></script>
  </head>
  <body>
    <h1>Titre d’origine</h1>
  </body>
</html>
```

```js
const title = document.querySelector('h1');
console.log(title);
title.textContent = 'Titre modifié par JavaScript';
```

La console affiche :

```text
null
Uncaught TypeError: Cannot set properties of null (setting 'textContent')
```

Pourquoi ? Le navigateur construit le DOM **de haut en bas**. Quand il rencontre un `script`
classique, il **s’arrête**, télécharge et exécute le script, puis reprend. À ce moment-là, il
n’a pas encore lu le `body` : le `h1` n’existe pas encore dans le DOM. `querySelector` renvoie
`null`, et modifier une propriété de `null` provoque une `TypeError`.

Ce message est l’un des plus fréquents en développement front-end. Quand tu le vois, pose-toi
deux questions : mon sélecteur est-il juste ? L’élément existe-t-il **au moment** où le code
s’exécute ?

### Solution 1 : l’attribut `defer`

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Script différé</title>
    <script src="app.js" defer></script>
  </head>
  <body>
    <h1>Titre d’origine</h1>
  </body>
</html>
```

Avec le même `app.js`, le titre affiché devient « Titre modifié par JavaScript ». L’attribut
`defer` demande au navigateur de **télécharger le script en parallèle** sans interrompre la
lecture du HTML, puis de l’**exécuter une fois le document entièrement analysé**. Le DOM est
alors complet. Plusieurs scripts `defer` s’exécutent dans leur ordre d’apparition.

`defer` ne fonctionne qu’avec un script externe (attribut `src`) : sur un script écrit
directement entre les balises, il est ignoré.

### Solution 2 : `type="module"`, le choix recommandé

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Script module</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Titre d’origine</h1>
    <p id="greeting"></p>
  </body>
</html>
```

`format.js` :

```js
export function formatGreeting(name) {
  return `Bonjour ${name}, la page est prête.`;
}
```

`main.js` :

```js
import { formatGreeting } from './format.js';

const message = formatGreeting('Ada');
document.querySelector('#greeting').textContent = message;

console.log(document.readyState);
console.log(typeof window.message);
console.log(this);
```

Le paragraphe affiche « Bonjour Ada, la page est prête. » et la console :

```text
interactive
undefined
undefined
```

Un script **module** :

- est **différé automatiquement**, comme avec `defer` (même s’il est écrit en ligne) : le DOM
  est prêt quand il s’exécute. `document.readyState` vaut `'interactive'` : le document est
  analysé, les images ne sont peut-être pas encore chargées ;
- peut utiliser `import` et `export` pour découper le code en fichiers, comme dans Node.js. Le
  chemin d’import doit être relatif et complet (`'./format.js'`, avec l’extension) ;
- a **sa propre portée** : la constante `message` n’est pas visible depuis `window`, contrairement
  à une variable déclarée avec `var` au premier niveau d’un script classique. Moins de
  collisions de noms entre fichiers ;
- s’exécute en **mode strict** : certaines erreurs silencieuses deviennent des exceptions, et
  `this` au premier niveau vaut `undefined` ;
- n’est exécuté **qu’une fois**, même s’il est importé par plusieurs fichiers.

C’est la méthode que nous utiliserons dans toute la suite.

:::warning[Les modules ne se chargent pas depuis `file://`]
Si tu ouvres `index.html` en double-cliquant dessus, l’adresse commence par `file://` et le
navigateur refuse de charger `main.js` : la console affiche une erreur qui mentionne la
politique **CORS** (« Cross origin requests are only supported for protocol schemes… » dans
Chrome). Les modules doivent être servis en HTTP. Utilise le petit serveur ci-dessous, ou
l’extension de serveur local de ton éditeur.
:::

### Un serveur local en quelques lignes

Enregistre ce fichier `serve.js` **dans le dossier de ton projet**, à côté de `index.html`. Il
utilise des notions (modules Node, `async`, `await`) que tu étudieras plus tard ; pour
l’instant, contente-toi de l’utiliser.

```js
// serve.js — petit serveur de fichiers statiques pour le développement local
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT ?? 8000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    const path = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = normalize(join(root, decodeURIComponent(path)));
    if (!file.startsWith(root + sep)) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Accès refusé');
      return;
    }
    const body = await readFile(file);
    const type = types[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Fichier introuvable');
  }
});

server.listen(port, () => {
  console.log(`Serveur prêt : http://localhost:${port}/`);
});
```

Puis, dans un terminal ouvert dans ce dossier :

```bash
node serve.js
```

```text
Serveur prêt : http://localhost:8000/
```

Ouvre `http://localhost:8000/` dans ton navigateur. Le serveur sert les fichiers du dossier
courant et refuse ceux qui sont en dehors. Arrête-le avec `Ctrl+C`. Après une modification
d’un fichier, recharge simplement la page.

### Et les autres solutions ?

- **Placer le script juste avant `</body>`** fonctionne aussi : quand il s’exécute, tout ce qui
  le précède est dans le DOM. C’est une technique ancienne ; elle retarde le début du
  téléchargement du script, alors que `defer` et `module` le lancent dès la lecture du `head`.
- **L’événement `DOMContentLoaded`** (`document.addEventListener('DOMContentLoaded', …)`)
  permet d’attendre la fin de l’analyse depuis un script classique. Avec `defer` ou un module,
  il est inutile.
- **L’attribut `async`** télécharge en parallèle mais exécute **dès que possible**, sans
  attendre le DOM et sans garantie d’ordre. Il convient à des scripts indépendants de la page
  (mesure d’audience, par exemple), pas à ton code d’interface.

| Chargement              | Bloque l’analyse ? | Exécution                          | Ordre garanti |
| ----------------------- | ------------------ | ---------------------------------- | ------------- |
| `script` classique      | oui                | immédiate                          | oui           |
| `script defer`          | non                | après l’analyse du document        | oui           |
| `script type="module"`  | non                | après l’analyse du document        | oui           |
| `script async`          | non                | dès que téléchargé                 | non           |

## Pièges courants

1. **`null` au lieu de l’élément.** Le script s’exécute trop tôt, ou le sélecteur est faux
   (`querySelector('greeting')` cherche une balise `greeting` ; pour un `id`, il faut `#`).
2. **Ouvrir la page en `file://`** avec un module : rien ne se passe, l’erreur est dans la
   console. Garde toujours la console ouverte pendant le développement.
3. **Oublier l’extension dans un import** : `import { x } from './format'` échoue dans le
   navigateur, qui ne devine pas les extensions.
4. **Confondre source et DOM** : l’inspecteur montre l’état actuel, modifié par ton script, pas
   le fichier HTML.
5. **Compter sur `childNodes`** quand on veut les éléments : les espaces entre les balises
   sont des nœuds texte.

## Exercices

### Exercice 1 — Prédire l’ordre d’exécution

Sans exécuter, indique dans quel ordre les quatre messages apparaissent dans la console, puis
vérifie avec le serveur local (`deferred.js` contient seulement
`console.log('B : script defer');`).

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Ordre d’exécution</title>
    <script type="module">
      console.log('A : module en ligne');
    </script>
    <script src="deferred.js" defer></script>
    <script>
      console.log('C : script classique dans head');
    </script>
  </head>
  <body>
    <h1>Ordre d’exécution</h1>
    <script>
      console.log('D : script classique en fin de body');
    </script>
  </body>
</html>
```

:::solution
```text
C : script classique dans head
D : script classique en fin de body
A : module en ligne
B : script defer
```

Les scripts classiques s’exécutent au moment où l’analyseur les rencontre : C, puis D. Le
module (même écrit en ligne) et le script `defer` attendent la fin de l’analyse, puis
s’exécutent **dans leur ordre d’apparition** dans le document : A avant B. Le piège est de
croire que A s’exécute en premier parce qu’il est écrit en premier, ou qu’un script en ligne
ne peut pas être différé : c’est vrai pour `defer`, mais pas pour `type="module"`.
:::

### Exercice 2 — Compter les rubriques

Crée une page avec un menu de navigation de trois liens et un paragraphe vide d’`id` `count`.
Dans un module `main.js`, compte les liens du menu et écris dans le paragraphe
« Ce menu contient 3 rubriques. ». Place une fonction `pluralize(count, singular, plural)`
dans un second module `text.js` et importe-la.

:::solution
`index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Rubriques</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <nav aria-label="Rubriques">
      <ul>
        <li><a href="#cours">Cours</a></li>
        <li><a href="#defis">Défis</a></li>
        <li><a href="#aide">Aide</a></li>
      </ul>
    </nav>
    <p id="count"></p>
  </body>
</html>
```

`text.js` :

```js
export function pluralize(count, singular, plural) {
  return `${count} ${count > 1 ? plural : singular}`;
}
```

`main.js` :

```js
import { pluralize } from './text.js';

const links = document.querySelectorAll('nav a');
const output = document.querySelector('#count');
output.textContent = `Ce menu contient ${pluralize(links.length, 'rubrique', 'rubriques')}.`;
console.log(output.textContent);
```

Console :

```text
Ce menu contient 3 rubriques.
```

`querySelectorAll('nav a')` renvoie **tous** les liens contenus dans `nav` (le sélecteur
descendant fonctionne comme en CSS) ; sa propriété `length` donne leur nombre. Le module étant
différé, le menu et le paragraphe existent déjà. N’oublie pas `./` et `.js` dans l’import, et
lance la page avec `node serve.js`.
:::

### Exercice 3 — Réparer sans `defer`

Une collègue ne veut pas modifier le `head` d’une page dont le script classique `app.js`
(celui de l’exemple « Premier script ») plante avec `Cannot set properties of null`. Propose
deux corrections **qui ne touchent qu’à `app.js`**, et explique laquelle tu préfères.

:::solution
Première possibilité, attendre la fin de l’analyse :

```js
document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('h1');
  title.textContent = 'Titre modifié par JavaScript';
});
```

La fonction n’est appelée qu’une fois le document analysé : le `h1` existe.

Seconde possibilité, se protéger de `null` :

```js
const title = document.querySelector('h1');
if (title) {
  title.textContent = 'Titre modifié par JavaScript';
}
```

Le script ne plante plus… mais ne fait plus rien non plus, puisque le titre n’existe pas
encore. Cette seconde version **masque** le problème au lieu de le résoudre : elle n’est utile
que pour un élément réellement facultatif. La première est la bonne correction si l’on ne
peut pas toucher au HTML ; si on le peut, `defer` ou `type="module"` reste plus simple.
:::

## Récapitulatif

- Le DOM est l’arbre d’objets que le navigateur construit à partir du HTML ; JavaScript le lit
  et le modifie, l’affichage suit.
- `document` est la racine ; `querySelector` prend un sélecteur CSS et renvoie le premier
  élément trouvé, ou `null`.
- `children` ne contient que des éléments ; `childNodes` contient aussi les nœuds texte.
- Un script classique dans le `head` s’exécute avant que le `body` existe : d’où
  `Cannot set properties of null`.
- `defer` et `type="module"` exécutent le script après l’analyse, dans l’ordre ; le module
  ajoute `import`/`export`, sa propre portée et le mode strict.
- Les modules exigent un serveur HTTP : `node serve.js`, puis `http://localhost:8000/`.
