---
title: Cascade, spécificité et héritage
summary: Prédire quelle déclaration s’applique quand plusieurs règles se contredisent, et d’où vient une valeur héritée.
durationMinutes: 70
sources:
  - title: MDN — Introduction à la cascade CSS
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Cascade/Introduction
  - title: MDN — Spécificité
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Cascade/Specificity
  - title: MDN — Héritage
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Cascade/Inheritance
  - title: W3C — CSS Cascading and Inheritance Level 5
    url: https://www.w3.org/TR/css-cascade-5/
---

Dès qu’une feuille de style grandit, plusieurs règles finissent par viser le même élément
et la même propriété. Le paragraphe doit-il être gris, bleu ou vert ? Le navigateur ne
tire pas au sort : il applique un algorithme précis, la **cascade**. Quand aucune règle ne
vise un élément, une autre mécanique entre en jeu : l’**héritage**.

Comprendre ces deux mécanismes, c’est passer de « j’essaie des choses jusqu’à ce que ça
marche » à « je sais pourquoi cette règle gagne ». C’est exactement ce qu’on te
demandera d’expliquer à l’oral.

## Le problème : des déclarations en conflit

Reprends une page simple :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Actualités</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <article id="news" class="card">
      <h2 class="card-title">Nouvelle boulangerie</h2>
      <p class="lead">Elle ouvre lundi.</p>
      <p>Horaires : 7 h – 19 h. <a href="horaires.html">Détails</a></p>
    </article>
  </body>
</html>
```

Et cette feuille `styles.css` :

```css
#news p {
  color: green;
}

article p {
  color: orange;
}

.lead {
  color: blue;
}

p {
  color: gray;
}
```

Les quatre règles ciblent le paragraphe `.lead` et déclarent toutes `color`. Résultat
dans le navigateur : **les deux paragraphes sont verts**, alors que la règle `#news p`
est la première du fichier. Le lien « Détails », lui, reste **bleu** et souligné. Pour
comprendre ces deux résultats, il faut la cascade, puis l’héritage.

## Les critères de la cascade

Pour chaque élément et chaque propriété, le navigateur rassemble toutes les déclarations
qui s’y appliquent, puis les départage avec une série de critères. Il passe au critère
suivant **seulement** si le précédent n’a pas suffi à désigner un gagnant :

1. **Origine et importance** : qui a écrit la déclaration, et porte-t-elle `!important` ?
2. **Style attaché à l’élément** : une déclaration de l’attribut `style` l’emporte sur
   celles qui viennent d’un sélecteur.
3. **Spécificité** du sélecteur.
4. **Ordre d’apparition** : à égalité, la dernière déclaration lue gagne.

C’est une version simplifiée. La spécification ajoute d’autres critères (les couches
`@layer`, le Shadow DOM, les animations et transitions) dont tu n’as pas besoin pour
l’instant ; ils ne changent rien aux exemples de cette leçon.

### 1. Origine et importance

Trois origines produisent des styles :

- l’**agent utilisateur** : la feuille par défaut du navigateur. C’est elle qui rend les
  liens bleus et soulignés, les `<h1>` grands et gras, et ajoute des marges aux
  paragraphes ;
- l’**utilisateur** : une personne peut configurer son navigateur (taille de police
  minimale, feuille personnelle, extension d’accessibilité) ;
- l’**auteur** : toi, avec tes feuilles de style.

Pour des déclarations normales, l’ordre de priorité est : agent utilisateur, puis
utilisateur, puis auteur. Tes styles battent donc ceux du navigateur. Pour les
déclarations marquées `!important`, l’ordre **s’inverse** : un `!important` de
l’utilisateur bat un `!important` de l’auteur. Ce renversement est voulu : il garantit à
une personne malvoyante qu’elle peut imposer ses réglages au site.

Au sein de tes propres feuilles, une déclaration `!important` bat toutes les
déclarations normales, quelle que soit leur spécificité :

```css
.alert {
  color: purple !important;
}

#news .alert {
  color: teal; /* plus spécifique, mais normale : perd contre !important */
}
```

Un élément `<p class="alert">` dans `#news` est violet. Si deux déclarations sont toutes
les deux `!important`, la suite de la cascade (spécificité, ordre) les départage.

### 2. L’attribut `style`

```html
<p class="lead" style="color: black">Elle ouvre lundi.</p>
```

La déclaration de l’attribut `style` gagne contre toutes les règles de tes feuilles…
sauf celles qui portent `!important`. C’est une des raisons d’éviter l’attribut `style` :
pour le surcharger depuis une feuille, il faut `!important`, et la surenchère commence.

### 3. La spécificité

La **spécificité** mesure à quel point un sélecteur est précis. On l’écrit comme un
triplet **(A, B, C)** :

| Colonne | Ce qu’on compte                                | Exemples                            |
| ------- | ---------------------------------------------- | ----------------------------------- |
| A       | sélecteurs d’identifiant                       | `#news`                             |
| B       | classes, sélecteurs d’attribut, pseudo-classes | `.lead`, `[type="email"]`, `:hover` |
| C       | sélecteurs de type et pseudo-éléments          | `p`, `article`, `::before`          |

Ne comptent **pour rien** : le sélecteur universel `*` et les combinateurs (espace, `>`,
`+`, `~`).

Pour comparer deux spécificités, on compare d’abord A ; si A est égal, on compare B ; si
B est égal, on compare C. Il n’y a **pas de retenue** : (0, 11, 0) reste plus faible que
(1, 0, 0), car la colonne A est examinée en premier. Onze classes ne battent pas un
identifiant.

Calculons nos quatre règles :

| Sélecteur   | Calcul                | Spécificité |
| ----------- | --------------------- | ----------- |
| `#news p`   | 1 identifiant, 1 type | (1, 0, 1)   |
| `article p` | 2 types               | (0, 0, 2)   |
| `.lead`     | 1 classe              | (0, 1, 0)   |
| `p`         | 1 type                | (0, 0, 1)   |

`#news p` a la plus forte spécificité : le paragraphe `.lead` est vert, malgré sa classe
et malgré l’ordre du fichier. L’ordre ne compte qu’en cas d’égalité de spécificité.

D’autres exemples, à vérifier toi-même :

| Sélecteur            | Spécificité | Explication                            |
| -------------------- | ----------- | -------------------------------------- |
| `*`                  | (0, 0, 0)   | l’universel ne compte pas              |
| `li::before`         | (0, 0, 2)   | type + pseudo-élément                  |
| `nav > a:hover`      | (0, 1, 2)   | pseudo-classe ; `>` ne compte pas      |
| `a[href^="https"]`   | (0, 1, 1)   | attribut + type                        |
| `.card.featured h2`  | (0, 2, 1)   | deux classes + un type                 |
| `body div section p` | (0, 0, 4)   | perd contre une seule classe (0, 1, 0) |
| `#news .card-title`  | (1, 1, 0)   | identifiant + classe                   |

### Les cas particuliers : `:is()`, `:not()`, `:where()`

Ces pseudo-classes fonctionnelles prennent une liste de sélecteurs entre parenthèses :

- `:is(A, B)` cible ce qui correspond à A **ou** B. Sa spécificité est celle de
  l’argument **le plus spécifique** de la liste, même si c’est un autre argument qui a
  trouvé l’élément.
- `:not(A, B)` exclut ce qui correspond à A ou B. Même règle : la spécificité de
  l’argument le plus spécifique. La pseudo-classe `:has()` suit cette règle elle aussi.
- `:where(A, B)` cible comme `:is()`, mais sa spécificité vaut **toujours (0, 0, 0)**,
  quoi qu’il y ait dedans.

```css
:is(#sidebar, .card) h3 {
  color: red; /* (1, 0, 1) : l’identifiant compte, même pour une .card */
}

.card h3 {
  color: blue; /* (0, 1, 1) : perd, même placée après */
}

:where(#sidebar, .card) h4 {
  color: red; /* (0, 0, 1) : :where() ne compte pas */
}

h4 {
  color: blue; /* (0, 0, 1) aussi : égalité, la dernière gagne */
}
```

Dans `<div class="card"><h3>…</h3><h4>…</h4></div>`, le `<h3>` est rouge et le `<h4>`
bleu. `:where()` sert justement à écrire des styles **de base** faciles à surcharger, par
exemple dans une feuille de réinitialisation :

```css
:where(ul, ol)[class] {
  list-style: none; /* (0, 1, 0) : seul [class] compte */
  padding-left: 0;
}
```

`:is()` et `:where()` ont aussi une particularité utile : un sélecteur invalide dans leur
liste est ignoré sans annuler toute la règle, contrairement à une liste séparée par des
virgules vue dans la leçon précédente.

### 4. L’ordre d’apparition

À égalité d’origine, d’importance et de spécificité, la **dernière** déclaration lue
gagne. L’ordre de lecture suit l’ordre des feuilles dans le document (deux `<link>`
successifs, par exemple), puis l’ordre des règles dans chaque feuille.

```css
.btn {
  background-color: steelblue;
}

.btn-danger {
  background-color: firebrick;
}
```

Un bouton `<button class="btn-danger btn">` est rouge brique (`firebrick`) : les deux
sélecteurs ont la spécificité (0, 1, 0), et `.btn-danger` est écrit après. L’ordre des
classes **dans l’attribut HTML** n’a aucune importance ; seul compte l’ordre des règles
dans la feuille.

## L’héritage

Retour au lien « Détails ». Les paragraphes sont verts, mais le lien reste bleu. Et si
on colorait l’article entier ?

```css
#news {
  color: crimson;
  font-family: Georgia, serif;
  border: 2px solid black;
}
```

Observe le résultat :

- le titre `<h2>` devient cramoisi : aucune règle ne déclare sa couleur, il **hérite**
  de celle de son parent ;
- les paragraphes restent **verts** : la règle `#news p` les vise directement ;
- le lien reste **bleu** : la feuille du navigateur contient une règle qui vise les
  liens directement ;
- tout le texte passe en Georgia, y compris le lien ;
- la bordure noire entoure l’article, mais **pas** le titre ni les paragraphes.

### La règle fondamentale

Pour chaque propriété d’un élément :

1. si **au moins une déclaration** vise cet élément, la cascade choisit la gagnante ;
2. sinon, si la propriété est **héritée**, l’élément prend la valeur de son parent ;
3. sinon, il prend la **valeur initiale** de la propriété, définie par la spécification.

Conséquence capitale : une valeur héritée **n’a aucune spécificité**. N’importe quelle
déclaration qui vise l’élément lui-même, même `p` (0, 0, 1) ou une règle du navigateur,
bat la valeur que le parent transmet, même si le parent est ciblé par un identifiant.
C’est pour cela que `#news { color: crimson; }` ne colore pas les paragraphes ni le lien.

### Quelles propriétés s’héritent ?

En règle générale, les propriétés **de texte** s’héritent et les propriétés **de boîte**
ne s’héritent pas. C’est logique : on veut que tout le texte d’un article utilise la
même police, mais pas que chaque paragraphe reçoive la bordure de l’article.

| Héritées (exemples)                                | Non héritées (exemples)               |
| -------------------------------------------------- | ------------------------------------- |
| `color`, `font-family`, `font-size`, `font-weight` | `margin`, `padding`, `border`         |
| `line-height`, `text-align`, `letter-spacing`      | `background-color`, `width`, `height` |
| `visibility`, `cursor`, `list-style`               | `display`, `position`                 |

En cas de doute, la page MDN de chaque propriété indique « Héritée : oui » ou « non »
dans son tableau récapitulatif.

Le fond semble pourtant « hérité » : si `body` a un fond jaune, les paragraphes
paraissent jaunes. En réalité `background-color` vaut `transparent` (sa valeur initiale)
sur les paragraphes : on voit le fond du parent **à travers**.

### Contrôler l’héritage avec des mots-clés

Quatre mots-clés universels fonctionnent avec n’importe quelle propriété :

| Mot-clé   | Effet                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `inherit` | prendre la valeur du parent, même pour une propriété non héritée                                           |
| `initial` | prendre la valeur initiale de la spécification                                                             |
| `unset`   | `inherit` si la propriété est héritée, `initial` sinon                                                     |
| `revert`  | revenir à la valeur qu’aurait donnée la cascade sans tes styles d’auteur (en général, celle du navigateur) |

Deux usages très courants :

```css
/* Les liens de la carte prennent la couleur du texte qui les entoure. */
.card a {
  color: inherit;
}

/* Les boutons et champs n’héritent pas la police de la page par défaut :
   le navigateur leur impose la sienne. On corrige cela. */
button,
input,
select,
textarea {
  font: inherit;
}
```

Attention au piège de `initial` : la valeur initiale de `display` est `inline`, quel que
soit l’élément. `div { display: initial; }` transforme donc tes `<div>` en éléments en
ligne. Pour retrouver le comportement par défaut du navigateur (`block` pour un `<div>`),
c’est `revert` qu’il faut.

## `!important` : quand et pourquoi l’éviter

`!important` n’est pas interdit : c’est un outil de la cascade, avec un rôle précis. Le
problème vient de son usage pour « gagner » un conflit qu’on ne comprend pas.

Pourquoi l’éviter dans ton code courant :

- il court-circuite la spécificité : la feuille devient imprévisible pour qui la lit ;
- pour surcharger un `!important`, il faut un autre `!important` plus spécifique ou placé
  plus loin. Chaque correction en appelle une autre : c’est la surenchère ;
- il masque le vrai problème, souvent un sélecteur trop spécifique ailleurs.

Les usages raisonnables :

- une **classe utilitaire** qui doit s’appliquer quoi qu’il arrive, par exemple une
  classe qui masque visuellement un élément ou `.hidden { display: none !important; }` ;
- surcharger un style que tu **ne peux pas modifier** : CSS d’une bibliothèque tierce,
  attribut `style` injecté par un script externe ;
- une feuille **utilisateur** d’accessibilité, qui doit pouvoir s’imposer au site.

Avant d’écrire `!important`, pose-toi trois questions : quelle règle gagne actuellement
(l’inspecteur te le dira) ? Puis-je réduire sa spécificité ou écrire ma règle après ?
Puis-je ajouter une classe au bon élément ?

## Méthode pour prédire un style

Face à un élément et une propriété :

1. liste toutes les règles dont le sélecteur cible **cet élément** et qui déclarent
   **cette propriété** ;
2. s’il y a des `!important`, ne garde qu’eux ;
3. une déclaration dans l’attribut `style` gagne (à importance égale) ;
4. sinon, garde la spécificité la plus forte ;
5. à égalité, garde la dernière dans l’ordre de lecture ;
6. si la liste du point 1 est vide : valeur du parent si la propriété est héritée,
   sinon valeur initiale.

## Pièges courants

- **Croire que l’ordre l’emporte toujours.** L’ordre ne départage que des égalités de
  spécificité.
- **Croire qu’un sélecteur long est fort.** `body div section p` (0, 0, 4) perd contre
  `.note` (0, 1, 0).
- **Croire qu’une règle sur le parent bat une règle sur l’enfant.** La valeur héritée
  perd contre **toute** déclaration qui vise l’enfant.
- **Utiliser des identifiants pour mettre en forme.** (1, 0, 0) écrase toutes tes
  classes ; pour surcharger, tu devras réécrire l’identifiant ou utiliser `!important`.
- **Oublier que `:is()` prend la spécificité de son argument le plus fort.** Un `#id`
  caché dans la liste rend toute la règle très spécifique.

## Exercices

### Exercice 1 — Calculer des spécificités

Donne la spécificité de chaque sélecteur, puis classe-les du plus faible au plus fort.

1. `ul li`
2. `.menu a:hover`
3. `#footer`
4. `input[type="email"]:focus`
5. `:where(.menu) a`
6. `:not(#footer) p`
7. `.menu > li > a::after`

:::solution

1. `ul li` : deux types, **(0, 0, 2)**.
2. `.menu a:hover` : une classe et une pseudo-classe en B, un type en C, **(0, 2, 1)**.
3. `#footer` : **(1, 0, 0)**.
4. `input[type="email"]:focus` : un attribut et une pseudo-classe, un type,
   **(0, 2, 1)**.
5. `:where(.menu) a` : `:where()` vaut zéro, il reste le type `a`, **(0, 0, 1)**.
6. `:not(#footer) p` : `:not()` prend la spécificité de son argument, donc (1, 0, 0),
   plus le type `p`, **(1, 0, 1)**.
7. `.menu > li > a::after` : une classe, deux types et un pseudo-élément,
   **(0, 1, 3)**. Les `>` ne comptent pas.

Du plus faible au plus fort : 5 (0, 0, 1) ; 1 (0, 0, 2) ; 7 (0, 1, 3) ; 2 et 4 à égalité
(0, 2, 1) ; 3 (1, 0, 0) ; 6 (1, 0, 1).

:::

### Exercice 2 — Prédire les couleurs

```html
<main id="content">
  <section class="promo">
    <h2>Offre du jour</h2>
    <p class="price">12 €</p>
    <p>Valable <strong>jusqu’à dimanche</strong>.</p>
  </section>
</main>
```

```css
#content {
  color: navy;
}

section p {
  color: gray;
}

.promo .price {
  color: green;
}

p.price {
  color: red;
}

.promo {
  font-weight: bold;
}

strong {
  color: inherit;
}
```

Donne la couleur et la graisse (`font-weight`) du `<h2>`, du `.price`, du second `<p>`
et du `<strong>`. Justifie chaque réponse.

:::solution

- **`<h2>`** : aucune règle ne vise le `<h2>` pour `color`, donc il **hérite** de
  `<section>`, qui elle-même hérite de `#content` : **bleu marine**. Graisse : la feuille
  du navigateur met les titres en gras (`bold`).
- **`.price`** : trois règles le visent. `section p` (0, 0, 2), `.promo .price`
  (0, 2, 0) et `p.price` (0, 1, 1). La plus forte est `.promo .price` : **vert**, même
  si `p.price` est écrite après. Graisse : aucune règle ne vise le paragraphe pour
  `font-weight` (la feuille du navigateur n’en déclare pas pour `<p>`), il hérite du gras
  de `.promo` : **gras**.
- **Second `<p>`** : seule `section p` le vise : **gris**. Gras par héritage de
  `.promo`.
- **`<strong>`** : `strong { color: inherit; }` le vise et demande explicitement la valeur
  du parent, le second paragraphe : **gris**. Sans cette règle, le résultat serait le
  même puisque `color` s’hérite et que le navigateur ne déclare pas de couleur pour
  `<strong>`. Graisse : la feuille du navigateur déclare `font-weight: bolder` pour
  `<strong>`, c’est-à-dire « un cran plus gras que le parent ». Le parent étant déjà
  gras (700), l’inspecteur affiche une valeur calculée de **900** ; l’écart visible
  dépend des graisses disponibles dans la police.

:::

### Exercice 3 — Sortir de la surenchère

Une collègue a écrit ceci et se plaint de ne plus pouvoir changer la couleur des boutons
d’alerte :

```css
#app .toolbar button {
  background-color: steelblue;
}

.button-alert {
  background-color: firebrick !important;
}

.toolbar .button-alert.small {
  background-color: darkorange; /* ne s’applique pas ! */
}
```

1. Explique pourquoi la troisième règle ne s’applique jamais.
2. Propose une réécriture sans aucun `!important`, dans laquelle un bouton
   `class="button-alert small"` situé dans `.toolbar` est orange, un bouton
   `class="button-alert"` rouge brique et les autres boutons de la barre bleu acier.

:::solution

1. `.button-alert` porte `!important`. Une déclaration importante bat toutes les
   déclarations normales de la même origine, quelle que soit leur spécificité. La
   troisième règle, normale, perd donc toujours, malgré sa spécificité (0, 3, 0).
   La collègue avait ajouté `!important` parce que `#app .toolbar button` (1, 1, 1)
   battait `.button-alert` (0, 1, 0).
2. On retire l’identifiant, cause de la surenchère, et on laisse la spécificité et
   l’ordre faire leur travail :

```css
/* (0, 1, 1) : style de base des boutons de la barre */
.toolbar button {
  background-color: steelblue;
}

/* (0, 1, 0) : placée après, mais moins spécifique que la règle précédente.
   On ajoute donc .toolbar pour atteindre (0, 2, 0). */
.toolbar .button-alert {
  background-color: firebrick;
}

/* (0, 3, 0) : la variante la plus précise gagne */
.toolbar .button-alert.small {
  background-color: darkorange;
}
```

Variante plus robuste : écrire la règle de base avec `:where(.toolbar) button`
(0, 0, 1), puis de simples classes `.button-alert` (0, 1, 0) et
`.button-alert.small` (0, 2, 0) qui la surchargent sans effort.

:::

## Récapitulatif

- La cascade départage les déclarations en conflit : origine et importance, puis
  attribut `style`, puis spécificité, puis ordre d’apparition.
- `!important` inverse l’ordre des origines et bat toutes les déclarations normales de
  la même origine. Réserve-le aux utilitaires, aux styles tiers impossibles à modifier
  et aux feuilles utilisateur.
- La spécificité est un triplet (identifiants, classes/attributs/pseudo-classes,
  types/pseudo-éléments), comparé colonne par colonne sans retenue. `*` et les
  combinateurs comptent zéro.
- `:is()`, `:not()` et `:has()` prennent la spécificité de leur argument le plus fort ;
  `:where()` vaut toujours zéro.
- Une valeur héritée n’a aucune spécificité : toute déclaration qui vise l’élément la
  bat. Les propriétés de texte s’héritent, les propriétés de boîte non.
- `inherit`, `initial`, `unset` et `revert` contrôlent explicitement la valeur ;
  attention, `display: initial` donne `inline`.
