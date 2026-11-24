---
title: Pourquoi TypeScript, et comment le lancer
summary: Comprendre ce que TypeScript vérifie et ce qu’il ne vérifie pas, installer tsc, écrire un tsconfig strict et lire ses erreurs.
durationMinutes: 60
sources:
  - title: TypeScript — The Basics (manuel officiel)
    url: https://www.typescriptlang.org/docs/handbook/2/basic-types.html
  - title: TypeScript — Référence de tsconfig
    url: https://www.typescriptlang.org/tsconfig/
  - title: Node.js — Modules TypeScript (type stripping)
    url: https://nodejs.org/api/typescript.html
---

## Le problème : JavaScript découvre ses erreurs trop tard

Voici une fonction qui ajoute 20 % de TVA à un prix. Elle est écrite en TypeScript, mais
oublie un instant les `: number` : sans eux, c’est du JavaScript ordinaire.

```ts
function addVat(price: number): number {
  return price + price * 0.2;
}

console.log(addVat(100));
console.log(addVat('100'));
```

Exécuté tel quel par Node.js, ce programme affiche :

```text
120
10020
```

Le second appel reçoit la chaîne `'100'`, par exemple lue dans un champ de formulaire.
`price * 0.2` convertit la chaîne en nombre (20), puis `'100' + 20` **concatène** au lieu
d’additionner. Aucun message d’erreur : le programme continue avec un prix faux. Tu as vu ce
piège de conversion dans les leçons sur les types de JavaScript ; le problème, c’est qu’on ne
le découvre qu’**en exécutant** le code, et seulement si on tombe sur le bon cas.

TypeScript résout précisément ce problème. Les annotations `price: number` et `: number`
décrivent ce que la fonction attend et ce qu’elle renvoie. Un programme, le **compilateur**
`tsc`, lit le code **sans l’exécuter** et signale l’incohérence :

```text
vat.ts(6,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

L’erreur est trouvée avant toute exécution, à la ligne 6, colonne 20 : exactement là où la
chaîne est passée.

## Ce qu’est TypeScript

TypeScript est un langage construit **par-dessus** JavaScript : toute la syntaxe de JavaScript
reste valable, et TypeScript y ajoute une syntaxe pour décrire les **types** des
valeurs (nombre, chaîne, objet avec telles propriétés…). Il s’accompagne de deux outils :

- le **vérificateur de types** (_type checker_), qui contrôle que chaque valeur est utilisée
  conformément à son type ;
- le **compilateur** `tsc`, qui contient ce vérificateur et sait aussi produire du JavaScript
  en **effaçant** les annotations.

Retiens l’idée centrale de cette leçon : **les types n’existent pas à l’exécution**. Le
navigateur et Node.js n’exécutent que du JavaScript. Toute la vérification a lieu avant, sur
le texte du programme. C’est une **analyse statique** : elle raisonne sur le code, pas sur les
valeurs réelles.

Ce que TypeScript t’apporte concrètement :

- des erreurs détectées en écrivant le code plutôt qu’en production : faute de frappe dans un
  nom de propriété, argument du mauvais type, valeur possiblement `undefined` oubliée ;
- une documentation qui ne ment pas : la signature `addVat(price: number): number` dit ce
  qu’attend la fonction, et `tsc` refuse le code si elle ne correspond plus ;
- un éditeur plus utile : la plupart des éditeurs, dont VS Code, s’appuient sur TypeScript pour
  proposer l’autocomplétion, afficher le type d’une variable au survol et souligner les erreurs
  en rouge pendant que tu tapes ;
- des modifications plus sûres : si tu renommes une propriété, `tsc` liste tous les endroits à
  mettre à jour.

Ce qu’il ne t’apporte pas : une garantie sur les données qui **entrent** dans ton programme
pendant qu’il tourne (fichier, saisie, réponse d’un serveur). On y revient en fin de leçon,
c’est le point le plus important à comprendre.

## Installer TypeScript dans un dossier de travail

TypeScript s’installe avec **npm**, le gestionnaire de paquets livré avec Node.js. Crée un
dossier pour tous les exercices de cette compétence :

```bash
mkdir ts-practice
cd ts-practice
npm init -y
npm pkg set type=module
npm install --save-dev typescript
npx tsc --version
```

- `npm init -y` crée un fichier `package.json` qui décrit le projet.
- `npm pkg set type=module` y ajoute `"type": "module"` : Node.js traitera tes fichiers comme
  des modules ES, ce qui autorise `import` et `export`.
- `npm install --save-dev typescript` télécharge le compilateur dans `node_modules` et
  l’enregistre comme dépendance de développement : il sert à travailler, pas à faire tourner
  le programme.
- `npx tsc` lance le `tsc` installé dans le dossier. La dernière commande affiche sa version,
  par exemple `Version 7.0.2`.

La compétence « Node.js, modules et npm » détaille npm et `package.json` ; ces quatre
commandes suffisent ici.

## Premier fichier, première compilation

Crée `greet.ts` :

```ts
type User = {
  name: string;
  age: number;
};

function describe(user: User): string {
  return `${user.name} a ${user.age} ans`;
}

const ada: User = { name: 'Ada', age: 36 };
console.log(describe(ada));
```

Le bloc `type User = { … }` donne un nom à une forme d’objet : un `name` de type `string` et un
`age` de type `number`. La fonction annonce qu’elle reçoit un `User` et renvoie une `string`.
Tu étudieras cette syntaxe en détail dans les leçons suivantes.

Compile-le :

```bash
npx tsc greet.ts
node greet.js
```

`tsc` ne dit rien (aucune erreur) et crée un fichier `greet.js` à côté :

```js
"use strict";
function describe(user) {
    return `${user.name} a ${user.age} ans`;
}
const ada = { name: 'Ada', age: 36 };
console.log(describe(ada));
```

```text
Ada a 36 ans
```

Compare les deux fichiers : le type `User` a disparu, ainsi que toutes les annotations. Le
reste est ton code, à peine reformaté. La ligne `"use strict"` active le mode strict de
JavaScript ; elle est ajoutée parce que ce fichier n’a ni `import` ni `export`. C’est la
confirmation de l’idée centrale : à l’exécution, il ne reste **aucune** trace des types.

### Une erreur n’empêche pas la production du JavaScript

Copie le premier exemple dans `vat.ts` et compile-le avec `npx tsc vat.ts`. L’erreur `TS2345`
s’affiche… et pourtant `vat.js` est créé, et `node vat.js` affiche toujours `10020`. Par
défaut, `tsc` signale les erreurs mais produit quand même le JavaScript. L’option
`--noEmitOnError` change ce comportement : aucun fichier n’est écrit tant qu’il reste une
erreur. Retiens surtout qu’**une erreur de type n’empêche jamais un programme de tourner** :
c’est à toi de ne pas ignorer ce que dit `tsc`. Ses erreurs ne servent que si tu les lis.

## Exécuter un fichier `.ts` directement avec Node.js

Node.js 24 sait exécuter un fichier TypeScript sans passer par `tsc` :

```bash
node greet.ts
```

```text
Ada a 36 ans
```

Node.js applique le **type stripping** (« retrait des types ») : il remplace chaque annotation
par des espaces, puis exécute le JavaScript restant. Les lignes et les colonnes ne bougent pas,
donc les messages d’erreur d’exécution pointent au bon endroit de ton fichier `.ts`.

Cette fonctionnalité est activée par défaut dans Node.js 24. Les versions 24.0 à 24.2
affichaient un avertissement `ExperimentalWarning` à chaque exécution ; il a disparu en 24.3,
et la documentation de Node.js déclare la fonctionnalité stable depuis la 24.12. Les sorties de
ce cours ont été obtenues avec une version 24 à jour.

Mais Node.js **ne vérifie aucun type**. Essaie :

```bash
node vat.ts
```

```text
120
10020
```

Aucun avertissement : le bug passe. C’est la répartition des rôles à retenir :

| Outil         | Vérifie les types | Exécute le code |
| ------------- | ----------------- | --------------- |
| `npx tsc`     | oui               | non             |
| `node app.ts` | non               | oui             |

En pratique, tu lances les deux : `tsc` pour vérifier, `node` pour exécuter.

### Les limites du type stripping

Retirer des annotations ne fonctionne que si la syntaxe TypeScript est **effaçable** : une
fois les types enlevés, il doit rester du JavaScript valide qui fait la même chose. Quelques
constructions de TypeScript génèrent au contraire du code, et Node.js les refuse. La plus
connue est `enum` :

```ts
enum Color {
  Red,
  Green,
}
console.log(Color.Green);
```

`node color.ts` s’arrête avec :

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

Il en va de même pour un `namespace` qui contient du code et pour les propriétés de paramètres
de classe (`constructor(public x: number)`). Ce cours n’utilise aucune de ces syntaxes : tu
verras dans la leçon 3 qu’une union de littéraux (`'red' | 'green'`) remplace avantageusement
un `enum`.

Autre limite, plus discrète : les **imports de types**. Un type n’existe pas à l’exécution,
donc un module ne peut pas l’exporter réellement. Prends deux fichiers :

```ts
// types.ts
export type User = {
  name: string;
  age: number;
};

export const MIN_AGE = 18;
```

```ts
// main.ts
import type { User } from './types.ts';
import { MIN_AGE } from './types.ts';

const ada: User = { name: 'Ada', age: 36 };
console.log(ada.age >= MIN_AGE);
```

`export` rend un nom utilisable depuis un autre fichier et `import` le récupère. `import type`
signale que `User` n’est qu’un type : Node.js supprime toute la ligne. `node main.ts` affiche
`true`. Si tu écris au contraire `import { User, MIN_AGE } from './types.ts';`, Node.js cherche
une vraie valeur `User` dans `types.ts` et échoue :

```text
SyntaxError: The requested module './types.ts' does not provide an export named 'User'
```

Note aussi que l’extension `.ts` figure dans le chemin importé : Node.js l’exige.

## Le fichier `tsconfig.json`

Taper des options sur la ligne de commande devient vite pénible. Un fichier `tsconfig.json` à la
racine du dossier fixe la configuration une fois pour toutes. Voici celui que tu utiliseras
pendant toute cette compétence ; il reprend, à une option près, les réglages que la
documentation de Node.js recommande pour le type stripping, plus le mode strict :

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  }
}
```

- `target: "esnext"` : tu vises la version la plus récente de JavaScript, celle que Node.js 24
  comprend ; `tsc` n’a rien à réécrire.
- `module: "nodenext"` : `tsc` suit les règles de modules de Node.js (le `"type": "module"` de
  `package.json`, les extensions obligatoires…).
- `strict: true` : active toutes les vérifications strictes, dont `strictNullChecks` (la leçon
  3 montre son rôle) et `noImplicitAny`. **Ne travaille jamais sans** : sans elles, TypeScript
  laisse passer une grande partie des erreurs. Depuis TypeScript 6.0, `strict` est activé par
  défaut ; ce n’était pas le cas des versions 5.x, encore très répandues. L’écrire rend la
  configuration explicite quelle que soit la version.
- `noEmit: true` : `tsc` vérifie sans produire de `.js`, puisque Node.js exécute directement
  les `.ts`.
- `allowImportingTsExtensions: true` : autorise les imports en `./types.ts`, que Node.js exige.
  La documentation de Node.js propose à sa place `rewriteRelativeImportExtensions`, utile
  quand `tsc` produit aussi des `.js` ; ici, rien n’est produit.
- `erasableSyntaxOnly: true` : `tsc` refuse `enum` et les autres syntaxes non effaçables, avec
  l’erreur `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.` Tu le
  sais avant que Node.js ne plante.
- `verbatimModuleSyntax: true` : `tsc` exige `import type` pour un import qui n’est qu’un type,
  avec l’erreur `TS1484: 'User' is a type and must be imported using a type-only import when
  'verbatimModuleSyntax' is enabled.`

Le fichier présent, la commande change : tape `npx tsc` **sans nom de fichier**. `tsc` trouve
`tsconfig.json` et vérifie tous les `.ts` du dossier et de ses sous-dossiers.

:::warning[`npx tsc fichier.ts` ignore le tsconfig]
Si tu donnes un nom de fichier alors qu’un `tsconfig.json` existe, `tsc` refuse de travailler :

```text
error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.
```

Ce refus existe depuis TypeScript 6.0. Les versions antérieures compilaient le fichier en
ignorant le `tsconfig.json` sans prévenir, donc sans `strict`.

Avec un `tsconfig.json`, lance toujours `npx tsc` seul. Supprime aussi les `greet.js` et
`vat.js` créés plus tôt : ils ne servent plus.
:::

La configuration d’un vrai projet serveur (dossiers `src` et `dist`, compilation pour la
production, types de Node.js) est l’objet de la compétence « TypeScript côté serveur ». Ce
fichier minimal suffit pour apprendre le langage.

## Lire une erreur de `tsc`

Dans un terminal, `tsc` affiche ses erreurs dans un format mis en forme :

```text
vat.ts:6:20 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

6 console.log(addVat('100'));
                     ~~~~~


Found 1 error in vat.ts:6
```

Quand sa sortie est redirigée (vers un fichier, un outil d’intégration continue), il utilise la
forme compacte vue plus haut : `vat.ts(6,20): error TS2345: …`. Les informations sont les mêmes :

1. **Où** : fichier `vat.ts`, ligne 6, colonne 20. Les tildes `~~~~~` soulignent l’expression
   fautive.
2. **Le code** `TS2345` : un identifiant stable. Il permet de chercher l’erreur en ligne ou de
   reconnaître une famille d’erreurs.
3. **Le message**, qui suit presque toujours le même schéma : « le type **A** n’est pas
   assignable au type **B** ». A est ce que tu fournis, B ce qui est attendu. Ici : tu donnes
   une `string` là où un `number` est attendu.

Les codes que tu croiseras le plus souvent dans cette compétence :

| Code   | Ce qu’il signifie                                                         |
| ------ | ------------------------------------------------------------------------- |
| TS2322 | une valeur ne correspond pas au type de la variable ou du retour          |
| TS2345 | un argument ne correspond pas au type du paramètre                        |
| TS2339 | la propriété n’existe pas sur ce type                                     |
| TS2551 | idem, avec une suggestion (« Did you mean 'name'? »)                      |
| TS7006 | un paramètre n’a pas de type et serait implicitement `any`                |
| TS18048 | la valeur est peut-être `undefined` et doit être vérifiée avant usage    |

Méthode de lecture : corrige **la première erreur** d’abord, puis relance `tsc`. Une erreur
en provoque souvent d’autres plus loin, qui disparaissent avec elle. Lis le message en entier,
même s’il est long : la fin contient souvent la précision utile. Et si un message reste obscur,
demander à une IA de le reformuler est un bon usage… à condition de vérifier ensuite que tu
sais l’expliquer toi-même.

## Ce que TypeScript ne vérifie pas à l’exécution

Puisque les types sont effacés, rien ne contrôle les valeurs qui arrivent **pendant**
l’exécution. Trois situations le montrent.

### `JSON.parse` renvoie `any`

```ts
type Profile = {
  name: string;
  age: number;
};

const text = '{"name":"Ada","age":"36"}'; // l’âge arrive sous forme de texte
const profile: Profile = JSON.parse(text);

console.log(profile.age + 1);
```

`npx tsc` : aucune erreur. `node profile.ts` :

```text
361
```

`JSON.parse` est déclaré dans TypeScript comme renvoyant `any`, un type spécial qui veut dire
« n’importe quoi, ne vérifie rien ». Une valeur `any` peut être affectée à n’importe quel type :
écrire `const profile: Profile = …` ne fait qu’**affirmer** que le texte a la bonne forme, sans
le contrôler. Le texte contenait `"36"`, une chaîne, et on retrouve la concaténation du début de
la leçon.

### Les réponses réseau aussi

C’est la même chose pour toute donnée qui vient de l’extérieur. Avec `fetch`, que tu étudies dans
la compétence sur l’asynchrone, `response.json()` est déclaré comme renvoyant `Promise<any>` :
une réponse de serveur typée `Profile` dans ton code peut contenir n’importe quoi.

### L’assertion `as` est une promesse que rien ne vérifie

Le mot-clé `as` permet de dire à TypeScript « fais-moi confiance, cette valeur est de ce type » :

```ts
type Profile = {
  name: string;
  age: number;
};

const data = JSON.parse('{"name":"Ada"}');
const profile = data as Profile;

console.log(profile.name.toUpperCase());
console.log(profile.age.toFixed(1));
```

`tsc` accepte tout. À l’exécution, la première ligne affiche `ADA`, puis :

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

`as` ne convertit rien et ne contrôle rien : c’est une **assertion de type**, effacée comme le
reste. Elle fait taire le compilateur et déplace l’erreur à l’exécution. `tsc` refuse seulement
les assertions absurdes, entre types sans rapport (fichier `label.ts`) :

```ts
const label = 'quarante-deux';
const answer = label as number;
```

```text
label.ts(2,16): error TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

Le message propose de passer par `unknown` (`label as unknown as number`) : c’est possible, et
c’est précisément le genre de double assertion qui doit t’alerter quand tu la lis dans du code
généré.

:::warning[Règle de conduite]
Toute donnée qui entre dans le programme (JSON, saisie, réponse HTTP, fichier) doit être
**vérifiée à l’exécution** avant d’être considérée comme typée. La leçon 4 montre comment le
faire avec `unknown` et des contrôles `typeof` ; la compétence « TypeScript côté serveur »
automatise ce travail avec une bibliothèque de validation par schéma. Un `as` sur une donnée
externe n’est pas une validation.
:::

## Pièges courants

- **Croire que `node fichier.ts` vérifie les types.** Il les efface sans les lire. Seul `tsc`
  vérifie.
- **Ignorer les erreurs parce que « ça marche ».** Le code fautif s’exécute souvent
  correctement sur les cas testés. L’erreur de `tsc` signale un cas qui finira par arriver.
- **Travailler sans `strict`.** Sans `noImplicitAny`, un paramètre sans annotation devient
  `any` en silence et n’est plus vérifié du tout.
- **Utiliser `as` pour faire disparaître une erreur.** L’erreur ne disparaît pas, elle est
  reportée à l’exécution.
- **Utiliser `process` sans configuration.** Les objets propres à Node.js, comme `process`, ne
  sont pas connus de `tsc` sans le paquet de définitions `@types/node`, déclaré dans l’option
  `types` du `tsconfig.json` (depuis TypeScript 6.0, installer le paquet ne suffit plus) :
  `error TS2591: Cannot find name 'process'. Do you need to install type definitions for node?…`
  La compétence « TypeScript côté serveur » le configure ; les exemples de celle-ci s’en passent.

## Exercices

### Exercice 1 — Ça marche, et pourtant

Prévois ce qu’affichent `node price.ts` puis `npx tsc`, puis vérifie.

```ts
function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

console.log(formatPrice(1999));
console.log(formatPrice('1999'));
```

Pourquoi `tsc` a-t-il raison de refuser un code qui affiche un résultat correct ?

:::solution
`node price.ts` affiche :

```text
19.99 €
19.99 €
```

`'1999' / 100` convertit la chaîne en nombre : la division donne 19.99, et le résultat est juste
par chance. `npx tsc` affiche :

```text
price.ts(6,25): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

`tsc` a raison : la fonction promet de recevoir un nombre, et le jour où quelqu’un modifie son
corps pour faire `cents + 1` (concaténation pour une chaîne) le résultat deviendra faux sans
bruit. La correction est de convertir **avant** l’appel : `formatPrice(Number(input))`, en
contrôlant `Number.isNaN` si la saisie peut être invalide.
:::

### Exercice 2 — Lire une erreur

Ce fichier `score.ts` produit l’erreur ci-dessous. Indique le fichier, la ligne, la colonne,
ce qui est fourni et ce qui est attendu, puis corrige.

```ts
let score = 0;
const bonus = '5';

score = score + bonus;
console.log(score);
```

```text
score.ts(4,1): error TS2322: Type 'string' is not assignable to type 'number'.
```

:::solution
Fichier `score.ts`, ligne 4, colonne 1 : le début de l’affectation `score = …`. La valeur
fournie est de type `string`, le type attendu est `number`.

Pourquoi ? `let score = 0` donne à `score` le type `number` (TypeScript le déduit de la valeur
initiale, c’est l’inférence vue dans la leçon suivante). `score + bonus` additionne un nombre et
une chaîne : en JavaScript, c’est une concaténation, le résultat est la chaîne `'05'`, que l’on
ne peut pas ranger dans un `number`. Sans TypeScript, `node` afficherait `05`.

Correction : convertir explicitement.

```ts
let score = 0;
const bonus = '5';

score = score + Number(bonus);
console.log(score);
```

`npx tsc` ne signale plus rien et `node score.ts` affiche `5`.
:::

### Exercice 3 — Des préférences mal enregistrées

Des préférences sont relues depuis un texte JSON enregistré par une ancienne version de
l’application. Prévois la sortie, explique pourquoi `tsc` ne dit rien, puis écris une fonction
`readSettings(text: string): Settings` qui lève une erreur si les valeurs n’ont pas le bon type.

```ts
type Settings = {
  pageSize: number;
  darkMode: boolean;
};

const saved = '{"pageSize":"20","darkMode":"false"}';
const settings: Settings = JSON.parse(saved);

const lastPage = Math.ceil(95 / settings.pageSize);
console.log(lastPage);
console.log(settings.pageSize + 10);
if (settings.darkMode) {
  console.log('Thème sombre activé');
}
```

:::solution
Sortie :

```text
5
2010
Thème sombre activé
```

La division convertit `'20'` en nombre, donc `lastPage` est juste par chance. L’addition
concatène : `'20' + 10` donne `'2010'`. Et `'false'` est une chaîne non vide, donc **truthy** :
le thème sombre s’active alors que l’utilisateur l’avait désactivé.

`tsc` ne dit rien car `JSON.parse` renvoie `any`, que TypeScript accepte partout. Il faut
contrôler les valeurs à l’exécution :

```ts
type Settings = {
  pageSize: number;
  darkMode: boolean;
};

function readSettings(text: string): Settings {
  const data = JSON.parse(text); // any : rien n’est vérifié
  if (typeof data.pageSize !== 'number' || typeof data.darkMode !== 'boolean') {
    throw new Error('Préférences invalides');
  }
  return data;
}

console.log(readSettings('{"pageSize":20,"darkMode":false}'));

try {
  readSettings('{"pageSize":"20","darkMode":"false"}');
} catch (error) {
  console.log(String(error));
}
```

```text
{ pageSize: 20, darkMode: false }
Error: Préférences invalides
```

Cette version reste fragile : `data` est `any`, donc une faute de frappe comme `data.pageSise`
ne serait pas signalée, et si le texte vaut `null`, `data.pageSize` lève une `TypeError`. La
leçon 4 montre une manière plus sûre, avec `unknown`.
:::

## Récapitulatif

- TypeScript ajoute à JavaScript des annotations de types ; `tsc` les vérifie **sans exécuter**
  le code, puis peut produire du JavaScript où les types sont effacés.
- Les types n’existent pas à l’exécution. Une erreur de type n’empêche ni la production du
  JavaScript ni son exécution.
- `node fichier.ts` (Node.js 24) retire les annotations et exécute, **sans aucune vérification**.
  Il refuse les syntaxes non effaçables (`enum`, `namespace` avec du code, propriétés de
  paramètres) et exige `import type` pour importer un type.
- Le `tsconfig.json` de la compétence active `strict`, `noEmit`, `erasableSyntaxOnly` et
  `verbatimModuleSyntax` ; avec lui, on lance `npx tsc` sans nom de fichier.
- Une erreur se lit : fichier, ligne, colonne, code `TSxxxx`, puis « le type fourni n’est pas
  assignable au type attendu ». On corrige la première d’abord.
- `JSON.parse`, `response.json()` et `as` introduisent des types **non vérifiés**. Toute donnée
  externe doit être contrôlée à l’exécution.
