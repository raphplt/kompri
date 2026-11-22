---
title: Texte, listes, liens et images
summary: Choisir l’élément qui correspond au sens du contenu, pas à son apparence.
durationMinutes: 50
sources:
  - title: WHATWG — Sémantique au niveau du texte
    url: https://html.spec.whatwg.org/multipage/text-level-semantics.html
  - title: WHATWG — Regroupement de contenu
    url: https://html.spec.whatwg.org/multipage/grouping-content.html
  - title: MDN — L’élément img
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/img
  - title: W3C WAI — Arbre de décision pour l’attribut alt (en anglais)
    url: https://www.w3.org/WAI/tutorials/images/decision-tree/
---

## Le sens d’abord, l’apparence ensuite

Imagine deux pages qui se ressemblent parfaitement à l’écran. Dans la première, le titre
est un `h1` et les étapes d’une recette forment une liste numérotée `ol`. Dans la seconde,
tout est fait avec des paragraphes mis en gras et des numéros tapés à la main.

Pour une personne voyante, aucune différence. Pour un lecteur d’écran, la première page
annonce un titre de niveau 1 puis une liste de 4 éléments (la formulation exacte dépend
du logiciel) et permet de sauter d’un titre à l’autre ; la seconde n’est qu’un long flot de texte. Pour un moteur de recherche, la
première dit clairement quel est le sujet de la page. Pour toi dans six mois, la première
se modifie sans casser la numérotation.

C’est le principe du **HTML sémantique** : chaque élément porte un **sens** (titre,
liste, lien, citation…). L’apparence est le travail du CSS, qui peut tout changer : un
`h1` peut être petit, une liste peut perdre ses puces. On choisit donc l’élément d’après
ce qu’est le contenu, jamais d’après le rendu par défaut du navigateur.

## Les titres : h1 à h6

Il existe six niveaux de titres, de `h1` (le plus important) à `h6`. Ils forment le
**plan** de la page, comme la table des matières d’un livre :

```html
<h1>Recettes de crêpes</h1>
  <h2>Crêpes sucrées</h2>
    <h3>Crêpes au sucre</h3>
    <h3>Crêpes à la confiture</h3>
  <h2>Galettes salées</h2>
    <h3>Galette complète</h3>
```

L’indentation n’a aucun effet : elle montre seulement la hiérarchie.

Les règles d’usage, largement partagées et reprises par les référentiels d’accessibilité :

- un seul `h1` par page, qui décrit le sujet principal (c’est une recommandation forte,
  pas une interdiction de la norme) ;
- **ne pas sauter de niveau** en descendant : après un `h2`, le titre suivant de rang
  inférieur est un `h3`, pas un `h4` ;
- on peut remonter de plusieurs niveaux d’un coup : un `h2` peut suivre un `h4` ;
- **ne jamais choisir un niveau pour sa taille** : si un titre te semble trop gros, c’est
  au CSS de le réduire.

Pourquoi c’est si important ? Les utilisateurs de lecteurs d’écran naviguent très souvent
de titre en titre pour survoler une page, exactement comme tu parcours les intertitres
d’un article des yeux. Un plan cohérent leur permet de comprendre la structure sans tout
écouter.

## Paragraphes et séparations

```html
<p>L’atelier ouvre ses portes en septembre.</p>
<p>Les inscriptions se font sur place, le samedi matin.</p>
```

Un `p` est un paragraphe : un bloc de texte cohérent. Le navigateur ajoute un espace
vertical entre deux paragraphes ; pour séparer deux idées, crée deux `p`, n’empile pas
des `br`.

L’élément `br` force un retour à la ligne **dans** un texte où la coupure fait partie du
contenu : une adresse postale, un poème.

```html
<p>
  Atelier de Lou<br>
  12 rue des Potiers<br>
  44000 Nantes
</p>
```

L’élément `hr` marque un changement de thème entre deux paragraphes (une scène qui change
dans un récit, par exemple). Ce n’est pas un trait décoratif : pour un simple trait, on
utilise une bordure CSS.

## L’emphase et le texte particulier

Ces éléments s’utilisent à l’intérieur d’un paragraphe ou d’un titre.

| Élément  | Sens                                                              | Exemple d’usage                                  |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `strong` | importance, gravité ou urgence                                    | « **Ne débranchez pas** pendant la mise à jour » |
| `em`     | accent d’insistance qui change le sens de la phrase               | « Je n’ai pas dit _demain_. »                    |
| `b`      | attirer l’attention sans ajouter d’importance                     | mots-clés d’un résumé                            |
| `i`      | texte d’une autre nature : terme technique, pensée, nom de bateau | le terme _mise en cache_                         |
| `mark`   | passage surligné pour sa pertinence dans le contexte              | mots trouvés par une recherche                   |
| `small`  | mentions annexes, petits caractères                               | mentions légales                                 |
| `code`   | fragment de code informatique                                     | la fonction `parseInt`                           |
| `kbd`    | saisie clavier                                                    | appuie sur Ctrl + C                              |
| `abbr`   | abréviation ou sigle                                              | HTML                                             |
| `time`   | date ou heure, lisible par une machine via `datetime`             | le 14 mars à 19 h                                |

```html
<p>
  <strong>Attention :</strong> le four doit être <em>éteint</em> avant le
  nettoyage. Le cours a lieu le
  <time datetime="2026-03-14T19:00">14 mars à 19 h</time>. Copie le fichier avec
  <kbd>Ctrl</kbd> + <kbd>C</kbd>.
</p>
```

Par défaut, `strong` et `b` s’affichent en gras, `em` et `i` en italique. Le rendu est le
même, le sens ne l’est pas. Pose-toi la question : « si je lisais ce texte à voix haute,
est-ce que je changerais d’intonation (`em`) ? est-ce que c’est un avertissement
(`strong`) ? ou est-ce juste une convention typographique (`i`, `b`) ? »

Pour `abbr`, l’attribut `title` affiche une infobulle au survol de la souris, mais il
n’est ni accessible au clavier ni lu de façon fiable par les lecteurs d’écran. La bonne
pratique reste de développer le sigle dans le texte à sa première occurrence :

```html
<p>
  Le <abbr title="World Wide Web Consortium">W3C</abbr> (World Wide Web
  Consortium) publie les recommandations d’accessibilité.
</p>
```

## Citations et code sur plusieurs lignes

- `blockquote` : citation longue, en bloc ; l’attribut `cite` peut donner l’URL source ;
- `q` : citation courte dans une phrase, le navigateur ajoute les guillemets ;
- `cite` : le **titre** d’une œuvre (livre, film, article), pas le nom de l’auteur ;
- `pre` : texte préformaté, dont les espaces et retours à la ligne sont conservés à
  l’affichage. Combiné à `code` pour un bloc de code.

```html
<blockquote cite="https://example.com/entretien">
  <p>On apprend la céramique en ratant des centaines de bols.</p>
</blockquote>
<p>— Lou, dans <cite>Le Journal des ateliers</cite></p>

<pre><code>const bowls = 100;
console.log(bowls);</code></pre>
```

## Les listes

### Listes non ordonnées et ordonnées

Utilise `ul` (unordered list) quand l’ordre n’a pas d’importance, `ol` (ordered list)
quand il en a. Chaque élément est un `li`.

```html
<h2>Ingrédients</h2>
<ul>
  <li>250 g de farine</li>
  <li>4 œufs</li>
  <li>50 cl de lait</li>
</ul>

<h2>Préparation</h2>
<ol>
  <li>Verser la farine dans un saladier.</li>
  <li>Ajouter les œufs et mélanger.</li>
  <li>Incorporer le lait petit à petit.</li>
</ol>
```

Le navigateur numérote automatiquement la liste `ol` : si tu insères une étape, la
numérotation suit. `ol` accepte des attributs utiles : `start="5"` pour commencer à 5,
`reversed` pour compter à rebours.

**Règle de structure** : les seuls enfants directs autorisés de `ul` et `ol` sont des
`li` (plus `script` et `template`, que tu verras plus tard). Pour une sous-liste, place-la
**dans** un `li` :

```html
<ul>
  <li>
    Fruits
    <ul>
      <li>Pommes</li>
      <li>Poires</li>
    </ul>
  </li>
  <li>Légumes</li>
</ul>
```

Un `p` ou un `div` directement dans un `ul` est invalide. Le navigateur, cette fois, ne
corrige rien : il garde l’arbre tel quel, et la liste annoncée par un lecteur d’écran
peut être faussée.

### Listes de descriptions

`dl` (description list) associe des termes `dt` à leurs descriptions `dd` : glossaire,
fiche technique, questions-réponses.

```html
<dl>
  <dt>Grès</dt>
  <dd>Argile cuite à haute température, imperméable.</dd>
  <dt>Faïence</dt>
  <dd>Argile cuite à plus basse température, poreuse sans émail.</dd>
</dl>
```

Un terme peut avoir plusieurs descriptions, et plusieurs termes peuvent partager une
description.

## Les liens

### Anatomie d’un lien

```html
<a href="https://developer.mozilla.org/fr/">Documentation MDN</a>
```

L’élément `a` (anchor) devient un lien grâce à son attribut `href`. Sans `href`, ce n’est
plus un lien : il n’est ni cliquable vers une adresse, ni atteignable avec la touche
Tabulation. Le contenu de l’élément est le **texte du lien**, celui qui est lu et cliqué.

### Les différentes cibles

```html
<!-- URL absolue : autre site -->
<a href="https://www.w3.org/WAI/">Initiative pour l’accessibilité du W3C</a>

<!-- Chemin relatif : fichier situé dans le même dossier que la page -->
<a href="tarifs.html">Nos tarifs</a>

<!-- Chemin relatif : fichier dans un sous-dossier -->
<a href="cours/debutants.html">Cours débutants</a>

<!-- Chemin relatif au dossier parent -->
<a href="../index.html">Retour à l’accueil</a>

<!-- Chemin depuis la racine du site (commence par /) -->
<a href="/contact.html">Contact</a>

<!-- Fragment : élément de la même page qui a id="horaires" -->
<a href="#horaires">Voir les horaires</a>

<!-- Messagerie et téléphone -->
<a href="mailto:contact@example.com">Écrire à l’atelier</a>
<a href="tel:+33200000000">Appeler l’atelier</a>
```

Pour le fragment, la cible doit porter l’identifiant correspondant :
`<h2 id="horaires">Horaires</h2>`. Un `id` est **unique** dans la page.

:::tip[Tester un lien relatif]
Ouvre ta page localement, clique sur le lien et regarde la barre d’adresse : elle
montre le chemin complet calculé à partir de la page courante. Un lien relatif cassé
donne une page « fichier introuvable » ; c’est l’erreur la plus fréquente quand on
déplace des fichiers.
:::

### Un texte de lien qui a du sens hors contexte

Les lecteurs d’écran proposent la liste de tous les liens de la page. Une liste de
« cliquez ici », « en savoir plus », « ici » est inutilisable. Les WCAG demandent que la
fonction de chaque lien soit compréhensible à partir de son texte ou de son contexte
(critère 2.4.4, niveau A) ; un texte explicite à lui seul est la solution la plus sûre.

```html
<!-- À éviter -->
<p>Pour consulter nos tarifs, <a href="tarifs.html">cliquez ici</a>.</p>

<!-- Mieux -->
<p>Consulte <a href="tarifs.html">nos tarifs 2026–2027</a>.</p>
```

« Cliquez » suppose d’ailleurs une souris, alors que beaucoup de personnes naviguent au
clavier, au doigt ou à la voix.

### Ouvrir dans un nouvel onglet ?

`target="_blank"` ouvre le lien dans un nouvel onglet. Utilise-le avec parcimonie : la
personne perd le bouton « Précédent » et peut être désorientée. Si tu l’utilises, préviens
dans le texte du lien, par exemple « Règlement (PDF, nouvel onglet) ».

Historiquement, une page ouverte ainsi pouvait agir sur la page d’origine via
`window.opener` ; on ajoutait donc `rel="noopener"`. Les navigateurs actuels appliquent
ce comportement par défaut avec `target="_blank"`, mais ajouter `rel="noopener"` reste
inoffensif et explicite.

### Lien ou bouton ?

Un lien **mène quelque part** (une autre page, une autre partie de la page). Un bouton
**déclenche une action** (envoyer un formulaire, ouvrir un menu). Tu verras `button` dans
la compétence sur les formulaires ; retiens déjà qu’un lien avec `href="#"` qui sert de
bouton est un signal d’alarme.

## Les images

### L’élément img et son texte de remplacement

```html
<img
  src="images/bol-gres.jpg"
  alt="Bol en grès brun aux bords irréguliers"
  width="600"
  height="400">
```

- `src` : l’adresse de l’image (mêmes règles de chemins que pour les liens) ;
- `alt` : le **texte de remplacement**, lu par les lecteurs d’écran, affiché si l’image
  ne se charge pas, utilisé par les moteurs de recherche ;
- `width` et `height` : les dimensions intrinsèques en pixels, **sans unité**. Elles
  permettent au navigateur de réserver la place de l’image avant son téléchargement :
  le texte ne « saute » plus quand l’image arrive.

### Écrire un bon alt

Le texte de remplacement doit **remplir la même fonction que l’image** dans son
contexte. Ce n’est pas toujours une description.

1. **Image informative** : elle apporte une information. Le `alt` donne cette
   information, brièvement. Pas besoin de commencer par « image de » : le lecteur d’écran
   annonce déjà qu’il s’agit d’une image.
2. **Image décorative** : elle n’apporte rien au contenu (motif, illustration
   d’ambiance redondante avec le texte). On écrit `alt=""`, un alt **vide** : les lecteurs
   d’écran l’ignorent complètement.
3. **Image fonctionnelle** : elle est seule dans un lien ou un bouton. Le `alt` décrit
   **la destination ou l’action**, pas le dessin : `alt="Accueil de l’atelier"` pour un
   logo cliquable, pas `alt="Logo"`.
4. **Image contenant du texte** : le `alt` reprend le texte. Mieux encore, évite les
   images de texte et écris du vrai texte.

```html
<!-- Informative -->
<img src="plan-acces.png" alt="Entrée par la cour, deuxième porte à gauche">

<!-- Décorative : alt vide, attribut présent -->
<img src="frise.png" alt="">

<!-- Fonctionnelle : le logo est un lien vers l’accueil -->
<a href="/"><img src="logo.svg" alt="Atelier de Lou, accueil"></a>
```

:::warning[alt vide n’est pas alt absent]
`alt=""` dit « cette image est décorative, ignore-la ». **L’absence** de l’attribut `alt`
est une erreur : la norme exige l’attribut dans presque tous les cas, et selon le lecteur
d’écran, la personne entend alors le nom du fichier (« i m g underscore 4 0 3 2 point
j p g ») ou un simple « image » sans information.
:::

### Image avec légende : figure et figcaption

Quand une image (ou un schéma, un extrait de code) est référencée par le texte et
accompagnée d’une légende, regroupe-les dans `figure` :

```html
<figure>
  <img
    src="four.jpg"
    alt="Four électrique ouvert, trois étagères chargées de bols"
    width="800"
    height="600">
  <figcaption>
    Le four de l’atelier, chargé pour une cuisson de biscuit.
  </figcaption>
</figure>
```

La légende est visible par tous et associée à la figure. Elle ne remplace pas le `alt` :
l’une complète l’autre, sans les répéter mot pour mot.

## Pièges courants

- **Choisir un titre pour sa taille** (`h4` parce que « c’est plus petit »).
  Correction : le niveau suit la hiérarchie ; la taille se règle en CSS.
- **Des `br` pour espacer** des blocs. Correction : des paragraphes, puis du CSS.
- **Des tirets ou numéros tapés à la main** au lieu de `ul` ou `ol`.
- **Un `div` ou un `p` directement dans un `ul`**. Correction : tout passe dans des `li`.
- **« Cliquez ici »** comme texte de lien. Correction : un texte qui décrit la
  destination.
- **Oublier `alt`** ou écrire `alt="image"`. Correction : un alt utile, ou `alt=""`
  pour une image décorative.
- **Confondre `strong` et `b`, `em` et `i`** : même rendu, sens différent.

## Exercices

### Exercice 1 — Baliser une fiche recette

Voici le contenu brut d’une page. Écris le `body` complet en choisissant les bons
éléments. Le lien vers la page des galettes est dans le même dossier
(`galettes.html`). La photo `crepes.jpg` (800 × 533 pixels) montre une pile de crêpes
dorées sur une assiette.

```text
Crêpes de Lou
[photo]
Pour 12 crêpes. Préparation : 10 minutes. Repos : 1 heure.
Ingrédients : 250 g de farine, 4 œufs, 50 cl de lait, 1 pincée de sel.
Étapes : 1. Mélanger la farine et le sel. 2. Ajouter les œufs. 3. Verser le lait petit
à petit. 4. Laisser reposer 1 heure.
Important : ne saute pas le repos, la pâte serait élastique.
Tu préfères le salé ? Découvre nos galettes.
```

:::solution

```html
<body>
  <h1>Crêpes de Lou</h1>
  <img
    src="crepes.jpg"
    alt="Pile de crêpes dorées sur une assiette"
    width="800"
    height="533">
  <p>Pour 12 crêpes. Préparation : 10 minutes. Repos : 1 heure.</p>

  <h2>Ingrédients</h2>
  <ul>
    <li>250 g de farine</li>
    <li>4 œufs</li>
    <li>50 cl de lait</li>
    <li>1 pincée de sel</li>
  </ul>

  <h2>Étapes</h2>
  <ol>
    <li>Mélanger la farine et le sel.</li>
    <li>Ajouter les œufs.</li>
    <li>Verser le lait petit à petit.</li>
    <li>Laisser reposer 1 heure.</li>
  </ol>

  <p>
    <strong>Important :</strong> ne saute pas le repos, la pâte serait
    élastique.
  </p>
  <p>
    Tu préfères le salé ? Découvre
    <a href="galettes.html">nos recettes de galettes</a>.
  </p>
</body>
```

- Un seul `h1` pour le sujet, puis deux `h2` de même niveau : le plan est cohérent.
- Les ingrédients n’ont pas d’ordre : `ul`. Les étapes en ont un : `ol`, et les numéros
  tapés à la main disparaissent, le navigateur les génère.
- La photo est informative : son alt décrit ce qu’elle montre. Si la page contenait déjà
  la même description dans le texte, `alt=""` serait défendable.
- « Important » est un avertissement : `strong`.
- Le texte du lien décrit la destination ; « Découvre nos galettes » aurait aussi
  convenu, à condition que le lien porte sur les mots qui ont du sens.

:::

### Exercice 2 — Le bon élément

Pour chaque phrase, indique l’élément à utiliser pour la partie entre crochets, et
pourquoi.

1. « Le mot [Wi-Fi] est une marque déposée. »
2. « [Danger :] ne jamais ouvrir le four en cours de cuisson. »
3. « Tu as dit que tu venais [mardi], pas mercredi ! »
4. « Lis [Le Petit Prince] avant la prochaine séance. »
5. « Appuie sur [Échap] pour fermer la fenêtre. »
6. Un logo cliquable qui mène à la page d’accueil.

:::solution

1. `i` : c’est un terme considéré pour lui-même, un texte d’une autre nature ; pas
   d’importance particulière. On pourrait aussi ne rien mettre du tout.
2. `strong` : c’est un avertissement, une information grave.
3. `em` : l’accent d’insistance porte le sens de la phrase (mardi, et pas un autre jour).
4. `cite` : c’est le titre d’une œuvre.
5. `kbd` : c’est une touche du clavier à presser.
6. `a href="/"` contenant `img` avec un alt qui décrit la destination, par exemple
   `alt="Accueil"` ou le nom du site suivi de « accueil ». Un alt « logo » ne dit pas où
   mène le lien.

:::

### Exercice 3 — Réécrire des liens

Réécris ce paragraphe pour que chaque lien ait un texte explicite hors contexte :

```html
<p>
  Notre règlement est disponible <a href="reglement.pdf">ici</a>.
  Pour les horaires, <a href="#horaires">cliquez ici</a>.
  <a href="https://www.w3.org/WAI/">En savoir plus</a>.
</p>
```

:::solution

```html
<p>
  Consulte <a href="reglement.pdf">le règlement de l’atelier (PDF)</a>.
  Vérifie <a href="#horaires">les horaires d’ouverture</a>.
  Découvre <a href="https://www.w3.org/WAI/">l’initiative pour l’accessibilité du W3C</a>.
</p>
```

Chaque texte de lien, lu seul dans une liste de liens, dit où il mène. On signale le
format PDF parce qu’ouvrir un PDF n’est pas la même expérience qu’ouvrir une page web. Le
mot « cliquez » disparaît : il exclut les personnes qui n’utilisent pas de souris.
:::

## Récapitulatif

- On choisit un élément pour son **sens** ; le CSS s’occupe de l’apparence.
- Les titres `h1` à `h6` forment le plan : un `h1`, pas de niveau sauté en descendant.
- `p` pour les paragraphes ; `br` seulement quand la coupure fait partie du contenu.
- `strong` (importance), `em` (insistance), `i` et `b` (convention typographique) ont
  un rendu proche mais un sens différent.
- `ul` sans ordre, `ol` avec ordre, `dl` pour des paires terme–description ; seuls des
  `li` dans `ul` et `ol`.
- Un lien a un `href` et un texte qui décrit sa destination.
- Toute image a un `alt` : informatif, fonctionnel, ou vide (`alt=""`) si elle est
  décorative. `width` et `height` réservent sa place.
