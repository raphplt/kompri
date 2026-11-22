---
title: Mettre en page sur un axe avec flexbox
summary: Aligner, répartir et dimensionner des éléments en ligne ou en colonne avec flexbox, et comprendre le calcul des tailles.
durationMinutes: 75
sources:
  - title: MDN — Concepts de base des boîtes flexibles
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts
  - title: W3C — CSS Flexible Box Layout Module Level 1
    url: https://www.w3.org/TR/css-flexbox-1/
---

Placer un logo à gauche et des liens à droite, centrer un bouton verticalement, donner la
même hauteur à trois cartes côte à côte : avant flexbox, chacune de ces tâches demandait
des astuces fragiles. **Flexbox** (_Flexible Box Layout_) est un mode de mise en page
conçu pour disposer des éléments **sur un axe** (une ligne ou une colonne), en répartissant
l’espace disponible.

Dans cette leçon, les exemples supposent la réinitialisation vue dans la compétence
précédente :

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

## Conteneur et éléments flexibles

Flexbox se déclenche sur le **parent** :

```html
<nav class="nav">
  <a class="logo" href="index.html">Le Fournil</a>
  <a href="pains.html">Pains</a>
  <a href="contact.html">Contact</a>
</nav>
```

```css
.nav {
  display: flex;
}
```

- `.nav` devient un **conteneur flexible** (_flex container_) ;
- ses **enfants directs**, les trois liens, deviennent des **éléments flexibles**
  (_flex items_). Les petits-enfants ne sont pas concernés.

Résultat : les trois liens se placent côte à côte, de gauche à droite, collés les uns aux
autres. Ce sont des liens en ligne à l’origine, mais un élément flexible est toujours
traité comme un bloc : `width`, `height` et marges verticales s’y appliquent.

## Les deux axes

Tout flexbox repose sur deux axes :

- l’**axe principal** (_main axis_) : la direction dans laquelle les éléments sont
  placés. Par défaut, horizontal, de gauche à droite ;
- l’**axe secondaire** (_cross axis_) : perpendiculaire au premier. Par défaut,
  vertical.

`flex-direction` choisit l’axe principal :

| Valeur           | Axe principal                   |
| ---------------- | ------------------------------- |
| `row`            | horizontal (valeur initiale)    |
| `column`         | vertical, de haut en bas        |
| `row-reverse`    | horizontal, en ordre inversé    |
| `column-reverse` | vertical, en ordre inversé      |

Retiens ceci, c’est la clé de tout le reste : **`justify-content` agit sur l’axe
principal, `align-items` sur l’axe secondaire.** Si tu passes en `column`, les deux
propriétés échangent leur direction visuelle.

## Répartir sur l’axe principal : `justify-content`

Pour trois éléments de 100 pixels dans un conteneur de 600 pixels, il reste 300 pixels
d’espace libre. `justify-content` décide où le mettre :

| Valeur          | Positions des bords gauches | Espace libre                                 |
| --------------- | --------------------------- | -------------------------------------------- |
| `flex-start`    | 0, 100, 200                 | tout à la fin (valeur par défaut)            |
| `flex-end`      | 300, 400, 500               | tout au début                                |
| `center`        | 150, 250, 350               | moitié de chaque côté                        |
| `space-between` | 0, 250, 500                 | entre les éléments seulement                 |
| `space-around`  | 50, 250, 450                | autour de chaque élément (moitié aux bords)  |
| `space-evenly`  | 75, 250, 425                | des espaces tous égaux, bords compris        |

`space-between` est très utilisé pour des en-têtes « logo à gauche, menu à droite ».

## Aligner sur l’axe secondaire : `align-items`

| Valeur       | Effet sur des éléments placés en ligne                                    |
| ------------ | ------------------------------------------------------------------------- |
| `stretch`    | valeur par défaut : étirés sur toute la hauteur du conteneur              |
| `flex-start` | collés en haut                                                            |
| `flex-end`   | collés en bas                                                             |
| `center`     | centrés verticalement                                                     |
| `baseline`   | alignés sur la ligne de base de leur texte                                |

La valeur par défaut `stretch` explique un phénomène que tu as peut-être remarqué : des
cartes côte à côte en flexbox ont **toutes la même hauteur**, celle de la plus haute.
`align-self` fait la même chose qu’`align-items`, mais pour un seul élément.

Le centrage parfait, qui fut longtemps un casse-tête, tient en trois lignes :

```css
.hero {
  display: flex;
  justify-content: center; /* centré horizontalement */
  align-items: center; /* centré verticalement */
  min-height: 300px;
}
```

## Espacer avec `gap`

```css
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
```

`gap` place 16 pixels **entre** les éléments, jamais avant le premier ni après le
dernier. C’est plus simple et plus fiable que des marges : pas de marge à retirer sur le
dernier élément, et rien à calculer lors d’un passage à la ligne.

### Pousser un élément avec une marge `auto`

Dans un conteneur flexible, une marge `auto` absorbe tout l’espace libre de son côté :

```css
.nav .logo {
  margin-right: auto;
}
```

Le logo reste à gauche ; les autres liens sont poussés à droite. C’est la technique la
plus souple pour une barre de navigation : tu peux ajouter des liens sans rien changer.

## Passer à la ligne : `flex-wrap`

Par défaut (`flex-wrap: nowrap`), flexbox garde **tous** les éléments sur une seule
ligne, quitte à les rétrécir ou à les faire déborder. Avec `flex-wrap: wrap`, les
éléments qui ne tiennent plus passent sur une nouvelle ligne :

```css
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

Une liste d’étiquettes s’adapte ainsi à toutes les largeurs d’écran. `gap` s’applique
aussi entre les lignes. Quand il y a plusieurs lignes, `align-content` répartit les
lignes elles-mêmes sur l’axe secondaire.

## La taille des éléments : `flex-grow`, `flex-shrink`, `flex-basis`

Voici la partie qui demande le plus d’attention. Pour chaque élément, flexbox part d’une
**taille de base**, puis **distribue** l’espace libre ou **retire** l’espace manquant.

| Propriété     | Rôle                                                        | Valeur initiale |
| ------------- | ----------------------------------------------------------- | --------------- |
| `flex-basis`  | taille de départ sur l’axe principal                        | `auto`          |
| `flex-grow`   | part de l’espace **libre** reçue (proportion)               | `0`             |
| `flex-shrink` | part de l’espace **manquant** retirée (proportion)          | `1`             |

`flex-basis: auto` signifie « utilise `width` (ou `height` en colonne) si elle est
définie, sinon la taille du contenu ».

### Grandir

```html
<div class="row">
  <div class="a">A</div>
  <div class="b">B</div>
  <div class="c">C</div>
</div>
```

```css
.row {
  display: flex;
  width: 600px;
}

.row > div {
  flex-basis: 100px;
}

.a,
.c {
  flex-grow: 1;
}

.b {
  flex-grow: 2;
}
```

Le calcul :

1. tailles de base : 3 × 100 = 300 pixels ; espace libre : 600 − 300 = 300 pixels ;
2. total des `flex-grow` : 1 + 2 + 1 = 4 ; une part = 300 / 4 = 75 pixels ;
3. A et C reçoivent 75 pixels, B en reçoit 150.

Largeurs finales : A **175**, B **250**, C **175** pixels. B n’est **pas** deux fois plus
large que A : il a reçu deux fois plus d’espace **libre**.

### Rétrécir

```css
.pair {
  display: flex;
  width: 300px;
}

.pair > div {
  width: 200px;
}
```

Deux éléments de 200 pixels dans 300 pixels : il manque 100 pixels. Avec
`flex-shrink: 1` (valeur initiale) pour les deux, chacun perd 50 pixels : ils mesurent
**150** pixels. Une `width` en flexbox est donc une **taille de départ**, pas une
garantie. Pour interdire le rétrécissement, écris `flex-shrink: 0` : chaque élément
garde alors ses 200 pixels, et l’ensemble déborde du conteneur.

### Le raccourci `flex`

On écrit presque toujours le raccourci `flex` :

| Déclaration    | Équivaut à       | Usage                                                         |
| -------------- | ---------------- | ------------------------------------------------------------- |
| `flex: initial` | `0 1 auto`      | comportement par défaut : taille du contenu, peut rétrécir    |
| `flex: 1`      | `1 1 0%`         | parts **égales** de toute la place, quel que soit le contenu  |
| `flex: auto`   | `1 1 auto`       | part de l’espace libre **en plus** de la taille du contenu    |
| `flex: none`   | `0 0 auto`       | taille fixe : ni grandir ni rétrécir                          |
| `flex: 1 1 200px` | `1 1 200px`   | base de 200 pixels, puis grandit et rétrécit                  |

La différence entre `flex: 1` et `flex: auto` surprend. Avec trois éléments dont le
deuxième contient un long texte, dans 600 pixels :

- `flex: 1` : base 0, toute la place est partagée en trois, chaque élément mesure
  **200** pixels ;
- `flex: auto` : base = taille du contenu, seul l’espace **restant** est partagé ;
  l’élément au long texte reste nettement plus large que les deux autres.

### Une mise en page classique : image et texte

```html
<article class="media">
  <img class="media-img" src="pain.jpg" alt="Miche de campagne" width="80" height="80">
  <div class="media-body">
    <h2>Miche de campagne</h2>
    <p>Levain naturel, farine de seigle.</p>
  </div>
</article>
```

```css
.media {
  display: flex;
  align-items: flex-start; /* l’image n’est pas étirée en hauteur */
  gap: 16px;
}

.media-img {
  flex: none; /* l’image garde ses 80 pixels */
}

.media-body {
  flex: 1; /* le texte prend toute la place restante */
}
```

Dans un conteneur de 400 pixels : image 80, espace 16, texte 304 pixels.

### Pousser un pied de carte en bas

En colonne, une marge `auto` pousse un élément au bout de l’axe principal :

```css
.card {
  display: flex;
  flex-direction: column;
}

.card-footer {
  margin-top: auto; /* collé en bas de la carte */
}
```

Combiné avec l’étirement par défaut des cartes placées côte à côte, les boutons de
toutes les cartes s’alignent en bas, même si les textes ont des longueurs différentes.

## Pièges courants

### L’élément qui refuse de rétrécir

```html
<div class="file">
  <div class="file-name">https://exemple.com/documents/rapport_annuel_version_finale.pdf</div>
  <div class="file-size">2 Mo</div>
</div>
```

```css
.file {
  display: flex;
  width: 300px;
}

.file-name {
  flex: 1;
}
```

Tu t’attends à un nom de fichier qui se replie. En réalité, la ligne **déborde** :
`.file-name` mesure environ 430 pixels. Un élément flexible a par défaut
`min-width: auto`, qui l’empêche de devenir plus étroit que son **contenu le plus long
impossible à couper**, ici l’adresse sans espace. Correction :

```css
.file-name {
  flex: 1;
  min-width: 0; /* autorise l’élément à rétrécir sous la taille de son contenu */
  overflow-wrap: anywhere; /* autorise la coupure de l’adresse n’importe où */
}
```

Le nom tient alors dans les 300 pixels en passant sur plusieurs lignes.

### Changer l’ordre visuel

`order` (et les valeurs `row-reverse`, `column-reverse`) change l’**ordre d’affichage**,
mais pas l’ordre du HTML. Or la navigation au clavier et les lecteurs d’écran suivent
l’ordre du HTML. Un utilisateur au clavier verrait le focus sauter d’un endroit à
l’autre. Règle : si l’ordre a du sens, change le HTML ; réserve `order` aux ajustements
purement visuels.

### Autres pièges

- **`display: flex` sur le mauvais élément** : flexbox agit sur les enfants directs.
  Mettre `display: flex` sur un `<li>` ne dispose pas les `<li>` entre eux ; il faut le
  mettre sur le `<ul>`.
- **Oublier `flex-wrap`** : sur mobile, des éléments écrasés ou qui débordent.
- **Confondre les axes** après un `flex-direction: column` : `justify-content` devient
  vertical.
- **Hauteur nécessaire pour centrer verticalement** : un conteneur dont la hauteur vaut
  celle de son contenu n’a pas d’espace à répartir. Donne-lui une `min-height`.

## Exercices

### Exercice 1 — La barre de navigation

```html
<header class="site-header">
  <a class="brand" href="index.html">Le Fournil</a>
  <nav>
    <ul class="menu">
      <li><a href="pains.html">Pains</a></li>
      <li><a href="viennoiseries.html">Viennoiseries</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
  </nav>
</header>
```

Écris le CSS pour que le nom de la boulangerie soit à gauche, le menu à droite,
centrés verticalement sur une hauteur minimale de 64 pixels, avec 24 pixels entre les
liens du menu et 16 pixels d’espace intérieur à gauche et à droite. Les liens du menu
passent à la ligne si la place manque.

:::solution
```css
.site-header {
  display: flex; /* enfants directs : .brand et <nav> */
  justify-content: space-between; /* l’un à gauche, l’autre à droite */
  align-items: center; /* centrage vertical, sur l’axe secondaire */
  gap: 16px; /* écart minimal si les deux se rapprochent */
  min-height: 64px;
  padding: 0 16px;
}

.menu {
  display: flex; /* les <li> sont les enfants directs du <ul> */
  flex-wrap: wrap;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
}
```

Deux conteneurs flexibles sont nécessaires : `.site-header` dispose le nom et la
navigation ; `.menu` dispose les `<li>`. Mettre `display: flex` sur `<nav>` ne servirait
à rien : son seul enfant direct est le `<ul>`. Une variante consiste à garder
`.site-header` sans `justify-content` et à donner `margin-right: auto` à `.brand`.
:::

### Exercice 2 — Calculer des largeurs

Un conteneur flexible de 800 pixels contient trois éléments, sans `gap` :

```css
.x {
  flex: 0 0 200px;
}

.y {
  flex: 1 1 100px;
}

.z {
  flex: 3 1 100px;
}
```

1. Quelles sont les largeurs finales ?
2. Même question si le conteneur ne mesure plus que 300 pixels.

:::solution
1. Tailles de base : 200 + 100 + 100 = 400 ; espace libre : 800 − 400 = 400. `.x` ne
   grandit pas (`flex-grow: 0`). Total des `flex-grow` : 1 + 3 = 4 ; une part = 100.
   `.y` = 100 + 100 = **200** ; `.z` = 100 + 300 = **400** ; `.x` = **200**. Total 800.
2. Il manque 400 − 300 = 100 pixels. `.x` ne rétrécit pas (`flex-shrink: 0`). `.y` et
   `.z` ont le même `flex-shrink` (1) et la même base (100) : ils perdent chacun 50.
   `.x` = **200**, `.y` = **50**, `.z` = **50**.

Précision : le retrait est proportionnel à `flex-shrink` **multiplié par la taille de
base**. Ici les bases sont égales, donc le partage est égal. Avec des contenus réels,
`min-width: auto` peut aussi empêcher un élément de descendre sous la taille de son
contenu.
:::

### Exercice 3 — Trois cartes de même hauteur

Trois cartes côte à côte, de textes de longueurs différentes, doivent : occuper chacune
un tiers de la largeur, avoir la même hauteur, et aligner leur bouton en bas. Quand la
place manque, elles doivent passer à la ligne sans media query, en partant d’une largeur
de base de 250 pixels.

```html
<div class="cards">
  <article class="card">
    <h2>Pain de mie</h2>
    <p>Moelleux.</p>
    <a class="card-link" href="mie.html">Voir</a>
  </article>
  <article class="card">
    <h2>Fougasse</h2>
    <p>Olives, herbes de Provence, huile d’olive et fleur de sel.</p>
    <a class="card-link" href="fougasse.html">Voir</a>
  </article>
  <article class="card">
    <h2>Brioche</h2>
    <p>Beurre et œufs frais.</p>
    <a class="card-link" href="brioche.html">Voir</a>
  </article>
</div>
```

:::solution
```css
.cards {
  display: flex;
  flex-wrap: wrap; /* passage à la ligne quand 250px ne tiennent plus */
  gap: 16px;
}

.card {
  flex: 1 1 250px; /* base 250px, puis parts égales de l’espace libre */
  display: flex; /* la carte est aussi un conteneur, en colonne */
  flex-direction: column;
  padding: 16px;
  border: 1px solid lightgray;
}

.card-link {
  margin-top: auto; /* pousse le lien en bas de la carte */
  align-self: flex-start; /* le lien garde sa largeur au lieu d’être étiré */
}
```

Même hauteur : sur une ligne, les cartes sont étirées par `align-items: stretch`
(valeur par défaut). Bouton en bas : `margin-top: auto` dans la colonne. Passage à la
ligne : trois bases de 250 px plus deux `gap` de 16 px exigent 782 px ; dans un
conteneur plus étroit, la troisième carte passe à la ligne et s’étire sur toute la
largeur. En dessous de 516 px (2 × 250 + 16), il n’y a plus qu’une carte par ligne. Une carte
seule sur sa ligne s’étire, ce que la grille, vue dans la leçon suivante, évite.
:::

## Récapitulatif

- `display: flex` sur le parent ; seuls les enfants directs deviennent des éléments
  flexibles, traités comme des blocs.
- Axe principal (`flex-direction`) et axe secondaire : `justify-content` répartit sur le
  premier, `align-items` / `align-self` alignent sur le second.
- `gap` espace les éléments ; une marge `auto` absorbe l’espace libre et pousse un
  élément.
- `flex-wrap: wrap` autorise le passage à la ligne.
- `flex-basis` donne la taille de départ, `flex-grow` partage l’espace libre,
  `flex-shrink` l’espace manquant. `flex: 1` donne des parts égales, `flex: none` fige
  la taille.
- `min-width: 0` débloque un élément qui refuse de rétrécir ; `order` ne change pas
  l’ordre de navigation au clavier.
