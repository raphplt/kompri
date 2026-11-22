---
title: 'Les bases de l’accessibilité : alternatives, contraste et clavier'
summary: Rendre une page perceptible et utilisable par tous, avec des alternatives textuelles, des couleurs lisibles et une navigation au clavier complète.
durationMinutes: 50
sources:
  - title: W3C — WCAG 2.2 (en anglais)
    url: https://www.w3.org/TR/WCAG22/
  - title: W3C WAI — Comprendre le critère 1.4.3, contraste minimum (en anglais)
    url: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
  - title: W3C WAI — Arbre de décision pour l’attribut alt (en anglais)
    url: https://www.w3.org/WAI/tutorials/images/decision-tree/
  - title: DINUM — Référentiel général d’amélioration de l’accessibilité (RGAA)
    url: https://accessibilite.numerique.gouv.fr/
---

## Pour qui rend-on une page accessible ?

L’accessibilité numérique consiste à permettre à **toutes** les personnes d’utiliser un
site, quelles que soient leurs capacités et leur façon d’accéder au web. Concrètement :

- des personnes aveugles qui utilisent un lecteur d’écran ou une plage braille ;
- des personnes malvoyantes qui zooment fortement ou modifient les couleurs ;
- des personnes qui ne distinguent pas certaines couleurs ;
- des personnes qui ne peuvent pas utiliser de souris (handicap moteur, tremblements)
  et naviguent au clavier, avec un contacteur ou à la voix ;
- des personnes sourdes ou malentendantes, pour les contenus audio et vidéo ;
- des personnes qui ont des difficultés de lecture, d’attention ou de mémoire.

S’y ajoutent les situations temporaires ou passagères : un bras dans le plâtre, un écran
en plein soleil, une vidéo regardée sans le son dans les transports. Une page accessible
est plus facile à utiliser pour tout le monde.

Les **WCAG 2.2** (Web Content Accessibility Guidelines) organisent leurs exigences autour
de quatre principes : le contenu doit être **perceptible**, **utilisable**,
**compréhensible** et **robuste**. Chaque critère de succès a un niveau : A (le minimum),
AA (le niveau visé par la plupart des obligations légales) ou AAA. En France, le **RGAA**
décline ces critères en tests concrets ; il est publié par la DINUM.

Cette leçon traite de trois piliers : les alternatives textuelles, les couleurs et le
contraste, et le clavier. La leçon suivante aborde ARIA et les tests.

## Les alternatives textuelles

### Rappel : le bon alt pour chaque image

La compétence « HTML sémantique » t’a appris que le `alt` remplit **la même fonction
que l’image** dans son contexte (critère WCAG 1.1.1, niveau A) :

- image informative : le `alt` donne l’information ;
- image décorative : `alt=""` ;
- image dans un lien ou un bouton : le `alt` décrit la destination ou l’action ;
- image de texte : le `alt` reprend le texte.

Le même dessin peut demander des `alt` différents selon son rôle. Une loupe seule dans
un bouton de recherche : `alt="Rechercher"`. La même loupe à côté du texte visible
« Rechercher » dans le bouton : `alt=""`, car le texte suffit et le répéter ferait
entendre « Rechercher Rechercher ».

```html
<!-- Icône seule : elle porte le nom du bouton -->
<button type="submit"><img src="loupe.svg" alt="Rechercher"></button>

<!-- Icône accompagnée de texte : elle devient décorative -->
<button type="submit"><img src="loupe.svg" alt=""> Rechercher</button>
```

### Les images complexes

Un graphique, un schéma ou une carte contiennent trop d’information pour un `alt` de
quelques mots. On combine alors :

1. un `alt` court qui dit ce qu’est l’image et son message principal ;
2. une description complète **dans la page**, visible par tous : un paragraphe, une
   liste ou, souvent le meilleur choix, un tableau de données.

```html
<figure>
  <img src="inscriptions.png"
       alt="Graphique en barres : les inscriptions augmentent chaque trimestre, détail dans le tableau ci-dessous"
       width="640" height="360">
  <figcaption>Inscriptions aux ateliers par trimestre</figcaption>
</figure>
<table>
  <caption>Inscriptions aux ateliers par trimestre</caption>
  <thead>
    <tr><th scope="col">Trimestre</th><th scope="col">Inscriptions</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">1er trimestre</th><td>18</td></tr>
    <tr><th scope="row">2e trimestre</th><td>24</td></tr>
    <tr><th scope="row">3e trimestre</th><td>31</td></tr>
  </tbody>
</table>
```

Le tableau sert à tout le monde : il donne les valeurs exactes que le graphique ne
montre qu’approximativement.

### Les autres alternatives

- **Vidéo** : sous-titres pour les personnes sourdes, et une transcription ou une
  audiodescription quand l’image porte une information non dite.
- **Audio seul** (podcast) : une transcription textuelle.
- **Formulaires** : les étiquettes et les légendes de la leçon 1 sont aussi des
  alternatives textuelles, pour les champs.

## Couleurs et contraste

### Pourquoi le contraste compte

Un texte gris clair sur fond blanc peut sembler élégant ; il est illisible pour beaucoup
de personnes malvoyantes, sur un écran de mauvaise qualité ou en plein soleil. Le
**rapport de contraste** mesure la différence de luminance entre deux couleurs, de 1:1
(aucune différence, blanc sur blanc) à 21:1 (noir sur blanc). Les WCAG définissent la
formule exacte ; tu n’as pas à la calculer à la main, les outils le font.

### Les seuils à connaître (niveau AA)

| Élément                                                     | Rapport minimal | Critère WCAG |
| ----------------------------------------------------------- | --------------- | ------------ |
| Texte normal                                                | 4,5:1           | 1.4.3        |
| Grand texte : au moins 24 px, ou au moins 18,7 px environ en gras | 3:1             | 1.4.3        |
| Composants d’interface (bordure d’un champ, indicateur de focus) et éléments graphiques porteurs de sens | 3:1 | 1.4.11 |

Les WCAG expriment ces tailles en points : au moins 18 points, ou 14 points en gras. Avec
1 point = 4/3 de pixel CSS, cela donne 24 px et environ 18,7 px.
Les logos et le texte purement décoratif sont exemptés.

### Des exemples calculés

Couleurs en notation hexadécimale CSS (`#rrggbb`), rapports calculés avec la formule des
WCAG et arrondis au centième :

| Texte     | Fond      | Rapport | Texte normal | Grand texte |
| --------- | --------- | ------- | ------------ | ----------- |
| `#000000` | `#ffffff` | 21:1    | conforme     | conforme    |
| `#595959` | `#ffffff` | 7:1     | conforme     | conforme    |
| `#767676` | `#ffffff` | 4,54:1  | conforme     | conforme    |
| `#777777` | `#ffffff` | 4,48:1  | **non conforme** | conforme |
| `#999999` | `#ffffff` | 2,85:1  | non conforme | non conforme |
| `#ffffff` | `#2563eb` | 5,17:1  | conforme     | conforme    |
| `#ffffff` | `#ff9800` | 2,16:1  | non conforme | non conforme |

Deux enseignements. D’abord, la frontière est nette : `#767676` passe, `#777777`,
presque identique à l’œil, échoue. Il faut **mesurer**, pas estimer. Ensuite, le texte
blanc sur orange vif, très courant sur les boutons, échoue largement.

Pour la bordure d’un champ de formulaire sur fond blanc, le seuil est 3:1 : `#949494`
donne 3,03:1 (conforme), `#aaaaaa` donne 2,32:1 (non conforme). Un champ dont on ne voit
pas les bords est difficile à repérer.

### Mesurer dans le navigateur

Dans Chrome, l’inspecteur affiche le rapport de contraste d’un texte : sélectionne
l’élément, puis clique sur le petit carré de couleur à côté de la propriété `color` dans
le panneau des styles ; le sélecteur de couleur indique le rapport et s’il respecte les
seuils. Firefox propose une information comparable dans son inspecteur d’accessibilité. Les outils d’audit de la leçon 5 détectent aussi les contrastes
insuffisants.

Un exemple minimal pour expérimenter, avec un élément `style` qui contient du CSS :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Test de contraste</title>
    <style>
      .ok { color: #767676; background-color: #ffffff; }
      .ko { color: #999999; background-color: #ffffff; }
    </style>
  </head>
  <body>
    <p class="ok">Texte gris foncé : rapport 4,54:1.</p>
    <p class="ko">Texte gris clair : rapport 2,85:1.</p>
  </body>
</html>
```

`color` fixe la couleur du texte, `background-color` celle du fond, `.ok` et `.ko`
ciblent les éléments qui ont la classe correspondante. Tu approfondiras le CSS dans la
compétence dédiée.

:::note[Le placeholder]
Le texte d’exemple d’un `placeholder` est grisé par défaut, et son contraste est souvent
insuffisant. C’est une raison de plus pour ne jamais y mettre d’information
indispensable.
:::

### Jamais la couleur seule

Le critère 1.4.1 (niveau A) interdit d’utiliser la couleur comme **seul** moyen de
transmettre une information. Exemples fréquents :

- des champs obligatoires signalés seulement par une étiquette rouge ;
- une erreur signalée seulement par une bordure rouge ;
- des liens dans un paragraphe distingués seulement par leur couleur, sans
  soulignement ;
- un graphique dont les séries ne se distinguent que par la couleur.

La correction consiste à **doubler** la couleur par un autre indice : un texte
(« obligatoire », « Erreur : … »), une icône avec une alternative, un soulignement, un
motif.

## Le clavier

### Qui navigue au clavier ?

Les personnes aveugles (le lecteur d’écran se pilote au clavier), les personnes qui ne
peuvent pas tenir une souris, celles qui utilisent un contacteur ou la commande vocale
(qui simulent souvent des touches), et beaucoup d’utilisateurs avancés. Les WCAG
exigent que **toute** fonctionnalité soit utilisable au clavier (critère 2.1.1, niveau A)
et qu’on ne reste jamais **bloqué** dans un élément (critère 2.1.2, niveau A).

### Les touches essentielles

| Touche              | Effet                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Tab                 | élément interactif suivant                                               |
| Maj + Tab           | élément interactif précédent                                             |
| Entrée              | suivre un lien, activer un bouton, envoyer un formulaire depuis un champ |
| Espace              | activer un bouton, cocher ou décocher une case                           |
| Flèches             | changer de bouton radio dans un groupe, d’option dans une liste          |
| Échap               | fermer une liste déroulante ouverte, une boîte de dialogue               |

Un détail utile : un groupe de boutons radio ne compte que pour **un** arrêt de Tab ;
on change de bouton avec les flèches, ce qui coche le bouton atteint.

### Ce qui reçoit le focus

Le **focus** désigne l’élément qui reçoit les frappes du clavier. Sont atteignables avec
Tab, nativement :

- les liens **qui ont un `href`** ;
- les boutons ;
- les champs de formulaire (`input`, `select`, `textarea`), sauf s’ils sont `disabled`.

Ne sont **pas** atteignables : un `div`, un `span`, un `p`, une image, un `a` sans
`href`. L’ordre de passage suit **l’ordre du code HTML**, pas la position à l’écran.
C’est pourquoi l’ordre du code doit être logique (critère 2.4.3, niveau A).

### Le piège du faux bouton

```html
<!-- Faux bouton -->
<div class="button" onclick="openCart()">Voir le panier</div>

<!-- Vrai bouton -->
<button type="button" onclick="openCart()">Voir le panier</button>
```

L’attribut `onclick` exécute du JavaScript au clic ; tu l’écriras autrement plus tard,
mais le problème est purement HTML. Le `div` :

- n’est pas atteignable avec Tab ;
- ne réagit ni à Entrée ni à Espace ;
- n’est pas annoncé comme un bouton par les lecteurs d’écran.

Le `button` fait tout cela **gratuitement**. Un test dans Chromium le confirme : avec
Tab, le focus saute le `div` et s’arrête sur le `button` ; une fois le focus sur le
`button`, Entrée comme Espace déclenchent l’action. Règle : **un lien pour aller quelque
part, un bouton pour faire quelque chose**, et jamais de `div` cliquable.

### tabindex : à manier avec précaution

L’attribut `tabindex` modifie la capacité d’un élément à recevoir le focus :

- `tabindex="0"` : l’élément entre dans l’ordre de tabulation, à sa place dans le code.
  Rarement nécessaire si l’on utilise les bons éléments ;
- `tabindex="-1"` : l’élément peut recevoir le focus par script (par exemple un titre
  vers lequel on déplace le focus), mais pas avec Tab ;
- une valeur **positive** (`tabindex="1"`, `"2"`…) fait passer l’élément **avant tous
  les autres**. Dans un test, un champ avec `tabindex="1"` placé en bas de la page reçoit
  le focus en premier, avant le menu. C’est presque toujours une erreur : à proscrire.

### Voir où est le focus

Une personne qui navigue au clavier doit **voir** où elle se trouve (critère 2.4.7,
niveau AA). Les navigateurs dessinent par défaut un contour (outline) autour de
l’élément qui a le focus. La pire erreur, malheureusement courante, est de le supprimer
en CSS pour des raisons esthétiques :

```html
<style>
  /* À ne jamais faire sans le remplacer par un indicateur aussi visible */
  :focus { outline: none; }
</style>
```

Si le style par défaut ne convient pas, on le remplace par un indicateur bien contrasté
(au moins 3:1 avec le fond, critère 1.4.11), jamais par rien.

Les WCAG 2.2 ont ajouté deux critères de niveau AA en lien avec le clavier et le
pointeur :

- **2.4.11 Focus non masqué** : l’élément qui a le focus ne doit pas être entièrement
  caché, par exemple par un bandeau fixé en haut de l’écran ;
- **2.5.8 Taille de la cible** : les cibles cliquables mesurent au moins 24 × 24 pixels
  CSS, ou sont assez espacées (avec quelques exceptions, comme les liens dans un texte).

## Pièges courants

- **Un `alt` qui décrit le dessin** d’une icône au lieu de sa fonction
  (`alt="loupe"` au lieu de `alt="Rechercher"`).
- **Répéter le texte** d’un bouton dans le `alt` de son icône.
- **Un graphique avec un `alt` vague** (« graphique ») et aucune donnée dans la page.
- **Estimer le contraste à l’œil**. Correction : mesurer avec l’inspecteur.
- **L’erreur ou le champ obligatoire signalés par la couleur seule**.
- **Un `div` cliquable** au lieu d’un `button`.
- **`tabindex` positif** pour « corriger » l’ordre. Correction : réordonner le HTML.
- **`outline: none`** sans remplacement.

## Exercices

### Exercice 1 — Écrire les alternatives

Pour chaque image, écris l’attribut `alt` adapté et justifie.

1. Le logo du site, seul dans un lien vers l’accueil.
2. Une icône d’enveloppe à côté du texte « contact@example.com » dans un lien `mailto`.
3. Une photo d’ambiance de l’atelier en haut d’un article qui ne la commente pas.
4. Une image contenant le texte « −20 % sur tous les stages jusqu’au 30 juin ».
5. Un bouton qui ne contient qu’une icône en forme de croix et ferme une fenêtre.
6. Un graphique circulaire de la répartition des adhérents par âge.

:::solution
1. Le nom du site suivi de la destination, par exemple `alt="Atelier de Lou, accueil"` :
   l’image est fonctionnelle, son alt est le nom du lien.
2. `alt=""` : le texte du lien suffit ; un alt « enveloppe » ou « e-mail » ferait
   doublon.
3. `alt=""` si la photo est purement décorative ; si elle apporte une information
   (montrer l’ambiance pour donner envie de venir), un alt court la décrit. C’est un
   choix éditorial à justifier.
4. `alt="−20 % sur tous les stages jusqu’au 30 juin"` : une image de texte reprend son
   texte. Mieux : remplacer l’image par du vrai texte stylé en CSS.
5. `alt="Fermer"` : l’action, pas le dessin (« croix »).
6. Un alt court qui donne la nature et le message principal (par exemple « Répartition
   des adhérents par âge, détail dans le tableau ci-dessous »), **et** les données
   complètes dans la page, idéalement dans un tableau.
:::

### Exercice 2 — Contraste conforme ?

Voici des paires de couleurs avec leur rapport mesuré. Pour chacune, dis si elle est
conforme au niveau AA dans la situation indiquée.

1. Texte de paragraphe de 16 px, rapport 4,48:1.
2. Titre de 32 px, rapport 3,2:1.
3. Texte de 20 px en gras, rapport 3,5:1.
4. Texte de 20 px non gras, rapport 3,5:1.
5. Bordure d’un champ de saisie, rapport 2,3:1.
6. Logo de l’entreprise, rapport 2:1.

:::solution
1. Non conforme : texte normal, il faut 4,5:1. 4,48 ne s’arrondit pas à 4,5.
2. Conforme : grand texte (au moins 24 px), seuil 3:1.
3. Conforme : 20 px en gras dépasse les 14 points en gras (environ 18,7 px), c’est du grand texte, seuil 3:1.
4. Non conforme : 20 px non gras est en dessous de 24 px, c’est du texte normal, seuil
   4,5:1.
5. Non conforme : composant d’interface, seuil 3:1 (critère 1.4.11).
6. Conforme : les logos sont exemptés de l’exigence de contraste.
:::

### Exercice 3 — Réparer la navigation au clavier

Cette barre d’outils ne fonctionne qu’à la souris. Explique pourquoi, prédis l’ordre de
tabulation, puis corrige-la.

```html
<div class="toolbar">
  <span class="icon" onclick="printPage()"><img src="print.svg" alt="imprimante"></span>
  <a onclick="share()">Partager</a>
  <a href="/aide.html" tabindex="1">Aide</a>
  <div onclick="addToFavorites()">Ajouter aux favoris</div>
</div>
```

:::solution
Pourquoi : le `span` et le `div` ne reçoivent pas le focus et ne réagissent pas au
clavier ; le `a` sans `href` n’est pas un lien et n’est pas atteignable ; l’image a un
alt qui décrit le dessin, pas l’action.

Ordre de tabulation actuel : seul « Aide » est atteignable, et il passe **avant tout le
reste de la page** à cause de `tabindex="1"`.

```html
<div class="toolbar">
  <button type="button" onclick="printPage()"><img src="print.svg" alt="Imprimer"></button>
  <button type="button" onclick="share()">Partager</button>
  <a href="/aide.html">Aide</a>
  <button type="button" onclick="addToFavorites()">Ajouter aux favoris</button>
</div>
```

- Les trois actions deviennent des `button` : focus, Entrée, Espace et rôle annoncé
  sans rien ajouter.
- « Partager » est une action, pas une navigation : bouton, pas lien.
- « Aide » mène à une page : c’est un vrai lien, avec `href` et sans `tabindex`.
- L’alt de l’icône décrit l’action « Imprimer ».
- L’ordre de tabulation suit maintenant l’ordre du code : Imprimer, Partager, Aide,
  Ajouter aux favoris.
:::

## Récapitulatif

- L’accessibilité concerne de nombreuses situations, permanentes ou temporaires ; les
  WCAG 2.2 (niveau AA) et, en France, le RGAA en fixent les exigences.
- Le `alt` remplit la fonction de l’image dans son contexte ; les images complexes ont
  en plus une description dans la page.
- Contraste AA : 4,5:1 pour le texte normal, 3:1 pour le grand texte et pour les
  composants d’interface. On mesure, on n’estime pas.
- Jamais d’information transmise par la couleur seule.
- Tout doit fonctionner au clavier : liens avec `href`, `button`, champs natifs ; pas de
  `div` cliquable.
- L’ordre de tabulation suit le code ; pas de `tabindex` positif.
- Le focus doit rester visible : jamais d’`outline: none` sans remplacement.
