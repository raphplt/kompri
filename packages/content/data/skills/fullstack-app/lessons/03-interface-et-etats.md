---
title: Relier l’interface à l’API
summary: Construire l’interface HTML, CSS et JavaScript du projet, centraliser les appels à l’API et gérer explicitement les états de chargement, d’erreur, de vide et de succès.
durationMinutes: 80
sources:
  - title: MDN — Utiliser l’API Fetch
    url: https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
  - title: MDN — AbortSignal.timeout()
    url: https://developer.mozilla.org/fr/docs/Web/API/AbortSignal/timeout_static
  - title: MDN — ARIA, rôle status
    url: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
  - title: MDN — SubmitEvent.submitter
    url: https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter
---

## Le problème : une interface a beaucoup plus d’états qu’on ne croit

Quand on imagine une liste de tâches, on pense à **un** écran : la liste remplie. En réalité,
l’interface passe par bien d’autres situations : la page qui charge, le visiteur non connecté,
la liste vide, la requête en cours, le serveur qui ne répond pas, la session qui expire au
milieu d’une action. Une interface fragile ne gère que le cas heureux ; les autres produisent
des écrans figés, des boutons qui ne font rien, ou des erreurs dans la console.

La parade est de **nommer les états** et de faire dépendre tout l’affichage d’un seul objet,
`state`. On applique une règle simple :

1. une action (clic, envoi de formulaire, réponse de l’API) calcule un **nouvel état** ;
2. une fonction `render()` met **tout** le DOM en accord avec cet état.

On ne modifie jamais le DOM « à la main » ailleurs que dans `render()`. Ainsi, il est
impossible d’afficher à la fois le formulaire de connexion et la liste, ou d’oublier de
réactiver un bouton.

## Les états de l’interface

| `status` | Situation | Ce qui est affiché |
| --- | --- | --- |
| `loading` | Au démarrage, on interroge `GET /api/auth/me` | « Chargement… » |
| `anonymous` | Pas de session valide | Le formulaire de connexion |
| `ready` | Utilisateur connecté, tâches chargées | La liste, le filtre, le compteur, l’e-mail et la déconnexion |
| `failed` | Le serveur ne répond pas au démarrage | Le message d’erreur seulement |

S’y ajoutent deux informations transversales :

- `busy` : une requête est en cours ; les boutons sont désactivés pour éviter les doubles
  envois ;
- `error` : le message de la dernière erreur, affiché dans une zone `role="alert"`.

Et une précision d’affichage dans l’état `ready` : si la liste filtrée est **vide**, on
affiche « Aucune tâche à afficher. » au lieu d’une liste blanche sans explication.

## La page HTML

```html
<!-- public/index.html -->
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mes tâches</title>
  <link rel="stylesheet" href="/styles.css">
  <script type="module" src="/app.js"></script>
</head>
<body>
  <header class="topbar">
    <h1>Mes tâches</h1>
    <div id="account" hidden>
      <span id="user-email"></span>
      <button type="button" id="logout" class="secondary">Se déconnecter</button>
    </div>
  </header>

  <main>
    <p id="loading" role="status">Chargement…</p>
    <p id="error" class="error" role="alert" hidden></p>

    <section id="auth" hidden aria-labelledby="auth-title">
      <h2 id="auth-title">Connexion</h2>
      <form id="auth-form">
        <label for="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autocomplete="username" required>
        <label for="password">Mot de passe (15 caractères au moins)</label>
        <input id="password" name="password" type="password" autocomplete="current-password"
          required minlength="15" maxlength="128">
        <div class="actions">
          <button type="submit" value="login">Se connecter</button>
          <button type="submit" value="register" class="secondary">Créer un compte</button>
        </div>
      </form>
    </section>

    <section id="board" hidden aria-labelledby="board-title">
      <h2 id="board-title" class="visually-hidden">Liste des tâches</h2>
      <form id="task-form">
        <label for="title">Nouvelle tâche</label>
        <div class="row">
          <input id="title" name="title" required maxlength="200" autocomplete="off">
          <button type="submit">Ajouter</button>
        </div>
      </form>
      <div class="filters" role="group" aria-label="Filtrer les tâches">
        <button type="button" data-filter="all" aria-pressed="true">Toutes</button>
        <button type="button" data-filter="open" aria-pressed="false">À faire</button>
        <button type="button" data-filter="done" aria-pressed="false">Terminées</button>
      </div>
      <ul id="tasks"></ul>
      <p id="empty" hidden>Aucune tâche à afficher.</p>
      <p id="remaining" role="status"></p>
    </section>
  </main>
</body>
</html>
```

Ce qui compte pour l’accessibilité :

- chaque champ a un `label` associé par `for`/`id` ; `autocomplete="username"` et
  `current-password` aident les gestionnaires de mots de passe ;
- l’attribut `hidden` masque une section pour tout le monde, lecteurs d’écran compris ;
- `role="status"` (chargement, compteur) annonce poliment les changements ; `role="alert"`
  (erreur) les annonce immédiatement ;
- les filtres sont des boutons à bascule : `aria-pressed` indique lequel est actif ;
- le titre `h2` « Liste des tâches » est masqué visuellement mais lu par les lecteurs d’écran
  (classe `visually-hidden`), pour garder une structure de titres cohérente ;
- le formulaire de connexion a **deux** boutons d’envoi ; l’attribut `value` dira lequel a été
  utilisé.

Aucun script ni style en ligne : la CSP `default-src 'self'` de l’API est respectée.

## La feuille de style

Mobile d’abord : une colonne, des éléments qui passent à la ligne (`flex-wrap`), une largeur
maximale de 40 rem sur grand écran.

```css
/* styles.css — mobile d’abord, une colonne lisible sur grand écran */
:root {
  --accent: #1d4ed8;
  --text: #1f2937;
  --muted: #6b7280;
  --danger: #b91c1c;
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: var(--text);
  line-height: 1.5;
}

.topbar,
main {
  max-width: 40rem;
  margin-inline: auto;
  padding: 1rem;
}

.topbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

label {
  display: block;
  margin-block: 0.75rem 0.25rem;
}

input[type='email'],
input[type='password'],
input:not([type]) {
  width: 100%;
  padding: 0.5rem;
  font: inherit;
  border: 1px solid var(--muted);
  border-radius: var(--radius);
}

button {
  padding: 0.5rem 0.9rem;
  font: inherit;
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  cursor: pointer;
}

button.secondary,
.filters button[aria-pressed='false'] {
  color: var(--accent);
  background: #fff;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

.row,
.actions,
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 0.75rem;
}

.row input {
  flex: 1 1 12rem;
}

#tasks {
  padding: 0;
  list-style: none;
}

#tasks li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

#tasks label {
  margin: 0;
}

#tasks li.done label {
  color: var(--muted);
  text-decoration: line-through;
}

.error {
  padding: 0.5rem;
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

`:focus-visible` dessine un contour net autour de l’élément qui a le focus au clavier. Le
sélecteur `.filters button[aria-pressed='false']` stylise le filtre inactif à partir de
l’attribut d’accessibilité lui-même : l’apparence ne peut pas contredire l’état annoncé.

## Un seul endroit pour appeler l’API

Tous les appels passent par une fonction `api()`, qui uniformise trois choses : l’envoi du JSON,
la lecture de la réponse et la transformation de **toutes** les erreurs en `ApiError`.

```js
// public/api.js — un seul endroit pour parler à l’API
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 quand le serveur n’a pas répondu
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000), // abandon après 10 secondes
    });
  } catch (error) {
    const message =
      error.name === 'TimeoutError' ? 'Le serveur ne répond pas.' : 'Impossible de joindre le serveur.';
    throw new ApiError(0, message);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `Erreur ${response.status}`);
  }
  return data;
}
```

- `fetch` ne rejette sa promesse **que** si la requête n’a pas pu aboutir (réseau coupé,
  serveur arrêté, délai dépassé). Une réponse 400 ou 500 est une réponse : c’est à nous de
  tester `response.ok`.
- `AbortSignal.timeout(10_000)` annule la requête après 10 secondes ; l’erreur s’appelle alors
  `TimeoutError`. Sans cela, une interface peut attendre indéfiniment.
- Un 204 n’a pas de corps : appeler `response.json()` lèverait une erreur.
- `status: 0` distingue « le serveur n’a pas répondu » d’une vraie réponse d’erreur.
- Aucune option `credentials` : par défaut, `fetch` envoie les cookies aux requêtes de **même
  origine**, ce qui est notre cas.

## L’état et ses transformations

Les transformations de l’état sont des **fonctions pures** : elles ne touchent ni au DOM ni au
réseau, reçoivent des données et en renvoient de nouvelles. On pourra donc les tester avec
`node:test`, sans navigateur.

```js
// public/state.js — l’état de l’interface et des fonctions pures pour le transformer
export const initialState = Object.freeze({
  status: 'loading', // 'loading' | 'anonymous' | 'ready' | 'failed'
  user: null,
  tasks: [],
  filter: 'all', // 'all' | 'open' | 'done'
  error: null,
  busy: false,
});

// Tâches à faire d’abord, puis les plus récentes en premier (comme l’API)
export function sortTasks(tasks) {
  return tasks.toSorted(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      b.created_at.localeCompare(a.created_at) ||
      b.id - a.id,
  );
}

export function upsertTask(tasks, task) {
  const others = tasks.filter((existing) => existing.id !== task.id);
  return sortTasks([...others, task]);
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function visibleTasks(tasks, filter) {
  if (filter === 'open') return tasks.filter((task) => !task.done);
  if (filter === 'done') return tasks.filter((task) => task.done);
  return tasks;
}

export function remainingLabel(tasks) {
  const count = tasks.filter((task) => !task.done).length;
  if (count === 0) return 'Aucune tâche restante';
  return count === 1 ? '1 tâche restante' : `${count} tâches restantes`;
}
```

- `toSorted` (ES2023) renvoie un **nouveau** tableau trié, sans modifier l’original,
  contrairement à `sort`. `upsertTask` et `removeTask` ne modifient jamais le tableau reçu.
- L’ordre reproduit celui de l’API (`ORDER BY done, created_at DESC, id DESC`) : quand une tâche
  change, elle reprend sa place sans recharger toute la liste. `created_at` est une date ISO en
  UTC ; comparer ces chaînes par `localeCompare` revient à comparer les dates.
- `Object.freeze` empêche de modifier `initialState` par erreur.

## Le contrôleur : actions et affichage

```js
// public/app.js — relie l’interface à l’API ; tout l’affichage dépend de `state`
import { api, ApiError } from './api.js';
import { initialState, removeTask, remainingLabel, upsertTask, visibleTasks } from './state.js';

const $ = (selector) => document.querySelector(selector);
let state = initialState;

function setState(changes) {
  state = { ...state, ...changes };
  render();
}

// --- Affichage -------------------------------------------------------------
function render() {
  $('#loading').hidden = state.status !== 'loading';
  $('#auth').hidden = state.status !== 'anonymous';
  $('#board').hidden = state.status !== 'ready';
  $('#account').hidden = state.status !== 'ready';
  $('#user-email').textContent = state.user?.email ?? '';
  $('#error').hidden = state.error === null;
  $('#error').textContent = state.error ?? '';
  for (const button of document.querySelectorAll('form button, #logout')) {
    button.disabled = state.busy;
  }
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
  }
  renderTasks();
}

function renderTasks() {
  const tasks = visibleTasks(state.tasks, state.filter);
  const items = tasks.map((task) => {
    const item = document.createElement('li');
    item.dataset.id = String(task.id);
    item.classList.toggle('done', task.done);

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.dataset.action = 'toggle';
    checkbox.disabled = state.busy;
    label.append(checkbox, ` ${task.title}`); // le titre est inséré comme texte

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.dataset.action = 'delete';
    remove.textContent = 'Supprimer';
    remove.setAttribute('aria-label', `Supprimer « ${task.title} »`);
    remove.disabled = state.busy;

    item.append(label, remove);
    return item;
  });
  $('#tasks').replaceChildren(...items);
  $('#empty').hidden = tasks.length > 0;
  $('#remaining').textContent = remainingLabel(state.tasks);
}

// --- Actions ---------------------------------------------------------------
// Exécute une action asynchrone : occupe l’interface, affiche les erreurs
async function run(action) {
  setState({ busy: true, error: null });
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && state.status === 'ready') {
      setState({ ...initialState, status: 'anonymous', error: 'Ta session a expiré, reconnecte-toi.' });
    } else {
      setState({ error: error.message });
    }
  } finally {
    setState({ busy: false });
  }
}

$('#auth-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const mode = event.submitter?.value === 'register' ? 'register' : 'login';
  const { email, password } = Object.fromEntries(new FormData(form));
  run(async () => {
    const { user } = await api(`/api/auth/${mode}`, { method: 'POST', body: { email, password } });
    const tasks = await api('/api/tasks');
    form.reset();
    setState({ status: 'ready', user, tasks });
    $('#title').focus();
  });
});

$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const title = new FormData(form).get('title');
  run(async () => {
    const task = await api('/api/tasks', { method: 'POST', body: { title } });
    form.reset();
    setState({ tasks: upsertTask(state.tasks, task) });
  });
});

// Délégation : un seul écouteur pour toutes les cases et tous les boutons de la liste
$('#tasks').addEventListener('change', (event) => {
  if (event.target.dataset.action !== 'toggle') return;
  const id = Number(event.target.closest('li').dataset.id);
  const done = event.target.checked;
  run(async () => {
    const task = await api(`/api/tasks/${id}`, { method: 'PATCH', body: { done } });
    setState({ tasks: upsertTask(state.tasks, task) });
  });
});

$('#tasks').addEventListener('click', (event) => {
  if (event.target.dataset.action !== 'delete') return;
  const id = Number(event.target.closest('li').dataset.id);
  run(async () => {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    setState({ tasks: removeTask(state.tasks, id) });
  });
});

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => setState({ filter: button.dataset.filter }));
}

$('#logout').addEventListener('click', () => {
  run(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setState({ ...initialState, status: 'anonymous' });
  });
});

// --- Démarrage -------------------------------------------------------------
async function start() {
  try {
    const { user } = await api('/api/auth/me');
    const tasks = await api('/api/tasks');
    setState({ status: 'ready', user, tasks });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setState({ status: 'anonymous' });
    } else {
      setState({ status: 'failed', error: `${error.message} Recharge la page pour réessayer.` });
    }
  }
}

start();
```

### Les idées clés

- **`setState` puis `render`** : chaque changement passe par `setState`, qui fusionne les
  modifications dans un **nouvel** objet et redessine. On peut lire `render()` et savoir
  exactement ce qui est affiché dans chaque état.
- **`replaceChildren(...items)`** reconstruit la liste à chaque rendu. Pour quelques dizaines de
  tâches, c’est instantané et beaucoup plus simple que de mettre à jour chaque élément.
- **Texte, jamais HTML** : le titre est ajouté par `append` (nœud texte) et l’étiquette du
  bouton par `setAttribute`. Une tâche intitulée `<img src=x onerror="…">` s’affiche telle
  quelle, sans s’exécuter.
- **La délégation d’événements** : deux écouteurs sur la liste `#tasks` gèrent toutes les cases
  et tous les boutons, y compris ceux créés plus tard. `dataset.action` identifie l’élément,
  `closest('li')` retrouve la tâche.
- **`run(action)`** factorise ce que toute action doit faire : passer en `busy`, effacer
  l’erreur précédente, intercepter les erreurs, et toujours (`finally`) sortir de `busy`.
- **La session qui expire** : si une action reçoit 401 alors qu’on était connecté, on revient à
  l’état `anonymous` avec un message clair, au lieu d’afficher « Authentification requise » sur
  une liste devenue inutilisable.
- **Mises à jour pessimistes** : la case cochée n’est enregistrée dans l’état qu’après la
  réponse du serveur. Si la requête échoue, le rendu suivant remet la case dans l’état de la
  base.
- **`event.submitter`** (l’élément qui a déclenché l’envoi du formulaire) permet un seul
  formulaire pour la connexion et l’inscription.
- **Le focus** : après la connexion, le focus va sur le champ « Nouvelle tâche ». Un utilisateur
  au clavier peut taper sa première tâche sans chercher où il est.

## Essayer l’application

Lance `npm run dev` et ouvre `http://localhost:3000`. Voici ce que nous avons observé en
pilotant Chromium avec un script, sur une base vide, puis en vérifiant chaque état :

1. au chargement, « Chargement… » puis le formulaire de connexion (l’API a répondu 401 à
   `GET /api/auth/me`) ;
2. connexion avec un mauvais mot de passe : la zone d’erreur affiche « E-mail ou mot de passe
   incorrect » ;
3. « Créer un compte » : la liste apparaît, avec « Aucune tâche à afficher. » et « Aucune
   tâche restante » ;
4. trois ajouts, dont une tâche intitulée `<img src=x onerror="document.title=1">` : elle
   s’affiche en texte et le titre de l’onglet reste « Mes tâches » ; le compteur indique
   « 3 tâches restantes » ;
5. une case cochée : la tâche passe en fin de liste, barrée, et le compteur indique « 2 tâches
   restantes » ; le filtre « Terminées » n’affiche qu’elle, avec `aria-pressed="true"` ;
6. après un rechargement de la page, la session est conservée ;
7. en supprimant les sessions en base puis en ajoutant une tâche, l’interface revient au
   formulaire avec « Ta session a expiré, reconnecte-toi. » ;
8. sur un écran de 375 pixels de large, les boutons passent à la ligne et rien ne déborde.

Dans les outils de développement, onglet Réseau, observe chaque requête : méthode, statut,
cookie `sid` envoyé, réponse JSON. La console signale les réponses 401 attendues (« Failed to
load resource… ») : ce ne sont pas des bogues, ce sont les états `anonymous` et « session
expirée ».

Fais aussi le test du clavier : `Tab` parcourt champs, boutons, cases et boutons
« Supprimer » dans l’ordre de lecture, `Espace` coche une case, `Entrée` envoie un formulaire.

## Pièges et idées reçues

- **Oublier `response.ok`.** `fetch` « réussit » sur un 500 ; sans test, on affiche
  `undefined` ou on plante plus loin.
- **Appeler `response.json()` sur un 204** ou sur une page d’erreur HTML : exception. D’où le
  `catch(() => null)` et la route 404 JSON de l’API.
- **Modifier le DOM depuis chaque gestionnaire.** Après quelques fonctionnalités, plus personne
  ne sait pourquoi un bouton est désactivé. Un seul `render()`.
- **Muter l’état** (`state.tasks.push(task)`) : `render()` n’est pas appelé, et l’ancien état
  est corrompu. Toujours créer de nouveaux objets.
- **`innerHTML` pour aller plus vite** : c’est la faille XSS de la compétence « Sécurité web ».
- **Désactiver les boutons sans jamais les réactiver** quand une erreur survient : le `finally`
  de `run` s’en charge.

## Exercices

### Exercice 1 — Réessayer au lieu de recharger

Dans l’état `failed`, le message demande de recharger la page. Ajoute un bouton « Réessayer »,
visible seulement dans cet état, qui relance le démarrage.

:::solution
Dans `index.html`, juste après le paragraphe `#error` :

```html
<button type="button" id="retry" hidden>Réessayer</button>
```

Dans `render()` :

```js
$('#retry').hidden = state.status !== 'failed';
```

Dans `start()`, le message n’a plus besoin d’inviter à recharger :

```js
setState({ status: 'failed', error: error.message });
```

Et avant l’appel final à `start()` :

```js
$('#retry').addEventListener('click', () => {
  setState({ status: 'loading', error: null });
  start();
});
```

Vérification, en simulant une coupure réseau sur `GET /api/auth/me` : l’état `failed` affiche
« Impossible de joindre le serveur. » et le bouton ; une fois le réseau rétabli, un clic
repasse par « Chargement… » puis affiche le formulaire, sans erreur ni bouton. Le bouton est
masqué dans tous les autres états, parce que `render()` le décide à partir de `status`.

:::

### Exercice 2 — Une case optimiste

Les mises à jour pessimistes laissent un court délai. Réécris l’écouteur `change` pour que la
case change **immédiatement** d’état et de place, puis revienne à l’état précédent avec le
message « Modification annulée : … » si l’API échoue.

:::solution
```js
$('#tasks').addEventListener('change', (event) => {
  if (event.target.dataset.action !== 'toggle') return;
  const id = Number(event.target.closest('li').dataset.id);
  const done = event.target.checked;
  const previous = state.tasks;
  const current = previous.find((task) => task.id === id);
  // Affichage immédiat, avant la réponse du serveur
  setState({ tasks: upsertTask(previous, { ...current, done }), error: null });
  api(`/api/tasks/${id}`, { method: 'PATCH', body: { done } })
    .then((task) => setState({ tasks: upsertTask(state.tasks, task) }))
    .catch((error) => setState({ tasks: previous, error: `Modification annulée : ${error.message}` }));
});
```

Vérification, en faisant répondre 500 à l’API après 400 ms : la tâche est aussitôt affichée
« à faire » et le compteur passe à « 1 tâche restante » ; à la réponse, elle redevient barrée,
le compteur revient à « Aucune tâche restante » et l’erreur s’affiche.

Ce code n’utilise pas `run` : il ne passe pas en `busy`, pour que l’interface reste
utilisable. Le prix à payer : si l’utilisateur fait une autre action avant la réponse,
`previous` peut être périmé. Garder la version pessimiste est un choix défendable pour un
projet de cette taille ; l’important est de savoir expliquer le compromis.

:::

## Récapitulatif

- Nommer les états (`loading`, `anonymous`, `ready`, `failed`) plus `busy` et `error` ; tout
  l’affichage découle de `state` via une seule fonction `render()`.
- HTML accessible : labels, `hidden`, `role="status"` et `role="alert"`, `aria-pressed`,
  ordre de tabulation naturel, focus déplacé après la connexion.
- Un module `api.js` : JSON, `response.ok`, 204, délai maximal avec `AbortSignal.timeout`,
  erreurs uniformes `ApiError`.
- Des fonctions pures dans `state.js`, testables sans navigateur, qui ne modifient jamais
  leurs entrées.
- Délégation d’événements, `run()` pour les actions, retour à la connexion sur 401.
- Données insérées en texte (`append`, `textContent`, `setAttribute`), jamais en HTML.
