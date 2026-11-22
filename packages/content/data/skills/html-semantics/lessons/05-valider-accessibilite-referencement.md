---
title: Valider son HTML, accessibilité et référencement
summary: Vérifier son code avec le validateur du W3C et comprendre ce que la sémantique change pour les personnes et les moteurs de recherche.
durationMinutes: 45
sources:
  - title: W3C — Validateur Nu HTML Checker
    url: https://validator.w3.org/nu/
  - title: W3C — Règles pour l’accessibilité des contenus web (WCAG) 2.2, en anglais
    url: https://www.w3.org/TR/WCAG22/
  - title: DINUM — Référentiel général d’amélioration de l’accessibilité (RGAA)
    url: https://accessibilite.numerique.gouv.fr/
  - title: MDN — HTML, une bonne base pour l’accessibilité
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Core/Accessibility/HTML
---

## Le navigateur pardonne, pas tout le monde

Tu l’as vu dans les leçons précédentes : le navigateur corrige les erreurs sans rien
dire. Il ferme les balises oubliées, déplace les éléments mal placés, invente un `tbody`.
C’est pratique pour afficher les vieux sites, mais c’est un piège pour toi : une page
peut sembler parfaite et contenir un arbre DOM différent de ce que tu as écrit, une image
sans alternative, un tableau sans en-têtes.

Cette leçon répond à deux questions :

1. Comment vérifier que mon HTML respecte la norme ?
2. Pourquoi est-ce important, concrètement, pour les personnes et pour le référencement ?

## Valider avec le validateur du W3C

Le W3C met à disposition un validateur gratuit, le **Nu HTML Checker**, à l’adresse
`https://validator.w3.org/nu/`. Il vérifie ton document par rapport à la norme HTML
vivante du WHATWG. Il propose trois façons de lui soumettre une page :

- **par adresse** (address) : pour une page déjà en ligne ;
- **par fichier** (file upload) : pour un fichier de ton ordinateur ;
- **par saisie directe** (text input) : tu colles ton code dans une zone de texte.

Pour un fichier local, la saisie directe est la plus simple : copie tout le contenu de
ton fichier, colle-le, clique sur « Check ».

:::warning[Ne colle pas n’importe quoi]
Le validateur en ligne reçoit tout ce que tu lui envoies. Ne lui soumets pas une page qui
contient des données personnelles ou confidentielles.

:::

### Un exemple réel

Voici une page qui s’affiche sans problème apparent dans le navigateur :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Agenda — Les Jardins partagés</title>
  </head>
  <body>
    <h1>Agenda</h1>
    <ul>
      <div>Ateliers</div>
      <li>Compost</li>
    </ul>
    <img src="potager.jpg">
    <p>Inscription <a href="inscription.html">ici</a>
    <p id="infos">Infos</p>
    <p id="infos">Autres infos</p>
    <table>
      <tr><td>Samedi</td><td>Compost</td></tr>
    </table>
    <p><strong>Important <em>!</strong></em></p>
    <h4>Contact</h4>
  </body>
</html>
```

Soumise au validateur, elle produit ces messages (en anglais ; le numéro indique la ligne
concernée) :

```text
Error (ligne 10) : Element “div” not allowed as child of element “ul” in this context.
                   (Suppressing further errors from this subtree.)
Error (ligne 13) : An “img” element must have an “alt” attribute, except under certain
                   conditions. For details, consult guidance on providing text
                   alternatives for images.
Error (ligne 16) : Duplicate ID “infos”.
Warning (ligne 15) : The first occurrence of ID “infos” was here.
Error (ligne 20) : End tag “strong” violates nesting rules.
Error (ligne 20) : No “em” element in scope but a “em” end tag seen.
Error (ligne 21) : The heading “h4” (with computed level 4) follows the heading “h1”
                   (with computed level 1), skipping 2 heading levels.
```

Le validateur évolue : selon sa version, la formulation des messages peut changer et
certains contrôles récents (comme celui des niveaux de titres) peuvent manquer sur une
instance plus ancienne. Traduisons et relions chaque message à ce que tu sais déjà :

1. **Un `div` n’est pas autorisé comme enfant de `ul`** : seuls les `li` le sont (leçon 2).
   Le validateur précise qu’il ne signale plus d’autres erreurs dans ce sous-arbre :
   corrige celle-ci puis relance la validation.
2. **Un `img` doit avoir un attribut `alt`** (leçon 2).
3. **Identifiant dupliqué** : un `id` doit être unique ; l’avertissement qui suit indique
   où se trouve la première occurrence. Un lien `href="#infos"` ne saurait pas laquelle
   viser.
4. **Balises croisées** : `strong` est fermé avant `em` (leçon 1). Les deux messages
   viennent de la même erreur.
5. **Niveaux de titres sautés** : un `h4` directement après le `h1` (leçon 2).

Remarque aussi ce que le validateur **ne signale pas** :

- le paragraphe non fermé de la ligne 14 : la norme autorise à omettre `</p>` quand un
  autre bloc le suit, ce n’est donc pas une erreur ;
- le lien « ici » : il est valide, mais son texte n’a aucun sens hors contexte ;
- le tableau sans `th` ni `caption` : valide, mais inexploitable pour un lecteur d’écran.

### Les différents types de messages

- **Error** : le document ne respecte pas la norme. À corriger.
- **Warning** : le code est valide, mais probablement maladroit. À examiner.
- **Info** : une simple information, sans problème à corriger.

Un avertissement peut aussi accompagner une erreur pour la préciser, comme celui qui
indique la première occurrence d’un identifiant dupliqué.

Voici un deuxième exemple et ses messages, qui montrent des avertissements :

```html
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body>
    <main>
      <h1>Contact</h1>
      <p>Écris-nous <a>ici</a>.</p>
      <section>
        <p>Horaires : <b>mardi</b></p>
      </section>
      <table>
        <tr><th>Jour</th><th>Heure</th></tr>
        <tr><td>Mardi</td><td>18 h</td><td>21 h</td></tr>
      </table>
      <img src="carte.png" alt="">
    </main>
    <main><p>Bis</p></main>
  </body>
</html>
```

```text
Error   (balise html)    : Start tag seen without seeing a doctype first.
                           Expected “<!DOCTYPE html>”.
Error   (fin de head)    : Element “head” is missing a required instance of child
                           element “title”.
Warning (section)        : Section lacks heading. Consider using “h2”-“h6” elements to
                           add identifying headings to all sections, or else use a “div”
                           element instead for any cases where no heading is needed.
Warning (2e ligne du     : A table row was 3 columns wide and exceeded the column count
         tableau)          established by the first row (2).
Error   (second main)    : A document must not include more than one visible “main”
                           element.
Warning (balise html)    : Consider adding a “lang” attribute to the “html” start tag to
                           declare the language of this document.
```

Ici, on a indiqué entre parenthèses l’endroit concerné plutôt que le numéro de ligne :
le validateur, lui, donne toujours la ligne et la colonne.

Tu reconnais le DOCTYPE manquant, le `title` obligatoire, la `section` sans titre
(leçon 3), une ligne de tableau avec une cellule de trop (leçon 4), deux `main` et
l’attribut `lang` absent (leçon 1).

Et ce que le validateur laisse passer : le lien `a` **sans `href`**, qui n’est pas un lien
et n’est pas atteignable au clavier ; le `alt=""` sur ce qui ressemble à une carte
d’accès, donc probablement une image informative. Le validateur vérifie la **forme**, pas
le **sens**.

### Méthode de correction

1. Corrige les erreurs **de haut en bas** : une erreur au début (balise mal fermée)
   provoque souvent des erreurs en cascade plus loin.
2. Relance la validation après chaque série de corrections.
3. Lis chaque avertissement et décide : corriger, ou garder en sachant pourquoi.
4. Ne « fais pas taire » une erreur en ajoutant n’importe quel attribut : comprends sa
   cause.

## Le DOM réel : source et inspecteur

Ton navigateur offre deux vues :

- **le code source** (Ctrl + U dans Chrome et Firefox, ou clic droit, « Afficher le code
  source de la page ») : le texte exact reçu du serveur ;
- **l’inspecteur** (F12, onglet « Éléments » ou « Inspecteur ») : le DOM construit par le
  navigateur, **après** corrections.

Compare-les sur la première page d’exemple : dans le source, `strong` et `em` sont
croisés ; dans l’inspecteur, tu vois le second `em` créé par le navigateur. Quand un style
ou un script ne s’applique pas comme prévu, c’est l’inspecteur qui dit la vérité.

## Ce que la sémantique change pour l’accessibilité

### Les technologies d’assistance

Beaucoup de personnes n’utilisent pas le web comme toi : lecteur d’écran (le texte est lu
à voix haute ou affiché sur une plage braille), navigation au clavier seul, contrôle à la
voix, fort zoom, contacteurs. Ces outils ne « voient » pas la page : ils lisent l’**arbre
d’accessibilité**, que le navigateur construit à partir du DOM.

Pour chaque élément, cet arbre expose notamment :

- un **rôle** : titre, lien, bouton, liste, tableau, repère de navigation… ;
- un **nom** accessible : le texte d’un lien, le `alt` d’une image, la `caption` d’un
  tableau ;
- des **états et propriétés** : niveau d’un titre, lien visité, case cochée…

Tout cela vient du HTML. Un `h2` donne le rôle « titre de niveau 2 ». Un `div` stylé pour
ressembler à un titre ne donne rien.

### Ce que la personne peut faire grâce à la sémantique

Avec une page bien balisée, un utilisateur de lecteur d’écran peut :

- afficher la **liste des titres** et sauter directement à la section qui l’intéresse ;
- passer d’un **repère** à l’autre (navigation, contenu principal, pied de page) ;
- afficher la **liste des liens**, d’où l’importance de leurs textes ;
- savoir qu’une liste compte cinq éléments avant de l’écouter ;
- naviguer dans un tableau en entendant les en-têtes de chaque cellule.

Sans sémantique, il ne reste qu’un long texte à écouter du début à la fin.

### Les normes de référence

Les **WCAG** (Web Content Accessibility Guidelines), publiées par le W3C, sont la
référence internationale. La version 2.2 organise ses critères de succès en trois niveaux,
A, AA et AAA ; le niveau AA est celui que visent la plupart des obligations légales.
Deux critères concernent directement ce que tu as appris dans cette compétence :

- **1.3.1 Information et relations** (niveau A) : la structure transmise visuellement
  (titres, listes, tableaux, regroupements) doit être déterminée par programme, donc
  balisée en HTML ;
- **4.1.2 Nom, rôle et valeur** (niveau A) : pour les composants d’interface, le nom et
  le rôle doivent pouvoir être déterminés par programme.

En France, le **RGAA** (Référentiel général d’amélioration de l’accessibilité), publié
par la DINUM (Direction interministérielle du numérique), traduit les WCAG en critères et
tests concrets. C’est le référentiel utilisé pour évaluer la conformité des services
numériques soumis à l’obligation légale d’accessibilité. Tu en verras l’usage dans la
compétence sur les formulaires et l’accessibilité.

:::note[Valide ne veut pas dire accessible]
Une page valide peut être inaccessible (un `alt` qui dit « image », des liens « ici »,
un tableau sans en-têtes). Une page invalide n’est pas forcément inaccessible. La
validation est un **filet de sécurité** qui élimine des erreurs bêtes, pas un audit
d’accessibilité.

:::

## Ce que la sémantique change pour le référencement

Le **référencement naturel** (SEO, Search Engine Optimization) désigne ce qui aide une
page à être trouvée et bien présentée par les moteurs de recherche. Les robots des
moteurs lisent ton HTML : comme un lecteur d’écran, ils ne regardent pas la page, ils en
interprètent la structure. Ce que tu fais pour l’accessibilité les aide donc aussi :

- le **`title`** est en général le titre cliquable affiché dans les résultats ; un titre
  spécifique par page compte beaucoup ;
- la **`meta name="description"`** peut servir d’extrait sous ce titre (le moteur peut
  aussi choisir un autre passage de la page) ;
- les **titres** `h1` à `h6` indiquent les sujets traités ;
- le **texte des liens** décrit la page de destination, pour le robot comme pour
  l’humain ;
- l’**`alt` des images** décrit leur contenu ;
- l’attribut **`lang`** indique la langue de la page ;
- du **vrai texte** plutôt que du texte dans des images reste lisible par tous.

Les algorithmes précis des moteurs de recherche ne sont pas publics et évoluent. Méfie-toi
de toute recette miracle. Deux principes durables : écrire pour les humains, et baliser
le contenu pour ce qu’il est. À l’inverse, bourrer un `alt` ou un `title` de mots-clés
nuit à la fois à l’accessibilité (le lecteur d’écran lit tout) et à la qualité perçue.

## Une liste de vérification

Avant de considérer une page comme terminée :

1. Le validateur ne renvoie plus d’erreur ; chaque avertissement restant est compris.
2. `lang`, `meta charset` et un `title` spécifique sont présents.
3. Il y a un seul `h1` et les niveaux de titres ne sautent pas.
4. Les repères existent : `header`, `nav`, `main`, `footer`.
5. Chaque image a un `alt` adapté à sa fonction.
6. Chaque lien a un texte explicite et un `href`.
7. Les tableaux de données ont `caption`, `th` et `scope`.
8. Les listes sont de vraies listes.

## Pièges courants

- **« Ça s’affiche, donc c’est bon »**. Correction : valider et inspecter le DOM.
- **« C’est valide, donc c’est accessible »**. Correction : relire le sens, les textes
  de liens, les alternatives.
- **Corriger les erreurs dans le désordre** et se perdre dans les cascades. Correction :
  de haut en bas, puis relancer.
- **Bourrer de mots-clés** `title`, `alt` ou titres « pour le SEO ».
- **Envoyer une page contenant des données personnelles** à un validateur en ligne.

## Exercices

### Exercice 1 — Lire le validateur

Un collègue te transmet ces messages du validateur pour sa page. Pour chacun, explique la
cause probable et la correction, sans voir le code.

```text
Error: Element “li” not allowed as child of element “div” in this context. (Suppressing further errors from this subtree.)
Error: Element “head” is missing a required instance of child element “title”.
Error: Duplicate ID “menu”.
Warning: Consider adding a “lang” attribute to the “html” start tag to declare the language of this document.
```

:::solution
1. Un `li` est placé directement dans un `div` : il manque le `ul` ou le `ol` qui doit
   l’entourer (ou le `div` a remplacé ce `ul` à tort). Correction : mettre les `li` dans
   une liste.
2. Le `head` n’a pas de `title`. Correction : ajouter un titre spécifique à la page.
3. Deux éléments ont `id="menu"`. Correction : renommer l’un des deux ; si c’est pour du
   style commun, utiliser une classe, qui peut être répétée.
4. L’élément `html` n’a pas de `lang`. Ce n’est qu’un avertissement pour le validateur,
   mais c’est une exigence d’accessibilité (WCAG 3.1.1) : ajouter `lang="fr"`.

:::

### Exercice 2 — Valide mais pas accessible

Cette page est **valide** pour le validateur. Trouve au moins cinq problèmes
d’accessibilité ou de référencement et corrige-les.

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Page</title>
  </head>
  <body>
    <div>
      <a href="/"><img src="logo.png" alt="logo"></a>
      <a href="/">Accueil</a> | <a href="/cours.html">Cours</a>
    </div>
    <h1>Cours de poterie</h1>
    <p>Nos cours sont ouverts à tous.</p>
    <img src="horaires.png" alt="image">
    <p>Pour vous inscrire, <a href="inscription.html">cliquez ici</a>.</p>
    <table>
      <tr><td>Formule</td><td>Prix</td></tr>
      <tr><td>Séance</td><td>25 €</td></tr>
    </table>
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
    <title>Cours de poterie — Atelier de Lou</title>
    <meta name="description" content="Cours de poterie ouverts à tous : horaires, tarifs et inscription.">
  </head>
  <body>
    <header>
      <a href="/"><img src="logo.png" alt="Atelier de Lou, accueil"></a>
      <nav aria-label="Principale">
        <ul>
          <li><a href="/">Accueil</a></li>
          <li><a href="/cours.html" aria-current="page">Cours</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <h1>Cours de poterie</h1>
      <p>Nos cours sont ouverts à tous.</p>
      <h2>Horaires</h2>
      <p>Mardi et jeudi, de 18 h à 21 h.</p>
      <p><a href="inscription.html">S’inscrire à un cours</a></p>
      <table>
        <caption>Tarifs</caption>
        <tr>
          <th scope="col">Formule</th>
          <th scope="col">Prix</th>
        </tr>
        <tr>
          <th scope="row">Séance</th>
          <td>25 €</td>
        </tr>
      </table>
    </main>
  </body>
</html>
```

Les problèmes corrigés :

1. `title` générique « Page » : remplacé par un titre spécifique, et une description
   ajoutée.
2. `alt="logo"` sur un logo cliquable : le texte décrit maintenant la destination.
3. Menu dans un `div` avec des barres verticales : `header`, `nav` et liste ; les « | »
   peuvent être lus à voix haute (« barre verticale ») selon les réglages du lecteur
   d’écran.
4. Pas de `main` : ajouté, ce qui crée le repère du contenu principal.
5. Horaires dans une image avec `alt="image"` : remplacés par du vrai texte, lisible,
   traduisible, indexable. Si l’image devait rester, son `alt` devrait contenir les
   horaires.
6. « Cliquez ici » : texte de lien explicite.
7. Tableau sans en-têtes ni légende : `caption`, `th` et `scope`.

Aucun de ces problèmes n’était détecté par le validateur : c’est exactement ce que
signifie « valide ne veut pas dire accessible ».

:::

### Exercice 3 — Expliquer à l’oral

Prépare une réponse de trois ou quatre phrases à cette question : « Mon site s’affiche
parfaitement, pourquoi devrais-je remplacer mes `div` par des éléments sémantiques ? »
Ta réponse doit citer au moins un bénéfice pour l’accessibilité, un pour le référencement
et un pour la maintenance du code.

:::solution
Une réponse possible :

« L’affichage n’est qu’une des façons de consommer ta page. Les lecteurs d’écran
s’appuient sur l’arbre d’accessibilité construit à partir du HTML : avec `nav`, `main`
et de vrais titres, une personne aveugle peut sauter au contenu ou parcourir la liste
des titres, alors qu’avec des `div` elle doit tout écouter. Les moteurs de recherche
lisent aussi la structure : `title`, titres et textes de liens les aident à comprendre
le sujet de chaque page. Enfin, `article` ou `nav` disent ce qu’est chaque bloc à toute
personne qui relit le code, sans dépendre de noms de classes. »

Ce qui est attendu : un mécanisme précis (arbre d’accessibilité, repères, liste des
titres) plutôt qu’une affirmation vague comme « c’est mieux pour le SEO ».

:::

## Récapitulatif

- Le navigateur corrige les erreurs en silence : valide ton HTML avec le Nu HTML Checker
  du W3C (`https://validator.w3.org/nu/`).
- Corrige les erreurs de haut en bas, relance, comprends chaque avertissement.
- Le code source montre ce que tu as écrit ; l’inspecteur montre le DOM réellement
  construit.
- Les technologies d’assistance lisent l’arbre d’accessibilité : rôles, noms, états,
  tous issus du HTML.
- WCAG 2.2 (critères 1.3.1 et 4.1.2 notamment) et, en France, le RGAA en font des
  exigences.
- Les moteurs de recherche lisent aussi la structure : `title`, description, titres,
  textes de liens, `alt`, `lang`.
- Valide ne veut pas dire accessible : la validation vérifie la forme, à toi de vérifier
  le sens.
