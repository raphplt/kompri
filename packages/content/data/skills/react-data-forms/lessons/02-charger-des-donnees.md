---
title: Charger des données depuis une API
summary: Mettre en place une API locale et le proxy de Vite, charger des données dans un effet avec les états chargement, erreur et succès, puis annuler les requêtes périmées pour éviter les réponses dans le désordre.
durationMinutes: 75
sources:
  - title: React — Synchroniser grâce aux Effets (chargement de données)
    url: https://fr.react.dev/learn/synchronizing-with-effects
  - title: Vite — Server Options (server.proxy)
    url: https://vite.dev/config/server-options
  - title: MDN — AbortController
    url: https://developer.mozilla.org/fr/docs/Web/API/AbortController
  - title: MDN — Cross-Origin Resource Sharing (CORS)
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CORS
---

## Le problème : des données qui arrivent plus tard

Une vraie application n’a pas ses données écrites en dur dans `App.jsx` : elle les demande à
un serveur. Dans la compétence « JavaScript asynchrone », tu as appris à le faire avec `fetch`,
à tester `response.ok`, à annuler une requête avec `AbortController` et à éviter qu’une réponse
lente écrase une réponse plus récente. Il reste à brancher tout cela sur le modèle de React :

- **où** lancer la requête, puisque le rendu doit rester pur ;
- **comment** représenter les trois situations possibles : chargement, erreur, succès ;
- **comment** annuler la requête quand elle devient inutile, avec le nettoyage d’un effet.

Tout au long de cette compétence, tu construis un **carnet de contacts** : une application
React qui consomme une petite API locale. Cette leçon met en place l’API, le proxy de Vite et
le chargement des données.

## L’API du projet fil rouge

Dans le projet `carnet` créé à la leçon précédente, crée un dossier `server` et place-y ce
fichier. Comme dans la compétence « JavaScript asynchrone », tu n’as pas besoin d’en
comprendre chaque ligne : il utilise uniquement le module `node:http` de Node.js, garde les
contacts en mémoire et **simule des délais** pour rendre visibles les problèmes d’attente.

```js
// server/api.js — API de contacts en mémoire, avec délais simulés
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 3001);

let nextId = 5;
const groups = ['famille', 'amis', 'travail'];
let contacts = [
  { id: 1, name: 'Awa Diallo', email: 'awa@example.fr', phone: '0612345678', group: 'amis' },
  { id: 2, name: 'Bruno Petit', email: 'bruno@example.fr', phone: '', group: 'travail' },
  { id: 3, name: 'Chloé Martin', email: 'chloe@example.fr', phone: '', group: 'famille' },
  { id: 4, name: 'Accueil de la mairie', email: 'accueil@example.fr', phone: '', group: 'travail' },
].map((contact) => ({
  ...contact,
  favorite: contact.id === 1, // Awa est déjà en favori
  locked: contact.id === 4, // l’accueil de la mairie ne peut être ni modifié ni supprimé
}));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(response, status, data) {
  if (data === undefined) {
    response.writeHead(status).end();
    return;
  }
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 10_000) throw new Error('Corps trop volumineux');
  }
  return JSON.parse(text);
}

// Mêmes règles que le formulaire : le serveur revalide toujours.
function validate(data) {
  const fields = {};
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const phone = typeof data?.phone === 'string' ? data.phone.replaceAll(' ', '') : '';
  const group = data?.group;
  if (name.length < 2) fields.name = 'Le nom doit contenir au moins 2 caractères.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = 'Adresse électronique invalide.';
  else if (contacts.some((c) => c.email === email && c.id !== data.id)) {
    fields.email = 'Cette adresse est déjà utilisée par un autre contact.';
  }
  if (phone !== '' && !/^0\d{9}$/.test(phone)) fields.phone = 'Numéro invalide.';
  if (!groups.includes(group)) fields.group = 'Groupe inconnu.';
  return { values: { name, email, phone, group }, fields };
}

async function handle(request, response, url) {
  // Pour s’entraîner : ajouter ?fail=1 à n’importe quelle adresse provoque une erreur 500.
  if (url.searchParams.get('fail') === '1') {
    await wait(300);
    return send(response, 500, { error: 'Erreur interne simulée' });
  }
  const match = url.pathname.match(/^\/api\/contacts\/(\d+)$/);
  const contact = match && contacts.find((c) => c.id === Number(match[1]));

  if (url.pathname === '/api/contacts' && request.method === 'GET') {
    await wait(500);
    return send(response, 200, contacts);
  }
  if (url.pathname === '/api/contacts' && request.method === 'POST') {
    await wait(600);
    const data = await readJson(request);
    const { values, fields } = validate(data);
    if (Object.keys(fields).length > 0) {
      return send(response, 400, { error: 'Données invalides', fields });
    }
    const created = { id: nextId++, ...values, favorite: data.favorite === true, locked: false };
    contacts.push(created);
    return send(response, 201, created);
  }
  if (!match) return send(response, 404, { error: 'Route inconnue' });
  // Délai simulé : la fiche n° 1 répond en 1,5 s, les autres en 0,3 s.
  await wait(request.method === 'GET' && contact?.id === 1 ? 1500 : 300);
  if (!contact) return send(response, 404, { error: 'Contact introuvable' });
  if (request.method === 'GET') return send(response, 200, contact);
  if (contact.locked) {
    return send(response, 403, { error: 'Ce contact est verrouillé : modification impossible.' });
  }
  if (request.method === 'PATCH') {
    const data = await readJson(request);
    const changes = {};
    if ('favorite' in data) changes.favorite = data.favorite === true;
    if (['name', 'email', 'phone', 'group'].some((key) => key in data)) {
      const { values, fields } = validate({ ...contact, ...data, id: contact.id });
      if (Object.keys(fields).length > 0) {
        return send(response, 400, { error: 'Données invalides', fields });
      }
      Object.assign(changes, values);
    }
    Object.assign(contact, changes);
    return send(response, 200, contact);
  }
  if (request.method === 'DELETE') {
    contacts = contacts.filter((c) => c.id !== contact.id);
    return send(response, 204);
  }
  return send(response, 405, { error: 'Méthode non autorisée' });
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  console.log(`${request.method} ${url.pathname}${url.search}`);
  try {
    await handle(request, response, url);
  } catch {
    if (!response.headersSent) send(response, 400, { error: 'Requête invalide' });
  }
}).listen(port, () => {
  console.log(`API prête sur http://localhost:${port}/api/contacts`);
});
```

Lance-le dans un **second** terminal, à la racine du projet, et laisse-le tourner :

```bash
node server/api.js
```

```text
API prête sur http://localhost:3001/api/contacts
```

| Requête                     | Réponse                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `GET /api/contacts`         | 200, la liste (après 0,5 s)                                             |
| `GET /api/contacts/1`       | 200, la fiche (après 1,5 s pour le contact 1, 0,3 s pour les autres) ; 404 sinon |
| `POST /api/contacts`        | 201, le contact créé ; 400 avec `fields` si une valeur est refusée     |
| `PATCH /api/contacts/2`     | 200, le contact modifié ; 403 pour le contact verrouillé (n° 4)          |
| `DELETE /api/contacts/2`    | 204 sans corps ; 403 pour le contact verrouillé                          |
| n’importe quelle adresse avec `?fail=1` | 500 `{ "error": "Erreur interne simulée" }`                  |

Les données vivent en mémoire : arrête le serveur (`Ctrl+C`) et relance-le pour retrouver les
quatre contacts de départ. Les routes d’écriture serviront dans les leçons 3 et 4.

## Le proxy de Vite : une seule origine

L’application React est servie par Vite sur `http://localhost:5173`, l’API par Node.js sur
`http://localhost:3001`. Le port fait partie de l’**origine** (schéma, hôte, port) : pour le
navigateur, ce sont deux origines différentes. Essaie d’appeler directement l’API depuis un
composant :

```jsx
fetch('http://localhost:3001/api/contacts');
```

La requête atteint bien le serveur, mais Chromium refuse de donner la réponse à ton code. La
promesse est rompue avec `TypeError: Failed to fetch`, et la console explique (ici avec les
ports de l’essai) :

```text
Access to fetch at 'http://localhost:3471/api/contacts' from origin 'http://localhost:5391' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

C’est la **politique de même origine** : par défaut, une page ne peut lire que les réponses de
sa propre origine. Un serveur peut l’autoriser explicitement avec des en-têtes CORS
(*Cross-Origin Resource Sharing*), mais en développement il existe une solution plus simple :
le **proxy** de Vite. Remplace `vite.config.js` par :

```js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Toute requête dont le chemin commence par /api est relayée à l’API.
      '/api': 'http://localhost:3001',
    },
  },
});
```

Vite redémarre tout seul quand ce fichier change. Désormais, le code React appelle des
adresses **relatives** :

```js
fetch('/api/contacts');
```

Le navigateur envoie la requête à `http://localhost:5173/api/contacts`, sa propre origine :
aucune règle CORS ne s’applique. Le serveur de Vite voit que le chemin commence par `/api` et
la **relaie** à `http://localhost:3001/api/contacts`, puis renvoie la réponse au navigateur. Le
chemin est transmis tel quel, préfixe `/api` compris.

```text
navigateur ──GET /api/contacts──▶ Vite (5173) ──GET /api/contacts──▶ API (3001)
navigateur ◀──── réponse ──────── Vite (5173) ◀──── réponse ──────── API (3001)
```

Trois précisions :

- Le proxy n’existe qu’avec le serveur de Vite : `npm run dev`, et aussi `npm run preview`,
  qui reprend la même configuration (vérifié). Le dossier `dist/` déployé seul n’a pas de
  proxy : en production, on sert l’application et l’API sous la même origine (un serveur
  frontal qui relaie `/api`, comme le fait ici Vite), ou bien l’API envoie les en-têtes CORS
  adéquats. Les compétences sur le déploiement y reviendront.
- Si tu oublies de lancer l’API, le proxy répond **502 Bad Gateway** et le terminal de Vite
  affiche `http proxy error: /api/contacts` suivi de `Error: connect ECONNREFUSED …`.
- Écrire des adresses relatives a un autre avantage : le code ne contient aucune adresse de
  serveur. Il fonctionnera tel quel le jour où l’application et l’API seront publiées
  ensemble.

## Un module pour parler à l’API

Plutôt que d’éparpiller `fetch` dans les composants, regroupe les appels dans `src/api.js`.
Tu reconnaîtras la fonction `getJson` de la compétence « JavaScript asynchrone », adaptée :

```js
// src/api.js — un seul endroit pour parler à l’API
export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields; // erreurs par champ renvoyées par le serveur
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method,
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null; // pas de corps à lire
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = data?.error ?? `Réponse inattendue du serveur (${response.status}).`;
    throw new ApiError(message, response.status, data?.fields);
  }
  return data;
}

// Traduit une erreur technique en message compréhensible.
export function describeError(error) {
  if (error instanceof ApiError) return error.message;
  if (error.name === 'TypeError') {
    return 'Le serveur est injoignable. Vérifie ta connexion puis réessaie.'; // erreur réseau de fetch
  }
  return 'Une erreur inattendue est survenue.';
}
```

- **`fetch` ne rejette pas sur un 404 ou un 500** : c’est `apiRequest` qui teste
  `response.ok` et transforme une réponse d’erreur en `ApiError`. Les composants n’ont plus
  qu’un chemin d’erreur, le `catch`.
- `ApiError` est une classe qui **hérite** d’`Error` (`extends`) : elle a un message et une
  pile d’appels comme toute erreur, plus le statut HTTP et les erreurs par champ. `super`
  appelle le constructeur d’`Error`. `error instanceof ApiError` permet ensuite de la
  reconnaître.
- Un `204 No Content` n’a pas de corps : appeler `response.json()` dessus lèverait une
  `SyntaxError`. D’où le cas particulier.
- `signal` est transmis à `fetch` pour permettre l’annulation.
- `describeError` traduit l’erreur en phrase pour l’utilisateur. Une erreur réseau de `fetch`
  est une `TypeError` dont le message brut (« Failed to fetch ») ne veut rien dire pour lui.

## Charger la liste : trois états

Remplace `src/App.jsx` :

```jsx
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from './api.js';
import ContactDetail from './components/ContactDetail.jsx';
import ContactList from './components/ContactList.jsx';

function App() {
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const data = await apiRequest('/api/contacts', { signal: controller.signal });
        setContacts(data);
        setStatus('success');
      } catch (error) {
        if (error.name === 'AbortError') return; // requête annulée volontairement
        setLoadError(error);
        setStatus('error');
      }
    }

    load();
    return () => controller.abort();
  }, [attempt]);

  function handleRetry() {
    setStatus('loading');
    setAttempt(attempt + 1); // nouvelle valeur de dépendance : l’effet se relance
  }

  return (
    <main>
      <h1>Carnet de contacts</h1>
      <p role="status">
        {status === 'loading' && 'Chargement des contacts…'}
        {status === 'error' && 'Le chargement a échoué.'}
        {status === 'success' && `${contacts.length} contact(s).`}
      </p>
      {status === 'error' && (
        <div>
          <p>Erreur : {describeError(loadError)}</p>
          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      )}
      {status === 'success' && (
        <ContactList contacts={contacts} selectedId={selectedId} onSelect={setSelectedId} />
      )}
      {selectedId !== null && <ContactDetail contactId={selectedId} />}
    </main>
  );
}

export default App;
```

et crée `src/components/ContactList.jsx` :

```jsx
function ContactList({ contacts, selectedId, onSelect }) {
  if (contacts.length === 0) {
    return <p>Aucun contact pour l’instant.</p>;
  }
  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.id}>
          <button
            type="button"
            aria-current={contact.id === selectedId}
            onClick={() => onSelect(contact.id)}
          >
            {contact.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default ContactList;
```

`ContactDetail` est écrit plus bas ; en attendant, retire son import et sa ligne si tu veux
tester tout de suite. Au chargement, la page affiche « Chargement des contacts… » pendant une
demi-seconde, puis « 4 contact(s). » et la liste des noms.

### Ce qu’il faut comprendre

**La requête part d’un effet.** Charger la liste n’est la conséquence d’aucun clic : c’est
parce que `App` est affiché qu’il faut aligner son contenu sur celui du serveur, un système
externe. Le tableau de dépendances contient `attempt`, la seule valeur réactive dont dépend
le chargement (voir « Réessayer » plus bas).

**L’effet ne peut pas être `async`.** Il doit renvoyer une fonction de nettoyage ou rien ; une
fonction `async` renvoie toujours une promesse. Si tu écris `useEffect(async () => { … })`,
la console affiche en développement :

```text
useEffect must not return anything besides a function, which is used for clean-up.

It looks like you wrote useEffect(async () => ...) or returned a Promise. Instead, write the async function inside your effect and call it immediately:
```

puis, quand StrictMode appelle le prétendu nettoyage, l’erreur `destroy is not a function`,
et la page reste blanche. La bonne forme est celle du code : une fonction `async` déclarée
**dans** l’effet, puis appelée.

**Trois états, un seul affiché.** `status` vaut `'loading'`, `'error'` ou `'success'`. Une
seule variable empêche les combinaisons absurdes que produiraient deux booléens
`isLoading` et `hasError` (tous deux à `true` ?). L’état initial est `'loading'` : le premier
rendu affiche donc déjà le message d’attente, sans appel à `setStatus` dans l’effet.

**Le paragraphe `role="status"` est toujours présent.** Seul son texte change : les lecteurs
d’écran annoncent ainsi « Chargement des contacts… », puis « 4 contact(s). » ou « Le
chargement a échoué. », comme tu l’as vu dans la compétence « JavaScript asynchrone ».

**Le nettoyage annule la requête.** Le contrôleur est créé dans l’effet, son signal est
transmis à `apiRequest`, et le nettoyage appelle `controller.abort()`. Une requête annulée
rompt la promesse avec une erreur `AbortError`, que l’on **ignore** : ce n’est pas une panne,
c’est nous qui l’avons voulu.

En développement, l’onglet *Network* montre deux requêtes `GET /api/contacts` au chargement :
StrictMode exécute « effet → nettoyage → effet ». La première est annulée par le nettoyage
(Chromium la marque comme annulée, avec l’erreur `net::ERR_ABORTED`), la seconde aboutit. En production, une seule requête part.

### Réessayer après une erreur

Pour voir l’état d’erreur, arrête l’API (`Ctrl+C` dans son terminal) et recharge la page :

```text
Le chargement a échoué.

Erreur : Réponse inattendue du serveur (502).

Réessayer
```

Relance l’API puis clique sur « Réessayer » : « Chargement des contacts… », puis la liste
(vérifié dans Chromium). Tu peux aussi remplacer temporairement l’adresse par
`'/api/contacts?fail=1'` pour obtenir « Erreur : Erreur interne simulée ».

Le bouton « Réessayer » est un **événement** : son gestionnaire passe donc directement
`status` à `'loading'`. Pour relancer le chargement, il incrémente `attempt`. Comme `attempt`
figure dans les dépendances, React exécute de nouveau l’effet après le rendu. Ce compteur
n’est lu nulle part ailleurs : il sert uniquement à dire « recharge ».

## Une fiche par contact : la course

Ajoutons le détail : un clic sur un nom affiche la fiche, chargée par `GET /api/contacts/:id`.
Première version, naïve, dans `src/components/ContactDetail.jsx` :

```jsx
import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

function ContactDetail({ contactId }) {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await apiRequest(`/api/contacts/${contactId}`);
      console.log(`réponse reçue pour le contact ${contactId}`);
      setContact(data);
    }
    load();
  }, [contactId]);

  if (contact === null) {
    return <p>Chargement de la fiche…</p>;
  }
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

Elle semble fonctionner. Fais maintenant ceci : clique sur « Awa Diallo », puis, moins d’une
seconde après, sur « Bruno Petit ». Résultat mesuré dans Chromium :

| Moment                          | Bouton actif | Fiche affichée |
| ------------------------------- | ------------ | -------------- |
| 0,5 s après le clic sur Bruno   | Bruno Petit  | Bruno Petit    |
| 1,6 s après le clic sur Bruno   | Bruno Petit  | **Awa Diallo** |

```text
réponse reçue pour le contact 2
réponse reçue pour le contact 1
```

La fiche d’Awa remplace celle de Bruno alors que c’est Bruno qui est sélectionné. La requête
pour Awa est partie la première, mais le serveur met 1,5 s à y répondre ; celle pour Bruno,
partie ensuite, répond en 0,3 s. Les réponses arrivent **dans le désordre** et la dernière
arrivée gagne : c’est la **condition de course** que tu connais déjà. Sur un vrai réseau, les
temps de réponse varient sans cesse ; ici le délai est fixe pour que tu puisses reproduire le
bug à coup sûr.

Un second défaut, plus discret : clique sur Bruno, attends, puis clique sur « Chloé Martin ».
100 ms plus tard, Chloé est sélectionnée mais la fiche affichée est encore celle de Bruno,
sans aucune indication de chargement. L’état `contact` n’est remis à `null` qu’au tout premier
rendu.

## La correction : annuler dans le nettoyage

Le cycle de vie d’un effet donne la solution. Quand `contactId` passe de 1 à 2, React appelle
le nettoyage de l’effet du contact 1 **avant** de lancer celui du contact 2. Il suffit donc
que ce nettoyage annule la requête du contact 1 :

```jsx
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from '../api.js';

function ContactDetail({ contactId }) {
  // Le résultat garde l’identifiant auquel il correspond : { id, contact } ou { id, error }
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const contact = await apiRequest(`/api/contacts/${contactId}`, {
          signal: controller.signal,
        });
        console.log(`réponse reçue pour le contact ${contactId}`);
        setResult({ id: contactId, contact });
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`requête du contact ${contactId} annulée`);
          return;
        }
        setResult({ id: contactId, error });
      }
    }

    load();
    return () => controller.abort();
  }, [contactId]);

  // Donnée dérivée : on charge tant que le résultat ne correspond pas au contact demandé.
  if (result === null || result.id !== contactId) {
    return <p>Chargement de la fiche…</p>;
  }
  if (result.error) {
    return <p>Erreur : {describeError(result.error)}</p>;
  }
  const { contact } = result;
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

Même scénario (Awa puis Bruno) : la fiche de Bruno reste affichée, et la console indique :

```text
requête du contact 1 annulée
requête du contact 1 annulée
réponse reçue pour le contact 2
```

La première annulation vient de StrictMode au montage, la seconde du changement de contact.
La réponse d’Awa ne peut plus rien modifier : sa requête est interrompue côté navigateur, sa
promesse est rompue avec `AbortError`, et `setResult` n’est jamais appelé.

Le second défaut est réglé par une idée de la leçon 1 : **l’état de chargement est une donnée
dérivée**. Le résultat mémorise l’identifiant auquel il correspond. S’il n’y a pas encore de
résultat, ou si c’est celui d’un autre contact, on est en train de charger :

```jsx
if (result === null || result.id !== contactId) {
  return <p>Chargement de la fiche…</p>;
}
```

Aucun `setResult(null)` à appeler au début de l’effet, donc aucune valeur fausse affichée
pendant un rendu. Scénario Bruno puis Chloé : 100 ms après le clic, « Chargement de la
fiche… », puis la fiche de Chloé (vérifié).

:::note[Une autre façon de repartir de zéro : la clé]
Tu connais l’attribut `key` pour les listes. Sur n’importe quel composant, changer sa clé
force React à le **démonter et le remonter**, avec un état neuf :
`<ContactDetail key={selectedId} contactId={selectedId} />`. C’est une solution légitime
pour réinitialiser tout l’état d’un composant quand une prop change. Le nettoyage reste
indispensable : il annule la requête du composant démonté.
:::

### Et sans `AbortController` ?

Certaines sources de données asynchrones ne savent pas s’annuler. La technique de repli,
celle de la documentation de React, est un **drapeau** : le nettoyage marque le résultat
comme périmé, et l’effet ne l’applique que s’il ne l’est pas. L’exercice 1 te la fait écrire.
L’annulation reste préférable avec `fetch`, car elle libère aussi la connexion.

## Dans une vraie application

Ce que tu viens d’écrire fonctionne, mais une application réelle a d’autres besoins : mettre
en cache une fiche déjà chargée, éviter de recharger la même liste dans deux composants,
recharger quand l’utilisateur revient sur l’onglet, réessayer automatiquement. Pour cela, les
équipes utilisent le plus souvent une **bibliothèque de chargement de données** (TanStack Query
et SWR sont répandues) ou les mécanismes de chargement d’un **framework** construit sur React
(comme Next.js ou React Router), qui chargent les données au niveau des routes. La
documentation de React conseille elle-même ces solutions plutôt que des effets écrits à la
main, dès que l’application grandit.

Ce cours ne les enseigne pas : elles reposent toutes sur les notions de cette leçon (effet,
annulation, états de chargement, erreurs HTTP). Les comprendre ici te permettra de lire leur
documentation et de savoir ce qu’elles font pour toi.

## Pièges courants

1. **Appeler l’API avec son adresse complète** (`http://localhost:3001/…`) au lieu d’une
   adresse relative : erreur CORS. Utilise `/api/…` et le proxy.
2. **Oublier de lancer l’API** : 502 et `http proxy error` dans le terminal de Vite.
3. **Passer une fonction `async` à `useEffect`** : avertissement, puis
   `destroy is not a function`.
4. **Ne pas tester `response.ok`** : un 404 ou un 500 passe pour un succès, et le composant
   affiche `undefined`. Centralise ce test dans `apiRequest`.
5. **Afficher l’`AbortError` comme une erreur** : chaque changement de contact ferait clignoter
   un faux message d’échec. Ignore-la.
6. **Charger sans nettoyage** quand l’effet dépend d’une prop : condition de course.
7. **Réinitialiser l’état au début de l’effet** (`setResult(null)`) : rendu supplémentaire avec
   une valeur périmée. Dérive l’état de chargement, ou utilise une clé.
8. **S’inquiéter des deux requêtes au montage en développement** : c’est StrictMode ; la
   première est annulée.

## Exercices

### Exercice 1 — Le drapeau `ignore`

Réécris `ContactDetail` **sans** `AbortController` : le nettoyage met une variable locale
`ignore` à `true`, et l’effet n’appelle `setResult` que si `ignore` vaut `false`. Vérifie avec
le scénario Awa puis Bruno, puis explique ce que cette version fait moins bien que
l’annulation.

:::solution
```jsx
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from '../api.js';

function ContactDetail({ contactId }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let ignore = false; // passera à true quand ce résultat deviendra périmé

    async function load() {
      try {
        const contact = await apiRequest(`/api/contacts/${contactId}`);
        if (!ignore) setResult({ id: contactId, contact });
      } catch (error) {
        if (!ignore) setResult({ id: contactId, error });
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [contactId]);

  if (result === null || result.id !== contactId) {
    return <p>Chargement de la fiche…</p>;
  }
  if (result.error) {
    return <p>Erreur : {describeError(result.error)}</p>;
  }
  return (
    <article>
      <h2>{result.contact.name}</h2>
      <p>Courriel : {result.contact.email}</p>
      <p>Groupe : {result.contact.group}</p>
    </article>
  );
}

export default ContactDetail;
```

Scénario Awa puis Bruno vérifié dans Chromium : la fiche de Bruno reste affichée.

- Chaque exécution de l’effet a **sa propre** variable `ignore`, capturée par sa fonction
  `load` et par son nettoyage. Quand `contactId` change, le nettoyage de l’ancienne exécution
  passe **son** `ignore` à `true` : la réponse d’Awa, quand elle arrive, est jetée.
- Ce qu’elle fait moins bien : la requête d’Awa **continue** jusqu’au bout. Le navigateur
  télécharge une réponse inutile et garde une connexion occupée. Avec `fetch`, l’annulation
  est donc préférable ; le drapeau sert quand la source ne sait pas s’annuler.
- Il n’y a plus de cas `AbortError` à traiter, puisque rien n’est annulé.
:::

### Exercice 2 — Un délai maximal

La fiche n° 1 met 1,5 s à répondre. Modifie `ContactDetail` pour abandonner une fiche qui ne
répond pas en 1 seconde, avec le message « Erreur : le serveur met trop de temps à
répondre. ». Un changement de contact doit toujours annuler sans message. Indice :
`AbortSignal.timeout` et `AbortSignal.any`, vus dans la compétence « JavaScript asynchrone ».

:::solution
```jsx
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from '../api.js';

function ContactDetail({ contactId }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    // Annulé si contactId change OU si 1 seconde s’écoule.
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(1000)]);

    async function load() {
      try {
        const contact = await apiRequest(`/api/contacts/${contactId}`, { signal });
        setResult({ id: contactId, contact });
      } catch (error) {
        if (error.name === 'AbortError') return; // remplacé par une requête plus récente
        setResult({ id: contactId, error });
      }
    }

    load();
    return () => controller.abort();
  }, [contactId]);

  if (result === null || result.id !== contactId) {
    return <p>Chargement de la fiche…</p>;
  }
  if (result.error) {
    const message =
      result.error.name === 'TimeoutError'
        ? 'le serveur met trop de temps à répondre.'
        : describeError(result.error);
    return <p>Erreur : {message}</p>;
  }
  return (
    <article>
      <h2>{result.contact.name}</h2>
      <p>Courriel : {result.contact.email}</p>
      <p>Groupe : {result.contact.group}</p>
    </article>
  );
}

export default ContactDetail;
```

Vérifié dans Chromium : un clic sur Awa affiche le message d’erreur après une seconde ; Bruno
s’affiche normalement ; un clic sur Awa suivi 200 ms plus tard d’un clic sur Chloé affiche
la fiche de Chloé, sans message.

- `AbortSignal.any` produit un signal qui s’annule dès que **l’un** des deux s’annule.
- Les deux cas se distinguent par `error.name` : `AbortError` pour notre annulation (ignorée),
  `TimeoutError` pour le délai dépassé (affichée).
- Le message est choisi pendant le rendu à partir de l’erreur stockée : aucun état
  supplémentaire.
:::

## Récapitulatif

- Le chargement initial des données d’un composant est une **synchronisation** avec un système
  externe : il se fait dans un effet, avec une fonction `async` déclarée dans l’effet.
- Le **proxy** de Vite (`server.proxy`) relaie `/api` vers l’API : le navigateur ne voit
  qu’une origine, sans CORS. Il n’existe qu’avec `npm run dev` et `npm run preview`.
- Un module `api.js` centralise `fetch`, le test de `response.ok`, la lecture du JSON, le cas
  du 204 et la traduction des erreurs.
- Un état `status` à trois valeurs (`'loading'`, `'error'`, `'success'`) décrit la requête ;
  un paragraphe `role="status"` permanent annonce ses changements. « Réessayer » relance
  l’effet en changeant une dépendance.
- Le nettoyage appelle `controller.abort()` : quand une dépendance change ou que le composant
  disparaît, la requête précédente est annulée et ne peut plus écraser la suivante.
  L’`AbortError` est ignorée.
- L’état « en chargement » peut se **dériver** en mémorisant l’identifiant du résultat.
- En production, une bibliothèque de données ou un framework gère souvent ces questions ; ils
  reposent sur les mêmes principes.
