---
title: Configurer un projet Node.js en TypeScript
summary: Créer un projet serveur en TypeScript strict avec des modules ES, l’exécuter en développement avec Node.js, le vérifier avec tsc et le compiler pour la production.
durationMinutes: 60
sources:
  - title: Node.js — Modules TypeScript (type stripping)
    url: https://nodejs.org/api/typescript.html
  - title: TypeScript — Référence de tsconfig
    url: https://www.typescriptlang.org/tsconfig/
  - title: TypeScript — Référence des modules
    url: https://www.typescriptlang.org/docs/handbook/modules/reference.html
  - title: Node.js — Options de la ligne de commande (--watch)
    url: https://nodejs.org/api/cli.html
---

## D’un fichier d’exercice à un vrai projet

Dans la compétence « Bases de TypeScript », tu as travaillé avec des fichiers isolés : un
`tsconfig.json` minimal, `npx tsc` pour vérifier, `node fichier.ts` pour exécuter. Un serveur
pose des questions nouvelles :

- le code est réparti en **plusieurs modules** qui s’importent les uns les autres ;
- il utilise des **objets propres à Node.js** (`process`, `node:http`…) et des **bibliothèques**
  (Express, Zod) dont TypeScript doit connaître les types ;
- il se lance en **développement** (relancé à chaque modification) et en **production** ;
- il a des **tests**, qui doivent être vérifiés par `tsc` comme le reste.

Cette leçon met en place une configuration qui répond à tout cela, et que tu garderas pour
toute la compétence. Chaque option est expliquée : tu dois pouvoir justifier chaque ligne de ton
`tsconfig.json`, pas le recopier.

## Le projet fil rouge

Tout au long de la compétence, tu construis **bookings-api**, une petite API de réservation de
salles de réunion. Une réservation a une salle (`atlas`, `balise` ou `cap`), un titre, une date,
une heure de début et une durée. L’API permet de lister, lire, créer et supprimer des
réservations, et refuse deux réservations qui se chevauchent. Les données sont gardées **en
mémoire** : pas de base de données ici, pour se concentrer sur TypeScript.

Voici l’arborescence que tu auras à la fin de la leçon 5 :

```text
bookings-api/
  package.json
  tsconfig.json            configuration de vérification (src et test)
  tsconfig.build.json      configuration de compilation pour la production
  .gitignore
  src/
    server.ts              démarre le serveur (seul fichier qui appelle listen)
    app.ts                 construit l'application Express
    config.ts              lit et valide la configuration
    contracts/bookings.ts  schémas Zod et types partagés
    bookings/rules.ts      règles métier pures (chevauchements)
    bookings/store.ts      stockage en mémoire
    http/                  erreurs, validation, gestionnaire d'erreurs
    routes/bookings.ts     routes /api/bookings
  test/
    rules.test.ts
    contracts.test.ts
    bookings-api.test.ts
```

Tu reconnais l’organisation de la leçon « Fichiers statiques et structure d’un petit projet »
de la compétence Express : `server.ts` démarre, `app.ts` assemble, chaque responsabilité a son
fichier. Seule l’extension change… et beaucoup de vérifications deviennent possibles.

## Créer le projet et installer les dépendances

```bash
mkdir bookings-api
cd bookings-api
npm init -y
npm pkg set type=module
npm install express@5 zod
npm install --save-dev typescript @types/node@24 @types/express
```

Les cours de cette compétence ont été vérifiés avec ces versions : `express` 5.3.0, `zod` 4.6.7,
`typescript` 7.0.2, `@types/express` 5.0.6 et `@types/node` 24.19.2, avec Node.js 24.21.0.

Deux familles de paquets :

- les **dépendances** (`dependencies`) sont nécessaires pour faire tourner le serveur :
  `express` et `zod` (la bibliothèque de validation de la leçon 3) ;
- les **dépendances de développement** (`devDependencies`) ne servent qu’à travailler :
  le compilateur `typescript` et les paquets `@types/…`.

### Les paquets `@types`

Express est écrit en JavaScript : il ne contient aucune information de type. La communauté
maintient ces informations à part, dans des **fichiers de déclaration** (`.d.ts`) publiés sous le
nom `@types/<paquet>` (projet DefinitelyTyped). `@types/express` décrit `express()`, `Request`,
`Response`, etc. ; `@types/node` décrit `process`, `node:http`, `node:test`…

Deux précautions :

- **Aligne `@types/node` sur ta version de Node.js** : `@types/node@24` décrit l’API de la
  version 24 de Node.js. Une version plus récente te laisserait utiliser, sans erreur de `tsc`,
  des fonctions qui n’existent pas encore dans ton Node.js.
- Les déclarations sont **écrites à la main** par des contributeurs : elles peuvent être en
  retard sur la bibliothèque, ou plus larges que son comportement réel. Tu en verras un exemple
  avec `req.query` dans la leçon 2.

Certaines bibliothèques, comme Zod, sont écrites en TypeScript et **embarquent leurs types** : pas
de `@types/zod` à installer.

## Le `tsconfig.json` du serveur

Crée ce fichier à la racine :

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

Tu connais déjà `target`, `module`, `strict`, `noEmit`, `erasableSyntaxOnly` et
`verbatimModuleSyntax`. Rappel rapide, puis les nouveautés.

| Option                            | Rôle                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `target: "esnext"`                | ne réécrit pas la syntaxe moderne : Node.js 24 la comprend                             |
| `module: "nodenext"`              | applique les règles de modules de Node.js (`"type": "module"`, extensions obligatoires) |
| `strict: true`                    | toutes les vérifications strictes, dont `strictNullChecks` et `noImplicitAny`          |
| `noEmit: true`                    | `npx tsc` vérifie sans écrire de fichier `.js`                                         |
| `erasableSyntaxOnly: true`        | refuse `enum`, `namespace` avec du code et les propriétés de paramètres               |
| `verbatimModuleSyntax: true`      | exige `import type` pour un import qui n’est qu’un type                                |

### `types: ["node"]` : déclarer l’environnement Node.js

Depuis TypeScript 6.0, installer `@types/node` ne suffit plus : l’option `types` vaut `[]` par
défaut, et seuls les paquets qu’elle cite sont chargés. Sans elle, un projet qui ne contient
que le fichier `src/config.ts` présenté plus bas est refusé :

```text
src/config.ts(4,16): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
src/config.ts(5,8): error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

Le message dit exactement quoi faire. Note qu’on ne cite pas `express` : les types d’un paquet
que tu **importes** sont trouvés automatiquement. `types` ne concerne que les déclarations
globales, comme `process`, qu’aucun `import` n’amène.

Attention, l’oubli peut passer inaperçu : dès qu’un fichier importe `express`, les déclarations
d’Express chargent elles-mêmes `@types/node`, et l’erreur disparaît. Déclare quand même
`"node"` : ton code utilise `process` directement et ne doit pas dépendre de ce qu’une
bibliothèque charge pour ses propres besoins.

### `noUncheckedIndexedAccess` : un tableau peut être plus court que prévu

Avec `strict` seul, `titles[0]` est de type `string`, même si le tableau est vide. Cette option
ajoute `| undefined` à toute lecture par index, dans un tableau comme dans un objet dictionnaire.
Elle ne fait pas partie de `strict`, mais elle protège un serveur d’une erreur fréquente : lire
le premier résultat d’une recherche qui n’a rien trouvé. Fichier `src/check.ts` :

```ts
const titles: string[] = ['Point hebdo', 'Rétro'];
const first = titles[0];
console.log(first.toUpperCase());

const port = process.env.PORT;
console.log(port.length);
```

```text
src/check.ts(3,13): error TS18048: 'first' is possibly 'undefined'.
src/check.ts(6,13): error TS18048: 'port' is possibly 'undefined'.
```

La seconde erreur ne vient pas de l’option mais de `@types/node`, qui déclare chaque variable
d’environnement comme `string | undefined` : une variable peut toujours être absente. Tu
traites ces deux cas comme dans la leçon sur `strictNullChecks` : un `if`, un `??` ou une
valeur par défaut. Supprime `src/check.ts` ensuite.

### `rewriteRelativeImportExtensions` : des imports en `.ts` qui deviennent `.js`

Node.js exige l’extension complète dans un import relatif, et en développement il exécute les
fichiers `.ts` eux-mêmes : on écrit donc `import { config } from './config.ts'`. Mais pour la
production, `tsc` va produire des fichiers `.js` (section suivante). Un `server.js` compilé qui
importerait encore `./config.ts` chercherait un fichier qui n’existe pas dans `dist/`.

`rewriteRelativeImportExtensions` règle ce problème : `tsc` accepte les imports relatifs en `.ts`
et les **réécrit en `.js`** dans les fichiers qu’il produit. C’est l’option que recommande la
documentation de Node.js quand on distribue des `.js`. Dans la compétence précédente, tu utilisais
`allowImportingTsExtensions`, qui autorise aussi les imports en `.ts` mais **interdit** de
produire des fichiers : elle convient tant qu’on ne compile jamais.

Sans aucune des deux options, `tsc` refuse l’import :

```text
src/server.ts(3,24): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
```

### `skipLibCheck` et `include`

- `skipLibCheck: true` : `tsc` ne vérifie pas le contenu des fichiers `.d.ts` des dépendances.
  Il continue de les **utiliser** pour vérifier ton code ; il évite seulement de te signaler des
  erreurs internes à des déclarations que tu ne peux pas corriger, et accélère la vérification.
  `tsc --init` l’active par défaut.
- `include: ["src", "test"]` : les dossiers à vérifier. Les **tests** en font partie : un test
  mal typé est un test qui peut mentir.

## Premiers fichiers

```ts
// src/config.ts
// Toute la configuration vient de l'environnement, avec des valeurs par défaut.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  env: process.env.NODE_ENV ?? 'development',
};
```

```ts
// src/server.ts
import express from 'express';
import { config } from './config.ts';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Impossible d’écouter sur le port ${config.port} :`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`API (${config.env}) prête sur http://localhost:${config.port}`);
});
```

Remarque que tu n’as écrit **aucune annotation** dans `server.ts`, et pourtant tout est typé :
`req` et `res` viennent de `@types/express`, `error` est un `Error | undefined`, `config.port`
un `number`. Les types des bibliothèques font une grande partie du travail. La leçon 2 montre
quand il faut les préciser.

### Les imports : extension `.ts`, et rien d’autre

Deux erreurs classiques sur la ligne `import { config } from './config.ts'`.

**Oublier l’extension** (`'./config'`) : `tsc` refuse, et Node.js aussi.

```text
src/server.ts(3,24): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './config.js'?
```

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/…/bookings-api/src/config' imported from /…/bookings-api/src/server.ts
```

**Suivre la suggestion de `tsc`** et écrire `'./config.js'` : `tsc` est satisfait (il sait
qu’un `config.ts` produira un `config.js`), mais `node src/server.ts` échoue, car en
développement aucun `config.js` n’existe :

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/…/bookings-api/src/config.js' imported from /…/bookings-api/src/server.ts
```

Dans ce projet, la règle est simple : **les imports relatifs se terminent par `.ts`**, et `tsc`
les réécrit au moment de la compilation. Les paquets (`'express'`, `'zod'`, `'node:http'`)
s’importent par leur nom, sans extension.

## Les scripts npm

Ajoute ces scripts à `package.json`. Voici le fichier complet, sans les champs descriptifs
qu’ajoute `npm init -y` (`description`, `main`, `license`…), que tu peux garder ou supprimer :

```json
{
  "name": "bookings-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.ts",
    "typecheck": "tsc --noEmit",
    "test": "node --test",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^5.3.0",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^24.19.2",
    "typescript": "^7.0.2"
  }
}
```

| Script              | Ce qu’il fait                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | exécute `src/server.ts` et le relance à chaque modification           |
| `npm run typecheck` | vérifie les types de `src` et `test`, sans rien produire              |
| `npm test`          | lance les tests avec `node:test` (leçon 5)                            |
| `npm run build`     | compile `src` en JavaScript dans `dist/` pour la production           |
| `npm start`         | exécute la version compilée                                           |

Le `tsconfig.json` contient déjà `noEmit: true` ; le drapeau `--noEmit` du script le répète
volontairement : quelqu’un qui lit `package.json` voit tout de suite que cette commande ne
produit aucun fichier, et elle le reste même si l’option disparaît un jour du `tsconfig.json`.

### Développer avec `node --watch`

```bash
PORT=3000 npm run dev
```

```text
> bookings-api@1.0.0 dev
> node --watch src/server.ts

API (development) prête sur http://localhost:3000
```

Dans un autre terminal, `curl -s http://localhost:3000/api/health` affiche
`{"status":"ok","env":"development"}`. Modifie et enregistre `server.ts` : Node.js redémarre le
serveur tout seul.

```text
Change detected in '/…/bookings-api/src/server.ts'
Restarting 'src/server.ts'
API (development) prête sur http://localhost:3000
```

Dans un terminal interactif, Node.js efface aussi l’écran avant chaque redémarrage (l’option
`--watch-preserve-output` conserve l’affichage précédent). `Ctrl+C` arrête le serveur.

:::warning[Le mode `--watch` ne vérifie aucun type]
Introduis une faute de frappe dans la route : `env: config.enviroment`. Le serveur redémarre
sans broncher et `curl` affiche `{"status":"ok"}` : la propriété vaut `undefined`, et
`JSON.stringify` l’omet. Seul `tsc` voit le problème :

```text
> bookings-api@1.0.0 typecheck
> tsc --noEmit

src/server.ts(8,40): error TS2339: Property 'enviroment' does not exist on type '{ port: number; env: string; }'.
```

Pendant que tu développes, laisse tourner `npx tsc --noEmit --watch` dans un second terminal :
il revérifie le projet à chaque enregistrement. Et lance `npm run typecheck` avant chaque
commit.
:::

## Le build pour la production

### Deux façons de faire tourner le serveur en production

Node.js 24 sait exécuter `src/server.ts` directement : tu pourrais déployer le dossier `src` et
lancer `node src/server.ts`. C’est une option légitime pour une petite application. Ce cours
compile pourtant vers `dist/`, pour trois raisons :

1. **Ce qui est déployé a été vérifié.** Avec la configuration ci-dessous, une erreur de type
   empêche le build : impossible de livrer du code que `tsc` refuse.
2. **Ce qui tourne est du JavaScript ordinaire.** Pas de retrait des types au démarrage, pas de
   dépendance à cette fonctionnalité de Node.js ; le dossier `dist/` contient exactement ce qui
   s’exécute.
3. **C’est la forme attendue pour du code réutilisé ailleurs.** Node.js refuse d’exécuter des
   fichiers TypeScript situés sous `node_modules` : un paquet publié doit contenir du `.js`.

En contrepartie, il faut penser à recompiler : `npm start` exécute le contenu de `dist/` tel
qu’il était au dernier `npm run build`.

### `tsconfig.build.json`

On ne veut compiler que `src` (pas les tests) et écrire le résultat dans `dist/`. Plutôt que de
tout réécrire, ce second fichier **hérite** du premier avec `extends` et ne change que ce qui
diffère :

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "noEmitOnError": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- `noEmit: false` : annule le `noEmit` hérité. Si tu l’oublies, `npm run build` ne signale
  **rien** et ne produit **rien** : il vérifie, puis s’arrête avec succès.
- `noEmitOnError: true` : aucun fichier n’est écrit tant qu’il reste une erreur de type. Sans
  cette option, `tsc` signale l’erreur mais remplit quand même `dist/`, et un script de
  déploiement distrait livrerait ce code.
- `outDir: "dist"` : le dossier de sortie.
- `rootDir: "src"` : la racine des sources. `src/routes/bookings.ts` devient
  `dist/routes/bookings.js`. Sans elle, TypeScript 7 refuse de deviner :

```text
tsconfig.build.json(6,5): error TS5011: The common source directory of 'tsconfig.build.json' is './src'. The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

- `include: ["src"]` remplace celui du fichier parent : les tests ne sont pas compilés.

### Compiler et lancer

```bash
npm run build
find dist -type f
cat dist/server.js
```

```text
> bookings-api@1.0.0 build
> tsc -p tsconfig.build.json

dist/config.js
dist/server.js
```

```js
// src/server.ts
import express from 'express';
import { config } from './config.js';
const app = express();
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: config.env });
});
app.listen(config.port, (error) => {
    if (error) {
        console.error(`Impossible d’écouter sur le port ${config.port} :`, error.message);
        process.exitCode = 1;
        return;
    }
    console.log(`API (${config.env}) prête sur http://localhost:${config.port}`);
});
```

L’import est devenu `'./config.js'` : c’est `rewriteRelativeImportExtensions` à l’œuvre. Les
commentaires sont conservés (y compris celui qui rappelle le nom du fichier source) et
l’indentation passe à quatre espaces : `tsc` réimprime le code, sans chercher à respecter ta
mise en forme.
`dist/server.js` est un module ES parce que le `package.json` du projet contient
`"type": "module"`.

```bash
PORT=8080 NODE_ENV=production npm start
```

```text
> bookings-api@1.0.0 start
> node dist/server.js

API (production) prête sur http://localhost:8080
```

Introduis une erreur de type et relance le build : le message de `tsc` s’affiche, le script se
termine en échec et `dist/` n’est pas mis à jour.

### `.gitignore`

```text
node_modules/
dist/
.env
```

`dist/` se régénère avec `npm run build` : comme `node_modules`, il ne se versionne pas.

## Pièges courants

- **Croire que `npm run dev` vérifie les types.** Il les efface. Garde `tsc --watch` ouvert, et
  lance `npm run typecheck` avant de committer.
- **Oublier `types: ["node"]`** : `process` est inconnu malgré `@types/node` installé.
- **Écrire `./config.js` parce que `tsc` le suggère** : correct pour `tsc`, faux pour
  `node src/server.ts`.
- **Un `@types/node` plus récent que Node.js** : tu utilises sans erreur une API absente à
  l’exécution.
- **Un build qui hérite de `noEmit: true`** : succès apparent, `dist/` vide.
- **Lancer `npm start` sans avoir recompilé** : tu testes l’ancienne version.
- **Désactiver `strict` pour faire disparaître des erreurs** : elles ne disparaissent pas, elles
  se produiront à l’exécution.

## Exercices

### Exercice 1 — Diagnostiquer trois configurations

Pour chaque situation, explique la cause et la correction.

1. Dans un projet qui n’utilise pas encore Express, `npx tsc --noEmit` affiche
   `error TS2591: Cannot find name 'process'` alors que `@types/node` figure dans
   `devDependencies`.
2. `npm run build` se termine sans message, mais le dossier `dist/` n’existe pas.
3. Un collègue a remplacé `rewriteRelativeImportExtensions` par `allowImportingTsExtensions`
   dans `tsconfig.json` et retiré `noEmitOnError` de `tsconfig.build.json`. `npm run dev` et
   `npm run typecheck` fonctionnent toujours. `npm run build` affiche une erreur, mais `dist/`
   est rempli, et `npm start` plante :

   ```text
   tsconfig.build.json(3,3): error TS5096: Option 'allowImportingTsExtensions' can only be used when one of 'noEmit', 'emitDeclarationOnly', or 'rewriteRelativeImportExtensions' is set.
   ```

   ```text
   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/…/bookings-api/dist/config.ts' imported from /…/bookings-api/dist/server.js
   ```

:::solution
1. Depuis TypeScript 6.0, l’option `types` vaut `[]` par défaut : les déclarations globales
   de `@types/node` ne sont chargées que si `tsconfig.json` contient `"types": ["node"]`.
   Installer le paquet ne suffit pas.
2. `tsconfig.build.json` hérite de `noEmit: true` et ne l’annule pas. `tsc` vérifie, ne trouve
   pas d’erreur et n’écrit rien. Il faut `"noEmit": false` dans `tsconfig.build.json`.
3. `allowImportingTsExtensions` autorise les imports en `.ts` mais ne les réécrit pas. Elle
   est compatible avec la vérification seule (`noEmit` hérité), d’où le silence de
   `typecheck` ; la configuration de build, qui produit des fichiers, la refuse (`TS5096`).
   Comme `noEmitOnError` a disparu, `tsc` écrit quand même `dist/`, avec des imports qui
   visent encore `./config.ts`, absent de `dist/`. Deux défauts à corriger : remettre
   `rewriteRelativeImportExtensions: true`, et remettre `noEmitOnError: true` pour qu’un build
   en erreur ne produise jamais de fichiers. Il faut aussi supprimer `dist/` ou relancer le
   build, pour ne pas garder les fichiers défectueux.
:::

### Exercice 2 — Un script de vérification complète

Ajoute un script `check` qui lance la vérification des types **puis** les tests, et qui échoue
si l’un des deux échoue. Ajoute ensuite une route `GET /api/version` qui répond
`{ "version": "1.0.0" }` et vérifie-la en développement puis après un build.

:::solution
Dans `package.json` :

```json
{
  "scripts": {
    "check": "npm run typecheck && npm test"
  }
}
```

`&&` n’exécute la seconde commande que si la première a réussi, et `npm run check` se termine
en échec si l’une des deux échoue. Tant qu’il n’existe aucun fichier de test, `node --test`
affiche `ℹ tests 0` et réussit.

La route, dans `src/server.ts` :

```ts
app.get('/api/version', (req, res) => {
  res.json({ version: '1.0.0' });
});
```

Vérification : `npm run dev`, puis `curl -s http://localhost:3000/api/version` affiche
`{"version":"1.0.0"}`. Arrête le serveur, puis `npm run build && npm start` et la même commande
`curl` donne le même résultat. Si tu avais oublié `npm run build`, `npm start` aurait exécuté
l’ancien `dist/server.js` et répondu 404 sur cette route.
:::

### Exercice 3 — Lire la sortie du compilateur

Avant de lancer quoi que ce soit, prévois le contenu de `dist/` et la première ligne de
`dist/routes/health.js` pour ce fichier `src/routes/health.ts`, compilé avec
`tsconfig.build.json` :

```ts
import type { Request, Response } from 'express';
import { config } from '../config.ts';

export function health(req: Request, res: Response): void {
  res.json({ status: 'ok', env: config.env });
}
```

:::solution
`dist/` contient `config.js`, `server.js` et `routes/health.js` : `rootDir: "src"` conserve
l’arborescence sous `src`. La première ligne de `dist/routes/health.js` est :

```js
import { config } from '../config.js';
```

La ligne `import type` a **entièrement disparu** : elle n’importe que des types, qui
n’existent pas à l’exécution. L’import relatif a été réécrit de `.ts` en `.js`, et les
annotations `: Request`, `: Response` et `: void` ont été effacées de la fonction.
:::

## Récapitulatif

- Un projet serveur en TypeScript installe `typescript` et les `@types/…` en dépendances de
  développement ; Express et Zod sont des dépendances d’exécution. `@types/node` suit la version
  majeure de Node.js.
- Le `tsconfig.json` du serveur ajoute à la configuration de base `types: ["node"]`,
  `noUncheckedIndexedAccess`, `rewriteRelativeImportExtensions`, `skipLibCheck` et
  `include: ["src", "test"]`.
- Les imports relatifs se terminent par `.ts` ; `tsc` les réécrit en `.js` à la compilation.
- En développement, `node --watch src/server.ts` exécute sans vérifier : `tsc --noEmit`
  (en script ou en `--watch`) reste indispensable.
- Pour la production, `tsconfig.build.json` hérite de la configuration, annule `noEmit`, fixe
  `rootDir` et `outDir`, et bloque le build en cas d’erreur avec `noEmitOnError`.
- Exécuter directement `src/server.ts` en production est possible ; compiler vers `dist/`
  garantit que seul du code vérifié est livré.
