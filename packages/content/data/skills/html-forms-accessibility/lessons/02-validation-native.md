---
title: La validation native et pourquoi le serveur doit revalider
summary: Utiliser les contraintes HTML pour aider la saisie, sans jamais les confondre avec une sécurité.
durationMinutes: 45
sources:
  - title: MDN — Validation des données de formulaire
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Extensions/Forms/Form_validation
  - title: WHATWG — Contraintes de validation des formulaires
    url: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraints
  - title: OWASP — Input Validation Cheat Sheet (en anglais)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
---

## Deux objectifs différents

Quand une personne remplit un formulaire, deux questions se posent :

1. **L’aider** : lui signaler tout de suite qu’une adresse e-mail est incomplète ou
   qu’un champ obligatoire est vide, avant même l’envoi, pour qu’elle corrige sans
   attendre.
2. **Protéger l’application** : s’assurer que les données reçues par le serveur sont
   complètes, au bon format et sans danger.

Le HTML sait très bien faire la première chose, sans une ligne de JavaScript : c’est la
**validation native** (ou validation par contraintes). Il ne peut **pas** faire la
seconde. Cette leçon t’apprend à utiliser la validation native et à expliquer
précisément pourquoi elle ne suffit jamais.

## Les attributs de contrainte

| Attribut                 | Contrainte                                              | S’applique à                    |
| ------------------------ | ------------------------------------------------------- | ------------------------------- |
| `required`               | le champ ne doit pas être vide                          | presque tous les champs         |
| `type="email"`, `"url"`  | la valeur doit avoir le format correspondant            | `input`                         |
| `minlength`, `maxlength` | nombre minimal et maximal de caractères                 | champs de texte, `textarea`     |
| `min`, `max`             | valeur minimale et maximale                             | `number`, `date`, `range`…      |
| `step`                   | pas entre deux valeurs autorisées (1 par défaut)        | `number`, `date`, `range`…      |
| `pattern`                | expression régulière que la valeur doit respecter       | champs de texte                 |

```html
<form action="/inscription" method="post">
  <label for="username">Pseudo</label>
  <p id="username-help">De 3 à 20 lettres ou chiffres, sans espace.</p>
  <input type="text" id="username" name="username" required
         minlength="3" maxlength="20" pattern="[A-Za-z0-9]+"
         aria-describedby="username-help">

  <label for="email">Adresse électronique</label>
  <input type="email" id="email" name="email" required autocomplete="email">

  <label for="age">Âge</label>
  <input type="number" id="age" name="age" min="16" max="120">

  <label for="postal-code">Code postal</label>
  <p id="postal-code-help">5 chiffres, par exemple 44000.</p>
  <input type="text" id="postal-code" name="postalCode" inputmode="numeric"
         pattern="[0-9]{5}" autocomplete="postal-code" aria-describedby="postal-code-help">

  <button type="submit">Créer mon compte</button>
</form>
```

Enregistre ce formulaire dans une page et essaie de l’envoyer vide. Le navigateur
bloque l’envoi, place le focus sur le **premier champ invalide** et affiche une bulle
de message. Le texte exact de ce message dépend du navigateur et de sa langue : tu ne le
contrôles pas en HTML.

### Ce que chaque contrainte accepte vraiment

Voici des résultats vérifiés dans Chromium, saisie faite au clavier :

| Champ                                   | Saisie                    | Résultat                     |
| --------------------------------------- | ------------------------- | ---------------------------- |
| `type="email" required`                 | (vide)                    | invalide : valeur manquante  |
| `type="email" required`                 | `lou@atelier`             | **valide**                   |
| `type="email" required`                 | `lou@@atelier.fr`         | invalide : mauvais format    |
| `pattern="[0-9]{5}"`                    | `1234`                    | invalide : motif non respecté |
| `pattern="[0-9]{5}"`                    | (vide)                    | **valide** (pas de `required`) |
| `pattern="[0-9]{5}"`                    | `12345 ` (espace final)   | invalide : motif non respecté |
| `type="number" min="1" max="10"`        | `3.5`                     | invalide : pas (`step`) non respecté |
| `type="url"`                            | `www.exemple.fr`          | invalide : il manque le schéma |
| `required minlength="3"`                | trois espaces             | **valide**                   |

Plusieurs lignes surprennent :

- `lou@atelier` est une adresse **syntaxiquement** valide selon la norme HTML : le
  navigateur n’exige pas de point dans le domaine. Il ne vérifie évidemment pas que
  l’adresse existe.
- un champ vide qui n’a pas `required` est toujours valide, même avec un `pattern` ;
- `pattern` doit correspondre à **toute** la valeur, pas à une partie : `[0-9]{5}`
  refuse `12345 ` et `a12345`. Inutile d’écrire `^` et `$` ;
- `type="number"` a un `step` de 1 par défaut : `3.5` est refusé. Pour accepter les
  décimales, ajoute `step="0.01"` ou `step="any"` ;
- `required` accepte une valeur faite **uniquement d’espaces**. Un nom « vide » peut
  donc passer la validation du navigateur.

:::note[minlength et les valeurs préremplies]
`minlength` ne s’applique qu’aux valeurs **modifiées par la personne**. Un champ
prérempli dans le HTML avec une valeur trop courte n’est pas signalé tant que personne ne
l’a modifié. De même, `maxlength` empêche de taper au-delà de la limite, mais une valeur
trop longue écrite directement dans l’attribut `value` reste considérée comme valide.

:::

### Le type tel ne valide rien

`type="tel"` affiche un pavé numérique sur mobile, mais n’impose **aucun** format : les
formats de numéros varient trop d’un pays à l’autre. Si tu veux une contrainte, ajoute un
`pattern` et explique le format attendu dans un texte d’aide.

### Listes déroulantes, cases et radios obligatoires

```html
<label for="workshop">Atelier</label>
<select id="workshop" name="workshop" required>
  <option value="">Choisir un atelier</option>
  <option value="tour">Tour</option>
  <option value="modelage">Modelage</option>
</select>

<fieldset>
  <legend>Niveau</legend>
  <input type="radio" id="level-1" name="level" value="beginner" required>
  <label for="level-1">Débutant</label>
  <input type="radio" id="level-2" name="level" value="advanced">
  <label for="level-2">Confirmé</label>
</fieldset>

<input type="checkbox" id="rules" name="rules" value="accepted" required>
<label for="rules">J’accepte le règlement</label>
```

- Un `select` obligatoire est invalide tant que l’option choisie a une valeur vide :
  d’où l’option d’invite `value=""`.
- Pour un groupe de radios, `required` sur **un seul** bouton du groupe suffit : le
  groupe est invalide tant qu’aucun bouton n’est coché.
- Une case `required` doit être cochée.

## Signaler visuellement les erreurs

Le CSS dispose de pseudo-classes qui reflètent l’état de validité :

- `:invalid` correspond à tout champ invalide, **dès le chargement** : un champ
  obligatoire encore vide est déjà « invalide » ; le formulaire lui-même correspond aussi
  à `:invalid` quand l’un de ses champs l’est ;
- `:user-invalid` ne correspond qu’après une interaction : quand la personne a modifié
  le champ puis l’a quitté, ou a tenté d’envoyer le formulaire. Elle est prise en charge
  par les navigateurs actuels.

```html
<style>
  input:user-invalid {
    border: 2px solid #b00020;
  }
</style>
```

L’élément `style` contient du CSS et se place dans le `head` de la page : ici, une
bordure rouge foncé de 2 pixels sur les champs invalides après interaction. Avec `:invalid`, tous les champs obligatoires
seraient rouges avant même qu’on ait commencé à taper, ce qui est désagréable.

:::warning[Pas seulement la couleur]
Une bordure rouge ne suffit pas : une personne qui ne distingue pas le rouge, ou qui
utilise un lecteur d’écran, ne la perçoit pas. Les WCAG interdisent de transmettre une
information **uniquement** par la couleur (critère 1.4.1, niveau A). La bulle du
navigateur donne un message textuel ; tu verras dans la leçon 5 comment afficher des
messages d’erreur textuels quand c’est le serveur qui refuse les données.

:::

## Bien rédiger les consignes

La validation native réagit **après** l’erreur. Le meilleur message d’erreur est celui
qu’on n’a pas besoin d’afficher : donne le format attendu **avant** la saisie, dans un
texte visible relié au champ par `aria-describedby`, comme pour le pseudo et le code
postal de l’exemple.

Les WCAG demandent des étiquettes ou des instructions quand une saisie est requise
(critère 3.3.2, niveau A), d’identifier les erreurs en texte (3.3.1, niveau A) et, si
possible, de suggérer une correction (3.3.3, niveau AA).

## Désactiver la validation native

- `novalidate` sur le `form` désactive la validation au moment de l’envoi ;
- `formnovalidate` sur un bouton d’envoi la désactive pour ce bouton seulement, par
  exemple pour un bouton « Enregistrer le brouillon ».

```html
<form action="/article" method="post">
  <label for="title">Titre</label>
  <input type="text" id="title" name="title" required>
  <button type="submit">Publier</button>
  <button type="submit" formnovalidate name="draft" value="1">Enregistrer le brouillon</button>
</form>
```

On utilise aussi `novalidate` quand on remplace la validation native par des messages
personnalisés en JavaScript, ce que tu verras dans la compétence sur le DOM.

## Pourquoi le serveur doit revalider

### Le navigateur appartient à l’utilisateur

Tout ce qui se passe dans le navigateur est sous le contrôle de la personne qui
l’utilise. Elle peut, en quelques secondes :

- ouvrir l’inspecteur, supprimer l’attribut `required` ou changer `type="email"` en
  `type="text"`, puis envoyer le formulaire ;
- désactiver la validation en ajoutant `novalidate` ;
- ne pas utiliser de navigateur du tout : n’importe quel programme peut envoyer une
  requête HTTP (un script, l’outil en ligne de commande `curl`, un robot).

Le test a été fait dans Chromium, avec un formulaire réduit à ce seul champ : on retire
`required` et on change le type du champ dans l’inspecteur, puis on envoie
`pas-un-email`. Le serveur reçoit sans broncher ce
corps de requête :

```text
email=pas-un-email
```

Et voici une requête HTTP complète qu’un script peut envoyer sans jamais afficher le
formulaire, avec des valeurs qui violent toutes les contraintes du formulaire
d’inscription :

```http
POST /inscription HTTP/1.1
Host: atelier.example
Content-Type: application/x-www-form-urlencoded
Content-Length: 47

username=%3Cscript%3E&email=nope&age=-5&admin=1
```

Le pseudo contient `<script>` (encodé), l’e-mail n’en est pas un, l’âge est négatif, et
un champ `admin` qui n’existe même pas dans le formulaire a été ajouté. Le serveur doit
être prêt à recevoir **n’importe quoi**.

### Le principe

- La validation **côté client** (dans le navigateur) est un **confort** pour
  l’utilisateur honnête : elle évite un aller-retour.
- La validation **côté serveur** est la **seule** qui protège les données et
  l’application. Le serveur vérifie chaque champ : présence, type, longueur, format,
  valeurs autorisées ; il ignore les champs inattendus ; il nettoie les espaces en
  début et en fin de valeur avant de tester qu’un champ n’est pas vide.

C’est une recommandation constante de l’OWASP, la fondation de référence en sécurité
des applications web : toute validation faite côté client peut être contournée et doit
être refaite côté serveur. Tu écriras cette validation dans la partie back-end du
parcours ; dès maintenant, retiens que les contraintes HTML **décrivent** ce qui est
attendu, mais ne le **garantissent** pas.

:::tip[Garder les deux, et les garder cohérentes]
On ne supprime pas la validation native sous prétexte que le serveur revalide : elle
améliore l’expérience. On veille simplement à ce que les deux règles soient les mêmes
(un pseudo de 3 à 20 caractères des deux côtés), sinon le serveur refusera ce que le
navigateur a accepté.

:::

## Pièges courants

- **Croire que `required` protège la base de données**. Correction : revalider côté
  serveur, toujours.
- **Ne pas expliquer le format attendu** et compter sur la bulle du navigateur.
  Correction : un texte d’aide visible, associé au champ.
- **Un `pattern` qui oublie qu’il s’applique à toute la valeur**, ou qui refuse des
  saisies légitimes (noms avec apostrophe, trait d’union ou accent).
- **`type="number"` sans `step`** pour un prix : `12.50` est refusé.
- **Styler `:invalid`** et afficher des erreurs avant toute saisie. Correction :
  `:user-invalid`.
- **Signaler une erreur par la couleur seule**.

## Exercices

### Exercice 1 — Ajouter les contraintes

Complète ce formulaire avec les contraintes suivantes, en HTML uniquement : le prénom
est obligatoire (2 à 40 caractères) ; l’e-mail est obligatoire et au bon format ; le
nombre de places est obligatoire, entier, de 1 à 4 ; le code de réduction est
facultatif mais, s’il est saisi, il fait exactement 6 caractères parmi les lettres
majuscules et les chiffres. Ajoute un texte d’aide pour le code de réduction.

```html
<form action="/reservation" method="post">
  <label for="first-name">Prénom</label>
  <input type="text" id="first-name" name="firstName">

  <label for="email">Adresse électronique</label>
  <input type="text" id="email" name="email">

  <label for="seats">Nombre de places</label>
  <input type="text" id="seats" name="seats">

  <label for="promo">Code de réduction (facultatif)</label>
  <input type="text" id="promo" name="promo">

  <button type="submit">Réserver</button>
</form>
```

:::solution
```html
<form action="/reservation" method="post">
  <label for="first-name">Prénom</label>
  <input type="text" id="first-name" name="firstName" required
         minlength="2" maxlength="40" autocomplete="given-name">

  <label for="email">Adresse électronique</label>
  <input type="email" id="email" name="email" required autocomplete="email">

  <label for="seats">Nombre de places</label>
  <input type="number" id="seats" name="seats" required min="1" max="4">

  <label for="promo">Code de réduction (facultatif)</label>
  <p id="promo-help">6 caractères : lettres majuscules et chiffres, par exemple ETE26A.</p>
  <input type="text" id="promo" name="promo" pattern="[A-Z0-9]{6}"
         aria-describedby="promo-help">

  <button type="submit">Réserver</button>
</form>
```

- `type="email"` remplace `type="text"` : il apporte le contrôle de format.
- `type="number"` convient pour les places : c’est une quantité. Le `step` par défaut
  (1) impose un entier ; `min` et `max` bornent la valeur.
- Le code n’a pas `required` : vide, il est valide ; saisi, il doit respecter le motif
  en entier (6 caractères exactement, grâce à `{6}` et à l’ancrage implicite).
- Le texte d’aide donne le format avant la saisie et est relié au champ.
- Côté serveur, toutes ces règles seront vérifiées à nouveau.

:::

### Exercice 2 — Valide ou invalide ?

Pour chaque saisie, prédis si le navigateur l’accepte, et pourquoi.

1. `type="email"`, saisie `Lou.Martin@atelier.fr`.
2. `pattern="[0-9]{5}"`, saisie `01000`.
3. `type="number" min="1" max="10"`, saisie `10`.
4. `type="number" min="1" max="10"`, saisie `0`.
5. `required minlength="3"`, saisie de deux espaces.
6. `type="url"`, saisie `https://www.exemple.fr`.
7. `type="email"` (sans `multiple`), saisie `lou@atelier.fr,ana@x.fr`.

:::solution
1. Valide : majuscules et point sont autorisés dans la partie locale.
2. Valide : cinq chiffres, le zéro initial est un caractère comme un autre (c’est
   justement pourquoi ce n’est pas un `type="number"`).
3. Valide : `max` est inclusif.
4. Invalide : en dessous de `min` (dépassement par le bas).
5. Invalide : le champ n’est pas vide, donc `required` est satisfait, mais deux
   caractères, c’est moins que `minlength`. Avec **trois** espaces, il serait valide :
   le serveur doit supprimer les espaces avant de vérifier.
6. Valide : schéma et domaine présents.
7. Invalide : une seule adresse est attendue ; l’attribut `multiple` permettrait une
   liste séparée par des virgules.

Ces résultats ont été vérifiés dans Chromium. En cas de doute, teste toi-même : la
console des outils de développement permet aussi de vérifier un champ avec
`document.querySelector('#email').checkValidity()`, qui renvoie `true` ou `false`.

:::

### Exercice 3 — Convaincre un collègue

Un collègue affirme : « On a mis `required` et `pattern` partout, pas besoin de vérifier
côté serveur. » Réponds-lui en quatre à six phrases, avec au moins deux façons concrètes
de contourner la validation et la liste des vérifications que le serveur devra faire
pour le formulaire de l’exercice 1.

:::solution
Une réponse possible :

« La validation HTML s’exécute dans le navigateur, qui est entièrement sous le contrôle
de l’utilisateur. Il suffit d’ouvrir l’inspecteur pour supprimer `required` ou changer
le type d’un champ, et n’importe quel script ou `curl` peut envoyer une requête POST
sans même charger le formulaire. Le serveur doit donc vérifier, pour la réservation :
prénom présent après suppression des espaces, longueur de 2 à 40 ; e-mail au bon
format ; places entier entre 1 et 4 ; code de réduction absent ou conforme à
`[A-Z0-9]{6}`, et existant réellement. Il doit aussi ignorer les champs inattendus.
La validation HTML reste utile, mais pour le confort de l’utilisateur, pas pour la
sécurité. »

Ce qui est attendu : un mécanisme de contournement concret, la distinction confort /
sécurité, et une liste de vérifications précise plutôt que « il faut tout vérifier ».

:::

## Récapitulatif

- `required`, `type`, `minlength`/`maxlength`, `min`/`max`/`step` et `pattern` décrivent
  les contraintes ; le navigateur bloque l’envoi et place le focus sur le premier champ
  invalide.
- Un champ vide non obligatoire est valide ; `pattern` porte sur toute la valeur ;
  `required` accepte des espaces ; `type="tel"` ne valide rien.
- Les consignes de format s’affichent avant la saisie et sont reliées au champ.
- `:user-invalid` signale les erreurs après interaction, jamais par la couleur seule.
- `novalidate` et `formnovalidate` désactivent la validation native.
- La validation côté client est un confort contournable en quelques secondes ; le
  serveur revalide toujours tout.
