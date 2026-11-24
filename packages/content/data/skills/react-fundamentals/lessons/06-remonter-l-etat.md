---
title: Remonter l’état et garder une source de vérité unique
summary: Partager une information entre composants en la plaçant dans leur parent commun, faire descendre les données et remonter les événements, et calculer les données dérivées au lieu de les dupliquer.
durationMinutes: 80
sources:
  - title: React — Partager l’état entre des composants
    url: https://fr.react.dev/learn/sharing-state-between-components
  - title: React — Choisir la structure de l’état
    url: https://fr.react.dev/learn/choosing-the-state-structure
  - title: React — Penser en React
    url: https://fr.react.dev/learn/thinking-in-react
---

## Le problème : deux composants qui doivent se coordonner

L’état est **privé** à chaque composant (leçon 4). C’est très bien tant qu’une information ne
concerne qu’un composant. Mais que faire quand deux composants doivent la partager ?

Prenons une FAQ en accordéon. Chaque panneau gère son ouverture avec son propre état :

```jsx
import { useState } from 'react';

function Panel({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section>
      <h2>
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
          {title}
        </button>
      </h2>
      {isOpen && <p>{children}</p>}
    </section>
  );
}

function App() {
  return (
    <main>
      <Panel title="Livraison">Livraison en 48 h en France métropolitaine.</Panel>
      <Panel title="Retours">Retours gratuits sous 30 jours.</Panel>
    </main>
  );
}

export default App;
```

Un clic sur « Livraison » puis sur « Retours » ouvre les **deux** panneaux. Nouvelle exigence :
un seul panneau ouvert à la fois. Impossible en l’état : le panneau « Retours » ne sait rien
de l’état du panneau « Livraison », et un composant ne peut pas lire ni modifier l’état d’un
frère.

## Remonter l’état en trois étapes

La solution s’appelle **remonter l’état** (*lifting state up*) : on retire l’information des
enfants et on la place dans leur **parent commun le plus proche**, qui la transmet par les
props.

1. **Retirer l’état de l’enfant.** `Panel` n’a plus de `useState`.
2. **Le recevoir par les props.** `Panel` reçoit `isOpen` (la donnée) et `onToggle` (une
   fonction à appeler quand l’utilisateur clique).
3. **Le déclarer dans le parent.** `App` mémorise **quel** panneau est ouvert.

```jsx
import { useState } from 'react';

function Panel({ title, isOpen, onToggle, children }) {
  return (
    <section>
      <h2>
        <button type="button" aria-expanded={isOpen} onClick={onToggle}>
          {title}
        </button>
      </h2>
      {isOpen && <p>{children}</p>}
    </section>
  );
}

function App() {
  const [openPanel, setOpenPanel] = useState(null); // 'delivery', 'returns' ou null

  function toggle(panel) {
    setOpenPanel(openPanel === panel ? null : panel);
  }

  return (
    <main>
      <Panel
        title="Livraison"
        isOpen={openPanel === 'delivery'}
        onToggle={() => toggle('delivery')}
      >
        Livraison en 48 h en France métropolitaine.
      </Panel>
      <Panel
        title="Retours"
        isOpen={openPanel === 'returns'}
        onToggle={() => toggle('returns')}
      >
        Retours gratuits sous 30 jours.
      </Panel>
    </main>
  );
}

export default App;
```

Après un clic sur « Livraison » puis sur « Retours », le DOM devient :

```html
<main><section><h2><button type="button" aria-expanded="false">Livraison</button></h2></section><section><h2><button type="button" aria-expanded="true">Retours</button></h2><p>Retours gratuits sous 30 jours.</p></section></main>
```

Un nouveau clic sur « Retours » referme tout. Ce qui a changé :

- La règle « un seul ouvert » est **impossible à violer** : l’état est une seule valeur,
  `openPanel`, qui ne peut désigner qu’un panneau. On n’a pas eu à écrire de code pour
  fermer l’autre panneau.
- `Panel` ne décide plus de rien : il affiche ce qu’on lui dit (`isOpen`) et **signale** le clic
  (`onToggle`). On dit que c’est un composant **contrôlé** par son parent ; la première version
  était **non contrôlée** (elle gérait son propre état).
- `aria-expanded={isOpen}` : React écrit `"true"` ou `"false"` dans l’attribut, ce qui permet à
  un lecteur d’écran d’annoncer l’état du panneau.

## Les données descendent, les événements remontent

Ce schéma est au cœur de toute application React :

```text
                 App  (état : openPanel)
                /                     \
   props : isOpen, onToggle      props : isOpen, onToggle
              /                         \
        Panel Livraison              Panel Retours

  Descente : App calcule isOpen et le passe aux panneaux.
  Remontée : le bouton appelle onToggle ; App modifie son état ;
             React refait le rendu d’App, qui transmet les nouvelles props.
```

- Les **données** circulent toujours du parent vers l’enfant, par les props.
- Un enfant ne modifie jamais l’état de son parent directement : il appelle une **fonction
  reçue en prop**, et c’est le parent qui décide quoi faire.
- Conventions de nommage : les props de type fonction commencent par `on`
  (`onToggle`, `onAdd`, `onFilterChange`) ; les fonctions qui les implémentent dans le parent
  commencent par `handle` (`handleAdd`), ou portent un verbe d’action (`toggle`).

## Où placer chaque état ?

Pour chaque information qui change, pose trois questions :

1. Quels composants **affichent** ou **utilisent** cette information ?
2. Quel est leur **parent commun le plus proche** ?
3. L’état se place dans ce parent (ou plus haut si c’est plus logique).

Si un seul composant l’utilise, l’état reste dans ce composant : ne remonte pas tout dans
`App` par principe. Un état placé au plus près de son usage est plus facile à comprendre et
à réutiliser.

## Une source de vérité unique

Chaque information doit vivre à **un seul endroit**. Si elle est stockée deux fois, les deux
copies finiront par diverger : il suffit d’oublier de mettre l’une d’elles à jour dans un
seul gestionnaire.

### Les données dérivées se calculent, elles ne se stockent pas

Voici une liste de courses qui stocke le nombre d’articles restants dans un état séparé :

```jsx
import { useState } from 'react';

const initialItems = [
  { id: 'a1', name: 'Pain', bought: false },
  { id: 'a2', name: 'Lait', bought: true },
  { id: 'a3', name: 'Pommes', bought: false },
];

function App() {
  const [items, setItems] = useState(initialItems);
  // Mauvaise idée : une copie d’une information déjà présente dans items
  const [remainingCount, setRemainingCount] = useState(2);

  function handleToggle(id) {
    const item = items.find((i) => i.id === id);
    setItems(items.map((i) => (i.id === id ? { ...i, bought: !i.bought } : i)));
    setRemainingCount(item.bought ? remainingCount + 1 : remainingCount - 1);
  }

  function handleRemove(id) {
    setItems(items.filter((i) => i.id !== id));
    // oubli : remainingCount n’est pas mis à jour
  }

  return (
    <main>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={item.bought} onChange={() => handleToggle(item.id)} />{' '}
              {item.name}
            </label>{' '}
            <button type="button" onClick={() => handleRemove(item.id)}>
              Retirer
            </button>
          </li>
        ))}
      </ul>
      <p>{remainingCount} article(s) restant(s)</p>
    </main>
  );
}

export default App;
```

Au départ : « 2 article(s) restant(s) ». On coche « Pain » : « 1 article(s) restant(s) », juste.
On retire « Pommes » : la liste ne contient plus que « Pain » et « Lait », tous deux achetés,
mais la page affiche toujours « 1 article(s) restant(s) ». Les deux sources de vérité ont
divergé.

La correction ne consiste pas à ajouter le `setRemainingCount` oublié, mais à **supprimer
cet état** et à calculer la valeur pendant le rendu :

```jsx
const remainingCount = items.filter((item) => !item.bought).length;
```

Désormais, `remainingCount` ne peut pas être faux : il est recalculé à chaque rendu à partir
de la seule source, `items`. Le code est aussi plus court, car aucun gestionnaire n’a à
s’en occuper.

**La règle** : si une valeur peut être calculée à partir des props ou d’un autre état, ce
n’est pas un état. Totaux, nombres d’éléments, listes filtrées ou triées, booléens comme
« le formulaire est vide » ou « tout est acheté », texte mis en forme : on les calcule. Pour
des listes de quelques centaines d’éléments, ce calcul à chaque rendu est négligeable.

### Ne pas copier une prop dans l’état

Variante fréquente de la duplication : initialiser un état avec une prop.

```jsx
import { useState } from 'react';

function PriceTag({ price }) {
  const [displayedPrice] = useState(price); // copie figée de la prop
  return <p>Prix : {displayedPrice.toFixed(2)} €</p>;
}

function App() {
  const [price, setPrice] = useState(10);
  return (
    <main>
      <button type="button" onClick={() => setPrice(price * 0.9)}>
        Appliquer −10 %
      </button>
      <p>Prix dans App : {price.toFixed(2)} €</p>
      <PriceTag price={price} />
    </main>
  );
}

export default App;
```

Après un clic : « Prix dans App : 9.00 € » mais « Prix : 10.00 € ». La valeur initiale de
`useState` n’est lue qu’au **premier** rendu (leçon 4) ; les changements suivants de la prop
sont ignorés. Correction : utiliser directement la prop, `<p>Prix : {price.toFixed(2)} €</p>`.
Un état initialisé par une prop n’a de sens que si la prop est explicitement une valeur de
départ, que l’enfant fera ensuite évoluer seul ; on la nomme alors `initialPrice` pour que ce
soit clair.

### Stocker un identifiant plutôt qu’une copie d’objet

Troisième forme de duplication : garder dans l’état une **copie** d’un élément d’une liste,
par exemple l’élément sélectionné.

```jsx
import { useState } from 'react';

const initialTasks = [
  { id: 't1', title: 'Lire la leçon', done: false },
  { id: 't2', title: 'Faire les exercices', done: false },
];

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(initialTasks[0]); // copie !

  function toggle(id) {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  return (
    <main>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} ({task.done ? 'terminée' : 'à faire'}){' '}
            <button type="button" onClick={() => toggle(task.id)}>
              Basculer
            </button>{' '}
            <button type="button" onClick={() => setSelectedTask(task)}>
              Détails
            </button>
          </li>
        ))}
      </ul>
      <p>
        Sélection : {selectedTask.title}, {selectedTask.done ? 'terminée' : 'à faire'}
      </p>
    </main>
  );
}

export default App;
```

On bascule « Lire la leçon » : la liste affiche « Lire la leçon (terminée) », mais le détail
indique « Sélection : Lire la leçon, à faire ». `toggle` a créé un **nouvel** objet pour cette
tâche (c’est voulu, immutabilité oblige) ; `selectedTask` pointe toujours vers l’ancien.

Correction : mémoriser l’**identifiant**, et retrouver l’objet pendant le rendu.

```jsx
const [selectedId, setSelectedId] = useState('t1');
const selectedTask = tasks.find((task) => task.id === selectedId);
```

Le bouton devient `onClick={() => setSelectedId(task.id)}`. Le détail affiche alors
« Sélection : Lire la leçon, terminée » : il lit toujours la version actuelle de la tâche.

## Une application complète : la liste de courses

Assemblons tout ce que tu as appris dans une petite application en plusieurs fichiers.

```text
src/
├── App.jsx
├── components/
│   ├── AddItemForm.jsx
│   ├── FilterBar.jsx
│   └── ShoppingList.jsx
└── main.jsx
```

Analyse des états, avec les trois questions :

| Information                  | Utilisée par                         | Où la placer ?           |
| ---------------------------- | ------------------------------------ | ------------------------ |
| la liste des articles        | `ShoppingList`, le résumé, `AddItemForm` (via `onAdd`) | `App`      |
| le filtre choisi             | `FilterBar` et la liste affichée     | `App`                    |
| le texte en cours de saisie  | `AddItemForm` seulement              | `AddItemForm`            |
| articles visibles, restants, « formulaire vide » | —                | **calculés**, pas stockés |

```jsx
// src/App.jsx
import { useState } from 'react';
import AddItemForm from './components/AddItemForm.jsx';
import FilterBar from './components/FilterBar.jsx';
import ShoppingList from './components/ShoppingList.jsx';

const initialItems = [
  { id: 'a1', name: 'Pain', bought: false },
  { id: 'a2', name: 'Lait', bought: true },
  { id: 'a3', name: 'Pommes', bought: false },
];

function App() {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('all'); // 'all', 'todo' ou 'bought'

  // Données dérivées : calculées à chaque rendu, jamais stockées
  const visibleItems = items.filter((item) => {
    if (filter === 'todo') return !item.bought;
    if (filter === 'bought') return item.bought;
    return true;
  });
  const remainingCount = items.filter((item) => !item.bought).length;

  function handleAdd(name) {
    const newItem = { id: crypto.randomUUID(), name, bought: false };
    setItems([...items, newItem]);
  }

  function handleToggle(id) {
    setItems(items.map((item) => (item.id === id ? { ...item, bought: !item.bought } : item)));
  }

  function handleRemove(id) {
    setItems(items.filter((item) => item.id !== id));
  }

  return (
    <main>
      <h1>Liste de courses</h1>
      <AddItemForm onAdd={handleAdd} />
      <FilterBar filter={filter} onFilterChange={setFilter} />
      <ShoppingList items={visibleItems} onToggle={handleToggle} onRemove={handleRemove} />
      <p>
        {remainingCount === 0
          ? 'Tout est acheté !'
          : `${remainingCount} article(s) restant(s) sur ${items.length}`}
      </p>
    </main>
  );
}

export default App;
```

```jsx
// src/components/AddItemForm.jsx
import { useState } from 'react';

function AddItemForm({ onAdd }) {
  const [name, setName] = useState('');
  const trimmedName = name.trim();

  function handleSubmit(event) {
    event.preventDefault(); // pas de rechargement de la page
    onAdd(trimmedName);
    setName('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="item-name">Article</label>{' '}
      <input id="item-name" value={name} onChange={(event) => setName(event.target.value)} />{' '}
      <button type="submit" disabled={trimmedName === ''}>
        Ajouter
      </button>
    </form>
  );
}

export default AddItemForm;
```

```jsx
// src/components/FilterBar.jsx
const filters = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'À acheter' },
  { value: 'bought', label: 'Achetés' },
];

function FilterBar({ filter, onFilterChange }) {
  return (
    <p>
      {filters.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={filter === option.value}
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </p>
  );
}

export default FilterBar;
```

```jsx
// src/components/ShoppingList.jsx
function ShoppingItem({ item, onToggle, onRemove }) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={item.bought} onChange={() => onToggle(item.id)} />{' '}
        {item.bought ? <s>{item.name}</s> : item.name}
      </label>{' '}
      <button type="button" onClick={() => onRemove(item.id)}>
        Retirer
      </button>
    </li>
  );
}

function ShoppingList({ items, onToggle, onRemove }) {
  if (items.length === 0) {
    return <p>Aucun article à afficher.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <ShoppingItem key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </ul>
  );
}

export default ShoppingList;
```

Parcours vérifié dans Chromium (on ne montre que la liste et le résumé) :

| Action                                      | Liste affichée                   | Résumé                             |
| ------------------------------------------- | -------------------------------- | ---------------------------------- |
| chargement                                  | Pain, Lait, Pommes               | 2 article(s) restant(s) sur 3      |
| saisir «   Beurre   », Entrée               | Pain, Lait, Pommes, Beurre       | 3 article(s) restant(s) sur 4      |
| filtre « À acheter »                        | Pain, Pommes, Beurre             | 3 article(s) restant(s) sur 4      |
| cocher « Pain » (filtre toujours actif)     | Pommes, Beurre                   | 2 article(s) restant(s) sur 4      |
| filtre « Achetés »                          | Pain, Lait                       | 2 article(s) restant(s) sur 4      |
| filtre « Tout », retirer « Pommes »         | Pain, Lait, Beurre               | 1 article(s) restant(s) sur 3      |
| cocher « Beurre »                           | Pain, Lait, Beurre               | Tout est acheté !                  |

Le bouton « Ajouter » est désactivé tant que le champ est vide ou ne contient que des espaces ;
Entrée ne soumet alors rien. Après un ajout, le champ se vide.

Les points à savoir expliquer :

- **Une seule source de vérité** : `items` vit dans `App`. La liste visible, le nombre
  d’articles restants et le message « Tout est acheté ! » en sont **dérivés**. Cocher un
  article sous le filtre « À acheter » le fait disparaître de la liste **et** met à jour le
  résumé, sans une ligne de code dédiée.
- **Descente** : `App` passe `visibleItems` à `ShoppingList`, `filter` à `FilterBar`.
  **Remontée** : `onAdd`, `onToggle`, `onRemove`, `onFilterChange`. `ShoppingItem` ne connaît
  ni `items` ni `setItems` : il appelle `onToggle(item.id)` et laisse `App` décider.
- `onFilterChange={setFilter}` : une fonction de mise à jour est une fonction comme une autre,
  on peut la passer directement quand aucune logique supplémentaire n’est nécessaire.
- **État local justifié** : le texte en cours de saisie ne concerne que `AddItemForm`. `App`
  ne reçoit que le résultat final, par `onAdd(trimmedName)`.
- **Clés** : l’identifiant est créé **une fois**, dans `handleAdd`, avec
  `crypto.randomUUID()`. Rappel de la leçon 5 : cette fonction n’existe que sur `localhost`
  ou en HTTPS ; ouverte en HTTP via l’adresse réseau de `npm run dev -- --host`, l’application
  échoue à l’ajout (`crypto.randomUUID is not a function`). Les filtres utilisent leur
  `value`, unique et stable.
- **Accessibilité** : vrai `form` avec `onSubmit` (Entrée fonctionne), `label` relié au champ,
  case à cocher dans son `label`, `aria-pressed` pour signaler le filtre actif.
- `event.preventDefault()` empêche le rechargement de la page, comme dans la compétence « DOM
  et événements ».

## Pièges courants

1. **Deux états pour une même information** (un booléen `isEmpty` à côté de `items`, un
   `total` à côté des lignes) : ils divergent au premier oubli. Calcule.
2. **Copier une prop dans un état** : l’enfant ignore ensuite les changements du parent.
3. **Garder une copie d’objet sélectionné** : elle devient périmée dès que la liste est mise à
   jour. Garde l’identifiant.
4. **Modifier les données du parent depuis l’enfant** (`items.push(…)` dans un enfant qui a
   reçu `items`) au lieu d’appeler une fonction reçue en prop.
5. **Appeler le callback au lieu de le passer** : `onClick={onRemove(item.id)}` s’exécute
   pendant le rendu ; écris `onClick={() => onRemove(item.id)}`.
6. **Tout remonter dans `App` par réflexe** : un état qui ne sert qu’à un composant reste
   dans ce composant.

## Exercices

### Exercice 1 — Le convertisseur de températures

Affiche deux champs, « Degrés Celsius » et « Degrés Fahrenheit », toujours cohérents : saisir
dans l’un met l’autre à jour. Utilise un composant `TemperatureInput` pour chaque champ et
**un seul état** dans `App`. Si la saisie n’est pas un nombre, l’autre champ est vide. Ajoute
le message « L’eau bout. » à partir de 100 °C. Formules : °F = °C × 9/5 + 32 et
°C = (°F − 32) × 5/9 ; arrondis l’affichage au dixième.

:::solution
```jsx
import { useState } from 'react';

function toCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9;
}

function toFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

function convert(text, convertValue) {
  const value = Number(text);
  if (text.trim() === '' || Number.isNaN(value)) {
    return '';
  }
  return String(Math.round(convertValue(value) * 10) / 10);
}

function TemperatureInput({ id, label, value, onValueChange }) {
  return (
    <p>
      <label htmlFor={id}>{label}</label>{' '}
      <input id={id} value={value} onChange={(event) => onValueChange(event.target.value)} />
    </p>
  );
}

function App() {
  const [temperature, setTemperature] = useState({ value: '20', scale: 'c' });

  const celsius =
    temperature.scale === 'c' ? temperature.value : convert(temperature.value, toCelsius);
  const fahrenheit =
    temperature.scale === 'f' ? temperature.value : convert(temperature.value, toFahrenheit);
  const isBoiling = celsius.trim() !== '' && Number(celsius) >= 100;

  return (
    <main>
      <TemperatureInput
        id="celsius"
        label="Degrés Celsius"
        value={celsius}
        onValueChange={(value) => setTemperature({ value, scale: 'c' })}
      />
      <TemperatureInput
        id="fahrenheit"
        label="Degrés Fahrenheit"
        value={fahrenheit}
        onValueChange={(value) => setTemperature({ value, scale: 'f' })}
      />
      {isBoiling && <p>L’eau bout.</p>}
    </main>
  );
}

export default App;
```

Vérification : au départ, 20 et 68. En tapant 212 dans le champ Fahrenheit, le champ Celsius
affiche 100 et « L’eau bout. » apparaît. En tapant « abc » dans le champ Celsius, le champ
Fahrenheit se vide et le message disparaît. En tapant 37 en Celsius : 98.6.

L’état mémorise **ce que l’utilisateur a tapé et dans quelle unité** : c’est la seule
information qui ne peut pas être calculée. La valeur de l’autre champ, et le message, sont
dérivés. Garder deux états `celsius` et `fahrenheit` obligerait à les synchroniser à chaque
frappe, avec des arrondis qui feraient « dériver » les valeurs. Les deux `TemperatureInput`
sont contrôlés par `App`. `isBoiling` est un vrai booléen, donc sûr à gauche de `&&`.
:::

### Exercice 2 — Le sondage qui se contredit

Après quelques votes, un clic sur « Réinitialiser » remet les compteurs à zéro, mais le texte
« En tête : … » reste affiché. Explique la cause profonde, puis corrige en supprimant tout
état redondant.

```jsx
import { useState } from 'react';

const initialOptions = [
  { id: 'pizza', label: 'Pizza', votes: 0 },
  { id: 'sushi', label: 'Sushis', votes: 0 },
  { id: 'salad', label: 'Salade', votes: 0 },
];

function App() {
  const [options, setOptions] = useState(initialOptions);
  const [totalVotes, setTotalVotes] = useState(0);
  const [leader, setLeader] = useState(null);

  function vote(id) {
    const next = options.map((option) =>
      option.id === id ? { ...option, votes: option.votes + 1 } : option,
    );
    setOptions(next);
    setTotalVotes(totalVotes + 1);
    setLeader(next.toSorted((a, b) => b.votes - a.votes)[0]);
  }

  function reset() {
    setOptions(initialOptions);
    setTotalVotes(0);
  }

  return (
    <main>
      <ul>
        {options.map((option) => (
          <li key={option.id}>
            {option.label} : {option.votes}{' '}
            <button type="button" onClick={() => vote(option.id)}>
              Voter
            </button>
          </li>
        ))}
      </ul>
      <p>{totalVotes} vote(s) au total</p>
      {leader && <p>En tête : {leader.label}</p>}
      <button type="button" onClick={reset}>
        Réinitialiser
      </button>
    </main>
  );
}

export default App;
```

:::solution
Cause : `totalVotes` et `leader` sont des **copies** d’informations déjà contenues dans
`options`. Chaque gestionnaire doit penser à les mettre à jour ; `reset` a oublié `leader`.
`leader` est en plus une copie d’objet, qui deviendrait périmée si l’on modifiait l’option
autrement.

```jsx
import { useState } from 'react';

const initialOptions = [
  { id: 'pizza', label: 'Pizza', votes: 0 },
  { id: 'sushi', label: 'Sushis', votes: 0 },
  { id: 'salad', label: 'Salade', votes: 0 },
];

function App() {
  const [options, setOptions] = useState(initialOptions);

  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  const leader = totalVotes === 0 ? null : options.toSorted((a, b) => b.votes - a.votes)[0];

  function vote(id) {
    setOptions(
      options.map((option) => (option.id === id ? { ...option, votes: option.votes + 1 } : option)),
    );
  }

  return (
    <main>
      <ul>
        {options.map((option) => (
          <li key={option.id}>
            {option.label} : {option.votes}{' '}
            <button type="button" onClick={() => vote(option.id)}>
              Voter
            </button>
          </li>
        ))}
      </ul>
      <p>{totalVotes} vote(s) au total</p>
      {leader && <p>En tête : {leader.label}</p>}
      <button type="button" onClick={() => setOptions(initialOptions)}>
        Réinitialiser
      </button>
    </main>
  );
}

export default App;
```

Vérification : deux votes pour « Sushis » et un pour « Pizza » affichent « 3 vote(s) au total »
et « En tête : Sushis » ; « Réinitialiser » affiche « 0 vote(s) au total » et plus aucune ligne
« En tête ». Il ne reste qu’un état, et aucun gestionnaire n’a à maintenir les autres
valeurs. `{leader && …}` est sûr ici : `leader` est un objet ou `null`, jamais un nombre. En cas
d’égalité, `toSorted` étant stable, l’option la plus haute dans la liste l’emporte ; à toi de
décider si c’est la règle voulue.
:::

### Exercice 3 — Placer les états

Une boutique se compose de cet arbre :

```text
App
├── Header
│   ├── SearchInput     (champ de recherche)
│   └── CartBadge       (nombre d’articles du panier)
├── ProductList         (produits filtrés par la recherche)
│   └── ProductCard     (bouton « Ajouter au panier », bouton « Voir les détails »
│                        qui déplie la description de cette carte)
└── CartPanel           (lignes du panier, total, bouton « Fermer »)
```

Pour chaque information, indique où placer l’état, ou s’il faut la calculer : le texte de
recherche ; les lignes du panier ; le nombre d’articles du panier ; le total du panier ;
l’ouverture de la description d’une carte ; l’ouverture du panneau du panier (ouvert par un
clic sur `CartBadge`, fermé par le bouton de `CartPanel`).

:::solution
| Information                       | Utilisée par                                 | Décision                               |
| --------------------------------- | -------------------------------------------- | -------------------------------------- |
| texte de recherche                | `SearchInput` (saisie), `ProductList` (filtre) | état dans `App`, parent commun       |
| lignes du panier                  | `ProductCard` (ajout), `CartBadge`, `CartPanel` | état dans `App`                     |
| nombre d’articles                 | `CartBadge`                                  | **calculé** à partir des lignes        |
| total du panier                   | `CartPanel`                                  | **calculé** à partir des lignes        |
| description dépliée d’une carte   | cette `ProductCard` seulement                | état **local** de `ProductCard`        |
| ouverture du panneau du panier    | `CartBadge` (ouvre), `CartPanel` (ferme)     | état dans `App`                        |

`App` transmet `query` et `onQueryChange` à `Header` puis à `SearchInput`, `query` à
`ProductList` (ou directement la liste filtrée, calculée dans `App`), `onAdd` jusqu’à
`ProductCard`, les lignes à `CartPanel`, le nombre calculé à `CartBadge`, `isCartOpen` à
`CartPanel` et `onOpenCart` / `onCloseCart` aux deux composants concernés. L’état des
descriptions reste dans chaque carte : aucun autre composant n’en a besoin, et chaque carte
a ainsi sa propre valeur. Attention dans ce cas aux clés de `ProductList` : avec
`key={index}`, filtrer la liste ferait passer une description ouverte d’un produit à un
autre (leçon 5) ; la clé doit être l’identifiant du produit.

Le passage de props à travers `Header`, qui ne s’en sert pas lui-même, est normal à cette
échelle. La compétence suivante présente le contexte, qui évite de traverser de nombreux
niveaux.
:::

## Récapitulatif

- Quand plusieurs composants ont besoin d’une même information, on **remonte l’état** dans
  leur parent commun le plus proche, qui la transmet par les props.
- Les **données descendent** (props), les **événements remontent** (fonctions reçues en
  props, nommées `onQuelqueChose`). Un enfant ne modifie jamais l’état de son parent
  directement.
- Un composant piloté par ses props est **contrôlé** ; un composant qui gère son propre état
  est **non contrôlé**.
- Chaque information a **une seule source de vérité**. Ce qui peut se calculer (totaux,
  nombres, listes filtrées, booléens) se calcule pendant le rendu au lieu d’être stocké.
- Ne copie pas une prop dans un état ; garde l’identifiant d’un élément sélectionné plutôt
  qu’une copie de l’objet.
- Un état qui ne concerne qu’un composant reste local : on ne remonte que ce qui est
  partagé.
