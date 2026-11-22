---
title: Unités, couleurs et typographie
summary: Choisir les bonnes unités, écrire les couleurs dans tous les formats courants et composer un texte lisible.
durationMinutes: 60
sources:
  - title: MDN — Valeurs et unités CSS
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Core/Styling_basics/Values_and_units
  - title: MDN — Type color
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Values/color_value
  - title: MDN — line-height
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/line-height
  - title: W3C — WCAG 2.2
    url: https://www.w3.org/TR/WCAG22/
---

« 16px », « 1.5em », « 2rem », « 60ch » : CSS propose de nombreuses unités, et choisir
la mauvaise produit des textes trop petits, des menus qui rétrécissent à chaque niveau
ou une page qui ignore les réglages de l’utilisateur. Même chose pour les couleurs, qui
s’écrivent de plusieurs façons, et pour la typographie, qui fait à elle seule la
moitié de la lisibilité d’un site.

Cette leçon te donne les outils pour lire n’importe quelle valeur CSS et choisir la
bonne en connaissance de cause.

## Les unités de longueur

Une longueur s’écrit toujours **nombre + unité, sans espace** : `16px`, pas `16 px`.
Seule exception : `0` peut s’écrire sans unité, car zéro pixel ou zéro `rem`, c’est la
même chose.

### Le pixel : `px`

Le `px` de CSS est une unité **de référence**, pas un point physique de l’écran. Sur un
écran haute densité, un pixel CSS correspond à plusieurs points physiques : c’est pour
cela qu’un texte de 16 pixels a à peu près la même taille apparente sur un téléphone
récent et sur un ancien écran d’ordinateur.

Le `px` convient bien aux bordures (`1px`), aux ombres et aux petits détails qui ne
doivent pas varier.

### Les unités relatives à la police : `em` et `rem`

- `rem` (_root em_) : relatif à la taille de police de l’élément racine `<html>`. Dans la
  plupart des navigateurs, cette taille vaut **16 pixels par défaut**, mais l’utilisateur
  peut la changer dans ses réglages. `2rem` vaut alors 32 pixels avec le réglage par
  défaut.
- `em` : relatif à la taille de police **de l’élément lui-même**. Exception importante :
  dans la propriété `font-size`, `em` se réfère à la taille de police **du parent**
  (sinon la définition tournerait en rond).

```css
.title {
  font-size: 2rem; /* 2 × 16 = 32px avec le réglage par défaut */
  margin-bottom: 0.5em; /* 0.5 × 32 = 16px : relatif à la police de .title */
  padding: 1em; /* 32px */
}
```

L’avantage de `em` pour les espacements : si tu changes la taille du titre, ses marges
suivent proportionnellement.

### Le piège de l’accumulation des `em`

```html
<ul class="menu">
  <li>
    Produits
    <ul>
      <li>
        Pains
        <ul>
          <li>Baguette</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

```css
.menu li {
  font-size: 0.8em;
}
```

Chaque `<li>` fait 0,8 fois la taille de **son parent**, qui est lui-même un `<li>` du
niveau précédent. Les tailles calculées (avec la racine à 16 pixels) :

| Niveau     | Calcul                 | Taille calculée |
| ---------- | ---------------------- | --------------- |
| Produits   | 16 × 0,8               | 12.8px          |
| Pains      | 12,8 × 0,8             | 10.24px         |
| Baguette   | 10,24 × 0,8            | 8.192px         |

Le troisième niveau devient illisible. Avec `font-size: 0.8rem`, les trois niveaux font
12.8px : `rem` ne dépend que de la racine, il ne s’accumule pas.

**Recommandation courante** : `rem` pour les tailles de police, ce qui respecte le
réglage de l’utilisateur sans accumulation ; `em` quand un espacement doit suivre la
taille du texte de l’élément.

### Pourcentages, viewport et `ch`

| Unité  | Référence                                                     | Exemple d’usage            |
| ------ | ------------------------------------------------------------- | -------------------------- |
| `%`    | dépend de la propriété : pour `width`, la largeur du parent   | `width: 50%`               |
| `vw`   | 1 % de la largeur de la fenêtre (le _viewport_)               | `width: 50vw`              |
| `vh`   | 1 % de la hauteur de la fenêtre                               | `min-height: 100vh`        |
| `ch`   | la largeur du caractère « 0 » dans la police de l’élément     | `max-width: 65ch`          |

Dans une fenêtre de 1024 pixels de large, `width: 50vw` donne 512 pixels, quelle que soit
la taille du parent. Le pourcentage, lui, suit le parent. Les unités de viewport seront
approfondies dans la compétence sur le responsive.

`ch` est idéal pour limiter la **longueur des lignes** d’un texte : au-delà d’une
soixantaine à quatre-vingts caractères par ligne, l’œil peine à retrouver le début de la
ligne suivante. C’est une recommandation typographique répandue, pas une règle de la
norme CSS.

### Mélanger les unités avec `calc()`

`calc()` effectue un calcul au moment de l’affichage, même entre unités différentes :

```css
.content {
  width: calc(100% - 2rem); /* la largeur du parent moins 32px */
}
```

Dans un parent de 500 pixels, `.content` mesure 468 pixels. Les opérateurs `+` et `-`
doivent être entourés d’espaces : `calc(100%-2rem)` est invalide.

## Les couleurs

### Les écritures courantes d’une couleur

```css
.named {
  color: darkgreen; /* un des mots-clés de couleur définis par CSS */
}

.hex {
  color: #1d4ed8; /* hexadécimal : rouge 1d, vert 4e, bleu d8 */
}

.hex-short {
  color: #f60; /* forme courte de #ff6600 */
}

.rgb {
  color: rgb(29 78 216); /* même bleu que #1d4ed8, en décimal de 0 à 255 */
}

.hsl {
  color: hsl(220 80% 40%); /* teinte en degrés, saturation, luminosité */
}
```

- Les **mots-clés** (`red`, `darkgreen`, `steelblue`, `transparent`…) sont pratiques pour
  tester, mais il en existe un nombre limité.
- CSS connaît d’autres notations (`hwb()`, `lab()`, `oklch()`…) ; celles de cette leçon
  suffisent pour débuter.
- L’**hexadécimal** `#rrggbb` donne trois valeurs de 00 à ff (0 à 255). `#f60` est la
  forme courte de `#ff6600` : chaque chiffre est doublé.
- `rgb()` décrit les mêmes trois composantes en décimal. Tu rencontreras aussi l’ancienne
  syntaxe avec virgules, `rgb(29, 78, 216)`, toujours valide.
- `hsl()` décrit une couleur comme un humain la pense : **teinte** sur le cercle
  chromatique (0 = rouge, 120 = vert, 240 = bleu), **saturation** (0 % = gris), et
  **luminosité** (0 % = noir, 100 % = blanc). Pour obtenir une variante plus claire, il
  suffit d’augmenter la luminosité.

### La transparence

On ajoute un canal **alpha**, de 0 (invisible) à 1 (opaque) :

```css
.overlay {
  background-color: rgb(0 0 0 / 50%); /* noir à moitié transparent */
}

.tint {
  color: #1d4ed880; /* 8 chiffres : les deux derniers sont l’alpha (80 ≈ 50 %) */
}

.faded {
  opacity: 0.5; /* TOUT l’élément devient transparent, enfants compris */
}
```

Ne confonds pas les deux : une couleur alpha ne rend transparent **que** ce fond ou ce
texte ; `opacity` rend transparents l’élément entier et tout son contenu. Pour un fond
semi-transparent sous un texte bien lisible, c’est la couleur alpha qu’il faut.

### `currentColor`

Le mot-clé `currentColor` vaut la valeur de `color` de l’élément. Il évite de répéter une
couleur :

```css
.button {
  color: darkgreen;
  border: 2px solid currentColor; /* la bordure est vert foncé */
}
```

Si tu changes `color` (au survol par exemple), la bordure suit automatiquement.

### Le contraste, une exigence d’accessibilité

Un texte doit contraster suffisamment avec son fond pour rester lisible, notamment
pour les personnes malvoyantes ou sur un écran en plein soleil. Les WCAG (_Web Content Accessibility Guidelines_), au
niveau AA, demandent un rapport de contraste d’au moins **4,5:1** pour le texte courant
et **3:1** pour le grand texte. Le gris clair sur fond blanc, très à la mode, échoue
souvent. L’inspecteur des navigateurs affiche ce rapport dans son sélecteur de couleur :
vérifie-le pour chaque couple texte-fond.

## La typographie

### Choisir une police : `font-family`

```css
body {
  font-family: "Source Sans 3", Arial, sans-serif;
}

code {
  font-family: ui-monospace, Consolas, monospace;
}
```

La valeur est une **pile de polices** : le navigateur prend la première disponible sur
l’appareil. Termine **toujours** par une **famille générique** (`serif`, `sans-serif`,
`monospace`, `system-ui`…), garantie d’exister. Mets entre guillemets les noms qui
contiennent des espaces ou des chiffres.

Pour utiliser une police qui n’est pas installée chez le visiteur, il faut la fournir
avec la règle `@font-face` (ou un service qui l’écrit pour toi) :

```css
@font-face {
  font-family: "Source Sans 3";
  src: url("fonts/source-sans-3.woff2") format("woff2");
  font-weight: 400;
  font-display: swap; /* affiche le texte avec la police de secours en attendant */
}
```

Chaque fichier de police a un poids de téléchargement : limite-toi à deux familles et
aux graisses dont tu as vraiment besoin.

### Taille, graisse, style

```css
body {
  font-size: 1rem;
  font-weight: 400; /* normal */
}

h1 {
  font-size: 2.5rem;
  font-weight: 700; /* bold */
}

.note {
  font-style: italic;
}
```

`font-weight` accepte des nombres de 100 à 900 par pas de 100 dans l’usage courant ;
`normal` vaut 400 et `bold` vaut 700. Une graisse qui n’existe pas dans la police est
remplacée par la plus proche, ou simulée par le navigateur.

### L’interligne : `line-height` sans unité

`line-height` règle la hauteur de chaque ligne. Pour un texte courant, une valeur autour
de 1,5 est confortable. Écris-la **sans unité** :

```html
<div class="article">
  <h2>Un titre assez long pour tenir sur deux lignes</h2>
</div>
```

```css
.article {
  font-size: 16px;
  line-height: 1.5em; /* piège : calculé une fois pour toutes à 24px */
}

.article h2 {
  font-size: 32px;
}
```

`1.5em` est converti en pixels **sur `.article`** : 24 pixels. C’est cette valeur
calculée qui est héritée par le `<h2>`. Résultat : un titre de 32 pixels avec des lignes
de 24 pixels, qui se chevauchent. Avec `line-height: 1.5` (sans unité), c’est le
**facteur** qui est hérité : le titre obtient 1,5 × 32 = 48 pixels d’interligne.

### Alignement, décoration, espacement

```css
.centered {
  text-align: center; /* left, right, center, justify */
}

a {
  text-decoration: underline; /* none, underline, line-through */
  text-underline-offset: 0.2em;
}

.label {
  text-transform: uppercase; /* affiche en majuscules sans changer le HTML */
  letter-spacing: 0.05em;
}

.prose {
  max-width: 65ch;
}
```

- `text-align` aligne le **contenu en ligne** d’un bloc ; il ne centre pas le bloc
  lui-même (c’est `margin: 0 auto`, vu dans la leçon précédente).
- Ne retire pas le soulignement des liens dans un texte sans autre indice visuel que la
  couleur : un lien doit se distinguer sans dépendre uniquement de la couleur.
- `text-transform: uppercase` change l’affichage, pas le texte : un lecteur d’écran et un
  copier-coller retrouvent le texte d’origine.

### Une base typographique complète

```css
html {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: #1f2937;
  background-color: #ffffff;
}

h1,
h2,
h3 {
  line-height: 1.2;
}

h1 {
  font-size: 2.25rem;
}

h2 {
  font-size: 1.75rem;
}

h3 {
  font-size: 1.375rem;
}

p,
li {
  max-width: 65ch;
}
```

Grâce à l’héritage, déclarer police, interligne et couleur sur `html` suffit pour toute
la page. Les titres redéfinissent un interligne plus serré, plus adapté aux grands
caractères. Tailles en `rem` : si l’utilisateur passe sa police par défaut de 16 à 20
pixels, toute la hiérarchie grandit proportionnellement.

## Pièges courants

- **`16 px`** avec une espace : valeur invalide, déclaration ignorée.
- **Oublier l’unité** : `width: 300` est invalide (seul `0` et quelques propriétés comme
  `line-height` ou `opacity` acceptent un nombre sans unité).
- **`em` imbriqués** : les tailles s’accumulent ; utilise `rem` pour les polices.
- **`line-height` avec unité** sur un parent : les enfants plus grands se chevauchent.
- **`opacity` pour un fond transparent** : le texte devient transparent aussi.
- **Pile de polices sans famille générique** : rendu imprévisible si aucune police
  n’est disponible.
- **Tailles de police en `px` partout** : le réglage de taille de police de
  l’utilisateur est ignoré. Le zoom du navigateur fonctionne encore, mais le réglage de
  police par défaut, lui, n’a plus d’effet.

## Exercices

### Exercice 1 — Calculer des tailles

La racine `<html>` est à la taille par défaut de 16 pixels. Calcule la taille en pixels
de chaque valeur indiquée.

```html
<section class="panel">
  <h2 class="panel-title">Titre</h2>
  <p class="panel-text">Texte <small class="hint">aide</small></p>
</section>
```

```css
.panel {
  font-size: 1.25rem;
  padding: 1em;
}

.panel-title {
  font-size: 1.5em;
  margin-bottom: 0.5em;
}

.panel-text {
  font-size: 0.875rem;
}

.hint {
  font-size: 0.8em;
}
```

Valeurs demandées : `font-size` et `padding` de `.panel` ; `font-size` et `margin-bottom`
de `.panel-title` ; `font-size` de `.panel-text` et de `.hint`.

:::solution
- `.panel` : `font-size` = 1,25 × 16 = **20px** ; `padding` = 1em = 1 × 20 = **20px**
  (relatif à la police de l’élément lui-même).
- `.panel-title` : `font-size` = 1,5em du parent = 1,5 × 20 = **30px** ;
  `margin-bottom` = 0,5em de **sa propre** police = 0,5 × 30 = **15px**.
- `.panel-text` : `font-size` = 0,875rem = 0,875 × 16 = **14px** ; le `rem` ignore les
  20px du parent.
- `.hint` : 0,8em du parent `.panel-text` = 0,8 × 14 = **11.2px**.

Tu peux vérifier chaque valeur dans l’onglet « Calculé » de l’inspecteur.

:::

### Exercice 2 — Un bandeau lisible

Écris le CSS d’un bandeau d’information `.banner` qui :

- a un fond bleu (`#1d4ed8`) à 15 % d’opacité, sans rendre le texte transparent ;
- a un texte bleu foncé et une bordure gauche de 4 pixels de la même couleur que le
  texte, sans répéter la couleur ;
- utilise une taille de police de 1,125 fois le réglage de l’utilisateur, avec un
  interligne de 1,4 transmis correctement aux enfants ;
- ne dépasse pas 60 caractères par ligne.

:::solution
```css
.banner {
  /* rgb(29 78 216) est #1d4ed8 ; l’alpha ne touche que le fond. */
  background-color: rgb(29 78 216 / 15%);
  color: #1e3a8a;
  /* currentColor reprend la valeur de color : pas de répétition. */
  border-left: 4px solid currentColor;
  /* rem : suit le réglage de l’utilisateur, sans accumulation. */
  font-size: 1.125rem;
  /* Sans unité : c’est le facteur qui est hérité par les enfants. */
  line-height: 1.4;
  /* ch : largeur du caractère « 0 » ; limite la longueur des lignes. */
  max-width: 60ch;
  padding: 0.75em 1em;
}
```

`#1d4ed826` aurait aussi convenu (`26` en hexadécimal vaut 38, soit environ 15 % de
255). `opacity: 0.15` aurait en revanche rendu le texte presque invisible. Vérifie enfin
le contraste du texte sur ce fond avec l’inspecteur.

:::

### Exercice 3 — Diagnostiquer un texte qui se chevauche

Sur un site, les grands titres des cartes se chevauchent quand ils passent sur deux
lignes, et les sous-menus deviennent minuscules. Voici le CSS :

```css
.card {
  font-size: 15px;
  line-height: 22px;
}

.card h3 {
  font-size: 28px;
}

.submenu {
  font-size: 0.85em;
}
```

Explique les deux problèmes et corrige-les.

:::solution
1. **Chevauchement** : `line-height: 22px` est une longueur fixe. Le `<h3>` hérite de
   22px d’interligne pour un texte de 28px : les lignes se superposent. Correction :
   `line-height: 1.45` sans unité (22 / 15 ≈ 1,47) ; le titre obtient alors 1,45 × 28,
   soit environ 40,6px.
2. **Sous-menus minuscules** : si un `.submenu` contient un autre `.submenu`, chaque
   niveau fait 0,85 fois le précédent. Correction : `font-size: 0.85rem`, identique à
   chaque niveau.

En prime, `font-size: 15px` sur `.card` ignore le réglage de l’utilisateur ;
`0.9375rem` donne 15px avec le réglage par défaut et suit ce réglage.

```css
.card {
  font-size: 0.9375rem;
  line-height: 1.45;
}

.card h3 {
  font-size: 1.75rem;
  line-height: 1.2;
}

.submenu {
  font-size: 0.85rem;
}
```

:::

## Récapitulatif

- Une longueur s’écrit sans espace entre nombre et unité ; `0` n’a pas besoin d’unité.
- `px` est une unité de référence, utile pour les détails fixes. `rem` dépend de la
  racine (16px par défaut, réglable par l’utilisateur) ; `em` de la police de l’élément,
  ou du parent dans `font-size`, et s’accumule.
- `%` suit le parent, `vw`/`vh` la fenêtre, `ch` la largeur du « 0 » ; `calc()` mélange
  les unités.
- Couleurs : mots-clés, `#rrggbb`, `rgb()`, `hsl()`, avec un alpha optionnel. Une
  couleur alpha ne touche qu’une propriété, `opacity` tout l’élément. `currentColor`
  reprend `color`.
- Contraste minimal WCAG AA : 4,5:1 pour le texte courant, 3:1 pour le grand texte.
- Typographie : pile de polices terminée par une famille générique, tailles en `rem`,
  `line-height` sans unité, longueur de ligne limitée avec `ch`.
