---
title: Variables CSS et débogage avec l’inspecteur
summary: Centraliser les valeurs avec les propriétés personnalisées, puis diagnostiquer méthodiquement un style avec les outils du navigateur.
durationMinutes: 60
sources:
  - title: MDN — Utiliser des propriétés personnalisées (variables)
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties
  - title: Chrome DevTools — View and change CSS
    url: https://developer.chrome.com/docs/devtools/css
  - title: Firefox — Page Inspector
    url: https://firefox-source-docs.mozilla.org/devtools-user/page_inspector/index.html
---

Ton site utilise le même bleu à douze endroits. Le jour où la charte change, tu
cherches-remplaces en espérant ne rien oublier. Et quand un style refuse de
s’appliquer, tu modifies le fichier, recharges, recommences… Cette leçon règle ces deux
problèmes : les **variables CSS** centralisent les valeurs, et l’**inspecteur** du
navigateur te montre exactement ce que la cascade a décidé.

## Les propriétés personnalisées

### Déclarer et utiliser

Une **propriété personnalisée** (on dit couramment « variable CSS ») est une propriété
dont le nom commence par deux tirets. On lit sa valeur avec la fonction `var()`.

```css
:root {
  --color-primary: #1d4ed8;
  --color-text: #1f2937;
  --space: 8px;
  --radius: 6px;
}

.button {
  background-color: var(--color-primary);
  color: white;
  padding: calc(var(--space) * 2);
  border: none;
  border-radius: var(--radius);
}

a {
  color: var(--color-primary);
}
```

```html
<p>Consulte <a href="menu.html">la carte</a>.</p>
<button class="button" type="button">Réserver</button>
```

Le bouton a un fond bleu `#1d4ed8` et un padding de 16 pixels ; le lien est du même
bleu. Pour changer la couleur principale du site, une seule ligne suffit.

- `:root` désigne l’élément racine (`<html>`). Y déclarer les variables les rend
  disponibles partout, grâce à l’héritage expliqué plus bas.
- Le nom est **sensible à la casse** : `--color-primary` et `--Color-Primary` sont deux
  variables différentes.
- Une variable peut contenir n’importe quelle valeur : couleur, longueur, liste de
  polices…

### La valeur de repli

`var()` accepte un second argument, utilisé si la variable n’est pas définie :

```css
.badge {
  color: var(--color-accent, darkorange);
}
```

Si `--color-accent` n’existe nulle part, le badge est orange foncé.

### Portée et héritage

Une propriété personnalisée est une propriété comme les autres : elle se déclare dans
une règle, suit la cascade, et **s’hérite**. Tous les descendants de l’élément qui la
déclare peuvent la lire, et un descendant peut la **redéfinir** pour lui et ses propres
enfants.

C’est ce qui permet de créer des variantes sans dupliquer de code :

```html
<article class="card">
  <h2>Carte claire</h2>
  <p>Texte de la carte.</p>
</article>
<article class="card card--dark">
  <h2>Carte sombre</h2>
  <p>Texte de la carte.</p>
</article>
```

```css
.card {
  --card-bg: white;
  --card-text: #1f2937;
  background-color: var(--card-bg);
  color: var(--card-text);
  padding: 1rem;
}

.card--dark {
  --card-bg: #111827;
  --card-text: #f9fafb;
}
```

La seconde carte a un fond presque noir et un texte presque blanc. La règle
`.card--dark` ne touche **aucune** propriété visible : elle change seulement les
variables, et les déclarations de `.card` font le reste. Les paragraphes héritent de la
couleur de texte, comme d’habitude.

La même logique permet un thème sombre pour toute la page : redéfinir les variables sur
`:root` (ou sur une classe posée sur `<html>`) suffit à recolorer tout ce qui les
utilise. Tu peux même définir une variable dans l’attribut `style`, ce qui est pratique
quand un script doit faire varier une valeur :

```html
<div style="--color-primary: crimson">
  <button class="button" type="button">Annuler</button>
</div>
```

Ce bouton-là est cramoisi ; les autres restent bleus.

### Calculer avec des variables

Les variables se combinent avec `calc()`. Une échelle d’espacements construite sur une
seule valeur reste cohérente :

```css
:root {
  --space: 8px;
}

.stack > * + * {
  margin-top: calc(var(--space) * 2); /* 16px entre les enfants */
}

.section {
  padding: calc(var(--space) * 4) calc(var(--space) * 2); /* 32px 16px */
}
```

Le sélecteur `.stack > * + *` vise chaque enfant de `.stack` précédé d’un frère, donc
tous sauf le premier.

## Les pièges des variables

### Coller une unité après `var()`

```css
:root {
  --size: 16;
}

.wrong {
  padding: var(--size)px; /* invalide : donne « 16 » puis « px », pas « 16px » */
}

.right {
  padding: calc(var(--size) * 1px); /* 16px */
}
```

`var()` est remplacée par sa valeur comme un élément séparé : on ne peut pas y coller
une unité. Multiplie par `1px` avec `calc()`, ou stocke directement `16px`.

### Une valeur invalide ne retombe pas sur la déclaration précédente

```css
:root {
  --size: 20px;
}

.wrap {
  color: navy;
}

.wrap p {
  color: red;
  color: var(--size); /* 20px n’est pas une couleur */
}
```

Tu pourrais croire que le paragraphe sera rouge, la seconde déclaration étant ignorée
comme une faute de frappe. Ce n’est pas le cas : le navigateur ne peut pas savoir, en
lisant la feuille, ce que contiendra la variable. Il retient donc la déclaration
`var(--size)`, puis découvre au moment du calcul que la valeur est invalide. La
propriété se comporte alors comme `unset` : `color` étant héritée, le paragraphe prend la
couleur du parent, **bleu marine**. Une propriété non héritée prendrait sa valeur
initiale.

### Où `var()` ne fonctionne pas

`var()` ne s’utilise que **dans la valeur d’une propriété**. Il ne peut pas remplacer un
nom de propriété, un sélecteur, ni une condition de media query.

:::note[Pour aller plus loin : l’imbrication native]
Les navigateurs actuels acceptent l’**imbrication** de règles, sans outil
supplémentaire :

```css
.card {
  padding: 1rem;

  & h2 {
    margin-top: 0; /* équivaut à .card h2 */
  }

  &:hover {
    outline: 2px solid var(--color-primary); /* équivaut à .card:hover */
  }
}
```

Le `&` représente le sélecteur parent. La spécificité d’une règle imbriquée se calcule
comme si le parent était entouré de `:is()` : ici `.card h2` vaut (0, 1, 1). Tu peux
t’en passer entièrement : écrire `.card h2` à plat est tout aussi valable, et c’est ce
que font les exemples de ce cours.
:::

## L’inspecteur du navigateur

Les outils de développement sont intégrés à tous les navigateurs. Ils s’ouvrent avec
**F12** ou **Ctrl+Maj+I** (**Cmd+Option+I** sur macOS), ou par un clic droit sur un
élément, puis « Inspecter ». Les noms ci-dessous sont ceux de Chrome et Edge, avec
l’équivalent Firefox quand il diffère ; les fonctions sont les mêmes partout.

### Sélectionner l’élément

Le panneau **Éléments** (Firefox : **Inspecteur**) affiche l’arbre DOM tel que le
navigateur l’a construit, ce qui peut différer de ton fichier si du HTML était mal
fermé. Clique sur une balise pour la sélectionner, ou utilise l’outil de sélection
(icône de flèche, **Ctrl+Maj+C**) puis clique dans la page.

Vérifie d’abord que tu as sélectionné **le bon élément** : un style qui « ne marche pas »
s’applique parfois à un parent ou à un enfant de l’élément que tu regardes.

### Lire le volet Styles

Le volet **Styles** (Firefox : **Règles**) liste toutes les règles qui ciblent
l’élément, **de la plus prioritaire à la moins prioritaire**. Chaque règle indique son
fichier et sa ligne d’origine (`styles.css:42`) : un clic t’y emmène.

| Ce que tu vois                                    | Ce que cela signifie                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `element.style` en haut                           | les déclarations de l’attribut `style` (vide s’il n’y en a pas) |
| une déclaration **barrée**                        | elle a perdu dans la cascade : cherche plus haut celle qui gagne |
| barrée **avec une icône d’avertissement**         | propriété inconnue ou valeur invalide : vérifie l’orthographe   |
| une règle signalée « user agent stylesheet »      | un style par défaut du navigateur                               |
| des sections « Hérité de… »                       | les propriétés héritées des ancêtres, avec leur règle d’origine |

Une règle qui **n’apparaît pas du tout** n’a pas ciblé l’élément : soit le sélecteur ne
correspond pas, soit le fichier n’est pas chargé.

### Expérimenter en direct

Dans le volet Styles, tu peux :

- **décocher** une déclaration pour la désactiver et voir l’effet immédiatement ;
- **cliquer sur une valeur** pour la modifier ; les flèches haut et bas du clavier
  incrémentent les nombres ;
- **ajouter** une déclaration dans une règle existante ou dans `element.style` ;
- forcer un état avec le bouton **:hov** (`:hover`, `:focus`, `:focus-visible`…), pour
  inspecter un style de survol sans garder la souris dessus ;
- ajouter ou retirer une classe avec le bouton **.cls** ;
- ouvrir le sélecteur de couleur en cliquant sur une pastille de couleur : il indique le
  rapport de contraste avec le fond.

Ces modifications sont **temporaires** : elles disparaissent au rechargement. Une fois la
bonne valeur trouvée, reporte-la dans ton fichier.

### L’onglet Calculé

L’onglet **Calculé** (_Computed_) montre la **valeur finale** de chaque propriété,
après cascade, héritage et conversion des unités : `2rem` y apparaît en `32px`, un
`em` hérité en pixels. Il contient aussi le schéma du modèle de boîte (dans Firefox, ce
schéma est dans l’onglet **Mise en page**). Le champ de filtre retrouve une propriété ;
déplier une propriété montre quelle règle l’a fournie et lesquelles ont perdu.

### La console, en complément

L’élément sélectionné dans l’inspecteur est accessible dans la console sous le nom
`$0` :

```js
getComputedStyle($0).color;
// "rgb(29, 78, 216)" par exemple

getComputedStyle($0).getPropertyValue('--color-primary');
// "#1d4ed8"

document.querySelectorAll('.card h2').length;
// nombre d’éléments ciblés par un sélecteur
```

`getComputedStyle()` renvoie les valeurs telles que le navigateur les a résolues ; les
couleurs y apparaissent au format `rgb()`.

### Le volet Réseau pour un fichier qui ne charge pas

Si aucune de tes règles n’apparaît, ouvre le panneau **Réseau**, coche « Désactiver le
cache », recharge, et cherche `styles.css` : un statut **404** signale un chemin erroné
dans le `href`.

## Une méthode de débogage

Face à « mon style ne s’applique pas », suis ces étapes dans l’ordre :

1. **Le bon élément ?** Sélectionne-le avec l’outil de sélection.
2. **La règle apparaît-elle dans Styles ?**
   - non : vérifie le sélecteur (point oublié, espace en trop, casse, combinateur) et
     le chargement du fichier (panneau Réseau) ;
   - oui : passe à l’étape 3.
3. **La déclaration est-elle barrée ?**
   - avec une icône d’avertissement : faute de frappe ou valeur invalide (unité
     manquante, point-virgule oublié sur la ligne précédente) ;
   - sans icône : une autre déclaration gagne. Trouve-la plus haut, puis explique
     pourquoi (importance, spécificité, ordre) et corrige la cause.
4. **La déclaration est active mais rien ne change ?** Elle n’a peut-être pas d’effet
   dans ce contexte : `width` sur un élément en ligne, `margin-top` sur un `<span>`, une
   marge qui fusionne. Firefox signale ces cas en grisant la déclaration, avec une
   explication au survol.
5. **La valeur calculée est-elle celle attendue ?** Vérifie dans Calculé : une variable
   peut contenir autre chose que ce que tu crois, un `em` peut s’être accumulé.

Note le diagnostic en une phrase (« `.price` est grise car `section p` (0, 0, 2)… »).
C’est exactement le raisonnement qu’on attend de toi à l’oral.

## Exercices

### Exercice 1 — Factoriser avec des variables

Réécris cette feuille avec des propriétés personnalisées pour que la couleur principale,
la couleur de texte et l’unité d’espacement soient chacune définies une seule fois.

```css
body {
  color: #222222;
}

h1 {
  color: #0f766e;
  margin-bottom: 24px;
}

.button {
  background-color: #0f766e;
  color: white;
  padding: 8px 16px;
}

.button:hover {
  background-color: #115e59;
}

a {
  color: #0f766e;
}

.card {
  border: 1px solid #0f766e;
  padding: 16px;
  margin-bottom: 24px;
}
```

:::solution
```css
:root {
  --color-primary: #0f766e;
  --color-primary-dark: #115e59;
  --color-text: #222222;
  --space: 8px;
}

body {
  color: var(--color-text);
}

h1 {
  color: var(--color-primary);
  margin-bottom: calc(var(--space) * 3); /* 24px */
}

.button {
  background-color: var(--color-primary);
  color: white;
  padding: var(--space) calc(var(--space) * 2); /* 8px 16px */
}

.button:hover {
  background-color: var(--color-primary-dark);
}

a {
  color: var(--color-primary);
}

.card {
  border: 1px solid var(--color-primary);
  padding: calc(var(--space) * 2); /* 16px */
  margin-bottom: calc(var(--space) * 3); /* 24px */
}
```

Toutes les valeurs calculées sont identiques à la version d’origine. Les variables sont
déclarées sur `:root` pour être héritées partout. Nommer les variables par leur **rôle**
(`--color-primary`) plutôt que par leur apparence (`--teal`) permet de changer la teinte
sans que le nom devienne faux.
:::

### Exercice 2 — Lire un inspecteur

Un apprenant sélectionne un bouton `<button class="btn btn-primary">` qui reste gris au
lieu de bleu. Le volet Styles affiche, de haut en bas :

```text
element.style {
}
.toolbar button {                styles.css:12
  background-color: lightgray;
}
.btn-primary {                   styles.css:30
  background-color: var(--blue);   (barré)
}
.btn {                           styles.css:20
  padding: 8px 12px;
  backgroud-color: white;          (barré, icône d’avertissement)
}
```

1. Pourquoi `.toolbar button` est-elle listée au-dessus de `.btn-primary`, alors qu’elle
   est écrite avant dans le fichier ?
2. Pourquoi la déclaration de `.btn-primary` est-elle barrée ?
3. Que signale l’icône dans `.btn` ?
4. Propose une correction.

:::solution
1. Le volet trie les règles de la plus prioritaire à la moins prioritaire.
   `.toolbar button` vaut (0, 1, 1) et `.btn-primary` (0, 1, 0) : la première gagne
   malgré sa position dans le fichier.
2. Elle est barrée **sans** icône : elle est valide mais perd la cascade contre
   `.toolbar button`, plus spécifique.
3. `backgroud-color` est mal orthographiée (il manque le « n » de `background`) : la
   propriété est inconnue, donc ignorée. Elle n’aurait de toute façon pas gagné.
4. Plusieurs corrections possibles, sans `!important` :
   - augmenter la spécificité de la variante : `.toolbar .btn-primary` (0, 2, 0) ;
   - ou mieux, baisser celle de la règle générale : `:where(.toolbar) button`
     (0, 0, 1), que toute classe de bouton surcharge ;
   - et corriger la faute de frappe dans `.btn`.

Il faut aussi vérifier que `--blue` est bien définie : survoler `var(--blue)` dans le
volet Styles affiche sa valeur, ou tape `getComputedStyle($0).getPropertyValue('--blue')`
dans la console.
:::

### Exercice 3 — Une alerte en trois variantes

Écris une classe `.alert` qui utilise deux variables, `--alert-color` (texte et bordure
gauche) et `--alert-bg` (fond), avec une variante par défaut bleue. Ajoute les variantes
`.alert--success` (vert) et `.alert--danger` (rouge) qui ne redéfinissent **que** les
variables. Quelle est la couleur du texte d’un `<strong>` placé dans une
`.alert--danger` ?

:::solution
```css
.alert {
  --alert-color: #1e40af;
  --alert-bg: #dbeafe;
  color: var(--alert-color);
  background-color: var(--alert-bg);
  border-left: 4px solid var(--alert-color);
  padding: 0.75rem 1rem;
}

.alert--success {
  --alert-color: #166534;
  --alert-bg: #dcfce7;
}

.alert--danger {
  --alert-color: #991b1b;
  --alert-bg: #fee2e2;
}
```

Usage : `<p class="alert alert--danger">Paiement refusé, <strong>réessaie</strong>.</p>`.

`.alert` et `.alert--danger` ont la même spécificité (0, 1, 0) ; `.alert--danger` étant
écrite après, ses valeurs de variables gagnent. Le `<strong>` n’a pas de règle de
couleur : il **hérite** de `color` du paragraphe, soit `#991b1b`. Chaque variante tient
en deux lignes, et ajouter une variante `--warning` ne demande aucune nouvelle
déclaration de couleur ou de bordure.
:::

## Récapitulatif

- Une propriété personnalisée commence par `--`, se lit avec `var(--nom, repli)`, est
  sensible à la casse et s’hérite. Déclarée sur `:root`, elle est disponible partout.
- Redéfinir une variable sur un élément change la valeur pour lui et ses descendants :
  c’est la base des variantes et des thèmes.
- `var(--n)px` ne fonctionne pas ; utilise `calc(var(--n) * 1px)`. Une variable dont la
  valeur est invalide pour la propriété la rend `unset`, sans revenir à la déclaration
  précédente. `var()` ne s’utilise que dans une valeur.
- L’inspecteur montre les règles triées par priorité, les déclarations barrées
  (perdantes) ou signalées (invalides), les valeurs calculées et le modèle de boîte.
  Ses modifications sont temporaires.
- Méthode : bon élément, règle présente, déclaration barrée ou invalide, déclaration
  sans effet, valeur calculée. Formule ton diagnostic en une phrase.
