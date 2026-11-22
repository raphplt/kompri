---
title: Mettre en page en deux dimensions avec grid
summary: Définir des lignes et des colonnes, placer les éléments dans une grille et choisir entre grid et flexbox.
durationMinutes: 75
sources:
  - title: MDN — Les concepts de base des grilles
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Grid_layout/Basic_concepts
  - title: W3C — CSS Grid Layout Module Level 1
    url: https://www.w3.org/TR/css-grid-1/
---

Flexbox dispose des éléments sur **un** axe : chaque ligne vit sa vie, et une carte seule
sur la dernière ligne s’étire sur toute la largeur. Quand tu veux que les éléments
s’alignent **à la fois** en lignes et en colonnes (une galerie, un tableau de bord, la
structure générale d’une page), il te faut **grid** (_CSS Grid Layout_).

Avec grid, tu dessines d’abord une grille sur le conteneur, puis tu y places les
éléments. Comme pour flexbox, les exemples supposent `box-sizing: border-box` sur tous
les éléments.

## Créer une grille

```html
<div class="gallery">
  <div>Pain</div>
  <div>Croissant</div>
  <div>Brioche</div>
  <div>Fougasse</div>
</div>
```

```css
.gallery {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  gap: 16px;
}
```

- `display: grid` fait de `.gallery` un **conteneur de grille** ; ses enfants directs
  deviennent des **éléments de grille**.
- `grid-template-columns` définit **trois colonnes** de 200 pixels.
- `gap` met 16 pixels entre les colonnes **et** entre les lignes. `column-gap` et
  `row-gap` permettent des valeurs différentes.

Les quatre éléments se placent automatiquement, de gauche à droite puis ligne par
ligne : Pain, Croissant, Brioche sur la première ligne, Fougasse au début de la
deuxième. Tu n’as pas déclaré de lignes : le navigateur les crée selon le besoin. On
parle de grille **implicite** pour ces lignes créées automatiquement, et de grille
**explicite** pour ce que tu as déclaré.

Vocabulaire utile :

- une **piste** (_track_) est une colonne ou une ligne ;
- une **cellule** est l’intersection d’une ligne et d’une colonne ;
- les **lignes de grille** (_grid lines_) sont les traits qui délimitent les pistes,
  numérotés à partir de 1. Trois colonnes sont délimitées par quatre lignes verticales.

## L’unité `fr` : partager l’espace

Des colonnes en pixels ne s’adaptent pas à l’écran. L’unité **`fr`** (fraction)
représente une part de l’**espace restant** dans le conteneur :

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 16px;
  width: 800px;
}
```

Calcul : 800 pixels, moins la colonne fixe de 200, moins deux `gap` de 16, laisse 568
pixels. Deux fractions égales : **284** pixels chacune. Les colonnes commencent donc à
0, 216 et 516 pixels.

`2fr 1fr` donne deux tiers et un tiers de l’espace restant. Contrairement aux
pourcentages, `fr` tient compte des `gap` : `repeat(3, 33.33%)` plus des `gap`
déborderait, `repeat(3, 1fr)` jamais.

### `repeat()` et `minmax()`

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* équivaut à 1fr 1fr 1fr */
  gap: 16px;
}

.sidebar-layout {
  display: grid;
  grid-template-columns: minmax(150px, 250px) 1fr; /* entre 150 et 250 px, puis le reste */
}
```

`minmax(min, max)` donne à une piste une taille comprise entre deux bornes.

## La grille qui s’adapte toute seule

Une combinaison très utilisée crée autant de colonnes que la place le permet, **sans
media query** :

```css
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

Lecture : « autant de colonnes que possible (`auto-fit`), chacune d’au moins 200 pixels,
puis partage de l’espace restant (`1fr`) ». Dans un conteneur de 800 pixels, trois
colonnes de 200 pixels et deux `gap` tiennent (632 pixels), pas quatre (848) : il y a
**trois colonnes de 256 pixels**. Dans 400 pixels, une seule colonne.

`auto-fill` ressemble à `auto-fit`, avec une différence visible quand il y a **peu
d’éléments** :

- `auto-fill` garde les colonnes vides : deux produits dans 800 pixels occupent deux
  colonnes de 256 pixels, la troisième reste vide ;
- `auto-fit` replie les colonnes vides : les deux produits s’étirent sur **392 pixels**
  chacun.

Contrairement à flexbox avec `flex-wrap`, les éléments de la dernière ligne gardent la
largeur des colonnes : la grille reste alignée.

## Placer les éléments

### Par numéro de ligne

Un élément peut occuper plusieurs pistes. On indique la ligne de départ et la ligne de
fin, séparées par `/` :

```html
<div class="board">
  <div>1</div>
  <div class="wide">2</div>
  <div>3</div>
  <div class="full">4</div>
  <div class="placed">5</div>
</div>
```

```css
.board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 50px; /* hauteur des lignes créées automatiquement */
  gap: 10px;
  width: 430px;
}

.wide {
  grid-column: span 2; /* s’étend sur deux colonnes */
}

.full {
  grid-column: 1 / -1; /* de la première à la dernière ligne verticale */
}

.placed {
  grid-column: 2 / 4; /* de la ligne 2 à la ligne 4 : colonnes 2 et 3 */
  grid-row: 3;
}
```

Avec 430 pixels et trois `gap` de 10, chaque colonne mesure 100 pixels. Résultat :

- ligne 1 : « 1 » dans la colonne 1, « 2 » sur les colonnes 2 et 3 (210 pixels, gap
  compris), « 3 » dans la colonne 4 ;
- ligne 2 : « 4 » sur toute la largeur (430 pixels) ;
- ligne 3 : « 5 » dans les colonnes 2 et 3.

Les numéros négatifs comptent depuis la fin : `-1` est la dernière ligne de la grille
**explicite**. `1 / -1` est l’idiome pour « toute la largeur ». `grid-auto-rows` fixe la
taille des lignes implicites.

### Par zones nommées

Pour la structure d’une page, `grid-template-areas` permet de **dessiner** la mise en
page avec des noms :

```html
<body class="page">
  <header class="page-header">En-tête</header>
  <nav class="page-nav">Navigation</nav>
  <main class="page-main">Contenu</main>
  <footer class="page-footer">Pied de page</footer>
</body>
```

```css
.page {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "nav    main"
    "footer footer";
  gap: 16px;
  min-height: 100vh;
  margin: 0;
}

.page-header {
  grid-area: header;
}

.page-nav {
  grid-area: nav;
}

.page-main {
  grid-area: main;
}

.page-footer {
  grid-area: footer;
}
```

Chaque chaîne est une ligne de la grille ; chaque mot, une cellule. Répéter un nom
étend la zone sur plusieurs cellules. Les zones doivent être **rectangulaires**, et un
point (`.`) désigne une cellule vide. Avec `grid-template-rows: auto 1fr auto` et
`min-height: 100vh`, l’en-tête et le pied prennent la hauteur de leur contenu, et la
ligne du milieu s’étire : le pied de page reste en bas de l’écran même si le contenu est
court.

## Aligner dans la grille

Les propriétés d’alignement ressemblent à celles de flexbox :

| Propriété                     | Agit sur                                                  | Comportement par défaut           |
| ----------------------------- | --------------------------------------------------------- | --------------------------------- |
| `justify-items`               | chaque élément dans sa cellule, horizontalement           | élément étiré                     |
| `align-items`                 | chaque élément dans sa cellule, verticalement             | élément étiré                     |
| `place-items`                 | raccourci : `align-items` puis `justify-items`            |                                   |
| `justify-self` / `align-self` | un seul élément                                           |                                   |
| `justify-content`             | les pistes dans le conteneur, quand elles sont plus petites | pistes fixes placées au début   |

Par défaut, un élément de grille est **étiré** pour remplir sa cellule. Le centrage
parfait, en grid :

```css
.hero {
  display: grid;
  place-items: center;
  min-height: 300px;
}
```

## Grid ou flexbox ?

Les deux sont complémentaires, et une même page les utilise souvent ensemble.

| Situation                                                    | Choix conseillé |
| ------------------------------------------------------------ | --------------- |
| Des éléments en ligne dont la taille dépend du contenu (menu, étiquettes, boutons) | flexbox |
| Aligner ou pousser des éléments sur un seul axe              | flexbox         |
| Des éléments alignés en lignes **et** en colonnes (galerie, cartes) | grid      |
| La structure générale d’une page (en-tête, côté, contenu, pied) | grid         |
| Une carte en colonne avec un bouton poussé en bas            | flexbox         |

Une formule souvent citée : flexbox part **du contenu** (les éléments décident de leur
taille), grid part **du conteneur** (la grille décide des pistes). C’est une aide à la
décision, pas une règle de la norme.

## Pièges courants

### La colonne `1fr` qui déborde

```html
<div class="two-cols">
  <div>https://exemple.com/documents/rapport_annuel_version_finale.pdf</div>
  <div>Taille : 2 Mo</div>
</div>
```

```css
.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 300px;
}
```

On attend deux colonnes de 150 pixels. En réalité, la première mesure environ 430
pixels et la grille déborde. `1fr` signifie en fait `minmax(auto, 1fr)` : la colonne ne
descend pas sous la taille minimale de son contenu, ici l’adresse impossible à couper.
Correction :

```css
.two-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  width: 300px;
}

.two-cols > * {
  overflow-wrap: anywhere; /* l’adresse peut se couper pour tenir dans 150px */
}
```

C’est le même mécanisme que `min-width: auto` en flexbox, vu dans la leçon précédente.

### Autres pièges

- **`display: grid` sans `grid-template-columns`** : une seule colonne, les éléments
  s’empilent. Ce n’est pas une erreur, mais rarement ce qu’on veut.
- **Pourcentages et `gap`** : `repeat(4, 25%)` plus des `gap` déborde ; utilise `fr`.
- **Zones non rectangulaires** dans `grid-template-areas` (en forme de L) : toute la
  déclaration est invalide et ignorée.
- **Ordre visuel différent de l’ordre du HTML** : comme avec flexbox, placer un élément
  ailleurs ne change ni l’ordre de lecture ni l’ordre de tabulation. Garde un HTML dans
  l’ordre logique.
- **La grille agit sur les enfants directs seulement** : un élément dans un `<div>`
  intermédiaire n’est pas placé dans la grille.

## Exercices

### Exercice 1 — Calculer des pistes

Un conteneur de 1000 pixels a `gap: 20px`. Donne la largeur de chaque colonne pour :

1. `grid-template-columns: 1fr 2fr 1fr;`
2. `grid-template-columns: 300px repeat(2, 1fr);`
3. `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));` avec 10 éléments.

:::solution
1. Deux `gap` : 1000 − 40 = 960 ; total 4 fractions, une fraction = 240.
   Colonnes : **240, 480, 240**.
2. 1000 − 300 − 40 = 660 pour deux fractions : **300, 330, 330**.
3. Combien de colonnes de 220 tiennent ? n colonnes demandent n × 220 + (n − 1) × 20.
   Pour 4 : 880 + 60 = 940, ça tient. Pour 5 : 1100 + 80 = 1180, non. Donc
   **4 colonnes** ; espace pour les colonnes : 1000 − 60 = 940, soit **235** chacune.
   Les 10 éléments occupent 3 lignes (4 + 4 + 2), et les deux derniers gardent 235 px.
:::

### Exercice 2 — Une page complète

Écris le CSS d’une page avec `grid-template-areas` :

- en-tête sur toute la largeur ;
- une colonne d’articles et une barre latérale de 280 pixels à droite ;
- un pied de page sur toute la largeur, toujours en bas de l’écran si le contenu est
  court ;
- 24 pixels entre les zones.

```html
<body class="layout">
  <header class="layout-header">…</header>
  <main class="layout-main">…</main>
  <aside class="layout-aside">…</aside>
  <footer class="layout-footer">…</footer>
</body>
```

:::solution
```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px; /* minmax(0, …) : pas de débordement */
  grid-template-rows: auto 1fr auto; /* la ligne centrale absorbe la hauteur libre */
  grid-template-areas:
    "header header"
    "main   aside"
    "footer footer";
  gap: 24px;
  min-height: 100vh; /* au moins la hauteur de la fenêtre */
  margin: 0;
}

.layout-header {
  grid-area: header;
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
```

L’ordre du HTML (contenu principal avant la barre latérale) reste logique pour la
lecture et le clavier ; seule la grille place l’aside à droite. Sur mobile, deux
colonnes seront trop étroites : la leçon suivante montre comment passer à une seule
colonne avec une media query.
:::

### Exercice 3 — Corriger une galerie

Cette galerie devait afficher des vignettes en colonnes égales qui s’adaptent à
l’écran, mais une seule colonne apparaît, et quand on ajoute une largeur, la dernière
ligne se déforme. Explique et corrige.

```css
.gallery {
  display: grid;
  gap: 2%;
}

.gallery img {
  width: 25%;
}
```

:::solution
Problèmes :

- sans `grid-template-columns`, la grille n’a qu’**une colonne** ; `width: 25%` réduit
  l’image au quart de cette colonne, mais ne crée pas de colonnes ;
- la largeur des colonnes doit être définie **sur le conteneur**, pas sur les
  éléments ;
- un `gap` en pourcentage fonctionne, mais une valeur fixe est plus prévisible.

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.gallery img {
  width: 100%; /* l’image remplit sa cellule */
  height: auto; /* proportions conservées */
}
```

`auto-fill` garde des colonnes de taille égale même si la dernière ligne n’est pas
complète. `auto-fit` serait préférable si tu voulais que peu d’images s’étirent sur
toute la largeur. Les questions de taille d’image sont approfondies dans la dernière
leçon.
:::

## Récapitulatif

- `display: grid` sur le parent ; `grid-template-columns` (et `-rows`) définit les
  pistes ; `gap` espace lignes et colonnes ; les lignes non déclarées sont implicites.
- `fr` partage l’espace restant, `gap` déduit ; `repeat()` et `minmax()` évitent les
  répétitions et bornent les tailles.
- `repeat(auto-fit, minmax(200px, 1fr))` crée une grille adaptative sans media query ;
  `auto-fill` garde les colonnes vides.
- On place un élément par lignes (`grid-column: 1 / -1`, `span 2`) ou par zones nommées
  (`grid-template-areas` + `grid-area`).
- Les éléments sont étirés par défaut ; `place-items: center` centre dans la cellule.
- `1fr` vaut `minmax(auto, 1fr)` : `minmax(0, 1fr)` évite le débordement d’un contenu
  long. L’ordre visuel ne change pas l’ordre de lecture.
- Flexbox pour un axe et des tailles venues du contenu ; grid pour deux dimensions et la
  structure de page.
