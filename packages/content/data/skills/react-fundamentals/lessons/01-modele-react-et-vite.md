---
title: Le modèle de React et un premier projet avec Vite
summary: Comprendre pourquoi React décrit l’interface à partir de l’état, créer un projet avec Vite, savoir à quoi sert chaque fichier et passer du développement à la production.
durationMinutes: 55
sources:
  - title: React — Votre premier composant
    url: https://fr.react.dev/learn/your-first-component
  - title: React — Penser en React
    url: https://fr.react.dev/learn/thinking-in-react
  - title: React — createRoot
    url: https://fr.react.dev/reference/react-dom/client/createRoot
  - title: Vite — Getting Started
    url: https://vite.dev/guide/
---

## Le problème : garder la page synchronisée avec les données

Dans la compétence « DOM et événements », tu as construit des pages interactives avec
`querySelector`, `textContent` et `addEventListener`. Reprenons le compteur de mentions
« J’aime », avec une règle de plus : à partir de trois mentions, un message « Populaire ! »
apparaît.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Compteur</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <button id="like" type="button">J’aime</button>
    <p id="likes">0 mention(s) J’aime</p>
    <p id="popular" hidden>Populaire !</p>
  </body>
</html>
```

```js
const button = document.querySelector('#like');
const output = document.querySelector('#likes');
const popular = document.querySelector('#popular');
let likes = 0;

button.addEventListener('click', () => {
  likes += 1;
  output.textContent = `${likes} mention(s) J’aime`;
  popular.hidden = likes < 3;
});
```

Après trois clics, la page affiche « 3 mention(s) J’aime » puis « Populaire ! ». Le code
fonctionne, mais regarde ce qu’il exige : à chaque événement, **tu** dois retrouver chaque
élément qui dépend de `likes` et le modifier à la main. Ce style s’appelle **impératif** : tu
donnes au navigateur la liste des opérations à effectuer, dans l’ordre.

Avec trois éléments, c’est gérable. Avec une vraie application — un panier dont le total, le
badge de l’en-tête, le bouton « Commander » et le message de livraison gratuite dépendent
tous du contenu —, chaque nouvel écouteur doit penser à **toutes** les zones concernées. Un
oubli, et l’interface affiche deux informations contradictoires.

Dans l’exercice du panier de la compétence précédente, tu as adopté une autre approche :
garder un **état** (le tableau `cart`), puis tout reconstruire avec une fonction `render`.
C’était plus sûr, mais `replaceChildren` détruisait et recréait les boutons à chaque clic : il
fallait redonner le focus à la main. React reprend cette bonne idée, **état → rendu**, et
règle ce défaut.

## L’idée de React : l’interface est une fonction de l’état

Voici le même compteur écrit avec React. Ne cherche pas encore à tout comprendre : `useState`
sera expliqué en détail dans la leçon 4.

```jsx
import { useState } from 'react';

function App() {
  const [likes, setLikes] = useState(0);

  return (
    <main>
      <button type="button" onClick={() => setLikes(likes + 1)}>
        J’aime
      </button>
      <p>{likes} mention(s) J’aime</p>
      {likes >= 3 && <p>Populaire !</p>}
    </main>
  );
}

export default App;
```

Après trois activations du bouton (clic ou touche Entrée), le DOM produit est :

```html
<main><button type="button">J’aime</button><p>3 mention(s) J’aime</p><p>Populaire !</p></main>
```

Observe la différence de démarche :

- La fonction `App` ne dit **jamais** « change le texte de tel paragraphe » ni « affiche tel
  message ». Elle **décrit** ce que l’écran doit montrer pour une valeur donnée de `likes` :
  un bouton, un paragraphe avec le nombre, et le message seulement si `likes >= 3`.
- Quand on clique, `setLikes` enregistre la nouvelle valeur. React appelle alors **de
  nouveau** la fonction `App`, obtient une nouvelle description, la compare à la précédente
  et applique au DOM **uniquement les différences** : ici, changer un texte et ajouter un
  paragraphe.
- Le bouton n’est pas recréé. Vérifié dans Chromium : l’élément `button` présent avant les
  clics est le même objet après, et il garde le focus clavier. Le problème rencontré avec
  `replaceChildren` disparaît.

On résume souvent ce modèle par une formule : **l’interface est une fonction de l’état**.
Pour un même état, la fonction produit toujours la même interface. Ton travail consiste à
décrire cette correspondance ; React se charge des opérations sur le DOM. Ce style s’appelle
**déclaratif**, comme le HTML ou le CSS : tu déclares le résultat voulu, pas les étapes pour
l’obtenir.

:::note[Vocabulaire]
- **React** est une bibliothèque JavaScript pour construire des interfaces à partir de
  **composants** : des fonctions qui renvoient une description d’interface.
- **React DOM** est le paquet qui affiche ces composants dans le DOM d’un navigateur.
- **Rendu** (*render*) : l’appel de la fonction d’un composant pour obtenir sa description.
  Un rendu ne modifie pas encore la page ; React applique ensuite les changements au DOM.
:::

## Pourquoi un outil de build : Vite

La syntaxe `<main>…</main>` écrite au milieu de JavaScript s’appelle **JSX**. Ce n’est pas du
JavaScript standard : un navigateur qui reçoit ce fichier tel quel signale une erreur de
syntaxe. Il faut donc un outil qui **transforme** le JSX en JavaScript ordinaire avant de
l’envoyer au navigateur.

**Vite** joue ce rôle. Il fournit deux choses :

1. un **serveur de développement** qui transforme tes fichiers à la volée, et recharge
   instantanément le composant modifié quand tu enregistres, sans perdre l’état de la page ;
2. une commande de **build** qui produit des fichiers optimisés (regroupés, minifiés) à
   déposer sur un hébergeur.

La documentation officielle de React propose Vite parmi les outils pour démarrer une
application React sans framework. C’est le choix de ce parcours.

## Créer le projet

Il te faut Node.js 24 et `npm`, installé avec lui. Vérifie dans un terminal :

```bash
node --version
npm --version
```

Place-toi dans le dossier où tu ranges tes projets, puis lance :

```bash
npm create vite@latest mon-app -- --template react --no-interactive
cd mon-app
npm install
npm run dev
```

Ligne par ligne :

- `npm create vite@latest` télécharge et exécute la dernière version de l’outil de création
  de projets Vite. `mon-app` est le nom du dossier créé.
- Le `--` seul sépare les options de `npm` de celles transmises à l’outil Vite.
- `--template react` choisit le modèle **React en JavaScript** (`react-ts` serait la variante
  TypeScript). `--no-interactive` crée le projet d’un coup, sans poser de questions ; sans
  cette option, dans un terminal interactif, l’outil peut te demander de confirmer des choix.
- `npm install` lit `package.json` et télécharge les dépendances (React, Vite…) dans le dossier
  `node_modules`. C’est indispensable une fois après la création, et après chaque ajout de
  dépendance.
- `npm run dev` lance le script `dev` défini dans `package.json`, c’est-à-dire le serveur de
  développement.

Le terminal affiche alors (les numéros de version et la durée varient) :

```text
  VITE v8.3.8  ready in 145 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Ouvre `http://localhost:5173/` dans ton navigateur : la page de démonstration de Vite et React
s’affiche, avec un bouton « Count is 0 » qui s’incrémente à chaque clic. Le serveur tourne tant
que le terminal reste ouvert ; `Ctrl+C` l’arrête.

## Ce que contient le projet

Voici l’arborescence obtenue après `npm install` (sans le contenu de `node_modules`) :

```text
mon-app/
├── .gitignore
├── .oxlintrc.json
├── README.md
├── index.html
├── node_modules/
├── package-lock.json
├── package.json
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.css
│   ├── App.jsx
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── index.css
│   └── main.jsx
└── vite.config.js
```

### `index.html` : la seule page

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>mon-app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

La page ne contient qu’un `div` vide, `#root`, et un script chargé en module. Tout le contenu
visible sera fabriqué par React à l’intérieur de ce `div`. Pense à passer `lang="en"` en
`lang="fr"` et à changer le `title` : ce fichier reste du HTML ordinaire.

### `src/main.jsx` : le point d’entrée

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `createRoot(élément)` crée une **racine** React qui prend en charge ce nœud du DOM.
- `.render(…)` y affiche l’arbre de composants. On ne l’appelle qu’une fois au démarrage :
  ensuite, ce sont les changements d’état qui déclenchent les nouveaux rendus.
- `<App />` est le composant principal, importé depuis `App.jsx`.
- `<StrictMode>` active des vérifications supplémentaires **en développement seulement** ;
  la leçon 3 montre ce qu’il détecte.
- `import './index.css'` : Vite permet d’importer une feuille de style depuis JavaScript ; elle
  est injectée dans la page.

Le modèle n’utilise pas de point-virgule en fin de ligne. Les exemples de ce cours en
mettent, comme dans le reste du parcours ; les deux styles fonctionnent.

### `package.json` : les scripts et les dépendances

```json
{
  "name": "mon-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.1",
    "react-dom": "^19.3.1"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "oxlint": "^1.90.0",
    "vite": "^8.3.6"
  }
}
```

| Script            | Rôle                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `npm run dev`     | serveur de développement, avec rechargement à chaud                      |
| `npm run build`   | fabrique la version de production dans le dossier `dist/`               |
| `npm run preview` | sert localement le contenu de `dist/` pour le vérifier avant mise en ligne |
| `npm run lint`    | analyse le code avec Oxlint (un *linter*) pour repérer des erreurs       |

Les `dependencies` sont nécessaires à l’application elle-même ; les `devDependencies` ne
servent qu’à la développer et à la construire. Les paquets `@types/…` décrivent les types de
React pour l’éditeur de code : tu n’as rien à en faire.

### Les autres fichiers

- `src/App.jsx` : le composant principal, celui que tu vas remplacer.
- `src/App.css`, `src/index.css` : les styles de la page de démonstration.
- `src/assets/` : images importées depuis le code ; Vite les traite au build.
- `public/` : fichiers copiés tels quels, servis à la racine du site (`/favicon.svg`).
- `vite.config.js` : la configuration de Vite, qui active `@vitejs/plugin-react` (transformation
  du JSX et rechargement à chaud des composants).
- `.oxlintrc.json` : la configuration du linter. Elle active la règle `rules-of-hooks`, que la
  leçon 4 explique.
- `.gitignore` : exclut notamment `node_modules` et `dist` du dépôt Git. Ces dossiers se
  régénèrent avec `npm install` et `npm run build`.
- `package-lock.json` : les versions exactes installées. Il se versionne avec le projet.

## Ton premier composant

Remplace tout le contenu de `src/App.jsx` par :

```jsx
function App() {
  const firstName = 'Inès';

  return (
    <main>
      <h1>Bonjour, {firstName} !</h1>
      <p>Ton premier composant React.</p>
    </main>
  );
}

export default App;
```

Enregistre : la page se met à jour sans rechargement complet. Le DOM contient :

```html
<main><h1>Bonjour, Inès !</h1><p>Ton premier composant React.</p></main>
```

- Un **composant** est une fonction JavaScript dont le nom **commence par une majuscule** et
  qui renvoie du JSX.
- Les accolades `{firstName}` insèrent la **valeur** d’une expression JavaScript dans le
  balisage. La leçon 2 détaille tout ce qu’on peut y mettre.
- Les parenthèses autour du JSX sur plusieurs lignes évitent un piège de JavaScript : un
  `return` suivi d’un retour à la ligne renverrait `undefined`.
- `export default App` permet à `main.jsx` d’écrire `import App from './App.jsx'`.

Les styles de démonstration de `src/index.css` s’appliquent toujours ; tu peux vider ce
fichier si tu préfères repartir d’une page neutre. `src/App.css` et les images de
`src/assets/` ne sont plus importés : tu peux les supprimer.

### Le rechargement à chaud

Remets le compteur « J’aime » de la section précédente dans `App.jsx`, clique deux fois, puis
modifie le texte du paragraphe et enregistre. La page affiche le nouveau texte **et** le
compteur reste à 2 : Vite a remplacé le composant sans recharger la page (vérifié dans
Chromium). Ce confort, appelé *Hot Module Replacement*, n’existe qu’avec `npm run dev`.

## Ce que devient le JSX

Pour comprendre React, il est utile de savoir ce que Vite fait de ton JSX. Pour le composant
« Bonjour », la version de production contient, une fois simplifiée :

```js
import { jsx, jsxs } from 'react/jsx-runtime';

function App() {
  const firstName = 'Inès';

  return jsxs('main', {
    children: [
      jsxs('h1', { children: ['Bonjour, ', firstName, ' !'] }),
      jsx('p', { children: 'Ton premier composant React.' }),
    ],
  });
}
```

Chaque balise devient un **appel de fonction**. Ces fonctions ne touchent pas au DOM : elles
renvoient de simples objets, appelés **éléments React**, qui décrivent ce qu’il faut afficher.
On peut le vérifier :

```jsx
const element = <h1 className="title">Bonjour</h1>;
console.log(element.type, element.props);
```

La console affiche la chaîne `h1`, puis un objet dont les propriétés sont
`className: 'title'` et `children: 'Bonjour'`.

Trois conséquences importantes :

1. Un composant **renvoie une description**, il ne modifie pas la page. C’est React qui, après
   le rendu, met le DOM en conformité.
2. Les attributs deviennent des **propriétés d’objet** : c’est pourquoi on écrit `className`
   et non `class` (leçon 2).
3. Le contenu entre les balises devient la propriété `children` : tu la retrouveras pour
   composer des composants (leçon 3).

## Du développement à la production

Le serveur de développement n’est pas fait pour être mis en ligne : il transforme les fichiers
à la demande et contient la version de développement de React, plus lente et pleine de
vérifications. Pour publier, on construit :

```bash
npm run build
```

```text
> mon-app@0.0.0 build
> vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 16 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-nqMpL4T3.css    1.78 kB │ gzip:  0.81 kB
dist/assets/index-iqpKXFmz.js   219.70 kB │ gzip: 68.68 kB

✓ built in 160ms
```

Le dossier `dist/` contient un `index.html` et des fichiers dont le nom inclut une empreinte
(`index-iqpKXFmz.js`) : elle change quand le contenu change, ce qui permet aux navigateurs de
garder les fichiers en cache sans risque de servir une ancienne version. Ces fichiers
statiques peuvent être déposés sur n’importe quel hébergeur de fichiers.

Pour vérifier le résultat avant de le publier :

```bash
npm run preview
```

```text
  ➜  Local:   http://localhost:4173/
  ➜  Network: use --host to expose
```

En production, React ne fait plus les vérifications de développement : les avertissements que
tu verras dans les prochaines leçons (clés manquantes, attributs mal nommés…) n’apparaissent
**qu’avec** `npm run dev`. Développe toujours avec la console ouverte.

## Pièges courants

1. **Oublier `npm install`.** Sans dépendances, `npm run dev` échoue ; sous Linux, le message
   est `sh: 1: vite: not found`.
2. **Lancer une commande hors du dossier du projet.** `npm run dev` lancé dans un dossier sans
   `package.json` répond `npm error enoent Could not read package.json`. Fais d’abord
   `cd mon-app`.
3. **Ouvrir `index.html` ou `dist/index.html` en double-cliquant.** La page reste blanche : en
   `file://`, le navigateur refuse de charger les scripts en module (la console de Chromium
   indique un blocage par la politique CORS). Passe toujours par `npm run dev` ou
   `npm run preview`.
4. **Oublier `export default`.** La page reste blanche et la console indique
   `The requested module '/src/App.jsx' does not provide an export named 'default'` (après
   une modification, le chemin peut être suivi de `?t=` et d’un nombre ajouté par Vite).
5. **Modifier `dist/` à la main.** Le dossier est écrasé à chaque build : on modifie `src/`.
6. **Écrire un composant avec une minuscule** (`function app()`). React le prendrait pour une
   balise HTML inconnue ; la leçon 3 montre l’avertissement obtenu.

## Exercices

### Exercice 1 — Ta carte de présentation

Crée un projet `carte` avec Vite. Remplace `App.jsx` par un composant qui affiche, à partir de
trois constantes déclarées dans la fonction (`fullName`, `job`, `city`), un titre de niveau 1
avec le nom, puis un paragraphe « Développeuse web à Lyon » construit à partir de `job` et
`city`. Change ensuite le `title` et la langue de `index.html`.

:::solution
```jsx
function App() {
  const fullName = 'Inès Martin';
  const job = 'Développeuse web';
  const city = 'Lyon';

  return (
    <main>
      <h1>{fullName}</h1>
      <p>
        {job} à {city}
      </p>
    </main>
  );
}

export default App;
```

DOM obtenu : `<main><h1>Inès Martin</h1><p>Développeuse web à Lyon</p></main>`.

Dans `index.html`, remplace `lang="en"` par `lang="fr"` et `<title>mon-app</title>` par un
titre parlant, par exemple `<title>Carte de Inès Martin</title>`. Ce fichier n’est pas géré par
React : on le modifie comme du HTML classique. Le paragraphe mélange du texte fixe et deux
expressions entre accolades. On aurait aussi pu insérer un gabarit de chaîne :

```jsx
<p>{`${job} à ${city}`}</p>
```
:::

### Exercice 2 — Lire un projet Vite

Réponds sans exécuter, puis vérifie dans ton projet.

1. Dans quel fichier se trouve l’élément dans lequel React affiche l’application ?
2. Que se passe-t-il si tu renommes `id="root"` en `id="app"` dans `index.html` sans rien
   changer d’autre ?
3. Quelle commande produit les fichiers à déposer chez un hébergeur, et où les trouve-t-on ?
4. Pourquoi `node_modules` n’est-il pas versionné, et comment un collègue le récupère-t-il ?

:::solution
1. Dans `index.html` : `<div id="root"></div>`. `main.jsx` le récupère avec
   `document.getElementById('root')`.
2. `getElementById('root')` renvoie `null` et `createRoot(null)` lève une erreur : la page
   reste blanche et la console de Chromium affiche
   `Target container is not a DOM element.` Il faut changer les deux fichiers ensemble.
3. `npm run build` ; les fichiers sont dans `dist/`. On les vérifie avec `npm run preview`.
4. `node_modules` est volumineux et entièrement reconstructible à partir de `package.json` et
   `package-lock.json` : il figure dans `.gitignore`. Le collègue clone le dépôt puis lance
   `npm install`.
:::

### Exercice 3 — Du JSX aux éléments

Voici ce que produit la transformation d’un composant. Écris le JSX d’origine, puis le DOM
affiché.

```js
function App() {
  return jsxs('section', {
    children: [
      jsx('h2', { children: 'Horaires' }),
      jsxs('p', { children: ['Ouvert ', 6, ' jours sur 7'] }),
    ],
  });
}
```

:::solution
```jsx
function App() {
  return (
    <section>
      <h2>Horaires</h2>
      <p>Ouvert {6} jours sur 7</p>
    </section>
  );
}

export default App;
```

DOM affiché : `<section><h2>Horaires</h2><p>Ouvert 6 jours sur 7</p></section>`.

Chaque appel `jsx`/`jsxs` correspond à une balise : le premier argument est le type
(`'section'`), le second les propriétés, dont `children` pour le contenu. Le nombre `6`
apparaît comme une valeur séparée dans `children` : dans le JSX, c’était une expression entre
accolades. Écrire directement « Ouvert 6 jours sur 7 » donnerait le même affichage, avec un
seul texte dans `children`.
:::

## Récapitulatif

- Avec le DOM seul, chaque événement doit mettre à jour **à la main** toutes les zones qui
  dépendent des données : style impératif, source d’incohérences.
- Avec React, un composant **décrit** l’interface pour un état donné ; quand l’état change,
  React relance le rendu, compare et n’applique que les différences au DOM, sans recréer les
  éléments inchangés.
- Le JSX n’est pas du JavaScript standard : Vite le transforme en appels `jsx(…)` qui
  produisent des objets, les éléments React.
- Création : `npm create vite@latest mon-app -- --template react --no-interactive`, puis
  `npm install` et `npm run dev`.
- `index.html` contient `#root` ; `src/main.jsx` y affiche `<App />` avec `createRoot` et
  `StrictMode` ; `src/App.jsx` est le composant principal.
- `npm run build` produit `dist/`, `npm run preview` le sert pour vérification ; les
  vérifications et avertissements de React n’existent qu’en développement.
