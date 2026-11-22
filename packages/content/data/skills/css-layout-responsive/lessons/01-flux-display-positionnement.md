---
title: Le flux normal, display et le positionnement
summary: Comprendre comment le navigateur place les boîtes par défaut, changer leur type d’affichage et les sortir du flux avec position.
durationMinutes: 60
sources:
  - title: MDN — Disposition du flux CSS
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Display/Flow_layout
  - title: MDN — position
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/position
  - title: MDN — Le contexte d’empilement
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Positioned_layout/Stacking_context
---

Avant de construire des mises en page avec flexbox et grid, il faut savoir ce que fait
le navigateur **quand tu ne lui demandes rien**. Ce comportement par défaut s’appelle le
**flux normal**. La plupart des bugs de mise en page viennent d’une mauvaise
compréhension de ce flux, ou d’une sortie du flux (avec `position`) dont on n’a pas
mesuré les conséquences.

Tu as vu dans la compétence précédente le modèle de boîte et la différence entre
éléments de bloc et éléments en ligne. Cette leçon part de là.

## Le flux normal

Sans CSS de mise en page, le navigateur place les boîtes ainsi (pour une langue écrite de
gauche à droite et de haut en bas, comme le français) :

- les **boîtes de bloc** s’empilent **verticalement**, l’une sous l’autre, chacune
  occupant toute la largeur disponible ;
- les **boîtes en ligne** se placent **horizontalement** dans des lignes de texte, et
  passent à la ligne suivante quand la place manque ;
- les marges verticales entre blocs fusionnent.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Flux normal</title>
    <style>
      body {
        margin: 0;
      }

      .box {
        width: 100px;
        height: 50px;
        background-color: lightblue;
      }
    </style>
  </head>
  <body>
    <div class="box">1</div>
    <div class="box">2</div>
    <div class="box">3</div>
    <p>Un paragraphe avec <a href="#">un lien</a> et <strong>du gras</strong>.</p>
  </body>
</html>
```

Les trois boîtes sont empilées : la première commence à 0 pixel du haut, la deuxième à
50, la troisième à 100. Même si elles ne mesurent que 100 pixels de large, aucune ne
vient se placer à côté d’une autre : un bloc commence toujours sur une nouvelle ligne.
Dans le paragraphe, le lien et le texte en gras restent dans le fil du texte.

Le flux normal est **déjà responsive** : un texte se replie automatiquement dans une
fenêtre étroite, et les blocs prennent la largeur disponible. Beaucoup de problèmes de
mise en page viennent de largeurs ou de hauteurs fixées qui cassent ce comportement.

## La propriété `display`

`display` choisit le **type de boîte** d’un élément. Chaque élément HTML a une valeur
par défaut, fournie par la feuille du navigateur : `block` pour `<div>`, `<p>`,
`<section>` ; `inline` pour `<span>`, `<a>`, `<strong>` ; `list-item` pour `<li>`.

| Valeur         | Comportement                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `block`        | nouvelle ligne, toute la largeur, `width`/`height`/marges respectées          |
| `inline`       | dans le fil du texte ; `width`, `height` et marges verticales sans effet     |
| `inline-block` | dans le fil du texte, mais `width`, `height`, padding et marges respectés   |
| `none`         | l’élément n’est pas affiché du tout et n’occupe aucune place                 |
| `flex`         | bloc dont les enfants sont disposés avec flexbox (leçon suivante)            |
| `grid`         | bloc dont les enfants sont disposés dans une grille (leçon 3)                |

Point important : `display: flex` et `display: grid` décrivent **deux choses**. Vu de
l’extérieur, l’élément se comporte comme un bloc dans le flux normal. Vu de l’intérieur,
ses **enfants directs** sont disposés selon flexbox ou grid. Les petits-enfants, eux,
restent dans le flux normal de leur propre parent.

### Changer `display` ne change pas le sens

```css
.menu a {
  display: inline-block;
  width: 120px;
  padding: 8px;
  margin: 8px;
}
```

Chaque lien reste un lien, simplement affiché comme une boîte en ligne qui respecte sa
largeur : ici 120 + 2 × 8 = 136 pixels de large chacun (en `content-box`). Choisis
toujours la balise pour son **sens**, puis son affichage avec CSS. Ne mets jamais un
`<div>` à la place d’un `<a>` parce que tu voulais un bloc : `display` sert à cela.

### Masquer un élément : trois façons, trois effets

| Déclaration          | Place occupée | Visible | Lu par un lecteur d’écran | Atteignable au clavier |
| -------------------- | ------------- | ------- | ------------------------- | ---------------------- |
| `display: none`      | non           | non     | non                       | non                    |
| `visibility: hidden` | **oui**       | non     | non                       | non                    |
| `opacity: 0`         | oui           | non     | **oui**                   | **oui**                |

`opacity: 0` est un piège : un bouton invisible reste cliquable, lisible par les
technologies d’assistance et atteignable avec Tabulation. Pour masquer complètement un
élément, c’est `display: none` (ou l’attribut HTML `hidden`).

L’attribut `hidden` fonctionne grâce à une règle de la feuille du navigateur
(`display: none`). Une règle d’auteur l’emporte sur elle : si tu écris
`.panel { display: flex; }`, un `<div class="panel" hidden>` **reste affiché**. Pour
éviter ce piège, ajoute à ta feuille `[hidden] { display: none; }` : sa spécificité
(0, 1, 0) égale celle de `.panel`, donc place-la **après** les règles de composants.

:::note[Les flottants]
Tu croiseras dans du code ancien des mises en page faites avec `float: left`.
Aujourd’hui, `float` ne sert plus qu’à son usage d’origine : laisser le texte s’écouler
autour d’une image. Pour disposer des blocs, utilise flexbox ou grid.

:::

## Le positionnement avec `position`

La propriété `position` permet de décaler un élément ou de le **sortir du flux**. Elle
s’accompagne des propriétés de décalage `top`, `right`, `bottom` et `left` (le raccourci
`inset` les regroupe).

| Valeur     | Reste dans le flux ? | Décalé par rapport à…                                         |
| ---------- | -------------------- | ------------------------------------------------------------- |
| `static`   | oui                  | rien : valeur initiale, les décalages sont ignorés            |
| `relative` | oui                  | sa propre position normale                                    |
| `absolute` | **non**              | son plus proche ancêtre positionné (non `static`)             |
| `fixed`    | **non**              | la fenêtre du navigateur (le _viewport_)                      |
| `sticky`   | oui                  | relatif, puis « collé » quand on fait défiler jusqu’au seuil  |

### `relative` : décaler sans déranger

```css
.moved {
  position: relative;
  top: 10px;
  left: 20px;
}
```

Applique cette classe à la boîte 2 de l’exemple précédent. Elle se dessine 10 pixels
plus bas et 20 pixels plus à droite, et chevauche la boîte 3. Mais la boîte 3 **ne
bouge pas** : l’emplacement d’origine de la boîte 2 reste réservé dans le flux. `top`
signifie « décaler depuis le haut », donc vers le bas.

En pratique, on utilise rarement `relative` pour décaler. Son usage principal est de
servir de **référence** à un enfant en `absolute`.

### `absolute` : placer par rapport à un ancêtre

Un badge « Nouveau » dans le coin d’une carte :

```html
<article class="card">
  <span class="badge">Nouveau</span>
  <h2>Panier de légumes</h2>
  <p>Livré chaque jeudi.</p>
</article>
```

```css
.card {
  position: relative; /* devient la référence de ses descendants absolus */
  width: 300px;
  padding: 16px;
  background-color: #eeeeee;
}

.badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: darkred;
  color: white;
  padding: 2px 8px;
}
```

Le badge est placé à 8 pixels du haut et 8 pixels de la droite **de la carte**. Il est
sorti du flux : le titre ne lui laisse aucune place et commence en haut de la carte,
comme si le badge n’existait pas. Le badge peut donc recouvrir du texte : c’est à toi de
prévoir l’espace (par exemple avec un padding).

Le bloc de référence d’un élément `absolute` est son plus proche ancêtre dont `position`
n’est pas `static`. **Sans** `position: relative` sur `.card`, il n’y en a aucun : le
badge se place par rapport au **bloc conteneur initial**, un rectangle de la taille de
la fenêtre en haut du document. Le badge se retrouve alors en haut à droite de la page,
loin de sa carte. C’est le bug de positionnement le plus fréquent.

Un élément `absolute` sans largeur fixée prend la largeur de son contenu, et non toute
la largeur disponible comme un bloc.

### `fixed` : rester visible pendant le défilement

```css
.back-to-top {
  position: fixed;
  right: 16px;
  bottom: 16px;
}
```

Ce bouton reste dans le coin inférieur droit de la fenêtre, même quand on fait défiler la
page. Le même mécanisme permet un fond de fenêtre modale qui couvre tout l’écran :

```css
.modal-backdrop {
  position: fixed;
  inset: 0; /* top, right, bottom et left à 0 : toute la fenêtre */
  background-color: rgb(0 0 0 / 50%);
}
```

Attention : un élément `fixed` peut **masquer** du contenu. Sur un petit écran, un
bandeau fixe de 100 pixels de haut mange une bonne partie de l’écran. Utilise-le avec
parcimonie.

### `sticky` : coller au bord en défilant

```css
.site-header {
  position: sticky;
  top: 0;
  background-color: white; /* sinon le contenu se voit à travers */
}
```

L’en-tête est dans le flux normal, à sa place. Quand on fait défiler et que son bord
haut atteint 0 pixel du haut de la fenêtre, il s’y **colle**, tant que son parent est
encore visible. Contrairement à `fixed`, il occupe toujours sa place dans le flux : le
contenu n’est pas masqué au départ.

`sticky` ne fonctionne pas dans deux cas fréquents :

- aucun seuil n’est donné (`top`, `bottom`…) ;
- un ancêtre crée sa propre zone de défilement (par exemple avec `overflow: hidden` ou
  `overflow: auto`) : l’élément se colle alors dans cet ancêtre, pas dans la fenêtre.

## L’ordre d’empilement et `z-index`

Quand des éléments se chevauchent, lequel est dessus ? Par défaut, les éléments
positionnés sont dessinés **au-dessus** des éléments non positionnés, et entre eux, le
dernier dans le HTML est dessus. `z-index` modifie cet ordre : une valeur plus élevée
passe devant.

Deux règles évitent des heures de débogage :

1. `z-index` n’a **aucun effet** sur un élément `static` (sauf s’il est enfant d’un
   conteneur flex ou grid). Ajoute `position: relative` si nécessaire.
2. Un élément positionné avec un `z-index` autre que `auto` crée un **contexte
   d’empilement** : ses descendants sont empilés **à l’intérieur**, et ne peuvent pas
   passer devant un élément extérieur que leur ancêtre ne dépasse pas.

```html
<header class="header">
  <nav class="menu">Menu déroulant</nav>
</header>
<div class="banner">Bannière</div>
```

```css
.header {
  position: relative;
  z-index: 1;
  height: 60px;
}

.menu {
  position: absolute;
  top: 40px;
  z-index: 9999; /* ne sort pas du contexte de .header */
  height: 150px;
  background-color: orange;
}

.banner {
  position: relative;
  z-index: 2;
}
```

Le menu déborde sur la bannière, mais il passe **dessous**, malgré son `z-index: 9999`.
Son contexte est celui de `.header` (1), qui est sous `.banner` (2). La correction n’est
pas d’augmenter encore le nombre : c’est d’agir au niveau des éléments qui se comparent
vraiment, ici donner à `.header` un `z-index` supérieur à celui de `.banner`.
D’autres propriétés créent aussi un contexte d’empilement, par exemple `opacity`
inférieure à 1.

## Pièges courants

- **Badge qui s’envole** : un `absolute` sans ancêtre positionné se place par rapport au
  haut de la page. Mets `position: relative` sur le conteneur.
- **Utiliser `position` pour la mise en page générale** : des colonnes en `absolute`
  ignorent la longueur du contenu et se chevauchent dès que le texte change. Utilise
  flexbox ou grid.
- **`z-index` sans effet** : élément `static`, ou contexte d’empilement parent trop bas.
- **`sticky` qui ne colle pas** : pas de `top`, ou un ancêtre avec `overflow`.
- **`hidden` ignoré** : une règle `display` de ta feuille l’emporte sur celle du
  navigateur.
- **`opacity: 0` pour masquer** : l’élément reste lisible et focalisable.

## Exercices

### Exercice 1 — Prédire les positions

```html
<div class="a">A</div>
<div class="b">B</div>
<div class="c">C</div>
```

```css
body {
  margin: 0;
}

div {
  height: 40px;
}

.b {
  position: relative;
  top: 20px;
}

.c {
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
}
```

Donne la position verticale (bord haut) de A, B et C, et la largeur de A. Quelle boîte
est dessinée au-dessus en cas de chevauchement ?

:::solution
- **A** : bord haut à **0**, largeur = toute la largeur de la fenêtre (bloc en flux
  normal sans `width`).
- **B** : sa place dans le flux commence à 40 px ; `relative` avec `top: 20px` la
  dessine à **60 px**. Elle chevauche la zone située de 60 à 100 px.
- **C** : `absolute`, sorti du flux. Aucun ancêtre n’est positionné : la référence est
  le bloc conteneur initial. Bord haut à **0**, collé au bord droit, 50 px de large.
  Elle chevauche donc A en haut à droite.

C est dessinée au-dessus de A : A n’est pas positionnée, C l’est. Si on retirait
`position: relative` de B, B reviendrait à 40 px ; C ne bougerait pas, puisqu’elle ne
dépend pas du flux.

:::

### Exercice 2 — Une carte avec un bouton de fermeture

Écris le CSS d’une notification :

```html
<div class="toast" role="status">
  <p>Ton message a été envoyé.</p>
  <button class="toast-close" type="button" aria-label="Fermer">×</button>
</div>
```

- la notification est fixée en bas à gauche de la fenêtre, à 16 pixels des bords, avec
  une largeur maximale de 320 pixels ;
- le bouton de fermeture est dans le coin supérieur droit de la notification ;
- le texte ne passe jamais sous le bouton ;
- la notification passe au-dessus du reste de la page.

:::solution
```css
.toast {
  position: fixed; /* reste visible pendant le défilement */
  left: 16px;
  bottom: 16px;
  z-index: 10; /* positionné, donc z-index s’applique */
  max-width: 320px;
  padding: 12px 48px 12px 16px; /* 48px à droite : place réservée au bouton */
  background-color: #1f2937;
  color: white;
}

.toast p {
  margin: 0;
}

.toast-close {
  position: absolute; /* référence : .toast, déjà positionnée (fixed) */
  top: 8px;
  right: 8px;
}
```

Un élément `fixed` est positionné : il sert lui-même de référence au bouton absolu, pas
besoin d’ajouter `relative`. Les 320 px de `max-width` incluent le padding si tu
appliques la réinitialisation `box-sizing: border-box` vue dans la compétence
précédente ; sinon, la notification peut atteindre 320 + 48 + 16 = 384 px. Le padding droit de 48 px empêche le texte de passer sous
le bouton, qui est sorti du flux. Le `z-index` n’est efficace que parce que `.toast`
est positionnée ; une valeur modeste suffit tant qu’aucun autre contexte ne la
recouvre.

:::

### Exercice 3 — Diagnostiquer un menu caché

Un menu déroulant `position: absolute; z-index: 1000;` placé dans un en-tête
`position: relative; z-index: 1;` apparaît sous un carrousel déclaré plus bas dans le
HTML avec `position: relative; z-index: 5;`. Un collègue propose de passer le menu à
`z-index: 99999`. Explique pourquoi cela ne marchera pas et propose une correction.

:::solution
L’en-tête crée un contexte d’empilement (positionné avec `z-index: 1`). Le menu est
empilé **à l’intérieur** de ce contexte : son `z-index`, quel qu’il soit, ne le compare
qu’aux autres éléments de l’en-tête. Face au carrousel, c’est l’en-tête entier (1) qui
est comparé au carrousel (5), et il perd.

Corrections possibles :

- donner à l’en-tête un `z-index` supérieur à celui du carrousel, par exemple 10 ;
- ou retirer le `z-index` de l’en-tête (il ne crée alors plus de contexte
  d’empilement), si rien d’autre n’en dépend.

Vérifie le résultat dans l’inspecteur en survolant les éléments, puis au clavier.

:::

## Récapitulatif

- Dans le flux normal, les blocs s’empilent verticalement et occupent toute la largeur ;
  les éléments en ligne s’écoulent dans les lignes de texte.
- `display` choisit le type de boîte : `block`, `inline`, `inline-block`, `none`, et
  `flex` ou `grid` qui disposent les **enfants directs**. Il ne change pas le sens de
  l’élément.
- `display: none` retire l’élément, `visibility: hidden` le cache en gardant sa place,
  `opacity: 0` le laisse lisible et focalisable. L’attribut `hidden` peut être annulé
  par une règle `display`.
- `relative` décale sans libérer la place ; `absolute` sort du flux et se place par
  rapport au plus proche ancêtre positionné ; `fixed` par rapport à la fenêtre ;
  `sticky` colle au seuil pendant le défilement.
- `z-index` ne s’applique qu’aux éléments positionnés (ou enfants de flex et grid) ; un
  contexte d’empilement enferme ses descendants.
