---
title: Rendu conditionnel, listes et clés
summary: Choisir ce qui s’affiche avec un retour anticipé, un ternaire ou &&, éviter le piège du 0, transformer un tableau en éléments avec map et donner à chacun une clé stable.
durationMinutes: 70
sources:
  - title: React — Affichage conditionnel
    url: https://fr.react.dev/learn/conditional-rendering
  - title: React — Afficher des listes
    url: https://fr.react.dev/learn/rendering-lists
  - title: React — Mettre à jour les tableaux d’un état
    url: https://fr.react.dev/learn/updating-arrays-in-state
  - title: React — Préserver et réinitialiser l’état
    url: https://fr.react.dev/learn/preserving-and-resetting-state
---

## Des données qui décident de l’affichage

Presque toute interface dépend de conditions (« le panier est vide », « l’utilisateur est
connecté ») et de collections (des produits, des messages, des tâches). En JSX, il n’y a pas
de syntaxe spéciale pour cela : tu utilises les outils de JavaScript que tu connais déjà,
`if`, l’opérateur ternaire, `&&` et `map`. Cette leçon montre comment les combiner, et
surtout les deux pièges qui piègent tout le monde : le `0` qui s’affiche et les clés mal
choisies.

## Le rendu conditionnel

### Le retour anticipé

Quand tout le contenu change selon une condition, le plus lisible est un `if` **avant** le
`return` principal :

```jsx
function Cart({ items }) {
  if (items.length === 0) {
    return <p>Ton panier est vide.</p>;
  }

  return (
    <p>
      {items.length} article(s) : {items.join(', ')}
    </p>
  );
}

function App() {
  return (
    <main>
      <Cart items={[]} />
      <Cart items={['Carnet', 'Stylo']} />
    </main>
  );
}

export default App;
```

```text
Ton panier est vide.
2 article(s) : Carnet, Stylo
```

Un composant peut aussi renvoyer `null` pour ne **rien** afficher. Rappel de la leçon 4 : un
`return` anticipé se place **après** tous les appels de hooks.

### L’opérateur ternaire

Pour choisir entre deux contenus **à l’intérieur** du JSX, on utilise `condition ? a : b` :

```jsx
function Status({ isOnline }) {
  return (
    <p className={isOnline ? 'status status-online' : 'status'}>
      {isOnline ? 'En ligne' : 'Hors ligne'}
    </p>
  );
}

function App() {
  return (
    <main>
      <Status isOnline={true} />
      <Status isOnline={false} />
    </main>
  );
}

export default App;
```

```html
<main><p class="status status-online">En ligne</p><p class="status">Hors ligne</p></main>
```

Le ternaire marche aussi pour une classe CSS, un attribut ou un composant entier
(`{isEditing ? <EditForm /> : <Summary />}`). Évite d’imbriquer plusieurs ternaires : au-delà
de deux cas, un `if` avant le `return` ou une variable intermédiaire est plus lisible.

### `&&` : afficher ou rien

Pour afficher un élément **seulement si** une condition est vraie, on écrit
`{condition && <Element />}`. Si la condition est fausse, l’expression vaut `false`, et
`false` n’affiche rien (leçon 2). Si elle est vraie, l’expression vaut l’élément.

### Le piège du `0`

`&&` ne renvoie pas un booléen : il renvoie **la valeur de gauche** si elle est falsy. Avec un
nombre, cela change tout :

```jsx
import { useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);

  return (
    <main>
      {messages.length && <p>{messages.length} nouveau(x) message(s)</p>}
      <button type="button" onClick={() => setMessages([...messages, 'Salut'])}>
        Recevoir un message
      </button>
    </main>
  );
}

export default App;
```

Au chargement, le DOM contient :

```html
<main>0<button type="button">Recevoir un message</button></main>
```

`messages.length` vaut `0`, donc `0 && …` vaut `0`, et React **affiche** les nombres, y compris
zéro. Un « 0 » isolé apparaît dans la page. Après un clic, la page affiche bien
« 1 nouveau(x) message(s) ».

Corrections, de la plus recommandée à la moins lisible :

- une vraie comparaison : `{messages.length > 0 && <p>…</p>}` ;
- un ternaire : `{messages.length > 0 ? <p>…</p> : null}` ;
- une conversion : `{Boolean(messages.length) && <p>…</p>}`.

Retiens la règle : **à gauche de `&&`, toujours un booléen**. Le même piège existe avec un
prix, un stock, un score ou une note qui peuvent valoir 0.

### Afficher ou démonter ?

Quand une condition fait disparaître un composant, React le **retire** de l’arbre, avec son
état. Quand il réapparaît, il repart de zéro :

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Compteur : {count}
    </button>
  );
}

function App() {
  const [isVisible, setIsVisible] = useState(true);
  return (
    <main>
      <label>
        <input type="checkbox" checked={isVisible} onChange={() => setIsVisible(!isVisible)} />{' '}
        Afficher le compteur
      </label>
      <p>{isVisible && <Counter />}</p>
    </main>
  );
}

export default App;
```

Deux clics sur le compteur (« Compteur : 2 »), on décoche la case, on la recoche : le compteur
affiche « Compteur : 0 ». C’est souvent ce que l’on veut (un formulaire qui se vide à la
fermeture). Si l’information doit survivre, il faut la garder dans un composant qui, lui,
reste affiché : c’est le sujet de la leçon 6.

## Afficher une liste avec `map`

Le JSX affiche les tableaux (leçon 2). Pour afficher une collection, on **transforme** donc un
tableau de données en tableau d’éléments avec `map` :

```jsx
const books = [
  { id: 'b1', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry' },
  { id: 'b2', title: 'Germinal', author: 'Émile Zola' },
  { id: 'b3', title: 'Les Misérables', author: 'Victor Hugo' },
];

function BookList() {
  return (
    <ul>
      {books.map((book) => (
        <li key={book.id}>
          {book.title}, de {book.author}
        </li>
      ))}
    </ul>
  );
}

function App() {
  return <BookList />;
}

export default App;
```

```text
Le Petit Prince, de Antoine de Saint-Exupéry
Germinal, de Émile Zola
Les Misérables, de Victor Hugo
```

- `map` renvoie un nouveau tableau d’éléments `li`, que React affiche à la suite.
- On peut enchaîner `filter`, `toSorted` et `map` avant d’afficher, sans jamais modifier le
  tableau d’origine.
- Chaque élément reçoit un attribut `key` (voir plus bas).

Quand l’élément d’une liste se complique, on l’extrait dans un composant. La clé se place
alors **sur le composant** renvoyé par `map`, pas à l’intérieur :

```jsx
function BookItem({ book }) {
  return (
    <li>
      {book.title}, de {book.author}
    </li>
  );
}

function BookList({ books }) {
  return (
    <ul>
      {books.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </ul>
  );
}
```

`key` est un attribut spécial réservé à React : il **n’est pas transmis** comme prop. Si
`BookItem` essayait de lire `props.key`, il obtiendrait `undefined`, et React préviendrait :
``BookItem: `key` is not a prop. Trying to access it will result in `undefined` being returned.``
Si l’enfant a besoin de l’identifiant, passe-le dans une autre prop (`book={book}` le
contient déjà).

Si chaque élément doit produire plusieurs balises sans conteneur (des paires `dt`/`dd`, par
exemple), utilise la forme longue du fragment, qui accepte une clé :

```jsx
import { Fragment } from 'react';

const glossary = [
  { id: 'jsx', term: 'JSX', definition: 'Syntaxe qui décrit l’interface dans du JavaScript.' },
  { id: 'props', term: 'Props', definition: 'Données transmises par un parent à un composant.' },
];

function App() {
  return (
    <dl>
      {glossary.map((entry) => (
        <Fragment key={entry.id}>
          <dt>{entry.term}</dt>
          <dd>{entry.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export default App;
```

```html
<dl><dt>JSX</dt><dd>Syntaxe qui décrit l’interface dans du JavaScript.</dd><dt>Props</dt><dd>Données transmises par un parent à un composant.</dd></dl>
```

## Les clés

### Le rôle d’une clé

Sans `key`, la liste s’affiche, mais la console de développement proteste :

```text
Each child in a list should have a unique "key" prop.

Check the render method of `BookList`. See https://react.dev/link/warning-keys for more information.
```

Quand une liste change (ajout, suppression, réordonnancement), React doit décider, pour chaque
élément du nouveau rendu, s’il correspond à un élément existant — à conserver avec son nœud
DOM et son **état** — ou à un nouvel élément. La clé est l’**identité** de chaque élément :
« celui-ci, c’est le livre `b2` ». Une bonne clé est :

- **unique parmi ses frères** (pas besoin d’être unique dans toute l’application) ;
- **stable** : le même élément garde la même clé d’un rendu à l’autre.

Le meilleur candidat est l’identifiant venu des données (l’`id` d’une base de données).
Pour un élément créé dans l’interface, génère l’identifiant **une seule fois, à la
création**, dans le gestionnaire d’événement : `{ id: crypto.randomUUID(), … }`.

Deux clés identiques déclenchent un autre avertissement :

```text
Encountered two children with the same key, `b1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
```

### Pourquoi pas l’index ? La démonstration

`map` fournit l’index en second paramètre, et `key={index}` fait taire l’avertissement. C’est
pourtant un piège dès que la liste peut changer d’ordre, recevoir un élément ailleurs qu’à la
fin, ou perdre un élément. Voici une liste d’idées de sortie ; chaque idée a son propre
compteur de votes, gardé dans un état **local** à `IdeaItem` :

```jsx
import { useState } from 'react';

function IdeaItem({ title, onRemove }) {
  const [votes, setVotes] = useState(0);
  return (
    <li>
      {title} — {votes} vote(s){' '}
      <button type="button" onClick={() => setVotes(votes + 1)}>
        Voter
      </button>{' '}
      <button type="button" onClick={onRemove}>
        Retirer
      </button>
    </li>
  );
}

const initialIdeas = [
  { id: 'cinema', title: 'Cinéma' },
  { id: 'picnic', title: 'Pique-nique' },
  { id: 'museum', title: 'Musée' },
];

function App() {
  const [ideas, setIdeas] = useState(initialIdeas);

  function handleReverse() {
    setIdeas(ideas.toReversed());
  }

  function handleRemove(id) {
    setIdeas(ideas.filter((idea) => idea.id !== id));
  }

  return (
    <main>
      <button type="button" onClick={handleReverse}>
        Inverser l’ordre
      </button>
      <ul>
        {ideas.map((idea, index) => (
          <IdeaItem key={index} title={idea.title} onRemove={() => handleRemove(idea.id)} />
        ))}
      </ul>
    </main>
  );
}

export default App;
```

`onRemove` est une **fonction passée en prop** : le bouton « Retirer » de l’enfant appelle une
fonction définie par le parent, qui seul possède le tableau `ideas`. La leçon 6 généralise
ce mécanisme.

Scénario 1 : deux votes pour « Cinéma », un pour « Pique-nique », puis « Inverser l’ordre ».
Les résultats ci-dessous, vérifiés dans Chromium, montrent le texte de chaque idée sans
celui des boutons.

```text
Avant :                      Après inversion, avec key={index} :
Cinéma — 2 vote(s)           Musée — 2 vote(s)
Pique-nique — 1 vote(s)      Pique-nique — 1 vote(s)
Musée — 0 vote(s)            Cinéma — 0 vote(s)
```

Les titres ont bougé, **pas les votes** : « Musée » a hérité des deux votes du cinéma.

Scénario 2 (après rechargement) : deux votes pour « Cinéma », un pour « Musée », puis
« Retirer » sur « Cinéma ».

```text
Avant :                      Après retrait, avec key={index} :
Cinéma — 2 vote(s)           Pique-nique — 2 vote(s)
Pique-nique — 0 vote(s)      Musée — 0 vote(s)
Musée — 1 vote(s)
```

Le cinéma a disparu, mais ses votes sont passés au pique-nique, et le vote du musée s’est
perdu.

L’explication : avec `key={index}`, la clé `0` désigne toujours « le premier élément », quel
qu’il soit. Après l’inversion, React voit les clés 0, 1, 2 comme avant : il conclut que les
trois éléments sont les mêmes, garde chaque composant `IdeaItem` **avec son état** à sa
place, et se contente de changer leur prop `title`. Après le retrait, il voit les clés 0 et 1
(gardées) et constate que la clé 2 a disparu : il supprime donc le **dernier** composant,
celui qui contenait le vote du musée.

Il suffit de remplacer la clé par l’identifiant :

```jsx
{ideas.map((idea) => (
  <IdeaItem key={idea.id} title={idea.title} onRemove={() => handleRemove(idea.id)} />
))}
```

Mêmes scénarios, vérifiés dans Chromium :

```text
Après inversion, avec key={idea.id} :     Après retrait, avec key={idea.id} :
Musée — 0 vote(s)                          Pique-nique — 0 vote(s)
Pique-nique — 1 vote(s)                    Musée — 1 vote(s)
Cinéma — 2 vote(s)
```

Chaque compteur suit son idée. Le même décalage toucherait tout ce qui vit dans le DOM ou
dans un état local : texte saisi dans un champ non contrôlé, case cochée, panneau ouvert,
focus clavier.

L’index n’est acceptable que pour une liste **figée** : jamais réordonnée, filtrée, ni
modifiée ailleurs qu’à la fin, et sans état par élément. Dans le doute, utilise un
identifiant.

### Pire que l’index : une clé aléatoire

`key={crypto.randomUUID()}` ou `key={Math.random()}` écrit **dans le rendu** produit une
nouvelle clé à chaque rendu. React croit que tous les éléments sont nouveaux : il les détruit
et les recrée. Vérifié sur l’exemple des idées : après un vote pour « Cinéma » et un pour
« Pique-nique », « Inverser l’ordre » remet **tous** les compteurs à 0. Le focus clavier est
perdu de la même façon. L’identifiant doit être créé une fois, avec la donnée.

## Mettre à jour une liste de l’état

Assemblons le tout dans une playlist que l’on peut réordonner. Les modifications du tableau
suivent les règles d’immutabilité de la leçon 4.

```jsx
import { useState } from 'react';

const initialSongs = [
  { id: 's1', title: 'La Javanaise', favorite: false },
  { id: 's2', title: 'Ne me quitte pas', favorite: true },
  { id: 's3', title: 'La Bohème', favorite: false },
];

function App() {
  const [songs, setSongs] = useState(initialSongs);

  function toggleFavorite(id) {
    setSongs(songs.map((song) => (song.id === id ? { ...song, favorite: !song.favorite } : song)));
  }

  function moveUp(index) {
    const next = [...songs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSongs(next);
  }

  function remove(id) {
    setSongs(songs.filter((song) => song.id !== id));
  }

  const favoriteCount = songs.filter((song) => song.favorite).length;

  if (songs.length === 0) {
    return <p>La playlist est vide.</p>;
  }

  return (
    <main>
      <p>{favoriteCount > 0 ? `${favoriteCount} favori(s)` : 'Aucun favori'}</p>
      <ol>
        {songs.map((song, index) => (
          <li key={song.id}>
            {song.favorite && '★ '}
            {song.title}{' '}
            <button type="button" onClick={() => toggleFavorite(song.id)}>
              {song.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>{' '}
            <button type="button" disabled={index === 0} onClick={() => moveUp(index)}>
              Monter
            </button>{' '}
            <button type="button" onClick={() => remove(song.id)}>
              Supprimer
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}

export default App;
```

Au départ (texte des titres, sans celui des boutons) :

```text
1 favori(s)
La Javanaise
★ Ne me quitte pas
La Bohème
```

Après « Monter » sur « La Bohème », puis « Ajouter aux favoris » sur « La Javanaise » :

```text
2 favori(s)
★ La Javanaise
La Bohème
★ Ne me quitte pas
```

Après trois « Supprimer », la page affiche « La playlist est vide. ».

- `moveUp` **copie** le tableau (`[...songs]`), puis échange deux cases de la **copie** par
  déstructuration. Modifier une copie fraîchement créée est permis : ce n’est pas l’état.
- L’index sert ici de **donnée** (la position à échanger), ce qui est parfaitement correct ;
  il ne sert pas de clé. Le bouton « Monter » du premier titre est désactivé, donc `moveUp(0)`
  n’est jamais appelé.
- `favoriteCount` est **calculé** à chaque rendu à partir de `songs` : on ne le stocke pas.
- `{song.favorite && '★ '}` est sûr : `song.favorite` est un booléen.
- Le `return` anticipé de la playlist vide est placé après le `useState`.

## Pièges courants

1. **`{count && …}` avec un nombre** : affiche `0`. Compare explicitement (`count > 0`).
2. **Pas de clé**, ou une clé placée dans le composant enfant au lieu de l’élément renvoyé
   par `map` : même avertissement `Each child in a list should have a unique "key" prop.`
3. **`key={index}`** sur une liste qui change : l’état et le DOM restent attachés à la
   position, pas à la donnée.
4. **Clé générée pendant le rendu** (`Math.random()`, `crypto.randomUUID()`) : tout est
   recréé à chaque rendu.
5. **Oublier le `return` dans `map`** : avec des accolades,
   `books.map((book) => { <li key={book.id}>{book.title}</li>; })` renvoie un tableau de
   `undefined`. Aucune erreur, mais une liste vide (`<ul></ul>`, vérifié). Utilise des
   parenthèses `(book) => (…)` ou écris `return`.
6. **Lire `props.key`** dans l’enfant : `undefined`. Passe l’identifiant dans une autre prop.
7. **Muter le tableau avant d’afficher** (`items.sort()` dans le rendu) : utilise `toSorted`.

## Exercices

### Exercice 1 — Les notifications

Ce composant doit afficher uniquement « Connecte-toi pour voir tes messages. » quand
l’utilisateur n’est pas connecté ; sinon, le nombre de messages, ou « Aucun message. » s’il
n’y en a pas. Corrige-le (deux problèmes) et donne l’affichage des trois cas.

```jsx
function Notifications({ messages, isLoggedIn }) {
  return (
    <section>
      {!isLoggedIn && <p>Connecte-toi pour voir tes messages.</p>}
      {messages.length && <p>{messages.length} nouveau(x) message(s)</p>}
      {messages.length === 0 ? <p>Aucun message.</p> : null}
    </section>
  );
}

function App() {
  return (
    <main>
      <Notifications messages={['Salut']} isLoggedIn={false} />
      <Notifications messages={[]} isLoggedIn={true} />
      <Notifications messages={['Salut', 'Coucou']} isLoggedIn={true} />
    </main>
  );
}

export default App;
```

:::solution
Problèmes : quand l’utilisateur n’est pas connecté, le composant affiche **aussi** le nombre
de messages ; quand il n’y a aucun message, un `0` s’affiche avant « Aucun message. ».

```jsx
function Notifications({ messages, isLoggedIn }) {
  if (!isLoggedIn) {
    return (
      <section>
        <p>Connecte-toi pour voir tes messages.</p>
      </section>
    );
  }

  return (
    <section>
      {messages.length > 0 ? (
        <p>{messages.length} nouveau(x) message(s)</p>
      ) : (
        <p>Aucun message.</p>
      )}
    </section>
  );
}
```

Avec le même `App`, l’affichage devient :

```text
Connecte-toi pour voir tes messages.
Aucun message.
2 nouveau(x) message(s)
```

Le retour anticipé exprime « rien d’autre ne s’affiche si… ». Le ternaire remplace un `&&` et
un second test qui disaient la même chose à l’envers : deux branches exclusives se lisent
mieux en une seule expression. Avant correction, le premier cas affichait le message de
connexion **et** « 1 nouveau(x) message(s) », et le deuxième « 0 » suivi de « Aucun message. ».
:::

### Exercice 2 — Le catalogue filtré et trié

Écris un composant `ProductList({ products, onlyInStock = false })` qui affiche les produits
triés par prix croissant, au format « Gomme — 0.80 € », en ne gardant que ceux en stock si
`onlyInStock` est vrai. Si aucun produit ne reste, il affiche « Aucun produit. ». Le tableau
reçu ne doit pas être modifié.

```js
const products = [
  { id: 'p1', name: 'Carnet', price: 4.5, inStock: true },
  { id: 'p2', name: 'Stylo plume', price: 18, inStock: false },
  { id: 'p3', name: 'Gomme', price: 0.8, inStock: true },
  { id: 'p4', name: 'Agenda', price: 12, inStock: true },
];
```

:::solution
```jsx
const products = [
  { id: 'p1', name: 'Carnet', price: 4.5, inStock: true },
  { id: 'p2', name: 'Stylo plume', price: 18, inStock: false },
  { id: 'p3', name: 'Gomme', price: 0.8, inStock: true },
  { id: 'p4', name: 'Agenda', price: 12, inStock: true },
];

function ProductList({ products, onlyInStock = false }) {
  const visible = products
    .filter((product) => !onlyInStock || product.inStock)
    .toSorted((a, b) => a.price - b.price);

  if (visible.length === 0) {
    return <p>Aucun produit.</p>;
  }

  return (
    <ul>
      {visible.map((product) => (
        <li key={product.id}>
          {product.name} — {product.price.toFixed(2)} €
        </li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <main>
      <ProductList products={products} onlyInStock />
      <ProductList products={products} />
      <ProductList products={[]} />
    </main>
  );
}

export default App;
```

```text
Gomme — 0.80 €
Carnet — 4.50 €
Agenda — 12.00 €
Gomme — 0.80 €
Carnet — 4.50 €
Agenda — 12.00 €
Stylo plume — 18.00 €
Aucun produit.
```

`filter` renvoie déjà un nouveau tableau, mais `toSorted` est quand même préférable à `sort` :
le code reste correct si quelqu’un retire un jour le `filter`. La condition
`!onlyInStock || product.inStock` garde tout quand le filtre est désactivé. La clé est
l’identifiant du produit, stable même si l’ordre d’affichage change.
:::

### Exercice 3 — La réponse qui change de commentaire

Dans ce fil de commentaires, chaque commentaire a un bouton « Répondre » qui ouvre une zone
de réponse (état local). Les nouveaux commentaires s’ajoutent **en tête**. Prévois ce qui se
passe si l’on clique sur « Répondre » sous le commentaire de Sam, puis sur « Simuler un nouveau
commentaire ». Vérifie, explique et corrige.

```jsx
import { useState } from 'react';

function Comment({ author, text }) {
  const [isReplying, setIsReplying] = useState(false);
  return (
    <li>
      <strong>{author}</strong> : {text}{' '}
      <button type="button" onClick={() => setIsReplying(!isReplying)}>
        {isReplying ? 'Annuler' : 'Répondre'}
      </button>
      {isReplying && <p>Réponse à {author}…</p>}
    </li>
  );
}

const initialComments = [
  { id: 'c1', author: 'Sam', text: 'Très clair !' },
  { id: 'c2', author: 'Léa', text: 'Merci pour les exemples.' },
];

function App() {
  const [comments, setComments] = useState(initialComments);

  function addComment() {
    const newComment = { id: crypto.randomUUID(), author: 'Noa', text: 'Premier !' };
    setComments([newComment, ...comments]);
  }

  return (
    <main>
      <button type="button" onClick={addComment}>
        Simuler un nouveau commentaire
      </button>
      <ul>
        {comments.map((comment, index) => (
          <Comment key={index} author={comment.author} text={comment.text} />
        ))}
      </ul>
    </main>
  );
}

export default App;
```

:::solution
Après les deux clics, la page affiche :

```text
Noa : Premier ! Annuler
Réponse à Noa…
Sam : Très clair ! Répondre
Léa : Merci pour les exemples. Répondre
```

La zone de réponse ouverte pour Sam se retrouve sous le commentaire de Noa. Avec
`key={index}`, le composant de clé `0` (celui dont `isReplying` vaut `true`) reste le premier
de la liste ; il reçoit simplement de nouvelles props, celles de Noa. L’état est resté
attaché à la **position**.

Correction : `key={comment.id}`.

```jsx
{comments.map((comment) => (
  <Comment key={comment.id} author={comment.author} text={comment.text} />
))}
```

Même scénario après correction :

```text
Noa : Premier ! Répondre
Sam : Très clair ! Annuler
Réponse à Sam…
Léa : Merci pour les exemples. Répondre
```

L’identifiant du nouveau commentaire est créé une seule fois, dans `addComment`, avec
`crypto.randomUUID()` : il reste ensuite stable à chaque rendu. Le bug n’apparaissait pas
tant que les commentaires s’ajoutaient en fin de liste : c’est ce qui le rend si fréquent.
:::

## Récapitulatif

- Retour anticipé pour un affichage entièrement différent ; ternaire pour choisir entre deux
  contenus ; `&&` pour « ceci ou rien », avec **un booléen à gauche** (sinon `0` s’affiche).
- Un composant qui disparaît par une condition perd son état ; il repart de zéro quand il
  revient.
- Une liste s’affiche avec `map`, éventuellement après `filter` et `toSorted`, sans modifier
  les données d’origine.
- Chaque élément d’une liste a une `key` **unique parmi ses frères** et **stable** :
  l’identifiant de la donnée. Elle se place sur l’élément renvoyé par `map`, et n’est pas
  une prop.
- `key={index}` attache l’état et le DOM à la position : bugs dès que la liste est
  réordonnée, filtrée ou modifiée ailleurs qu’à la fin. Une clé aléatoire recrée tout à
  chaque rendu.
- Les mises à jour de liste créent un nouveau tableau (`map`, `filter`, copie puis
  échange) ; les valeurs comme un nombre de favoris se calculent pendant le rendu.
