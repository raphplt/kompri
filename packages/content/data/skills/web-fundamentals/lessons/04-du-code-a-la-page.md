---
title: Du HTML, du CSS et du JavaScript à la page affichée
summary: Suivre le navigateur qui transforme trois langages en pixels, et comprendre l’ordre dans lequel tout se passe.
durationMinutes: 45
sources:
  - title: MDN — Comment fonctionnent les navigateurs
    url: https://developer.mozilla.org/fr/docs/Web/Performance/Guides/How_browsers_work
  - title: MDN — Comment fonctionne le Web
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works
---

Le serveur a renvoyé une réponse `200` avec du HTML. Pourtant, ce que tu vois à l’écran
n’est pas du texte avec des balises : ce sont des titres, des couleurs, des boutons qui
réagissent. Entre les deux, le navigateur fait un travail considérable.

Comprendre ce travail t’évitera des erreurs classiques de débutant : un script qui ne
trouve pas l’élément qu’il cherche, une règle CSS ignorée sans message, une page qui reste
blanche le temps qu’un fichier se charge. Cette leçon suit le navigateur pas à pas.

## Trois langages, trois rôles

Une page web combine généralement trois langages :

| Langage        | Rôle                                                                     | Analogie                    |
| -------------- | ------------------------------------------------------------------------ | --------------------------- |
| **HTML**       | La **structure** et le **contenu**                                       | Le squelette et les organes |
| **CSS**        | La **présentation** : couleurs, tailles, mise en page                    | Les vêtements               |
| **JavaScript** | Le **comportement** : réagir, modifier la page, échanger avec un serveur | Les muscles                 |

Ce découpage n’est pas une simple convention de rangement : le navigateur traite chacun
de ces langages avec un outil différent, à un moment différent.

## Un exemple complet

Crée un dossier `premiere-page` contenant trois fichiers. Tu peux utiliser n’importe quel
éditeur de texte, par exemple Visual Studio Code ; ne les écris pas dans un traitement de
texte comme Word, qui ajouterait sa propre mise en forme.

`index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Ma première page</title>
    <link rel="stylesheet" href="style.css" />
    <script src="app.js" defer></script>
  </head>
  <body>
    <h1>Bonjour</h1>
    <p class="intro">Cette page est construite par le navigateur.</p>
  </body>
</html>
```

`style.css` :

```css
body {
  font-family: sans-serif;
}

h1 {
  color: darkblue;
}

.intro {
  color: bleu;
  font-style: italic;
}
```

`app.js` :

```js
console.log('Le script démarre');
const title = document.querySelector('h1');
title.textContent = 'Bonjour depuis JavaScript';
console.log('Titre modifié :', title.textContent);
```

Ouvre `index.html` dans ton navigateur (double-clic, ou glisser-déposer le fichier dans
une fenêtre). Tu vois :

- un titre bleu foncé qui affiche **« Bonjour depuis JavaScript »**, et non « Bonjour » ;
- un paragraphe en italique, mais **noir**, pas bleu.

Ouvre la console des outils de développement (`F12`) : elle affiche

```text
Le script démarre
Titre modifié : Bonjour depuis JavaScript
```

Tu n’as pas besoin de comprendre chaque ligne de JavaScript pour l’instant : retiens que
`document.querySelector('h1')` cherche le titre dans la page et que la ligne suivante
remplace son texte. Tout le reste de la leçon explique ce qui s’est passé, y compris
pourquoi le paragraphe n’est pas bleu.

## Étape 1 : analyser le HTML et construire le DOM

Le navigateur lit le HTML **de haut en bas**, au fur et à mesure qu’il arrive. Il le
découpe en balises et en texte, puis construit en mémoire un **arbre d’objets** : le
**DOM** (_Document Object Model_). Pour notre page, l’arbre ressemble à ceci :

```text
document
└── html (lang="fr")
    ├── head
    │   ├── meta (charset="utf-8")
    │   ├── title
    │   │   └── "Ma première page"
    │   ├── link (rel="stylesheet", href="style.css")
    │   └── script (src="app.js", defer)
    └── body
        ├── h1
        │   └── "Bonjour"
        └── p (class="intro")
            └── "Cette page est construite par le navigateur."
```

Chaque balise devient un **nœud** de l’arbre, avec ses attributs ; le texte devient des
nœuds texte. C’est ce DOM, et non le fichier HTML, que le navigateur affiche et que le
JavaScript modifie.

### Le HTML est tolérant

Le navigateur ne s’arrête jamais sur une erreur de HTML : la norme HTML décrit
précisément comment **réparer** un document mal formé. Par exemple, ce fragment oublie
de fermer les paragraphes et omet un élément de tableau (il est présenté comme du texte
brut pour que tu voies exactement les balises écrites) :

```text
<p>Premier paragraphe
<p>Second paragraphe
<table>
  <tr><td>Une cellule</td></tr>
</table>
```

Le DOM construit par le navigateur contient pourtant des paragraphes fermés et un élément
`tbody` que tu n’as jamais écrit :

```text
<p>Premier paragraphe
</p><p>Second paragraphe
</p><table>
  <tbody><tr><td>Une cellule</td></tr>
</tbody></table>
```

Cette tolérance est pratique pour l’utilisateur, mais elle cache tes erreurs : la page
« marche » alors que le HTML est invalide, et la réparation n’est pas toujours celle que
tu imaginais. La compétence « HTML sémantique » t’apprendra à valider ton code.

### Découvrir les ressources

En lisant le HTML, le navigateur découvre d’autres ressources : la feuille de style
`style.css` (élément `link`), le script `app.js` (élément `script`), et plus tard les
images. Pour chacune, il envoie une **nouvelle requête HTTP** au serveur. Les chemins
relatifs comme `style.css` sont résolus à partir de l’URL de la page, comme tu l’as vu
dans la leçon sur les URL.

## Étape 2 : analyser le CSS et calculer les styles

Le navigateur analyse chaque feuille de style et construit une seconde structure, le
**CSSOM** (_CSS Object Model_). Il détermine ensuite, pour chaque élément du DOM, la
valeur finale de chaque propriété : c’est le **calcul des styles**. Quand plusieurs règles
s’appliquent au même élément, des règles précises (la **cascade**, étudiée dans la
compétence CSS) décident laquelle l’emporte.

### Le CSS ignore ce qu’il ne comprend pas

Dans notre exemple, `color: bleu;` n’est pas valide : la couleur s’appelle `blue` en CSS.
Le navigateur **ignore silencieusement** cette déclaration et applique les autres
(`font-style: italic`). Le paragraphe garde donc la couleur héritée de son parent : le
noir par défaut. Aucun message n’apparaît dans la console.

C’est un comportement voulu : une feuille de style écrite pour un navigateur récent ne
doit pas casser une page dans un navigateur plus ancien qui ne connaît pas certaines
propriétés. Mais pour toi, cela signifie qu’une faute de frappe en CSS ne produit **aucune
erreur visible** : l’inspecteur des outils de développement te montrera la déclaration
barrée ou signalée comme invalide.

:::note
Tant que le CSS n’est pas chargé, le navigateur évite d’afficher la page, pour ne pas
montrer un contenu sans mise en forme qui changerait d’aspect une fraction de seconde
plus tard. On dit que le CSS **bloque le rendu**. Une feuille de style très lente à
charger retarde donc l’affichage de toute la page.

:::

## Étape 3 : arbre de rendu, mise en page et peinture

Une fois le DOM et les styles connus, le navigateur :

1. construit l’**arbre de rendu** : uniquement ce qui doit être affiché. Le `head` et
   les éléments masqués avec `display: none` n’y figurent pas ;
2. effectue la **mise en page** (_layout_, aussi appelée _reflow_) : il calcule la
   position et la taille exacte de chaque boîte, en fonction de la largeur de la fenêtre ;
3. **peint** (_paint_) : il dessine le texte, les couleurs, les bordures, les images ;
4. **compose** (_composite_) : il assemble les différentes couches dans le bon ordre pour
   produire l’image finale à l’écran.

Ces étapes ne se produisent pas une seule fois. Si tu redimensionnes la fenêtre, la mise
en page est recalculée. Si le JavaScript modifie le DOM ou les styles, le navigateur
refait les étapes nécessaires. C’est pour cela que le titre affiche « Bonjour depuis
JavaScript » : le script a modifié le DOM, et l’affichage a suivi.

```text
HTML ──analyse──> DOM ───┐
                         ├──> arbre de rendu ──> mise en page ──> peinture ──> écran
CSS  ──analyse──> CSSOM ─┘           ▲
                                     │
JavaScript ──modifie le DOM ou les styles──┘
```

## Étape 4 : exécuter le JavaScript

### Un script peut bloquer l’analyse

Par défaut, quand l’analyseur HTML rencontre un `script` classique (sans attribut
particulier), il **s’arrête** : il télécharge le script, l’exécute, puis seulement reprend
la lecture du HTML. La raison est historique : un script peut modifier le document en
cours de lecture, donc le navigateur l’attend.

Fais l’expérience : dans `index.html`, retire le mot `defer` de la balise `script`, puis
recharge la page. Le titre affiche maintenant « Bonjour », et la console montre :

```text
Le script démarre
Uncaught TypeError: Cannot set properties of null (setting 'textContent')
```

Ce message est celui de Chrome et Edge ; Firefox formule la même erreur autrement (en
indiquant que `title` vaut `null`). Que s’est-il passé ?

1. L’analyseur lit le `head` et rencontre le script : il s’arrête pour l’exécuter.
2. Le script cherche un `h1`… qui n’existe pas encore dans le DOM, puisque le `body` n’a
   pas été lu. `document.querySelector('h1')` renvoie donc `null` (« rien »).
3. Modifier le texte de « rien » provoque une erreur. L’exécution du script s’arrête à
   cette ligne : le second message ne s’affiche jamais.
4. L’analyseur reprend ensuite la lecture et affiche le titre d’origine.

### defer et type="module"

L’attribut **`defer`** dit au navigateur : « télécharge ce script en parallèle, sans
interrompre l’analyse, et exécute-le **une fois le document entièrement analysé** ».
À ce moment, tout le DOM existe, et le script trouve le titre. Les scripts chargés avec
`type="module"` (la forme moderne, que tu utiliseras plus tard) sont différés de la même
façon par défaut.

| Écriture                       | Analyse HTML interrompue ?                        | Exécution                                          |
| ------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| `script` classique avec `src`  | Oui, le temps du téléchargement et de l’exécution | Immédiate, à sa position                           |
| `script` avec `src` et `defer` | Non                                               | Après l’analyse complète, dans l’ordre des scripts |
| `script` avec `type="module"`  | Non                                               | Après l’analyse complète                           |

Dans ce parcours, tu chargeras tes scripts avec `defer` ou `type="module"`. La compétence
« DOM et événements » y reviendra en détail.

### Une erreur JavaScript n’arrête pas toute la page

Remarque que, même avec l’erreur, la page s’est affichée. Une erreur JavaScript arrête le
**script** en cours, pas l’affichage du HTML et du CSS. Une page peut donc paraître
normale alors qu’une partie de son comportement ne fonctionne pas : regarde toujours la
console quand quelque chose ne réagit pas.

## Deux événements à connaître

Le navigateur signale deux moments importants du chargement :

- **`DOMContentLoaded`** : le HTML est entièrement analysé et le DOM construit. Les
  scripts différés ont été exécutés juste avant.
- **`load`** : toutes les ressources de la page sont chargées, y compris les images et
  les feuilles de style.

Le panneau Réseau des outils de développement affiche ces deux moments, comme tu le
verras dans la leçon suivante.

## Code source ou DOM ?

Le navigateur offre deux façons de regarder une page, à ne pas confondre :

- **Afficher le code source** (`Ctrl`+`U`, ou `Cmd`+`Option`+`U` sur macOS dans Chrome)
  montre le HTML **tel que le serveur l’a envoyé**.
- **L’inspecteur** des outils de développement (onglet Éléments ou Inspecteur) montre
  le **DOM actuel** : après réparation du HTML et après les modifications du JavaScript.

Sur notre exemple avec `defer`, le code source contient `Bonjour` alors que l’inspecteur
montre `Bonjour depuis JavaScript`. Sur certains sites, le code source est presque vide
et tout le contenu est créé par JavaScript.

## Pièges et idées reçues

**« Le navigateur affiche mon fichier HTML. »** Il affiche le **DOM** construit à partir
du fichier, éventuellement réparé et modifié par JavaScript.

**« Mon CSS ne marche pas, il y a forcément une erreur dans la console. »** Le CSS
invalide est ignoré **sans message** dans la console. Utilise l’inspecteur pour voir les
déclarations appliquées, barrées ou invalides.

**« Mon script ne trouve pas l’élément, il doit y avoir une faute de frappe. »** Peut-être,
mais vérifie d’abord **quand** il s’exécute : un script classique dans le `head` s’exécute
avant que le `body` existe. `defer` ou `type="module"` règlent le problème.

**« Une erreur JavaScript, et toute la page plante. »** L’erreur arrête le script en
cours ; le reste de la page s’affiche. C’est justement ce qui rend ces erreurs faciles à
manquer.

**« Si la page s’affiche, mon HTML est correct. »** Le navigateur répare beaucoup
d’erreurs sans rien dire. Seul un validateur te le confirmera.

## Exercices

### Exercice 1 : remettre les étapes dans l’ordre

Remets dans l’ordre les étapes suivantes du chargement de notre page d’exemple (avec
`defer`), de la première à la dernière :

- A. Le navigateur peint le titre et le paragraphe.
- B. Le navigateur reçoit la réponse HTML et commence à l’analyser.
- C. Le script `app.js` s’exécute et modifie le texte du titre.
- D. Le navigateur découvre `style.css` et `app.js` et les demande au serveur.
- E. L’événement `DOMContentLoaded` est déclenché.
- F. Le navigateur résout le nom de domaine du site.

:::solution
Ordre garanti : **F, B, D, puis C, puis E**. L’étape **A** se place après D, mais elle
peut avoir lieu avant ou après C et E.

- F : sans adresse IP, aucune requête n’est possible.
- B : l’analyse commence dès les premiers octets reçus.
- D : les ressources sont découvertes en lisant le `head`, et demandées aussitôt.
- C : un script `defer` s’exécute une fois l’analyse terminée…
- E : … juste avant que `DOMContentLoaded` soit déclenché.
- A : le navigateur peut peindre la page dès que le DOM et le CSS nécessaires sont prêts.
  Selon la vitesse de chargement, une première peinture peut avoir lieu avant
  l’exécution du script ; dans tous les cas, le navigateur repeint après la modification
  du titre. La peinture n’est pas un moment unique : elle se répète à chaque changement.

Toute réponse qui commence par F, B, D, place C avant E et met A n’importe où après D
est donc juste, à condition de savoir expliquer pourquoi C précède forcément E.

:::

### Exercice 2 : diagnostiquer trois symptômes

Pour chaque symptôme, indique à quelle étape le problème se situe et comment tu le
vérifierais.

1. Le texte d’un bouton devrait être rouge, il reste noir. La console est vide. La règle
   CSS est `button { color: rouge; }`.
2. Une page charge un script dans le `head` sans `defer`. Le script doit ajouter une
   classe au `footer`, mais rien ne se passe. La console affiche une erreur mentionnant
   `null`.
3. Le code source d’une page (`Ctrl`+`U`) ne contient presque rien, alors que
   l’inspecteur montre une liste de produits.

:::solution

1. **Calcul des styles.** `rouge` n’est pas une couleur CSS valide (`red` l’est) : la
   déclaration est ignorée sans message. Vérification : dans l’inspecteur, la
   déclaration apparaît barrée ou signalée comme invalide.
2. **Exécution du JavaScript.** Le script s’exécute avant que le `footer` soit analysé :
   la recherche renvoie `null`, puis l’opération sur `null` échoue. Correction : ajouter
   `defer` (ou utiliser `type="module"`). Vérification : l’erreur disparaît et la classe
   apparaît dans l’inspecteur.
3. **Ce n’est pas un problème.** Le contenu est créé par JavaScript après le chargement :
   le code source montre la réponse du serveur, l’inspecteur montre le DOM actuel. Pour
   confirmer, le panneau Réseau montrerait des requêtes supplémentaires qui récupèrent
   les produits.

:::

### Exercice 3 : prévoir le DOM

Sans ouvrir de navigateur, dessine l’arbre DOM (comme dans la leçon) produit par ce
fichier, puis vérifie avec l’inspecteur :

```text
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Liste</title>
  </head>
  <body>
    <h2>Courses</h2>
    <ul>
      <li>Pain
      <li>Lait
    </ul>
  </body>
</html>
```

:::solution

```text
document
└── html (lang="fr")
    ├── head
    │   ├── meta (charset="utf-8")
    │   └── title
    │       └── "Liste"
    └── body
        ├── h2
        │   └── "Courses"
        └── ul
            ├── li
            │   └── "Pain"
            └── li
                └── "Lait"
```

Les balises fermantes `</li>` manquent, mais la norme HTML ferme automatiquement un
élément `li` quand un nouveau `li` commence, ou quand la liste se termine.
L’inspecteur affiche donc deux éléments `li` bien distincts. Ici, l’omission est
même autorisée par la norme ; ce n’est pas le cas de toutes les balises, d’où l’intérêt
de toujours les fermer. (L’inspecteur montre aussi des nœuds texte contenant des
retours à la ligne et des espaces : ils viennent de l’indentation du fichier.)

:::

## Récapitulatif

- **HTML** donne la structure, **CSS** la présentation, **JavaScript** le comportement.
- Le navigateur analyse le HTML de haut en bas et construit le **DOM**, un arbre de
  nœuds ; il répare silencieusement le HTML mal formé.
- Chaque ressource référencée (CSS, script, image) déclenche une **nouvelle requête HTTP**.
- Le CSS est analysé en **CSSOM** ; les déclarations invalides sont **ignorées sans
  message**, et le CSS bloque le premier affichage.
- Le navigateur construit l’**arbre de rendu**, fait la **mise en page**, **peint** et
  **compose** ; ces étapes sont refaites quand le DOM ou les styles changent.
- Un `script` classique **interrompt l’analyse** ; avec `defer` ou `type="module"`, il
  s’exécute après l’analyse complète et trouve tous les éléments.
- Une erreur JavaScript arrête le script, pas l’affichage : surveille la console.
- Le **code source** montre la réponse du serveur ; l’**inspecteur** montre le DOM actuel.
