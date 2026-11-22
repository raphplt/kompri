---
title: Écouter les événements
summary: Réagir aux clics et au clavier, lire l’objet événement, annuler un comportement par défaut, comprendre la propagation et utiliser la délégation.
durationMinutes: 60
sources:
  - title: MDN — EventTarget.addEventListener()
    url: https://developer.mozilla.org/fr/docs/Web/API/EventTarget/addEventListener
  - title: MDN — Event
    url: https://developer.mozilla.org/fr/docs/Web/API/Event
  - title: MDN — Event.preventDefault()
    url: https://developer.mozilla.org/fr/docs/Web/API/Event/preventDefault
  - title: WHATWG — DOM, Events
    url: https://dom.spec.whatwg.org/#events
---

## Un programme qui attend

Les scripts que tu as écrits jusqu’ici s’exécutaient de haut en bas, puis s’arrêtaient. Une
interface fonctionne autrement : le code prépare la page, puis **attend** que quelque chose
se passe — un clic, une touche, une saisie — pour réagir.

Chaque action de ce genre produit un **événement** : un objet qui décrit ce qui s’est passé, et
sur quel élément. Ton code enregistre des **écouteurs** (*event listeners*) : des fonctions que
le navigateur appellera quand un événement donné se produit sur un élément donné. C’est
exactement le principe du callback vu avec les fonctions : tu fournis la fonction, le
navigateur décide quand l’appeler.

Les pages de cette leçon se servent avec `node serve.js` (leçon 1). Les sorties sont celles de
la console de Chromium après les actions décrites.

## `addEventListener` et l’objet événement

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Compteur</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <button id="like" type="button">J’aime</button>
    <p id="likes">0 mention J’aime</p>
  </body>
</html>
```

```js
const button = document.querySelector('#like');
const output = document.querySelector('#likes');
let likes = 0;

function handleLike(event) {
  likes += 1;
  output.textContent = `${likes} mention(s) J’aime`;
  console.log(event.type, event.target === button, event.currentTarget === button);
}

button.addEventListener('click', handleLike);
```

Après un clic de souris, puis la touche Entrée et la barre d’espace sur le bouton qui a le
focus, la console affiche trois fois :

```text
click true true
```

et le paragraphe indique « 3 mention(s) J’aime ».

- `element.addEventListener(type, listener)` enregistre la fonction `listener` pour les
  événements de ce `type` sur cet élément. On passe **la fonction elle-même**, `handleLike`,
  sans parenthèses : avec `handleLike()`, on l’appellerait immédiatement et on enregistrerait
  sa valeur de retour, `undefined`.
- Le navigateur appelle l’écouteur avec un **objet événement**. Ses propriétés les plus utiles :
  - `type` : le type d’événement (`'click'`) ;
  - `target` : l’élément sur lequel l’action a eu lieu ;
  - `currentTarget` : l’élément sur lequel **cet** écouteur est enregistré ;
  - pour le clavier, `key` : la touche (`'Enter'`, `'Escape'`, `'a'`…).
- Un `button` déclenche `click` à la souris, au toucher **et au clavier** (Entrée, Espace).
  C’est une des raisons d’utiliser un vrai bouton (voir plus bas).
- `likes` est déclaré en dehors de l’écouteur, pour conserver sa valeur d’un clic à l’autre :
  l’écouteur est une fermeture (*closure*) qui y a accès.

### Les événements les plus courants

| Événement     | Se produit quand…                                           | Sur                         |
| ------------- | ----------------------------------------------------------- | --------------------------- |
| `click`       | l’élément est activé (souris, toucher, clavier pour un bouton) | boutons, liens, tout élément |
| `input`       | la valeur d’un champ change, à chaque frappe                | `input`, `textarea`, `select` |
| `change`      | la valeur est validée (case cochée, choix fait, champ quitté) | champs de formulaire      |
| `submit`      | un formulaire est envoyé                                    | `form`                      |
| `keydown`     | une touche est enfoncée                                     | élément qui a le focus, `document` |
| `focus`, `blur` | l’élément reçoit ou perd le focus                         | éléments focalisables       |

### Saisie et clavier

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Clavier et saisie</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <label for="bio">Présentation (80 caractères au plus)</label>
    <textarea id="bio" maxlength="80"></textarea>
    <p id="bio-count">0 / 80</p>

    <button id="open" type="button">Ouvrir le panneau</button>
    <div id="panel" hidden>
      <p>Contenu du panneau. Appuie sur Échap pour le fermer.</p>
    </div>
  </body>
</html>
```

```js
const bio = document.querySelector('#bio');
const bioCount = document.querySelector('#bio-count');

bio.addEventListener('input', (event) => {
  bioCount.textContent = `${event.target.value.length} / 80`;
});

const openButton = document.querySelector('#open');
const panel = document.querySelector('#panel');

openButton.addEventListener('click', () => {
  panel.hidden = false;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) {
    panel.hidden = true;
    openButton.focus();
  }
});
```

Après avoir tapé « Salut » dans la zone de texte, le compteur affiche `5 / 80`. Un clic sur
« Ouvrir le panneau » l’affiche ; Échap le masque et **remet le focus sur le bouton** qui l’avait
ouvert, pour qu’un utilisateur au clavier ne soit pas perdu.

- `input` se déclenche à chaque modification : idéal pour un compteur ou un filtre « en
  direct ». `event.target.value` est la valeur actuelle du champ, **toujours une chaîne**.
- L’écouteur `keydown` est placé sur `document` : il reçoit les touches quel que soit l’élément
  qui a le focus (grâce à la propagation, expliquée plus bas).
- `element.focus()` déplace le focus clavier. Gérer le focus fait partie du travail dès qu’on
  affiche ou masque du contenu.

## Annuler le comportement par défaut : `preventDefault`

Certains événements ont une **action par défaut** : un clic sur un lien navigue, l’envoi d’un
formulaire recharge la page, cocher une case la coche. `event.preventDefault()` annule cette
action, sans empêcher ton code de s’exécuter.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Conditions</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <p>
      <input id="accept" type="checkbox" />
      <label for="accept">J’ai lu les conditions</label>
    </p>
    <a id="continue" href="/inscription">Continuer</a>
    <p id="error" hidden>Coche la case pour continuer.</p>
  </body>
</html>
```

```js
const accept = document.querySelector('#accept');
const link = document.querySelector('#continue');
const error = document.querySelector('#error');

link.addEventListener('click', (event) => {
  if (!accept.checked) {
    event.preventDefault(); // annule la navigation prévue par le lien
    error.hidden = false;
  }
});

accept.addEventListener('change', () => {
  error.hidden = true;
});
```

Case décochée, un clic sur « Continuer » laisse sur la page et affiche le message. Case cochée,
le lien navigue normalement vers `/inscription`. Le cas d’usage principal de `preventDefault`
est l’événement `submit` d’un formulaire, traité dans la leçon suivante.

## La propagation des événements

Quand tu cliques sur un bouton placé dans un `li`, lui-même dans un `ul`, lui-même dans une
`section`, tu cliques aussi, d’une certaine façon, sur chacun de ces conteneurs. Le DOM traduit
cela par la **propagation** : l’événement traverse l’arbre en trois phases.

1. **Capture** : de `window` vers la cible, en descendant.
2. **Cible** : sur l’élément cliqué.
3. **Bouillonnement** (*bubbling*) : de la cible vers `window`, en remontant.

Par défaut, les écouteurs réagissent pendant la phase de bouillonnement (ou de cible).

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Propagation</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <section id="card">
      <ul id="list">
        <li id="item"><button id="delete" type="button">Supprimer</button></li>
      </ul>
    </section>
  </body>
</html>
```

```js
const ids = ['card', 'list', 'item', 'delete'];

for (const id of ids) {
  const element = document.getElementById(id);
  element.addEventListener('click', (event) => {
    console.log(`bouillonnement — currentTarget : ${event.currentTarget.id}, target : ${event.target.id}`);
  });
}

document.getElementById('card').addEventListener(
  'click',
  () => console.log('capture — card'),
  { capture: true },
);

document.getElementById('delete').click();
```

Console :

```text
capture — card
bouillonnement — currentTarget : delete, target : delete
bouillonnement — currentTarget : item, target : delete
bouillonnement — currentTarget : list, target : delete
bouillonnement — currentTarget : card, target : delete
```

(`element.click()` simule un clic : pratique pour tester.)

- `target` ne change pas : c’est toujours le bouton cliqué.
- `currentTarget` change : c’est l’élément dont l’écouteur est en train de s’exécuter.
- L’option `{ capture: true }` fait réagir l’écouteur pendant la descente : il passe avant
  tous les autres. On s’en sert rarement.

`event.stopPropagation()` arrête la propagation : les ancêtres ne reçoivent plus l’événement.
Évite-le autant que possible : un autre morceau de code (un menu qui se ferme au clic
extérieur, un outil de mesure) peut compter sur la remontée, et le bug sera difficile à trouver.
À ne pas confondre avec `preventDefault`, qui annule l’action par défaut sans arrêter la
propagation.

## La délégation d’événements

La propagation permet une technique très utile : au lieu d’attacher un écouteur à **chaque**
bouton d’une liste, on en attache **un seul** au conteneur, et on regarde `event.target` pour
savoir ce qui a été cliqué. C’est la **délégation**.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Délégation</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Tâches</h1>
    <ul id="tasks"></ul>
    <button id="add" type="button">Ajouter une tâche</button>
  </body>
</html>
```

```js
const list = document.querySelector('#tasks');
let nextId = 1;

function createTaskItem(title) {
  const item = document.createElement('li');
  item.dataset.id = String(nextId);
  nextId += 1;

  const label = document.createElement('span');
  label.textContent = title;

  const doneButton = document.createElement('button');
  doneButton.type = 'button';
  doneButton.dataset.action = 'toggle';
  doneButton.textContent = 'Terminer';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Supprimer';

  item.append(label, ' ', doneButton, ' ', deleteButton);
  return item;
}

// Un seul écouteur pour tous les boutons, présents et futurs
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return; // clic ailleurs dans la liste
  }
  const item = button.closest('li');
  if (button.dataset.action === 'toggle') {
    item.classList.toggle('done');
    console.log(`tâche ${item.dataset.id} terminée : ${item.classList.contains('done')}`);
  } else if (button.dataset.action === 'delete') {
    item.remove();
    console.log(`tâche ${item.dataset.id} supprimée, reste ${list.children.length}`);
  }
});

document.querySelector('#add').addEventListener('click', () => {
  list.append(createTaskItem(`Tâche n° ${nextId}`));
});

list.append(createTaskItem('Lire la leçon'), createTaskItem('Faire les exercices'));
```

Après un clic sur « Ajouter une tâche », puis sur « Terminer » de la tâche 3, puis sur
« Supprimer » de la tâche 1, puis sur le texte de la tâche 2 :

```text
tâche 3 terminée : true
tâche 1 supprimée, reste 2
```

Le clic sur le texte de la tâche 2 n’affiche rien : `closest` ne trouve aucun bouton et
l’écouteur s’arrête.

Pourquoi c’est mieux :

- **Les éléments ajoutés plus tard fonctionnent** sans rien faire : la tâche 3, créée après
  l’enregistrement de l’écouteur, réagit. Avec un écouteur par bouton, il faudrait penser à en
  ajouter un à chaque création.
- **Un seul écouteur** au lieu de deux par tâche, et un seul endroit où lire la logique.
- `data-action` dit **ce que fait** le bouton, `data-id` sur le `li` dit **sur quoi** il agit.

`event.target.closest('button[data-action]')` est la clé : si le bouton contenait une icône ou
un `span`, `event.target` serait cet élément intérieur ; `closest` remonte jusqu’au bouton.
Tester directement `event.target.tagName === 'BUTTON'` casserait dès qu’on ajoute une icône.

## Retirer un écouteur, n’écouter qu’une fois

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Une seule fois</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <div id="fake" class="button">Faux bouton</div>
    <button id="once" type="button">Afficher l’astuce</button>
    <button id="stop" type="button">Arrêter le suivi</button>
    <p id="tip" hidden>Astuce : Tab permet de passer d’un bouton à l’autre.</p>
  </body>
</html>
```

```js
document.querySelector('#fake').addEventListener('click', () => console.log('faux bouton cliqué'));

document.querySelector('#once').addEventListener(
  'click',
  () => {
    document.querySelector('#tip').hidden = false;
    console.log('astuce affichée');
  },
  { once: true },
);

function logClick(event) {
  console.log(`clic sur ${event.target.id}`);
}
document.addEventListener('click', logClick);

document.querySelector('#stop').addEventListener('click', () => {
  document.removeEventListener('click', logClick);
  console.log('suivi arrêté');
});
```

Clic sur « Afficher l’astuce » deux fois, puis sur « Arrêter le suivi », puis encore sur
« Afficher l’astuce » :

```text
astuce affichée
clic sur once
clic sur once
suivi arrêté
```

- `{ once: true }` retire automatiquement l’écouteur après son premier appel.
- `removeEventListener(type, listener)` exige **la même fonction** que celle passée à
  `addEventListener`. Avec une fonction fléchée écrite directement dans l’appel, tu n’as aucune
  référence pour la retirer : nomme la fonction si tu dois la retirer.

### Un vrai bouton, pas un `div`

Dans cette page, la touche Tab donne le focus au bouton « Afficher l’astuce » mais **saute**
le « Faux bouton » : un `div` n’est pas focalisable (sa propriété `tabIndex` vaut `-1`, celle du
bouton `0`), et Entrée ou Espace ne déclenchent pas son `click`. Les lecteurs d’écran ne
l’annoncent pas non plus comme un bouton. Pour une action, utilise `button type="button"` ; pour
une navigation, un lien `a href`. Tu obtiens gratuitement le focus, le clavier et le rôle
accessible.

## Pièges courants

1. **`addEventListener('click', handler())`** : la fonction est appelée tout de suite. Passe
   `handler`, sans parenthèses.
2. **Confondre `target` et `currentTarget`** : avec la délégation, `currentTarget` est le
   conteneur ; ce qui a été cliqué, c’est `target` (ou mieux, `target.closest(…)`).
3. **Ajouter un écouteur à chaque rendu** : si une fonction de rendu appelle
   `addEventListener` sur le conteneur à chaque mise à jour, chaque clic déclenchera l’action
   plusieurs fois. Enregistre les écouteurs **une seule fois**, au démarrage.
4. **`stopPropagation` pour « réparer » un clic en double** : cela masque la vraie cause et
   casse d’autres comportements.
5. **Un `div` cliquable** : inaccessible au clavier. Utilise un `button`.
6. **Remplacer l’élément qui a le focus** : si un rendu recrée le bouton qu’on vient d’activer
   au clavier, le focus retombe sur `body`. Redonne le focus à l’élément équivalent après le
   rendu (voir l’exercice 3).

## Exercices

### Exercice 1 — Prédire la propagation

Sans exécuter, écris ce qu’affiche la console. Vérifie ensuite.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Prédire la propagation</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <div id="outer">
      <p id="inner">Texte <button id="btn" type="button">OK</button></p>
    </div>
  </body>
</html>
```

```js
document.addEventListener('click', () => console.log('document'));
document.querySelector('#outer').addEventListener('click', () => console.log('outer'));
document.querySelector('#inner').addEventListener('click', (event) => {
  console.log(`inner (target : ${event.target.id})`);
  event.stopPropagation();
});
document.querySelector('#btn').addEventListener('click', (event) => {
  console.log(`btn (currentTarget : ${event.currentTarget.id})`);
});

console.log('--- clic 1');
document.querySelector('#btn').click();
console.log('--- clic 2');
document.querySelector('#outer').click();
```

:::solution
```text
--- clic 1
btn (currentTarget : btn)
inner (target : btn)
--- clic 2
outer
document
```

Clic 1 : l’événement part du bouton (son écouteur s’exécute), remonte au paragraphe `inner`, dont
l’écouteur affiche la cible — toujours `btn` — puis appelle `stopPropagation` : `outer` et
`document` ne reçoivent rien. Clic 2 : la cible est `outer` ; l’événement ne passe pas par
`inner` (qui est un **descendant**, pas un ancêtre) et remonte normalement jusqu’à `document`.
:::

### Exercice 2 — Une FAQ accessible

Écris une FAQ de deux questions. Chaque question est un `button` (dans un `h2`) avec
`aria-expanded="false"` et `aria-controls` égal à l’`id` de la réponse, elle-même masquée par
`hidden`. Un **seul** écouteur sur le conteneur ouvre ou ferme la réponse correspondante et met
à jour `aria-expanded`.

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>FAQ</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Questions fréquentes</h1>
    <div id="faq">
      <h2>
        <button type="button" aria-expanded="false" aria-controls="answer-1">
          Faut-il installer quelque chose ?
        </button>
      </h2>
      <div id="answer-1" hidden>
        <p>Non, un navigateur à jour suffit.</p>
      </div>
      <h2>
        <button type="button" aria-expanded="false" aria-controls="answer-2">
          Puis-je utiliser une IA ?
        </button>
      </h2>
      <div id="answer-2" hidden>
        <p>Oui pour apprendre, pas pour valider une compétence.</p>
      </div>
    </div>
  </body>
</html>
```

```js
const faq = document.querySelector('#faq');

faq.addEventListener('click', (event) => {
  const button = event.target.closest('button[aria-controls]');
  if (!button) {
    return;
  }
  const answer = document.getElementById(button.getAttribute('aria-controls'));
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  answer.hidden = expanded;
});
```

Vérification dans Chromium : un clic sur la question 2 l’ouvre (`aria-expanded="true"`, réponse
visible) ; Entrée sur la question 1 qui a le focus l’ouvre aussi ; un second clic sur la
question 2 la referme ; un clic dans le texte d’une réponse ne change rien.

`aria-expanded` est un attribut dont la valeur est la **chaîne** `'true'` ou `'false'` : on
compare à `'true'` et on reconvertit avec `String`. Il permet à un lecteur d’écran d’annoncer
« réduit » ou « développé ». Le `button` assure le focus et l’activation au clavier ; le `h2`
garde la structure de titres de la page.
:::

### Exercice 3 — Un panier avec des boutons + et −

À partir de l’état ci-dessous, affiche une ligne par produit avec son nom, sa quantité et deux
boutons `−` et `+`, puis le total. Un seul écouteur délégué modifie l’état **sans le muter**,
retire une ligne dont la quantité tombe à 0, et relance l’affichage. Pense aux utilisateurs du
clavier.

```js
let cart = [
  { id: 'p1', name: 'Carnet', unitPrice: 4.5, quantity: 1 },
  { id: 'p2', name: 'Stylo', unitPrice: 1.2, quantity: 3 },
];
```

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Panier</title>
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <h1>Panier</h1>
    <ul id="cart"></ul>
    <p>Total : <output id="total">0.00 €</output></p>
  </body>
</html>
```

```js
let cart = [
  { id: 'p1', name: 'Carnet', unitPrice: 4.5, quantity: 1 },
  { id: 'p2', name: 'Stylo', unitPrice: 1.2, quantity: 3 },
];

function createLine(line) {
  const item = document.createElement('li');
  item.dataset.id = line.id;

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.dataset.action = 'decrement';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `Retirer un ${line.name}`);

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.dataset.action = 'increment';
  plus.textContent = '+';
  plus.setAttribute('aria-label', `Ajouter un ${line.name}`);

  item.append(`${line.name} × ${line.quantity} `, minus, ' ', plus);
  return item;
}

function render() {
  document.querySelector('#cart').replaceChildren(...cart.map(createLine));
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  document.querySelector('#total').textContent = `${total.toFixed(2)} €`;
}

document.querySelector('#cart').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const { id } = button.closest('li').dataset;
  const delta = button.dataset.action === 'increment' ? 1 : -1;
  cart = cart
    .map((line) => (line.id === id ? { ...line, quantity: line.quantity + delta } : line))
    .filter((line) => line.quantity > 0);
  render();
  // Le bouton cliqué a été remplacé : on redonne le focus à son équivalent.
  const selector = `li[data-id="${id}"] button[data-action="${button.dataset.action}"]`;
  (document.querySelector(selector) ?? document.querySelector('#cart button'))?.focus();
});

render();
```

Vérification : au départ « Carnet × 1 | Stylo × 3 », total `8.10 €` ; + sur le carnet donne
`12.60 €` ; − sur le stylo donne `11.40 €` ; deux fois − sur le carnet le retire, total `2.40 €`.

Le principe est **état → rendu** : on ne modifie jamais le DOM directement dans l’écouteur, on
calcule un nouvel état (avec `map`/`filter`, sans mutation), puis `render` reconstruit
l’affichage. L’écouteur est enregistré **une fois**, sur `#cart`, qui n’est jamais remplacé.

Le défaut de ce rendu complet : le bouton activé au clavier est détruit, et le focus retomberait
sur `body` (`document.activeElement` devient `body`, comme le prévoit la norme HTML ; vérifié
dans Chromium). On le redonne donc au bouton équivalent, ou au premier
bouton du panier si la ligne a disparu. Les `aria-label` donnent un nom compréhensible aux
boutons `−` et `+` : sans eux, un lecteur d’écran n’annoncerait que le symbole, sans dire de
quel produit il s’agit.
:::

## Récapitulatif

- `addEventListener(type, fonction)` enregistre un écouteur ; passe la fonction, sans l’appeler.
- L’objet événement donne `type`, `target` (où l’action a eu lieu), `currentTarget` (où
  l’écouteur est enregistré), `key` pour le clavier.
- `preventDefault()` annule l’action par défaut (navigation, envoi) ; `stopPropagation()` arrête
  la remontée, à éviter.
- Un événement descend (capture), atteint la cible, puis remonte (bouillonnement) : c’est ce qui
  rend la délégation possible.
- Délégation : un écouteur sur le conteneur, `event.target.closest('[data-action]')`,
  `data-id` sur l’élément concerné ; fonctionne pour les éléments ajoutés plus tard.
- `{ once: true }` et `removeEventListener` (avec la même référence de fonction).
- Un `button` est focalisable et activable au clavier ; un `div` ne l’est pas. Gère le focus
  quand tu affiches, masques ou recrées des éléments.
