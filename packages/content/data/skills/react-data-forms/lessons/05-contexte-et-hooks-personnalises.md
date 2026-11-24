---
title: Partager un état avec un contexte et extraire des hooks personnalisés
summary: Fournir une valeur à tout un sous-arbre avec createContext, un fournisseur et useContext, connaître les limites du contexte, et regrouper une logique réutilisable dans des hooks personnalisés comme useFetch et useFormFields.
durationMinutes: 65
sources:
  - title: React — createContext
    url: https://fr.react.dev/reference/react/createContext
  - title: React — useContext
    url: https://fr.react.dev/reference/react/useContext
  - title: React — Transmettre des données en profondeur avec le contexte
    url: https://fr.react.dev/learn/passing-data-deeply-with-context
  - title: React — Réutiliser de la logique grâce aux Hooks personnalisés
    url: https://fr.react.dev/learn/reusing-logic-with-custom-hooks
---

## Deux problèmes de croissance

Le carnet grandit, et deux gênes apparaissent.

**Des props qui traversent tout.** On veut un thème clair ou sombre. Le bouton qui le change
est dans l’en-tête, mais demain la fiche, la liste et le formulaire voudront peut-être adapter
une icône ou un graphique au thème. Avec les seules props, `App` devrait transmettre `theme`
et `toggleTheme` à chaque composant intermédiaire, même à ceux qui ne s’en servent pas. On
appelle cela le *prop drilling*, littéralement « forer à travers les props ». Tu l’as
rencontré à la fin de la compétence précédente : à petite échelle, c’est normal ; quand une
même valeur concerne une grande partie de l’application, cela devient pénible.

**Une logique recopiée.** Le chargement « résultat + identifiant + `AbortController` +
nettoyage » de `ContactDetail` sera nécessaire dans chaque écran qui affiche une ressource. Et
la gestion de `values`, `touched` et `handleChange` du formulaire resservira dans tout
formulaire. Recopier ces blocs, c’est recopier leurs bugs.

React répond au premier problème par le **contexte**, au second par les **hooks
personnalisés**.

## Le contexte en trois étapes

Un **contexte** permet à un composant de **fournir** une valeur à tout son sous-arbre, et à
n’importe quel descendant de la **lire**, sans passer par les composants intermédiaires.

### 1. Créer le contexte

```js
// src/theme/ThemeContext.js — le contexte et le hook qui le lit
import { createContext, useContext } from 'react';

export const ThemeContext = createContext(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme doit être appelé dans un composant placé sous <ThemeProvider>.');
  }
  return value;
}
```

- `createContext(valeurParDéfaut)` crée l’objet contexte. On l’exporte : le fournisseur et les
  lecteurs en ont besoin.
- `useContext(ThemeContext)` lit la valeur fournie par le **fournisseur le plus proche** au-dessus
  du composant.
- La valeur par défaut, `null`, n’est utilisée que s’il n’y a **aucun** fournisseur au-dessus.
  Le hook `useTheme` transforme ce cas en erreur explicite, plutôt que de laisser une erreur
  obscure apparaître plus loin, quand un composant essaie de déstructurer `null`.

### 2. Fournir une valeur

```jsx
// src/theme/ThemeProvider.jsx — le composant qui détient l’état et le fournit
import { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContext.js';

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // Synchroniser un élément hors de React : l’attribut data-theme de <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>;
}

export default ThemeProvider;
```

Avec React 19, **le contexte lui-même s’utilise comme composant fournisseur** :
`<ThemeContext value={…}>`. Tu trouveras dans du code plus ancien et dans beaucoup de réponses
d’IA l’écriture `<ThemeContext.Provider value={…}>`. Elle fonctionne toujours (vérifié avec
React 19.3, sans avertissement), mais l’équipe de React a annoncé qu’elle serait dépréciée
dans une version future : écris `<ThemeContext value={…}>`.

Le fournisseur détient l’état (`theme`) et le fournit avec la fonction qui le change
(`toggleTheme`). Fournir un objet `{ theme, toggleTheme }` est la forme la plus courante : les
descendants peuvent lire **et** modifier.

L’effet synchronise l’attribut `data-theme` de l’élément `html` : c’est un élément hors de
l’arbre React, donc un vrai système externe, comme `document.title` à la leçon 1.

Enveloppe l’application dans `src/main.jsx` :

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ThemeProvider from './theme/ThemeProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

et remplace le contenu de `src/index.css` par des couleurs pour les deux thèmes :

```css
:root {
  font-family: system-ui, sans-serif;
  color-scheme: light;
  color: #1a1a1a;
  background: #ffffff;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  color: #f0f0f0;
  background: #1a1a1a;
}
```

### 3. Lire la valeur

```jsx
import { useTheme } from '../theme/ThemeContext.js';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" aria-pressed={theme === 'dark'} onClick={toggleTheme}>
      Thème sombre
    </button>
  );
}

export default ThemeToggle;
```

Dans `App.jsx`, importe `ThemeToggle` et place-le à côté du titre, dans un `header`. Vérifié
dans Chromium : au départ, `data-theme="light"`, `aria-pressed="false"` et un fond blanc ; après
un clic, `data-theme="dark"`, `aria-pressed="true"` et un fond `rgb(26, 26, 26)`.

`ThemeToggle` ne reçoit **aucune** prop : il va chercher la valeur dans le contexte. Entre
`ThemeProvider` et lui, `App` n’a rien eu à transmettre.

### Pourquoi deux fichiers ?

On pourrait tout écrire dans un seul fichier. Mais le linter du projet Vite avertit alors :

```text
warning react(only-export-components): Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components.
```

Le rechargement à chaud de Vite (leçon 1 de la compétence précédente) ne fonctionne bien que
pour les fichiers qui n’exportent que des composants. On sépare donc le contexte et le hook
(`ThemeContext.js`) du composant fournisseur (`ThemeProvider.jsx`).

## Qui se met à jour quand la valeur change ?

Ajoute un `console.log` au début de `App` et de `ThemeToggle`, puis clique sur « Thème
sombre ». La console affiche seulement (deux fois, à cause de StrictMode) :

```text
rendu de ThemeToggle (dark)
rendu de ThemeToggle (dark)
```

`App` ne se re-rend **pas** : `ThemeProvider` se re-rend car son état a changé, mais son
`children` est le même élément `<App />` qu’avant, créé dans `main.jsx`. React re-rend en
revanche **tous les composants qui lisent le contexte**, où qu’ils soient, dès que la valeur
fournie change. Comme `ThemeProvider` crée un nouvel objet `{ theme, toggleTheme }` à chacun de
ses rendus, chaque rendu du fournisseur compte comme un changement.

## Les limites du contexte

Le contexte est un **moyen de transport**, pas une solution miracle. Ses limites :

1. **Chaque changement de valeur re-rend tous les lecteurs.** Pour un thème ou l’utilisateur
   connecté, qui changent rarement, c’est négligeable. Pour une valeur qui change à chaque
   frappe ou plusieurs fois par seconde, un grand contexte partagé ferait re-rendre une bonne
   partie de l’application.
2. **Une dépendance cachée.** Un composant qui appelle `useTheme()` ne fonctionne plus seul :
   il exige un fournisseur au-dessus de lui. Ses props ne le disent pas. En test, il faudra
   l’envelopper (leçon 6) ; sans fournisseur, l’erreur de `useTheme` le rappelle.
3. **Pas pour tout.** Si une valeur ne traverse qu’un ou deux niveaux, les props restent plus
   simples et plus explicites. Souvent, on évite aussi le *prop drilling* en passant des
   composants en `children` plutôt qu’en ajoutant un contexte.
4. **Pas un stockage.** L’état vit dans le fournisseur : il disparaît au rechargement de la
   page, comme tout état React.
5. **Pas une sécurité.** Un contexte « utilisateur connecté » sert à adapter l’**affichage**
   (masquer un bouton). Il ne protège rien : toute action doit être autorisée par le serveur,
   car le code du navigateur peut être modifié par l’utilisateur.

Les bons candidats : le thème, la langue, l’utilisateur connecté, des préférences d’affichage.
Les données de l’API, elles, restent en général là où elles sont chargées.

## Les hooks personnalisés

Un **hook personnalisé** est une fonction JavaScript dont le nom commence par `use`, et qui
appelle d’autres hooks. Il permet d’extraire une **logique avec état** d’un composant pour la
réutiliser. Tu en as déjà écrit un : `useTheme`, qui appelle `useContext`.

### Règles de nommage et d’usage

- Le nom commence par **`use` suivi d’une majuscule** : `useFetch`, `useFormFields`,
  `useOnlineStatus`. C’est une convention imposée par l’outillage : le linter applique les
  règles des hooks **à partir du nom**. Une fonction `loadGroup` qui appelle `useState` est
  signalée comme une erreur (exercice 3).
- Un hook personnalisé obéit aux **règles des hooks** : appelé au premier niveau d’un composant
  ou d’un autre hook, jamais dans une condition ou une boucle.
- Une fonction qui n’appelle **aucun** hook ne doit pas commencer par `use` : c’est une
  fonction ordinaire (comme `validateContact`), utilisable partout, y compris dans une
  condition.
- Chaque appel d’un hook a **son propre état**. Deux composants qui appellent `useFormFields`
  ont chacun leurs valeurs : un hook partage une **logique**, pas des **données**. Pour partager
  des données, on remonte l’état ou on utilise un contexte.

### `useFetch` : charger une ressource

Le chargement de `ContactDetail` (leçon 2) devient, dans `src/hooks/useFetch.js` :

```js
// src/hooks/useFetch.js — charger une ressource JSON depuis l’API
import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export function useFetch(url) {
  // Le résultat garde l’adresse à laquelle il correspond.
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await apiRequest(url, { signal: controller.signal });
        setResult({ url, data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setResult({ url, data: null, error });
      }
    }
    load();
    return () => controller.abort();
  }, [url]);

  if (result === null || result.url !== url) {
    return { isLoading: true, data: null, error: null };
  }
  return { isLoading: false, data: result.data, error: result.error };
}
```

Et `ContactDetail` ne contient plus que l’affichage :

```jsx
import { describeError } from '../api.js';
import { useFetch } from '../hooks/useFetch.js';

function ContactDetail({ contactId }) {
  const { isLoading, data: contact, error } = useFetch(`/api/contacts/${contactId}`);

  if (isLoading) return <p>Chargement de la fiche…</p>;
  if (error) return <p>Erreur : {describeError(error)}</p>;
  return (
    <article>
      <h2>{contact.name}</h2>
      <p>Courriel : {contact.email}</p>
      <p>Groupe : {contact.group}</p>
    </article>
  );
}

export default ContactDetail;
```

Le comportement est identique (vérifié avec les deux scénarios de la leçon 2 : Awa puis Bruno,
Bruno puis Chloé), mais `ContactDetail` passe de 48 à 18 lignes, et tout futur écran appellera
`useFetch('/api/…')`.

Quelques choix méritent explication :

- Le hook prend une **adresse** (une chaîne) et non un objet d’options : une chaîne est une
  valeur primitive, stable d’un rendu à l’autre, sans risque de boucle dans les dépendances.
- Il renvoie un **objet** `{ isLoading, data, error }` : l’appelant choisit ses noms par
  déstructuration (`data: contact`).
- `isLoading` est toujours dérivé, comme à la leçon 2. Le hook n’expose pas `setResult` :
  personne ne peut le mettre dans un état incohérent.

`App` garde son propre chargement, car il modifie la liste (leçon 4). Un hook n’est pas fait
pour couvrir tous les cas : les bibliothèques de données évoquées à la leçon 2 sont, au fond,
des `useFetch` beaucoup plus complets.

### `useFormFields` : l’état d’un formulaire

Dans `src/hooks/useFormFields.js` :

```js
// src/hooks/useFormFields.js — l’état d’un formulaire contrôlé
import { useState } from 'react';

export function useFormFields(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function reset() {
    setValues(initialValues);
    setTouched({});
  }

  return { values, touched, handleChange, handleBlur, reset };
}
```

Dans `ContactForm.jsx`, les deux `useState` de `values` et `touched`, `handleChange` et
`handleBlur` disparaissent au profit d’une ligne :

```jsx
const { values, touched, handleChange, handleBlur, reset } = useFormFields(initialValues);
```

Le formulaire ajoute sa propre logique par-dessus, pour effacer l’erreur serveur d’un champ
modifié :

```jsx
function handleFieldChange(event) {
  handleChange(event);
  setServerErrors({ ...serverErrors, [event.target.name]: undefined });
}
```

Chaque `onChange={handleChange}` devient `onChange={handleFieldChange}`, et les deux remises à
zéro après un succès deviennent `reset()`. Tout le reste est inchangé, et le comportement aussi
(vérifié : focus sur « Nom » et trois erreurs après un envoi à vide).

Dans le hook, les mises à jour utilisent la forme fonctionnelle (`setValues((current) => …)`) :
le hook ne sait pas dans quel contexte il sera appelé, il prend donc la forme sûre.

### Quand extraire un hook ?

- Quand la **même logique avec état** apparaît dans deux composants ou plus.
- Quand un composant devient long parce qu’il mélange une mécanique (chargement, abonnement,
  état de formulaire) et son affichage : nommer la mécanique la rend lisible.
- Pas pour « ranger » : un hook qui ne sert qu’une fois et cache trois lignes rend le code plus
  difficile à suivre. Et une logique **sans** hook s’extrait dans une fonction ordinaire.

Un bon nom décrit **ce que** le hook fournit, pas comment : `useOnlineStatus`, pas
`useWindowListeners`.

## Pièges courants

1. **Lire un contexte sans fournisseur** : on obtient la valeur par défaut sans le savoir.
   Protège-toi avec un hook qui lève une erreur explicite.
2. **Écrire `<ThemeContext.Provider>` par habitude** : fonctionne encore, mais l’écriture
   actuelle est `<ThemeContext value={…}>`.
3. **Mettre dans un contexte des valeurs qui changent sans cesse** : re-rendus en cascade.
4. **Un contexte par réflexe** pour une valeur qui traverse un seul niveau : les props suffisent.
5. **Croire qu’un hook partage son état** entre les composants qui l’appellent : chacun a le
   sien.
6. **Nommer un hook sans `use`**, ou nommer `useX` une fonction sans hook : le linter vérifie
   mal, et le lecteur est trompé.
7. **Passer un objet ou un tableau créé pendant le rendu en paramètre d’un hook** qui le met
   dans ses dépendances : boucle infinie, comme à la leçon 1.
8. **Croire qu’un contexte « utilisateur » protège** une action : seul le serveur autorise.

## Exercices

### Exercice 1 — `useOnlineStatus`

Transforme le composant `NetworkStatus` de l’exercice 1 de la leçon 1 en hook
`useOnlineStatus()` qui renvoie un booléen. Utilise-le dans deux composants : `NetworkStatus`,
qui affiche « Connecté » ou « Hors ligne », et `SaveButton`, qui affiche « Enregistrer » ou,
hors ligne, « Reconnexion… » avec `aria-disabled`.

:::solution
```js
// src/hooks/useOnlineStatus.js
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
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

  return isOnline;
}
```

```jsx
import { useOnlineStatus } from './hooks/useOnlineStatus.js';

function NetworkStatus() {
  const isOnline = useOnlineStatus();
  return <p role="status">{isOnline ? 'Connecté' : 'Hors ligne'}</p>;
}

function SaveButton() {
  const isOnline = useOnlineStatus();
  return (
    <button type="button" aria-disabled={!isOnline}>
      {isOnline ? 'Enregistrer' : 'Reconnexion…'}
    </button>
  );
}

function App() {
  return (
    <main>
      <NetworkStatus />
      <SaveButton />
    </main>
  );
}

export default App;
```

Vérifié dans Chromium en coupant le réseau : « Connecté » et « Enregistrer » deviennent « Hors
ligne » et « Reconnexion… ».

- Le corps du hook est **exactement** celui de l’ancien composant, sans le JSX : un hook
  personnalisé se crée souvent ainsi, en déplaçant la logique d’un composant existant.
- Les deux composants appellent le hook séparément : chacun a son état et ses écouteurs. Ici
  cela ne pose aucun problème, car les deux reflètent le même système externe.
:::

### Exercice 2 — L’utilisateur connecté

Crée un contexte d’utilisateur : un `UserProvider` qui détient `user` (au départ
`{ name: 'Invité', role: 'guest' }`) et fournit `{ user, logIn, logOut }` ; un hook
`useCurrentUser` ; un composant `UserBar` dans l’en-tête qui affiche « Connecté en tant que
… » et un bouton « Se connecter (démo) » ou « Se déconnecter ». Dans `ContactList`, le bouton
« Supprimer » n’apparaît que pour un utilisateur de rôle `admin`. Il n’y a pas de vraie
authentification : `logIn('Inès')` donne simplement le rôle `admin`.

:::solution
```js
// src/user/UserContext.js
import { createContext, useContext } from 'react';

export const UserContext = createContext(null);

export function useCurrentUser() {
  const value = useContext(UserContext);
  if (value === null) {
    throw new Error('useCurrentUser doit être appelé sous <UserProvider>.');
  }
  return value;
}
```

```jsx
// src/user/UserProvider.jsx
import { useState } from 'react';
import { UserContext } from './UserContext.js';

const guest = { name: 'Invité', role: 'guest' };

function UserProvider({ children }) {
  const [user, setUser] = useState(guest);

  function logIn(name) {
    setUser({ name, role: 'admin' });
  }
  function logOut() {
    setUser(guest);
  }

  return <UserContext value={{ user, logIn, logOut }}>{children}</UserContext>;
}

export default UserProvider;
```

```jsx
// src/components/UserBar.jsx
import { useCurrentUser } from '../user/UserContext.js';

function UserBar() {
  const { user, logIn, logOut } = useCurrentUser();
  return (
    <p>
      Connecté en tant que {user.name}{' '}
      {user.role === 'guest' ? (
        <button type="button" onClick={() => logIn('Inès')}>
          Se connecter (démo)
        </button>
      ) : (
        <button type="button" onClick={logOut}>
          Se déconnecter
        </button>
      )}
    </p>
  );
}

export default UserBar;
```

Dans `main.jsx`, place `<UserProvider>` autour de `<App />`, à l’intérieur de
`<ThemeProvider>`. Dans `App.jsx`, ajoute `<UserBar />` dans le `header`. Dans `ContactList`,
lis l’utilisateur et entoure le bouton « Supprimer » d’une condition :

```jsx
const { user } = useCurrentUser(); // au premier niveau, avant le return anticipé

// …
{user.role === 'admin' && (
  <button
    type="button"
    aria-disabled={contact.id === deletingId}
    onClick={() => onDelete(contact)}
  >
    {contact.id === deletingId ? 'Suppression…' : 'Supprimer'}
  </button>
)}
```

Vérifié dans Chromium : en invité, aucun bouton « Supprimer » ; après « Se connecter (démo) »,
« Connecté en tant que Inès » et un bouton par contact ; après « Se déconnecter », ils
disparaissent.

- `useCurrentUser()` est appelé **avant** le `return` anticipé de la liste vide, pour respecter
  les règles des hooks.
- Masquer le bouton améliore l’interface, mais **ne sécurise rien** : n’importe qui peut
  envoyer un `DELETE` avec `curl`. L’API devra vérifier l’identité et les droits ; c’est le
  sujet de la compétence sur l’authentification.
:::

### Exercice 3 — Trois erreurs de hooks

Trouve les erreurs de ce code, explique-les, puis corrige.

```jsx
import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

// Charge les contacts d’un groupe.
function loadGroup(group) {
  const [contacts, setContacts] = useState([]);
  useEffect(() => {
    apiRequest(`/api/contacts?group=${group}`).then(setContacts);
  }, [group]);
  return contacts;
}

function GroupView({ group, showCount }) {
  const contacts = loadGroup(group);
  if (!showCount) return null;
  const { values } = useFormFieldsLike();
  return <p>{contacts.length} contact(s) {values}</p>;
}

function useFormFieldsLike() {
  return { values: '' };
}

export default GroupView;
```

:::solution
`npm run lint` signale trois erreurs (extraits) :

```text
error react-hooks(rules-of-hooks): React Hook "useState" is called in function "loadGroup" that is neither a React function component nor a custom React Hook function.
error react-hooks(rules-of-hooks): React Hook "useEffect" is called in function "loadGroup" that is neither a React function component nor a custom React Hook function.
error react-hooks(rules-of-hooks): React Hook "useFormFieldsLike" is called conditionally. React Hooks must be called in the exact same order in every component render.
```

1. `loadGroup` appelle des hooks mais ne commence pas par `use` : pour React et pour le linter,
   ce n’est ni un composant ni un hook. Renomme-la `useGroupContacts`.
2. `useFormFieldsLike` est appelé **après** un `return` anticipé : l’ordre des hooks changerait
   selon `showCount`. Appelle-le avant la condition.
3. À l’inverse, `useFormFieldsLike` n’appelle aucun hook : ce n’est pas un hook, il ne devrait
   pas porter le préfixe `use` (une fonction ordinaire `getEmptyValues` conviendrait).

Le linter ne voit pas un quatrième défaut : l’effet n’a ni nettoyage ni gestion d’erreur.
Changer rapidement de groupe provoque une course, et un rejet d’`apiRequest` (404, serveur
injoignable) n’est jamais traité. Une version corrigée réutilise simplement `useFetch` :

```jsx
import { useFetch } from '../hooks/useFetch.js';

function GroupView({ group, showCount }) {
  const { data: contacts } = useFetch(`/api/contacts?group=${encodeURIComponent(group)}`);
  if (!showCount || contacts === null) return null;
  return <p>{contacts.length} contact(s)</p>;
}

export default GroupView;
```

Vérifié dans Chromium avec `<GroupView group="amis" showCount />` : « 4 contact(s) ». L’API
du carnet ignore le paramètre `group` et renvoie tous les contacts : l’exercice porte sur la
structure du code.
:::

## Récapitulatif

- Un **contexte** transmet une valeur à tout un sous-arbre : `createContext` pour le créer,
  `<MonContexte value={…}>` pour la fournir (écriture de React 19), `useContext` pour la lire.
- On fournit souvent un état et sa fonction de mise à jour ; un hook comme `useTheme` lit le
  contexte et signale l’absence de fournisseur.
- Quand la valeur change, **tous les composants qui la lisent** se re-rendent. Le contexte
  convient aux valeurs globales qui changent peu (thème, langue, utilisateur) ; il crée une
  dépendance implicite et ne remplace ni les props, ni un stockage, ni une autorisation côté
  serveur.
- Un **hook personnalisé** est une fonction `useXxx` qui appelle des hooks pour réutiliser une
  logique avec état. Il suit les règles des hooks, et chaque appel a son propre état.
- `useFetch` encapsule chargement, annulation et états ; `useFormFields` encapsule valeurs,
  champs quittés et gestionnaires. Les composants ne gardent que ce qui leur est propre.
