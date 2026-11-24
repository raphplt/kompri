---
title: Tester des composants comme un utilisateur
summary: Configurer Vitest avec jsdom, rendre un composant avec Testing Library, le retrouver par rôle et libellé, simuler fetch, piloter un formulaire avec user-event et écrire des tests qui échouent vraiment quand le code est faux.
durationMinutes: 75
sources:
  - title: Vitest — Getting Started
    url: https://vitest.dev/guide/
  - title: Testing Library — React Testing Library
    url: https://testing-library.com/docs/react-testing-library/intro/
  - title: Testing Library — Priorité des requêtes (About Queries)
    url: https://testing-library.com/docs/queries/about/
  - title: Testing Library — user-event
    url: https://testing-library.com/docs/user-event/intro
---

## Pourquoi tester un composant ?

Dans la compétence « Tester son code », tu as appris à écrire des tests avec `node:test` :
choisir les cas, structurer un test, remplacer le réseau par une doublure, et faire échouer un
test avant de corriger un bug. Ces principes restent valables. Mais un composant React pose
deux difficultés nouvelles :

- il est écrit en **JSX**, que Node.js ne sait pas exécuter tel quel ;
- il produit un **DOM** et réagit à des **clics** et des **frappes**, alors que Node.js n’a ni
  `document` ni événements de page.

L’outillage habituel d’un projet Vite combine trois briques :

| Outil                          | Rôle                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| **Vitest**                     | lanceur de tests ; réutilise la configuration de Vite, donc comprend le JSX |
| **jsdom**                      | un DOM simulé en JavaScript (`document`, éléments, événements), sans navigateur |
| **Testing Library**            | affiche un composant dans ce DOM et le retrouve **comme un utilisateur** |

La philosophie de Testing Library tient en une phrase de sa documentation : plus tes tests
ressemblent à la façon dont ton logiciel est utilisé, plus ils te donnent confiance. On ne
teste donc pas l’état interne d’un composant (« `isSubmitting` vaut `true` »), mais ce qu’un
utilisateur perçoit (« le bouton s’appelle maintenant “Enregistrement…” et il est signalé
indisponible »). Bonus : un test qui retrouve les éléments par leur rôle et leur nom
**vérifie au passage l’accessibilité**.

## Installer et configurer

Dans le projet `carnet` (versions installées pour cette leçon : Vitest 5.1, jsdom 31,
@testing-library/react 16.3, @testing-library/dom 10.4, @testing-library/user-event 14.6) :

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event
```

`@testing-library/dom` est une **dépendance pair** (*peer dependency*) de
`@testing-library/react` : la bibliothèque en a besoin mais ne l’installe pas elle-même, d’où
sa présence explicite dans la commande.

Ajoute la section `test` à `vite.config.js` :

```js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Toute requête dont le chemin commence par /api est relayée à l’API.
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
```

- `defineConfig` est importé de `vitest/config` : c’est la même fonction que celle de Vite,
  qui connaît en plus la section `test`. Le serveur de développement et le build fonctionnent
  comme avant (vérifié).
- `environment: 'jsdom'` fournit `document` et `window` aux tests. Sans cette ligne, le
  premier `render` échoue avec `ReferenceError: document is not defined`.
- `setupFiles` désigne un fichier exécuté avant chaque fichier de test.

Crée ce fichier, `src/test/setup.js` :

```js
// src/test/setup.js — exécuté avant chaque fichier de test
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup(); // démonte ce que render a affiché
  vi.unstubAllGlobals(); // rend le vrai fetch après chaque test
});
```

Ce nettoyage n’est pas facultatif. Testing Library sait démonter automatiquement les
composants après chaque test, mais seulement si les fonctions de test sont **globales**, ce
qui n’est pas le cas par défaut avec Vitest. Essai fait sans ce fichier : deux tests qui
affichent chacun un bouton « Valider » ; le second échoue avec
`Found multiple elements with the role "button" and name "Valider"`, car le DOM du premier
test est toujours là.

Ajoute aussi une petite aide, `src/test/http.js`, pour fabriquer des réponses HTTP :

```js
// src/test/http.js — fabrique une vraie Response JSON pour les doublures de fetch
export function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Enfin, ajoute un script `test` dans `package.json` :

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "test": "vitest"
}
```

Dans un terminal interactif, `npm test` lance Vitest en mode **surveillance** : il relance les
tests concernés à chaque enregistrement. Vitest affiche alors lui-même ses raccourcis
(`press h to show help, press q to quit`) : `q` pour quitter. `npx vitest run` exécute les
tests une seule fois, comme en intégration continue.
Vitest trouve tout seul les fichiers dont le nom se termine par `.test.js` ou `.test.jsx` ; on
les place à côté du fichier testé.

## Un premier test : la fiche d’un contact

`src/components/ContactDetail.test.jsx` :

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContactDetail from './ContactDetail.jsx';
import { jsonResponse } from '../test/http.js';

describe('ContactDetail', () => {
  it('affiche la fiche une fois chargée', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { id: 2, name: 'Bruno Petit', email: 'bruno@example.fr', group: 'travail' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<ContactDetail contactId={2} />);

    expect(screen.getByText('Chargement de la fiche…')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Bruno Petit' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/contacts/2', expect.anything());
  });

  it('affiche le message du serveur en cas d’erreur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { error: 'Contact introuvable' })));

    render(<ContactDetail contactId={99} />);

    expect(await screen.findByText('Erreur : Contact introuvable')).toBeTruthy();
  });
});
```

```bash
npx vitest run src/components/ContactDetail.test.jsx
```

```text
 RUN  v5.1.1 /chemin/vers/carnet


 Test Files  1 passed (1)
      Tests  2 passed (2)
```

(suivi de l’heure et des durées). Ligne par ligne :

- **`describe` / `it` / `expect`** viennent de `vitest`. `describe` et `it` s’utilisent comme
  avec `node:test`. `expect(valeur)` est suivi d’un **matcher** : `toBe` (égalité stricte,
  `Object.is`), `toEqual` (égalité de contenu, comme `deepStrictEqual`), `toBeTruthy`,
  `toBeNull`, `toHaveBeenCalledTimes`…
- **`vi.fn()`** crée une fonction doublure qui enregistre ses appels, comme `t.mock.fn` ;
  `mockResolvedValue(x)` lui fait renvoyer une promesse tenue avec `x`.
- **`vi.stubGlobal('fetch', fetchMock)`** remplace le `fetch` global pendant le test ; le
  fichier de préparation le restaure ensuite. Le composant, lui, n’a pas changé : il appelle
  `fetch` sans savoir qu’il parle à une doublure.
- **`jsonResponse`** fabrique une vraie `Response`, objet standard disponible dans Node.js :
  `apiRequest` peut lire `status`, `ok`, l’en-tête `Content-Type` et le corps, exactement
  comme avec le serveur.
- **`render`** affiche le composant dans le DOM de jsdom. **`screen`** permet ensuite d’y
  chercher des éléments, dans toute la page.
- **`expect.anything()`** accepte n’importe quel second argument (ici, l’objet d’options avec
  le signal) : on vérifie l’adresse, pas les détails.

Le premier test vérifie **trois moments** : l’état de chargement est affiché tout de suite,
puis la fiche apparaît, puis la bonne adresse a été appelée.

## Trouver les éléments comme un utilisateur

Testing Library propose plusieurs familles de requêtes. Voici les principales, dans l’ordre
de préférence recommandé par sa documentation :

1. **`ByRole`** : par rôle d’accessibilité et nom accessible.
   `getByRole('button', { name: 'Ajouter le contact' })`, `getByRole('heading', { name: 'Bruno Petit' })`,
   `getByRole('textbox', { name: 'Nom' })`. C’est la requête par défaut.
2. **`ByLabelText`** : un champ par le texte de son étiquette.
3. **`ByText`** : un élément non interactif par son texte (un message, un paragraphe).
4. **`ByTestId`** : un attribut `data-testid`, en dernier recours, quand rien de visible ne
   permet de retrouver l’élément.

Quelques rôles utiles : `button`, `link`, `heading`, `textbox` (champ texte, adresse,
téléphone, zone de texte), `combobox` (liste déroulante simple), `checkbox`, `listitem`,
`status`. Le **nom accessible** est ce qu’annonce un lecteur d’écran : le texte du bouton,
l’étiquette du champ. Si `getByRole('textbox', { name: 'Nom' })` ne trouve rien, c’est souvent
que le champ n’a pas d’étiquette correcte : le test vient de trouver un défaut
d’accessibilité.

L’option `description` va plus loin : elle filtre sur la **description accessible**, celle que
fournit `aria-describedby`. Tu l’utiliseras pour vérifier qu’un message d’erreur est bien
**relié** à son champ, pas seulement affiché quelque part.

Chaque famille existe en trois variantes :

| Variante   | Si absent              | Si plusieurs        | Usage                                      |
| ---------- | ---------------------- | ------------------- | ------------------------------------------ |
| `getBy…`   | lève une erreur        | lève une erreur     | l’élément doit être là **maintenant**      |
| `queryBy…` | renvoie `null`         | lève une erreur     | vérifier qu’un élément est **absent**      |
| `findBy…`  | rejette après un délai | rejette             | attendre un élément qui **va apparaître**  |

`findBy…` renvoie une **promesse** : il réessaie jusqu’à ce que l’élément apparaisse, pendant
1 seconde par défaut. C’est l’outil de l’asynchrone : réponse de `fetch`, mise à jour après un
`await`. Il faut **toujours** l’attendre avec `await`.

## Tester un formulaire avec user-event

`@testing-library/user-event` simule un utilisateur : `user.type` tape caractère par
caractère (avec les événements clavier et `input` pour chacun), `user.click` déplace le
pointeur et clique, `user.tab` déplace le focus, `user.selectOptions` choisit une option. On
crée une session avec `userEvent.setup()` au début de chaque test, et **chaque action
s’attend** avec `await`.

`src/components/ContactForm.test.jsx` :

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContactForm from './ContactForm.jsx';
import { jsonResponse } from '../test/http.js';

async function fillValidForm(user) {
  await user.type(screen.getByRole('textbox', { name: 'Nom' }), 'Dan Roux');
  await user.type(screen.getByRole('textbox', { name: 'Adresse électronique' }), 'dan@example.fr');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Groupe' }), 'travail');
}

describe('ContactForm', () => {
  it('signale les champs invalides et place le focus sur le premier', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ContactForm onCreated={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Ajouter le contact' }));

    const nameInput = screen.getByRole('textbox', {
      name: 'Nom',
      description: 'Erreur : indique un nom d’au moins 2 caractères.',
    });
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(nameInput);
    expect(screen.getByText('Erreur : choisis un groupe.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('efface l’erreur dès que la saisie devient valide', async () => {
    const user = userEvent.setup();
    render(<ContactForm onCreated={() => {}} />);
    const nameInput = screen.getByRole('textbox', { name: 'Nom' });

    await user.type(nameInput, 'A');
    await user.tab(); // quitter le champ
    expect(screen.getByText('Erreur : indique un nom d’au moins 2 caractères.')).toBeTruthy();

    await user.type(nameInput, 'wa');
    expect(screen.queryByText('Erreur : indique un nom d’au moins 2 caractères.')).toBeNull();
    expect(nameInput.getAttribute('aria-invalid')).toBeNull();
  });

  it('envoie le contact une seule fois et prévient le parent', async () => {
    const user = userEvent.setup();
    const created = { id: 5, name: 'Dan Roux', email: 'dan@example.fr', phone: '', group: 'travail' };
    let respond; // la réponse n’arrivera que quand le test le décidera
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onCreated = vi.fn();
    render(<ContactForm onCreated={onCreated} />);

    await fillValidForm(user);
    await user.dblClick(screen.getByRole('button', { name: 'Ajouter le contact' }));

    // La requête est toujours en cours : le second clic a dû être ignoré.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: 'Enregistrement…' });
    expect(button.getAttribute('aria-disabled')).toBe('true');

    respond(jsonResponse(201, created));

    expect(await screen.findByText('Contact « Dan Roux » ajouté.')).toBeTruthy();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/contacts');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Dan Roux',
      email: 'dan@example.fr',
      phone: '',
      group: 'travail',
      favorite: false,
    });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(screen.getByRole('textbox', { name: 'Nom' }).value).toBe('');
  });

  it('affiche l’erreur renvoyée par le serveur sous le bon champ', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: 'Données invalides',
          fields: { email: 'Cette adresse est déjà utilisée par un autre contact.' },
        }),
      ),
    );
    const onCreated = vi.fn();
    render(<ContactForm onCreated={onCreated} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter le contact' }));

    expect(
      await screen.findByRole('textbox', {
        name: 'Adresse électronique',
        description: 'Erreur : Cette adresse est déjà utilisée par un autre contact.',
      }),
    ).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
```

Ce que chaque test apporte :

1. **Envoi à vide.** On vérifie le comportement accessible complet : le champ « Nom » a pour
   description le message d’erreur (donc `aria-describedby` est correct), `aria-invalid`
   vaut `"true"`, le focus est sur lui (`document.activeElement`), et `fetch` n’a **pas** été
   appelé.
2. **Validation au fil de la saisie.** `user.tab()` quitte le champ, ce qui déclenche `blur` ;
   l’erreur apparaît. Deux lettres de plus, elle disparaît : `queryByText` renvoie `null`.
3. **Envoi réussi et double clic.** Expliqué dans la section suivante.
4. **Erreur du serveur.** La doublure répond 400 avec `fields` ; on attend (`findByRole`) que
   le champ « Adresse électronique » ait la bonne description, et on vérifie que le parent
   n’a pas été prévenu.

```bash
npx vitest run --reporter=verbose
```

```text
 RUN  v5.1.1 /chemin/vers/carnet

 ✓ src/components/ContactDetail.test.jsx > ContactDetail > affiche la fiche une fois chargée 88ms
 ✓ src/components/ContactDetail.test.jsx > ContactDetail > affiche le message du serveur en cas d’erreur 7ms
 ✓ src/App.test.jsx > affiche l’erreur de chargement puis réessaie 169ms
 ✓ src/components/ContactForm.test.jsx > ContactForm > signale les champs invalides et place le focus sur le premier 155ms
 ✓ src/components/ContactForm.test.jsx > ContactForm > efface l’erreur dès que la saisie devient valide 66ms
 ✓ src/components/ContactForm.test.jsx > ContactForm > envoie le contact une seule fois et prévient le parent 164ms
 ✓ src/components/ContactForm.test.jsx > ContactForm > affiche l’erreur renvoyée par le serveur sous le bon champ 108ms

 Test Files  3 passed (3)
      Tests  7 passed (7)
```

Le reporter `verbose` liste chaque test ; sans lui, Vitest n’affiche que le résumé quand tout
passe. Avec davantage de fichiers, Vitest peut ajouter un conseil de performance sur la
création de l’environnement jsdom : ce n’est pas une erreur.

## Le test qui ne vérifiait rien

La première version du test 3 était plus courte :

```jsx
const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, created));
// …
await fillValidForm(user);
await user.dblClick(screen.getByRole('button', { name: 'Ajouter le contact' }));
expect(await screen.findByText('Contact « Dan Roux » ajouté.')).toBeTruthy();
expect(fetchMock).toHaveBeenCalledTimes(1);
```

Elle passait. Pour vérifier qu’elle protégeait vraiment, on a **supprimé la garde**
`if (isSubmitting) return;` du composant… et le test passait **toujours**. Pourquoi ? La
doublure répond instantanément : le premier envoi se termine et **vide le formulaire** avant
le second clic ; le second envoi trouve des champs vides et s’arrête à la validation. Le test
ne mettait jamais le composant dans la situation qu’il prétendait vérifier : un second clic
**pendant** une requête en cours.

La version de la leçon garde la réponse en suspens : `fetchMock` renvoie une promesse dont le
test conserve la fonction `respond`. Pendant le double clic, la requête est donc « en vol ». On
vérifie qu’un seul appel est parti et que le bouton annonce l’envoi, **puis** on fait répondre
le serveur avec `respond(…)`. Sans la garde, ce test échoue :

```text
AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times
```

C’est la leçon la plus importante de ce chapitre : **un test qui n’a jamais échoué ne prouve
rien**. Après avoir écrit un test, casse volontairement le code qu’il protège (retire une
ligne, inverse une condition) et vérifie qu’il échoue, avec un message clair. Puis remets le
code.

Autre façon d’écrire un test inutile : oublier `await` devant `findBy…`.

```jsx
it('affiche la fiche du contact', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
  render(<ContactDetail contactId={2} />);
  screen.findByRole('heading', { name: 'Bruno Petit' });
});
```

Ce test **passe**, alors que le serveur simulé répond 500 et que la fiche n’apparaîtra jamais :
la promesse de `findByRole` n’est pas attendue, le test se termine avant elle. Avec `async` et
`await`, il échoue comme il le doit :

```text
TestingLibraryElementError: Unable to find role="heading" and name "Bruno Petit"
```

suivi du DOM au moment de l’échec, qui montre `Erreur : Réponse inattendue du serveur (500).`.
Ce DOM affiché est précieux pour comprendre un test qui échoue.

## Tester un chargement avec erreur, et le contexte

`src/App.test.jsx` vérifie le parcours « erreur puis Réessayer » de la leçon 2 :

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import App from './App.jsx';
import ThemeProvider from './theme/ThemeProvider.jsx';
import { jsonResponse } from './test/http.js';

it('affiche l’erreur de chargement puis réessaie', async () => {
  const user = userEvent.setup();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse(500, { error: 'Erreur interne simulée' }))
    .mockResolvedValueOnce(jsonResponse(200, [{ id: 1, name: 'Awa Diallo', favorite: true }]));
  vi.stubGlobal('fetch', fetchMock);

  render(<App />, { wrapper: ThemeProvider });

  expect(await screen.findByText('Erreur : Erreur interne simulée')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByRole('button', { name: 'Awa Diallo' })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
```

- **`mockResolvedValueOnce`** enchaîne des réponses différentes : la première requête reçoit
  500, la seconde la liste. L’ordre des appels de `fetch` est donc scénarisé.
- **`wrapper: ThemeProvider`** enveloppe `App` dans le fournisseur de thème. Sans lui, le test
  échoue avec l’erreur de `useTheme` :
  `useTheme doit être appelé dans un composant placé sous <ThemeProvider>.` C’est la « dépendance cachée » du contexte évoquée à la leçon 5 : le test
  doit reconstituer l’environnement que `main.jsx` fournit en vrai.
- Ce test ne connaît ni `status`, ni `attempt` : il vérifie ce que voit l’utilisateur. On
  pourrait réécrire tout le chargement (par exemple avec `useFetch`) sans le modifier.

## Ce que ces tests ne prouvent pas

- **jsdom n’est pas un navigateur.** Il ne calcule pas la mise en page, ne dessine rien, et ne
  vérifie pas le contraste ou la visibilité réelle. Les contrôles au clavier et avec un
  lecteur d’écran de la compétence sur l’accessibilité restent nécessaires.
- **Les doublures reproduisent ce que tu crois** que l’API renvoie. Si le serveur change le
  format de ses erreurs, ces tests resteront verts. D’autres tests, côté serveur, et des essais
  de bout en bout dans un vrai navigateur complètent ceux-ci.
- **StrictMode n’est pas actif** par défaut dans `render`. Les problèmes de nettoyage se voient
  mieux dans `npm run dev`.

## Pièges courants

1. **Oublier `environment: 'jsdom'`** : `document is not defined`.
2. **Oublier `cleanup`** dans le fichier de préparation : les rendus s’accumulent, `getBy…`
   trouve plusieurs éléments.
3. **Oublier `await`** devant `findBy…` ou une action `user.…` : test faux positif, ou
   assertion exécutée trop tôt.
4. **`getBy…` pour un élément qui va apparaître** : échec immédiat. Utilise `findBy…`.
5. **`getBy…` pour vérifier une absence** : il lève une erreur. Utilise `queryBy…` et
   `toBeNull()`.
6. **Chercher par classe CSS ou par structure** (`container.querySelector('.error')`) : le
   test casse au moindre changement de style et ne vérifie rien de ce que vit l’utilisateur.
7. **Une doublure qui répond instantanément** pour tester un état « en cours » : la situation
   n’existe jamais dans le test. Garde la réponse en suspens.
8. **Ne jamais voir échouer un test** : casse volontairement le code pour vérifier qu’il
   protège quelque chose.
9. **Appeler la vraie API** dans les tests : lents, dépendants du serveur et de ses données.
10. **Une doublure de `fetch` qui ignore `signal`** pour tester une annulation : la réponse
    « annulée » arrive quand même, et le test ne prouve rien, ou échoue sur un code correct.
    Fais rejeter la promesse de la doublure avec une `AbortError` quand le signal est annulé :
    `options.signal.addEventListener('abort', () => reject(new DOMException('Requête annulée', 'AbortError')))`.

## Exercices

### Exercice 1 — Tester le retour arrière d’un favori

Écris un test pour `App` : la liste contient « Accueil de la mairie » (non favori) ; un clic sur
son bouton « Favori » reçoit une réponse 403. Vérifie le message d’erreur, que le bouton n’est
plus enfoncé, et que la requête était un `PATCH` vers `/api/contacts/4` avec le corps
`{ "favorite": true }`. Vérifie ensuite que ton test **échoue** si tu supprimes le retour
arrière de `handleToggleFavorite`.

:::solution
`src/App.favorite.test.jsx` :

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import App from './App.jsx';
import ThemeProvider from './theme/ThemeProvider.jsx';
import { jsonResponse } from './test/http.js';

it('annule le favori si le serveur refuse', async () => {
  const user = userEvent.setup();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse(200, [{ id: 4, name: 'Accueil de la mairie', favorite: false, locked: true }]),
    )
    .mockResolvedValueOnce(
      jsonResponse(403, { error: 'Ce contact est verrouillé : modification impossible.' }),
    );
  vi.stubGlobal('fetch', fetchMock);
  render(<App />, { wrapper: ThemeProvider });

  const item = (await screen.findByRole('button', { name: 'Accueil de la mairie' })).closest('li');
  const favorite = within(item).getByRole('button', { name: 'Favori' });
  expect(favorite.getAttribute('aria-pressed')).toBe('false');

  await user.click(favorite);

  expect(
    await screen.findByText('Erreur : Ce contact est verrouillé : modification impossible.'),
  ).toBeTruthy();
  expect(favorite.getAttribute('aria-pressed')).toBe('false');
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toBe('/api/contacts/4');
  expect(options.method).toBe('PATCH');
  expect(JSON.parse(options.body)).toEqual({ favorite: true });
});
```

- `within(item)` limite la recherche à un élément : utile quand chaque ligne a un bouton
  « Favori ». `closest('li')` remonte du bouton du nom à sa ligne.
- `fetchMock.mock.calls[1]` est le second appel (le premier est le chargement de la liste) :
  ses arguments sont l’adresse et les options passées à `fetch` par `apiRequest`.
- Vérification par mutation, faite : en supprimant le `setContacts` du bloc `catch`, le test
  échoue avec `AssertionError: expected 'true' to be 'false'`, puisque le bouton reste enfoncé.
:::

### Exercice 2 — Tester `useFetch` directement

`renderHook`, fourni par `@testing-library/react`, exécute un hook dans un petit composant de
test et donne accès à sa valeur de retour par `result.current`. Écris deux tests pour
`useFetch` : il passe de « chargement » aux données ; et quand l’adresse change, la requête
précédente est annulée (son signal est `aborted`).

:::solution
`src/hooks/useFetch.test.js` :

```js
import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useFetch } from './useFetch.js';
import { jsonResponse } from '../test/http.js';

it('passe de « chargement » aux données', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { id: 2 })));

  const { result } = renderHook(() => useFetch('/api/contacts/2'));

  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toEqual({ id: 2 });
  expect(result.current.error).toBeNull();
});

it('annule la requête précédente quand l’adresse change', async () => {
  const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fetchMock);

  const { rerender } = renderHook(({ url }) => useFetch(url), {
    initialProps: { url: '/api/contacts/1' },
  });
  rerender({ url: '/api/contacts/2' });

  const firstSignal = fetchMock.mock.calls[0][1].signal;
  const lastSignal = fetchMock.mock.calls.at(-1)[1].signal;
  expect(firstSignal.aborted).toBe(true);
  expect(lastSignal.aborted).toBe(false);
});
```

- `waitFor(fonction)` réexécute la fonction jusqu’à ce qu’elle ne lève plus d’erreur (1 s au
  maximum) : c’est l’équivalent de `findBy…` pour une condition quelconque.
- `rerender` refait le rendu avec de nouvelles props : c’est ainsi qu’on simule le changement
  d’adresse. La doublure renvoie une promesse qui ne se tient jamais : seul l’abandon compte.
- On retrouve les signaux dans les arguments des appels de `fetch` : le premier est annulé,
  le dernier ne l’est pas. Les deux tests passent.
- Le fichier ne contient pas de JSX : l’extension `.js` suffit.
- Tester le hook directement est utile pour une brique réutilisée partout ; pour le reste,
  préfère tester les composants qui l’utilisent, comme `ContactDetail`.
:::

## Récapitulatif

- **Vitest** exécute les tests avec la configuration de Vite ; **jsdom** fournit un DOM ;
  **Testing Library** affiche les composants et les retrouve comme un utilisateur.
- Configuration : `test: { environment: 'jsdom', setupFiles: [...] }` dans `vite.config.js`
  (avec `defineConfig` de `vitest/config`), et un fichier de préparation qui appelle `cleanup`
  et `vi.unstubAllGlobals` après chaque test.
- Requêtes : `getByRole` d’abord (avec `name`, et `description` pour les erreurs reliées),
  puis `getByLabelText`, `getByText`. `getBy` pour maintenant, `queryBy` pour une absence,
  `await findBy` pour ce qui va apparaître.
- `vi.stubGlobal('fetch', vi.fn()…)` remplace le réseau ; `mockResolvedValueOnce` scénarise une
  suite de réponses ; une promesse gardée en suspens permet de tester un état « en cours ».
- `userEvent.setup()`, puis `await user.type / click / tab / selectOptions / dblClick`.
- Un composant qui lit un contexte se teste avec `render(…, { wrapper: Fournisseur })`.
- Un test doit avoir été vu **en échec** : casse le code qu’il protège pour t’en assurer.
