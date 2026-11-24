---
title: Réagir aux événements et mémoriser avec useState
summary: Brancher des gestionnaires d’événements, donner une mémoire à un composant avec useState, comprendre le rendu par instantanés et les mises à jour regroupées, mettre à jour objets et tableaux sans mutation, et respecter les règles des hooks.
durationMinutes: 80
sources:
  - title: React — Réagir aux événements
    url: https://fr.react.dev/learn/responding-to-events
  - title: React — L’état, la mémoire d’un composant
    url: https://fr.react.dev/learn/state-a-components-memory
  - title: React — Cumuler les mises à jour d’état
    url: https://fr.react.dev/learn/queueing-a-series-of-state-updates
  - title: React — Les règles des Hooks
    url: https://fr.react.dev/reference/rules/rules-of-hooks
---

## Des composants qui réagissent

Jusqu’ici, tes composants affichaient des données fixes. Une interface doit réagir : un clic
ajoute un article, une saisie filtre une liste. Il faut pour cela deux mécanismes :

1. **écouter les événements** pour savoir ce que fait l’utilisateur ;
2. **mémoriser** une information d’un rendu à l’autre, puis demander à React de refaire le
   rendu quand elle change. C’est l’**état** (*state*).

## Réagir à un événement

En JSX, on n’appelle pas `addEventListener` : on passe une fonction dans un attribut
`onClick`, `onChange`, `onSubmit`… (en camelCase).

```jsx
function App() {
  function handleClick() {
    console.log('Merci pour ton soutien !');
  }

  return (
    <button type="button" onClick={handleClick}>
      J’aime
    </button>
  );
}

export default App;
```

Chaque clic affiche `Merci pour ton soutien !` dans la console.

- `handleClick` est déclarée **dans** le composant : c’est une fermeture qui a accès aux props
  et à l’état de ce rendu. Par convention, on nomme les gestionnaires `handle` + événement ou
  action : `handleClick`, `handleSubmit`, `handleDelete`.
- Pour un gestionnaire très court, une fonction fléchée en ligne suffit :
  `onClick={() => console.log('Merci !')}`.
- Pour passer un argument, on enveloppe l’appel dans une fonction fléchée :
  `onClick={() => handleChoose('thé')}`. Au clic, React appelle la fonction fléchée, qui
  appelle `handleChoose` avec le bon argument.

### Passer la fonction, ne pas l’appeler

C’est le piège déjà rencontré avec `addEventListener`, mais ses conséquences sont plus
visibles en React :

```jsx
function App() {
  function handleClick() {
    console.log('clic !');
  }

  return (
    <button type="button" onClick={handleClick()}>
      Cliquer
    </button>
  );
}

export default App;
```

Avec `handleClick()`, la fonction est **exécutée pendant le rendu**, et c’est sa valeur de
retour, `undefined`, qui est passée à `onClick`. Résultat vérifié : `clic !` s’affiche deux
fois au chargement (le double rendu de StrictMode) et **plus jamais** ensuite, le bouton ne
faisant plus rien.

Si la fonction modifie l’état, c’est pire : chaque rendu modifie l’état, ce qui provoque un
nouveau rendu, et ainsi de suite. React interrompt la boucle, la page devient blanche et la
console affiche :

```text
Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

| Écriture                           | Effet                                               |
| ---------------------------------- | --------------------------------------------------- |
| `onClick={handleClick}`            | correct : React appellera la fonction au clic       |
| `onClick={() => handleDelete(id)}` | correct : la fonction fléchée sera appelée au clic  |
| `onClick={handleClick()}`          | faux : appel pendant le rendu                       |
| `onClick={handleDelete(id)}`       | faux : appel pendant le rendu                       |

### L’objet événement

Comme avec le DOM, le gestionnaire reçoit un objet événement. React l’enveloppe dans un objet
compatible qui offre les mêmes propriétés utiles : `event.target`, `event.key`,
`event.preventDefault()`… Un exemple que tu retrouveras plus bas :
`onChange={(event) => setName(event.target.value)}`.

Attention à une différence de vocabulaire : en React, `onChange` sur un champ texte se
déclenche **à chaque frappe**, comme l’événement `input` du DOM (et non quand le champ perd
le focus, comme `change` en HTML).

## Pourquoi une variable ordinaire ne suffit pas

Essayons un compteur avec une simple variable :

```jsx
function App() {
  let likes = 0;

  function handleClick() {
    likes = likes + 1;
    console.log(`likes vaut ${likes}`);
  }

  return (
    <main>
      <button type="button" onClick={handleClick}>
        J’aime
      </button>
      <p>{likes} mention(s) J’aime</p>
    </main>
  );
}

export default App;
```

Après deux clics, la console affiche `likes vaut 1` puis `likes vaut 2`, mais la page indique
toujours « 0 mention(s) J’aime ». Deux raisons :

1. **Modifier une variable ne déclenche aucun rendu.** React ne sait pas qu’il devrait
   rappeler `App`.
2. **Une variable locale ne survit pas au rendu suivant.** Même si React rappelait `App`,
   `let likes = 0` repartirait de zéro.

## `useState` : la mémoire d’un composant

```jsx
import { useState } from 'react';

function App() {
  const [likes, setLikes] = useState(0);

  function handleClick() {
    setLikes(likes + 1);
  }

  return (
    <main>
      <button type="button" onClick={handleClick}>
        J’aime
      </button>
      <p>{likes} mention(s) J’aime</p>
    </main>
  );
}

export default App;
```

Après trois clics : « 3 mention(s) J’aime ».

- `useState(0)` déclare une **variable d’état** dont la valeur initiale est `0`. Cette valeur
  initiale n’est utilisée qu’au **premier** rendu.
- `useState` renvoie un tableau de deux éléments, que l’on déstructure : la **valeur
  actuelle** (`likes`) et une **fonction de mise à jour** (`setLikes`). La convention de
  nommage est `[chose, setChose]`.
- Appeler `setLikes(nouvelleValeur)` fait deux choses : React **mémorise** la nouvelle
  valeur et **planifie un nouveau rendu** du composant.

`useState` est un **hook** : une fonction fournie par React, dont le nom commence par `use`,
qui donne à un composant l’accès à une fonctionnalité de React (ici, la mémoire). Les hooks
obéissent à des règles strictes, présentées en fin de leçon.

### Le cycle d’une mise à jour

1. **Déclenchement** : un gestionnaire appelle `setLikes(1)`.
2. **Rendu** : React rappelle `App`. Cette fois, `useState(0)` renvoie `1`, la valeur mémorisée.
   La fonction produit un nouveau JSX.
3. **Validation** (*commit*) : React compare avec le rendu précédent et modifie dans le DOM
   uniquement le texte du paragraphe.

### L’état est un instantané

Pendant un rendu, `likes` est une **constante** : elle vaut ce que valait l’état au moment
de ce rendu. Appeler `setLikes` ne la change pas ; cela prépare le rendu **suivant**.

```jsx
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    console.log(`après setCount, count vaut toujours ${count}`);
  }

  console.log(`rendu avec count = ${count}`);

  return (
    <button type="button" onClick={handleClick}>
      Compteur : {count}
    </button>
  );
}

export default App;
```

Console au chargement, puis après un clic :

```text
rendu avec count = 0
rendu avec count = 0
après setCount, count vaut toujours 0
rendu avec count = 1
rendu avec count = 1
```

Les messages de rendu apparaissent deux fois à cause de StrictMode (leçon 3). Le message du
gestionnaire, lui, n’apparaît qu’une fois, et il affiche `0` : le gestionnaire a été créé
pendant le rendu où `count` valait 0, il « voit » cette valeur jusqu’au bout. Le bouton
affiche ensuite « Compteur : 1 ».

### Les mises à jour sont regroupées

```jsx
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  function addThreeWrong() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  return (
    <main>
      <p>Compteur : {count}</p>
      <button type="button" onClick={addThreeWrong}>
        +3 (faux)
      </button>
      <button type="button" onClick={addThree}>
        +3
      </button>
    </main>
  );
}

export default App;
```

Un clic sur « +3 (faux) » affiche « Compteur : 1 » ; un clic sur « +3 » ensuite affiche
« Compteur : 4 ».

- React **attend la fin du gestionnaire** pour refaire le rendu, une seule fois, avec toutes
  les mises à jour demandées. On dit que les mises à jour sont **regroupées** (*batching*).
  C’est en ce sens que la mise à jour est asynchrone : elle n’a pas lieu au moment de l’appel.
- Dans `addThreeWrong`, `count` vaut 0 pendant tout le gestionnaire (instantané) : les trois
  appels demandent tous « mets 1 ».
- Dans `addThree`, on passe une **fonction de mise à jour** (*updater*) : React les place dans
  une file et les applique l’une après l’autre, chacune recevant le résultat de la précédente
  (0 → 1 → 2 → 3, puis ici 1 → 4).

Utilise la forme fonctionnelle `setX((x) => …)` dès que la nouvelle valeur **dépend de
l’ancienne** et que plusieurs mises à jour peuvent s’enchaîner. On nomme souvent le paramètre
d’après la variable d’état, en abrégé (`c` pour `count`) ou en entier.

La fonction de mise à jour doit être **pure**, car StrictMode l’appelle elle aussi deux fois
en développement. Avec un `console.log` à l’intérieur, un clic produit, en développement :

```text
gestionnaire appelé
fonction de mise à jour appelée avec 0
fonction de mise à jour appelée avec 0
```

(en production, le dernier message n’apparaît qu’une fois ; vérifié).

### Chaque composant a son propre état

L’état appartient à **une instance** de composant, c’est-à-dire à un endroit précis de
l’arbre :

```jsx
import { useState } from 'react';

function Counter({ label }) {
  const [count, setCount] = useState(0);
  return (
    <p>
      {label} : {count}{' '}
      <button type="button" onClick={() => setCount(count + 1)}>
        +1
      </button>
    </p>
  );
}

function App() {
  return (
    <main>
      <Counter label="Cafés" />
      <Counter label="Thés" />
    </main>
  );
}

export default App;
```

Deux clics sur le premier bouton et un sur le second donnent « Cafés : 2 » et « Thés : 1 ». Les
deux compteurs utilisent la même fonction mais ont chacun leur mémoire. Le parent, `App`, ne
connaît pas ces valeurs : l’état est **privé**. La leçon 6 montre quoi faire quand deux
composants doivent partager une information.

## Objets et tableaux dans l’état : ne jamais muter

Un état peut contenir un objet ou un tableau. Mais React décide s’il doit refaire le rendu en
comparant l’ancienne et la nouvelle valeur avec `Object.is`. Si tu **modifies** l’objet
existant puis le repasses à la fonction de mise à jour, c’est **la même référence** : React
considère que rien n’a changé.

```jsx
import { useState } from 'react';

function App() {
  const [profile, setProfile] = useState({ name: 'Inès', city: 'Lyon' });

  function moveWrong() {
    profile.city = 'Nantes'; // mutation : React ne voit rien
    setProfile(profile);
  }

  function move() {
    setProfile({ ...profile, city: 'Nantes' });
  }

  return (
    <main>
      <p>
        {profile.name} habite à {profile.city}.
      </p>
      <button type="button" onClick={moveWrong}>
        Déménager (faux)
      </button>
      <button type="button" onClick={move}>
        Déménager
      </button>
    </main>
  );
}

export default App;
```

Un clic sur « Déménager (faux) » ne change rien à l’écran : « Inès habite à Lyon. ». Un clic sur
« Déménager » affiche « Inès habite à Nantes. » : la décomposition `{ ...profile, city: … }` crée
un **nouvel objet**, React voit une nouvelle référence et refait le rendu.

La mutation n’est pas seulement inefficace, elle crée des bugs à retardement. Avec un
tableau :

```jsx
import { useState } from 'react';

function App() {
  const [tags, setTags] = useState(['html', 'css']);

  function addWrong() {
    tags.push('js');
    setTags(tags);
  }

  function add() {
    setTags([...tags, 'js']);
  }

  return (
    <main>
      <p>
        {tags.length} étiquettes : {tags.join(', ')}
      </p>
      <button type="button" onClick={addWrong}>
        Ajouter (faux)
      </button>
      <button type="button" onClick={add}>
        Ajouter
      </button>
    </main>
  );
}

export default App;
```

Deux clics sur « Ajouter (faux) » : l’écran affiche toujours « 2 étiquettes : html, css ». Puis un
clic sur « Ajouter » : « 5 étiquettes : html, css, js, js, js ». Les deux `push` avaient bien
modifié le tableau en silence ; ils apparaissent d’un coup au rendu suivant. Ce genre de
décalage est très difficile à déboguer.

La règle : **traite l’état comme s’il était en lecture seule**, et remplace-le par une
nouvelle valeur. Les opérations immuables vues dans la compétence sur les données
s’appliquent directement :

| Besoin                    | À éviter (mutation)              | À utiliser (nouvelle valeur)                       |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| ajouter                   | `push`, `unshift`                | `[...items, item]`, `[item, ...items]`             |
| retirer                   | `splice`, `pop`, `shift`         | `items.filter((i) => i.id !== id)`                 |
| modifier un élément       | `items[i].done = true`           | `items.map((i) => (i.id === id ? { ...i, done: true } : i))` |
| trier, inverser           | `sort`, `reverse`                | `toSorted`, `toReversed`                           |
| modifier une propriété    | `profile.city = …`               | `{ ...profile, city: … }`                          |
| objet imbriqué            | `user.address.city = …`          | `{ ...user, address: { ...user.address, city: … } }` |

Rappel : la décomposition fait une copie **superficielle**. Pour un objet imbriqué, il faut
copier chaque niveau que l’on modifie, comme dans la dernière ligne du tableau.

## Un champ contrôlé simple

Un champ de saisie peut, lui aussi, être piloté par l’état :

```jsx
import { useState } from 'react';

function App() {
  const [name, setName] = useState('');

  return (
    <main>
      <label htmlFor="name">Ton prénom</label>
      <input id="name" value={name} onChange={(event) => setName(event.target.value)} />
      <p>{name === '' ? 'Qui es-tu ?' : `Bonjour, ${name} !`}</p>
      <p>{name.length} caractère(s)</p>
    </main>
  );
}

export default App;
```

Au départ, la page affiche « Qui es-tu ? » et « 0 caractère(s) ». Après la saisie de « Sam » :
« Bonjour, Sam ! » et « 3 caractère(s) », mis à jour à chaque frappe.

- `value={name}` impose au champ la valeur de l’état ; `onChange` met l’état à jour à chaque
  frappe. On parle de champ **contrôlé** : la valeur affichée vient toujours de l’état, qui
  est la seule source de vérité.
- Le message et le nombre de caractères sont **calculés** à partir de `name` à chaque rendu :
  pas besoin d’un second état.
- Si tu oublies `onChange`, le champ devient impossible à modifier et la console prévient :
  ``You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field.``

Les formulaires complets, avec validation et messages d’erreur, font l’objet de la compétence
suivante.

## Les règles des hooks

Les hooks (`useState`, et ceux que tu découvriras ensuite) s’appellent :

1. **au premier niveau** du composant, jamais dans une condition, une boucle, une fonction
   imbriquée ou après un `return` anticipé ;
2. **uniquement depuis un composant React** (ou depuis un hook personnalisé, vu dans la
   compétence suivante), jamais depuis une fonction JavaScript ordinaire.

Pourquoi ? React ne connaît pas le **nom** de tes variables d’état. Il les retrouve par leur
**ordre d’appel** : « le premier `useState` de ce composant, le deuxième… ». Si un hook est
appelé dans une condition, cet ordre change d’un rendu à l’autre et React attribue les
valeurs aux mauvaises variables.

```jsx
import { useState } from 'react';

function AdminPanel({ isAdmin }) {
  const [visits, setVisits] = useState(0);
  if (!isAdmin) {
    return (
      <button type="button" onClick={() => setVisits(visits + 1)}>
        Accès réservé ({visits} tentative(s))
      </button>
    );
  }
  const [clicks, setClicks] = useState(0);
  return (
    <button type="button" onClick={() => setClicks(clicks + 1)}>
      Clics admin : {clicks}
    </button>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  return (
    <main>
      <button type="button" onClick={() => setIsAdmin(!isAdmin)}>
        Basculer le mode admin
      </button>
      <AdminPanel isAdmin={isAdmin} />
    </main>
  );
}

export default App;
```

Au premier clic sur « Basculer le mode admin », `AdminPanel` appelle deux `useState` au lieu
d’un. La page devient blanche et la console affiche :

```text
React has detected a change in the order of Hooks called by AdminPanel. This will lead to bugs and errors if not fixed.

   Previous render            Next render
   ------------------------------------------------------
1. useState                   useState
2. undefined                  useState
```

suivi de l’erreur `Rendered more hooks than during the previous render.`

Ne compte pas sur cette erreur pour te protéger : selon la situation, React ne détecte pas
toujours le problème (vérifié avec une variante où le composant n’appelait aucun hook avant
la condition : aucune erreur, mais un comportement non garanti). Le garde-fou fiable est le
**linter** du projet Vite :

```bash
npm run lint
```

```text
error react-hooks(rules-of-hooks): React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render.
```

(extrait de la sortie d’Oxlint, qui indique aussi le fichier et la ligne). La correction :
déclarer **tous** les hooks en haut du composant, puis faire les conditions.

Le linter repère aussi d’autres erreurs de ce cours : sur les exemples fautifs de cette
leçon et de la précédente, il a signalé la modification d’une variable extérieure pendant le
rendu, la mutation de l’objet `profile`, un composant déclaré dans un autre et un appel de
fonction de mise à jour pendant le rendu. Il ne voit pas tout pour autant : le `tags.push`
de l’exemple du tableau n’a pas été signalé. Lance `npm run lint` régulièrement, mais ne
remplace pas ta compréhension par ses messages.

```jsx
function AdminPanel({ isAdmin }) {
  const [visits, setVisits] = useState(0);
  const [clicks, setClicks] = useState(0);

  if (!isAdmin) {
    return (
      <button type="button" onClick={() => setVisits(visits + 1)}>
        Accès réservé ({visits} tentative(s))
      </button>
    );
  }
  return (
    <button type="button" onClick={() => setClicks(clicks + 1)}>
      Clics admin : {clicks}
    </button>
  );
}
```

## Pièges courants

1. **`onClick={handleClick()}`** : appel pendant le rendu ; boucle infinie si la fonction
   modifie l’état.
2. **Une variable `let` pour mémoriser** : ni rendu, ni mémoire. Utilise `useState`.
3. **Lire l’état juste après l’avoir modifié** : tu obtiens l’ancienne valeur (instantané).
   Si tu as besoin de la nouvelle, calcule-la dans une constante :
   `const next = count + 1; setCount(next);`.
4. **Enchaîner `setX(x + 1)`** : une seule augmentation. Utilise `setX((x) => x + 1)`.
5. **Muter un objet ou un tableau d’état** (`push`, `sort`, affectation de propriété) :
   l’écran ne suit pas, puis se met à jour au mauvais moment.
6. **Un hook dans une condition, une boucle ou après un `return`** : erreurs ou bugs
   silencieux. Lance `npm run lint`.
7. **Un composant déclaré dans un autre** : vérifié avec un champ `NameField` déclaré dans
   `App` ; un clic sur un bouton d’`App` efface ce qui avait été saisi, car React voit un
   nouveau composant à chaque rendu.

## Exercices

### Exercice 1 — Prédire les mises à jour

Sans exécuter, indique ce qu’affichent la console et le bouton après **un** clic.

```jsx
import { useState } from 'react';

function App() {
  const [score, setScore] = useState(0);

  function handleClick() {
    setScore(score + 5);
    setScore((s) => s + 1);
    console.log(score);
  }

  return (
    <button type="button" onClick={handleClick}>
      Score : {score}
    </button>
  );
}

export default App;
```

:::solution
La console affiche `0` et le bouton « Score : 6 ».

`console.log(score)` lit l’instantané du rendu en cours : 0. Au rendu suivant, React applique
la file dans l’ordre : `setScore(score + 5)` remplace la valeur par 5 (soit `0 + 5`,
calculé avec l’instantané), puis la fonction de mise à jour reçoit 5 et renvoie 6. Un
deuxième clic afficherait `6` dans la console et « Score : 12 » sur le bouton.
:::

### Exercice 2 — La commande de thé

Écris un composant `TeaOrder` dont l’état est **un seul objet**
`{ size: 'M', sugars: 0 }`. Il affiche trois boutons `S`, `M`, `L` pour choisir la taille,
deux boutons `−` et `+` pour le sucre (entre 0 et 3), un récapitulatif « Thé M, 0 sucre(s) »
et un bouton « Réinitialiser ». Aucune mutation.

:::solution
```jsx
import { useState } from 'react';

const initialOrder = { size: 'M', sugars: 0 };

function TeaOrder() {
  const [order, setOrder] = useState(initialOrder);

  function chooseSize(size) {
    setOrder({ ...order, size });
  }

  function changeSugars(delta) {
    setOrder((current) => ({
      ...current,
      sugars: Math.min(3, Math.max(0, current.sugars + delta)),
    }));
  }

  return (
    <section>
      <p>
        Taille :{' '}
        <button type="button" onClick={() => chooseSize('S')}>
          S
        </button>{' '}
        <button type="button" onClick={() => chooseSize('M')}>
          M
        </button>{' '}
        <button type="button" onClick={() => chooseSize('L')}>
          L
        </button>
      </p>
      <p>
        Sucre :{' '}
        <button type="button" aria-label="Retirer un sucre" onClick={() => changeSugars(-1)}>
          −
        </button>{' '}
        <button type="button" aria-label="Ajouter un sucre" onClick={() => changeSugars(1)}>
          +
        </button>
      </p>
      <p>
        Thé {order.size}, {order.sugars} sucre(s)
      </p>
      <button type="button" onClick={() => setOrder(initialOrder)}>
        Réinitialiser
      </button>
    </section>
  );
}

function App() {
  return <TeaOrder />;
}

export default App;
```

Vérification : `L`, puis quatre fois `+`, affiche « Thé L, 3 sucre(s) » ; une fois `−` donne
« Thé L, 2 sucre(s) » ; « Réinitialiser » revient à « Thé M, 0 sucre(s) ».

Chaque mise à jour crée un nouvel objet avec `{ ...order, … }`. `{ ...order, size }` utilise
le raccourci de propriété (`size: size`). Le sucre utilise la forme fonctionnelle, car la
nouvelle valeur dépend de l’ancienne ; `Math.min`/`Math.max` bornent le résultat.
Réinitialiser avec `initialOrder` est sans risque **parce que** rien ne mute jamais cet objet.
Les `aria-label` donnent un nom compréhensible aux boutons `−` et `+`.
:::

### Exercice 3 — Trois bugs dans une liste d’envies

Ce composant doit ajouter « Livre » à la liste à chaque clic et afficher le nombre d’envies ;
au-delà de cinq envies, il affiche « Liste pleine ». Pourtant, dès le chargement, sans aucun
clic, la page affiche « Liste pleine ». Le code contient trois erreurs. Trouve-les,
explique-les (y compris ce symptôme surprenant) et corrige-les.

```jsx
import { useState } from 'react';

function App() {
  const [wishes, setWishes] = useState([]);

  function addWish() {
    wishes.push('Livre');
    setWishes(wishes);
  }

  if (wishes.length > 5) {
    return <p>Liste pleine</p>;
  }

  const [title] = useState('Mes envies');

  return (
    <main>
      <h1>{title}</h1>
      <p>{wishes.length} envie(s)</p>
      <button type="button" onClick={addWish()}>
        Ajouter un livre
      </button>
    </main>
  );
}

export default App;
```

:::solution
1. **`onClick={addWish()}`** appelle `addWish` pendant **chaque** rendu. Chaque appel ajoute
   un livre et demande un nouveau rendu, qui rappelle `addWish`, et ainsi de suite. La boucle
   ne s’arrête que parce qu’à six envies, le `return` anticipé affiche « Liste pleine » sans
   évaluer le bouton (vérifié avec un `console.log` dans le corps : sept rendus, avec des
   longueurs de 0 à 6). Sans ce `return`, React lèverait l’erreur `Too many re-renders`. Il
   faut `onClick={addWish}`.
2. **`wishes.push` + `setWishes(wishes)`** mute le tableau et repasse la même référence : React
   ne refait pas le rendu. Il faut `setWishes([...wishes, 'Livre'])`.
3. **`useState` après un `return` conditionnel** : quand la liste dépasse 5 envies, le
   second hook n’est plus appelé. Il faut déclarer tous les hooks avant la condition.
   (`npm run lint` signale `React Hook "useState" is called conditionally`.)

```jsx
import { useState } from 'react';

function App() {
  const [wishes, setWishes] = useState([]);
  const [title] = useState('Mes envies');

  function addWish() {
    setWishes([...wishes, 'Livre']);
  }

  if (wishes.length > 5) {
    return <p>Liste pleine</p>;
  }

  return (
    <main>
      <h1>{title}</h1>
      <p>{wishes.length} envie(s)</p>
      <button type="button" onClick={addWish}>
        Ajouter un livre
      </button>
    </main>
  );
}

export default App;
```

Vérification : chaque clic incrémente le compteur ; au sixième, la page affiche
« Liste pleine ». Remarque : `title` ne change jamais, il n’a donc pas besoin d’être un état.
Une simple constante `const title = 'Mes envies';` suffirait : ne mets dans l’état que ce
qui change au cours du temps.
:::

## Récapitulatif

- On réagit avec `onClick={handleClick}` ou `onClick={() => handle(id)}` : on **passe** une
  fonction, on ne l’appelle pas.
- `onChange` sur un champ texte se déclenche à chaque frappe ; l’objet événement donne
  `event.target.value` et `event.preventDefault()`.
- `const [x, setX] = useState(initial)` : une mémoire qui survit aux rendus ; `setX` planifie
  un nouveau rendu.
- L’état est un **instantané** : pendant un rendu et dans ses gestionnaires, `x` ne change
  pas. Les mises à jour sont **regroupées** et appliquées après le gestionnaire.
- `setX((x) => …)` enchaîne correctement plusieurs mises à jour qui dépendent de la valeur
  précédente ; cette fonction doit rester pure.
- Chaque instance de composant a son propre état, privé.
- Objets et tableaux d’état ne se mutent jamais : on crée une nouvelle valeur (`...`, `map`,
  `filter`, `toSorted`).
- Hooks au premier niveau du composant, jamais dans une condition ou une boucle ;
  `npm run lint` le vérifie.
