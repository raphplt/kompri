---
title: Synchroniser un composant avec useEffect
summary: Comprendre à quoi sert un effet, régler son tableau de dépendances, écrire sa fonction de nettoyage, interpréter la double exécution de StrictMode et reconnaître les effets inutiles.
durationMinutes: 60
sources:
  - title: React — useEffect
    url: https://fr.react.dev/reference/react/useEffect
  - title: React — Synchroniser grâce aux Effets
    url: https://fr.react.dev/learn/synchronizing-with-effects
  - title: React — Vous n’avez pas forcément besoin d’un Effet
    url: https://fr.react.dev/learn/you-might-not-need-an-effect
  - title: React — Cycle de vie des Effets réactifs
    url: https://fr.react.dev/learn/lifecycle-of-reactive-effects
---

## Le problème : un rendu doit rester pur

Dans la compétence « React : composants, props et état », tu as appris deux règles :

- pendant le **rendu**, un composant est **pur** : il calcule du JSX à partir de ses props et
  de son état, sans rien modifier à l’extérieur ;
- les modifications ont lieu dans les **gestionnaires d’événements** (`onClick`,
  `onSubmit`…), qui s’exécutent quand l’utilisateur agit.

Certaines tâches n’entrent dans aucune de ces deux cases. Afficher le nombre de messages non
lus dans le titre de l’onglet, démarrer un minuteur quand une horloge apparaît, écouter la
perte de connexion réseau, charger une fiche quand on la sélectionne : rien de tout cela n’est
déclenché par un clic précis. Ces tâches découlent du simple fait que le composant **est
affiché** avec certaines valeurs. Les écrire dans le corps du composant serait une erreur :
le rendu peut être appelé plusieurs fois, à des moments que tu ne contrôles pas.

React fournit pour cela un hook : `useEffect`. Un **effet** permet de **synchroniser un
composant avec un système externe**, c’est-à-dire tout ce qui n’est pas géré par React : le
titre du document, un minuteur, un écouteur sur `window`, une connexion réseau, un serveur.

Cette leçon n’utilise pas encore d’API : on se concentre sur le mécanisme. Crée un projet
d’entraînement, que la leçon suivante transformera en application complète :

```bash
npm create vite@latest carnet -- --template react --no-interactive
cd carnet
npm install
npm run dev
```

Chaque exemple remplace le contenu de `src/App.jsx`. Ouvre la console du navigateur : la
plupart des démonstrations y écrivent des messages. Les exemples ont été exécutés avec
React 19.3 et Vite 8.3, dans Chromium.

## Un premier effet : le titre de l’onglet

```jsx
import { useEffect, useState } from 'react';

function App() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    console.log(`effet : titre mis à jour avec ${unread}`);
    document.title = unread > 0 ? `(${unread}) Carnet` : 'Carnet';
  }, [unread]);

  console.log(`rendu avec unread = ${unread}`);

  return (
    <main>
      <p>{unread} message(s) non lu(s)</p>
      <button type="button" onClick={() => setUnread(unread + 1)}>
        Simuler un message
      </button>
    </main>
  );
}

export default App;
```

Au chargement, l’onglet s’intitule « Carnet » ; après un clic, « (1) Carnet ». La console
affiche :

```text
rendu avec unread = 0
rendu avec unread = 0
effet : titre mis à jour avec 0
effet : titre mis à jour avec 0
rendu avec unread = 1
rendu avec unread = 1
effet : titre mis à jour avec 1
```

Lis cette sortie attentivement :

1. `useEffect` reçoit une **fonction**, l’effet, et un **tableau de dépendances**, ici
   `[unread]`.
2. L’effet ne s’exécute **pas** pendant le rendu : React l’appelle **après** avoir mis le DOM à
   jour. Le rendu reste pur ; l’effet aligne ensuite le monde extérieur (le titre) sur l’état.
3. Les rendus en double viennent de `StrictMode`, comme dans la compétence précédente. L’effet
   exécuté deux fois **au montage**, lui, est une vérification de plus, détaillée plus bas.
4. Après le clic, l’effet s’exécute de nouveau, une seule fois, car `unread` a changé.

`document.title` est en dehors de React : aucun JSX ne peut le décrire. C’est exactement le
cas d’usage d’un effet.

## Le tableau de dépendances

Le second argument dit à React **quand** relancer l’effet. Après chaque rendu, React compare
chaque valeur du tableau à celle du rendu précédent avec `Object.is` (une égalité stricte, à
quelques cas particuliers près comme `NaN`). Si au moins une valeur a changé, l’effet est
relancé.

| Écriture                         | L’effet s’exécute…                               |
| -------------------------------- | ------------------------------------------------ |
| `useEffect(fn, [a, b])`          | après le premier rendu, puis quand `a` ou `b` change |
| `useEffect(fn, [])`              | après le premier rendu seulement                 |
| `useEffect(fn)` (pas de tableau) | après **chaque** rendu                           |

La règle est simple : **toute valeur réactive lue dans l’effet figure dans le tableau**. Une
valeur réactive est une prop, un état, ou une variable calculée à partir d’eux dans le corps
du composant. Les valeurs définies hors du composant (constantes du module, fonctions
importées) n’en font pas partie.

Le tableau n’est donc pas un réglage que tu choisis pour « optimiser » : il **décrit** ce dont
l’effet dépend. Tu verras plus bas que mentir sur ces dépendances produit des bugs, et que le
linter les détecte.

## Le nettoyage : défaire ce que l’effet a fait

Voici une horloge qui compte les secondes depuis son apparition. Un bouton permet de la
masquer.

```jsx
import { useEffect, useState } from 'react';

function Clock() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    console.log('démarrage du minuteur');
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      console.log('arrêt du minuteur');
      clearInterval(id);
    };
  }, []);

  return <p>Ouvert depuis {seconds} s</p>;
}

function App() {
  const [visible, setVisible] = useState(true);
  return (
    <main>
      <button type="button" onClick={() => setVisible(!visible)}>
        {visible ? 'Masquer' : 'Afficher'} le minuteur
      </button>
      {visible && <Clock />}
    </main>
  );
}

export default App;
```

Après un peu plus de 3 secondes, la page affiche « Ouvert depuis 3 s ». Si tu masques
l’horloge, la console contient :

```text
démarrage du minuteur
arrêt du minuteur
démarrage du minuteur
arrêt du minuteur
```

La fonction **renvoyée** par l’effet s’appelle la **fonction de nettoyage** (*cleanup*). React
l’appelle :

- **avant de relancer** l’effet, quand une dépendance a changé ;
- quand le composant est **démonté**, c’est-à-dire retiré de l’écran (ici, au clic sur
  « Masquer le minuteur »).

Chaque effet qui **démarre** quelque chose doit **arrêter** ce qu’il a démarré : `setInterval`
→ `clearInterval`, `addEventListener` → `removeEventListener`, connexion → déconnexion,
requête → annulation (leçon suivante). Pense-y comme à une paire indissociable.

`setSeconds((s) => s + 1)` utilise la forme fonctionnelle vue dans la compétence précédente.
C’est indispensable ici : la fonction passée à `setInterval` a été créée au premier rendu, et
la variable `seconds` qu’elle verrait vaudrait toujours 0.

### Sans nettoyage : ce que StrictMode révèle

Retire le `return () => { … }` de l’effet et ajoute `console.log('tic')` dans la fonction
passée à `setInterval`. Résultats mesurés dans Chromium :

| Situation                                 | Affichage après 3,3 s | Après masquage                 |
| ----------------------------------------- | --------------------- | ------------------------------ |
| `npm run dev` (avec `StrictMode`)         | « Ouvert depuis 6 s »  | deux minuteurs tournent encore |
| `npm run build` puis `npm run preview`    | « Ouvert depuis 3 s »  | un minuteur tourne encore      |

En développement, l’horloge avance **deux fois trop vite** : la console affiche deux fois
« démarrage du minuteur » et jamais « arrêt du minuteur ». En production, l’affichage semble
correct, mais les « tic » continuent après le masquage : le minuteur tourne pour un composant
qui n’existe plus. C’est une **fuite** : sur une vraie application, chaque ouverture et
fermeture de l’horloge ajouterait un minuteur de plus.

## StrictMode exécute chaque effet deux fois au montage

En développement, `StrictMode` monte chaque composant, **simule un démontage**, puis le
remonte aussitôt. La séquence est donc :

```text
effet → nettoyage → effet
```

C’est ce que tu as vu dans les deux exemples précédents. Ce n’est pas un bug de React, c’est
un **test** : si ton effet et son nettoyage sont corrects, « démarrer, arrêter, démarrer »
produit le même résultat que « démarrer ». Si le nettoyage manque ou est incomplet, le défaut
devient visible immédiatement (l’horloge qui va deux fois trop vite) au lieu de se cacher
jusqu’au jour où un utilisateur ouvre et ferme dix fois le même écran.

Retiens trois choses :

- la double exécution n’existe **qu’en développement** ; en production, l’effet s’exécute une
  fois au montage ;
- la bonne réaction n’est pas de retirer `StrictMode`, ni d’ajouter une variable pour
  « empêcher la deuxième exécution », mais d’**écrire le nettoyage** ;
- pour une requête réseau, StrictMode provoque en développement **deux** requêtes au montage.
  C’est normal ; la leçon suivante montre comment la première est annulée proprement.

## Le cycle de vie d’un effet qui dépend d’une prop

Un effet ne correspond pas à « la vie du composant », mais à une **synchronisation** qui peut
démarrer et s’arrêter plusieurs fois. Exemple avec une connexion simulée à un salon de
discussion :

```jsx
import { useEffect, useState } from 'react';

// Simule un système externe : une connexion à un salon de discussion.
function createConnection(room) {
  return {
    connect: () => console.log(`connexion à « ${room} »`),
    disconnect: () => console.log(`déconnexion de « ${room} »`),
  };
}

function ChatRoom({ room }) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const connection = createConnection(room);
    connection.connect();
    return () => connection.disconnect();
  }, [room]);

  return (
    <section>
      <h2>Salon {room}</h2>
      <label htmlFor="draft">Message</label>
      <input id="draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
    </section>
  );
}

function App() {
  const [room, setRoom] = useState('général');
  return (
    <main>
      <label htmlFor="room">Salon</label>
      <select id="room" value={room} onChange={(event) => setRoom(event.target.value)}>
        <option value="général">général</option>
        <option value="entraide">entraide</option>
      </select>
      <ChatRoom room={room} />
    </main>
  );
}

export default App;
```

Au chargement, puis après avoir tapé « Bonjour » dans le champ « Message », puis choisi le
salon « entraide », la console affiche :

```text
connexion à « général »
déconnexion de « général »
connexion à « général »
déconnexion de « général »
connexion à « entraide »
```

- Les trois premières lignes : le montage, vérifié par StrictMode.
- Taper dans le champ provoque sept rendus de `ChatRoom`, mais **aucune** reconnexion :
  `room` n’a pas changé.
- Changer de salon change `room` : React appelle le nettoyage **avec les valeurs de l’ancien
  rendu** (déconnexion de « général »), puis l’effet avec les nouvelles (connexion à
  « entraide »).

Chaque rendu a ses propres valeurs de props et d’état, et chaque effet « voit » celles du rendu
qui l’a créé. C’est pour cela que le nettoyage déconnecte le bon salon.

### Mentir sur les dépendances

Variante 1 : tableau vide alors que l’effet lit `room`.

```jsx
useEffect(() => {
  const connection = createConnection(room);
  connection.connect();
  return () => connection.disconnect();
}, []); // room manque
```

Le changement de salon ne produit plus aucun message : le titre affiche « Salon entraide »,
mais la connexion est toujours celle de « général ». L’interface et le système externe sont
désynchronisés. Le linter du projet Vite le signale :

```bash
npm run lint
```

```text
src/App.jsx:15:41: warning react-hooks(exhaustive-deps): React Hook useEffect has a missing dependency: 'room' help: Either include it or remove the dependency array.
```

Variante 2 : aucun tableau. Taper « Bonjour » produit alors sept déconnexions et sept
reconnexions à « général », une par frappe. Ce n’est pas faux, mais c’est un gaspillage :
un vrai serveur de discussion verrait ses connexions s’ouvrir et se fermer en rafale.

:::tip[Active le linter dans ton éditeur]
Le projet Vite installe Oxlint, qui vérifie déjà les règles des hooks et les dépendances des
effets (`exhaustive-deps`). Lance `npm run lint` avant chaque commit ; si ton éditeur propose
une intégration d’Oxlint, active-la pour voir les avertissements pendant que tu écris. Quand il signale une
dépendance manquante, la bonne réponse est presque toujours de l’**ajouter**, puis de se
demander si l’effet est bien nécessaire. Ne le fais pas taire.
:::

## Ce à quoi useEffect ne sert pas

Un effet est un mécanisme d’**échappement** hors de React. Beaucoup de débutants (et
beaucoup d’assistants de code) en mettent partout. Deux usages sont à proscrire.

### Calculer une donnée dérivée

```jsx
import { useEffect, useState } from 'react';

const contacts = [
  { id: 1, name: 'Awa Diallo', favorite: true },
  { id: 2, name: 'Bruno Petit', favorite: false },
];

function FavoriteSummary({ contacts }) {
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    setFavoriteCount(contacts.filter((contact) => contact.favorite).length);
  }, [contacts]);

  console.log(`rendu : ${favoriteCount} favori(s)`);
  return <p>{favoriteCount} favori(s)</p>;
}

function App() {
  return <FavoriteSummary contacts={contacts} />;
}

export default App;
```

La page finit par afficher « 1 favori(s) », mais la console montre ce qui s’est passé :

```text
rendu : 0 favori(s)
rendu : 0 favori(s)
rendu : 1 favori(s)
rendu : 1 favori(s)
```

Un premier rendu avec une valeur **fausse** (0), puis l’effet corrige l’état, ce qui provoque
un second rendu. Le code est plus long, plus lent, et affiche brièvement une erreur. Le
linter le signale d’ailleurs :

```text
src/App.jsx:12:5: warning react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders
```

(suivi d’un long texte d’aide). Tu connais la bonne solution depuis la compétence
précédente : une donnée dérivée **se calcule pendant le rendu**.

```jsx
function FavoriteSummary({ contacts }) {
  const favoriteCount = contacts.filter((contact) => contact.favorite).length;
  return <p>{favoriteCount} favori(s)</p>;
}
```

Un seul rendu, toujours juste. Règle : si tu écris un effet dont le seul travail est
d’appeler un `setQuelqueChose` à partir d’autres props ou états, supprime l’effet et l’état.

### Réagir à un événement

Un envoi de formulaire, un achat, un message de confirmation : ce sont les conséquences d’une
**action précise** de l’utilisateur. Leur place est dans le gestionnaire de cet événement,
pas dans un effet déclenché par un état « drapeau » comme `submitted`. L’exercice 3 montre le
bug réel que provoque ce détour : des envois répétés à chaque frappe.

Pour t’aider à trancher, pose-toi la question : **pourquoi** ce code doit-il s’exécuter ?

- « Parce que l’utilisateur a cliqué / envoyé / choisi » → gestionnaire d’événement.
- « Parce que le composant est affiché avec ces valeurs, et que quelque chose hors de React
  doit être aligné dessus » → effet.

## Un objet dans les dépendances : la boucle infinie

Ce composant combine deux erreurs : un état dérivé calculé par un effet, et un objet recréé à
chaque rendu dans les dépendances.

```jsx
import { useEffect, useState } from 'react';

const allContacts = ['Awa Diallo', 'Bruno Petit', 'Chloé Martin'];

function filterContacts({ text, limit }) {
  return allContacts.filter((name) => name.toLowerCase().includes(text)).slice(0, limit);
}

function Results({ text }) {
  const [results, setResults] = useState([]);
  const options = { text, limit: 10 };

  useEffect(() => {
    setResults(filterContacts(options));
  }, [options]);

  return <p>{results.length} résultat(s)</p>;
}

function App() {
  return <Results text="a" />;
}

export default App;
```

La page affiche « 2 résultat(s) », mais la console se remplit sans fin (plus de 600 messages
en une seconde et demie lors de l’essai) de :

```text
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

L’enchaînement :

1. Chaque rendu crée un **nouvel** objet `options`. Deux objets créés séparément ne sont
   jamais égaux pour `Object.is`, même avec le même contenu.
2. React voit donc une dépendance « modifiée » après chaque rendu et relance l’effet.
3. L’effet appelle `setResults` avec un **nouveau** tableau (`filter` en crée toujours un) :
   nouveau rendu, nouvel objet `options`, et ainsi de suite.

Le linter avait prévenu :

```text
src/App.jsx:15:7: warning react-hooks(exhaustive-deps): React hook useEffect depends on `options`, which changes every render help: Try memoizing this variable with `useRef` or `useCallback`.
```

Ne suis pas aveuglément son conseil. La correction n’est pas une astuce sur les dépendances :
il n’y a aucun système externe ici, donc **aucun effet** à écrire.

```jsx
function Results({ text }) {
  const results = filterContacts({ text, limit: 10 });
  return <p>{results.length} résultat(s)</p>;
}
```

Quand un effet a vraiment besoin de valeurs regroupées en objet, crée l’objet **dans**
l’effet et mets ses valeurs primitives (`text`, `limit`) dans le tableau.

## Pièges courants

1. **Oublier le nettoyage** d’un minuteur, d’un écouteur ou d’une connexion : fuite, et
   comportement doublé en développement.
2. **Retirer StrictMode** pour faire disparaître la double exécution : tu masques le
   symptôme, le défaut reste en production.
3. **Omettre une dépendance** pour qu’un effet « ne s’exécute qu’une fois » : l’effet travaille
   avec des valeurs périmées.
4. **Mettre un objet, un tableau ou une fonction créés pendant le rendu** dans les
   dépendances : l’effet se relance à chaque rendu, et boucle s’il modifie l’état.
5. **Stocker une donnée dérivée** avec un effet : rendu supplémentaire et valeur fausse
   affichée brièvement. Calcule-la.
6. **Déclencher une action utilisateur** depuis un effet via un état « drapeau » : actions
   répétées ou perdues. Utilise le gestionnaire d’événement.
7. **Appeler un hook dans une condition** (`if (…) useEffect(…)`) : interdit, comme pour
   `useState`. Mets la condition **dans** l’effet.

## Exercices

### Exercice 1 — Un indicateur de connexion

Le navigateur émet les événements `online` et `offline` sur `window` quand la connexion réseau
change, et `navigator.onLine` donne l’état actuel. Écris un composant `NetworkStatus` qui
affiche « Connecté » ou « Hors ligne : les modifications ne seront pas envoyées. » dans un
paragraphe `role="status"`, et qui se met à jour quand la connexion change.

Pour tester dans Chromium : outils de développement, onglet *Network*, menu de limitation du
débit, choix *Offline*.

:::solution
```jsx
import { useEffect, useState } from 'react';

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <p role="status">
      {isOnline ? 'Connecté' : 'Hors ligne : les modifications ne seront pas envoyées.'}
    </p>
  );
}

function App() {
  return <NetworkStatus />;
}

export default App;
```

Vérifié dans Chromium en coupant puis rétablissant le réseau : « Connecté », puis le message
hors ligne, puis « Connecté ».

- Le système externe est l’objet `window` : c’est un vrai cas d’effet.
- `removeEventListener` doit recevoir **la même fonction** que `addEventListener`. C’est pour
  cela que les gestionnaires sont déclarés dans l’effet et réutilisés dans le nettoyage ;
  passer une nouvelle fonction fléchée au nettoyage ne retirerait rien.
- Le tableau est vide car l’effet ne lit aucune prop ni aucun état : `setIsOnline` est
  garanti stable par React.
- `useState(navigator.onLine)` initialise l’état avec la situation réelle au montage.
:::

### Exercice 2 — Prédire la console

Sans exécuter, écris ce qu’affiche la console (en développement, avec StrictMode) au
chargement, puis après chacune de ces actions : 1. taper « ok » dans « Note » ; 2. cliquer
sur « Changer d’utilisateur » ; 3. décocher « Notifications actives » ; 4. cliquer de nouveau
sur « Changer d’utilisateur » ; 5. recocher la case.

```jsx
import { useEffect, useState } from 'react';

function subscribe(userId) {
  console.log(`abonnement de ${userId}`);
  return () => console.log(`désabonnement de ${userId}`);
}

function Notifications({ userId }) {
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribe(userId);
    return unsubscribe;
  }, [userId, enabled]);

  return (
    <section>
      <label>
        <input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} />{' '}
        Notifications actives
      </label>
      <label htmlFor="note">Note</label>
      <input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
    </section>
  );
}

function App() {
  const [userId, setUserId] = useState('awa');
  return (
    <main>
      <button type="button" onClick={() => setUserId(userId === 'awa' ? 'bruno' : 'awa')}>
        Changer d’utilisateur
      </button>
      <Notifications userId={userId} />
    </main>
  );
}

export default App;
```

:::solution
```text
abonnement de awa
désabonnement de awa
abonnement de awa
```

1. Rien : `note` n’est pas une dépendance.
2. `désabonnement de awa` puis `abonnement de bruno`.
3. `désabonnement de bruno` : `enabled` change, React nettoie l’effet précédent ; le nouvel
   effet sort immédiatement par `return` sans rien démarrer.
4. Rien : l’effet est relancé (`userId` a changé), mais il sort aussitôt. Et il n’y a pas de
   nettoyage à appeler, puisque l’exécution précédente n’a rien renvoyé.
5. `abonnement de awa`.

Sortie vérifiée dans Chromium. Remarque que la condition est **dans** l’effet : écrire
`if (enabled) useEffect(…)` violerait les règles des hooks. La fonction `subscribe` renvoie
directement la fonction de désabonnement, que l’effet renvoie tel quel : c’est une forme
courante.
:::

### Exercice 3 — Supprimer les effets inutiles

Ce formulaire d’inscription à une lettre d’information contient deux effets. Saisis un
prénom et une adresse, envoie, puis corrige l’adresse en remplaçant `.fr` par `.com`.
Observe la console, explique le problème, puis réécris le composant sans aucun effet.

```jsx
import { useEffect, useState } from 'react';

function NewsletterForm() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [greeting, setGreeting] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setGreeting(firstName === '' ? 'Bonjour !' : `Bonjour, ${firstName} !`);
  }, [firstName]);

  useEffect(() => {
    if (submitted) {
      console.log(`inscription envoyée pour ${email}`);
    }
  }, [submitted, email]);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>{greeting}</p>
      <label htmlFor="first-name">Prénom</label>
      <input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
      <label htmlFor="email">Adresse électronique</label>
      <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button type="submit">S’inscrire</button>
    </form>
  );
}

export default NewsletterForm;
```

:::solution
Avec `ines@example.fr`, puis la correction en `ines@example.com`, la console affiche :

```text
inscription envoyée pour ines@example.fr
inscription envoyée pour ines@example.f
inscription envoyée pour ines@example.
inscription envoyée pour ines@example.c
inscription envoyée pour ines@example.co
inscription envoyée pour ines@example.com
```

Une fois `submitted` à `true`, **chaque** modification de `email` relance l’effet, qui
« envoie » de nouveau. Avec un vrai `fetch`, ce serait cinq inscriptions parasites. Le
premier effet, lui, calcule une donnée dérivée : un rendu de plus, et une salutation en
retard d’un rendu sur la saisie.

```jsx
import { useState } from 'react';

function NewsletterForm() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  // Calculé pendant le rendu : pas d’état, pas d’effet.
  const greeting = firstName === '' ? 'Bonjour !' : `Bonjour, ${firstName} !`;

  function handleSubmit(event) {
    event.preventDefault();
    // L’envoi est la conséquence d’un événement précis : il se fait ici.
    console.log(`inscription envoyée pour ${email}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>{greeting}</p>
      <label htmlFor="first-name">Prénom</label>
      <input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
      <label htmlFor="email">Adresse électronique</label>
      <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button type="submit">S’inscrire</button>
    </form>
  );
}

export default NewsletterForm;
```

Avec cette version, le même scénario n’affiche qu’**une** ligne,
`inscription envoyée pour ines@example.fr` (vérifié dans Chromium). Deux états et deux effets
ont disparu ; le code est plus court et ne peut plus se désynchroniser. Sur la version
d’origine, `npm run lint` signalait d’ailleurs l’appel à `setGreeting` dans un effet
(`set-state-in-effect`).
:::

## Récapitulatif

- Un **effet** synchronise un composant avec un **système externe** (titre du document,
  minuteur, écouteur sur `window`, connexion, serveur). Il s’exécute **après** le rendu et la
  mise à jour du DOM.
- Le **tableau de dépendances** liste toutes les valeurs réactives lues par l’effet : `[a, b]`
  relance l’effet quand l’une change, `[]` une seule fois après le montage, pas de tableau
  après chaque rendu. React compare avec `Object.is`.
- La **fonction de nettoyage** renvoyée par l’effet défait ce qu’il a démarré ; React l’appelle
  avant chaque nouvelle exécution et au démontage.
- En développement, **StrictMode** exécute « effet → nettoyage → effet » au montage pour
  révéler les nettoyages manquants. On corrige l’effet, on ne retire pas StrictMode.
- **Pas d’effet** pour une donnée dérivée (on la calcule pendant le rendu) ni pour réagir à un
  événement (on agit dans le gestionnaire).
- Un objet ou un tableau créé pendant le rendu change à chaque rendu : en dépendance d’un effet
  qui modifie l’état, il provoque une boucle infinie.
- `npm run lint` (Oxlint) signale les dépendances manquantes ou instables et les `setState`
  appelés directement dans un effet.
