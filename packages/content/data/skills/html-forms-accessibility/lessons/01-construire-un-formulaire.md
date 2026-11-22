---
title: Construire un formulaire
summary: Choisir les bons champs, les étiqueter et les regrouper pour un formulaire utilisable par tous.
durationMinutes: 50
sources:
  - title: MDN — L’élément form
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/form
  - title: MDN — L’élément input
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/input
  - title: WHATWG — Les formulaires
    url: https://html.spec.whatwg.org/multipage/forms.html
  - title: W3C WAI — Tutoriel sur les formulaires (en anglais)
    url: https://www.w3.org/WAI/tutorials/forms/
---

## Un formulaire, c’est un dialogue

S’inscrire à un cours, chercher un produit, envoyer un message : chaque fois, la page
pose des questions et la personne répond. Un formulaire réussi est un dialogue clair :
chaque question est lisible, chaque réponse attendue a le bon format, et tout le monde
peut répondre, au clavier, à la souris, au doigt ou avec un lecteur d’écran.

Un formulaire mal construit, à l’inverse, exclut silencieusement : un champ sans
étiquette est annoncé « zone d’édition » sans autre précision, un groupe de boutons
radio sans légende ne dit pas quelle question il pose. Cette leçon t’apprend à construire
le HTML d’un formulaire solide. Les leçons suivantes traitent de la validation, de
l’envoi des données et de l’accessibilité au sens large.

Prérequis rappelé : tu sais écrire un document HTML complet et structuré (compétence
« HTML sémantique »). Tous les exemples se placent dans le `main` d’un tel document.

## L’élément form

```html
<form action="/inscription" method="post">
  <!-- les champs viennent ici -->
  <button type="submit">S’inscrire</button>
</form>
```

- `action` : l’adresse à laquelle les données sont envoyées ;
- `method` : la façon de les envoyer, `get` ou `post` (leçon 3).

Chaque champ porte un attribut **`name`** : c’est la clé sous laquelle sa valeur est
envoyée. Un champ **sans `name` n’est pas envoyé du tout**, même s’il est rempli. C’est
une erreur fréquente et silencieuse.

## Le champ et son étiquette

### label : l’étiquette associée

```html
<label for="first-name">Prénom</label>
<input type="text" id="first-name" name="firstName" autocomplete="given-name">
```

L’attribut `for` du `label` contient l’`id` du champ. Cette association a trois effets :

1. **Le nom accessible** du champ devient « Prénom » : un lecteur d’écran annonce
   « Prénom, zone d’édition » (la formulation dépend du logiciel) quand le champ reçoit
   le focus.
2. **Cliquer sur l’étiquette** place le focus dans le champ. Pour une case à cocher,
   cliquer sur le texte la coche : la zone cliquable s’agrandit, ce qui aide toutes les
   personnes qui visent mal, sur mobile notamment.
3. Les outils de commande vocale permettent de dire « cliquer Prénom ».

On peut aussi entourer le champ par le `label`, sans `for` :

```html
<label>
  Ville
  <input type="text" name="city" autocomplete="address-level2">
</label>
```

Les deux méthodes donnent un nom accessible. La première (`for` et `id`) est la plus
répandue et la plus robuste, notamment quand l’étiquette et le champ sont dans des
blocs différents pour la mise en page.

:::warning[Le placeholder n’est pas une étiquette]
L’attribut `placeholder` affiche un texte grisé dans le champ vide. Il **disparaît dès
qu’on tape** : la personne qui revient sur le champ ne sait plus ce qu’on lui demandait.
Son contraste par défaut est souvent faible, et s’il peut servir de nom de secours dans
certains navigateurs, il ne remplace pas une étiquette visible. Utilise-le, au mieux,
pour un exemple de format (`placeholder="exemple : 06 12 34 56 78"`), en plus du `label`.
:::

### Le texte d’aide

Quand un champ a besoin d’une explication (format, contrainte), place-la près du champ
**et** associe-la avec l’attribut `aria-describedby`, qui reçoit l’`id` du texte d’aide :

```html
<label for="password">Mot de passe</label>
<input type="password" id="password" name="password" autocomplete="new-password"
       aria-describedby="password-help">
<p id="password-help">12 caractères minimum.</p>
```

Le lecteur d’écran annonce alors l’étiquette, puis la description : « Mot de passe,
12 caractères minimum ». `aria-describedby` est un attribut ARIA ; la leçon 5 explique
pourquoi on utilise ARIA avec parcimonie, et pourquoi ce cas est justement l’un de ses
bons usages.

## Les types de champs

L’attribut `type` de `input` change le comportement du champ : clavier proposé sur
mobile, contrôle de format, interface de saisie.

| Type       | Usage                                  | Effet notable                                         |
| ---------- | -------------------------------------- | ----------------------------------------------------- |
| `text`     | texte court quelconque                 | type par défaut                                       |
| `email`    | adresse électronique                   | clavier avec @ sur mobile, contrôle de format         |
| `tel`      | numéro de téléphone                    | pavé numérique sur mobile, **aucun** contrôle de format |
| `url`      | adresse web                            | contrôle de format (schéma comme `https:` exigé)      |
| `number`   | quantité, nombre que l’on calcule      | flèches d’incrément, min, max, step                   |
| `password` | mot de passe                           | caractères masqués                                    |
| `date`     | date                                   | sélecteur de date du navigateur                       |
| `search`   | champ de recherche                     | bouton d’effacement dans certains navigateurs         |
| `checkbox` | case à cocher                          | valeur envoyée seulement si cochée                    |
| `radio`    | un choix parmi plusieurs               | un seul coché par groupe de même `name`               |
| `file`     | envoi de fichier                       | demande un encodage particulier (leçon 3)             |

Choisir le bon type est un geste d’accessibilité : un clavier adapté évite des erreurs
de saisie à tout le monde.

:::tip[Un code postal n’est pas un nombre]
`type="number"` sert aux valeurs sur lesquelles on calcule (une quantité, un âge). Un
code postal, un numéro de carte ou de téléphone sont des **identifiants** composés de
chiffres : un zéro initial compte, et les flèches d’incrément n’ont aucun sens. Utilise
`type="text"` avec `inputmode="numeric"`, qui affiche un pavé numérique sur mobile sans
transformer la saisie en nombre.
:::

### autocomplete : aider le navigateur à remplir

L’attribut `autocomplete` indique **la nature** de l’information demandée. Le navigateur
peut alors proposer les valeurs déjà connues, et les technologies d’assistance peuvent
afficher une aide adaptée. Les WCAG 2.2 demandent de l’indiquer pour les champs qui
concernent la personne elle-même (critère 1.3.5, niveau AA).

Quelques valeurs normalisées : `given-name` (prénom), `family-name` (nom), `name` (nom
complet), `email`, `tel`, `street-address`, `postal-code`, `address-level2` (ville),
`bday` (date de naissance), `current-password` (mot de passe existant, pour une
connexion), `new-password` (nouveau mot de passe, pour une inscription).

### Texte long, listes déroulantes

```html
<label for="message">Votre message</label>
<textarea id="message" name="message" rows="5"></textarea>

<label for="workshop">Atelier souhaité</label>
<select id="workshop" name="workshop">
  <option value="">Choisir un atelier</option>
  <optgroup label="En semaine">
    <option value="tour-mardi">Tour, mardi soir</option>
    <option value="modelage-jeudi">Modelage, jeudi soir</option>
  </optgroup>
  <optgroup label="Week-end">
    <option value="stage-samedi">Stage du samedi</option>
  </optgroup>
</select>
```

- `textarea` accepte plusieurs lignes ; son contenu initial est le texte entre ses
  balises (ici vide).
- `select` propose une liste d’`option`. L’attribut `value` de chaque option est ce qui
  est envoyé ; le texte entre les balises est ce qui est affiché. `optgroup` regroupe
  des options sous un intitulé.
- La première option à valeur vide sert d’invite. Avec `required` sur le `select`, elle
  oblige à faire un vrai choix (leçon 2).

### Cases à cocher et boutons radio

```html
<input type="checkbox" id="newsletter" name="newsletter" value="yes">
<label for="newsletter">Recevoir la lettre d’information</label>
```

Une case **non cochée n’envoie rien** ; cochée, elle envoie son `value` (ou `on` si
l’attribut `value` est absent).

Les boutons radio d’un même groupe partagent le **même `name`** : c’est ce qui les
rend exclusifs. Chacun a son propre `value` et son propre `label`.

```html
<input type="radio" id="level-beginner" name="level" value="beginner">
<label for="level-beginner">Débutant</label>
<input type="radio" id="level-advanced" name="level" value="advanced">
<label for="level-advanced">Confirmé</label>
```

Mais quelle question ces deux boutons posent-ils ? « Débutant » et « Confirmé » ne
suffisent pas : il manque l’intitulé du groupe.

## Regrouper : fieldset et legend

`fieldset` regroupe des champs liés ; `legend`, son premier enfant, donne l’intitulé du
groupe.

```html
<fieldset>
  <legend>Votre niveau</legend>
  <input type="radio" id="level-beginner" name="level" value="beginner">
  <label for="level-beginner">Débutant</label>
  <input type="radio" id="level-advanced" name="level" value="advanced">
  <label for="level-advanced">Confirmé</label>
</fieldset>
```

Le navigateur expose le `fieldset` comme un **groupe** nommé « Votre niveau ». En entrant
dans le groupe, un lecteur d’écran annonce la légende, puis « Débutant, bouton radio ».
Sans `fieldset`, la personne entend « Débutant, bouton radio » sans savoir de quoi il
s’agit.

Quand utiliser `fieldset` ?

- **toujours** pour un groupe de boutons radio ;
- pour un groupe de cases à cocher qui répondent à une même question
  (« Centres d’intérêt ») ;
- pour un bloc cohérent dans un long formulaire (« Adresse de livraison »).

Par défaut, le navigateur dessine un cadre autour du `fieldset` ; le CSS peut le retirer
sans rien changer à la sémantique.

## Les boutons

```html
<button type="submit">Envoyer ma demande</button>
<button type="button">Afficher l’aide</button>
<button type="reset">Tout effacer</button>
```

- `submit` envoie le formulaire. C’est **le type par défaut** d’un `button` placé dans
  un formulaire : un `button` sans `type` envoie donc le formulaire.
- `button` ne fait rien par lui-même ; il sert aux actions programmées en JavaScript.
  Écris toujours `type="button"` pour ces boutons, sinon ils enverront le formulaire.
- `reset` remet toutes les valeurs initiales : un clic par erreur efface tout. On
  l’évite presque toujours.

Le texte du bouton dit **l’action** : « Envoyer ma demande », « Créer mon compte »,
plutôt que « OK » ou « Valider ».

## Champs désactivés et en lecture seule

- `disabled` : le champ est grisé, ne reçoit pas le focus et **n’est pas envoyé** ;
- `readonly` : le champ n’est pas modifiable, mais il reçoit le focus, on peut copier
  sa valeur, et **il est envoyé**.

## Un formulaire complet

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inscription — Atelier de Lou</title>
  </head>
  <body>
    <main>
      <h1>Inscription à un atelier</h1>
      <p>Tous les champs sont obligatoires, sauf mention contraire.</p>

      <form action="/inscription" method="post">
        <fieldset>
          <legend>Vos coordonnées</legend>

          <label for="first-name">Prénom</label>
          <input type="text" id="first-name" name="firstName" autocomplete="given-name" required>

          <label for="last-name">Nom</label>
          <input type="text" id="last-name" name="lastName" autocomplete="family-name" required>

          <label for="email">Adresse électronique</label>
          <input type="email" id="email" name="email" autocomplete="email" required
                 aria-describedby="email-help">
          <p id="email-help">Nous y enverrons la confirmation.</p>

          <label for="phone">Téléphone (facultatif)</label>
          <input type="tel" id="phone" name="phone" autocomplete="tel">
        </fieldset>

        <fieldset>
          <legend>Votre niveau</legend>
          <input type="radio" id="level-beginner" name="level" value="beginner" required>
          <label for="level-beginner">Débutant</label>
          <input type="radio" id="level-advanced" name="level" value="advanced">
          <label for="level-advanced">Confirmé</label>
        </fieldset>

        <label for="workshop">Atelier souhaité</label>
        <select id="workshop" name="workshop" required>
          <option value="">Choisir un atelier</option>
          <option value="tour">Tour</option>
          <option value="modelage">Modelage</option>
        </select>

        <label for="message">Remarques (facultatif)</label>
        <textarea id="message" name="message" rows="4"></textarea>

        <input type="checkbox" id="rules" name="rules" value="accepted" required>
        <label for="rules">J’ai lu et j’accepte le règlement de l’atelier</label>

        <button type="submit">Envoyer mon inscription</button>
      </form>
    </main>
  </body>
</html>
```

Enregistre-le sous `inscription.html` et ouvre-le. Sans CSS, les champs s’enchaînent
sur la même ligne que leurs étiquettes : c’est normal, la mise en forme viendra avec le
CSS. Teste trois choses :

1. clique sur le texte « J’ai lu et j’accepte… » : la case se coche ;
2. clique sur « Confirmé » : le bouton radio est sélectionné ;
3. ouvre les outils de développement, onglet « Éléments », panneau « Accessibilité »,
   et sélectionne le champ e-mail : son nom est « Adresse électronique » et sa
   description « Nous y enverrons la confirmation ».

Remarque la phrase d’introduction qui explique la convention des champs obligatoires,
et la mention « (facultatif) » dans les étiquettes : l’information est donnée en texte,
lisible par tous. L’attribut `required`, lui, active la validation du navigateur
(leçon 2) et est annoncé par les lecteurs d’écran.

## Pièges courants

- **Un champ sans `label`**, ou un `label` dont le `for` ne correspond à aucun `id`
  (faute de frappe). Correction : vérifier dans le panneau Accessibilité que le champ a
  bien un nom.
- **Le `placeholder` comme seule étiquette**. Correction : un `label` visible.
- **Un champ sans `name`** : jamais envoyé. Correction : un `name` sur chaque champ
  à transmettre.
- **Des boutons radio avec des `name` différents** : ils ne sont plus exclusifs.
- **Des radios sans `fieldset` ni `legend`** : la question du groupe est perdue.
- **`type="number"` pour un code postal ou un téléphone**.
- **Un `button` sans `type`** qui envoie le formulaire alors qu’il devait ouvrir une
  aide. Correction : `type="button"`.
- **Deux `id` identiques**, par exemple en copiant-collant un bloc : le second `label`
  désigne le premier champ.

## Exercices

### Exercice 1 — Réparer un formulaire

Ce formulaire de contact contient six problèmes. Trouve-les et corrige-les.

```html
<form action="/contact" method="post">
  <input type="text" name="name" placeholder="Votre nom">

  <label for="mail">E-mail</label>
  <input type="text" id="email" name="email">

  <p>Objet de votre message</p>
  <input type="radio" id="subject-info" name="subject-info" value="info">
  <label for="subject-info">Demande d’information</label>
  <input type="radio" id="subject-booking" name="subject-booking" value="booking">
  <label for="subject-booking">Réservation</label>

  <label for="message">Message</label>
  <textarea id="message"></textarea>

  <button>OK</button>
</form>
```

:::solution
```html
<form action="/contact" method="post">
  <label for="name">Nom</label>
  <input type="text" id="name" name="name" autocomplete="name">

  <label for="email">Adresse électronique</label>
  <input type="email" id="email" name="email" autocomplete="email">

  <fieldset>
    <legend>Objet de votre message</legend>
    <input type="radio" id="subject-info" name="subject" value="info">
    <label for="subject-info">Demande d’information</label>
    <input type="radio" id="subject-booking" name="subject" value="booking">
    <label for="subject-booking">Réservation</label>
  </fieldset>

  <label for="message">Message</label>
  <textarea id="message" name="message"></textarea>

  <button type="submit">Envoyer le message</button>
</form>
```

1. Le nom n’avait qu’un `placeholder` : ajout d’un `label` visible et associé.
2. Le `label for="mail"` ne correspondait pas à `id="email"` : le champ n’avait pas de
   nom accessible. Et `type="text"` devient `type="email"` (clavier adapté, contrôle de
   format), avec `autocomplete`.
3. Les deux radios avaient des `name` différents : on pouvait cocher les deux. Ils
   partagent maintenant `name="subject"` ; les `value` restent différentes.
4. La question était un simple paragraphe : elle devient la `legend` d’un `fieldset`.
5. Le `textarea` n’avait pas de `name` : le message n’aurait jamais été envoyé.
6. « OK » ne dit pas l’action, et le `type` est explicite.
:::

### Exercice 2 — Choisir le type et l’autocomplétion

Pour chaque information demandée dans un formulaire de commande, indique le `type` et
la valeur d’`autocomplete` adaptés.

1. Adresse électronique du client.
2. Nombre d’exemplaires commandés (de 1 à 10).
3. Code postal de livraison.
4. Mot de passe pour créer un compte.
5. Mot de passe pour se connecter à un compte existant.
6. Date de naissance.

:::solution
1. `type="email"`, `autocomplete="email"`.
2. `type="number"` avec `min="1"` et `max="10"` : c’est une quantité ; pas
   d’`autocomplete` utile.
3. `type="text"` avec `inputmode="numeric"` et `autocomplete="postal-code"` : c’est un
   identifiant, pas une quantité (le zéro initial de 01000 doit être conservé).
4. `type="password"`, `autocomplete="new-password"` : les gestionnaires de mots de
   passe peuvent proposer d’en générer un.
5. `type="password"`, `autocomplete="current-password"` : le navigateur propose le mot
   de passe enregistré.
6. `type="date"`, `autocomplete="bday"`.
:::

### Exercice 3 — Un formulaire de recherche de cours

Écris un formulaire qui envoie vers `/cours` : un champ de recherche libre (étiquette
« Mot-clé »), un groupe de cases à cocher « Jours » (mardi, jeudi, samedi) et une liste
déroulante « Niveau » (tous niveaux, débutant, confirmé). Le bouton s’intitule
« Rechercher ».

:::solution
```html
<form action="/cours" method="get">
  <label for="keyword">Mot-clé</label>
  <input type="search" id="keyword" name="q">

  <fieldset>
    <legend>Jours</legend>
    <input type="checkbox" id="day-tue" name="day" value="tuesday">
    <label for="day-tue">Mardi</label>
    <input type="checkbox" id="day-thu" name="day" value="thursday">
    <label for="day-thu">Jeudi</label>
    <input type="checkbox" id="day-sat" name="day" value="saturday">
    <label for="day-sat">Samedi</label>
  </fieldset>

  <label for="level">Niveau</label>
  <select id="level" name="level">
    <option value="all">Tous niveaux</option>
    <option value="beginner">Débutant</option>
    <option value="advanced">Confirmé</option>
  </select>

  <button type="submit">Rechercher</button>
</form>
```

- Les cases partagent le `name` « day » : si plusieurs sont cochées, plusieurs paires
  `day=…` seront envoyées (leçon 3).
- Les cases répondent à une même question : `fieldset` et `legend`.
- `method="get"` car c’est une recherche : la leçon 3 explique pourquoi.
- Chaque `id` est unique et chaque `label` désigne le bon champ.
:::

## Récapitulatif

- `form` porte `action` et `method` ; chaque champ à envoyer a un `name`.
- Chaque champ a un `label` visible associé par `for` et `id` (ou par inclusion) : nom
  accessible et zone cliquable agrandie.
- Le `placeholder` ne remplace jamais une étiquette.
- Le `type` adapté (email, tel, number, date…) améliore la saisie ; `autocomplete`
  indique la nature de l’information.
- Les boutons radio d’un groupe partagent leur `name` ; tout groupe de radios est dans
  un `fieldset` avec une `legend`.
- Un `button` dans un formulaire est de type `submit` par défaut ; son texte dit
  l’action.
- `disabled` n’est pas envoyé, `readonly` l’est.
