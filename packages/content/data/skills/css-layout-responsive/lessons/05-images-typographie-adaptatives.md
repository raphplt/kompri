---
title: Images et typographie adaptatives
summary: Empêcher les médias de déborder, servir la bonne image à chaque écran et rendre la typographie fluide sans casser le zoom.
durationMinutes: 70
sources:
  - title: MDN — Utiliser les images adaptatives en HTML
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Guides/Responsive_images
  - title: MDN — Élément picture
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/picture
  - title: MDN — object-fit
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/object-fit
  - title: MDN — aspect-ratio
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/aspect-ratio
---

Ta grille passe parfaitement d’une à trois colonnes… jusqu’à ce qu’une photo de 1200
pixels de large fasse exploser la colonne mobile, ou qu’un titre de 48 pixels se coupe
au milieu d’un mot sur un téléphone. Les images et le texte ont des tailles
**intrinsèques** : il faut leur apprendre à s’adapter, comme le reste de la mise en
page.

Cette leçon traite trois sujets : empêcher les médias de déborder, envoyer une image de
taille adaptée à chaque écran, et rendre la typographie fluide sans nuire à
l’accessibilité. Les exemples supposent toujours `box-sizing: border-box` sur tous les
éléments.

## Des images qui ne débordent jamais

### La règle de base

```html
<div class="column">
  <img src="photo.jpg" width="1200" height="800" alt="Les parcelles au printemps">
</div>
```

```css
.column {
  width: 300px;
}
```

Sans CSS, l’image s’affiche à 1200 pixels de large et déborde largement de sa colonne.
La règle à placer au début de toutes tes feuilles :

```css
img,
video {
  max-width: 100%;
  height: auto;
}
```

- `max-width: 100%` : l’image ne dépasse jamais la largeur de son conteneur. Elle peut
  être plus petite (une icône de 32 pixels reste à 32 pixels), contrairement à
  `width: 100%` qui l’agrandirait.
- `height: auto` : la hauteur suit les proportions. **Ne l’oublie pas.** Avec les
  attributs `width` et `height` dans le HTML, le navigateur applique une hauteur de 800
  pixels : avec seulement `max-width`, l’image mesure 300 × 800 pixels et apparaît
  écrasée. Avec `height: auto`, elle mesure 300 × 200.

### Garder les attributs `width` et `height`

Tu pourrais penser que, puisque CSS gère la taille, les attributs `width` et `height`
sont inutiles. C’est l’inverse : ils indiquent au navigateur les **proportions** de
l’image **avant** qu’elle soit téléchargée. Combinés avec `height: auto`, ils lui
permettent de réserver la bonne hauteur dès le départ. Sans eux, la zone vaut 0 pixel de
haut, puis le texte est brutalement repoussé vers le bas quand l’image arrive : c’est un
**décalage de mise en page**, désagréable et source de clics ratés.

Tu peux le constater : une image dont le fichier est introuvable, avec
`width="1200" height="800"` et la règle de base, occupe quand même un rectangle aux
bonnes proportions (360 × 240 pixels dans une fenêtre de 360 pixels). L’inspecteur
affiche pour elle `aspect-ratio: auto 1200 / 800`, déduit des attributs.

### L’espace fantôme sous les images

Une image est par défaut un élément **en ligne** : elle est posée sur la ligne de base
du texte, comme une lettre, et le navigateur réserve sous elle la place des jambages
(le bas du « p » ou du « g »). Résultat : un conteneur de 300 × 200 pixels autour d’une
image de 300 × 200 pixels mesure en réalité quelques pixels de plus en hauteur (204 dans
Chromium, avec la police par défaut). La correction :

```css
img {
  display: block;
}
```

À n’utiliser que pour les images qui sont seules dans leur conteneur, pas pour une
icône placée au milieu d’une phrase.

## Recadrer avec `aspect-ratio` et `object-fit`

Dans une grille de cartes, les photos ont souvent des proportions différentes : une
carré, une en paysage, une en portrait. Pour des cartes alignées, on impose un format et
on **recadre** :

```html
<article class="card">
  <img src="tomates.jpg" width="600" height="600" alt="Plants de tomates">
  <h2>Tomates anciennes</h2>
</article>
```

```css
.card img {
  display: block;
  width: 100%;
  height: auto; /* indispensable : sinon l’attribut height="600" l’emporte */
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
```

- `aspect-ratio: 16 / 9` impose des proportions : dans une carte de 240 pixels,
  l’image mesure 240 × 135. Il ne s’applique que si l’une des deux dimensions est
  automatique : sans `height: auto`, la hauteur de 600 pixels issue de l’attribut
  gagnerait.
- `object-fit` décide comment l’image remplit cette boîte :

| Valeur    | Effet                                                                 |
| --------- | --------------------------------------------------------------------- |
| `fill`    | valeur initiale : l’image est étirée, donc déformée                   |
| `cover`   | l’image couvre toute la boîte, en gardant ses proportions ; l’excédent est coupé |
| `contain` | l’image tient entière dans la boîte ; il peut rester des bandes vides |

`object-position` choisit la partie conservée avec `cover` (par défaut le centre :
`object-position: top` garde le haut, utile pour un portrait).

Un avatar rond est un cas classique :

```css
.avatar {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 50%; /* arrondit les coins jusqu’à former un cercle */
}
```

## Envoyer la bonne image à chaque écran

`max-width: 100%` règle l’affichage, pas le **poids** : un téléphone qui affiche une
photo sur 360 pixels télécharge quand même le fichier de 1600 pixels. Le HTML propose
deux outils pour que le navigateur choisisse un fichier adapté.

### `srcset` et `sizes` : la même image en plusieurs tailles

```html
<img
  src="jardin-800.jpg"
  srcset="jardin-400.jpg 400w, jardin-800.jpg 800w, jardin-1200.jpg 1200w, jardin-1600.jpg 1600w"
  sizes="(min-width: 64rem) 50vw, 100vw"
  width="1600"
  height="1067"
  alt="Vue d’ensemble du jardin partagé">
```

- `srcset` liste les fichiers disponibles et leur **largeur réelle** en pixels, avec
  l’unité `w`.
- `sizes` dit au navigateur quelle largeur l’image **occupera à l’écran** : la moitié
  de la fenêtre à partir de 64rem, toute la fenêtre sinon. Le navigateur ne connaît pas
  encore ton CSS quand il commence à télécharger les images : c’est pour cela qu’il faut
  le lui dire.
- `src` reste la valeur de secours.

Le navigateur combine ces informations avec la **densité de l’écran**. Choix observés
dans Chromium :

| Fenêtre  | Densité | Largeur affichée | Fichier choisi    |
| -------- | ------- | ---------------- | ----------------- |
| 360 px   | 1       | 360 px           | `jardin-400.jpg`  |
| 360 px   | 2       | 360 px (720 pixels physiques) | `jardin-800.jpg`  |
| 360 px   | 3       | 360 px (1080 pixels physiques) | `jardin-1200.jpg` |
| 1280 px  | 1       | 640 px (50vw)    | `jardin-800.jpg`  |
| 1280 px  | 2       | 640 px (1280 pixels physiques) | `jardin-1600.jpg` |

La norme laisse le navigateur libre de son choix final (il peut tenir compte du cache
ou d’une connexion lente) : `srcset` est une **proposition**, pas un ordre.

### `<picture>` : changer de cadrage ou de format

Quand l’image doit **changer de contenu** selon l’écran (un cadrage serré sur mobile,
large sur ordinateur), ou quand tu proposes un format plus léger que tous les
navigateurs ne lisent pas, utilise `<picture>` :

```html
<picture>
  <source media="(min-width: 48rem)" srcset="marche-large.jpg">
  <img src="marche-serre.jpg" width="800" height="800" alt="Étal de légumes au marché">
</picture>
```

```html
<picture>
  <source type="image/avif" srcset="marche.avif">
  <source type="image/webp" srcset="marche.webp">
  <img src="marche.jpg" width="1200" height="800" alt="Étal de légumes au marché">
</picture>
```

Le navigateur prend la **première** `<source>` qui convient (condition `media` vraie ou
format `type` pris en charge), sinon l’`<img>`. L’`<img>` est **obligatoire** : c’est
elle qui est affichée, qui porte `alt`, et que tu mets en forme en CSS.

### Charger plus tard ce qui est loin

```html
<img src="galerie-12.jpg" width="800" height="600" alt="…" loading="lazy">
```

`loading="lazy"` diffère le téléchargement des images éloignées de la zone visible. Ne
l’utilise **pas** pour l’image principale en haut de la page : elle doit arriver le
plus vite possible.

## Les autres contenus qui débordent

- **Vidéos intégrées (`<iframe>`)** : `width: 100%; height: auto; aspect-ratio: 16 / 9;`
  donne une vidéo qui suit la largeur de la colonne en gardant ses proportions.
- **Tableaux larges** : un tableau de données ne se replie pas. Enveloppe-le dans un
  conteneur qui défile horizontalement, plutôt que de laisser toute la page défiler :

```css
.table-wrap {
  overflow-x: auto;
}
```

- **Longs mots et adresses** : `overflow-wrap: anywhere;` (ou `break-word`) sur le texte
  qui peut contenir des adresses ou des identifiants sans espace.

## Une typographie fluide

### Le problème des tailles fixes

Un titre à `3rem` (48 pixels) est parfait sur ordinateur, mais un mot long y occupe
toute la largeur d’un téléphone. On peut changer la taille par media query :

```css
h1 {
  font-size: 2rem;
}

@media (min-width: 48rem) {
  h1 {
    font-size: 3rem;
  }
}
```

C’est simple et robuste, mais la taille **saute** d’un coup à 768 pixels.

### `clamp()` pour une taille continue

```css
h1 {
  font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem);
  line-height: 1.15;
}
```

Lecture : « idéalement 1,2rem plus 2,5 % de la largeur de la fenêtre, jamais moins de
1,75rem ni plus de 3rem ». Valeurs mesurées dans Chromium avec la police par défaut :

| Fenêtre  | Calcul               | Taille   |
| -------- | -------------------- | -------- |
| 360 px   | 19,2 + 9 = 28,2      | 28.2px   |
| 800 px   | 19,2 + 20 = 39,2     | 39.2px   |
| 1280 px  | 19,2 + 32 = 51,2     | 48px (maximum) |

### Ne jamais écrire une taille de texte en `vw` seul

```css
h1 {
  font-size: 5vw; /* à éviter */
}
```

Quand l’utilisateur zoome, la fenêtre mesure moins de pixels CSS : une taille en `vw`
**ne grandit pas** avec le zoom. Elle ignore aussi le réglage de taille de police du
navigateur. C’est un problème d’accessibilité : les WCAG demandent qu’un texte puisse
être agrandi jusqu’à 200 % sans perte de contenu (critère « Redimensionnement du
texte »). En gardant une part en `rem` dans le calcul (`1.2rem + 2.5vw`) et des bornes
en `rem`, le texte réagit au réglage de police et, au moins en partie, au zoom.
**Teste toujours** ta typographie fluide avec un zoom à 200 %.

### Les autres réglages typographiques adaptatifs

```css
body {
  font-size: 1rem; /* le réglage de l’utilisateur */
  line-height: 1.6;
}

h1,
h2,
h3 {
  line-height: 1.2; /* plus serré pour les grands caractères */
  overflow-wrap: break-word; /* un mot trop long passe à la ligne */
}

.prose {
  max-width: 65ch; /* longueur de ligne confortable sur grand écran */
  margin-inline: auto; /* centrage horizontal : marges gauche et droite automatiques */
}
```

- Garde le texte courant à `1rem` au minimum : sur mobile, une taille plus petite fatigue
  la lecture, et l’utilisateur a déjà choisi sa taille.
- `max-width` en `ch` limite la longueur des lignes sur grand écran ; sur mobile, la
  largeur de l’écran est de toute façon inférieure.
- `margin-inline` est le raccourci des marges de début et de fin de ligne (gauche et
  droite en français) : `margin-inline: auto` équivaut ici à `margin-left: auto;
  margin-right: auto;`.

## Pièges courants

- **`max-width: 100%` sans `height: auto`** : image déformée quand les attributs
  `width` et `height` sont présents.
- **Supprimer les attributs `width` et `height`** : décalage de mise en page au
  chargement.
- **`aspect-ratio` sans effet** : les deux dimensions sont fixées (par CSS ou par
  l’attribut `height`) ; l’une doit être `auto`.
- **`object-fit` sans boîte imposée** : sans hauteur ou proportions fixées, l’image
  garde ses proportions et il n’y a rien à recadrer.
- **`srcset` sans `sizes`** avec des descripteurs `w` : le navigateur suppose `100vw`
  et télécharge souvent une image trop grande pour une colonne étroite.
- **`<picture>` sans `<img>`** : rien ne s’affiche.
- **`loading="lazy"` sur l’image principale** : elle arrive plus tard que nécessaire.
- **Titres en `vw` seul** : ils ignorent le zoom et le réglage de police.

## Exercices

### Exercice 1 — Corriger une galerie déformée

Sur mobile, les photos de cette galerie sont écrasées verticalement, un espace bizarre
apparaît sous chacune, et la page défile horizontalement à cause du tableau des
horaires. Corrige le CSS.

```html
<div class="gallery">
  <figure>
    <img src="serre.jpg" width="1200" height="800" alt="La serre">
    <figcaption>La serre</figcaption>
  </figure>
  <figure>
    <img src="ruches.jpg" width="800" height="1200" alt="Les ruches">
    <figcaption>Les ruches</figcaption>
  </figure>
</div>
<table class="hours">
  …
</table>
```

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.gallery img {
  max-width: 100%;
}

.hours {
  width: 700px;
}
```

Les photos doivent toutes avoir le même format paysage 4/3, recadrées sans déformation.

:::solution
```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.gallery figure {
  margin: 0; /* <figure> a des marges par défaut dans le navigateur */
}

.gallery img {
  display: block; /* supprime l’espace de la ligne de base */
  width: 100%; /* remplit la cellule, même si l’image est petite */
  height: auto; /* sinon height="800" ou "1200" déforme l’image */
  aspect-ratio: 4 / 3; /* même format pour toutes */
  object-fit: cover; /* recadre au lieu de déformer */
}

.hours-wrap {
  overflow-x: auto; /* seul le tableau défile, pas la page */
}
```

Côté HTML, on enveloppe le tableau : `<div class="hours-wrap"><table class="hours">…</table></div>`,
et on peut retirer `width: 700px` si le tableau tient naturellement. Les trois défauts
avaient trois causes : `height` issue de l’attribut, image en ligne posée sur la ligne
de base, largeur fixe d’un élément qui ne se replie pas.
:::

### Exercice 2 — Choisir `srcset` ou `picture`

Pour chaque situation, indique s’il faut `srcset` + `sizes` ou `<picture>`, et écris le
HTML.

1. Une photo de bannière, toujours la même, qui occupe toute la largeur de la fenêtre.
   Tu disposes de `banner-640.jpg`, `banner-1280.jpg` et `banner-1920.jpg`.
2. Un portrait : en entier sur ordinateur (`portrait-full.jpg`), recadré sur le visage
   en dessous de 40rem (`portrait-face.jpg`).
3. Une photo disponible en WebP (`plan.webp`) et en JPEG (`plan.jpg`).

:::solution
1. Même image en plusieurs tailles : **`srcset` + `sizes`**.

```html
<img
  src="banner-1280.jpg"
  srcset="banner-640.jpg 640w, banner-1280.jpg 1280w, banner-1920.jpg 1920w"
  sizes="100vw"
  width="1920"
  height="640"
  alt="Le jardin au lever du soleil">
```

2. Changement de cadrage selon l’écran : **`<picture>`** avec `media`. Mobile
   d’abord : l’`<img>` porte la version mobile, la `<source>` la version large.

```html
<picture>
  <source media="(min-width: 40rem)" srcset="portrait-full.jpg">
  <img src="portrait-face.jpg" width="600" height="600" alt="Portrait de la présidente de l’association">
</picture>
```

3. Choix du format : **`<picture>`** avec `type`.

```html
<picture>
  <source type="image/webp" srcset="plan.webp">
  <img src="plan.jpg" width="1000" height="700" alt="Plan des parcelles">
</picture>
```

Les dimensions des attributs `width` et `height` sont celles du fichier de référence ;
ce sont surtout leurs **proportions** qui comptent. L’`alt` décrit l’image, pas le
fichier.
:::

### Exercice 3 — Un titre fluide et accessible

Écris une règle pour les `<h1>` dont la taille vaut 2rem au minimum, 3,5rem au maximum,
et grandit avec la fenêtre entre les deux, en gardant une part en `rem`. Calcule la
taille obtenue dans une fenêtre de 360 et de 1200 pixels (police par défaut). Explique
pourquoi `font-size: 6vw` serait une mauvaise idée.

:::solution
```css
h1 {
  font-size: clamp(2rem, 1.25rem + 3vw, 3.5rem);
  line-height: 1.15;
  overflow-wrap: break-word;
}
```

- 360 px : 1,25 × 16 + 0,03 × 360 = 20 + 10,8 = 30,8 px, sous le minimum de 32 px :
  **32 px**.
- 1200 px : 20 + 36 = 56 px, exactement le maximum (3,5rem = 56 px) : **56 px**.

D’autres coefficients conviennent, à condition de vérifier les tailles obtenues.
`font-size: 6vw` donnerait 21,6 px sur un téléphone de 360 px (plus petit que le texte
voulu pour un titre) et 115 px sur un écran de 1920 px ; surtout, une taille en `vw`
seul ne réagit ni au réglage de police de l’utilisateur ni au zoom, ce qui contrevient
au critère WCAG de redimensionnement du texte.
:::

## Récapitulatif

- `img, video { max-width: 100%; height: auto; }` en début de feuille ; garde les
  attributs `width` et `height` pour réserver la place et éviter les décalages.
- `display: block` supprime l’espace de la ligne de base sous une image seule.
- `aspect-ratio` impose un format (une dimension doit rester `auto`), `object-fit:
  cover` recadre sans déformer.
- `srcset` + `sizes` : la même image en plusieurs tailles, le navigateur choisit selon
  la largeur affichée et la densité. `<picture>` : changer de cadrage (`media`) ou de
  format (`type`), toujours avec une `<img>`.
- `loading="lazy"` pour les images éloignées, jamais pour l’image principale.
- Typographie fluide : `clamp(min, rem + vw, max)`, jamais de `vw` seul ; interligne
  plus serré pour les titres, `max-width` en `ch` pour le texte ; teste au zoom 200 %.
