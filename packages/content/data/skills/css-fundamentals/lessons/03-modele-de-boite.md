---
title: Le modèle de boîte
summary: Comprendre contenu, padding, bordure et marge, choisir box-sizing et anticiper la fusion des marges.
durationMinutes: 65
sources:
  - title: MDN — Introduction au modèle de boîte CSS
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Box_model/Introduction
  - title: MDN — Fusion des marges
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Box_model/Margin_collapsing
  - title: MDN — box-sizing
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/box-sizing
---

Tu as donné une largeur de 300 pixels à une carte, et l’inspecteur annonce 350. Deux
paragraphes ont chacun 20 et 30 pixels de marge, et l’espace entre eux mesure 30, pas 50.
Ces surprises ne sont pas des bugs : elles découlent du **modèle de boîte**, la règle qui
dit comment le navigateur calcule la taille et l’espacement de chaque élément.

Pour le navigateur, **chaque élément est une boîte rectangulaire**, même un titre, même
un lien. Maîtriser ces boîtes, c’est pouvoir prévoir au pixel près la place qu’occupe un
élément.

## Les quatre zones d’une boîte

De l’intérieur vers l’extérieur :

```text
┌─────────────────────────────── margin (marge) ───────────────┐
│  ┌──────────────────────────── border (bordure) ───────────┐ │
│  │  ┌───────────────────────── padding (marge intérieure) ┐ │ │
│  │  │                                                     │ │ │
│  │  │                 content (contenu)                   │ │ │
│  │  │                                                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

| Zone        | Rôle                                                     | Fond de l’élément visible ? |
| ----------- | -------------------------------------------------------- | --------------------------- |
| **content** | le texte, l’image, les enfants                           | oui                         |
| **padding** | l’espace entre le contenu et la bordure                  | oui                         |
| **border**  | le trait autour du padding                               | la bordure a sa couleur     |
| **margin**  | l’espace **à l’extérieur**, qui écarte les autres boîtes | non, toujours transparente  |

Retiens la différence essentielle : le **padding** agrandit la zone colorée de
l’élément ; la **marge** éloigne l’élément de ses voisins.

## Mesurer une boîte

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Boîtes</title>
    <style>
      body {
        margin: 0;
      }

      .card {
        width: 300px;
        padding: 20px;
        border: 5px solid steelblue;
        margin: 10px;
      }
    </style>
  </head>
  <body>
    <div class="card">Une carte</div>
  </body>
</html>
```

Ouvre cette page, fais un clic droit sur la carte, puis « Inspecter ». Le schéma du
modèle de boîte de l’inspecteur (onglet « Calculé » dans Chrome et Edge, « Mise en page »
dans Firefox) indique :

- contenu : **300** pixels de large ;
- largeur visible (bordure comprise) : 300 + 2 × 20 + 2 × 5 = **350** pixels ;
- place occupée horizontalement, marges comprises : 350 + 2 × 10 = **370** pixels.

Par défaut, `width` et `height` fixent la taille de la **zone de contenu** seulement. Le
padding et la bordure s’**ajoutent** autour. C’est le comportement `box-sizing:
content-box`, valeur initiale de la propriété.

## Les raccourcis `margin`, `padding` et `border`

`margin` et `padding` acceptent une à quatre valeurs, dans le sens des aiguilles d’une
montre en partant du haut :

```css
.a {
  padding: 10px; /* les quatre côtés */
}

.b {
  padding: 10px 20px; /* haut et bas 10px, droite et gauche 20px */
}

.c {
  margin: 10px 20px 30px; /* haut 10px, droite et gauche 20px, bas 30px */
}

.d {
  margin: 10px 20px 30px 40px; /* haut, droite, bas, gauche */
}

.e {
  margin-top: 1rem; /* un seul côté : -top, -right, -bottom, -left */
}
```

`border` regroupe trois valeurs : épaisseur, **style** et couleur.

```css
.ok {
  border: 2px solid red;
}

.missing-style {
  border: 2px red; /* aucun trait ! */
}
```

Le piège : sans style, la bordure prend le style `none`, et une bordure `none` a une
épaisseur calculée de **0**. Les styles courants sont `solid`, `dashed`, `dotted` et
`double`. On peut aussi viser un côté : `border-bottom: 1px solid lightgray;`.

Le padding et la marge en pourcentage se calculent par rapport à la **largeur** du bloc
conteneur, même pour `padding-top` et `margin-bottom`. Dans un parent de 400 pixels de
large, `padding-top: 10%` donne 40 pixels.

## `box-sizing: border-box`, la boîte qui tient ses promesses

Le comportement par défaut pose un problème concret :

```html
<div class="parent">
  <div class="child">Je déborde</div>
</div>
```

```css
.parent {
  width: 400px;
}

.child {
  width: 100%;
  padding: 20px;
}
```

L’enfant mesure 400 + 40 = **440** pixels : il **dépasse** de son parent de 40 pixels.
Pour qu’il fasse exactement 400 pixels, il faudrait calculer `calc(100% - 40px)`, et
recalculer à chaque changement de padding.

La solution est `box-sizing: border-box` : `width` et `height` désignent alors la boîte
**bordure comprise**. Le navigateur retire lui-même padding et bordure de la zone de
contenu.

```css
.child {
  box-sizing: border-box;
  width: 100%;
  padding: 20px; /* l’enfant mesure 400px ; son contenu, 360px */
}
```

Reprends la carte du début avec `box-sizing: border-box` : elle mesure **300** pixels de
large, bordure comprise, et son contenu 300 − 40 − 10 = **250** pixels.

Presque tous les projets actuels commencent leur feuille par cette règle :

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

Elle applique `border-box` à tous les éléments et aux pseudo-éléments `::before` et
`::after` (que `*` seul ne cible pas). C’est une **convention** très répandue, pas une
obligation de la norme ; mais tu la rencontreras partout.

## Boîtes de bloc et boîtes en ligne

Toutes les boîtes ne réagissent pas de la même façon à ces propriétés. Cela dépend de
leur **type d’affichage**, contrôlé par `display` (que la compétence sur la mise en page
approfondira).

- Les éléments **de bloc** (`<div>`, `<p>`, `<h1>`, `<section>`, `<ul>`…) commencent sur
  une nouvelle ligne et occupent, par défaut, toute la largeur disponible. `width`,
  `height`, padding et marges fonctionnent comme décrit plus haut.
- Les éléments **en ligne** (`<span>`, `<a>`, `<strong>`, `<em>`…) se placent dans le
  fil du texte. Pour eux :
  - `width` et `height` sont **ignorées** : la taille dépend du contenu ;
  - le padding et la bordure verticaux s’affichent mais **ne repoussent pas** les lignes
    voisines (ils peuvent les chevaucher) ;
  - les marges verticales n’ont **aucun effet** ; les marges horizontales, si.

```html
<p>Texte <span class="badge">nouveau</span> suite du texte.</p>
```

```css
.badge {
  width: 500px; /* ignoré : le span reste à la taille de son texte */
  padding: 10px; /* visible, mais la hauteur de la ligne ne change pas */
  margin: 30px; /* seules les marges gauche et droite écartent le texte */
  background-color: pink;
}
```

Si tu veux qu’un élément reste dans le fil du texte **tout en** respectant largeur,
hauteur et marges, utilise `display: inline-block;`.

## Largeur, hauteur et débordement

### Largeur automatique et centrage

Un bloc sans `width` (valeur `auto`) remplit la largeur de son parent, moins ses marges.
C’est presque toujours ce que tu veux. Pour limiter la largeur sans la figer, préfère
`max-width` :

```css
.page {
  max-width: 600px;
  margin: 0 auto;
}
```

`margin: 0 auto` met 0 en haut et en bas, et `auto` à gauche et à droite : le navigateur
répartit l’espace restant également entre les deux marges, ce qui **centre** le bloc.
Dans un parent de 1000 pixels de large, la boîte fait 600 pixels et chaque marge
latérale 200 pixels. Dans un parent de 400 pixels, elle fait 400 pixels et ses marges
valent 0 : `max-width` laisse la boîte rétrécir. Le centrage par `auto` ne marche que si la boîte est plus étroite que son
parent ; une marge verticale `auto` vaut simplement 0 pour un bloc dans le flux normal.

### Hauteur et `overflow`

Un bloc sans `height` grandit pour contenir son contenu. Si tu fixes une hauteur trop
petite, le contenu **déborde** : il dépasse visuellement de la boîte et peut chevaucher
la suite.

```css
.fixed {
  width: 100px;
  height: 50px; /* le texte long dépasse en dessous */
}

.flexible {
  width: 100px;
  min-height: 50px; /* au moins 50px, plus si le contenu l’exige */
}
```

Préfère `min-height` à `height` dès que le contenu est du texte : tu ne connais ni la
longueur des textes, ni la taille de police choisie par l’utilisateur.

La propriété `overflow` décide du sort de ce qui dépasse :

| Valeur    | Effet                                                    |
| --------- | -------------------------------------------------------- |
| `visible` | valeur initiale : le contenu dépasse et reste visible    |
| `hidden`  | le contenu qui dépasse est coupé                         |
| `auto`    | une barre de défilement apparaît seulement si nécessaire |
| `scroll`  | une barre de défilement est toujours réservée            |

`overflow: hidden` est tentant pour « cacher un problème », mais il peut couper du texte
quand l’utilisateur agrandit la police : vérifie toujours ce que tu masques.

### Ce qui ne prend pas de place

`outline` (le contour, utilisé notamment pour le focus) et `box-shadow` (l’ombre) se
dessinent **sans occuper de place** : ils ne décalent pas les voisins. C’est pour cela
que les contours de focus sont faits avec `outline` : afficher le focus ne fait pas
sauter la mise en page.

## La fusion des marges

Voici la deuxième surprise annoncée.

```html
<p class="first">Premier paragraphe</p>
<p class="second">Second paragraphe</p>
```

```css
.first {
  margin-bottom: 20px;
}

.second {
  margin-top: 30px;
}
```

L’espace entre les deux paragraphes mesure **30** pixels, pas 50. Les marges
**verticales** de blocs adjacents dans le flux normal **fusionnent** (en anglais
_margin collapsing_) : il ne reste que la plus grande des deux. C’est un comportement
voulu : un titre avec une marge basse suivi d’un paragraphe avec une marge haute ne
doivent pas créer un trou double.

### Les trois situations de fusion

1. **Frères adjacents** : la marge basse de l’un et la marge haute du suivant (exemple
   ci-dessus).
2. **Parent et premier ou dernier enfant** : si rien ne sépare la marge haute du parent
   de celle de son premier enfant (ni bordure, ni padding, ni contenu en ligne), elles
   fusionnent. La marge de l’enfant semble alors « sortir » du parent.
3. **Bloc vide** : un bloc sans contenu, padding, bordure ni hauteur voit ses marges
   haute et basse fusionner entre elles, et avec celles des voisins.

La situation 2 surprend tout le monde :

```html
<div class="banner">
  <h1>Bienvenue</h1>
</div>
```

```css
.banner {
  background-color: gold;
}

.banner h1 {
  margin-top: 40px;
}
```

On s’attend à 40 pixels de jaune au-dessus du titre. En réalité, le fond jaune commence
**exactement** au niveau du texte, et les 40 pixels apparaissent **au-dessus** de la
bannière, en blanc. La marge du `<h1>` a fusionné avec celle du `<div>`.

Pour l’empêcher, il suffit de séparer les deux marges ou de créer un nouveau contexte de
mise en forme :

```css
.banner {
  background-color: gold;
  padding-top: 1px; /* solution 1 : un padding, même minuscule */
}

.banner {
  background-color: gold;
  display: flow-root; /* solution 2 : la bannière contient les marges de ses enfants */
}
```

Avec `display: flow-root`, le fond jaune englobe la marge de 40 pixels du titre. Souvent,
la solution la plus naturelle est simplement de remplacer la marge de l’enfant par un
padding du parent : `.banner { padding: 40px 16px; }`.

### Quand les marges ne fusionnent pas

- les marges **horizontales** (gauche et droite) ne fusionnent jamais ;
- les enfants d’un conteneur **flex** ou **grid** ne fusionnent pas leurs marges : deux
  éléments avec 20 et 30 pixels y sont séparés de 50 pixels ;
- un padding ou une bordure entre deux marges les empêche de se toucher ;
- les éléments `inline-block`, flottants ou positionnés en absolu ne fusionnent pas.

Une convention simple évite la plupart des surprises : ne donner de marge verticale que
**dans un seul sens**, par exemple toujours `margin-bottom`, ou utiliser `gap` dans un
conteneur flex ou grid (vu dans la compétence suivante).

## Pièges courants

- **Oublier que `width` exclut padding et bordure** (en `content-box`) : la boîte est
  plus large que prévu. Applique `box-sizing: border-box` globalement.
- **`border: 2px red`** sans style : aucune bordure.
- **Additionner des marges verticales** : elles fusionnent, seule la plus grande compte.
- **Mettre une hauteur fixe sur un bloc de texte** : le texte déborde dès qu’il est plus
  long ou plus grand que prévu. Utilise `min-height`.
- **Donner une largeur ou une marge verticale à un `<span>`** : sans effet, il faut
  `inline-block` ou un élément de bloc.
- **Croire que `margin: 0 auto` centre tout** : il centre un bloc plus étroit que son
  parent, pas le texte à l’intérieur (c’est `text-align: center`).

## Exercices

### Exercice 1 — Calculer au pixel près

Pour chaque boîte, donne la largeur visible (bordure comprise) et la place horizontale
occupée (marges comprises).

```css
.box-a {
  width: 200px;
  padding: 10px 15px;
  border: 3px solid black;
  margin: 0 20px;
}

.box-b {
  box-sizing: border-box;
  width: 200px;
  padding: 10px 15px;
  border: 3px solid black;
  margin: 0 20px;
}
```

:::solution

- **`.box-a`** (`content-box` par défaut) : contenu 200, plus padding gauche et droit
  2 × 15 = 30, plus bordures 2 × 3 = 6. Largeur visible **236 px** ; avec les marges
  2 × 20 = 40, place occupée **276 px**.
- **`.box-b`** (`border-box`) : la largeur visible est exactement **200 px** ; la place
  occupée **240 px**. Le contenu mesure 200 − 30 − 6 = 164 px.

Attention au raccourci `padding: 10px 15px` : 10 en haut et en bas, **15** à gauche et à
droite. C’est la valeur horizontale qui compte pour la largeur.
:::

### Exercice 2 — Expliquer un espacement

```html
<section class="news">
  <h2 class="news-title">Actualités</h2>
  <p class="news-text">Le marché a lieu samedi.</p>
</section>
<footer class="site-footer">Contact</footer>
```

```css
.news {
  background-color: lavender;
  margin-bottom: 10px;
}

.news-title {
  margin-top: 32px;
  margin-bottom: 8px;
}

.news-text {
  margin-top: 16px;
  margin-bottom: 24px;
}
```

1. Quel espace sépare le titre du paragraphe ?
2. Le fond lavande commence-t-il 32 pixels au-dessus du titre ?
3. Quel espace sépare le paragraphe du pied de page ?
4. Propose une correction pour que le fond lavande entoure bien le titre et le texte,
   avec de l’espace intérieur.

:::solution

1. **16 px** : la marge basse du titre (8) et la marge haute du paragraphe (16)
   fusionnent, la plus grande reste.
2. **Non**. Rien ne sépare la marge haute de `.news` (0) de celle du premier enfant
   (32) : elles fusionnent. Le fond commence au niveau du texte du titre et les 32 px
   apparaissent au-dessus de la section.
3. **24 px**. La marge basse du dernier enfant (24) fusionne avec celle de la section
   (10) : il reste 24 entre la section et le pied de page. Et, comme en haut, le fond
   lavande s’arrête au bas du texte du paragraphe.
4. Le plus lisible est de remplacer les marges extérieures des enfants par un padding
   du parent :

```css
.news {
  background-color: lavender;
  padding: 16px;
  margin-bottom: 10px;
}

.news-title {
  margin-top: 0;
  margin-bottom: 8px;
}

.news-text {
  margin-top: 16px;
  margin-bottom: 0;
}
```

Le padding sépare désormais les marges des enfants de celles du parent : plus aucune
fusion avec la section. `display: flow-root` sur `.news` aurait aussi fonctionné, en
gardant les marges des enfants à l’intérieur du fond.
:::

### Exercice 3 — Le champ qui dépasse

Dans un formulaire de 320 pixels de large, chaque champ doit occuper toute la largeur,
avec 12 pixels d’espace intérieur et une bordure de 2 pixels. Ce code fait dépasser les
champs à droite. Explique pourquoi et corrige-le de deux façons.

```css
.form {
  width: 320px;
}

.form input {
  width: 100%;
  padding: 12px;
  border: 2px solid gray;
}
```

:::solution
En `content-box`, `width: 100%` donne 320 px au **contenu**. Le padding (2 × 12) et la
bordure (2 × 2) s’ajoutent : le champ mesure 320 + 24 + 4 = **348 px**, soit 28 px de
trop.

Correction 1, la plus courante : passer en `border-box`, localement ou globalement.

```css
.form input {
  box-sizing: border-box;
  width: 100%;
  padding: 12px;
  border: 2px solid gray;
}
```

Correction 2 : retrancher soi-même padding et bordure avec `calc()`.

```css
.form input {
  width: calc(100% - 28px);
  padding: 12px;
  border: 2px solid gray;
}
```

La première est préférable : elle reste juste si tu changes le padding ou la bordure.
Note que `calc()` exige des espaces autour du `-` et du `+`.
:::

## Récapitulatif

- Chaque élément est une boîte : contenu, padding, bordure, marge. Le padding agrandit
  la zone colorée, la marge écarte les voisins.
- Par défaut (`content-box`), `width` et `height` ne comptent que le contenu ; avec
  `border-box`, elles incluent padding et bordure. La règle globale
  `*, *::before, *::after { box-sizing: border-box; }` est une convention répandue.
- Raccourcis : une à quatre valeurs dans l’ordre haut, droite, bas, gauche ; une
  bordure sans style n’apparaît pas.
- Les éléments en ligne ignorent `width`, `height` et les marges verticales ;
  `inline-block` les respecte.
- `max-width` + `margin: 0 auto` centre un bloc ; `min-height` est plus sûr que
  `height` ; `overflow` gère le débordement.
- Les marges verticales des blocs fusionnent (frères, parent et enfant, bloc vide), mais
  pas les marges horizontales, ni dans un conteneur flex ou grid. `padding` ou
  `display: flow-root` empêchent la fusion parent-enfant.
