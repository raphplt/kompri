---
title: ARIA avec parcimonie, tester au clavier et auditer
summary: Savoir quand ARIA aide et quand il nuit, puis vérifier une page au clavier et avec des outils d’audit.
durationMinutes: 50
sources:
  - title: W3C — Using ARIA, les règles d’usage d’ARIA (en anglais)
    url: https://www.w3.org/TR/using-aria/
  - title: W3C — ARIA in HTML (en anglais)
    url: https://www.w3.org/TR/html-aria/
  - title: W3C WAI — Easy Checks, premiers contrôles d’accessibilité (en anglais)
    url: https://www.w3.org/WAI/test-evaluate/preliminary/
  - title: DINUM — Référentiel général d’amélioration de l’accessibilité (RGAA)
    url: https://accessibilite.numerique.gouv.fr/
---

## ARIA, un complément et non un remplaçant

**WAI-ARIA** (Accessible Rich Internet Applications), souvent abrégé ARIA, est une
spécification du W3C qui ajoute au HTML des attributs pour décrire aux technologies
d’assistance ce que le HTML seul ne sait pas exprimer. Tu en as déjà croisé :
`aria-label` sur une `nav`, `aria-labelledby` sur une `section`, `aria-describedby` pour
un texte d’aide, `aria-current="page"` dans un menu.

ARIA fournit trois sortes d’informations :

- des **rôles** (`role="..."`) : ce qu’est l’élément (bouton, onglet, alerte…) ;
- des **propriétés** : des caractéristiques plutôt stables (`aria-label`,
  `aria-describedby`, `aria-required`) ;
- des **états** : des caractéristiques qui changent (`aria-expanded`, `aria-invalid`,
  `aria-checked`).

Point capital : **ARIA ne modifie que l’arbre d’accessibilité**. Il ne change ni
l’apparence, ni le comportement. Un `div` avec `role="button"` est annoncé « bouton »,
mais il ne reçoit toujours pas le focus et ne réagit toujours ni à Entrée ni à Espace.
ARIA est une **promesse** faite à l’utilisateur ; c’est à toi de la tenir.

## Les règles d’usage d’ARIA

Le W3C publie un document, « Using ARIA », qui énonce cinq règles. Les voici,
reformulées :

1. **Si un élément HTML natif a la sémantique et le comportement voulus, utilise-le**
   plutôt que d’ajouter ARIA à un élément générique. Un `button` plutôt qu’un
   `div role="button"`.
2. **Ne change pas la sémantique native** sans nécessité absolue : pas de `h2
   role="tab"`, par exemple.
3. **Tout contrôle interactif ARIA doit être utilisable au clavier.**
4. **N’utilise pas `role="presentation"` ou `aria-hidden="true"` sur un élément qui
   peut recevoir le focus.**
5. **Tout élément interactif doit avoir un nom accessible.**

Le guide des pratiques de création ARIA du W3C résume l’esprit de ces règles en une
formule souvent citée : « No ARIA is better than bad ARIA », pas d’ARIA vaut mieux
qu’un mauvais ARIA.

## Les erreurs d’ARIA les plus fréquentes

Toutes les constatations ci-dessous ont été vérifiées dans l’arbre d’accessibilité de
Chromium.

### Des rôles redondants

```html
<main role="main">…</main>
<nav role="navigation">…</nav>
<button role="button">Envoyer</button>
```

Ces rôles sont **déjà implicites** : `main` a le rôle `main`, `nav` le rôle
`navigation`. Les répéter n’apporte rien et alourdit le code. Les générateurs de code et
les assistants IA en produisent souvent ; supprime-les.

### Un aria-label qui contredit le texte visible

```html
<button aria-label="Envoyer">Valider la commande</button>
```

Le nom accessible devient « Envoyer » : `aria-label` **remplace** le texte visible.
Une personne qui utilise la commande vocale voit « Valider la commande », dit « cliquer
Valider la commande »… et rien ne se passe. Les WCAG demandent que le nom accessible
contienne le texte visible (critère 2.5.3, niveau A). Ici, il suffit de retirer
`aria-label`.

### aria-label sur un élément qui ne peut pas être nommé

```html
<div aria-label="Zone de présentation">Texte</div>
```

Un `div` sans rôle a un rôle générique, que la spécification ARIA interdit de nommer.
Le validateur du W3C le signale (une erreur dans ses versions récentes, un simple
avertissement « Possible misuse of aria-label » dans les plus anciennes), et les
lecteurs d’écran n’annoncent pas ce nom de façon fiable, même si Chromium le calcule.
Si l’information est utile, elle doit être dans le texte.

### aria-hidden sur un élément focalisable

```html
<a href="/" aria-hidden="true">Accueil</a>
```

`aria-hidden="true"` retire l’élément de l’arbre d’accessibilité, mais le lien reste
atteignable avec Tab. Une personne qui utilise un lecteur d’écran arrive alors sur un
élément « fantôme » : selon le navigateur et le lecteur d’écran, il est annoncé sans nom,
ou pas du tout (Chromium, lui, le réintègre dans l’arbre au moment où il reçoit le focus).
Le comportement devient imprévisible. C’est la règle 4.

### Un rôle sans le comportement

```html
<span role="button">Supprimer</span>
```

Annoncé « bouton », mais impossible à atteindre au clavier : la règle 3 est violée.
Solution : un `button`.

## Les bons usages d’ARIA dans un formulaire

ARIA est précieux quand le HTML n’a pas d’équivalent. Dans un formulaire, trois cas
reviennent souvent.

### Nommer un bouton qui n’a pas de texte

Une icône SVG écrite directement dans la page n’a pas d’attribut `alt`. On nomme alors
le bouton avec `aria-label` et on masque l’icône, décorative :

```html
<button type="button" aria-label="Fermer">
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
    <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" stroke-width="2"></path>
  </svg>
</button>
```

Chromium expose un bouton nommé « Fermer ». Ici `aria-hidden` est correct : il porte sur
le dessin, qui ne reçoit pas le focus, et non sur le bouton. Quand c’est possible, un
texte visible reste préférable à `aria-label` : il aide aussi les personnes qui ne
comprennent pas l’icône.

### Associer une aide ou une erreur : aria-describedby

Tu l’as utilisé dès la leçon 1. La description s’ajoute au nom : « Mot de passe,
12 caractères minimum ».

### Signaler un champ en erreur : aria-invalid

Quand le **serveur** refuse des données (rappel de la leçon 2 : il revalide toujours),
il renvoie la page du formulaire avec les erreurs. Voici une page d’erreur accessible
construite uniquement en HTML :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>2 erreurs — Inscription — Atelier de Lou</title>
  </head>
  <body>
    <main>
      <h1>Inscription</h1>

      <h2>2 erreurs empêchent l’envoi</h2>
      <ul>
        <li><a href="#email">Adresse électronique : il manque le symbole @</a></li>
        <li><a href="#level-beginner">Niveau : choisis un niveau</a></li>
      </ul>

      <form action="/inscription" method="post">
        <label for="email">Adresse électronique</label>
        <input type="email" id="email" name="email" value="lou.atelier.fr"
               autocomplete="email" aria-invalid="true" aria-describedby="email-error">
        <p id="email-error">Erreur : il manque le symbole @, par exemple lou@exemple.fr.</p>

        <fieldset aria-describedby="level-error">
          <legend>Niveau</legend>
          <p id="level-error">Erreur : choisis un niveau.</p>
          <input type="radio" id="level-beginner" name="level" value="beginner">
          <label for="level-beginner">Débutant</label>
          <input type="radio" id="level-advanced" name="level" value="advanced">
          <label for="level-advanced">Confirmé</label>
        </fieldset>

        <button type="submit">Envoyer mon inscription</button>
      </form>
    </main>
  </body>
</html>
```

Ce que chaque choix apporte :

- le **`title`** commence par le nombre d’erreurs : c’est la première chose annoncée au
  chargement de la page ;
- le **récapitulatif** en haut liste les erreurs avec des liens ; dans Chromium, cliquer
  sur « Adresse électronique : il manque le symbole @ » place le focus **dans le
  champ** concerné ;
- le champ en erreur garde la **valeur saisie** (on ne fait pas tout retaper) ;
- **`aria-invalid="true"`** fait annoncer le champ comme invalide ;
- **`aria-describedby`** relie le message d’erreur au champ (ou au groupe) : le lecteur
  d’écran le lit avec l’étiquette ;
- le message est **textuel**, commence par « Erreur » et **propose une correction**
  (WCAG 3.3.1 et 3.3.3) ;
- pas d’`aria-required="true"` en double de `required` : si un champ est obligatoire,
  `required` suffit, car il est déjà annoncé (les attributs de validation sont omis ici
  pour alléger l’exemple).

:::note[Les messages qui apparaissent sans rechargement]
Quand un message est inséré dans la page par JavaScript, sans rechargement, il faut le
faire annoncer avec une **région live** (`role="status"`, `role="alert"` ou
`aria-live`). Tu le verras dans la compétence sur le DOM : ces attributs sont conçus
pour des contenus qui **changent** ; sur une page qui vient d’être chargée, leur effet
n’est pas fiable.

:::

## Tester une page au clavier

Le test au clavier est le plus simple et l’un des plus révélateurs. Il ne demande aucun
outil. Pose ta souris hors de portée et suis ce protocole :

1. **Recharge la page** et appuie sur Tab. Le premier élément atteint est-il logique
   (idéalement un lien d’évitement « Aller au contenu ») ?
2. **Parcours toute la page avec Tab**, puis revient en arrière avec Maj + Tab.
   - Le focus est-il **toujours visible** ?
   - L’ordre suit-il l’ordre de lecture ?
   - Tous les liens, boutons et champs sont-ils atteints ?
   - Le focus est-il parfois **masqué** par un élément fixe ?
3. **Active chaque élément** : Entrée sur les liens et les boutons, Espace sur les
   boutons et les cases, flèches dans les groupes de radios et les listes.
4. **Remplis et envoie un formulaire** sans souris : étiquettes compréhensibles, erreurs
   annoncées et atteignables, envoi possible avec Entrée.
5. **Vérifie qu’on n’est jamais bloqué** : on peut toujours sortir d’un élément avec Tab
   ou Échap.

Note chaque problème avec l’élément concerné, ce qui se passe et ce qui devrait se
passer.

:::tip[Safari et la touche Tab]
Sur macOS, Safari ne parcourt pas tous les liens avec Tab par défaut : il faut l’activer
dans ses réglages avancés, ou utiliser Option + Tab. Pour tes premiers tests, Chrome ou
Firefox sont plus simples.

:::

## Les outils d’audit

### Les outils automatiques

- **Lighthouse**, intégré aux outils de développement de Chrome (onglet Lighthouse) :
  il produit un rapport avec une catégorie Accessibilité et un score.
- **axe DevTools**, une extension de navigateur de la société Deque, qui s’ajoute aux
  outils de développement et liste les problèmes avec leur gravité et les éléments
  concernés.
- **WAVE**, de l’organisation WebAIM, disponible en extension et en ligne : il affiche
  les problèmes directement sur la page, sous forme d’icônes.
- L’**inspecteur d’accessibilité de Firefox** : il affiche l’arbre d’accessibilité et
  peut rechercher certains problèmes (contraste, clavier, étiquettes).
- Le **panneau Accessibilité** de Chrome : nom, rôle et propriétés calculés de chaque
  élément, et l’arbre d’accessibilité complet.
- Le **validateur du W3C**, déjà vu, pour les erreurs de HTML.

Ces outils détectent rapidement ce qui se mesure : contraste insuffisant, image sans
`alt`, champ sans étiquette, `id` dupliqué, attribut ARIA invalide, niveau de titre
sauté.

### Ce qu’ils ne voient pas

Un outil automatique ne peut pas juger du **sens**. Il voit qu’une image a un `alt`, pas
que « image123 » ou « logo » ne veulent rien dire. Il voit qu’un lien a un texte, pas
que « cliquez ici » est vague. Il ne sait pas si l’ordre de tabulation est logique, si
le focus est visible partout, si un message d’erreur est compréhensible. Une part
importante des exigences des WCAG demande un jugement humain.

:::warning[Un score de 100 n’est pas une certification]
Un score Lighthouse de 100 signifie seulement que les tests automatiques de l’outil
n’ont rien trouvé. Une page peut obtenir 100 et rester inutilisable au clavier. Les
outils sont un point de départ, jamais une conclusion.

:::

### Les lecteurs d’écran

Pour aller plus loin, essaie un lecteur d’écran quelques minutes :

- **NVDA** sur Windows, gratuit et libre ;
- **Narrateur**, intégré à Windows ;
- **VoiceOver**, intégré à macOS (Cmd + F5 pour l’activer ou le désactiver) et à iOS ;
- **TalkBack**, intégré à Android.

Ne cherche pas à tout maîtriser : écoute comment ta page est annoncée, navigue par
titres et par repères, remplis un formulaire. Tu comprendras en quelques minutes ce que
les leçons décrivent.

### Une démarche d’audit en cinq étapes

1. **Validateur** : éliminer les erreurs de HTML.
2. **Outil automatique** (Lighthouse, axe ou WAVE) : corriger tout ce qu’il signale, en
   comprenant chaque problème.
3. **Test au clavier** : le protocole ci-dessus.
4. **Vérifications manuelles** : pertinence des `alt` et des textes de liens, plan des
   titres, couleurs, messages d’erreur.
5. **Lecteur d’écran** : un parcours rapide des tâches principales.

En France, le **RGAA** fournit la méthode complète : des critères regroupés par
thématiques (images, couleurs, tableaux, liens, formulaires, navigation, notamment),
chacun avec des tests précis. Les organismes soumis à l’obligation d’accessibilité
l’utilisent pour évaluer leurs services et doivent notamment publier une déclaration
d’accessibilité.

## Pièges courants

- **Ajouter ARIA pour « faire accessible »** : rôles redondants, `aria-label` partout.
  Correction : HTML natif d’abord.
- **Un `aria-label` différent du texte visible**.
- **Un `role` sans le comportement clavier** correspondant.
- **`aria-hidden="true"` sur un élément focalisable** ou sur un contenu utile.
- **Se contenter d’un score d’outil automatique**.
- **Ne jamais tester au clavier soi-même**.
- **Des messages d’erreur seulement en rouge**, loin du champ, sans lien ni
  description associée.

## Exercices

### Exercice 1 — Nettoyer l’ARIA

Ce fragment, produit par un assistant, abuse d’ARIA. Corrige-le en appliquant les règles
d’usage, puis explique chaque modification.

```html
<div role="navigation" aria-label="navigation">
  <a href="/" role="link">Accueil</a>
  <a href="/cours.html" role="link">Cours</a>
</div>
<main role="main">
  <h1 role="heading">Contact</h1>
  <form>
    <label for="mail">Adresse électronique</label>
    <input type="email" id="mail" name="email" aria-label="Saisir votre e-mail ici" aria-required="true" required>
    <div role="button" class="send">Envoyer</div>
  </form>
</main>
```

:::solution
```html
<nav aria-label="Principale">
  <ul>
    <li><a href="/">Accueil</a></li>
    <li><a href="/cours.html">Cours</a></li>
  </ul>
</nav>
<main>
  <h1>Contact</h1>
  <form action="/contact" method="post">
    <label for="mail">Adresse électronique</label>
    <input type="email" id="mail" name="email" autocomplete="email" required>
    <button type="submit">Envoyer</button>
  </form>
</main>
```

1. `div role="navigation"` devient `nav` (règle 1). Le nom « navigation » était
   redondant avec le rôle (un lecteur d’écran risquait d’annoncer « navigation
   navigation ») :
   « Principale » le distingue d’autres menus. Les liens passent dans une liste.
2. `role="link"` sur des `a href`, `role="main"` sur `main`, `role="heading"` sur `h1` :
   rôles implicites, supprimés. Ils n’apportent rien et chaque attribut inutile est une
   occasion d’erreur lors d’une modification future.
3. `aria-label` sur le champ **remplaçait** l’étiquette visible « Adresse
   électronique » : supprimé, le `label` suffit et le nom correspond au texte visible.
4. `aria-required="true"` doublait `required` : supprimé.
5. Le faux bouton devient un `button type="submit"` : focus, clavier et envoi du
   formulaire, sans script (règles 1 et 3). Le formulaire reçoit aussi `action` et
   `method`.

:::

### Exercice 2 — Prédire un test au clavier

Sans l’exécuter, décris ce qui se passe quand on parcourt cette page avec Tab, puis
liste les problèmes.

```html
<body>
  <header>
    <a href="/"><img src="logo.png" alt="Atelier de Lou, accueil"></a>
    <input type="search" name="q" aria-label="Rechercher" tabindex="2">
  </header>
  <main>
    <h1>Nos cours</h1>
    <a href="/tour.html">Cours de tour</a>
    <span class="link" onclick="location.href='/modelage.html'">Cours de modelage</span>
    <a href="/stage.html" aria-hidden="true">Stage d’été</a>
    <button type="button" tabindex="-1">Me prévenir des nouveaux cours</button>
  </main>
</body>
```

:::solution
Ordre de tabulation : d’abord le champ de recherche (`tabindex="2"`, valeur positive,
donc avant les éléments sans `tabindex` positif), puis, dans l’ordre du code, le logo,
« Cours de tour », et le lien « Stage d’été ».

Problèmes :

1. `tabindex="2"` sur la recherche : elle passe avant le logo, l’ordre ne suit plus la
   lecture. Supprimer l’attribut.
2. Le champ de recherche n’a qu’un `aria-label` : acceptable pour un champ de recherche
   accompagné d’un bouton explicite, mais une étiquette visible serait meilleure ; et il
   manque un bouton d’envoi et un `form`.
3. « Cours de modelage » est un `span` cliquable : jamais atteint au clavier. Le
   remplacer par un lien `a href="/modelage.html"`.
4. « Stage d’été » est atteint avec Tab mais masqué aux lecteurs d’écran par
   `aria-hidden` : élément fantôme (règle 4). Retirer `aria-hidden`.
5. Le bouton « Me prévenir… » a `tabindex="-1"` : il n’est jamais atteint avec Tab.
   Retirer l’attribut.

:::

### Exercice 3 — Rédiger un mini-rapport d’audit

Tu audites le formulaire d’inscription de l’exercice 1 de la leçon 1, dans sa version
**avant correction**. Rédige un mini-rapport en trois parties : ce qu’un outil
automatique signalerait probablement, ce que seul un test manuel révèle, et tes trois
corrections prioritaires.

:::solution
**Probablement signalé par un outil automatique** : le champ e-mail sans nom accessible,
car le `label` vise un `id` inexistant (`for="mail"` contre `id="email"`) ; selon
l’outil, le champ « nom » qui n’a qu’un `placeholder` (certains outils acceptent le
`placeholder` comme nom de secours, d’autres le signalent).

**Révélé seulement par un test manuel** : l’étiquette du nom disparaît dès qu’on tape ;
les deux boutons radio peuvent être cochés en même temps (`name` différents) et leur
question n’est pas reliée au groupe ; le message n’est jamais envoyé (`textarea` sans
`name`, visible seulement dans l’onglet Réseau) ; le bouton « OK » ne dit pas l’action ;
le champ e-mail en `type="text"` n’offre ni clavier adapté ni contrôle de format.

**Corrections prioritaires** :

1. Associer une étiquette visible à chaque champ (nom accessible, zone cliquable).
2. Donner le même `name` aux radios et les regrouper dans un `fieldset` avec une
   `legend`.
3. Ajouter `name` au `textarea` : sans lui, la fonction principale du formulaire est
   cassée.

Ce qui est attendu : distinguer ce qui se mesure automatiquement de ce qui demande un
jugement ou un test réel, et prioriser selon l’impact sur les personnes.

:::

## Récapitulatif

- ARIA ajoute des rôles, propriétés et états à l’arbre d’accessibilité, sans rien
  changer au comportement.
- Règle d’or : un élément HTML natif d’abord ; pas d’ARIA vaut mieux qu’un mauvais ARIA.
- Bons usages dans un formulaire : `aria-label` pour un bouton sans texte,
  `aria-describedby` pour l’aide et les erreurs, `aria-invalid` pour un champ refusé.
- Erreurs à éviter : rôles redondants, `aria-label` qui contredit le texte visible, rôle
  sans clavier, `aria-hidden` sur un élément focalisable.
- Une page d’erreur serveur accessible : `title` explicite, récapitulatif avec liens,
  valeurs conservées, messages textuels associés aux champs.
- Le test au clavier suit un protocole simple et se fait sans outil.
- Les outils automatiques (Lighthouse, axe, WAVE, inspecteurs) trouvent ce qui se
  mesure ; le jugement humain et le lecteur d’écran restent indispensables.
