---
title: Concevoir mobile d’abord avec les media queries
summary: Configurer le viewport, écrire des media queries mobile d’abord, choisir ses points de rupture et utiliser des unités relatives et clamp().
durationMinutes: 70
sources:
  - title: MDN — Media queries
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Media_queries/Using
  - title: MDN — meta name="viewport"
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/meta/name/viewport
  - title: MDN — clamp()
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Values/clamp
  - title: W3C — Media Queries Level 4
    url: https://www.w3.org/TR/mediaqueries-4/
---

Ton site sera consulté sur un téléphone tenu d’une main, une tablette, un ordinateur
portable, un grand écran, parfois avec un zoom à 200 %. Faire une version par appareil
est impossible : il y en a trop, et il en sort de nouveaux chaque année. Le **responsive
design** consiste à écrire **une seule** page dont la mise en page s’adapte à l’espace
disponible.

Tu disposes déjà de deux outils qui s’adaptent seuls : le flux normal et les grilles
`auto-fit`. Cette leçon ajoute les **media queries**, qui appliquent des règles selon
les caractéristiques de l’écran, et une méthode : **mobile d’abord**.

## La balise viewport, indispensable

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Cette ligne, dans le `<head>`, est le point de départ de tout site responsive. Sans
elle, les navigateurs mobiles affichent la page dans une fenêtre virtuelle large
(souvent autour de 980 pixels), puis la réduisent pour qu’elle tienne à l’écran : le
texte devient minuscule, et tes media queries voient une largeur de bureau. Avec
`width=device-width`, la largeur de la fenêtre CSS correspond à la largeur de l’écran
de l’appareil, par exemple 375 pixels CSS pour beaucoup de téléphones.

Tu peux le vérifier : dans le mode responsive de l’inspecteur, en simulation de
téléphone, une page sans cette balise annonce une largeur de 980 pixels
(`document.documentElement.clientWidth` dans la console), et une page avec, la largeur
de l’écran simulé.

N’ajoute jamais `maximum-scale=1` ou `user-scalable=no` : ces valeurs empêchent
l’utilisateur de zoomer, ce qui pénalise les personnes malvoyantes.

## La syntaxe des media queries

```css
@media (min-width: 40rem) {
  .layout {
    grid-template-columns: 12rem minmax(0, 1fr);
  }
}
```

La règle `@media` contient une **condition** entre parenthèses et des règles CSS
ordinaires. Ces règles ne s’appliquent que si la condition est vraie. Elles ne changent
rien à la cascade : une règle dans une media query a la même spécificité qu’en dehors.
C’est pourquoi on place les media queries **après** les règles qu’elles modifient : à
spécificité égale, la dernière gagne.

Les conditions les plus utiles :

| Condition                       | Vraie quand…                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `(min-width: 40rem)`            | la fenêtre mesure **au moins** 40rem de large               |
| `(max-width: 39.99rem)`         | la fenêtre mesure **au plus** 39,99rem                      |
| `(orientation: landscape)`      | la fenêtre est plus large que haute                         |
| `(prefers-reduced-motion: reduce)` | l’utilisateur a demandé à limiter les animations         |
| `(prefers-color-scheme: dark)`  | l’utilisateur a choisi un thème sombre pour son système     |
| `(hover: hover)`                | le pointeur principal peut survoler (souris)                |

On les combine avec `and`, et on sépare des alternatives par une virgule :

```css
@media (min-width: 40rem) and (orientation: landscape) {
  /* les deux conditions */
}

@media print, (min-width: 64rem) {
  /* à l’impression OU dès que la fenêtre mesure au moins 64rem */
}
```

`print` et `screen` sont des **types de média** : `@media print` permet par exemple de
masquer la navigation à l’impression.

Les navigateurs actuels acceptent aussi une syntaxe par intervalles, plus lisible :
`@media (width >= 40rem)` équivaut à `@media (min-width: 40rem)`. Tu rencontreras les
deux ; ce cours utilise `min-width`, la plus répandue dans le code existant.

## Mobile d’abord

Deux façons d’organiser une feuille responsive :

- **bureau d’abord** : on écrit la mise en page large, puis on la défait avec des
  `max-width` pour les petits écrans ;
- **mobile d’abord** (_mobile first_) : on écrit d’abord la version étroite, puis on
  **ajoute** de la complexité avec des `min-width`.

Mobile d’abord est la méthode recommandée, pour des raisons concrètes :

- la version mobile est souvent proche du **flux normal** (une colonne) : il y a peu à
  écrire, et les media queries ne font qu’**ajouter** des colonnes ;
- tu évites de défaire des règles (`float: none`, `width: auto`…), source de bugs ;
- elle oblige à décider ce qui est **essentiel** dans le contenu.

### Un exemple complet

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mobile d’abord</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div class="layout">
      <header class="layout-header">En-tête</header>
      <nav class="layout-nav">
        <ul>
          <li><a href="index.html">Accueil</a></li>
          <li><a href="recettes.html">Recettes</a></li>
        </ul>
      </nav>
      <main class="layout-main">Contenu principal</main>
      <aside class="layout-aside">À lire aussi</aside>
      <footer class="layout-footer">Pied de page</footer>
    </div>
  </body>
</html>
```

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

/* 1. Base : petits écrans, une seule colonne dans l’ordre du HTML. */
.layout {
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 4vw, 3rem);
}

.layout-nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 2. À partir de 40rem : navigation à gauche, contenu et aside à droite. */
@media (min-width: 40rem) {
  .layout {
    grid-template-columns: 12rem minmax(0, 1fr);
    grid-template-areas:
      "header header"
      "nav    main"
      "nav    aside"
      "footer footer";
  }

  .layout-header {
    grid-area: header;
  }

  .layout-nav {
    grid-area: nav;
  }

  .layout-main {
    grid-area: main;
  }

  .layout-aside {
    grid-area: aside;
  }

  .layout-footer {
    grid-area: footer;
  }

  .layout-nav ul {
    flex-direction: column;
  }
}

/* 3. À partir de 64rem : trois colonnes, largeur maximale et centrage. */
@media (min-width: 64rem) {
  .layout {
    grid-template-columns: 14rem minmax(0, 1fr) 16rem;
    grid-template-areas:
      "header header header"
      "nav    main   aside"
      "footer footer footer";
    max-width: 80rem;
    margin: 0 auto;
  }
}
```

Ce qui se passe, avec la taille de police par défaut (16 pixels, donc 40rem = 640 px et
64rem = 1024 px) :

| Largeur de fenêtre | Mise en page                                                       |
| ------------------ | ------------------------------------------------------------------ |
| 360 px             | une colonne : en-tête, navigation (liens côte à côte), contenu, aside, pied |
| 800 px             | navigation à gauche (192 px), contenu puis aside empilés à droite  |
| 1024 px            | trois colonnes : navigation 224 px, contenu, aside 256 px          |
| 1600 px            | la mise en page plafonne à 1280 px (80rem) et se centre             |

La deuxième media query ne répète que ce qui change : les colonnes et les zones. Les
`grid-area` déclarés à partir de 40rem restent valables à partir de 64rem, puisque les
deux conditions sont alors vraies.

## Choisir ses points de rupture

Un **point de rupture** (_breakpoint_) est la largeur à laquelle la mise en page change.

- **Choisis-les selon le contenu, pas selon des appareils.** Rétrécis la fenêtre
  progressivement : quand une ligne devient trop longue ou une colonne trop étroite,
  c’est là qu’il faut un point de rupture. Les tailles d’écran évoluent, ton contenu
  reste le même.
- **Peu de points de rupture.** Deux ou trois suffisent souvent, car flexbox, grid,
  `fr` et `auto-fit` gèrent l’entre-deux.
- **En `rem` ou `em` plutôt qu’en `px`.** Dans une media query, `rem` et `em` se
  réfèrent à la taille de police **initiale** du navigateur (le réglage de
  l’utilisateur), pas à celle que tu définis sur `html`. Si l’utilisateur agrandit sa
  police par défaut, la mise en page passe plus tôt en version simplifiée, ce qui évite
  des colonnes trop étroites pour un texte plus grand.

Piège à éviter quand on mélange `min-width` et `max-width` : `(max-width: 40rem)` et
`(min-width: 40rem)` sont **toutes les deux vraies** à exactement 40rem. Avec mobile
d’abord et seulement des `min-width`, ce chevauchement n’existe pas.

## Des unités relatives pour ne pas tout figer

Les media queries changent la mise en page **par paliers**. Entre deux paliers, ce sont
les unités relatives qui adaptent les tailles en continu.

| Unité         | Relative à                                  | Usage typique                                |
| ------------- | ------------------------------------------- | -------------------------------------------- |
| `%`           | la taille du parent (selon la propriété)    | largeurs d’éléments                          |
| `rem`, `em`   | la taille de police                         | textes, espacements, points de rupture       |
| `vw`, `vh`    | 1 % de la largeur ou hauteur de la fenêtre  | espacements fluides, sections plein écran    |
| `dvh`         | 1 % de la hauteur **actuelle** de la fenêtre | hauteur plein écran sur mobile              |
| `fr`          | l’espace restant d’une grille               | colonnes                                     |
| `ch`          | la largeur du caractère « 0 »               | longueur des lignes de texte                 |

Sur mobile, la barre d’adresse du navigateur apparaît et disparaît pendant le
défilement : dans les navigateurs mobiles actuels, `100vh` correspond en général à la
hauteur maximale (barre d’adresse masquée), et une section `min-height: 100vh` peut
être partiellement cachée quand la barre est visible. `100dvh` (_dynamic viewport
height_) suit la hauteur réellement visible.

### `clamp()` : une valeur fluide, mais bornée

`clamp(minimum, idéal, maximum)` renvoie la valeur idéale, sans descendre sous le
minimum ni dépasser le maximum :

```css
.layout {
  padding: clamp(1rem, 4vw, 3rem);
}
```

| Largeur de fenêtre | 4vw      | Padding calculé       |
| ------------------ | -------- | --------------------- |
| 360 px             | 14,4 px  | **16 px** (minimum)   |
| 800 px             | 32 px    | **32 px**             |
| 1400 px            | 56 px    | **48 px** (maximum)   |

Une seule ligne remplace ici deux ou trois media queries. On utilise beaucoup `clamp()`
pour les espacements et la taille des titres (voir la leçon suivante). `min()` et
`max()` existent aussi : `width: min(100%, 40rem)` signifie « 100 % du parent, mais au
plus 40rem ».

:::note[Pour aller plus loin : les container queries]
Une media query interroge la **fenêtre**. Une _container query_ interroge la taille
d’un **conteneur**, ce qui permet à un composant de s’adapter à la place qu’on lui donne
(une carte dans une colonne étroite ou large). Le conteneur se déclare avec
`container-type: inline-size;`, puis on écrit `@container (min-width: 30rem) { … }`
pour ses descendants. Les navigateurs actuels la prennent en charge ; les media queries
restent suffisantes pour tout ce cours.

:::

## Tester le responsive

- **Mode responsive de l’inspecteur** (bouton en forme de téléphone et de tablette dans
  les outils, ou **Ctrl+Maj+M** sous Windows et Linux une fois les outils ouverts) :
  choisis une largeur ou un appareil simulé. Fais glisser la
  largeur lentement de 320 à 1600 pixels et observe chaque transition.
- **Largeur de 320 pixels CSS** : les WCAG demandent que le contenu reste utilisable
  sans défilement horizontal à cette largeur (critère « Redistribution »). C’est aussi
  ce que voit un utilisateur d’ordinateur qui zoome à 400 % sur une fenêtre de 1280
  pixels.
- **Zoom à 200 %** (Ctrl et +) : le texte doit rester lisible et rien ne doit se
  chevaucher.
- **Un vrai téléphone** de temps en temps : la simulation ne reproduit pas tout
  (barre d’adresse, doigt plus gros qu’un pointeur).

Le symptôme le plus courant d’un problème est une **barre de défilement horizontale**.
Pour trouver le coupable, tape dans la console :
`[...document.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth)` ;
cela liste les éléments dont le contenu déborde.

## Pièges courants

- **Oublier la balise viewport** : tes media queries ne se déclenchent pas sur mobile.
- **Media queries placées avant les règles de base** : à spécificité égale, la règle de
  base, écrite après, l’emporte.
- **Un élément oublié dans `grid-template-areas`** : sans `grid-area` correspondant, il
  est placé automatiquement, souvent dans une ligne en trop sous le pied de page.
- **Largeurs fixes** (`width: 800px`) qui provoquent un défilement horizontal sur
  mobile. Préfère `max-width`.
- **Points de rupture calqués sur des appareils** précis, qui ne correspondent pas aux
  besoins du contenu.
- **Contenu masqué sur mobile** avec `display: none` « parce qu’il ne rentre pas » :
  l’utilisateur mobile a autant besoin de l’information. Réorganise plutôt.

## Exercices

### Exercice 1 — Lire des media queries

Pour une fenêtre de 500, 800 et 1200 pixels (police par défaut de 16 pixels), donne la
couleur du texte de `.box` et le nombre de colonnes.

```css
.box {
  display: grid;
  color: black;
}

@media (min-width: 48rem) {
  .box {
    grid-template-columns: 1fr 1fr;
    color: navy;
  }
}

@media (min-width: 30rem) {
  .box {
    color: green;
  }
}

@media (min-width: 75rem) {
  .box {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

:::solution
Conversion : 30rem = 480 px, 48rem = 768 px, 75rem = 1200 px.

- **500 px** : seule `(min-width: 30rem)` est vraie. Couleur **verte**, **une** colonne.
- **800 px** : 30rem et 48rem sont vraies. Les deux règles ont la même spécificité
  (0, 1, 0) ; la règle de `30rem` est écrite **après** : couleur **verte**, pas bleu
  marine. **Deux** colonnes.
- **1200 px** : les trois media queries sont vraies (`min-width` inclut la valeur
  exacte). Couleur **verte** pour la même raison, **trois** colonnes.

Leçon : en mobile d’abord, range les media queries par `min-width` **croissante**. Ici
le bleu marine n’apparaît jamais.

:::

### Exercice 2 — Convertir en mobile d’abord

Cette feuille est écrite « bureau d’abord ». Réécris-la en mobile d’abord, avec des
points de rupture en `rem`, sans changer le résultat visuel.

```css
.products {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.product-title {
  font-size: 24px;
}

@media (max-width: 1023px) {
  .products {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 599px) {
  .products {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .product-title {
    font-size: 20px;
  }
}
```

:::solution
```css
/* Base : moins de 600px (37.5rem). */
.products {
  display: grid;
  grid-template-columns: 1fr; /* une colonne (c’est aussi le défaut) */
  gap: 1rem; /* 16px */
}

.product-title {
  font-size: 1.25rem; /* 20px */
}

/* À partir de 600px. */
@media (min-width: 37.5rem) {
  .products {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem; /* 24px */
  }

  .product-title {
    font-size: 1.5rem; /* 24px */
  }
}

/* À partir de 1024px. */
@media (min-width: 64rem) {
  .products {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

Correspondances : `max-width: 599px` couvrait 0 à 599 px, donc la base ; à partir de
600 px (37,5 × 16), deux colonnes avec un `gap` de 24 px et des titres de 24 px ; à
partir de 1024 px, quatre colonnes. Les tailles en `rem` respectent en plus le réglage
de l’utilisateur. Le résultat est identique avec une police par défaut de 16 px.

:::

### Exercice 3 — Un bandeau fluide

Écris le CSS d’un bandeau d’accueil `.hero` qui :

- occupe au moins toute la hauteur visible de l’écran, barre d’adresse mobile comprise ;
- a un espace intérieur qui varie de 1,5rem à 4rem, idéalement 6 % de la largeur de la
  fenêtre ;
- centre son contenu, dont la largeur ne dépasse pas 40rem ;
- supprime l’animation d’apparition du titre pour les utilisateurs qui ont demandé moins
  d’animations. On suppose que le titre a déjà `animation: fade-in 1s;`.

```html
<section class="hero">
  <div class="hero-content">
    <h1>Bienvenue au jardin</h1>
    <p>Des ateliers chaque samedi.</p>
  </div>
</section>
```

:::solution
```css
.hero {
  min-height: 100dvh; /* hauteur réellement visible, barre d’adresse comprise */
  padding: clamp(1.5rem, 6vw, 4rem);
  display: grid;
  place-items: center; /* contenu centré dans les deux axes */
}

.hero-content {
  max-width: 40rem;
}

@media (prefers-reduced-motion: reduce) {
  .hero h1 {
    animation: none;
  }
}
```

`min-height` plutôt que `height` : si le texte est plus long que l’écran, le bandeau
grandit au lieu de déborder. `clamp()` donne 24 px de padding sur un petit écran (6vw à
360 px = 21,6 px, sous le minimum), 48 px à 800 px, et plafonne à 64 px à partir de
1067 px environ. La media query `prefers-reduced-motion` respecte un réglage
d’accessibilité du système.

:::

## Récapitulatif

- `<meta name="viewport" content="width=device-width, initial-scale=1">` est
  indispensable ; n’interdis jamais le zoom.
- `@media (condition) { … }` applique des règles selon la fenêtre ou les préférences
  (`prefers-reduced-motion`, `prefers-color-scheme`). Les media queries ne changent pas
  la spécificité : place-les après les règles de base.
- Mobile d’abord : une base simple pour les petits écrans, puis des `min-width`
  croissantes qui ajoutent des colonnes.
- Points de rupture choisis selon le contenu, peu nombreux, en `rem`.
- `%`, `rem`, `vw`, `dvh`, `fr`, `ch` et `clamp()` adaptent les tailles entre les
  paliers.
- Teste en faisant varier la largeur de 320 à 1600 pixels, au zoom à 200 %, et traque
  le défilement horizontal.
