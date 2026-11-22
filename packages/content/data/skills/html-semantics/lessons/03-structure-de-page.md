---
title: Structurer une page avec les éléments de section
summary: Découper une page en zones qui ont un sens avec header, nav, main, article, section, aside et footer.
durationMinutes: 45
sources:
  - title: WHATWG — Les sections
    url: https://html.spec.whatwg.org/multipage/sections.html
  - title: WHATWG — L’élément main
    url: https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element
  - title: W3C — HTML Accessibility API Mappings (en anglais)
    url: https://www.w3.org/TR/html-aam-1.0/
---

## Le problème de la « soupe de div »

Ouvre le code source de nombreux sites et tu trouveras ceci :

```html
<div class="header">
  <div class="logo">Atelier de Lou</div>
  <div class="menu">
    <div><a href="/">Accueil</a></div>
    <div><a href="/cours.html">Cours</a></div>
  </div>
</div>
<div class="content">
  <div class="post">…</div>
</div>
<div class="footer">© Atelier de Lou</div>
```

Pour un humain qui lit les noms de classes, c’est clair. Pour le navigateur, c’est une
pile de boîtes sans signification : `div` est un élément **générique**, qui ne dit rien de
son contenu. Les noms de classes n’ont aucun sens pour lui.

Or les lecteurs d’écran proposent de sauter directement au menu, au contenu principal ou
au pied de page. Ils s’appuient pour cela sur des **repères** (landmarks en anglais) que
le navigateur déduit des éléments de section HTML. Avec la soupe de `div`, il n’y a aucun
repère : la personne doit tout écouter depuis le début, menu compris, sur chaque page.

## Les éléments de structure

| Élément   | Sens                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `header`  | en-tête introductif : logo, titre, outils de recherche, parfois le menu |
| `nav`     | bloc de liens de navigation **principaux**                              |
| `main`    | contenu principal et unique de la page                                  |
| `article` | contenu autonome, qui aurait du sens seul : billet, commentaire, fiche  |
| `section` | regroupement thématique, en général avec son propre titre               |
| `aside`   | contenu annexe, lié de façon indirecte au contenu qui l’entoure         |
| `footer`  | pied : auteur, mentions, liens secondaires, droits                      |
| `div`     | boîte générique sans sens, pour la mise en forme                        |

## Une page complète

Enregistre ce fichier sous `index.html` et ouvre-le :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Journal de l’atelier — Atelier de Lou</title>
  </head>
  <body>
    <a href="#contenu">Aller au contenu</a>

    <header>
      <p>Atelier de Lou</p>
      <nav aria-label="Principale">
        <ul>
          <li><a href="/">Accueil</a></li>
          <li><a href="/cours.html">Cours</a></li>
          <li><a href="/journal.html" aria-current="page">Journal</a></li>
        </ul>
      </nav>
    </header>

    <main id="contenu">
      <h1>Journal de l’atelier</h1>

      <article>
        <header>
          <h2>Première cuisson au bois</h2>
          <p>
            Publié le <time datetime="2026-02-10">10 février 2026</time> par Lou
          </p>
        </header>
        <p>Nous avons enfin testé le four à bois du jardin…</p>

        <section>
          <h3>Ce qui a fonctionné</h3>
          <p>La montée en température a été régulière.</p>
        </section>
        <section>
          <h3>Ce qu’on changera</h3>
          <p>Il faudra du bois plus sec.</p>
        </section>

        <footer>
          <p>Classé dans : cuissons</p>
        </footer>
      </article>

      <aside>
        <h2>Prochain stage</h2>
        <p>Initiation au tour, les 7 et 8 mars.</p>
      </aside>
    </main>

    <footer>
      <p>© Atelier de Lou</p>
      <nav aria-label="Liens secondaires">
        <ul>
          <li><a href="/mentions-legales.html">Mentions légales</a></li>
          <li><a href="/accessibilite.html">Accessibilité</a></li>
        </ul>
      </nav>
    </footer>
  </body>
</html>
```

Visuellement, rien d’extraordinaire : le navigateur n’applique presque aucun style à ces
éléments. Toute la différence est dans l’**arbre d’accessibilité**, la version de la page
que le navigateur transmet aux technologies d’assistance. Dans Chrome, ouvre les outils
de développement, onglet « Éléments », puis le panneau « Accessibilité » : en
sélectionnant chaque élément, tu vois son **rôle**. Voici ce que Chromium calcule pour
cette page :

| Élément dans le code                  | Rôle exposé                          |
| ------------------------------------- | ------------------------------------ |
| `header` enfant de `body`             | `banner` (repère)                    |
| `nav aria-label="Principale"`         | `navigation` « Principale » (repère) |
| `main`                                | `main` (repère)                      |
| `article`                             | `article`                            |
| `header` et `footer` dans l’`article` | aucun rôle de repère                 |
| `section` sans nom                    | aucun rôle de repère                 |
| `aside`                               | `complementary` (repère)             |
| `footer` enfant de `body`             | `contentinfo` (repère)               |

Un lecteur d’écran peut donc annoncer ces zones (bannière, navigation « Principale »,
contenu principal, contenu complémentaire, pied de page ; la formulation exacte dépend du
logiciel) et proposer d’y sauter directement.

## Chaque élément en détail

### header

`header` regroupe l’introduction d’une page ou d’une section : nom du site, logo, titre,
champ de recherche. Il peut y en avoir plusieurs dans une page. **Seul** un `header` qui
n’est pas à l’intérieur d’un `article`, `aside`, `main`, `nav` ou `section` devient le
repère « bannière » du site. Le `header` d’un article est simplement son en-tête.

`header` n’est pas un titre : il **contient** souvent un titre (`h1`, `h2`…), qui reste
indispensable.

### nav

`nav` est réservé aux **blocs de navigation majeurs** : menu principal, fil d’Ariane,
table des matières, pagination. Trois liens au détour d’un paragraphe ne sont pas une
navigation.

Quand une page contient plusieurs `nav`, donne à chacune un nom avec l’attribut
`aria-label` pour que les lecteurs d’écran puissent les distinguer (« navigation
Principale », « navigation Liens secondaires »). C’est ta première rencontre avec un
attribut ARIA (Accessible Rich Internet Applications) : une famille d’attributs qui
complètent la sémantique HTML. Tu verras dans la compétence suivante pourquoi il faut
les utiliser avec parcimonie ; ici, c’est l’usage recommandé.

L’attribut `aria-current="page"` signale, dans un menu, le lien de la page courante.

### main

`main` contient le **contenu principal**, celui qui change d’une page à l’autre, sans le
bandeau, les menus ni le pied de page répétés partout.

- Il ne doit y avoir qu’**un seul** `main` visible dans la page.
- Il ne se place pas dans un `article`, `aside`, `header`, `footer` ou `nav` : il est
  normalement enfant de `body` (éventuellement dans un `div`).

### article

Un `article` est un contenu **autonome** : il garderait son sens s’il était extrait de
la page et publié ailleurs (dans un flux d’actualités, par exemple). Billets de blog,
commentaires, fiches produits, cartes d’un catalogue, messages d’un forum sont des
articles. Un article peut contenir son propre `header`, ses `section` et son `footer`,
et des articles peuvent s’imbriquer : les commentaires d’un billet sont des `article`
dans l’`article` du billet.

### section

Une `section` regroupe un contenu **thématique**, qui forme une partie d’un tout. Elle
commence en général par un titre qui dit de quoi elle parle. Les chapitres d’un article,
les blocs « Tarifs », « Horaires », « Contact » d’une page d’accueil sont des sections.

Une `section` sans nom n’est pas un repère : elle sert surtout à structurer le code et le
plan. Si tu veux en faire un repère « région », associe-lui son titre avec
`aria-labelledby` :

```html
<section aria-labelledby="titre-tarifs">
  <h2 id="titre-tarifs">Tarifs</h2>
  <p>Cours d’essai gratuit.</p>
</section>
```

Chromium expose alors une `region` nommée « Tarifs ». Fais-le pour quelques sections
vraiment importantes, pas pour toutes : trop de repères tuent les repères.

### aside

`aside` contient un contenu **tangentiel** : encadré « à lire aussi », définition,
publicité, biographie de l’auteur. Le critère est le sens, pas la position : une colonne
de droite n’est pas forcément un `aside`, et un `aside` peut s’afficher n’importe où.

### footer

`footer` contient les informations de pied d’une page ou d’une section : auteur,
droits, mentions légales, liens secondaires. Comme pour `header`, seul un `footer` qui
n’est pas dans un `article`, `aside`, `main`, `nav` ou `section` devient le repère
« informations sur le contenu » (rôle `contentinfo`).

### div et span

`div` (bloc) et `span` (en ligne) n’ont **aucun sens**. Ils restent indispensables pour
regrouper des éléments à mettre en forme avec le CSS. Utilise-les **quand aucun autre
élément ne convient**, pas par défaut.

## Choisir entre article, section, aside et div

Pose-toi les questions dans cet ordre :

1. Ce contenu aurait-il du sens **seul**, extrait de la page ? → `article`.
2. Est-il **annexe** au contenu qui l’entoure ? → `aside`.
3. Est-ce une **partie thématique** avec un titre ? → `section`.
4. Ai-je seulement besoin d’une boîte pour le style ? → `div`.

Ces choix demandent parfois du jugement, et deux développeurs compétents peuvent hésiter
entre `article` et `section` pour une carte de présentation. Ce qui est attendu de toi,
c’est de **justifier** ton choix avec ces critères. En revanche, utiliser `section` à la
place de chaque `div` est une erreur : `section` annonce un thème, il doit avoir un titre.

## Le lien d’évitement

Le premier lien de la page d’exemple, `Aller au contenu`, pointe vers `#contenu`,
l’identifiant de `main`. Une personne qui navigue au clavier évite ainsi de traverser tout
le menu à chaque page. Les WCAG demandent un mécanisme pour contourner les blocs répétés
(critère 2.4.1, niveau A) : les repères et les titres y contribuent, le lien d’évitement
est la solution la plus directe pour les personnes qui utilisent seulement le clavier.
En CSS, on le masque souvent jusqu’à ce qu’il reçoive le focus ; tu le verras plus tard.

## Titres et sections

Chaque `section`, `article` ou `aside` devrait commencer par un titre. Son **niveau**
dépend de sa place dans le plan général : dans l’exemple, l’article a un `h2` (il est
sous le `h1` de la page), ses sections des `h3`.

:::warning[Pas de niveau de titre automatique]
Tu liras peut-être qu’un `h1` dans chaque `section` serait automatiquement « rétrogradé »
selon l’imbrication. Les navigateurs et les lecteurs d’écran ne font pas ce calcul : un
`h1` est annoncé comme titre de niveau 1, où qu’il soit. Choisis toujours le niveau
explicitement.
:::

## Pièges courants

- **La soupe de `div`** : aucun repère. Correction : les éléments de section.
- **`section` partout à la place de `div`** : des thèmes sans titre. Correction : `div`
  pour les boîtes de style.
- **Plusieurs `main`**, ou `main` dans un `article`. Correction : un seul `main`,
  enfant de `body`.
- **`nav` autour de n’importe quel groupe de liens**. Correction : réserver `nav` aux
  navigations principales et nommer chaque `nav` quand il y en a plusieurs.
- **`aside` pour « ce qui est à droite »**. Correction : `aside` pour un contenu annexe.
- **Oublier les titres** dans les sections, ou les choisir pour leur taille.

## Exercices

### Exercice 1 — Sortir de la soupe de div

Réécris ce `body` avec les éléments de section adaptés. Garde les classes seulement si
elles restent utiles au style (ici, aucune ne l’est).

```html
<body>
  <div class="top">
    <div class="site-name">Les Jardins partagés</div>
    <div class="menu">
      <a href="/">Accueil</a>
      <a href="/parcelles.html">Parcelles</a>
      <a href="/agenda.html">Agenda</a>
    </div>
  </div>
  <div class="content">
    <div class="big-title">Agenda du mois</div>
    <div class="event">
      <div class="event-title">Atelier compost</div>
      <div>Samedi 4 avril, 10 h. Apportez vos épluchures.</div>
    </div>
    <div class="event">
      <div class="event-title">Troc de graines</div>
      <div>Dimanche 12 avril, 14 h.</div>
    </div>
    <div class="sidebar">Adhésion : 10 € par an.</div>
  </div>
  <div class="bottom">Association Les Jardins partagés</div>
</body>
```

:::solution

```html
<body>
  <a href="#contenu">Aller au contenu</a>
  <header>
    <p>Les Jardins partagés</p>
    <nav aria-label="Principale">
      <ul>
        <li><a href="/">Accueil</a></li>
        <li><a href="/parcelles.html">Parcelles</a></li>
        <li><a href="/agenda.html" aria-current="page">Agenda</a></li>
      </ul>
    </nav>
  </header>
  <main id="contenu">
    <h1>Agenda du mois</h1>
    <article>
      <h2>Atelier compost</h2>
      <p>
        Samedi <time datetime="2026-04-04T10:00">4 avril, 10 h</time>. Apportez
        vos épluchures.
      </p>
    </article>
    <article>
      <h2>Troc de graines</h2>
      <p>Dimanche <time datetime="2026-04-12T14:00">12 avril, 14 h</time>.</p>
    </article>
    <aside>
      <h2>Adhésion</h2>
      <p>10 € par an.</p>
    </aside>
  </main>
  <footer>
    <p>Association Les Jardins partagés</p>
  </footer>
</body>
```

- `header` et `footer` enfants de `body` deviennent les repères bannière et
  informations sur le contenu.
- Le menu devient une `nav` contenant une liste : un lecteur d’écran annonce « liste,
  3 éléments », ce qui donne la taille du menu.
- Le « grand titre » devient un vrai `h1`, les titres d’événements des `h2`.
- Chaque événement est autonome (on pourrait le partager seul) : `article`. Le choix de
  `section` serait défendable si l’on considère les événements comme des parties de
  l’agenda ; l’essentiel est qu’ils aient un titre.
- L’adhésion est une information annexe : `aside`, avec un titre ajouté.
- Le nom du site est dans un `p` et non un `h1` : sur cette page, le sujet principal est
  l’agenda. Certains sites mettent le nom dans le `h1` de la page d’accueil seulement.

:::

### Exercice 2 — Quel élément ?

Pour chaque contenu, choisis entre `article`, `section`, `aside`, `nav` et `div`, et
justifie en une phrase.

1. Un fil d’Ariane « Accueil › Cours › Tour de potier ».
2. Un commentaire laissé sous un billet de blog.
3. Le bloc « Questions fréquentes » d’une page d’accueil, avec son titre.
4. Un encadré « Le saviez-vous ? » au milieu d’un article.
5. Une boîte qui sert uniquement à centrer le contenu avec le CSS.
6. Une fiche produit dans une grille de catalogue.

:::solution

1. `nav` : c’est une navigation importante ; avec `aria-label="Fil d’Ariane"` pour la
   distinguer du menu principal.
2. `article` : un commentaire est autonome, on peut l’imbriquer dans l’`article` du
   billet.
3. `section` : c’est une partie thématique de la page, avec un titre.
4. `aside` : l’encadré est lié au sujet mais annexe ; l’article reste compréhensible
   sans lui.
5. `div` : aucun sens, seulement un besoin de mise en forme.
6. `article` : la fiche est autonome (nom, prix, image, lien) et garderait son sens
   seule.

:::

### Exercice 3 — Corriger la structure

Ce code contient quatre erreurs de structure. Trouve-les et explique leurs
conséquences.

```html
<body>
  <main>
    <header>
      <nav><a href="/">Accueil</a> <a href="/blog.html">Blog</a></nav>
    </header>
    <article>
      <h4>Mon premier billet</h4>
      <p>Bonjour à tous.</p>
    </article>
  </main>
  <main>
    <p>Autres billets…</p>
  </main>
</body>
```

:::solution

1. Le `header` est dans `main` : il ne devient pas le repère bannière, et le menu
   répété sur chaque page se retrouve mêlé au contenu principal. Il faut sortir le
   `header` (et sa `nav`) de `main`.
2. Deux `main` visibles : la norme n’en autorise qu’un. Le second contenu doit rejoindre
   le premier, par exemple dans une `section` ou un `aside`.
3. Le titre de l’article est un `h4` alors qu’il n’y a ni `h1`, ni `h2`, ni `h3` : la
   page n’a pas de titre principal et le plan saute des niveaux. Il faut un `h1` pour la
   page et un `h2` pour le billet.
4. Les liens du menu ne sont pas dans une liste : ce n’est pas invalide, mais une liste
   `ul` annonce le nombre d’éléments et reste la structure la plus répandue pour un menu.

Version corrigée :

```html
<body>
  <header>
    <nav aria-label="Principale">
      <ul>
        <li><a href="/">Accueil</a></li>
        <li><a href="/blog.html">Blog</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <h1>Blog</h1>
    <article>
      <h2>Mon premier billet</h2>
      <p>Bonjour à tous.</p>
    </article>
    <section>
      <h2>Autres billets</h2>
      <p>…</p>
    </section>
  </main>
</body>
```

Le point 4 est une recommandation, pas une règle de validité : sache distinguer les
deux quand tu justifies une correction.
:::

## Récapitulatif

- `div` et `span` n’ont pas de sens ; une page en `div` n’offre aucun repère.
- `header` et `footer` enfants de `body` deviennent les repères bannière et
  informations sur le contenu ; dans un `article` ou une `section`, ce sont de simples
  en-têtes et pieds.
- `nav` pour les navigations principales, nommées avec `aria-label` quand il y en a
  plusieurs.
- Un seul `main`, pour le contenu propre à la page.
- `article` : autonome. `section` : thématique, avec un titre. `aside` : annexe.
- Les niveaux de titres se choisissent explicitement selon le plan ; aucun calcul
  automatique ne les ajuste.
- Un lien d’évitement vers `main` aide la navigation au clavier.
