---
title: Envoyer des modifications et garder l’interface cohérente
summary: Créer, modifier et supprimer avec POST, PATCH et DELETE, traiter les erreurs HTTP, choisir entre recharger, appliquer la réponse ou mettre à jour de façon optimiste, et revenir en arrière en cas d’échec.
durationMinutes: 70
sources:
  - title: MDN — Utiliser l’API Fetch
    url: https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
  - title: MDN — Méthode PATCH
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Methods/PATCH
  - title: React — Mettre à jour les objets d’un état
    url: https://fr.react.dev/learn/updating-objects-in-state
---

## Le problème : deux copies des mêmes données

Dès qu’une application modifie des données, elles existent en **deux exemplaires** : dans la
base du serveur, qui fait foi, et dans l’état React, qui sert à l’affichage. Après chaque
modification, il faut que l’écran redevienne fidèle au serveur, y compris quand la requête
échoue, arrive tard, ou croise une autre modification.

Trois stratégies existent :

| Stratégie                  | Principe                                                       | Exemple dans le carnet     |
| -------------------------- | -------------------------------------------------------------- | -------------------------- |
| Recharger                  | après la requête, on redemande les données au serveur          | variante de la suppression |
| Appliquer la réponse       | on attend la réponse et on met l’état à jour avec elle         | création, suppression      |
| Optimiste                  | on modifie l’état **tout de suite**, et on annule si le serveur refuse | favori              |

Cette leçon les met en œuvre dans le carnet de contacts, avec l’API de la leçon 2 et le
formulaire de la leçon 3.

## Rappel : les erreurs HTTP passent par `apiRequest`

Toutes les requêtes de cette leçon passent par `apiRequest` (leçon 2). Rappelle-toi pourquoi :
`fetch` ne rejette **pas** sa promesse sur un 403 ou un 500. Sans test de `response.ok`, un
`DELETE` refusé passerait pour un succès, et l’interface retirerait un contact que le serveur
a gardé. `apiRequest` lève une `ApiError` pour toute réponse non `ok`, gère le `204 No Content`
(pas de corps à lire après un `DELETE`), et envoie le corps en JSON avec l’en-tête
`Content-Type: application/json` quand on lui passe `body`.

```js
await apiRequest(`/api/contacts/${id}`, { method: 'PATCH', body: { favorite: true } });
await apiRequest(`/api/contacts/${id}`, { method: 'DELETE' });
```

`PATCH` modifie **une partie** d’une ressource : on n’envoie que les champs qui changent.
`PUT`, que tu as peut-être croisé, remplace la ressource entière.

## Le carnet complet

Voici la version de `src/App.jsx` pour cette leçon. Elle reprend le chargement de la leçon 2
et ajoute trois gestionnaires : `handleCreated`, `handleToggleFavorite` et `handleDelete`.

```jsx
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from './api.js';
import ContactDetail from './components/ContactDetail.jsx';
import ContactForm from './components/ContactForm.jsx';
import ContactList from './components/ContactList.jsx';

function App() {
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await apiRequest('/api/contacts', { signal: controller.signal });
        setContacts(data);
        setStatus('success');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setLoadError(error);
        setStatus('error');
      }
    }
    load();
    return () => controller.abort();
  }, [attempt]);

  function handleRetry() {
    setStatus('loading');
    setAttempt(attempt + 1);
  }

  function handleCreated(contact) {
    // Appliquer la réponse du serveur : elle contient l’identifiant attribué.
    setContacts((current) => [...current, contact]);
  }

  // Mise à jour optimiste, avec retour arrière en cas d’échec.
  async function handleToggleFavorite(contact) {
    const favorite = !contact.favorite;
    setActionMessage('');
    setContacts((current) =>
      current.map((c) => (c.id === contact.id ? { ...c, favorite } : c)),
    );
    try {
      const updated = await apiRequest(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        body: { favorite },
      });
      setContacts((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      setContacts((current) =>
        current.map((c) => (c.id === contact.id ? { ...c, favorite: contact.favorite } : c)),
      );
      setActionMessage(`Erreur : ${describeError(error)}`);
    }
  }

  // Mise à jour pessimiste : on attend la confirmation du serveur.
  async function handleDelete(contact) {
    if (deletingId !== null) return; // une suppression est déjà en cours
    setDeletingId(contact.id);
    setActionMessage('');
    try {
      await apiRequest(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      setContacts((current) => current.filter((c) => c.id !== contact.id));
      if (selectedId === contact.id) setSelectedId(null);
      setActionMessage(`Contact « ${contact.name} » supprimé.`);
    } catch (error) {
      setActionMessage(`Erreur : ${describeError(error)}`);
    } finally {
      setDeletingId(null);
    }
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
        <ContactList
          contacts={contacts}
          selectedId={selectedId}
          deletingId={deletingId}
          onSelect={setSelectedId}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
        />
      )}
      <p role="status">{actionMessage}</p>
      {selectedId !== null && <ContactDetail contactId={selectedId} />}
      <ContactForm onCreated={handleCreated} />
    </main>
  );
}

export default App;
```

et `src/components/ContactList.jsx`, qui affiche maintenant deux boutons par contact :

```jsx
function ContactList({ contacts, selectedId, deletingId, onSelect, onToggleFavorite, onDelete }) {
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
          </button>{' '}
          <button
            type="button"
            aria-pressed={contact.favorite}
            onClick={() => onToggleFavorite(contact)}
          >
            Favori
          </button>{' '}
          <button
            type="button"
            aria-disabled={contact.id === deletingId}
            onClick={() => onDelete(contact)}
          >
            {contact.id === deletingId ? 'Suppression…' : 'Supprimer'}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default ContactList;
```

- Le bouton « Favori » est un **bouton bascule** : `aria-pressed` vaut `true` ou `false`, et
  les lecteurs d’écran l’annoncent comme un bouton enfoncé ou non. Ajoute un style sur
  `[aria-pressed='true']` pour que l’état se voie aussi à l’écran.
- `ContactList` ne fait aucune requête : il affiche et remonte les événements. Toute la logique
  de données reste dans `App`, qui détient l’état `contacts`.
- Un second paragraphe `role="status"` annonce le résultat des actions.

## Créer : appliquer la réponse du serveur

Après le `POST` du formulaire, `handleCreated` ajoute à la liste le contact **renvoyé par le
serveur**, pas les valeurs saisies. Deux raisons :

1. Le serveur attribue l’**identifiant** ; sans lui, impossible de donner une clé au `li`, de
   modifier ou de supprimer ce contact.
2. Le serveur **normalise** les données. Essai : nom `  Dan Roux `, adresse
   `Dan.Roux@Example.FR`, téléphone `06 11 22 33 44`. Le serveur enregistre
   `"name":"Dan Roux"`, `"email":"dan.roux@example.fr"` et `"phone":"0611223344"`. En
   ajoutant les valeurs saisies, l’écran afficherait une adresse en majuscules que le
   serveur ne connaît pas.

La règle : **la réponse du serveur est la nouvelle vérité**. Quand l’API renvoie la ressource
créée ou modifiée (c’est le cas ici, et c’est une bonne pratique d’API REST), utilise-la.

## La forme fonctionnelle après un `await`

Tous les `setContacts` de `App` utilisent la forme `setContacts((current) => …)`. Ce n’est pas
un détail. Voici ce qui se passe avec la forme directe, `setContacts(contacts.filter(…))` et
`setContacts(contacts.map(…))`, dans ce scénario : clic sur « Supprimer » pour Chloé, puis,
100 ms plus tard, sur « Favori » pour Bruno. Résultat mesuré une seconde plus tard :

| Version                        | Liste affichée                             | Message                           |
| ------------------------------ | ------------------------------------------ | --------------------------------- |
| forme directe (`contacts…`)    | Awa, Bruno, **Chloé**, Accueil de la mairie | « Contact « Chloé Martin » supprimé. » |
| forme fonctionnelle (`current…`) | Awa, Bruno, Accueil de la mairie         | « Contact « Chloé Martin » supprimé. » |

Avec la forme directe, l’écran annonce la suppression de Chloé… et l’affiche encore, alors que
le serveur l’a bien supprimée. L’explication tient à la notion d’**instantané** vue dans la
compétence précédente :

1. Le clic sur « Favori » de Bruno exécute un gestionnaire créé lors d’un rendu où Chloé était
   encore dans `contacts` (sa suppression attend la réponse du serveur).
2. La suppression aboutit : `contacts.filter(…)` retire Chloé.
3. La réponse du `PATCH` arrive : `contacts.map(…)` repart de **son** instantané, qui contient
   Chloé, et le remet dans l’état. Chloé ressuscite.

Après un `await`, la variable `contacts` du gestionnaire est **périmée** : d’autres mises à
jour ont pu avoir lieu pendant l’attente. La forme fonctionnelle reçoit la valeur **actuelle**
de l’état au moment où React applique la mise à jour. Règle pratique : dans un gestionnaire
asynchrone, **toute mise à jour qui dépend de l’état précédent utilise la forme
fonctionnelle**.

## Supprimer : attendre la confirmation

`handleDelete` est **pessimiste** : il attend la réponse avant de toucher à la liste.

- Pendant la requête, `deletingId` mémorise le contact en cours de suppression : son bouton
  affiche « Suppression… » avec `aria-disabled="true"`, et la garde
  `if (deletingId !== null) return;` ignore les autres clics, comme dans la leçon 3.
- En cas de succès (204), on retire le contact avec `filter`, on ferme sa fiche si elle était
  ouverte, et on l’annonce.
- En cas d’échec, la liste n’a pas changé : il suffit d’afficher le message.

Essai sur « Accueil de la mairie », contact verrouillé : le bouton affiche « Suppression… »
pendant la requête, puis « Erreur : Ce contact est verrouillé : modification impossible. »,
et la liste garde ses quatre contacts. Le message vient du corps de la réponse 403, transmis
par `ApiError`. Sur Chloé : « Contact « Chloé Martin » supprimé. », sa fiche ouverte se ferme,
et il reste trois contacts.

Note que la console de Chromium affiche
`Failed to load resource: the server responded with a status of 403 (Forbidden)` à chaque
réponse d’erreur, même quand ton code la traite correctement : c’est le navigateur qui
journalise toute réponse 4xx ou 5xx, pas une erreur de ton application.

### Variante : recharger la liste

Au lieu de calculer la nouvelle liste, on peut la redemander au serveur. Il suffit de relancer
l’effet de chargement de la leçon 2, en remplaçant le `filter` par :

```jsx
setAttempt((n) => n + 1); // relance l’effet de chargement : la liste vient du serveur
```

Mesuré sur la suppression de Chloé : la liste se met à jour environ 1,1 s après le clic (0,3 s
pour le `DELETE`, puis 0,5 s pour le nouveau `GET /api/contacts`), et entre les deux Chloé
reste affichée avec son bouton « Supprimer » revenu à la normale.

| Recharger                                         | Appliquer la réponse                          |
| ------------------------------------------------- | --------------------------------------------- |
| toujours fidèle au serveur, y compris aux changements faits par d’autres | ne voit que ses propres changements |
| une requête de plus, une attente de plus          | immédiat dès la réponse                       |
| aucune logique de mise à jour à écrire            | une transformation (`filter`, `map`) à écrire correctement |

Recharger est un bon choix par défaut quand la liste est petite et que plusieurs personnes la
modifient. Appliquer la réponse est plus réactif. Les deux sont « cohérents » ; ce qui ne
l’est pas, c’est de modifier l’état **sans** attendre ni prévoir l’échec.

## Basculer un favori : la mise à jour optimiste

Pour une action fréquente, rapide et qui réussit presque toujours, attendre la réponse rend
l’interface pesante : on clique sur l’étoile et rien ne bouge pendant 300 ms. La mise à jour
**optimiste** inverse l’ordre : on modifie l’état **avant** la requête, en pariant sur le
succès, et on revient en arrière si le serveur refuse. `handleToggleFavorite` procède en
trois temps :

1. **Appliquer tout de suite** : `favorite` est inversé dans l’état.
2. **Confirmer** avec la réponse : le contact renvoyé remplace la version locale.
3. **Revenir en arrière** en cas d’échec : on remet l’ancienne valeur, et on explique.

Mesures dans Chromium :

| Action                         | 50 ms après le clic       | 550 ms après le clic                                         |
| ------------------------------ | ------------------------- | ------------------------------------------------------------ |
| « Favori » sur Bruno           | `aria-pressed="true"`     | `aria-pressed="true"`, aucun message                         |
| « Favori » sur la mairie       | `aria-pressed="true"`     | `aria-pressed="false"`, « Erreur : Ce contact est verrouillé : modification impossible. » |

Pour la mairie, l’utilisateur voit le bouton s’enfoncer, puis revenir, avec un message qui
explique pourquoi. Sans le bloc `catch`, il verrait un favori que le serveur n’a jamais
enregistré, jusqu’au prochain rechargement : l’interface **mentirait**.

### Revenir en arrière sur ce qui a changé, et seulement cela

Le retour arrière remet `favorite: contact.favorite` sur **ce** contact, dans l’état actuel.
Une version tentante consiste à mémoriser toute la liste avant la modification
(`const previous = contacts;`) et à faire `setContacts(previous)` en cas d’échec. C’est faux dès
que deux actions se chevauchent : si une autre modification a réussi pendant l’attente, la
restauration de l’ancienne liste l’efface aussi. Annule seulement **ta** modification, avec
la forme fonctionnelle.

### Quand ne pas être optimiste

- Quand l’échec est fréquent ou prévisible (validation métier, droits) : l’utilisateur verrait
  sans cesse des allers-retours.
- Quand l’action est grave ou irréversible (payer, supprimer définitivement, envoyer un
  message) : il faut une confirmation réelle avant d’annoncer le succès.
- Quand le serveur calcule une partie du résultat (identifiant, total, date) : on ne peut pas
  l’inventer côté client.

C’est pour cela que la création et la suppression du carnet sont pessimistes, et le favori
optimiste.

## Pièges courants

1. **Ne pas tester `response.ok`** (ou contourner `apiRequest`) : un 403 ou un 500 est traité
   comme un succès, et l’écran diverge du serveur.
2. **Ajouter les valeurs saisies** au lieu de la ressource renvoyée : pas d’identifiant,
   données non normalisées.
3. **Utiliser `contacts` après un `await`** au lieu de `setContacts((current) => …)` : des
   modifications concurrentes s’écrasent, un contact supprimé réapparaît.
4. **Une mise à jour optimiste sans `catch`**, ou avec un `catch` qui se contente d’un
   `console.error` : l’interface affiche un état que le serveur n’a pas.
5. **Restaurer un instantané complet** en cas d’échec : efface les autres modifications
   réussies entre-temps.
6. **Lire `response.json()` après un 204** : `SyntaxError`, alors que la suppression a réussi.
7. **Oublier les éléments qui dépendent de la donnée supprimée** : ici, la fiche ouverte du
   contact supprimé est fermée (`setSelectedId(null)`).

## Exercices

### Exercice 1 — Une suppression optimiste

Réécris `handleDelete` pour qu’elle soit optimiste : le contact disparaît immédiatement ; si le
serveur refuse, il réapparaît **à sa place d’origine** avec le message d’erreur. Tu peux
supprimer `deletingId`. Indice : `toSpliced(index, 0, élément)` renvoie une copie du tableau
avec un élément inséré à la position `index`.

:::solution
```jsx
async function handleDelete(contact) {
  const index = contacts.findIndex((c) => c.id === contact.id);
  setActionMessage('');
  setContacts((current) => current.filter((c) => c.id !== contact.id));
  if (selectedId === contact.id) setSelectedId(null);
  try {
    await apiRequest(`/api/contacts/${contact.id}`, { method: 'DELETE' });
    setActionMessage(`Contact « ${contact.name} » supprimé.`);
  } catch (error) {
    // Retour arrière : on réinsère le contact à sa place d’origine.
    setContacts((current) => current.toSpliced(index, 0, contact));
    setActionMessage(`Erreur : ${describeError(error)}`);
  }
}
```

Retire aussi l’état `deletingId` et la prop correspondante de `ContactList`. Vérifié dans
Chromium :

- « Supprimer » sur Bruno : 50 ms après, la liste est « Awa Diallo, Chloé Martin, Accueil de
  la mairie » ; 500 ms plus tard, « Contact « Bruno Petit » supprimé. ».
- « Supprimer » sur Chloé puis aussitôt sur la mairie : 50 ms après, il ne reste qu’Awa ;
  600 ms plus tard, la liste est « Awa Diallo, Accueil de la mairie » et le message
  « Erreur : Ce contact est verrouillé : modification impossible. ».

Points d’attention :

- `index` est calculé **avant** la suppression, à partir de la liste du rendu courant.
- Le retour arrière utilise la forme fonctionnelle et `toSpliced`, qui ne modifie pas le
  tableau d’origine (contrairement à `splice`).
- Limite : si la liste a beaucoup changé pendant l’attente, la position d’origine n’a plus
  forcément de sens. Pour une suppression, recharger la liste en cas d’échec est une
  alternative simple et toujours juste.
- Est-ce une bonne idée ? Une suppression est une action grave : beaucoup d’interfaces
  préfèrent demander une confirmation, ou proposer « Annuler » pendant quelques secondes
  avant d’envoyer réellement la requête.
:::

### Exercice 2 — Le contact qui ressuscite

Un collègue a écrit ce `handleToggleFavorite`. Décris un scénario qui provoque un affichage
faux, puis corrige.

```jsx
async function handleToggleFavorite(contact) {
  const previous = contacts;
  setContacts(contacts.map((c) => (c.id === contact.id ? { ...c, favorite: !c.favorite } : c)));
  try {
    const updated = await apiRequest(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { favorite: !contact.favorite },
    });
    setContacts(contacts.map((c) => (c.id === updated.id ? updated : c)));
  } catch {
    setContacts(previous);
  }
}
```

:::solution
Trois défauts, tous liés à l’instantané `contacts` :

1. **Après le `await`**, `contacts.map(…)` repart de l’instantané pris au moment du clic, qui
   ignore tout ce qui s’est passé pendant l’attente. Scénario vérifié dans Chromium avec ce
   code : clic sur « Supprimer » pour Chloé, puis sur « Favori » pour Bruno. Le message
   annonce « Contact « Chloé Martin » supprimé. », le serveur ne l’a plus, mais la liste
   affichée la contient toujours : la réponse du `PATCH` l’a remise dans l’état.
2. **Le retour arrière** `setContacts(previous)` restaure toute la liste d’avant le clic et
   efface toute modification réussie entre-temps.
3. **Aucun message** en cas d’échec : l’étoile revient sans explication.

Correction : la version de la leçon (`handleToggleFavorite` dans `App.jsx`), qui utilise
`setContacts((current) => …)` dans les trois mises à jour, annule seulement le champ
`favorite` du contact concerné, et affiche `Erreur : ${describeError(error)}`.
:::

## Récapitulatif

- L’écran doit rester fidèle au serveur après chaque modification. Trois stratégies :
  **recharger**, **appliquer la réponse**, **optimiste avec retour arrière**.
- Toutes les requêtes passent par `apiRequest`, qui transforme les réponses non `ok` en
  `ApiError` et gère le 204. Un `PATCH` n’envoie que les champs modifiés.
- Après une création ou une modification, la **réponse du serveur** (identifiant, données
  normalisées) remplace les valeurs locales.
- Dans un gestionnaire asynchrone, les mises à jour qui dépendent de l’état utilisent la
  **forme fonctionnelle** ; sinon, des modifications concurrentes s’écrasent.
- Pessimiste : on attend, on signale l’attente (`aria-disabled`, texte du bouton), on empêche
  les doublons, on applique ou on affiche l’erreur.
- Optimiste : on applique tout de suite, on confirme avec la réponse, on **annule seulement sa
  propre modification** en cas d’échec et on l’explique. À réserver aux actions fréquentes,
  légères et qui réussissent presque toujours.
