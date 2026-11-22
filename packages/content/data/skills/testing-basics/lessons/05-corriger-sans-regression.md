---
title: Corriger un bug sans régression
summary: Reproduire un bug par un test qui échoue, le corriger, et garder ce test pour qu’il ne revienne jamais.
durationMinutes: 50
sources:
  - title: Documentation Node.js — Test runner (node:test)
    url: https://nodejs.org/api/test.html
  - title: Pro Git — Enregistrer des modifications (en français)
    url: https://git-scm.com/book/fr/v2
---

## Un bug est une information

Un utilisateur écrit : « Pour une addition de 100 € à trois, l’application annonce 33,33 €
chacun. Il manque un centime. » La tentation est d’ouvrir le code, de changer une ligne, de
réessayer à la main avec 100 € et 3 personnes, puis de passer à autre chose. Trois risques :

- la correction règle ce cas mais en casse un autre (une **régression**) ;
- le bug revient dans six mois, quand quelqu’un réécrit la fonction ;
- on corrige un symptôme sans avoir compris la cause.

La méthode professionnelle tient en cinq étapes :

1. **Reproduire** le bug et trouver l’entrée la plus simple qui le déclenche.
2. Écrire un **test qui échoue** à cause de ce bug, et seulement à cause de lui.
3. **Corriger** le code, le plus simplement possible.
4. Lancer **toute la suite** de tests, pas seulement le nouveau test.
5. **Garder** le test : il devient un test de non-régression, commité avec la correction.

## Le code et ses tests existants

Les montants sont en centimes (des entiers), pour éviter les erreurs d’arrondi des nombres à
virgule.

```js
// src/split-bill.js — partage une addition (en centimes) entre plusieurs personnes
export function splitBill(totalCents, people) {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`Montant invalide : ${totalCents}`);
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError(`Nombre de personnes invalide : ${people}`);
  }
  const share = Math.round(totalCents / people);
  return Array(people).fill(share);
}
```

```js
// test/split-bill.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitBill } from '../src/split-bill.js';

describe('splitBill', () => {
  it('partage 90 € entre 3 personnes', () => {
    assert.deepEqual(splitBill(9000, 3), [3000, 3000, 3000]);
  });

  it('partage 1 € entre 3 personnes', () => {
    assert.deepEqual(splitBill(100, 3), [33, 33, 33]);
  });

  it('une seule personne paie tout', () => {
    assert.deepEqual(splitBill(4550, 1), [4550]);
  });

  it('refuse zéro personne', () => {
    assert.throws(() => splitBill(1000, 0), RangeError);
  });

  it('refuse un montant décimal (on travaille en centimes)', () => {
    assert.throws(() => splitBill(10.5, 2), RangeError);
  });
});
```

Les cinq tests passent. Pourtant, le bug est là. Remarque déjà le deuxième test : il attend
`[33, 33, 33]` pour 100 centimes, soit 99 centimes au total. Ce test **valide le bug** ;
nous y reviendrons.

## Étape 1 : reproduire

Avant tout, on vérifie le bug dans le terminal, avec l’entrée signalée et quelques variantes :

```bash
node --input-type=module -e "import { splitBill } from './src/split-bill.js'; console.log(splitBill(10000, 3), splitBill(200, 3))"
```

```text
[ 3333, 3333, 3333 ] [ 67, 67, 67 ]
```

Deux symptômes : pour 100 €, il **manque** un centime (9 999 au lieu de 10 000) ; pour 2 €,
il y en a un **de trop** (201 au lieu de 200), car `Math.round(66,67)` arrondit au-dessus. La
cause est la même : donner à chacun la même part arrondie ne peut pas tomber juste quand la
division ne tombe pas juste. La règle à respecter devient claire : **la somme des parts doit
toujours être égale au total**.

## Étape 2 : un test qui échoue

On traduit cette règle en test, sur plusieurs cas, dont ceux du rapport :

```js
describe('splitBill : la somme des parts égale le total', () => {
  const cases = [
    { totalCents: 10000, people: 3 },
    { totalCents: 200, people: 3 },
    { totalCents: 100, people: 7 },
  ];

  for (const { totalCents, people } of cases) {
    it(`${totalCents} centimes entre ${people} personnes`, () => {
      const shares = splitBill(totalCents, people);
      const sum = shares.reduce((total, share) => total + share, 0);
      assert.equal(sum, totalCents);
    });
  }
});
```

```text
▶ splitBill : la somme des parts égale le total
  ✖ 10000 centimes entre 3 personnes (0.849352ms)
  ✖ 200 centimes entre 3 personnes (0.304123ms)
  ✖ 100 centimes entre 7 personnes (0.18356ms)
✖ splitBill : la somme des parts égale le total (1.756963ms)
ℹ tests 8
ℹ suites 2
ℹ pass 5
ℹ fail 3
```

Et les détails : `9999 !== 10000`, `201 !== 200`, `98 !== 100`. Le test échoue **pour la
bonne raison** : la somme est fausse, exactement comme dans le rapport. C’est essentiel : un
test qui échouerait pour une autre raison (faute de frappe, mauvais import) ne prouverait
rien.

:::tip[Un test qui exprime la règle, pas seulement l’exemple]
On aurait pu écrire seulement `assert.deepEqual(splitBill(10000, 3), [3334, 3333, 3333])`.
Le test « la somme égale le total » est plus fort : il exprime la **règle** et l’applique à
plusieurs entrées, dont une où l’erreur est dans l’autre sens (201). Un bon test de
non-régression capture la cause, pas seulement le cas signalé.
:::

## Étape 3 : corriger

On calcule la part de base en arrondissant vers le bas, puis on distribue les centimes
restants, un par personne :

```js
// src/split-bill.js (correction)
  const baseShare = Math.floor(totalCents / people);
  const remainder = totalCents - baseShare * people; // centimes restants, entre 0 et people - 1
  // Les premières personnes paient un centime de plus, jusqu'à épuiser le reste.
  return Array.from({ length: people }, (_, index) => baseShare + (index < remainder ? 1 : 0));
```

Ces trois lignes remplacent les deux lignes `const share = …` et `return Array(people)…` ; la
validation des arguments ne change pas.

## Étape 4 : toute la suite

```bash
npm test
```

```text
▶ splitBill
  ✔ partage 90 € entre 3 personnes (1.202972ms)
  ✖ partage 1 € entre 3 personnes (2.081551ms)
  ✔ une seule personne paie tout (0.122825ms)
  ✔ refuse zéro personne (0.343731ms)
  ✔ refuse un montant décimal (on travaille en centimes) (0.113505ms)
✖ splitBill (4.819599ms)
▶ splitBill : la somme des parts égale le total
  ✔ 10000 centimes entre 3 personnes (0.14238ms)
  ✔ 200 centimes entre 3 personnes (0.068441ms)
  ✔ 100 centimes entre 7 personnes (0.135589ms)
✔ splitBill : la somme des parts égale le total (0.559166ms)
ℹ tests 8
ℹ suites 2
ℹ pass 7
ℹ fail 1
```

```text
✖ partage 1 € entre 3 personnes (2.081551ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
  +   34,
      33,
      33,
  -   33
    ]
```

Les nouveaux tests passent, mais un **ancien** test échoue. Avant de toucher quoi que ce soit,
il faut se demander : **le test a-t-il raison, ou la correction ?**

Ici, l’ancien test attendait `[33, 33, 33]`, soit 99 centimes pour une addition de 100 : il
encodait le bug. Le nouveau résultat `[34, 33, 33]` respecte la règle. On met donc à jour
l’ancien test **en connaissance de cause**, et on le renomme pour qu’il documente le
comportement :

```js
it('partage 1 € entre 3 personnes : le centime restant revient au premier', () => {
  assert.deepEqual(splitBill(100, 3), [34, 33, 33]);
});
```

Si l’ancien test avait exprimé une règle juste (par exemple « une seule personne paie
tout »), c’est la correction qu’il aurait fallu revoir. **Ne modifie jamais un test
simplement pour qu’il passe** : chaque modification d’un test existant doit être justifiée,
et la justification figure dans le message de commit.

On en profite pour renforcer la règle : les parts ne doivent pas différer de plus d’un
centime (sinon `[100, 0, 0]` respecterait la somme…).

```js
assert.equal(sum, totalCents);
assert.ok(Math.max(...shares) - Math.min(...shares) <= 1, 'écart de plus d’un centime');
```

Le second argument de `assert.ok` est le message affiché en cas d’échec. Résultat :

```text
ℹ tests 8
ℹ suites 2
ℹ pass 8
ℹ fail 0
```

## Étape 5 : garder et partager

Le test de non-régression reste dans la suite pour toujours. Si quelqu’un réécrit un jour
`splitBill` en réintroduisant l’arrondi naïf, le test échouera immédiatement, avec un nom qui
explique la règle.

On commite le test **et** la correction ensemble, avec un message qui raconte l’histoire :

```bash
git add src/split-bill.js test/split-bill.test.js
git commit -m "Distribue les centimes restants dans le partage d'addition" -m "La somme des parts différait du total (9 999 centimes pour 100 € à trois).
Le test qui attendait [33, 33, 33] pour 1 € validait ce bug : il est corrigé."
```

Dans une équipe, la **pipeline d’intégration continue** exécute `npm test` à chaque envoi
et bloque la fusion si un test échoue. C’est là que la discipline paie : une suite fiable
devient un filet de sécurité pour tout le monde.

## Travailler sous la protection des tests

Une fois la suite verte, tu peux **remanier** le code (_refactoring_ : améliorer sa structure
sans changer son comportement) en relançant les tests à chaque étape, par exemple avec
`node --test --watch`. Tant qu’ils passent, le comportement est préservé.

Certaines équipes poussent la logique plus loin et écrivent **systématiquement** le test
avant le code, même pour une nouvelle fonctionnalité : c’est le **développement piloté par
les tests** (_Test-Driven Development_, TDD), un cycle « rouge (le test échoue), vert (le
code minimal le fait passer), remaniement ». C’est une méthode de travail, pas une
obligation ; mais pour corriger un bug, commencer par le test est une très bonne habitude
dans tous les cas.

## Pièges courants

- **Corriger sans test** : rien ne garantit que le bug ne reviendra pas.
- **Écrire le test après la correction** sans l’avoir vu échouer : peut-être qu’il ne teste
  pas le bug. Vérifie en annulant temporairement la seule correction :
  `git stash push src/split-bill.js` met de côté les modifications de ce fichier (un
  `git stash` sans chemin rangerait aussi les nouveaux tests), relance les tests, puis
  `git stash pop` remet la correction.
- **Lancer seulement le nouveau test** : une régression ailleurs passe inaperçue. Termine
  toujours par la suite complète.
- **Modifier ou supprimer un test qui échoue pour « faire passer » la suite**, sans se
  demander qui a raison.
- **Ajouter `it.skip` à un test qui gêne** : la suite est verte, mais elle ne protège plus.
- **Un test trop lié à l’exemple** (`[3334, 3333, 3333]` seulement) : capture la règle quand
  c’est possible.
- **Un test instable** (qui échoue « parfois ») : trouve la cause (ordre des tests, date
  réelle, réseau, port fixe) au lieu de relancer jusqu’à ce qu’il passe.

## Exercices

### Exercice 1 — Le film trop long

Une application affiche la durée des films. Rapport de bug : « Un film de 90 minutes est
affiché "2 h 30". » Voici le code :

```js
// src/duration.js — affiche une durée en minutes sous la forme « 1 h 05 »
export function formatDuration(minutes) {
  const hours = Math.round(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}
```

Applique la méthode : reproduis, écris des tests (le cas signalé et les cas limites autour
de la demi-heure et de l’heure), vois-les échouer, corrige, relance toute la suite.

:::solution
Reproduction : `formatDuration(90)` donne `'2 h 30'`. La cause : `Math.round(1.5)` vaut 2.
Toute durée dont la partie après l’heure atteint ou dépasse 30 minutes est arrondie à
l’heure supérieure.

```js
// test/duration.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration } from '../src/duration.js';

describe('formatDuration', () => {
  const cases = [
    { minutes: 90, expected: '1 h 30', why: 'le bug signalé' },
    { minutes: 0, expected: '0 h 00', why: 'durée nulle' },
    { minutes: 29, expected: '0 h 29', why: 'juste sous la demi-heure' },
    { minutes: 30, expected: '0 h 30', why: 'demi-heure : Math.round arrondissait à 1 h' },
    { minutes: 59, expected: '0 h 59', why: 'juste sous l’heure' },
    { minutes: 60, expected: '1 h 00', why: 'exactement une heure' },
    { minutes: 61, expected: '1 h 01', why: 'juste au-dessus' },
    { minutes: 125, expected: '2 h 05', why: 'zéro de remplissage' },
  ];

  for (const { minutes, expected, why } of cases) {
    it(`${minutes} min -> ${expected} (${why})`, () => {
      assert.equal(formatDuration(minutes), expected);
    });
  }
});
```

Avant correction, trois tests échouent : 90, 30 et 59 minutes. Les autres passaient déjà,
ce qui explique que le bug ait échappé aux essais rapides. Correction :

```js
const hours = Math.floor(minutes / 60);
```

Après correction, toute la suite passe. On commite test et correction ensemble. Pour aller
plus loin, il faudrait décider du comportement pour une durée négative ou décimale et
ajouter les tests correspondants.
:::

### Exercice 2 — Qui a raison ?

Pour chaque situation, dis s’il faut modifier le test ou le code, et pourquoi.

1. Après ta correction d’un calcul de TVA, le test « 100 € HT donnent 120 € TTC » échoue :
   ton code renvoie 119,99.
2. Après ta correction d’un tri, le test qui attendait `['b', 'a', 'c']` échoue ; ton code
   renvoie `['a', 'b', 'c']`, et la spécification demande l’ordre alphabétique.
3. Un test de route échoue une fois sur dix sur la machine d’intégration continue, avec
   `EADDRINUSE`.

:::solution
1. **Le code** : le test exprime une règle juste (20 % de 100 font 20). La correction a
   introduit une erreur d’arrondi ; il faut la revoir (par exemple calculer en centimes).
2. **Le test** : il encodait l’ancien comportement fautif. On le met à jour en le justifiant
   (« le tri doit être alphabétique ») dans le message de commit.
3. **Le test** (son installation) : `EADDRINUSE` signifie que le port est déjà utilisé, sans
   doute un port fixe partagé avec un autre test qui s’exécute en même temps. Utiliser le
   port 0. Relancer jusqu’à ce que ça passe ne règle rien.
:::

### Exercice 3 — Un bug dans une route

Dans une API, ce code lit le filtre de prix :

```js
const maxPrice = Number(url.searchParams.get('maxPrice')) || Infinity;
sendJson(response, 200, products.filter((product) => product.price <= maxPrice));
```

Un utilisateur signale que `GET /products?maxPrice=0` renvoie **tous** les produits au lieu
d’aucun. Explique la cause, écris le test d’intégration qui reproduit le bug (avec un serveur
sur le port 0, comme dans la leçon précédente), puis corrige.

:::solution
Cause : `Number('0')` vaut `0`, une valeur _falsy_ ; l’opérateur `||` la remplace donc par
`Infinity`, et aucun produit n’est filtré. (Sans paramètre, `get` renvoie `null` et
`Number(null)` vaut aussi `0` : le code confond « absent » et « zéro ».)

Test, dans la suite qui démarre le serveur sur le port 0 :

```js
it('GET /products?maxPrice=0 ne renvoie aucun produit', async () => {
  const response = await fetch(`${baseUrl}/products?maxPrice=0`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});
```

Il échoue (la liste complète est renvoyée). Correction : distinguer explicitement l’absence
du paramètre, comme dans la version de la leçon précédente :

```js
const maxPriceText = url.searchParams.get('maxPrice');
const maxPrice = maxPriceText === null ? Infinity : Number(maxPriceText);
```

Puis ajouter la validation (`400` si `maxPrice` n’est pas un nombre positif) et relancer
toute la suite. Le test `maxPrice=0` reste comme test de non-régression : la confusion entre
`0` et « absent » est un bug classique qui revient facilement.
:::

## Récapitulatif

- Méthode : reproduire, écrire un test qui échoue pour la bonne raison, corriger, lancer
  toute la suite, garder le test.
- Un bon test de non-régression exprime la **règle** violée, sur plusieurs entrées, pas
  seulement l’exemple signalé.
- Quand un ancien test échoue après une correction, demande-toi qui a raison ; ne modifie un
  test qu’en le justifiant.
- Commite le test et la correction ensemble, avec un message qui explique le bug.
- Une suite verte permet de remanier le code en sécurité ; l’intégration continue l’exécute
  à chaque envoi.
- Ni `skip`, ni suppression, ni relance en boucle pour « faire passer » une suite.
