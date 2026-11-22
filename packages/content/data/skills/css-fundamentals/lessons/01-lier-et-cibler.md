---
title: Lier une feuille de style et cibler les éléments
summary: Relier un fichier CSS à une page HTML, comprendre l’anatomie d’une règle et choisir les sélecteurs courants.
durationMinutes: 55
sources:
  - title: MDN — Sélecteurs CSS
    url: https://developer.mozilla.org/fr/docs/Web/CSS/Guides/Selectors
  - title: MDN — Élément link
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/link
  - title: W3C — Selectors Level 4
    url: https://www.w3.org/TR/selectors-4/
---

Ton HTML décrit **ce que contient** la page : un titre, une liste, un article. Il ne dit
rien de **son apparence** : couleur, taille du texte, espacements. C’est le rôle de CSS
(_Cascading Style Sheets_, « feuilles de style en cascade »). Le navigateur lit le HTML,
construit l’arbre des éléments (le DOM), puis applique les règles CSS pour décider
comment dessiner chaque élément.

Cette leçon répond à deux questions : comment relier une feuille de style à une page, et
comment désigner précisément les éléments à mettre en forme. Tout le reste de CSS repose
sur ces deux gestes.

## La page qui nous sert de terrain d’essai

Crée un dossier `recettes` contenant deux fichiers : `index.html` et `styles.css`.

```text
recettes/
  index.html
  styles.css
```

Voici `index.html`. Tu reconnais un document HTML sémantique, vu dans la compétence
précédente :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mes recettes</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <h1>Mes recettes</h1>
      <nav>
        <a href="index.html">Accueil</a>
        <a href="https://developer.mozilla.org/fr/">MDN</a>
      </nav>
    </header>
    <main>
      <article class="recipe">
        <h2>Crêpes</h2>
        <p class="intro">Une recette simple pour 4 personnes.</p>
        <ul class="ingredients">
          <li>250 g de farine</li>
          <li>4 œufs</li>
          <li>50 cl de lait</li>
        </ul>
        <p>Mélange la farine et les œufs, puis ajoute le lait.</p>
      </article>
    </main>
  </body>
</html>
```

La ligne importante est dans le `<head>` : `<link rel="stylesheet" href="styles.css">`.
L’attribut `rel="stylesheet"` indique la nature du lien (une feuille de style) et `href`
donne l’adresse du fichier. Ici le chemin est **relatif** : le navigateur cherche
`styles.css` dans le même dossier que `index.html`. Si ta feuille est dans un
sous-dossier, écris `href="css/styles.css"`.

Mets ceci dans `styles.css` :

```css
body {
  font-family: system-ui, sans-serif;
  background-color: lightyellow;
}
```

Ouvre `index.html` dans ton navigateur (double-clic ou glisser-déposer dans une fenêtre).
Le fond de la page devient jaune pâle et le texte utilise la police du système. Si rien
ne change, la feuille n’est pas chargée : c’est presque toujours un chemin erroné ou une
faute de frappe dans le nom du fichier. Ce test du fond coloré est une astuce simple pour
vérifier qu’un lien fonctionne ; retire-le ensuite.

## Anatomie d’une règle

Une feuille de style est une suite de **règles**. Chaque règle associe un **sélecteur**
(quels éléments ?) à un **bloc de déclarations** (quel style ?).

```css
/* Un commentaire CSS s’écrit entre ces deux marqueurs. */
h2 {
  color: darkred;
  font-size: 2rem;
}
```

- `h2` est le **sélecteur** : la règle s’applique à tous les éléments `<h2>`.
- Entre accolades, chaque ligne est une **déclaration** : une **propriété** (`color`),
  deux-points, une **valeur** (`darkred`), un point-virgule.
- Le point-virgule sépare les déclarations. Il est facultatif après la dernière, mais
  mets-le toujours : tu éviteras une erreur le jour où tu ajouteras une ligne.

Résultat : le titre « Crêpes » s’affiche en rouge foncé, deux fois plus grand que la
taille de texte de base (l’unité `rem` sera expliquée dans une prochaine leçon).

Quand le navigateur rencontre une déclaration qu’il ne comprend pas (propriété mal
orthographiée, valeur invalide), il **l’ignore** et continue avec la suivante. Aucun
message d’erreur ne s’affiche sur la page : c’est pour cela qu’un style « qui ne marche
pas » est souvent une simple coquille.

```css
h2 {
  colr: darkred; /* propriété inconnue : ignorée */
  font-size: 2rem; /* appliquée normalement */
}
```

## Trois façons d’appliquer du CSS

| Méthode           | Exemple                                     | Usage                                |
| ----------------- | ------------------------------------------- | ------------------------------------ |
| Feuille externe   | `<link rel="stylesheet" href="styles.css">` | La méthode normale                   |
| Élément `<style>` | `<style> h2 { color: darkred; } </style>`   | Test rapide, page isolée             |
| Attribut `style`  | `<h2 style="color: darkred">`               | À éviter, sauf cas très particuliers |

La feuille externe est la bonne pratique, pour trois raisons :

1. **Réutilisation** : toutes les pages du site partagent le même fichier ; modifier une
   couleur se fait à un seul endroit.
2. **Cache** : le navigateur télécharge le fichier une fois et le réutilise d’une page à
   l’autre.
3. **Séparation des rôles** : le HTML reste lisible et centré sur le contenu.

L’attribut `style` mélange contenu et présentation, ne se réutilise pas, et l’emporte sur
presque toutes les règles de tes feuilles. Tu verras pourquoi dans la leçon sur la
cascade.

## Les sélecteurs simples

### Type, classe, identifiant, universel

```css
p {
  line-height: 1.5; /* sélecteur de type : tous les <p> */
}

.intro {
  font-style: italic; /* sélecteur de classe : class="intro" */
}

#main-title {
  letter-spacing: 0.05em; /* sélecteur d’identifiant : id="main-title" */
}

* {
  margin: 0; /* sélecteur universel : tous les éléments */
}
```

- Le **sélecteur de type** reprend le nom de la balise.
- Le **sélecteur de classe** commence par un point. Un élément peut porter plusieurs
  classes séparées par des espaces (`class="card card-featured"`), et une classe peut
  être utilisée par autant d’éléments que tu veux.
- Le **sélecteur d’identifiant** commence par `#`. Un `id` doit être unique dans la page.
  Comme tu le verras avec la spécificité, il pèse très lourd ; en pratique on met en
  forme avec des classes et on réserve les `id` aux ancres et au lien avec les
  formulaires (`<label for>`).
- Le **sélecteur universel** `*` cible tout. Il sert surtout aux réinitialisations.

Les noms de classes et d’identifiants sont **sensibles à la casse** dans un document HTML
standard (avec `<!doctype html>`) : `.Intro` ne cible pas `class="intro"`. Les noms de
balises, eux, ne le sont pas en HTML.

### Les sélecteurs d’attribut

Ils ciblent un élément selon la présence ou la valeur d’un attribut :

| Sélecteur           | Cible les éléments…                                    |
| ------------------- | ------------------------------------------------------ |
| `[title]`           | qui ont un attribut `title`, quelle que soit sa valeur |
| `[type="email"]`    | dont `type` vaut exactement `email`                    |
| `[href^="https"]`   | dont `href` **commence** par `https`                   |
| `[href$=".pdf"]`    | dont `href` **finit** par `.pdf`                       |
| `[href*="mozilla"]` | dont `href` **contient** `mozilla`                     |

```css
a[href^='https'] {
  text-decoration-style: dotted; /* les liens absolus en https */
}
```

Dans notre page, seul le lien « MDN » est concerné : « Accueil » pointe vers
`index.html`.

### Combiner sans espace : le sélecteur composé

Coller plusieurs sélecteurs simples **sans espace** signifie « le même élément remplit
toutes les conditions ».

```css
p.intro {
  color: dimgray; /* un <p> qui porte la classe intro */
}

.card.card-featured {
  border-width: 3px; /* un élément qui porte les DEUX classes */
}
```

L’espace change tout : `p .intro` (avec une espace) veut dire « un élément de classe
`intro` situé **à l’intérieur** d’un `<p>` ». Dans notre page, `p.intro` cible le
paragraphe d’introduction, alors que `p .intro` ne cible rien.

## Les combinateurs : décrire une relation

Les **combinateurs** relient deux sélecteurs selon la position des éléments dans
l’arbre.

| Combinateur | Exemple     | Signification                                                       |
| ----------- | ----------- | ------------------------------------------------------------------- |
| espace      | `article p` | un `<p>` descendant d’un `<article>`, à n’importe quelle profondeur |
| `>`         | `nav > a`   | un `<a>` **enfant direct** d’un `<nav>`                             |
| `+`         | `h2 + p`    | le `<p>` qui suit **immédiatement** un `<h2>` (même parent)         |
| `~`         | `h2 ~ p`    | tous les `<p>` qui suivent un `<h2>`, frères de même parent         |

Applique-les à notre page et vérifie ce qui est ciblé :

```css
main p {
  max-width: 60ch; /* les deux paragraphes de l’article */
}

main > p {
  color: red; /* rien : aucun <p> n’est enfant DIRECT de <main> */
}

h2 + p {
  font-size: 1.2rem; /* seulement le paragraphe .intro */
}

ul + p {
  margin-top: 2rem; /* seulement le paragraphe « Mélange… » */
}
```

Le piège classique est `main > p` : les paragraphes sont dans `<article>`, lui-même dans
`<main>`. Ils sont descendants de `<main>`, mais pas ses enfants directs.

## Regrouper des sélecteurs avec la virgule

Pour appliquer les mêmes déclarations à plusieurs sélecteurs, sépare-les par une
virgule :

```css
h1,
h2,
.intro {
  font-family: Georgia, serif;
}
```

Attention : si **un seul** sélecteur de la liste est invalide, le navigateur ignore
**toute la règle**. Exemple :

```css
h1,
p:hover-ish {
  color: red; /* :hover-ish n’existe pas : la règle entière est ignorée, h1 compris */
}
```

Ici le `<h1>` ne devient pas rouge. Une faute dans une liste de sélecteurs fait donc
disparaître des styles qui semblaient sans rapport.

## Les pseudo-classes : un état ou une position

Une **pseudo-classe** commence par un deux-points et cible un élément selon son état ou
sa position dans l’arbre.

### États d’interaction

```css
a:hover {
  color: darkred; /* pointeur de souris au-dessus du lien */
}

a:focus-visible {
  outline: 3px solid darkorange; /* focus à montrer, typiquement au clavier */
  outline-offset: 2px;
}

input:disabled {
  opacity: 0.6; /* champ désactivé */
}
```

`:focus-visible` mérite ton attention. Quand tu navigues au clavier avec la touche
Tabulation, il faut **voir** où tu te trouves. Le navigateur applique `:focus-visible`
lorsqu’il juge utile de montrer le focus, typiquement lors d’une navigation au clavier,
et pas forcément lors d’un clic sur un bouton. Ne supprime jamais le contour de focus
(`outline: none`) sans le remplacer par un indicateur aussi visible : tu rendrais le
site inutilisable au clavier.

`:hover` n’existe pas vraiment sur un écran tactile. Ne cache donc jamais une information
indispensable derrière un survol.

### Position dans l’arbre

```css
li:first-child {
  font-weight: bold; /* le premier enfant de son parent, s’il est un <li> */
}

li:last-child {
  color: gray;
}

li:nth-child(odd) {
  background-color: whitesmoke; /* 1er, 3e, 5e… enfant */
}

li:nth-child(2) {
  text-decoration: underline; /* le 2e enfant */
}

li:not(:last-child) {
  border-bottom: 1px solid lightgray; /* tous sauf le dernier */
}
```

`:nth-child()` accepte un nombre, `odd` (impairs), `even` (pairs) ou une formule
`an+b` : `3n` cible les 3e, 6e, 9e… enfants ; `2n+1` équivaut à `odd`.

`:not()` exclut ce qui correspond au sélecteur entre parenthèses. `li:not(:last-child)`
est très pratique pour séparer des éléments par une bordure sans en mettre une après le
dernier.

### Le piège de `:first-child`

`:first-child` veut dire « **premier enfant de son parent** », pas « premier de son type ».
Dans notre article, le premier enfant est le `<h2>`. Donc :

```css
.recipe p:first-child {
  color: red; /* ne cible RIEN : aucun <p> n’est premier enfant de l’article */
}

.recipe p:first-of-type {
  color: darkgreen; /* cible le premier <p> de l’article : .intro */
}
```

`:first-of-type`, `:last-of-type` et `:nth-of-type()` comptent seulement les frères du
même type de balise.

## Les pseudo-éléments : une partie d’un élément

Un **pseudo-élément** commence par **deux** deux-points et désigne une partie d’un
élément qui n’existe pas comme balise.

```css
.intro::before {
  content: 'À savoir : ';
  font-weight: bold;
}

.intro::first-letter {
  font-size: 1.5em;
}
```

`::before` et `::after` insèrent un contenu décoratif avant ou après le contenu de
l’élément ; ils n’apparaissent que si la propriété `content` est définie (même vide :
`content: ""`). Ici, le paragraphe affiche « **À savoir :** Une recette simple pour 4
personnes. ». N’y mets jamais d’information indispensable : ce texte n’est pas
sélectionnable à la souris et les technologies d’assistance ne le traitent pas toutes de
la même façon. `::first-letter` et `::first-line` mettent en forme la première lettre ou
la première ligne affichée.

Tu croiseras aussi la notation à un seul deux-points (`:before`) : c’est une ancienne
syntaxe encore acceptée pour quatre pseudo-éléments. Écris toujours `::`, qui distingue
pseudo-éléments et pseudo-classes.

## Pièges courants

| Erreur                                          | Effet                                        | Correction                              |
| ----------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `intro { … }`                                   | cible une balise `<intro>` inexistante       | `.intro { … }`                          |
| `p .intro` au lieu de `p.intro`                 | cherche un `.intro` à l’intérieur d’un `<p>` | coller les sélecteurs                   |
| `.Intro` pour `class="intro"`                   | rien : casse différente                      | respecter la casse                      |
| `color: darkred` sans `;` avant une autre ligne | la déclaration suivante devient invalide     | terminer chaque déclaration par `;`     |
| Un sélecteur invalide dans un groupe            | toute la règle est ignorée                   | corriger ou séparer la règle            |
| `href="style.css"` au lieu de `styles.css`      | aucun style                                  | vérifier le chemin et le nom du fichier |

Un dernier conseil : écris des sélecteurs **courts**. `body main article.recipe ul li`
fonctionne, mais casse dès que la structure HTML change. Une classe bien nommée
(`.ingredient`) est plus robuste et plus lisible.

## Exercices

### Exercice 1 — Prévoir ce qui est ciblé

Sans rien exécuter, indique quels éléments de la page `recettes` sont ciblés par chacun
de ces sélecteurs (réponds « aucun » si nécessaire) :

1. `header a`
2. `nav > a:last-child`
3. `article > p`
4. `h2 ~ p`
5. `.ingredients li:nth-child(even)`
6. `ul.ingredients + p`
7. `[class]`

:::solution

1. Les deux liens « Accueil » et « MDN » : ils sont descendants de `<header>` (via
   `<nav>`).
2. Le lien « MDN » : c’est le dernier enfant de `<nav>`, et c’est bien un `<a>`.
3. Les deux paragraphes, enfants directs de `<article>`.
4. Les deux paragraphes : ce sont des frères qui suivent le `<h2>`, pas forcément
   immédiatement.
5. Le seul enfant pair de la liste : « 4 œufs ».
6. Le paragraphe « Mélange la farine… », qui suit immédiatement la liste.
7. Les trois éléments qui portent un attribut `class` : l’`<article>`, le paragraphe
   `.intro` et la liste `<ul>`.

Pour vérifier, ouvre la console du navigateur et tape par exemple
`document.querySelectorAll('h2 ~ p')` : la méthode accepte les mêmes sélecteurs que CSS
et renvoie la liste des éléments ciblés.
:::

### Exercice 2 — Mettre en forme la recette

Écris `styles.css` pour obtenir :

- le titre de l’article en `darkred` ;
- le paragraphe d’introduction en italique, **sans** modifier le HTML ;
- les ingrédients séparés par une bordure fine grise, sauf après le dernier ;
- les liens externes (en `https`) soulignés en pointillés ;
- un contour orange bien visible sur un lien qui reçoit le focus au clavier.

:::solution

```css
.recipe h2 {
  color: darkred;
}

/* Le paragraphe qui suit immédiatement le titre.
   .intro fonctionnerait aussi : la classe existe déjà dans le HTML. */
h2 + p {
  font-style: italic;
}

/* Tous les ingrédients sauf le dernier reçoivent une bordure basse. */
.ingredients li:not(:last-child) {
  border-bottom: 1px solid lightgray;
}

/* ^= : la valeur de href commence par https. */
a[href^='https'] {
  text-decoration-style: dotted;
}

/* Le focus reste visible au clavier ; on ne supprime pas le contour, on le renforce. */
a:focus-visible {
  outline: 3px solid darkorange;
  outline-offset: 2px;
}
```

Remarques : `.recipe h2` est préférable à `h2` seul si d’autres `<h2>` existent ailleurs
dans le site. Pour tester le focus, clique dans la barre d’adresse puis appuie sur
Tabulation jusqu’à atteindre un lien.
:::

### Exercice 3 — Réparer une feuille de style

Cette feuille ne produit aucun des effets voulus (commentaires). Trouve les quatre
erreurs.

```css
/* Le titre principal en bleu marine */
h1, h2:first-chil {
  color: navy;
}

/* L’introduction en gris */
p .intro {
  color: gray;
}

/* Les ingrédients en gras */
ingredients li {
  font-weight: bold
  color: darkgreen;
}
```

:::solution

1. `:first-chil` est une pseudo-classe inconnue : **toute** la première règle est
   ignorée, y compris pour `h1`. Il suffit d’écrire `h1 { color: navy; }`.
2. `p .intro` cherche un élément `.intro` à l’intérieur d’un `<p>`. Il faut `p.intro`
   (ou simplement `.intro`).
3. `ingredients` sans point cible une balise `<ingredients>` qui n’existe pas. Il faut
   `.ingredients li`.
4. Le point-virgule manque après `bold` : le navigateur lit `bold color: darkgreen`
   comme une seule valeur invalide pour `font-weight`, et ignore les deux.

```css
h1 {
  color: navy;
}

.intro {
  color: gray;
}

.ingredients li {
  font-weight: bold;
  color: darkgreen;
}
```

:::

## Récapitulatif

- Une feuille externe se lie dans le `<head>` avec `<link rel="stylesheet" href="…">` ;
  le chemin est relatif au fichier HTML.
- Une règle = un sélecteur + des déclarations `propriété: valeur;`. Une déclaration
  invalide est ignorée sans message sur la page.
- Sélecteurs simples : type (`p`), classe (`.intro`), identifiant (`#id`), universel
  (`*`), attribut (`[href^="https"]`).
- Sans espace, les conditions portent sur le même élément (`p.intro`) ; avec un
  combinateur, elles décrivent une relation : descendant (espace), enfant (`>`), frère
  suivant immédiat (`+`), frères suivants (`~`).
- Un sélecteur invalide dans une liste séparée par des virgules annule toute la règle.
- Pseudo-classes (`:hover`, `:focus-visible`, `:first-child`, `:nth-child()`, `:not()`)
  et pseudo-éléments (`::before`, `::after`, `::first-letter`) ciblent un état, une
  position ou une partie d’élément.
- Préfère des classes bien nommées à des sélecteurs longs qui dépendent de la structure.
