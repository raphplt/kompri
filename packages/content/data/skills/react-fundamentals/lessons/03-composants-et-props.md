---
title: Composants, props et composition
summary: Découper une interface en composants réutilisables, leur transmettre des données par les props, composer avec children, et écrire des composants purs que StrictMode aide à vérifier.
durationMinutes: 60
sources:
  - title: React — Importer et exporter des composants
    url: https://fr.react.dev/learn/importing-and-exporting-components
  - title: React — Passer des props à un composant
    url: https://fr.react.dev/learn/passing-props-to-a-component
  - title: React — Garder les composants purs
    url: https://fr.react.dev/learn/keeping-components-pure
  - title: React — StrictMode
    url: https://fr.react.dev/reference/react/StrictMode
---

## Pourquoi découper en composants ?

Une page réelle contient des dizaines de zones : un en-tête, une barre de navigation, des
cartes de produits, un panier, un pied de page. Tout écrire dans un seul `App` donnerait une
fonction de plusieurs centaines de lignes, où chaque carte serait copiée-collée.

Tu connais déjà la réponse à ce problème : **les fonctions**. Un composant React est une
fonction qui regroupe un morceau d’interface, porte un nom qui dit ce qu’il représente, et
peut être réutilisé avec des données différentes. Une application devient alors un **arbre
de composants** : `App` contient `Header`, une liste de `ProductCard` et `Footer` ; chacun
peut contenir d’autres composants.

## Définir et utiliser un composant

```jsx
function ProductCard() {
  return (
    <article className="product-card">
      <h2>Carnet</h2>
      <p>4.50 €</p>
    </article>
  );
}

function App() {
  return (
    <main>
      <h1>Papeterie</h1>
      <ProductCard />
      <ProductCard />
    </main>
  );
}

export default App;
```

`<ProductCard />` s’utilise comme une balise : React appelle la fonction `ProductCard` et
place son résultat à cet endroit. Le DOM final ne contient **aucune trace** du composant,
seulement ce qu’il renvoie : deux `article` identiques.

Deux règles :

1. **Le nom commence par une majuscule.** C’est ainsi que le JSX distingue un composant
   (`<ProductCard />`) d’une balise HTML (`<article>`). Avec une minuscule, React crée une
   balise inconnue :

   ```jsx
   function welcome() {
     return <p>Bienvenue !</p>;
   }

   function App() {
     return (
       <main>
         <welcome />
       </main>
     );
   }

   export default App;
   ```

   Le DOM contient `<main><welcome></welcome></main>`, rien ne s’affiche, et la console
   indique :

   ```text
   The tag <welcome> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.
   ```

2. **Un composant se déclare au premier niveau du module**, jamais à l’intérieur d’un autre
   composant. Une fonction déclarée dans `App` serait recréée à chaque rendu d’`App` ; React
   la considérerait comme un nouveau composant et effacerait son état à chaque fois (la
   leçon 4 le montre).

## Un fichier par composant

Dès qu’un composant dépasse quelques lignes, on le place dans son propre fichier. Une
convention répandue (et non une obligation) est un dossier `src/components/` et un fichier
nommé comme le composant :

```text
src/
├── App.jsx
├── components/
│   └── ProductCard.jsx
└── main.jsx
```

```jsx
// src/components/ProductCard.jsx
function ProductCard({ name, price, inStock }) {
  return (
    <article className="product-card">
      <h2>{name}</h2>
      <p>{price.toFixed(2)} €</p>
      <p>{inStock ? 'En stock' : 'Rupture de stock'}</p>
    </article>
  );
}

export default ProductCard;
```

```jsx
// src/App.jsx
import ProductCard from './components/ProductCard.jsx';

function App() {
  return (
    <main>
      <h1>Papeterie</h1>
      <ProductCard name="Carnet" price={4.5} inStock={true} />
      <ProductCard name="Stylo plume" price={18} inStock={false} />
      <ProductCard name="Gomme" price={0.8} inStock />
    </main>
  );
}

export default App;
```

Texte affiché :

```text
Papeterie
Carnet
4.50 €
En stock
Stylo plume
18.00 €
Rupture de stock
Gomme
0.80 €
En stock
```

- `export default ProductCard` rend le composant importable sous le nom de ton choix :
  `import ProductCard from …`. Un fichier peut aussi exporter plusieurs composants **nommés**
  (`export function Badge() {…}`), importés avec des accolades : `import { Badge } from …`.
- Le chemin est relatif au fichier qui importe et inclut l’extension `.jsx`, comme dans le
  modèle Vite.
- Un fichier qui contient du JSX doit porter l’extension `.jsx`. Avec `.js`, Vite refuse de
  le transformer : `[PARSE_ERROR] Unexpected JSX expression`, accompagné de l’indication
  `JSX syntax is disabled`.

## Les props : les paramètres d’un composant

Un composant identique partout n’a pas beaucoup d’intérêt. Les **props** (pour *properties*)
sont les données que le parent transmet à l’enfant, comme des arguments à une fonction.
Dans `<ProductCard name="Carnet" price={4.5} inStock={true} />` :

- React rassemble tous les attributs dans **un seul objet**,
  `{ name: 'Carnet', price: 4.5, inStock: true }`, et le passe comme **premier paramètre**
  à la fonction ;
- `function ProductCard({ name, price, inStock })` **déstructure** cet objet directement dans
  la liste des paramètres. On aurait pu écrire `function ProductCard(props)` puis
  `props.name`, `props.price` ; la déstructuration rend visibles, dès la première ligne, les
  props attendues ;
- une chaîne fixe s’écrit entre guillemets (`name="Carnet"`) ; **toute autre valeur** se
  passe entre accolades : nombre (`price={4.5}`), booléen, tableau, objet, fonction, JSX ;
- un attribut sans valeur, comme `inStock` pour la gomme, vaut `true`.

Une prop peut contenir n’importe quelle valeur JavaScript : `items={['a', 'b']}`,
`user={{ name: 'Inès' }}` (les doubles accolades, comme pour `style`), et même une fonction,
ce qui permettra à un enfant de prévenir son parent d’un événement (leçons 4 et 6).

### Les valeurs par défaut

Une prop non fournie vaut `undefined`. La syntaxe des paramètres par défaut, vue avec les
fonctions, s’applique aussi à la déstructuration :

```jsx
function Avatar({ src, name, size = 48 }) {
  return <img className="avatar" src={src} alt={name} width={size} height={size} />;
}

function App() {
  return (
    <p>
      <Avatar src="/avatars/ines.png" name="Inès" />
      <Avatar src="/avatars/sam.png" name="Sam" size={96} />
      <Avatar src="/avatars/lea.png" name="Léa" size={undefined} />
      <Avatar src="/avatars/noa.png" name="Noa" size={null} />
    </p>
  );
}

export default App;
```

DOM obtenu :

```html
<p><img class="avatar" alt="Inès" width="48" height="48" src="/avatars/ines.png"><img class="avatar" alt="Sam" width="96" height="96" src="/avatars/sam.png"><img class="avatar" alt="Léa" width="48" height="48" src="/avatars/lea.png"><img class="avatar" alt="Noa" src="/avatars/noa.png"></p>
```

La valeur par défaut s’applique quand la prop est absente **ou** vaut `undefined`, mais pas
quand elle vaut `null` : pour Noa, `size` vaut `null` et React n’écrit pas les attributs
`width` et `height`. C’est exactement le comportement des paramètres par défaut en
JavaScript.

## `children` : composer des composants

Ce que tu places **entre** les balises ouvrante et fermante d’un composant lui parvient dans
une prop spéciale, `children`. Cela permet d’écrire des composants « boîtes » qui encadrent un
contenu qu’ils ne connaissent pas à l’avance :

```jsx
function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </section>
  );
}

function App() {
  return (
    <main>
      <Card title="Horaires">
        <p>Du lundi au samedi, de 9 h à 19 h.</p>
      </Card>
      <Card title="Contact">
        <p>Téléphone : 01 23 45 67 89</p>
        <p>
          <a href="mailto:contact@example.com">contact@example.com</a>
        </p>
      </Card>
    </main>
  );
}

export default App;
```

DOM obtenu (mis en forme pour la lecture) :

```html
<main>
  <section class="card">
    <h2>Horaires</h2>
    <div class="card-body"><p>Du lundi au samedi, de 9 h à 19 h.</p></div>
  </section>
  <section class="card">
    <h2>Contact</h2>
    <div class="card-body">
      <p>Téléphone : 01 23 45 67 89</p>
      <p><a href="mailto:contact@example.com">contact@example.com</a></p>
    </div>
  </section>
</main>
```

`Card` gère la structure et le style communs ; le parent décide du contenu. C’est la
**composition** : on assemble de petits composants plutôt que d’écrire un gros composant
paramétré par des dizaines d’options. Mises en page, panneaux, boîtes de dialogue, onglets
reposent sur ce principe.

## Les props sont en lecture seule

Un composant ne doit **jamais modifier** ses props. Elles appartiennent au parent qui les a
fournies ; l’enfant les lit, comme une fonction pure lit ses arguments sans les altérer.

```jsx
function Badge({ label }) {
  return <span>{label}</span>;
}

function ProductTitle(props) {
  props.title = props.title.toUpperCase();
  return (
    <h2>
      {props.title} <Badge label="Nouveau" />
    </h2>
  );
}

function App() {
  return <ProductTitle title="Théière en fonte" />;
}

export default App;
```

En développement, la page devient blanche et la console affiche :

```text
Cannot assign to read only property 'title' of object '#<Object>'
```

En développement, React **gèle** l’objet des props (comme `Object.freeze`) précisément pour
révéler ce genre d’erreur. En production, ce gel n’existe pas : la même modification passe
sans bruit (vérifié avec `npm run build` puis `npm run preview`, où le titre s’affiche en
majuscules). C’est pire, car le bug reste caché. La correction consiste à **calculer une
nouvelle valeur** :

```jsx
function ProductTitle({ title }) {
  const displayTitle = title.toUpperCase();
  return <h2>{displayTitle}</h2>;
}
```

Les données circulent dans un seul sens, **du parent vers l’enfant**. Si un enfant doit
provoquer un changement, il ne modifie pas ses props : il prévient son parent, qui modifie
son propre état. C’est le sujet des leçons 4 et 6.

## Les composants doivent être purs

Dans la compétence « Fonctions et portée », tu as vu qu’une fonction **pure** renvoie
toujours le même résultat pour les mêmes arguments et ne modifie rien en dehors d’elle-même.
React attend la même chose d’un composant pendant son rendu : **mêmes props, même JSX**, et
aucune modification de variables ou d’objets qui existaient avant l’appel.

Pourquoi ? Parce que c’est React qui décide **quand** et **combien de fois** appeler ton
composant. Un composant impur donne des résultats qui dépendent de ce calendrier :

```jsx
let guest = 0;

function Cup() {
  // Mauvais : modifie une variable extérieure pendant le rendu
  guest = guest + 1;
  return <li>Tasse pour l’invité n° {guest}</li>;
}

function App() {
  return (
    <ul>
      <Cup />
      <Cup />
      <Cup />
    </ul>
  );
}

export default App;
```

Avec `npm run dev`, la page affiche :

```text
Tasse pour l’invité n° 2
Tasse pour l’invité n° 4
Tasse pour l’invité n° 6
```

Le résultat dépend du nombre de rendus, qui n’est pas sous ton contrôle. La version pure
reçoit le numéro en prop :

```jsx
function Cup({ guest }) {
  return <li>Tasse pour l’invité n° {guest}</li>;
}

function App() {
  return (
    <ul>
      <Cup guest={1} />
      <Cup guest={2} />
      <Cup guest={3} />
    </ul>
  );
}

export default App;
```

Elle affiche 1, 2, 3, quel que soit le nombre de rendus.

Ce qui est permis : modifier des variables **créées pendant ce rendu** (un tableau local
rempli avec `push` avant d’être affiché, par exemple). Ce qui est interdit pendant le rendu :
modifier une variable extérieure, une prop, un objet reçu, ou le DOM directement. Les
modifications ont leur place dans les **gestionnaires d’événements** (leçon 4), qui ne sont
pas exécutés pendant le rendu.

## StrictMode : le double rendu en développement

Pourquoi 2, 4, 6 et pas 1, 2, 3 ? Parce que `main.jsx` enveloppe l’application dans
`<StrictMode>`. En développement, ce mode **appelle deux fois** la fonction de chaque
composant à chaque rendu. Un composant pur produit deux fois le même résultat, donc rien ne
change à l’écran. Un composant impur se trahit : ici, chaque tasse a incrémenté `guest` deux
fois.

On le voit aussi avec un `console.log` :

```jsx
function Greeting({ name }) {
  console.log(`rendu de Greeting pour ${name}`);
  return <p>Bonjour, {name} !</p>;
}

function App() {
  return <Greeting name="Inès" />;
}

export default App;
```

```text
rendu de Greeting pour Inès
rendu de Greeting pour Inès
```

Résultats vérifiés dans Chromium :

| Situation                                   | Tasses affichées | Messages dans la console |
| ------------------------------------------- | ---------------- | ------------------------ |
| `npm run dev`, avec `StrictMode`            | 2, 4, 6          | 2                        |
| `npm run dev`, sans `StrictMode`            | 1, 2, 3          | 1                        |
| `npm run build` puis `npm run preview`      | 1, 2, 3          | 1                        |

Retiens trois choses :

- le double appel n’a lieu **qu’en développement** ; la version de production rend une fois ;
- il ne sert qu’à **révéler** les impuretés : ne retire pas `StrictMode` pour faire taire un
  message en double, corrige plutôt le composant ;
- même sans `StrictMode`, le composant impur reste faux : il suffirait qu’un parent se
  rende de nouveau pour que les numéros continuent à 4, 5, 6.

StrictMode effectue aussi d’autres vérifications, dont tu verras une dans la leçon suivante
(les fonctions de mise à jour de l’état).

## Pièges courants

1. **Un nom de composant en minuscule** : balise inconnue, rien ne s’affiche, avertissement
   en console.
2. **Oublier les accolades autour d’un nombre** : avec `price="4.5"`, `price` est une chaîne,
   et `price.toFixed(2)` provoque l’erreur `price.toFixed is not a function` et une page
   blanche.
3. **Oublier la déstructuration** : `function Title(text)` reçoit l’objet des props entier.
   `{text}` affiche alors un objet, d’où
   `Objects are not valid as a React child (found: object with keys {text})`. Écris
   `function Title({ text })`.
4. **Modifier une prop**, ou un tableau reçu en prop (`items.sort()`, `items.push()`) : erreur
   en développement pour une affectation directe, corruption silencieuse des données du
   parent pour un tableau (exercice 3).
5. **Déclarer un composant dans un autre** : son état est perdu à chaque rendu du parent.
6. **Un effet de bord pendant le rendu** (variable globale incrémentée, `document.title`
   modifié dans le corps du composant) : résultats imprévisibles. StrictMode aide à le
   repérer.

## Exercices

### Exercice 1 — Découper une page

Découpe ce composant en trois composants placés dans `src/components/` : `Header` (prop
`title`), `CourseCard` (props `title`, `hours`, `price`) et `Footer` (prop `owner`). `App`
doit les utiliser et produire exactement le même DOM.

```jsx
function App() {
  return (
    <>
      <header>
        <h1>Atelier céramique</h1>
      </header>
      <main>
        <article>
          <h2>Initiation</h2>
          <p>2 heures — 35 €</p>
        </article>
        <article>
          <h2>Tournage</h2>
          <p>3 heures — 50 €</p>
        </article>
      </main>
      <footer>
        <p>© Atelier céramique</p>
      </footer>
    </>
  );
}

export default App;
```

:::solution
```jsx
// src/components/Header.jsx
function Header({ title }) {
  return (
    <header>
      <h1>{title}</h1>
    </header>
  );
}

export default Header;
```

```jsx
// src/components/CourseCard.jsx
function CourseCard({ title, hours, price }) {
  return (
    <article>
      <h2>{title}</h2>
      <p>
        {hours} heures — {price} €
      </p>
    </article>
  );
}

export default CourseCard;
```

```jsx
// src/components/Footer.jsx
function Footer({ owner }) {
  return (
    <footer>
      <p>© {owner}</p>
    </footer>
  );
}

export default Footer;
```

```jsx
// src/App.jsx
import Header from './components/Header.jsx';
import CourseCard from './components/CourseCard.jsx';
import Footer from './components/Footer.jsx';

function App() {
  const name = 'Atelier céramique';

  return (
    <>
      <Header title={name} />
      <main>
        <CourseCard title="Initiation" hours={2} price={35} />
        <CourseCard title="Tournage" hours={3} price={50} />
      </main>
      <Footer owner={name} />
    </>
  );
}

export default App;
```

Le DOM produit est identique à l’original (vérifié en comparant les deux `innerHTML`) : les
composants ne laissent aucune trace dans le DOM. Le nom de l’atelier est déclaré une seule
fois et transmis à deux composants. `hours` et `price` sont passés comme nombres, entre
accolades ; on pourra ainsi calculer avec eux plus tard (un total, une réduction).
:::

### Exercice 2 — Un badge réutilisable

Écris un composant `Badge` qui affiche son contenu (`children`) dans un `span` dont la
classe est `badge badge-<tone>`, `tone` valant `'info'` par défaut. Utilise-le trois fois :
sans `tone`, avec `tone="warning"`, avec `tone="success"`. Prévois ensuite ce qu’affiche
`<Badge tone={null}>Test</Badge>`.

:::solution
```jsx
function Badge({ tone = 'info', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function App() {
  return (
    <p>
      <Badge>Nouveau</Badge> <Badge tone="warning">Stock faible</Badge>{' '}
      <Badge tone="success">Livré</Badge> <Badge tone={null}>Test</Badge>
    </p>
  );
}

export default App;
```

DOM obtenu :

```html
<p><span class="badge badge-info">Nouveau</span> <span class="badge badge-warning">Stock faible</span> <span class="badge badge-success">Livré</span> <span class="badge badge-null">Test</span></p>
```

Le contenu entre les balises arrive dans `children`. La valeur par défaut ne s’applique pas à
`null` : le gabarit de chaîne transforme `null` en texte et produit la classe `badge-null`.
Pour un appelant qui pourrait passer `null`, on écrirait `` `badge badge-${tone ?? 'info'}` ``
dans le corps du composant. Les `{' '}` conservent les espaces entre les badges quand une
ligne JSX est coupée.
:::

### Exercice 3 — Le classement qui modifie les données

Ce code affiche le meilleur joueur, puis la première personne inscrite (le premier élément
du tableau). Exécute-le : quel est le problème, quelle est sa cause, et comment le corriger ?

```jsx
const players = [
  { name: 'Inès', score: 12 },
  { name: 'Sam', score: 30 },
  { name: 'Léa', score: 21 },
];

function Ranking({ players }) {
  const sorted = players.sort((a, b) => b.score - a.score);
  return (
    <ol>
      <li>
        {sorted[0].name} ({sorted[0].score} points)
      </li>
    </ol>
  );
}

function FirstRegistered({ players }) {
  return <p>Première inscrite : {players[0].name}</p>;
}

function App() {
  return (
    <main>
      <Ranking players={players} />
      <FirstRegistered players={players} />
    </main>
  );
}

export default App;
```

:::solution
La page affiche « Sam (30 points) » puis « Première inscrite : Sam », alors que la première
inscrite est Inès.

`sort` **trie le tableau sur place** et renvoie ce même tableau. `Ranking` a donc modifié le
tableau `players` du module, partagé avec `FirstRegistered`, qui est rendu après lui. Le
composant est impur : il modifie une donnée qu’il a reçue. Aucune erreur n’est levée, car
React ne gèle que l’objet des props, pas les tableaux qu’il contient.

Correction : trier une **copie**.

```jsx
function Ranking({ players }) {
  const sorted = players.toSorted((a, b) => b.score - a.score);
  return (
    <ol>
      <li>
        {sorted[0].name} ({sorted[0].score} points)
      </li>
    </ol>
  );
}
```

Avec `toSorted`, la page affiche « Sam (30 points) » puis « Première inscrite : Inès ».
`[...players].sort(…)` conviendrait aussi. Ce bug est sournois : avec un autre ordre des
composants dans `App`, l’affichage pourrait sembler correct tout en corrompant les données.
:::

## Récapitulatif

- Un composant est une fonction au nom en **majuscule**, déclarée au premier niveau d’un
  module, qui renvoie du JSX. Un fichier `.jsx` par composant, exporté avec
  `export default`.
- Les **props** arrivent dans un seul objet, premier paramètre du composant ; on les
  déstructure : `function Card({ title, children })`. Chaîne entre guillemets, toute autre
  valeur entre accolades.
- Une valeur par défaut (`size = 48`) s’applique si la prop est absente ou `undefined`, pas
  si elle vaut `null`.
- `children` contient ce qui est placé entre les balises : c’est la base de la
  **composition**.
- Les props sont en **lecture seule** : en développement, les modifier lève une erreur ; on
  calcule une nouvelle valeur à la place. Les données descendent du parent vers l’enfant.
- Un composant doit être **pur** pendant le rendu. `StrictMode` appelle deux fois chaque
  composant **en développement** pour révéler les impuretés ; la production ne rend qu’une
  fois.
