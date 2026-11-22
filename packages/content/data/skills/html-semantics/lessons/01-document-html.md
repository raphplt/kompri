---
title: Le document HTML, son en-tête et son encodage
summary: Écrire le squelette complet d’une page valide et comprendre le rôle de chaque ligne.
durationMinutes: 40
sources:
  - title: WHATWG — HTML Living Standard, la syntaxe HTML
    url: https://html.spec.whatwg.org/multipage/syntax.html
  - title: MDN — L’élément meta
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/meta
  - title: MDN — Référence des éléments HTML
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements
---

## Pourquoi un squelette ?

Quand le navigateur reçoit un fichier HTML, il ne reçoit qu’une suite d’octets. Pour
l’afficher correctement, il doit répondre à plusieurs questions : dans quel mode faut-il
interpréter ce document ? Quels octets correspondent à quelles lettres ? Dans quelle
langue est le texte ? Quel nom afficher dans l’onglet ? Quelle partie est le contenu
visible ?

Le squelette d’un document HTML répond à ces questions. Il tient en une quinzaine de
lignes, toujours les mêmes, mais chaque ligne a une raison d’être. Si tu en oublies une,
la page s’affiche souvent quand même… avec des accents cassés, une prononciation
anglaise de ton texte français par un lecteur d’écran, ou un onglet intitulé
« index.html ». Cette leçon t’apprend à écrire ce squelette et à expliquer chaque ligne.

Rappel du prérequis « Fonctionnement du web » : le navigateur télécharge le HTML, le
transforme en un arbre d’objets appelé DOM (Document Object Model), puis calcule
l’affichage. Tout ce que tu écris ici sert à construire cet arbre.

## Un premier document complet

Crée un dossier `premiere-page`, puis un fichier `index.html` avec ce contenu exact :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Atelier céramique — Accueil</title>
  </head>
  <body>
    <h1>Atelier céramique de Lou</h1>
    <p>Cours du soir pour débutants, le mardi et le jeudi.</p>
  </body>
</html>
```

Ouvre le fichier dans ton navigateur : double-clic sur `index.html`, ou glisse-le dans
une fenêtre de navigateur. Tu obtiens :

- dans l’onglet, le texte « Atelier céramique — Accueil » ;
- dans la page, un grand titre « Atelier céramique de Lou » suivi d’un paragraphe ;
- des accents correctement affichés.

Le titre de l’onglet ne vient pas du `h1` : il vient de l’élément `title`, placé dans
`head`. Tout ce qui est dans `head` décrit le document ; tout ce qui est dans `body` est
le contenu affiché.

## Éléments, balises et attributs

Un **élément** HTML est en général écrit avec une **balise ouvrante** et une **balise
fermante** qui entourent un contenu :

```html
<p class="intro">Bienvenue à l’atelier.</p>
```

- `<p class="intro">` est la balise ouvrante : le nom de l’élément (`p`, paragraphe) et
  ses **attributs** ;
- `class="intro"` est un attribut : un nom, un signe égal, une valeur entre guillemets ;
- `Bienvenue à l’atelier.` est le contenu ;
- `</p>` est la balise fermante, avec une barre oblique.

Certains éléments n’ont jamais de contenu : on les appelle **éléments vides** (void
elements dans la norme). Ils s’écrivent avec une seule balise : `meta`, `link`, `img`,
`br`, `hr`, `input`, entre autres.

```html
<img src="vase.jpg" alt="Vase en grès émaillé bleu">
<br>
```

Tu verras parfois `<br />` avec une barre oblique finale. En HTML, cette barre est
tolérée sur les éléments vides mais n’a aucun effet ; c’est une habitude venue de XHTML.
Choisis une écriture et garde-la dans tout le projet.

Certains attributs sont **booléens** : leur simple présence signifie « vrai », quelle que
soit leur valeur. Par exemple `<input required>` rend un champ obligatoire. Écrire
`required="false"` le rend… obligatoire quand même, car l’attribut est présent. Pour dire
« faux », il faut retirer l’attribut.

:::note[Casse et guillemets]
Les noms d’éléments et d’attributs HTML ne sont pas sensibles à la casse : `<P>` et `<p>`
sont identiques pour le navigateur. La convention largement partagée est d’écrire en
minuscules. Les guillemets autour des valeurs d’attributs sont parfois facultatifs, mais
les mettre toujours évite des erreurs dès qu’une valeur contient une espace.
:::

## L’imbrication : des boîtes dans des boîtes

Les éléments s’emboîtent comme des boîtes : un élément ouvert à l’intérieur d’un autre
doit être fermé avant lui.

```html
<p>Un <strong>mot <em>vraiment</em> important</strong>.</p>
```

Si tu croises les balises, le document est invalide :

```html
<p>Un <strong>mot <em>important</strong> ici</em>.</p>
```

Le navigateur ne refuse pas d’afficher la page : l’analyseur HTML (le parser) applique
des règles de correction définies dans la norme. Pour l’exemple ci-dessus, Chromium
construit ce DOM, visible dans l’onglet « Éléments » des outils de développement :

```text
<p>Un <strong>mot <em>important</em></strong><em> ici</em>.</p>
```

Il a fermé `em` avant `strong`, puis rouvert un second `em`. Le rendu ressemble à ce que
tu voulais, mais l’arbre ne correspond plus à ce que tu as écrit. Sur un cas plus
complexe, la correction automatique peut produire un résultat surprenant. Retiens :
**une page qui s’affiche n’est pas forcément une page valide**.

## La déclaration de type : DOCTYPE

La première ligne, `<!DOCTYPE html>`, n’est pas un élément : c’est la déclaration de type
de document. Elle ne s’écrit qu’une fois, tout en haut, et n’est pas sensible à la casse
(`<!doctype html>` fonctionne aussi).

Son rôle est historique mais toujours important : sans elle, les navigateurs passent en
**mode quirks**, un mode de compatibilité qui imite des comportements anciens et non
standard pour ne pas casser de vieilles pages. Avec elle, ils utilisent le **mode
standard**.

Tu peux le vérifier. Ouvre ta page, puis la console des outils de développement
(touche F12 ou clic droit, « Inspecter », onglet « Console ») et tape :

```js
document.compatMode;
```

Avec le DOCTYPE, la console affiche `'CSS1Compat'` (mode standard). Retire la première
ligne, recharge la page et recommence : tu obtiens `'BackCompat'` (mode quirks). Un oubli
d’une ligne suffit donc à changer la façon dont le CSS sera appliqué.

## L’élément racine et la langue

```html
<html lang="fr">
```

`html` est l’élément racine : tous les autres sont dedans. Son attribut `lang` indique la
langue principale du contenu. Il sert notamment :

- aux lecteurs d’écran, logiciels qui lisent la page à voix haute pour les personnes
  aveugles ou malvoyantes : ils choisissent la voix et la prononciation selon `lang` ;
  sans lui, « Bienvenue » peut être prononcé avec un accent anglais ;
- aux navigateurs, pour proposer la traduction, appliquer la césure ou les guillemets
  adaptés ;
- aux moteurs de recherche, comme indice parmi d’autres.

Les valeurs sont des codes de langue normalisés : `fr`, `en`, `de`, ou plus précis comme
`fr-CA`. Quand un passage est dans une autre langue, tu peux l’indiquer localement :

```html
<p>Le terme anglais <span lang="en">accessibility</span> se traduit par accessibilité.</p>
```

L’élément `span` n’a aucun sens particulier : il sert ici seulement de support à
l’attribut `lang`. Les WCAG 2.2, la norme internationale d’accessibilité du web,
demandent que la langue de la page puisse être déterminée par programme (critère 3.1.1,
niveau A) ainsi que celle des passages dans une autre langue (critère 3.1.2, niveau AA).

## L’en-tête : head

`head` contient des **métadonnées** : des informations sur le document, non affichées
dans la page.

### L’encodage : meta charset

```html
<meta charset="utf-8">
```

Un fichier texte est une suite d’octets. L’**encodage** est la règle qui associe ces
octets à des caractères. UTF-8 sait représenter tous les caractères Unicode (accents,
symbole €, alphabets non latins) et c’est le seul encodage que la norme HTML autorise
pour les documents. Ton éditeur enregistre normalement en UTF-8 ; la balise `meta`
l’annonce au navigateur.

Que se passe-t-il si l’annonce est fausse ? Voici un fichier enregistré en UTF-8 mais
qui déclare un autre encodage :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="windows-1252">
    <title>Café</title>
  </head>
  <body>
    <p>Crème brûlée à 5 €</p>
  </body>
</html>
```

Chromium affiche alors :

```text
Onglet : CafÃ©
Page   : CrÃ¨me brÃ»lÃ©e Ã  5 â‚¬
```

Chaque lettre accentuée occupe deux octets en UTF-8 ; lus comme du windows-1252, ces deux
octets deviennent deux caractères. C’est le fameux « mojibake ». Si tu retires
complètement la balise `meta charset`, le navigateur doit deviner, et la devinette peut
donner le même résultat. La correction est toujours la même : enregistrer en UTF-8 **et**
déclarer `utf-8`.

La norme exige que cette déclaration se trouve entièrement dans les 1024 premiers octets
du document. En pratique : mets-la en **première ligne de `head`**, avant le `title`.

### Le titre : title

```html
<title>Atelier céramique — Accueil</title>
```

Le `title` est obligatoire dans un document HTML normal. Il apparaît dans l’onglet, dans
les favoris et l’historique, et c’est en général le titre affiché dans les résultats d’un
moteur de recherche. Un lecteur d’écran l’annonce quand la page se charge : c’est la
première information reçue par la personne. Les WCAG demandent des titres de page qui
décrivent le sujet ou la finalité (critère 2.4.2, niveau A).

Un bon titre est unique pour chaque page et commence par le plus spécifique :
« Tarifs — Atelier céramique » plutôt que « Atelier céramique — Page 3 ».

### La zone d’affichage : meta viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Sans cette ligne, les navigateurs mobiles affichent la page comme sur un écran large,
puis la réduisent : le texte devient minuscule. Avec elle, la largeur de la page suit la
largeur de l’écran. Tu l’utiliseras dans la compétence sur le responsive ; pour l’instant,
mets-la systématiquement.

### Les autres métadonnées courantes

```html
<meta name="description" content="Cours de céramique pour débutants à Nantes, le soir.">
<link rel="stylesheet" href="styles.css">
<script type="module" src="app.js"></script>
```

- `meta name="description"` résume la page ; les moteurs de recherche peuvent s’en
  servir comme extrait sous le titre (leçon 5) ;
- `link rel="stylesheet"` charge une feuille de style CSS ;
- `script` charge du JavaScript (tu le verras plus tard).

## Le corps : body

`body` contient tout ce qui s’affiche : titres, paragraphes, images, liens, formulaires.
Il n’y a qu’un seul `body`, et rien d’affichable ne doit se trouver dans `head`.

Si tu places un paragraphe dans `head`, le navigateur le déplace. Ce code :

```html
<!DOCTYPE html>
<html>
  <head>
    <title>x</title>
    <p>Bonjour</p>
    <meta name="description" content="d">
  </head>
  <body>
    <p>Corps</p>
  </body>
</html>
```

donne ce DOM dans Chromium (sérialisé sur une ligne, sans les espaces et retours à la
ligne de l’indentation, qui sont conservés comme nœuds de texte) :

```text
<html><head><title>x</title></head><body><p>Bonjour</p><meta name="description" content="d"><p>Corps</p></body></html>
```

Le paragraphe a fermé `head` implicitement ; la balise `meta` qui suivait se retrouve
dans `body`, où elle n’a plus rien à faire. Une seule erreur en a provoqué deux.

## Caractères spéciaux et entités

Le caractère `<` ouvre une balise et `&` ouvre une **référence de caractère** (appelée
aussi entité). Pour afficher ces caractères littéralement, on utilise :

| Tu veux afficher     | Tu écris |
| -------------------- | -------- |
| `<`                  | `&lt;`   |
| `>`                  | `&gt;`   |
| `&`                  | `&amp;`  |
| `"` dans un attribut | `&quot;` |
| une espace insécable | `&nbsp;` |

```html
<p>En HTML, la balise &lt;p&gt; crée un paragraphe. Fish &amp; Chips à 9&nbsp;€.</p>
```

Le navigateur affiche : « En HTML, la balise `<p>` crée un paragraphe. Fish & Chips
à 9 € », sans coupure de ligne entre 9 et €. Avec UTF-8, inutile d’écrire `&eacute;` pour
« é » : tape directement la lettre. Réserve les entités aux caractères qui ont un sens
en HTML ou qui sont invisibles.

:::warning[Échapper, une question de sécurité]
Le jour où ton serveur insérera dans une page un texte saisi par un utilisateur, ce texte
pourra contenir `<script>`. S’il n’est pas échappé (`<` transformé en `&lt;`), le
navigateur l’exécutera : c’est une faille XSS (cross-site scripting). Les moteurs de
gabarits sérieux échappent par défaut. Retiens dès maintenant le principe : **un texte
n’est jamais du HTML tant qu’on ne l’a pas décidé**.
:::

## Espaces, retours à la ligne et commentaires

Dans le contenu, plusieurs espaces, tabulations ou retours à la ligne consécutifs
s’affichent comme **une seule espace**. Ces deux paragraphes s’affichent de la même
façon :

```html
<p>Cours du soir pour débutants.</p>
<p>Cours    du soir
   pour     débutants.</p>
```

Tu peux donc indenter librement ton code pour le rendre lisible : c’est ce que montrent
tous les exemples de ce cours, avec deux espaces par niveau. Pour aller à la ligne dans
le texte affiché, crée un nouveau paragraphe (leçon 2).

Un commentaire s’écrit entre `<!--` et `-->`. Il n’est pas affiché, mais il est visible
par quiconque affiche le code source : n’y mets jamais d’information sensible.

```html
<!-- Section à compléter après la réunion de mardi -->
```

## Pièges courants

- **Oublier le DOCTYPE** : la page passe en mode quirks, le CSS se comporte bizarrement.
  Correction : `<!DOCTYPE html>` en toute première ligne.
- **Placer `meta charset` après le titre ou l’oublier** : risques de mojibake.
  Correction : première ligne de `head`.
- **Un `lang` absent ou faux**, par exemple `lang="en"` laissé par un modèle sur une page
  française. Correction : `lang="fr"` sur `html`.
- **Un `title` générique** (« Document », « Untitled ») laissé par un modèle d’éditeur.
  Correction : un titre spécifique et unique par page.
- **Du contenu dans `head`** : déplacé de force dans `body`, avec des effets en chaîne.
- **Croire qu’une page qui s’affiche est correcte** : le navigateur corrige en silence.
  La leçon 5 t’apprend à valider.

## Exercices

### Exercice 1 — Réparer un squelette

Ce document s’affiche, mais il contient au moins six problèmes. Trouve-les et écris la
version corrigée.

```html
<html lang="en">
  <head>
    <title>Document</title>
    <meta charset="utf-8">
    <h1>Bibliothèque du quartier</h1>
  </head>
  <body>
    <p>Ouverte du mardi au samedi.
  </body>
  <body>
    <p>Fermée le 1er mai.</p>
  </body>
</html>
```

:::solution

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Horaires — Bibliothèque du quartier</title>
  </head>
  <body>
    <h1>Bibliothèque du quartier</h1>
    <p>Ouverte du mardi au samedi.</p>
    <p>Fermée le 1er mai.</p>
  </body>
</html>
```

Les corrections, une par une :

1. Ajout de `<!DOCTYPE html>` : sans lui, mode quirks.
2. `lang="en"` devient `lang="fr"` : le texte est en français.
3. `meta charset` passe en première ligne de `head`.
4. Le `title` « Document » devient un titre spécifique.
5. Le `h1` est du contenu affiché : il passe dans `body`.
6. Le paragraphe non fermé reçoit sa balise `</p>`. Le parser l’aurait fermé tout seul
   ici, mais écrire la fermeture rend le code explicite et évite les surprises.
7. Un seul `body` : les deux paragraphes sont réunis dedans.

L’ajout de `meta viewport` n’était pas une erreur bloquante, mais il fait partie du
squelette attendu.
:::

### Exercice 2 — Une page bilingue

Écris un document complet pour une page « Lexique » en français qui contient un titre et
deux paragraphes. Le second paragraphe cite l’expression allemande « Gesundheit » et
l’expression anglaise « bless you ». Le navigateur et les lecteurs d’écran doivent
connaître la langue de chaque passage.

:::solution

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lexique — Formules de politesse</title>
  </head>
  <body>
    <h1>Lexique des formules de politesse</h1>
    <p>Quand quelqu’un éternue, on lui souhaite souvent « à vos souhaits ».</p>
    <p>
      En allemand, on dit <span lang="de">Gesundheit</span> ;
      en anglais, <span lang="en">bless you</span>.
    </p>
  </body>
</html>
```

`lang="fr"` sur `html` fixe la langue principale. Chaque expression étrangère est
entourée d’un `span` portant son propre `lang` : un lecteur d’écran change alors de
prononciation pour ces mots seulement. Le `span` est choisi parce qu’il n’ajoute aucun
sens ni aucun effet visuel.
:::

### Exercice 3 — Afficher du code dans une page

Écris un paragraphe qui affiche exactement ce texte dans le navigateur :

```text
Pour un lien, écris <a href="..."> & n'oublie pas </a>.
```

:::solution

```html
<p>Pour un lien, écris &lt;a href="..."&gt; &amp; n'oublie pas &lt;/a&gt;.</p>
```

Chaque `<` devient `&lt;` et chaque `>` devient `&gt;` : sinon le navigateur créerait un
vrai lien. Le `&` devient `&amp;` car il pourrait commencer une entité. Les guillemets
n’ont pas besoin d’être échappés ici : ils sont dans le texte, pas dans une valeur
d’attribut.
:::

## Récapitulatif

- Un document commence par `<!DOCTYPE html>`, sans quoi le navigateur passe en mode
  quirks.
- `html lang="fr"` indique la langue principale ; `lang` sur un élément signale un
  passage dans une autre langue.
- `head` contient les métadonnées : `meta charset="utf-8"` en premier, `meta viewport`,
  un `title` spécifique et unique.
- `body` contient tout le contenu affiché, une seule fois.
- Les éléments s’imbriquent sans se croiser ; les éléments vides n’ont pas de balise
  fermante.
- `&lt;`, `&gt;` et `&amp;` affichent les caractères qui ont un sens en HTML.
- Le navigateur corrige les erreurs en silence : une page qui s’affiche n’est pas une
  page valide.
