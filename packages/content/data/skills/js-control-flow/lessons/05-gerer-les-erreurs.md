---
title: Gérer les erreurs avec throw, try, catch et finally
summary: Signaler une situation anormale avec throw et un objet Error, l’intercepter avec try et catch, et garantir un traitement final avec finally.
durationMinutes: 55
sources:
  - title: MDN — Contrôle du flux d’instructions et gestion des erreurs
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
  - title: MDN — try...catch
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/try...catch
  - title: MDN — throw
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/throw
  - title: MDN — Error
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Error
---

## Quand quelque chose tourne mal

Tu as déjà rencontré des erreurs qui arrêtent un programme : `ReferenceError` pour un
nom inconnu, `TypeError` en lisant une propriété de `undefined`. Quand une erreur n’est
pas gérée, Node.js affiche un message et la pile d’appels, puis arrête le programme avec
le code de sortie 1.

Il faut distinguer deux familles de problèmes :

- les **bugs** : une faute dans le code (faute de frappe, mauvaise borne). On les
  corrige dans le code ; on ne cherche pas à les « attraper » ;
- les **situations anormales prévisibles** : un utilisateur saisit `abc` au lieu d’un
  nombre, un argument manque, une quantité est négative. Le code est correct, mais les
  données ne le sont pas. Le programme doit alors réagir proprement : message clair,
  code de sortie, et parfois continuer avec les autres données.

Cette leçon t’apprend à **signaler** une situation anormale avec `throw` et à la
**traiter** avec `try`, `catch` et `finally`.

## Les objets Error

En JavaScript, une erreur est représentée par un **objet** créé avec `new Error(message)` :

```js
const error = new Error('Quantité invalide');

console.log(error.name); // → Error
console.log(error.message); // → Quantité invalide
console.log(String(error)); // → Error: Quantité invalide
```

- `message` décrit le problème : c’est toi qui le rédiges, pour un humain.
- `name` indique le type d’erreur.
- L’objet retient aussi la **pile d’appels** (`error.stack`), c’est-à-dire l’endroit du
  code où il a été créé : précieux pour déboguer.

Le mot-clé `new` crée un objet à partir d’un modèle (ici `Error`) ; tu n’as pas besoin
d’en savoir plus pour l’instant.

JavaScript fournit des types d’erreurs plus précis, que le langage utilise lui-même et
que tu peux utiliser aussi :

| Type             | Signification habituelle                            | Exemple déclenché par JavaScript   |
| ---------------- | --------------------------------------------------- | ---------------------------------- |
| `TypeError`      | une valeur n’a pas le type attendu                  | `null.length`                      |
| `RangeError`     | une valeur numérique est hors des limites acceptées | `'x'.repeat(-1)`                   |
| `ReferenceError` | un nom n’existe pas                                 | utiliser une variable non déclarée |
| `SyntaxError`    | le code n’est pas du JavaScript valide              | une parenthèse manquante           |

## throw : signaler une situation anormale

`throw` **lance** une erreur : l’exécution normale s’arrête immédiatement à cet endroit.

```js
const quantity = -3;

if (quantity < 0) {
  throw new RangeError(`Quantité négative : ${quantity}`);
}

console.log('Cette ligne ne s’exécute pas');
```

```text
RangeError: Quantité négative : -3
```

Node.js affiche en réalité davantage : le fichier, la ligne, le code concerné et la pile
d’appels, comme pour les erreurs du langage. Si rien n’intercepte l’erreur, le programme
s’arrête avec le code de sortie 1.

:::warning[Toujours lancer un objet Error]
JavaScript permet de lancer n’importe quelle valeur, par exemple `throw 'Erreur';`. Ne le
fais pas : une chaîne n’a ni `name`, ni `message`, ni pile d’appels. Le code qui
l’intercepte, s’il lit `error.message`, obtient `undefined`. Lance toujours un objet
`Error` ou l’un de ses types précis.

:::

Pourquoi lancer une erreur plutôt que d’afficher un message avec `console.log` et de
continuer ? Parce qu’un programme qui continue avec une donnée invalide produit des
résultats faux **plus loin**, là où la cause est difficile à retrouver. Lancer une
erreur arrête le traitement **là où le problème est détecté**, avec un message précis.

## try et catch : intercepter une erreur

Pour traiter une erreur au lieu de laisser le programme s’arrêter, on place le code
risqué dans un bloc `try`, suivi d’un bloc `catch` :

```js
try {
  console.log('Début du traitement');
  const label = 'x'.repeat(-1); // lance une RangeError
  console.log('Jamais affiché', label);
} catch (error) {
  console.log(`Erreur interceptée : ${error.name} — ${error.message}`);
}

console.log('Le programme continue');
```

```text
Début du traitement
Erreur interceptée : RangeError — Invalid count value: -1
Le programme continue
```

Déroulement :

1. Le bloc `try` s’exécute normalement…
2. … jusqu’à ce qu’une erreur soit lancée, par ton code (`throw`) ou par JavaScript. La
   suite du bloc `try` est **sautée**.
3. L’exécution saute au bloc `catch`. La variable entre parenthèses (ici `error`, nom
   conventionnel) reçoit l’objet erreur. Elle n’existe que dans le bloc `catch`.
4. Après le `catch`, le programme continue normalement.

Si aucune erreur n’est lancée, le bloc `catch` est simplement ignoré.

### Exemple complet : valider un argument

Voici un script qui calcule un prix TTC à partir d’un prix HT passé en argument. Les
validations lancent des erreurs, et un seul `catch` les traite toutes :

```js
// vat.js — usage : node vat.js <prix HT>
const input = process.argv[2];

try {
  if (input === undefined) {
    throw new Error('Argument manquant. Usage : node vat.js <prix HT>');
  }
  const price = Number(input);
  if (input.trim() === '' || Number.isNaN(price)) {
    throw new TypeError(`« ${input} » n’est pas un nombre`);
  }
  if (price < 0) {
    throw new RangeError(`Le prix ne peut pas être négatif : ${price}`);
  }
  console.log(`Prix TTC : ${(price * 1.2).toFixed(2)} €`);
} catch (error) {
  console.error(`Erreur : ${error.message}`);
  process.exitCode = 1;
}
```

```bash
node vat.js 32.5
node vat.js douze
node vat.js -5
```

```text
Prix TTC : 39.00 €
Erreur : « douze » n’est pas un nombre
Erreur : Le prix ne peut pas être négatif : -5
```

Le cas normal se lit d’un trait dans le `try`, et toute la gestion des problèmes est
regroupée dans le `catch`. Le message d’erreur est destiné à l’utilisateur : il dit ce
qui ne va pas et comment corriger. `process.exitCode = 1` signale l’échec au terminal.

### Distinguer les erreurs et relancer

Un `catch` intercepte **toutes** les erreurs du bloc `try`, y compris les bugs que tu
n’avais pas prévus. Si tu les traites comme une simple saisie invalide, tu caches un
vrai problème. On peut tester le type de l’erreur avec `instanceof`, et **relancer**
(`throw error;`) celles qu’on ne sait pas traiter :

```js
const rawQuantity = '-2';

try {
  const quantity = Number(rawQuantity);
  if (quantity < 0) {
    throw new RangeError('La quantité doit être positive');
  }
  console.log(`Quantité : ${quantity}`);
} catch (error) {
  if (error instanceof RangeError) {
    console.log(`Saisie refusée : ${error.message}`);
  } else {
    throw error; // erreur inattendue : on ne la masque pas
  }
}
```

```text
Saisie refusée : La quantité doit être positive
```

`error instanceof RangeError` vaut `true` si l’erreur a été créée avec `RangeError`.
Une `TypeError` due à une faute de frappe, elle, serait relancée et arrêterait le
programme avec un message explicite, ce qui est le bon comportement pour un bug.

:::warning[Le catch vide]
Le pire usage de `try` est d’attraper une erreur sans rien en faire :

```js
try {
  // ... du code
} catch (error) {
  // rien
}
```

Le programme continue comme si tout allait bien, avec des données incomplètes ou fausses,
et personne ne sait qu’un problème a eu lieu. Les outils d’IA en produisent parfois
pour « faire disparaître » une erreur. Un `catch` doit au minimum signaler le problème
(message, code de sortie) ou relancer l’erreur.

:::

## finally : ce qui doit toujours s’exécuter

Un bloc `finally`, placé après `try` (et éventuellement `catch`), s’exécute **dans tous
les cas** : que le `try` réussisse, qu’une erreur soit interceptée, ou même que le
`catch` relance une erreur.

```js
const inputs = ['12', 'abc', '7'];

for (const input of inputs) {
  try {
    const value = Number(input);
    if (Number.isNaN(value)) {
      throw new TypeError(`« ${input} » ignoré`);
    }
    console.log(`Valeur ${value} enregistrée`);
  } catch (error) {
    console.log(`Erreur : ${error.message}`);
  } finally {
    console.log(`— fin du traitement de « ${input} »`);
  }
}
```

```text
Valeur 12 enregistrée
— fin du traitement de « 12 »
Erreur : « abc » ignoré
— fin du traitement de « abc »
Valeur 7 enregistrée
— fin du traitement de « 7 »
```

Deux idées importantes dans cet exemple :

- placer le `try` **dans** la boucle permet de traiter chaque élément indépendamment :
  une saisie invalide n’empêche pas de traiter les suivantes. Un `try` autour de la
  boucle entière l’arrêterait à la première erreur ;
- `finally` sert aux actions de **clôture** qui ne doivent jamais être oubliées : afficher
  un bilan, arrêter un chronomètre, et plus tard fermer un fichier ou une connexion à une
  base de données.

`finally` s’exécute même quand on quitte le `try` avec `break` ou `continue` :

```js
for (let i = 0; i < 3; i++) {
  try {
    if (i === 1) {
      continue;
    }
    console.log(`traitement ${i}`);
  } finally {
    console.log(`finally ${i}`);
  }
}
```

```text
traitement 0
finally 0
finally 1
traitement 2
finally 2
```

On peut écrire `try...finally` sans `catch` : l’erreur n’est alors pas interceptée, mais
le `finally` s’exécute avant qu’elle ne remonte.

### Variantes utiles

- Si tu n’as pas besoin de l’objet erreur, tu peux omettre la variable : `catch { ... }`.
- Pour envelopper une erreur dans une autre plus parlante sans perdre l’originale, on
  peut passer l’option `cause` : `new Error('Lecture du panier impossible', { cause:
error })`. L’erreur d’origine reste accessible via `error.cause`.

## Quand utiliser try et catch ?

- **Oui** autour d’un code qui peut lancer une erreur que tu sais traiter : une
  validation qui lance des erreurs, une fonction du langage ou d’une bibliothèque qui
  échoue sur une donnée invalide.
- **Oui** au plus haut niveau d’un script, pour afficher un message clair et fixer
  `process.exitCode` au lieu d’une pile d’appels brute.
- **Non** à la place d’un simple `if` : vérifier `Number.isNaN(value)` ne nécessite pas
  de `try`. `throw` et `catch` servent à **remonter** une erreur détectée à un endroit
  vers le code capable de la traiter. Tu en verras tout l’intérêt avec les fonctions.
- **Non** autour de tout le programme « par précaution », ni avec un `catch` vide.

## Pièges fréquents

- **Lancer une chaîne** (`throw 'erreur'`) : pas de `message`, pas de pile. Correction :
  `throw new Error('...')`.
- **`catch` vide** : l’erreur disparaît. Correction : signaler ou relancer.
- **Tout traiter comme une erreur de saisie** : un bug est masqué. Correction : tester le
  type avec `instanceof` et relancer le reste.
- **Utiliser une variable du `try` après le bloc** : elle a une portée de bloc.
  Correction : la déclarer avant le `try` si elle sert après.
- **`try` autour d’une boucle** quand chaque élément doit être traité : la première
  erreur arrête tout. Correction : `try` dans la boucle.
- **Message d’erreur vague** (`'Erreur'`) : impossible d’agir. Correction : dire ce qui
  est invalide, avec la valeur reçue.

## Exercices

### Exercice 1 — Prévoir l’ordre d’exécution

Prévois exactement ce qu’affiche ce code, puis vérifie.

```js
console.log('A');
try {
  console.log('B');
  throw new Error('C');
  console.log('D');
} catch (error) {
  console.log(error.message);
} finally {
  console.log('E');
}
console.log('F');
```

:::solution

```text
A
B
C
E
F
```

`D` n’est jamais affiché : après le `throw`, la suite du `try` est sautée. Le `catch`
affiche le message de l’erreur (`'C'`), puis le `finally` s’exécute, et le programme
continue avec `F`. Sans `throw`, on aurait `A`, `B`, `D`, `E`, `F`.

:::

### Exercice 2 — Le validateur d’âge

Écris `age.js` qui lit un âge en argument et affiche `Majeur` ou `Mineur`. Il lance une
`TypeError` si l’argument manque ou n’est pas un nombre entier, une `RangeError` s’il
est négatif ou supérieur à 130. Un seul `catch` affiche `Âge invalide : ` suivi du
message, et fixe le code de sortie à 1. Indice : `Number.isInteger(value)` vaut `true`
pour un nombre entier.

:::solution

```js
// age.js — usage : node age.js <âge>
const input = process.argv[2];

try {
  const age = Number(input);
  if (input === undefined || input.trim() === '' || !Number.isInteger(age)) {
    throw new TypeError(`un nombre entier est attendu, reçu « ${input} »`);
  }
  if (age < 0 || age > 130) {
    throw new RangeError(`${age} n’est pas un âge plausible`);
  }
  console.log(age >= 18 ? 'Majeur' : 'Mineur');
} catch (error) {
  console.error(`Âge invalide : ${error.message}`);
  process.exitCode = 1;
}
```

```bash
node age.js 42
node age.js 12.5
node age.js 200
node age.js
```

```text
Majeur
Âge invalide : un nombre entier est attendu, reçu « 12.5 »
Âge invalide : 200 n’est pas un âge plausible
Âge invalide : un nombre entier est attendu, reçu « undefined »
```

`input === undefined` est testé **avant** `input.trim()` : grâce au court-circuit de
`||`, `trim` n’est jamais appelé sur `undefined`. `Number.isInteger` renvoie `false` pour
`NaN` comme pour `12.5`, ce qui couvre les deux cas. Le message pour l’argument absent
pourrait être amélioré avec un test séparé (« argument manquant »).

:::

### Exercice 3 — Le bilan des commandes

Le tableau `const quantities = ['3', '', 'deux', '5', '-1'];` contient des quantités
saisies. Additionne les quantités valides (entiers positifs ou nuls), affiche un message
pour chaque saisie refusée, et termine par un bilan : nombre de saisies traitées et
total. Chaque saisie doit être traitée même si la précédente est invalide.

:::solution

```js
const quantities = ['3', '', 'deux', '5', '-1'];

let total = 0;
let processedCount = 0;

for (const input of quantities) {
  try {
    const quantity = Number(input);
    if (input.trim() === '' || !Number.isInteger(quantity)) {
      throw new TypeError(`« ${input} » n’est pas un nombre entier`);
    }
    if (quantity < 0) {
      throw new RangeError(`« ${input} » est négatif`);
    }
    total += quantity;
  } catch (error) {
    console.log(`Refusé : ${error.message}`);
  } finally {
    processedCount++;
  }
}

console.log(`${processedCount} saisies traitées, total : ${total}`);
```

```text
Refusé : «  » n’est pas un nombre entier
Refusé : « deux » n’est pas un nombre entier
Refusé : « -1 » est négatif
5 saisies traitées, total : 8
```

Le `try` est **dans** la boucle : chaque saisie a sa chance. `finally` compte toutes les
saisies, acceptées ou refusées. Le test `input.trim() === ''` est indispensable, car
`Number('')` vaut 0, un entier valide : sans lui, la saisie vide serait acceptée
silencieusement.

:::

## Récapitulatif

- Une erreur est un objet `Error` (ou `TypeError`, `RangeError`…) avec un `name`, un
  `message` et une pile d’appels.
- `throw new Error('message précis')` arrête l’exécution là où le problème est détecté.
  Lance toujours un objet `Error`, jamais une chaîne.
- `try { ... } catch (error) { ... }` intercepte les erreurs du bloc `try` ; la suite du
  `try` est sautée, puis le programme continue après le `catch`.
- Un `catch` doit signaler le problème ou relancer l’erreur (`throw error;`) ; teste le
  type avec `instanceof` pour ne pas masquer les bugs. Jamais de `catch` vide.
- `finally` s’exécute dans tous les cas : bilan, nettoyage, fermeture.
- Un `try` dans une boucle permet de traiter chaque élément indépendamment.
- Au niveau d’un script, combine `catch`, `console.error` et `process.exitCode = 1`.
