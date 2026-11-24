---
title: Des formulaires contrôlés, validés et accessibles
summary: Gérer plusieurs champs dans un objet d’état, valider à l’envoi puis au fil de la saisie, afficher des erreurs accessibles, placer le focus sur le premier champ en erreur et empêcher la double soumission.
durationMinutes: 75
sources:
  - title: React — Composants de saisie (input)
    url: https://fr.react.dev/reference/react-dom/components/input
  - title: MDN — aria-invalid
    url: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid
  - title: MDN — aria-describedby
    url: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby
  - title: W3C — Comprendre le critère 3.3.1 Identification des erreurs (WCAG 2.2)
    url: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
---

## Le problème : un formulaire, c’est un dialogue

Dans la compétence « Formulaires et accessibilité », tu as construit des formulaires
dont le **navigateur** gérait la validation (`required`, `type="email"`, `pattern`) et que le
**serveur** revalidait en renvoyant une page d’erreurs. Dans une application React, la page ne
se recharge pas : c’est ton composant qui doit tout orchestrer.

- garder la valeur de chaque champ ;
- dire à l’utilisateur **ce qui ne va pas, où, et comment le corriger**, au bon moment : ni
  trop tôt (une erreur rouge dès la première lettre tapée), ni trop tard ;
- rendre ces erreurs perceptibles **sans la vue** : un lecteur d’écran doit les annoncer ;
- envoyer les données au serveur **une seule fois**, montrer que l’envoi est en cours, et
  afficher les erreurs que le serveur renvoie.

Cette leçon construit le formulaire « Nouveau contact » du carnet. Il envoie un `POST` à
l’API de la leçon 2, qui doit tourner (`node server/api.js`) en même temps que `npm run dev`.

## Plusieurs champs dans un objet d’état

Tu connais le champ contrôlé : `value` vient de l’état, `onChange` le met à jour. Avec cinq
champs, cinq `useState` et cinq gestionnaires deviennent pénibles. On regroupe les valeurs
dans **un objet**, et on écrit **un seul** gestionnaire :

```jsx
const initialValues = { name: '', email: '', phone: '', group: '', favorite: false };

const [values, setValues] = useState(initialValues);

function handleChange(event) {
  const { name, type, value, checked } = event.target;
  setValues({ ...values, [name]: type === 'checkbox' ? checked : value });
}
```

- Chaque champ porte un attribut `name` identique à la clé de l’objet : `name="email"` pour
  `values.email`. Le gestionnaire lit `event.target.name` pour savoir quelle clé modifier.
- `[name]: …` est une **propriété calculée** : la clé de l’objet est la valeur de la variable
  `name`. Si `name` vaut `'email'`, on obtient `{ ...values, email: value }`.
- `{ ...values, … }` crée un **nouvel** objet : on ne modifie jamais l’état en place.
- Une case à cocher n’a pas de `value` utile : son état est `checked`. Le gestionnaire teste
  donc `type`. Côté JSX, une case contrôlée utilise `checked={values.favorite}`, pas `value`.
- Une liste déroulante (`select`) se contrôle comme un champ texte, avec `value`.

## Les règles de validation : une fonction pure

Les règles ne dépendent pas de React. Place-les dans `src/validateContact.js` :

```js
// src/validateContact.js — règles de validation, sans React : une fonction pure
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values) {
  const errors = {};
  if (values.name.trim().length < 2) {
    errors.name = 'Erreur : indique un nom d’au moins 2 caractères.';
  }
  if (values.email.trim() === '') {
    errors.email = 'Erreur : indique une adresse électronique.';
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = 'Erreur : adresse électronique invalide, par exemple awa@example.fr.';
  }
  const phone = values.phone.replaceAll(' ', '');
  if (phone !== '' && !/^0\d{9}$/.test(phone)) {
    errors.phone = 'Erreur : le numéro doit compter 10 chiffres et commencer par 0.';
  }
  if (values.group === '') {
    errors.group = 'Erreur : choisis un groupe.';
  }
  return errors;
}
```

- La fonction reçoit les valeurs et renvoie un objet d’erreurs : une clé par champ invalide,
  aucune clé si tout va bien. `Object.keys(errors).length === 0` signifie « valide ».
- Les messages commencent par « Erreur » et **proposent une correction**, comme le demandent
  les critères 3.3.1 et 3.3.3 des WCAG vus dans la compétence sur les formulaires.
- C’est une fonction **pure** : même entrée, même sortie, aucun effet de bord. Tu pourras la
  tester sans navigateur (leçon 6) et la réutiliser dans un autre formulaire.
- Le serveur de la leçon 2 applique les mêmes règles. La validation côté client sert le
  **confort** de l’utilisateur ; la validation côté serveur sert la **sécurité**, car le
  navigateur appartient à l’utilisateur, qui peut envoyer n’importe quelle requête.

## Quand afficher les erreurs ?

Trois moments sont possibles, et un bon formulaire les combine :

1. **À l’envoi** : on valide tout ; s’il y a des erreurs, on les affiche toutes et on place le
   focus sur la première.
2. **Quand on quitte un champ** (événement `blur`) : l’utilisateur a fini de saisir, on peut
   lui signaler un problème. Pendant qu’il tape pour la première fois, on le laisse tranquille.
3. **Au fil de la saisie**, mais seulement pour un champ déjà signalé : dès que la valeur
   devient valide, l’erreur disparaît. Il voit immédiatement que sa correction fonctionne.

Pour cela, il suffit de deux informations en plus des valeurs : les champs déjà quittés
(`touched`, un objet `{ name: true, … }`) et le fait qu’un envoi ait été tenté
(`submitAttempted`). Les erreurs elles-mêmes **ne sont pas un état** : ce sont des données
dérivées des valeurs, recalculées à chaque rendu.

```jsx
const errors = validateContact(values);
function errorFor(field) {
  return touched[field] || submitAttempted ? errors[field] : undefined;
}
```

Stocker les erreurs dans un état mis à jour « au bon moment » est une source classique de
messages périmés : une erreur qui reste affichée alors que le champ a été corrigé, parce
qu’un gestionnaire a oublié de la retirer.

## Le composant complet

Voici `src/components/ContactForm.jsx`. Il est long parce que chaque champ est écrit en
entier : lis-le une fois en entier, puis reprends les explications.

```jsx
import { useState } from 'react';
import { apiRequest, ApiError, describeError } from '../api.js';
import { validateContact } from '../validateContact.js';

const initialValues = { name: '', email: '', phone: '', group: '', favorite: false };
const fieldOrder = ['name', 'email', 'phone', 'group']; // ordre d’affichage

function ContactForm({ onCreated }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({}); // champs déjà quittés
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Données dérivées : recalculées à chaque rendu, jamais stockées.
  const errors = { ...serverErrors, ...validateContact(values) };
  function errorFor(field) {
    return touched[field] || submitAttempted ? errors[field] : undefined;
  }

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    setValues({ ...values, [name]: type === 'checkbox' ? checked : value });
    setServerErrors({ ...serverErrors, [name]: undefined }); // la valeur a changé
  }

  function handleBlur(event) {
    setTouched({ ...touched, [event.target.name]: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return; // un envoi est déjà en cours
    const form = event.currentTarget; // à lire avant tout await
    setSubmitAttempted(true);
    const firstInvalid = fieldOrder.find((field) => errors[field]);
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid).focus();
      return;
    }
    setIsSubmitting(true);
    setMessage('Enregistrement en cours…');
    try {
      const created = await apiRequest('/api/contacts', { method: 'POST', body: values });
      onCreated(created);
      setValues(initialValues);
      setTouched({});
      setSubmitAttempted(false);
      setMessage(`Contact « ${created.name} » ajouté.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const fromServer = {};
        for (const [field, text] of Object.entries(error.fields)) {
          fromServer[field] = `Erreur : ${text}`;
        }
        setServerErrors(fromServer);
        setMessage('Erreur : le serveur a refusé certaines valeurs, corrige les champs signalés.');
      } else {
        setMessage(`Erreur : ${describeError(error)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const nameError = errorFor('name');
  const emailError = errorFor('email');
  const phoneError = errorFor('phone');
  const groupError = errorFor('group');

  return (
    <form noValidate onSubmit={handleSubmit}>
      <h2>Nouveau contact</h2>

      <div>
        <label htmlFor="name">Nom</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'name-error' : undefined}
        />
        {nameError && <p id="name-error">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="email">Adresse électronique</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && <p id="email-error">{emailError}</p>}
      </div>

      <div>
        <label htmlFor="phone">Téléphone (facultatif)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={phoneError ? 'phone-help phone-error' : 'phone-help'}
        />
        <p id="phone-help">10 chiffres, par exemple 06 12 34 56 78.</p>
        {phoneError && <p id="phone-error">{phoneError}</p>}
      </div>

      <div>
        <label htmlFor="group">Groupe</label>
        <select
          id="group"
          name="group"
          required
          value={values.group}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={groupError ? true : undefined}
          aria-describedby={groupError ? 'group-error' : undefined}
        >
          <option value="">Choisir un groupe</option>
          <option value="famille">Famille</option>
          <option value="amis">Amis</option>
          <option value="travail">Travail</option>
        </select>
        {groupError && <p id="group-error">{groupError}</p>}
      </div>

      <div>
        <input
          id="favorite"
          name="favorite"
          type="checkbox"
          checked={values.favorite}
          onChange={handleChange}
        />
        <label htmlFor="favorite">Ajouter aux favoris</label>
      </div>

      <button type="submit" aria-disabled={isSubmitting}>
        {isSubmitting ? 'Enregistrement…' : 'Ajouter le contact'}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

export default ContactForm;
```

Dans `src/App.jsx` (version de la leçon 2), importe le composant et affiche-le à la fin du
`main` :

```jsx
import ContactForm from './components/ContactForm.jsx';

// … dans le JSX, après la fiche :
<ContactForm onCreated={(contact) => setContacts((current) => [...current, contact])} />
```

`onCreated` reçoit le contact **renvoyé par le serveur**, avec son identifiant, et l’ajoute à
la liste. La forme fonctionnelle `setContacts((current) => …)` est expliquée à la leçon 4 ;
retiens pour l’instant qu’elle est nécessaire quand la mise à jour arrive après une attente.

## Des erreurs accessibles

Comportement vérifié dans Chromium, en cliquant sur « Ajouter le contact » sans rien remplir :

- trois messages apparaissent : « Erreur : indique un nom d’au moins 2 caractères. »,
  « Erreur : indique une adresse électronique. », « Erreur : choisis un groupe. » ;
- le focus est placé dans le champ « Nom » ;
- ce champ porte `aria-invalid="true"` et `aria-describedby="name-error"` ;
- aucune requête n’est envoyée.

Tape ensuite « A » : le message reste (un seul caractère). Tape « w » : le message disparaît et
les deux attributs aussi. Remplis « Téléphone » avec `06 12` : le message apparaît aussitôt
(un envoi a déjà été tenté), et `aria-describedby` vaut `"phone-help phone-error"`.

Ce que chaque choix apporte :

**Un `label` relié à chaque champ.** `htmlFor` (et non `for`, mot réservé en JavaScript)
désigne l’`id` du champ. Le clic sur l’étiquette place le focus dans le champ, et le lecteur
d’écran annonce l’étiquette « Nom » avec le type du champ. Un `placeholder` n’est pas une étiquette : il
disparaît dès qu’on tape.

**`required` et `noValidate`.** `noValidate` sur le formulaire désactive les bulles de
validation du navigateur, que l’on remplace par nos messages. `required` reste utile : il
fait annoncer le champ comme obligatoire.

**`aria-invalid`.** Le champ est annoncé comme invalide. On écrit
`aria-invalid={nameError ? true : undefined}` : avec `undefined`, React n’affiche pas
l’attribut du tout, ce qui évite un `aria-invalid="false"` inutile.

**`aria-describedby`.** Il relie le message au champ : en arrivant dans le champ, le lecteur
d’écran lit l’étiquette **puis** le message. Il accepte plusieurs `id` séparés par des espaces
(`"phone-help phone-error"`) : l’aide et l’erreur sont lues l’une après l’autre. Le message
n’existe dans le DOM que s’il y a une erreur, et l’attribut ne pointe vers lui que dans ce
cas : un `aria-describedby` vers un `id` absent est inutile.

**Le focus sur le premier champ en erreur.** Sans cela, un utilisateur au clavier ou au lecteur
d’écran clique sur « Ajouter » et… rien ne semble se passer. Le gestionnaire cherche le
premier champ invalide dans l’ordre d’affichage (`fieldOrder`), puis le retrouve dans le
formulaire par son `name` : `form.elements.namedItem(name)` renvoie le champ, et `focus()`
y place le curseur. Le lecteur d’écran annonce alors le champ, son état invalide et son
message.

**Un message global dans `role="status"`.** « Enregistrement en cours… », « Contact « Dan
Roux » ajouté. », « Erreur : … » : le paragraphe existe dès le départ et seul son texte change,
pour être annoncé.

**Les erreurs ne reposent pas sur la couleur.** Tu ajouteras sans doute un style (bordure
rouge sur `[aria-invalid='true']`), mais le texte « Erreur : … » reste l’information
principale.

:::warning[Lire `event.currentTarget` avant le premier `await`]
Le gestionnaire range le formulaire dans `const form = event.currentTarget` dès le début. Après
un `await`, `event.currentTarget` ne désigne plus rien : essai fait dans Chromium avec React
19, il vaut `FORM` avant l’attente et `null` après. Toute information tirée de l’événement se
lit au début du gestionnaire.
:::

## Envoyer sans envoyer deux fois

Un double clic sur « Ajouter » ne doit pas créer deux contacts. Retire la ligne
`if (isSubmitting) return;` et double-clique sur le bouton avec un formulaire valide. Résultat
observé : **deux** requêtes `POST`. La première crée le contact ; la seconde est refusée par le
serveur (adresse déjà utilisée) et le formulaire affiche finalement « Erreur : le serveur a
refusé certaines valeurs… » alors que le contact a bien été créé. L’utilisateur, perdu,
recommencera peut-être.

Le composant utilise un état `isSubmitting` pour trois choses :

1. **Ignorer les envois** pendant la requête : `if (isSubmitting) return;` en tête du
   gestionnaire. Avec cette ligne, le double clic n’envoie qu’**une** requête (vérifié).
2. **Montrer** que l’envoi est en cours : le bouton devient « Enregistrement… », et le statut
   « Enregistrement en cours… ».
3. **Signaler** l’indisponibilité du bouton avec `aria-disabled`, lu par les lecteurs d’écran.

`isSubmitting` repasse à `false` dans le bloc `finally`, que l’envoi réussisse ou échoue :
sinon, après une erreur, le formulaire resterait bloqué.

Pourquoi `aria-disabled` plutôt que `disabled` ? Tu l’as vu dans la compétence « Asynchrone,
promesses et fetch » : un bouton qui a le focus et devient `disabled` le **perd**. Vérifié ici avec
`disabled={isSubmitting}` : après le clic, le focus tombe sur `body`, et l’utilisateur au
clavier perd sa position. Avec `aria-disabled`, le bouton garde le focus ; comme il reste
cliquable, c’est la garde `if (isSubmitting) return;` qui ignore les clics. Les deux vont
ensemble.

:::note[Deux envois dans la même tâche]
Entre deux clics d’un humain, React a le temps de refaire le rendu : le second clic trouve
`isSubmitting` à `true`. Mais si du code déclenche deux envois **dans la même tâche**
(`button.click(); button.click();`), les deux s’exécutent avec l’ancienne valeur de l’état :
essai fait, deux requêtes partent. Pour une garde absolue, on utilise `useRef`, un hook qui
garde une valeur entre les rendus **sans** en provoquer : `const submittingRef = useRef(false)`,
puis `if (submittingRef.current) return; submittingRef.current = true;` et
`submittingRef.current = false` dans le `finally`. Avec cette variante, le même essai
n’envoie qu’une requête. Dans tous les cas, le **serveur** reste le dernier rempart : ici,
c’est son contrôle d’unicité de l’adresse qui a évité le doublon.
:::

## Les erreurs renvoyées par le serveur

Certaines erreurs ne peuvent être vues que par le serveur : ici, une adresse déjà utilisée
par un autre contact. Saisis « Awa Bis », `awa@example.fr`, groupe « Amis », et envoie. Après
0,6 s :

- le statut affiche « Erreur : le serveur a refusé certaines valeurs, corrige les champs
  signalés. » ;
- sous l’adresse : « Erreur : Cette adresse est déjà utilisée par un autre contact. ».

Le serveur répond 400 avec `{ "error": "Données invalides", "fields": { "email": "…" } }`.
`apiRequest` en fait une `ApiError` dont `fields` contient ces messages. Le composant les range
dans l’état `serverErrors`, puis les fusionne avec les erreurs locales :

```jsx
const errors = { ...serverErrors, ...validateContact(values) };
```

L’ordre compte : les erreurs locales, placées en second, l’emportent. Une erreur serveur
s’efface dès que l’utilisateur modifie le champ concerné (`handleChange` met sa clé à
`undefined`), car elle portait sur l’**ancienne** valeur. Tant qu’elle est présente, un nouvel
envoi est bloqué et place le focus sur l’adresse : renvoyer la même valeur ne servirait à
rien (vérifié : aucune requête). Une autre erreur (500, serveur arrêté) n’est liée à aucun
champ : elle s’affiche dans le statut, grâce à `describeError`.

Après un succès, le formulaire est vidé (`setValues(initialValues)`) et `touched` et
`submitAttempted` sont remis à zéro : sinon, le formulaire vide afficherait aussitôt ses trois
erreurs.

## Pièges courants

1. **Un `name` qui ne correspond pas à la clé** de l’objet : `handleChange` crée une nouvelle
   clé, et le champ semble ne pas réagir.
2. **`value` sur une case à cocher** au lieu de `checked` : la case ne se coche pas, ou la
   valeur stockée est la chaîne `"on"`.
3. **Stocker les erreurs dans un état** recalculé dans certains gestionnaires seulement :
   messages périmés. Dérive-les de `values`.
4. **Afficher les erreurs dès le premier caractère** : formulaire agressif. Attends le `blur`
   ou l’envoi.
5. **Un message seulement en couleur**, sans `aria-invalid` ni `aria-describedby`, ou un
   message vague (« Invalide ») : l’erreur est invisible pour certains et incompréhensible
   pour tous.
6. **Ne pas déplacer le focus** à l’envoi : l’utilisateur au clavier ne sait pas ce qui se
   passe.
7. **Lire `event.currentTarget` après un `await`** : il vaut `null`.
8. **Oublier la garde de double envoi**, ou oublier de remettre `isSubmitting` à `false` dans
   un `finally` : doublons, ou formulaire bloqué après une erreur.
9. **Valider seulement côté client** : le serveur doit toujours revalider.

## Exercices

### Exercice 1 — Des notes limitées à 200 caractères

Ajoute au formulaire un champ facultatif « Notes (facultatif) » (`textarea`), avec sous le
champ un compteur « N / 200 caractères » relié au champ, et une erreur
« Erreur : X caractère(s) en trop, 200 au maximum. » au-delà de 200 caractères. Le serveur
ignore ce champ : l’exercice ne porte que sur le formulaire.

:::solution
Dans `validateContact.js`, après la règle du groupe :

```js
if (values.notes.length > 200) {
  errors.notes = `Erreur : ${values.notes.length - 200} caractère(s) en trop, 200 au maximum.`;
}
```

Dans `ContactForm.jsx`, ajoute `notes: ''` à `initialValues` et `'notes'` à la fin de
`fieldOrder`, déclare `const notesError = errorFor('notes');` avec les autres, puis place ce
bloc avant la case à cocher :

```jsx
<div>
  <label htmlFor="notes">Notes (facultatif)</label>
  <textarea
    id="notes"
    name="notes"
    rows={3}
    value={values.notes}
    onChange={handleChange}
    onBlur={handleBlur}
    aria-invalid={notesError ? true : undefined}
    aria-describedby={notesError ? 'notes-help notes-error' : 'notes-help'}
  />
  <p id="notes-help">{values.notes.length} / 200 caractères</p>
  {notesError && <p id="notes-error">{notesError}</p>}
</div>
```

Vérifié dans Chromium : avec 203 caractères, le compteur affiche « 203 / 200 caractères »
mais pas encore d’erreur ; en quittant le champ, « Erreur : 3 caractère(s) en trop, 200 au
maximum. » apparaît et `aria-describedby` vaut `"notes-help notes-error"` ; après trois
retours arrière, « 200 / 200 caractères » et plus d’erreur.

- En React, un `textarea` se contrôle avec `value`, comme un `input` (en HTML, sa valeur est
  son contenu).
- Le compteur est **calculé** à partir de `values.notes` : aucun état supplémentaire.
- Le message dit combien de caractères retirer : c’est une correction concrète.
- On n’utilise pas `maxLength={200}` : le navigateur couperait silencieusement un texte collé
  trop long, sans rien dire à l’utilisateur.
:::

### Exercice 2 — Réparer un formulaire inaccessible

Un assistant a produit ce formulaire. Il « fonctionne » à la souris. Liste ses défauts
d’accessibilité et de conception, puis réécris-le.

```jsx
import { useState } from 'react';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Invalide');
      return;
    }
    setError('');
    console.log(`inscription de ${email}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Adresse électronique"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={{ borderColor: error ? 'red' : undefined }}
      />
      <span style={{ color: 'red' }}>{error}</span>
      <div onClick={handleSubmit}>Valider</div>
    </form>
  );
}

export default SignupForm;
```

:::solution
Défauts :

1. Pas d’étiquette : le `placeholder` disparaît à la saisie et n’est pas une étiquette fiable.
2. Le message n’est relié au champ ni par `aria-describedby`, ni signalé par `aria-invalid` ;
   seule la couleur indique l’erreur.
3. « Invalide » n’explique ni le problème ni la correction.
4. Le focus n’est pas déplacé vers le champ en erreur.
5. « Valider » est un `div` : il ne reçoit pas le focus et ne réagit ni à Entrée ni à Espace.
   Entrée dans le champ envoie quand même le formulaire, car il n’a qu’un champ : c’est ce
   qui masque souvent le problème.
6. L’erreur, stockée dans un état, reste affichée après correction jusqu’au prochain envoi.
7. Pas de `type="email"` ni d’`autoComplete="email"` : clavier mobile et remplissage
   automatique perdus.

```jsx
import { useState } from 'react';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Dérivé : l’erreur dépend de la saisie, elle disparaît dès que la saisie est corrigée.
  const error =
    submitAttempted && !email.includes('@')
      ? 'Erreur : il manque le symbole @, par exemple awa@example.fr.'
      : '';

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!email.includes('@')) {
      event.currentTarget.elements.namedItem('email').focus();
      return;
    }
    console.log(`inscription de ${email}`);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <label htmlFor="email">Adresse électronique</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && <p id="email-error">{error}</p>}
      <button type="submit">Valider</button>
    </form>
  );
}

export default SignupForm;
```

Vérifié dans Chromium : avec `awa.example.fr` et Entrée, le focus est dans le champ et le
message s’affiche ; dès que la saisie devient `awa@example.fr`, le message disparaît ; le
bouton envoie alors l’inscription.
:::

## Récapitulatif

- Plusieurs champs se gèrent avec **un objet** `values` et **un** gestionnaire qui utilise
  `event.target.name` et une propriété calculée `[name]` ; `checked` pour les cases à cocher.
- Les règles de validation vivent dans une **fonction pure**, réutilisable et testable ; le
  serveur revalide toujours.
- Les erreurs sont **dérivées** des valeurs ; on les montre après l’envoi ou après avoir quitté
  le champ, puis on les met à jour à chaque frappe.
- Accessibilité : `label` + `htmlFor`, `required` + `noValidate`, `aria-invalid` et
  `aria-describedby` seulement en cas d’erreur, messages qui expliquent la correction, focus
  sur le premier champ en erreur, statut global dans `role="status"`.
- Pendant l’envoi : état `isSubmitting`, garde contre la double soumission, bouton
  `aria-disabled` qui garde le focus, `finally` pour tout débloquer.
- Les erreurs par champ renvoyées par le serveur s’affichent sous le champ concerné et
  s’effacent quand il est modifié.
- `event.currentTarget` se lit avant le premier `await`.
