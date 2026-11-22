---
title: Gérer un formulaire sans casser l’accessibilité
summary: Intercepter l’envoi d’un formulaire, lire ses données avec FormData, afficher des erreurs accessibles, annoncer un message et gérer le focus.
durationMinutes: 70
sources:
  - title: MDN — FormData
    url: https://developer.mozilla.org/fr/docs/Web/API/FormData
  - title: MDN — HTMLFormElement, événement submit
    url: https://developer.mozilla.org/fr/docs/Web/API/HTMLFormElement/submit_event
  - title: MDN — HTMLInputElement.validity
    url: https://developer.mozilla.org/fr/docs/Web/API/HTMLInputElement/validity
  - title: W3C — WAI-ARIA 1.2, rôle status
    url: https://www.w3.org/TR/wai-aria-1.2/#status
---

## Pourquoi reprendre la main sur un formulaire ?

Sans JavaScript, un formulaire HTML fonctionne très bien : le navigateur vérifie les champs
`required`, puis envoie les données au serveur et charge une nouvelle page. Dans une application,
on veut souvent faire mieux : ajouter une tâche à une liste **sans recharger la page**, afficher
des messages d’erreur clairs à côté des champs, confirmer que l’action a réussi.

Le risque, en reprenant la main, est de **casser ce que le navigateur faisait bien** : l’envoi
avec la touche Entrée, l’annonce des erreurs aux lecteurs d’écran, le focus clavier. Cette
leçon montre comment ajouter du comportement sans rien retirer.

Rappel de la compétence sur les formulaires : chaque champ a un `label` associé (`for` = `id`
du champ), les groupes de cases sont dans un `fieldset` avec une `legend`, et **le serveur doit
toujours revalider** les données, car tout ce qui se passe dans le navigateur peut être
contourné.

## Écouter `submit`, pas `click`

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Inscription à l’atelier</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Inscription à l’atelier</h1>
    <form id="signup">
      <p>
        <label for="name">Nom</label>
        <input id="name" name="name" type="text" autocomplete="name" />
      </p>
      <p>
        <label for="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autocomplete="email" />
      </p>
      <fieldset>
        <legend>Sessions</legend>
        <input id="morning" name="sessions" type="checkbox" value="matin" />
        <label for="morning">Matin</label>
        <input id="afternoon" name="sessions" type="checkbox" value="après-midi" />
        <label for="afternoon">Après-midi</label>
      </fieldset>
      <p>
        <input id="newsletter" name="newsletter" type="checkbox" />
        <label for="newsletter">Recevoir la lettre d’information</label>
      </p>
      <button type="submit">S’inscrire</button>
    </form>
  </body>
</html>
```

```js
const form = document.querySelector('#signup');

form.addEventListener('submit', (event) => {
  event.preventDefault(); // pas de rechargement de la page

  const data = new FormData(form);
  console.log(data.get('name'));
  console.log(data.get('email'));
  console.log(data.getAll('sessions').join(', '));
  console.log(data.get('newsletter'));
  console.log(JSON.stringify(Object.fromEntries(data)));
  console.log(form.elements.email.value === data.get('email'));
});
```

Après avoir saisi `  Ada Lovelace ` (avec des espaces autour), `ada@example.com`, coché les deux
sessions puis appuyé sur **Entrée** dans le champ e-mail, la console affiche :

```text
  Ada Lovelace 
ada@example.com
matin, après-midi
null
{"name":"  Ada Lovelace ","email":"ada@example.com","sessions":"après-midi"}
true
```

et l’adresse de la page n’a pas changé.

- L’événement `submit` est émis **par le formulaire**, que l’envoi vienne d’un clic sur le
  bouton, de la touche Entrée dans un champ ou d’une technologie d’assistance. C’est
  l’événement qui signifie « le formulaire part ».
- Écouter `click` sur le bouton semble fonctionner (la touche Entrée dans un champ déclenche
  d’ailleurs un clic simulé sur le bouton d’envoi), mais ton code s’exécuterait **avant** la
  validation native : avec un champ requis vide, l’écouteur `click` s’exécute avec une valeur
  vide, alors que `submit` n’est pas émis.
- `event.preventDefault()` empêche l’envoi classique et le rechargement. Sans lui, la page se
  recharge et tout ce que ton code a affiché disparaît.
- Le bouton a `type="submit"` (valeur par défaut d’un `button` dans un formulaire). Les autres
  boutons d’un formulaire doivent avoir `type="button"`, sinon ils l’envoient aussi.

### Lire les valeurs avec `FormData`

`new FormData(form)` rassemble les champs **qui ont un attribut `name`**, avec leurs valeurs :

- `data.get('name')` renvoie la valeur d’un champ, **toujours une chaîne**, sans retirer les
  espaces : pense à `trim()`, et à `Number()` pour un nombre ;
- une case à cocher **non cochée** est **absente** : `get` renvoie `null`. Cochée sans attribut
  `value`, elle vaut `'on'` ;
- plusieurs champs du même nom (cases d’un groupe) se lisent avec `getAll`, qui renvoie un
  tableau ;
- `Object.fromEntries(data)` produit un objet pratique… mais ne garde que la **dernière**
  valeur d’un nom répété : `sessions` vaut `'après-midi'`, le matin a disparu.

On peut aussi lire un champ directement par `form.elements.nomDuChamp.value`. `FormData` a
l’avantage de lire tout le formulaire d’un coup, exactement comme le navigateur l’enverrait.

## La validation : native, puis accessible

### Ce que fait le navigateur

Avec des attributs comme `required`, `type="email"`, `minlength` ou `min`, le navigateur
vérifie les champs **avant** d’émettre `submit`. Si un champ est invalide, l’événement
`submit` n’est **pas** émis : il affiche une bulle sur le premier champ en erreur et lui donne
le focus. Ton écouteur ne s’exécute que pour un formulaire valide.

C’est un bon point de départ, mais les bulles ont des limites : leur texte dépend du
navigateur et de sa langue, elles disparaissent vite, et on ne peut pas les mettre en forme.
Pour des messages précis et durables, on prend la main.

### Prendre la main sans perdre l’accessibilité

L’attribut `novalidate` sur le formulaire désactive les bulles, mais **garde** les règles :
chaque champ expose son état dans `field.validity` (un objet `ValidityState`), avec des
propriétés booléennes comme `valueMissing` (champ requis vide), `typeMismatch` (adresse e-mail
mal formée), `tooShort`, `rangeUnderflow`, et `valid` qui les résume.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Inscription à l’atelier</title>
    <link rel="stylesheet" href="style.css" />
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Inscription à l’atelier</h1>
    <form id="signup" novalidate>
      <p>
        <label for="full-name">Nom (obligatoire)</label>
        <input
          id="full-name"
          name="fullName"
          type="text"
          required
          autocomplete="name"
          aria-describedby="full-name-error"
        />
        <span id="full-name-error" class="error"></span>
      </p>
      <p>
        <label for="email">Adresse e-mail (obligatoire)</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          aria-describedby="email-hint email-error"
        />
        <span id="email-hint">Exemple : nom@example.com</span>
        <span id="email-error" class="error"></span>
      </p>
      <button type="submit">S’inscrire</button>
    </form>
    <p id="status" role="status"></p>
  </body>
</html>
```

`style.css` :

```css
.error {
  display: block;
  color: #b00020;
}

[aria-invalid='true'] {
  border: 2px solid #b00020;
}
```

`main.js` :

```js
const form = document.querySelector('#signup');
const status = document.querySelector('#status');
const fields = [form.elements.fullName, form.elements.email];

const messages = {
  fullName: { valueMissing: 'Indique ton nom.' },
  email: {
    valueMissing: 'Indique ton adresse e-mail.',
    typeMismatch: 'L’adresse doit avoir la forme nom@example.com.',
  },
};

function getErrorMessage(field) {
  if (field.validity.valueMissing || field.value.trim() === '') {
    return messages[field.name].valueMissing;
  }
  if (field.validity.typeMismatch) {
    return messages[field.name].typeMismatch;
  }
  return '';
}

function showError(field, message) {
  document.getElementById(`${field.id}-error`).textContent = message;
  if (message) {
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.textContent = '';

  const invalidFields = fields.filter((field) => {
    const message = getErrorMessage(field);
    showError(field, message);
    return message !== '';
  });

  if (invalidFields.length > 0) {
    invalidFields[0].focus();
    return;
  }

  const { fullName, email } = Object.fromEntries(new FormData(form));
  // Ici, on enverrait les données au serveur, qui doit les valider à nouveau.
  console.log(JSON.stringify({ fullName: fullName.trim(), email }));
  status.textContent = `Merci ${fullName.trim()}, ton inscription est enregistrée.`;
  form.reset();
});

// Retirer l’erreur dès que le champ redevient valide
form.addEventListener('input', (event) => {
  const field = event.target;
  if (field.getAttribute('aria-invalid') === 'true' && getErrorMessage(field) === '') {
    showError(field, '');
  }
});
```

Déroulé vérifié dans Chromium, avec l’arbre d’accessibilité (ce que reçoit un lecteur d’écran) :

1. **Envoi à vide** : les deux messages s’affichent, les deux champs sont marqués invalides,
   et le focus va sur « Nom ». Le lecteur d’écran annonce le champ avec sa **description** :
   « Indique ton nom. ».
2. **Nom rempli d’espaces, e-mail `ada@`** : le nom est toujours refusé (voir l’encadré),
   l’e-mail affiche « L’adresse doit avoir la forme nom@example.com. ». Sa description
   accessible devient « Exemple : nom@example.com L’adresse doit avoir la forme
   nom@example.com. ».
3. **Saisie d’un nom** : grâce à l’écouteur `input`, l’erreur du nom disparaît pendant la
   frappe ; celle de l’e-mail reste.
4. **Formulaire valide envoyé avec Entrée** : la console affiche
   `{"fullName":"Ada","email":"ada@example.com"}`, le paragraphe de statut affiche
   « Merci Ada, ton inscription est enregistrée. » et le formulaire est vidé.

Les choix qui rendent ce formulaire accessible :

- **`aria-describedby`** relie le champ à son aide et à son message d’erreur : quand le champ
  reçoit le focus, le lecteur d’écran lit le label **puis** ces textes. Le `span` d’erreur reste
  dans la page, vide quand tout va bien : on change seulement son texte.
- **`aria-invalid="true"`** signale l’état invalide aux technologies d’assistance ; le CSS s’en
  sert aussi pour la bordure. L’erreur n’est donc pas signalée **uniquement** par la couleur.
- **Le focus va sur le premier champ en erreur** : l’utilisateur au clavier ou au lecteur
  d’écran est amené directement là où il doit agir, et entend le message.
- **Le message de succès est annoncé** grâce à `role="status"`, présenté juste après.
- On ne **désactive pas** le bouton d’envoi tant que le formulaire est invalide : un bouton
  grisé n’explique rien, et certains utilisateurs ne comprendraient pas pourquoi rien ne se
  passe. On laisse envoyer, et on explique.

:::warning[Un champ rempli d’espaces n’est pas vide pour le navigateur]
Pour `required`, la valeur `'   '` est présente : `validity.valueMissing` vaut `false`. D’où le
test supplémentaire `field.value.trim() === ''`. C’est un exemple de règle que la validation
native ne couvre pas, et une raison de plus pour que le serveur revalide.
:::

## Annoncer un message : les régions `aria-live`

Un message qui apparaît dans la page est visible, mais un utilisateur de lecteur d’écran n’en
sait rien : son lecteur lit l’endroit où se trouve le focus, pas le reste de l’écran. Une
**région live** (*live region*) demande aux technologies d’assistance d’annoncer les
changements de son contenu.

- `role="status"` crée une région live **polie** (équivalente à `aria-live="polite"`) : le
  changement est annoncé quand le lecteur a fini ce qu’il disait. C’est le bon choix pour une
  confirmation (« Tâche ajoutée »), un nombre de résultats, un état de chargement.
- `role="alert"` (équivalent à `aria-live="assertive"`) interrompt l’utilisateur. Réserve-le aux
  messages urgents et rares ; pour les erreurs de formulaire, déplacer le focus vers le champ
  concerné est souvent plus utile.

Deux règles pratiques :

1. **La région doit exister dans la page avant le message.** Mets un élément vide avec
   `role="status"` dans le HTML, puis change son `textContent`. Une région insérée dans la page
   déjà remplie risque de ne pas être annoncée : le comportement varie selon le navigateur et
   le lecteur d’écran, d’où cette règle prudente.
2. **Mets un texte complet et autonome** : « Tâche « Réviser » ajoutée. 2 tâche(s) en tout. »
   plutôt que « OK ».

## Gérer le focus

Le **focus** est l’élément qui reçoit le clavier. Il est visible (contour) et c’est lui que lit
un lecteur d’écran. Après une action, demande-toi : **où est le focus maintenant, et est-ce
utile ?**

- Après une erreur : sur le premier champ invalide (`field.focus()`).
- Après un ajout dans une liste : de retour dans le champ de saisie, pour enchaîner.
- Après la suppression d’un élément qui avait le focus : sur un élément proche (le suivant, le
  champ de saisie). Sinon, le focus est perdu : `document.activeElement` devient `body`, et
  l’utilisateur d’un lecteur d’écran peut se retrouver ramené en haut de la page.
- Après la fermeture d’un panneau : sur le bouton qui l’avait ouvert.

Ne retire jamais le contour de focus en CSS (`outline: none`) sans le remplacer par un style
visible.

## Pièges courants

1. **Écouter `click` sur le bouton** au lieu de `submit` sur le formulaire : ton code
   s’exécute même quand la validation native échoue, et un envoi déclenché autrement (par
   exemple par `form.requestSubmit()`) ne passe pas par lui.
2. **Oublier `preventDefault`** : la page se recharge et ton affichage disparaît aussitôt.
3. **Champ sans `name`** : il n’apparaît pas dans `FormData`.
4. **Croire que les valeurs sont typées** : tout est chaîne. `'16' + 1` donne `'161'`.
5. **`Object.fromEntries(new FormData(form))` avec des cases multiples** : seules les dernières
   valeurs restent. Utilise `getAll`.
6. **Message d’erreur affiché mais non relié au champ** : sans `aria-describedby`, le lecteur
   d’écran ne le lit pas quand on revient sur le champ.
7. **Région live créée à la volée**, ou message signalé seulement par une couleur.
8. **Faire confiance à la validation du navigateur** : elle aide l’utilisateur, elle ne protège
   pas le serveur.

## Exercices

### Exercice 1 — Lire un formulaire de préférences

Écris `readPreferences(form)` qui renvoie
`{ theme: 'clair' | 'sombre', channels: [...], fontSize: nombre }` à partir du formulaire
ci-dessous. Affiche le résultat à l’envoi, à côté de `Object.fromEntries(new FormData(form))`,
et explique les différences.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Préférences</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <form id="preferences">
      <fieldset>
        <legend>Thème</legend>
        <input id="light" name="theme" type="radio" value="clair" checked />
        <label for="light">Clair</label>
        <input id="dark" name="theme" type="radio" value="sombre" />
        <label for="dark">Sombre</label>
      </fieldset>
      <fieldset>
        <legend>Notifications</legend>
        <input id="by-email" name="channels" type="checkbox" value="email" />
        <label for="by-email">Par e-mail</label>
        <input id="by-sms" name="channels" type="checkbox" value="sms" />
        <label for="by-sms">Par SMS</label>
      </fieldset>
      <p>
        <label for="font-size">Taille du texte</label>
        <input id="font-size" name="fontSize" type="number" min="12" max="24" value="16" />
      </p>
      <button type="submit">Enregistrer</button>
    </form>
  </body>
</html>
```

:::solution
```js
function readPreferences(form) {
  const data = new FormData(form);
  return {
    theme: data.get('theme'),
    channels: data.getAll('channels'),
    fontSize: Number(data.get('fontSize')),
  };
}

const form = document.querySelector('#preferences');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  console.log(JSON.stringify(readPreferences(form)));
  console.log(JSON.stringify(Object.fromEntries(new FormData(form))));
});
```

Envoi sans rien changer, puis après avoir choisi « Sombre », coché les deux notifications et
saisi 20 :

```text
{"theme":"clair","channels":[],"fontSize":16}
{"theme":"clair","fontSize":"16"}
{"theme":"sombre","channels":["email","sms"],"fontSize":20}
{"theme":"sombre","channels":"sms","fontSize":"20"}
```

Trois différences : sans case cochée, `channels` est **absent** de l’objet de
`Object.fromEntries` alors que `getAll` renvoie un tableau vide, plus simple à utiliser ; avec
deux cases cochées, `Object.fromEntries` ne garde que `'sms'` ; enfin `fontSize` reste une
chaîne sans `Number`. Une fonction comme `readPreferences` fixe la forme des données une fois
pour toutes : le reste du programme n’a plus à s’en soucier.
:::

### Exercice 2 — Une liste de tâches accessible

Construis une page « Mes tâches » : un formulaire avec un champ « Nouvelle tâche » obligatoire
et un bouton « Ajouter », une liste, et une région de statut. Exigences :

- le titre est nettoyé avec `trim` ; un titre vide affiche une erreur reliée au champ, marque
  le champ invalide et y place le focus ;
- un ajout met à jour l’état (tableau d’objets, sans mutation), réaffiche la liste, annonce
  « Tâche « … » ajoutée. N tâche(s) en tout. », vide le champ et y remet le focus ;
- chaque tâche a un bouton « Supprimer » au nom accessible explicite, géré par délégation ;
  la suppression est annoncée et le focus revient dans le champ ;
- un titre comme `Acheter du <pain>` s’affiche tel quel.

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Mes tâches</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Mes tâches</h1>
    <form id="task-form" novalidate>
      <label for="title">Nouvelle tâche</label>
      <input id="title" name="title" type="text" required maxlength="60" aria-describedby="title-error" />
      <span id="title-error"></span>
      <button type="submit">Ajouter</button>
    </form>
    <ul id="tasks"></ul>
    <p id="status" role="status"></p>
  </body>
</html>
```

```js
const form = document.querySelector('#task-form');
const input = form.elements.title;
const error = document.querySelector('#title-error');
const list = document.querySelector('#tasks');
const status = document.querySelector('#status');

let tasks = [];
let nextId = 1;

function createTaskItem(task) {
  const item = document.createElement('li');
  item.dataset.id = String(task.id);
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Supprimer';
  deleteButton.setAttribute('aria-label', `Supprimer « ${task.title} »`);
  item.append(`${task.title} `, deleteButton);
  return item;
}

function render() {
  list.replaceChildren(...tasks.map(createTaskItem));
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (title === '') {
    error.textContent = 'Écris le titre de la tâche.';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  error.textContent = '';
  input.removeAttribute('aria-invalid');

  tasks = [...tasks, { id: nextId, title }];
  nextId += 1;
  render();
  status.textContent = `Tâche « ${title} » ajoutée. ${tasks.length} tâche(s) en tout.`;
  form.reset();
  input.focus();
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) {
    return;
  }
  const id = Number(button.closest('li').dataset.id);
  const removed = tasks.find((task) => task.id === id);
  tasks = tasks.filter((task) => task.id !== id);
  render();
  status.textContent = `Tâche « ${removed.title} » supprimée. ${tasks.length} tâche(s) en tout.`;
  input.focus();
});
```

Vérification dans Chromium : envoi à vide → « Écris le titre de la tâche. », focus dans le
champ ; ajout de `Acheter du <pain>` puis de `  Réviser  ` → la liste affiche les deux titres,
le premier avec ses chevrons, le statut indique « Tâche « Réviser » ajoutée. 2 tâche(s) en
tout. », le champ est vide et focalisé ; clic sur le bouton dont le nom accessible est
`Supprimer « Acheter du <pain> »` → statut
`Tâche « Acheter du <pain> » supprimée. 1 tâche(s) en tout.`

Points clés : `submit` couvre clic et Entrée ; le titre est inséré comme texte (`append` d’une
chaîne, `aria-label` par `setAttribute`), jamais comme HTML ; l’état est un nouveau tableau à
chaque changement ; `data-id` est une chaîne, d’où `Number` avant de comparer aux `id` numériques
de l’état. Le `aria-label` différencie les boutons « Supprimer » entre eux pour un lecteur
d’écran, qui peut lister tous les boutons de la page.
:::

### Exercice 3 — Critiquer un formulaire

Relève tous les problèmes d’accessibilité et de robustesse de ce code, puis explique comment
corriger chacun.

```html
<div id="newsletter">
  <input id="mail" placeholder="Ton e-mail" />
  <div id="send" class="btn">OK</div>
  <p id="msg" style="color: red"></p>
</div>
```

```js
document.querySelector('#send').addEventListener('click', () => {
  const value = document.querySelector('#mail').value;
  if (!value.includes('@')) {
    document.querySelector('#msg').innerHTML = `<b>${value}</b> n’est pas valide`;
    return;
  }
  document.querySelector('#msg').style.color = 'green';
  document.querySelector('#msg').textContent = 'Inscrit !';
});
```

:::solution
1. **Pas de `form`** : la touche Entrée ne fait rien et il n’y a pas d’événement `submit`.
   Utiliser un `form` avec un écouteur `submit` et `preventDefault`.
2. **Pas de `label`** : le `placeholder` disparaît dès la saisie et n’est pas un nom fiable pour
   les technologies d’assistance. Ajouter `label for="mail"`.
3. **Pas de `type="email"`, `name`, `required` ni `autocomplete="email"`** : ni validation native,
   ni clavier adapté sur mobile, ni remplissage automatique, ni lecture par `FormData`.
4. **Un `div` comme bouton** : ni focus, ni clavier, ni rôle. Utiliser `button type="submit"`.
5. **`innerHTML` avec la saisie** : faille XSS (`value` contient ce que tape l’utilisateur).
   Utiliser `textContent`.
6. **Message non annoncé et non relié** : ajouter `role="status"` à la zone de message (présente
   dès le chargement), relier l’erreur au champ avec `aria-describedby`, poser
   `aria-invalid="true"` et redonner le focus au champ en erreur.
7. **Erreur signalée seulement par la couleur**, et couleur changée en style en ligne : le texte
   doit suffire seul (« Adresse invalide : … »), et l’apparence passer par des classes.
8. **Validation trop faible** (`includes('@')` accepte `@`) et `trim` absent : s’appuyer sur
   `validity.typeMismatch` côté client, et revalider sur le serveur.
:::

## Récapitulatif

- Écoute `submit` sur le `form` et appelle `event.preventDefault()` ; le bouton d’envoi est un
  `button type="submit"`, les autres boutons `type="button"`.
- `new FormData(form)` lit les champs qui ont un `name` : valeurs en chaînes, case non cochée
  absente, `getAll` pour les groupes ; attention à `Object.fromEntries` avec des noms répétés.
- Validation native : elle bloque `submit` si un champ est invalide. Avec `novalidate`, on garde
  les règles et on lit `field.validity` pour afficher ses propres messages.
- Message d’erreur : texte explicite près du champ, relié par `aria-describedby`, champ marqué
  `aria-invalid="true"`, focus sur le premier champ en erreur.
- Message de succès : région `role="status"` présente dès le chargement, texte complet.
- Pense au focus après chaque action ; ne désactive pas le bouton d’envoi pour signaler une
  erreur.
- Toute donnée saisie s’insère avec `textContent`, et le serveur revalide toujours.
