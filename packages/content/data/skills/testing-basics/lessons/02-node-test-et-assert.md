---
title: Écrire des tests avec node:test et node:assert
summary: Organiser ses tests en suites, préparer les données avec des hooks et choisir la bonne assertion pour chaque vérification.
durationMinutes: 55
sources:
  - title: Documentation Node.js — Test runner (node:test)
    url: https://nodejs.org/api/test.html
  - title: Documentation Node.js — Assert
    url: https://nodejs.org/api/assert.html
---

## Des tests qui restent lisibles

Avec dix tests, une simple liste de `test(…)` suffit. Avec cent, il faut **organiser** :
regrouper les tests d’une même fonction, partager la préparation des données, choisir des
assertions qui donnent des messages d’erreur clairs. Cette leçon fait le tour des outils de
`node:test` et `node:assert/strict` dont tu auras besoin au quotidien.

Nous testons un module de panier, où un panier est un tableau de lignes
`{ name, price, quantity }` :

```js
// src/cart.js — un panier représenté par un tableau de lignes { name, price, quantity }
export function addItem(cart, name, price, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(`Quantité invalide : ${quantity}`);
  }
  const existing = cart.find((line) => line.name === name);
  if (existing) {
    return cart.map((line) =>
      line.name === name ? { ...line, quantity: line.quantity + quantity } : line,
    );
  }
  return [...cart, { name, price, quantity }];
}

export function cartTotal(cart) {
  const cents = cart.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
  return cents / 100;
}
```

`addItem` ne modifie jamais le panier reçu : elle renvoie un nouveau tableau. `cartTotal`
calcule en centimes pour éviter les erreurs d’arrondi des nombres à virgule.

## Regrouper avec describe et it

```js
// test/cart.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { addItem, cartTotal } from '../src/cart.js';

describe('addItem', () => {
  let cart;

  beforeEach(() => {
    cart = [{ name: 'Carnet', price: 4.5, quantity: 1 }];
  });

  it('ajoute une nouvelle ligne', () => {
    const result = addItem(cart, 'Stylo', 1.2, 3);
    assert.deepEqual(result, [
      { name: 'Carnet', price: 4.5, quantity: 1 },
      { name: 'Stylo', price: 1.2, quantity: 3 },
    ]);
  });

  it('augmente la quantité si le produit est déjà présent', () => {
    const result = addItem(cart, 'Carnet', 4.5, 2);
    assert.deepEqual(result, [{ name: 'Carnet', price: 4.5, quantity: 3 }]);
  });

  it('ne modifie pas le panier reçu', () => {
    addItem(cart, 'Stylo', 1.2);
    assert.equal(cart.length, 1);
  });

  it('refuse une quantité nulle ou décimale', () => {
    assert.throws(() => addItem(cart, 'Stylo', 1.2, 0), RangeError);
    assert.throws(() => addItem(cart, 'Stylo', 1.2, 1.5), {
      name: 'RangeError',
      message: 'Quantité invalide : 1.5',
    });
  });
});

describe('cartTotal', () => {
  it('vaut 0 pour un panier vide', () => {
    assert.equal(cartTotal([]), 0);
  });

  it('additionne prix × quantité au centime près', () => {
    const cart = [
      { name: 'Bonbon', price: 0.1, quantity: 1 },
      { name: 'Sucette', price: 0.2, quantity: 1 },
    ];
    assert.equal(cartTotal(cart), 0.3);
  });
});
```

```text
▶ addItem
  ✔ ajoute une nouvelle ligne (1.107697ms)
  ✔ augmente la quantité si le produit est déjà présent (0.288207ms)
  ✔ ne modifie pas le panier reçu (0.175406ms)
  ✔ refuse une quantité nulle ou décimale (0.459039ms)
✔ addItem (6.758876ms)
▶ cartTotal
  ✔ vaut 0 pour un panier vide (0.220899ms)
  ✔ additionne prix × quantité au centime près (0.149317ms)
✔ cartTotal (0.559651ms)
ℹ tests 6
ℹ suites 2
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 93.588787
```

- `describe(nom, fonction)` crée une **suite** : un groupe de tests, affiché avec `▶`.
- `it(nom, fonction)` est un test, exactement comme `test` ; on l’utilise par habitude à
  l’intérieur de `describe`, pour que la phrase se lise : « addItem : ajoute une nouvelle
  ligne ».
- Les suites peuvent s’imbriquer, mais deux niveaux suffisent presque toujours.

Le dernier test mérite un coup d’œil : en JavaScript, `0.1 + 0.2` vaut
`0.30000000000000004`. Un calcul naïf aurait échoué ; le test documente pourquoi la fonction
calcule en centimes.

## Préparer et nettoyer : les hooks

Les **hooks** sont des fonctions exécutées automatiquement autour des tests :

| Hook         | Quand il s’exécute                                    | Usage typique                                       |
| ------------ | ----------------------------------------------------- | --------------------------------------------------- |
| `before`     | une fois, avant tous les tests de la suite            | démarrer un serveur, créer un dossier temporaire    |
| `after`      | une fois, après tous les tests de la suite            | arrêter le serveur, supprimer le dossier            |
| `beforeEach` | avant **chaque** test                                 | recréer des données neuves                          |
| `afterEach`  | après **chaque** test                                 | annuler une modification globale                    |

Ici, `beforeEach` recrée `cart` avant chaque test. Sans lui, un test qui modifierait le panier
(par erreur ou exprès) influencerait les suivants, et le résultat dépendrait de l’**ordre**
des tests : c’est la source des tests « qui échouent parfois ». Chaque test doit partir d’un
état connu.

## Choisir la bonne assertion

| Assertion                                   | Vérifie que…                                                       |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `assert.equal(réel, attendu)`               | les deux valeurs sont identiques (`===`, ou `Object.is`)           |
| `assert.notEqual(réel, attendu)`            | elles sont différentes                                             |
| `assert.deepEqual(réel, attendu)`           | deux objets ou tableaux ont le **même contenu**, récursivement     |
| `assert.ok(valeur)`                         | la valeur est _truthy_                                             |
| `assert.match(texte, /regex/)`              | le texte correspond à l’expression régulière                       |
| `assert.throws(() => code, attendu)`        | la fonction lève une erreur conforme à `attendu`                   |
| `await assert.rejects(promesse, attendu)`   | la promesse est rejetée avec une erreur conforme (leçon 4)         |

### equal ou deepEqual ?

`equal` compare l’**identité** : deux objets distincts ne sont jamais égaux, même avec le
même contenu.

```js
assert.equal({ a: 1 }, { a: 1 });
```

```text
AssertionError [ERR_ASSERTION]: Values have same structure but are not reference-equal:

{
  a: 1
}
```

Pour comparer le contenu d’objets ou de tableaux, utilise `deepEqual`. En cas d’échec, il
affiche une différence très lisible. Si l’on retire de `addItem` la gestion des produits
déjà présents, le deuxième test échoue ainsi :

```text
✖ augmente la quantité si le produit est déjà présent (1.762243ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
      {
        name: 'Carnet',
        price: 4.5,
  +     quantity: 1
  -     quantity: 3
      },
  +   {
  +     name: 'Carnet',
  +     price: 4.5,
  +     quantity: 2
  +   }
    ]
```

Les lignes `+` sont ce que la fonction a renvoyé (`actual`), les lignes `-` ce qui était
attendu (`expected`). On voit immédiatement le bug : une seconde ligne « Carnet » a été
ajoutée au lieu d’augmenter la quantité.

### Tester une erreur avec throws

Pour vérifier qu’un code **lève** une erreur, on passe une **fonction** à `assert.throws` :
c’est `assert.throws` qui l’appelle et attrape l’erreur.

```js
assert.throws(() => addItem(cart, 'Stylo', 1.2, 0), RangeError);
```

Le second argument précise l’erreur attendue :

- une classe (`RangeError`) : l’erreur doit en être une instance ;
- une expression régulière (`/invalide/`) : le message doit correspondre ;
- un objet (`{ name: 'RangeError', message: 'Quantité invalide : 1.5' }`) : chaque propriété
  indiquée doit être égale.

Sans second argument, n’importe quelle erreur ferait réussir le test, y compris une
`TypeError` due à une faute de frappe. Précise toujours ce que tu attends.

:::warning[Passer une fonction, pas un appel]
`assert.throws(addItem(cart, 'Stylo', 1.2, 0), RangeError)` appelle `addItem` **avant**
`assert.throws` : l’erreur est levée hors de l’assertion et le test échoue avec l’erreur
brute. Il faut une fonction fléchée : `() => addItem(…)`.
:::

## Contrôler l’exécution

### Ignorer ou noter un test à écrire

```js
it.skip('gère les codes promotionnels', () => {
  // en attente de la fonctionnalité
});
it.todo('arrondit les remises cumulées');
```

Le rapport les signale (`# SKIP`, `# TODO`) sans les compter comme des échecs. Un test
ignoré doit rester exceptionnel et temporaire : sinon, il cache un problème.

### N’exécuter qu’une partie des tests

- Un fichier : `node --test test/cart.test.js`.
- Par nom : `node --test --test-name-pattern="cartTotal"` n’exécute que les tests et suites
  dont le nom correspond.
- `it.only(…)` marque un test à isoler, mais ne prend effet qu’avec l’option `--test-only`.
  Sans elle, Node.js exécute tout et le signale :
  `'only' and 'runOnly' require the --test-only command-line option.`

Ne commite jamais un `only` ni un `skip` de dépannage.

### Relancer automatiquement

```bash
node --test --watch
```

Les tests sont relancés à chaque enregistrement d’un fichier. Pratique pendant que tu
travailles ; `Ctrl+C` pour arrêter. Tu peux en faire un script npm :
`"test:watch": "node --test --watch"`.

## Organiser ses fichiers de test

- Un fichier de test par module testé : `src/cart.js` et `test/cart.test.js`.
- Une suite `describe` par fonction, un `it` par comportement.
- Des noms qui forment une phrase : le rapport devient une **spécification** lisible du
  module.
- Pas de fichier utilitaire dans `test/` qui ne soit pas un test : `node --test` exécute
  **tous** les fichiers `.js` d’un dossier `test/`. Range les données et fonctions d’aide
  ailleurs (par exemple `test-helpers/`), ou dans un fichier qui ne correspond à aucun
  motif.

## Pièges courants

- **`equal` sur des objets** : échec garanti ; utilise `deepEqual`.
- **`assert.throws` sans fonction**, ou sans préciser l’erreur attendue.
- **Données partagées entre tests** modifiées par l’un d’eux : recrée-les dans
  `beforeEach`.
- **Plusieurs comportements dans un seul test** : au premier échec, les vérifications
  suivantes ne s’exécutent pas et le nom du test ne dit pas ce qui est cassé. Plusieurs
  assertions sur un même comportement sont en revanche normales.
- **Oublier un `only` ou un `skip`** dans le code commité.
- **Tester des détails internes** (le nom d’une variable privée, l’ordre des appels
  internes) : les tests cassent à chaque réécriture sans qu’aucun comportement ait changé.

## Exercices

### Exercice 1 — Une suite pour removeItem

Ajoute à `cart.js` une fonction `removeItem(cart, name)` qui renvoie un nouveau panier sans
la ligne nommée, et lève une `Error` avec le message `Produit absent : NOM` si elle n’existe
pas. Écris d’abord une suite `describe('removeItem')` de trois tests, vérifie qu’ils
échouent, puis implémente la fonction.

:::solution
```js
// test/cart.test.js (ajout ; ajoute removeItem à l'import en haut du fichier)
describe('removeItem', () => {
  let cart;

  beforeEach(() => {
    cart = [
      { name: 'Carnet', price: 4.5, quantity: 1 },
      { name: 'Stylo', price: 1.2, quantity: 3 },
    ];
  });

  it('retire la ligne du produit', () => {
    assert.deepEqual(removeItem(cart, 'Carnet'), [{ name: 'Stylo', price: 1.2, quantity: 3 }]);
  });

  it('ne modifie pas le panier reçu', () => {
    removeItem(cart, 'Carnet');
    assert.equal(cart.length, 2);
  });

  it('refuse un produit absent', () => {
    assert.throws(() => removeItem(cart, 'Gomme'), { message: 'Produit absent : Gomme' });
  });
});
```

```js
// src/cart.js (ajout)
export function removeItem(cart, name) {
  if (!cart.some((line) => line.name === name)) {
    throw new Error(`Produit absent : ${name}`);
  }
  return cart.filter((line) => line.name !== name);
}
```

Avant l’implémentation, c’est tout le fichier de test qui échoue au chargement, avec
`SyntaxError: The requested module '../src/cart.js' does not provide an export named
'removeItem'` : le rapport compte un seul échec et aucun test du fichier ne s’exécute. Pour
voir les tests échouer un par un, exporte d’abord une version vide
(`export function removeItem() {}`) : le premier et le troisième échouent, le deuxième
passe déjà (une fonction vide ne modifie rien), ce qui montre qu’il ne suffit pas à lui
seul. Après l’implémentation, tout passe. `filter` renvoie un
nouveau tableau, ce qui garantit la non-modification ; le deuxième test le vérifie.
:::

### Exercice 2 — Corriger les assertions

Chaque test ci-dessous est faux ou fragile. Explique pourquoi et corrige-le.

```js
it('crée une ligne', () => {
  assert.equal(addItem([], 'Stylo', 1.2), [{ name: 'Stylo', price: 1.2, quantity: 1 }]);
});

it('refuse une quantité négative', () => {
  assert.throws(addItem([], 'Stylo', 1.2, -1));
});

it('le total est bon', () => {
  assert.ok(cartTotal([{ name: 'Stylo', price: 1.2, quantity: 2 }]));
});
```

:::solution
1. `equal` compare l’identité de deux tableaux distincts : échec certain. Utiliser
   `assert.deepEqual(addItem([], 'Stylo', 1.2), [{ name: 'Stylo', price: 1.2, quantity: 1 }])`.
2. `addItem` est appelée avant `assert.throws` et l’erreur attendue n’est pas précisée.
   Écrire `assert.throws(() => addItem([], 'Stylo', 1.2, -1), RangeError)`.
3. `assert.ok` vérifie seulement que le total est _truthy_ : `0.01` ou `999` passeraient.
   Écrire `assert.equal(cartTotal([{ name: 'Stylo', price: 1.2, quantity: 2 }]), 2.4)` et
   renommer le test : `'multiplie le prix par la quantité'`.
:::

### Exercice 3 — Le test qui dépend de l’ordre

Pourquoi le second test réussit-il quand on lance tout le fichier, mais échoue-t-il quand on
l’exécute seul avec `--test-name-pattern="contient le stylo"` ? Corrige.

```js
describe('panier partagé', () => {
  let cart = [];

  it('ajoute un stylo', () => {
    cart = addItem(cart, 'Stylo', 1.2);
    assert.equal(cart.length, 1);
  });

  it('contient le stylo', () => {
    assert.equal(cart[0].name, 'Stylo');
  });
});
```

:::solution
Le second test dépend de l’état laissé par le premier. Exécuté seul, `cart` est vide :
`cart[0]` vaut `undefined` et l’accès à `.name` lève une `TypeError`. Chaque test doit
préparer ses propres données :

```js
describe('addItem sur un panier vide', () => {
  let cart;

  beforeEach(() => {
    cart = [];
  });

  it('ajoute une ligne', () => {
    assert.equal(addItem(cart, 'Stylo', 1.2).length, 1);
  });

  it('crée une ligne au nom du produit', () => {
    assert.equal(addItem(cart, 'Stylo', 1.2)[0].name, 'Stylo');
  });
});
```

Chaque test est maintenant **isolé** : il passe seul, dans n’importe quel ordre.
:::

## Récapitulatif

- `describe` regroupe des tests en suites ; `it` (ou `test`) déclare un test.
- `before`, `after`, `beforeEach`, `afterEach` préparent et nettoient ; `beforeEach`
  garantit des données neuves pour chaque test.
- `equal` compare l’identité, `deepEqual` le contenu ; `match` pour un texte ; `ok` avec
  parcimonie.
- `assert.throws(() => code, attendu)` : une fonction, et une erreur attendue précise.
- `it.skip`, `it.todo`, `--test-name-pattern`, `--test-only` et `--watch` contrôlent
  l’exécution ; ne commite pas de `only`.
- Un fichier de test par module, des noms qui se lisent comme une spécification, et aucun
  fichier utilitaire dans `test/`.
