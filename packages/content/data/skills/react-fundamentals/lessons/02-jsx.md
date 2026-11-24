---
title: JSX en détail
summary: Insérer des expressions entre accolades, écrire les attributs à la manière de React, regrouper avec des fragments, et comprendre pourquoi le texte inséré est échappé automatiquement.
durationMinutes: 55
sources:
  - title: React — Écrire du balisage avec JSX
    url: https://fr.react.dev/learn/writing-markup-with-jsx
  - title: React — JavaScript dans JSX grâce aux accolades
    url: https://fr.react.dev/learn/javascript-in-jsx-with-curly-braces
  - title: React — Composants communs (props des éléments DOM)
    url: https://fr.react.dev/reference/react-dom/components/common
  - title: OWASP — Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
---

## Du balisage dans du JavaScript

Le JSX ressemble beaucoup au HTML, et c’est voulu : tu peux décrire une interface avec une
syntaxe familière. Mais ce n’est **pas** du HTML. Comme tu l’as vu dans la leçon 1, chaque
balise devient un appel de fonction qui produit un objet JavaScript. Cette nature explique
toutes les règles de cette leçon : pourquoi certaines balises doivent être fermées, pourquoi
on écrit `className`, pourquoi on ne peut pas mettre un `if` entre accolades… et pourquoi le
texte que tu insères ne peut pas se transformer en code malveillant.

Tous les exemples se testent en remplaçant le contenu de `src/App.jsx` dans le projet Vite
de la leçon 1, avec `npm run dev` lancé et la console du navigateur ouverte.

## Trois règles de syntaxe

### Une seule racine par `return`

Une fonction ne peut renvoyer qu’une valeur. Or deux balises côte à côte correspondraient à
deux appels `jsx(…)` : ce n’est pas une valeur unique.

```jsx
function App() {
  return (
    <h1>Mon profil</h1>
    <p>Développeuse web</p>
  );
}

export default App;
```

Vite refuse de transformer le fichier et affiche l’erreur par-dessus la page :

```text
[PARSE_ERROR] Adjacent JSX elements must be wrapped in an enclosing tag.
...
Help: Did you want a JSX fragment `<>...</>`?
```

Deux solutions. Si un conteneur a un sens (une `section`, un `article`…), utilise-le. Sinon,
utilise un **fragment**, noté `<>` et `</>` :

```jsx
function App() {
  return (
    <>
      <h1>Mon profil</h1>
      <p>Développeuse web</p>
    </>
  );
}

export default App;
```

DOM obtenu dans `#root` :

```html
<h1>Mon profil</h1><p>Développeuse web</p>
```

Le fragment regroupe les éléments pour JavaScript mais **ne produit aucun élément** dans le
DOM. C’est préférable à un `div` ajouté uniquement pour satisfaire la syntaxe, qui alourdit la
page et peut casser une mise en page CSS (une grille, une liste `ul` qui ne doit contenir que
des `li`). La forme longue, `<Fragment>` importé depuis `react`, sert quand il faut lui donner
une clé dans une liste (leçon 5).

### Toutes les balises se ferment

En HTML, `<img>`, `<input>` ou `<br>` n’ont pas de balise fermante. En JSX, **toute** balise
doit être fermée, soit par une balise fermante, soit par `/>` :

```jsx
function App() {
  return (
    <section>
      <h1>Mon profil</h1>
      <img src="/avatar.png" alt="Avatar">
    </section>
  );
}

export default App;
```

```text
[PARSE_ERROR] Expected corresponding JSX closing tag for 'img'.
```

Correction : `<img src="/avatar.png" alt="Avatar" />`. De même `<input />`, `<br />`,
`<hr />`, et pour un composant sans contenu, `<App />`.

### Des parenthèses autour d’un JSX sur plusieurs lignes

`return` suivi d’un retour à la ligne renvoie `undefined` (insertion automatique du
point-virgule en JavaScript). Ouvre donc la parenthèse sur la ligne du `return`, comme dans
tous les exemples.

## Les accolades : une fenêtre vers JavaScript

Entre accolades, tu peux placer **n’importe quelle expression** JavaScript : une variable, un
calcul, un appel de fonction, un gabarit de chaîne, un opérateur ternaire. Le résultat est
inséré à cet endroit.

```jsx
function App() {
  const user = { firstName: 'Inès', age: 32 };
  const tags = ['html', 'css', 'js'];

  return (
    <ul>
      <li>Texte : {user.firstName.toUpperCase()}</li>
      <li>Nombre : {user.age + 1}</li>
      <li>Zéro : {0}</li>
      <li>Booléens : {true}{false}</li>
      <li>Absents : {null}{undefined}</li>
      <li>Tableau : {tags}</li>
      <li>Gabarit : {`${tags.length} étiquettes`}</li>
    </ul>
  );
}

export default App;
```

Texte affiché :

```text
Texte : INÈS
Nombre : 33
Zéro : 0
Booléens :
Absents :
Tableau : htmlcssjs
Gabarit : 3 étiquettes
```

Ce que React fait de chaque valeur :

| Valeur                          | Affichage                                          |
| ------------------------------- | -------------------------------------------------- |
| chaîne, nombre (y compris `0`)  | le texte correspondant                             |
| `true`, `false`, `null`, `undefined` | **rien**                                      |
| tableau                         | chaque élément, à la suite                         |
| élément JSX                     | l’élément                                          |
| objet ordinaire                 | **erreur**                                         |

Deux lignes de ce tableau méritent ton attention. Que `false`, `null` et `undefined`
n’affichent rien est la base du rendu conditionnel (leçon 5) ; que `0` s’affiche, lui, est la
source d’un piège classique que tu y verras aussi. Quant au tableau, c’est ce qui permet
d’afficher des listes, à condition que chaque élément soit du JSX avec une clé.

Un objet, en revanche, ne s’affiche pas :

```jsx
function App() {
  const user = { firstName: 'Inès', age: 32 };
  return <p>Utilisateur : {user}</p>;
}

export default App;
```

La page devient entièrement blanche, et la console indique :

```text
Objects are not valid as a React child (found: object with keys {firstName, age}). If you meant to render a collection of children, use an array instead.
```

React ne sait pas quel texte produire pour un objet : affiche ses propriétés
(`{user.firstName}`). Note qu’une erreur pendant le rendu fait disparaître **toute**
l’application, pas seulement le composant fautif.

### Une expression, pas une instruction

Les accolades attendent une **valeur**. Une instruction comme `if`, `for` ou une déclaration
`const` n’en produit pas :

```jsx
function App() {
  const isLoggedIn = true;
  return <p>{if (isLoggedIn) { 'Bienvenue' }}</p>;
}

export default App;
```

```text
[PARSE_ERROR] Unexpected token
```

Pour choisir, on utilise l’opérateur ternaire (`{isLoggedIn ? 'Bienvenue' : 'Connecte-toi'}`)
ou un `if` **avant** le `return`. Pour répéter, on utilise `map` qui, lui, renvoie une valeur :
un tableau. Les leçons 5 et 6 en font un usage intensif.

### Les accolades dans les attributs

Une valeur d’attribut s’écrit soit entre guillemets (une chaîne fixe), soit entre accolades
(une expression). Jamais les deux :

```jsx
function App() {
  const avatarUrl = '/avatar.png';
  return (
    <div>
      <img src="avatarUrl" alt="A" />
      <img src="{avatarUrl}" alt="B" />
      <img src={avatarUrl} alt="C" />
    </div>
  );
}

export default App;
```

DOM obtenu :

```html
<div><img alt="A" src="avatarUrl"><img alt="B" src="{avatarUrl}"><img alt="C" src="/avatar.png"></div>
```

Seule la troisième image charge `/avatar.png`. Entre guillemets, `{avatarUrl}` n’est qu’un
texte comme un autre.

## Les attributs : ce qui change par rapport au HTML

### `className` et `htmlFor`

Les attributs JSX deviennent les propriétés d’un objet JavaScript, et leurs noms suivent ceux
des propriétés du DOM : `class` est un mot réservé en JavaScript, l’attribut s’écrit donc
`className` ; `for` aussi, il devient `htmlFor`.

```jsx
function App() {
  return (
    <form>
      <label class="label" for="email">E-mail</label>
      <input id="email" type="email" />
    </form>
  );
}

export default App;
```

Cela s’affiche, mais la console de développement proteste :

```text
Invalid DOM property `class`. Did you mean `className`?
Invalid DOM property `for`. Did you mean `htmlFor`?
```

Version correcte : `<label className="label" htmlFor="email">`. Le `htmlFor` est essentiel :
c’est lui qui relie l’étiquette au champ pour les lecteurs d’écran et agrandit la zone
cliquable, comme `for` en HTML.

### La casse « chameau »

Les attributs composés de plusieurs mots s’écrivent en *camelCase* : `tabIndex`, `maxLength`,
`readOnly`, `autoComplete`, et les événements `onClick`, `onChange`, `onSubmit` (leçon 4).
Deux familles font exception et gardent leurs tirets, comme en HTML : `aria-*` et `data-*`.

```jsx
function App() {
  const isSending = false;
  return (
    <form>
      <button type="submit" disabled={isSending}>
        Envoyer
      </button>
      <button type="button" disabled>
        Annuler
      </button>
      <input aria-invalid={true} data-step={2} tabIndex={-1} maxLength={20} />
    </form>
  );
}

export default App;
```

DOM obtenu :

```html
<form><button type="submit">Envoyer</button><button type="button" disabled="">Annuler</button><input aria-invalid="true" data-step="2" tabindex="-1" maxlength="20"></form>
```

- Un attribut booléen comme `disabled` reçoit une **vraie valeur booléenne** : avec
  `disabled={false}`, React n’écrit pas l’attribut du tout (en HTML, `disabled="false"`
  désactiverait le bouton !). Écrire `disabled` seul équivaut à `disabled={true}`.
- Les nombres et booléens passés à `aria-*` et `data-*` sont convertis en chaînes.

### `style` attend un objet

En HTML, `style` est une chaîne de déclarations CSS. En JSX, c’est un **objet** dont les clés
sont les propriétés CSS en camelCase :

```jsx
function App() {
  const isUrgent = true;
  return (
    <p style={{ color: isUrgent ? 'crimson' : 'black', fontSize: 20, marginTop: '2rem' }}>
      Livraison demain
    </p>
  );
}

export default App;
```

```html
<p style="color: crimson; font-size: 20px; margin-top: 2rem;">Livraison demain</p>
```

- Les doubles accolades ne sont pas une syntaxe spéciale : les accolades extérieures ouvrent
  l’expression, les intérieures écrivent un objet littéral.
- `fontSize: 20` devient `20px` : pour les propriétés de dimension, React ajoute `px` aux
  nombres.
- Une chaîne (`style="color: crimson"`) provoque une erreur et une page blanche :
  ``The `style` prop expects a mapping from style properties to values, not a string.``

Dans la pratique, préfère des **classes CSS** (`className`) et garde `style` pour les valeurs
réellement calculées.

### Les commentaires

À l’intérieur du JSX, un commentaire s’écrit dans des accolades : `{/* commentaire */}`. Le
commentaire HTML `<!-- … -->` n’est pas valide.

### Les espaces

Le JSX supprime les retours à la ligne et l’indentation entre les balises. Compare :

```jsx
function App() {
  const name = 'Inès';
  return (
    <div>
      <p>
        Bonjour
        <strong>{name}</strong>
        !
      </p>
      <p>
        Bonjour <strong>{name}</strong> !
      </p>
      <p>
        Bonjour{' '}
        <strong>{name}</strong>{' '}
        !
      </p>
    </div>
  );
}

export default App;
```

```html
<div><p>Bonjour<strong>Inès</strong>!</p><p>Bonjour <strong>Inès</strong> !</p><p>Bonjour <strong>Inès</strong> !</p></div>
```

Le premier paragraphe affiche « BonjourInès! » : les espaces ont disparu avec les retours à la
ligne. Les espaces écrits **sur une même ligne** sont conservés ; `{' '}` insère un espace
explicite quand une ligne est trop longue.

### Récapitulatif des différences

| HTML                            | JSX                                       |
| ------------------------------- | ----------------------------------------- |
| `class="card"`                  | `className="card"`                        |
| `for="email"`                   | `htmlFor="email"`                         |
| `<img src="a.png">`             | `<img src="a.png" />`                     |
| `style="font-size: 2rem"`       | `style={{ fontSize: '2rem' }}`            |
| `tabindex="0"`, `onclick="…"`   | `tabIndex={0}`, `onClick={fonction}`      |
| `disabled` / absent             | `disabled={true}` / `disabled={false}`    |
| `<!-- commentaire -->`          | `{/* commentaire */}`                     |
| plusieurs éléments à la racine  | un seul élément ou un fragment `<>…</>`   |

## L’échappement automatique, une protection contre le XSS

Dans la compétence « DOM et événements », tu as vu la faille **XSS** (*cross-site
scripting*) : insérer avec `innerHTML` un texte venu d’un utilisateur permet à ce texte de
devenir du HTML, et donc d’exécuter du JavaScript dans la page des autres visiteurs. La
parade était `textContent`, qui insère toujours du **texte**.

React applique cette parade **par défaut**. Essaie avec un commentaire piégé :

```jsx
function App() {
  // Imagine que ce texte vient d’un formulaire ou d’une API
  const comment = '<img src="x" onerror="alert(\'piraté\')"> Super article !';

  return (
    <article>
      <h2>Dernier commentaire</h2>
      <p>{comment}</p>
    </article>
  );
}

export default App;
```

DOM obtenu :

```html
<article><h2>Dernier commentaire</h2><p>&lt;img src="x" onerror="alert('piraté')"&gt; Super article !</p></article>
```

Aucune image n’est créée et aucune alerte ne s’affiche : le visiteur voit littéralement le
texte `<img src="x" onerror="alert('piraté')"> Super article !`. Les chevrons ont été
**échappés** (`&lt;`, `&gt;`), comme avec `textContent`.

Pourquoi est-ce une protection solide ? Parce que dans React, **les balises viennent de ton
code, jamais des données**. Quand tu écris `<p>{comment}</p>`, la balise `p` existe dans ton
fichier source ; `comment` n’est qu’une valeur que React place dans un nœud texte. Aucune
chaîne, quel que soit son contenu, n’est analysée comme du HTML. Il en va de même pour les
valeurs d’attributs : `title={comment}` donne un attribut qui contient ce texte, sans
possibilité d’en « sortir » pour ajouter un autre attribut.

### Les limites à connaître

1. **`dangerouslySetInnerHTML` désactive la protection.** C’est l’équivalent React de
   `innerHTML`, et son nom est un avertissement :

   ```jsx
   function App() {
     const comment = '<img src="x" onerror="alert(\'piraté\')"> Super article !';
     return <p dangerouslySetInnerHTML={{ __html: comment }} />;
   }

   export default App;
   ```

   Ici, l’image est créée et l’alerte « piraté » s’affiche (vérifié dans Chromium). Ne l’utilise
   jamais avec des données venues d’un utilisateur ou d’une API. Si tu dois afficher du HTML
   (le contenu d’un article rédigé dans un éditeur, par exemple), il doit d’abord être nettoyé
   par une bibliothèque spécialisée, ce qui dépasse le cadre de ce cours.

2. **Les URL restent des données à vérifier.** Un lien `href={website}` dont la valeur est
   `javascript:alert(document.cookie)` exécuterait du code au clic. React 19 bloque ce cas :
   il remplace l’adresse par un code qui lève l’erreur
   `React has blocked a javascript: URL as a security precaution.` (vérifié en développement
   et en production). Ne compte pas sur ce filet : n’accepte que des adresses qui commencent
   par `https://` (ou `http://`) quand elles viennent d’un utilisateur.

3. **L’échappement protège l’affichage, pas le serveur.** Il n’empêche pas un utilisateur
   d’envoyer des données invalides à ton API : la validation côté serveur reste
   indispensable.

## Pièges courants

1. **`class` et `for`** au lieu de `className` et `htmlFor` : la page s’affiche, mais la
   console signale l’erreur. Le réflexe : lire la console à chaque essai et corriger tout
   avertissement, même quand « ça marche ».
2. **Afficher un objet** : `{user}` provoque une page blanche. Affiche ses propriétés.
3. **Guillemets autour d’accolades** : `src="{url}"` est une chaîne fixe.
4. **Oublier un `/>`** ou mettre deux éléments à la racine : erreur de syntaxe dans la
   superposition de Vite. Lis la ligne et la colonne indiquées.
5. **Un `if` ou un `for` entre accolades** : impossible, il faut une expression (ternaire,
   `&&`, `map`).
6. **`style` en chaîne** : erreur. Utilise un objet, ou mieux, une classe.
7. **Recourir à `dangerouslySetInnerHTML` pour mettre un mot en gras** : écris le JSX
   correspondant (`<strong>{author}</strong>`), c’est plus simple et sûr.

## Exercices

### Exercice 1 — Convertir du HTML en JSX

Transforme ce fragment HTML en composant `App` valide, sans avertissement dans la console.
La variable `newsletter` (un booléen) doit décider si la case est cochée.

```html
<form class="card">
  <!-- Abonnement -->
  <label for="mail">E-mail</label>
  <input id="mail" type="email" autocomplete="email" required>
  <br>
  <input id="news" type="checkbox" checked>
  <label for="news">Recevoir la lettre d’information</label>
  <p style="color: gray; font-size: 0.9rem">Désinscription en un clic.</p>
</form>
```

:::solution
```jsx
function App() {
  const newsletter = true;

  return (
    <form className="card">
      {/* Abonnement */}
      <label htmlFor="mail">E-mail</label>
      <input id="mail" type="email" autoComplete="email" required />
      <br />
      <input id="news" type="checkbox" checked={newsletter} readOnly />
      <label htmlFor="news">Recevoir la lettre d’information</label>
      <p style={{ color: 'gray', fontSize: '0.9rem' }}>Désinscription en un clic.</p>
    </form>
  );
}

export default App;
```

Points de vigilance : `className`, `htmlFor`, `autoComplete` en camelCase, balises `input` et
`br` fermées par `/>`, commentaire entre accolades, `style` en objet. La case cochée dépend
d’une expression booléenne `checked={newsletter}`. Sans gestionnaire `onChange`, React
signale en console qu’un champ dont la valeur est imposée sera en lecture seule ; `readOnly`
indique que c’est voulu et fait taire l’avertissement. Effectivement, un clic sur la case ne
change rien : React la remet dans l’état imposé par `checked` (vérifié dans Chromium). La
leçon 4 montre comment rendre ce champ modifiable avec l’état. La valeur
`0.9rem` reste une chaîne : seul un nombre recevrait `px`.
:::

### Exercice 2 — Prédire l’affichage

Sans exécuter, écris le texte affiché par chaque `li`. Vérifie ensuite.

```jsx
function App() {
  const cart = { items: ['Carnet', 'Stylo'], total: 0 };
  const coupon = null;

  return (
    <ul>
      <li>Articles : {cart.items.length}</li>
      <li>Total : {cart.total}</li>
      <li>Coupon : {coupon}</li>
      <li>Liste : {cart.items.join(', ')}</li>
      <li>Vide ? {cart.items.length === 0}</li>
      <li>Calcul : {'5' + 3}</li>
      <li>{`Payer ${cart.total.toFixed(2)} €`}</li>
    </ul>
  );
}

export default App;
```

:::solution
```text
Articles : 2
Total : 0
Coupon :
Liste : Carnet, Stylo
Vide ?
Calcul : 53
Payer 0.00 €
```

`0` est un nombre et s’affiche ; `null` et le booléen `false` (résultat de la comparaison)
n’affichent rien. `'5' + 3` est une concaténation : `'53'`. Les accolades évaluent n’importe
quelle expression avec les règles habituelles de JavaScript. Pour afficher un booléen, il
faut le convertir en texte : `{String(cart.items.length === 0)}` ou un ternaire
`{cart.items.length === 0 ? 'oui' : 'non'}`.
:::

### Exercice 3 — Supprimer une faille

Ce composant affiche le dernier commentaire d’un article, avec l’auteur en gras. Explique le
risque, puis réécris-le sans `dangerouslySetInnerHTML`.

```jsx
function App() {
  const author = 'Sam';
  const text = 'Très clair, merci !';

  return (
    <p dangerouslySetInnerHTML={{ __html: `<strong>${author}</strong> : ${text}` }} />
  );
}

export default App;
```

:::solution
`author` et `text` viennent normalement d’utilisateurs. Insérés dans une chaîne HTML puis
dans `dangerouslySetInnerHTML`, ils sont interprétés comme du HTML : un auteur nommé
`<img src="x" onerror="alert(1)">` exécuterait du JavaScript chez chaque lecteur (XSS).

```jsx
function App() {
  const author = 'Sam';
  const text = 'Très clair, merci !';

  return (
    <p>
      <strong>{author}</strong> : {text}
    </p>
  );
}

export default App;
```

DOM obtenu : `<p><strong>Sam</strong> : Très clair, merci !</p>`. La balise `strong` est
écrite dans le code ; les deux valeurs sont insérées comme du texte et échappées. Avec
`author = '<img src="x" onerror="alert(1)">'`, le nom s’afficherait tel quel, en gras, sans
rien exécuter.
:::

## Récapitulatif

- Un `return` renvoie **un seul** élément : utilise un conteneur pertinent ou un fragment
  `<>…</>`, qui ne crée aucun nœud dans le DOM.
- Toutes les balises se ferment (`<img />`, `<input />`) ; les commentaires s’écrivent
  `{/* … */}`.
- Les accolades acceptent une **expression** : variable, calcul, appel, ternaire, `map`. Pas
  d’instruction `if` ou `for`.
- `true`, `false`, `null`, `undefined` n’affichent rien ; `0` s’affiche ; un objet provoque une
  erreur qui efface l’application.
- `className`, `htmlFor`, attributs en camelCase (`tabIndex`, `onClick`) sauf `aria-*` et
  `data-*` ; booléens réels pour `disabled` ; `style` est un objet.
- Le texte inséré entre accolades est **échappé** : les données ne deviennent jamais des
  balises, ce qui protège du XSS. `dangerouslySetInnerHTML` supprime cette protection ; les
  URL fournies par l’utilisateur doivent être vérifiées.
