---
title: Gérer un projet avec npm et package.json
summary: Initialiser un projet, installer des dépendances, comprendre les versions et automatiser les commandes avec les scripts.
durationMinutes: 55
sources:
  - title: Documentation npm — package.json
    url: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
  - title: Documentation npm — package-lock.json
    url: https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json
  - title: Documentation npm — Gestion sémantique de version
    url: https://docs.npmjs.com/about-semantic-versioning
  - title: Gestion sémantique de version 2.0.0 (en français)
    url: https://semver.org/lang/fr/
---

## Ne pas tout réécrire soi-même

Transformer « Été à Paris : 10 idées de sorties ! » en `ete-a-paris-10-idees-de-sorties`
pour une adresse web semble simple. Puis viennent les accents, les ligatures (`œ`), les
symboles (`&`), les espaces multiples… D’autres ont déjà résolu ce problème et publié leur
code sous forme de **paquet** (_package_). **npm** te permet de les installer et de gérer
leurs versions.

npm désigne trois choses :

- le **registre** npm, un immense catalogue public de paquets JavaScript ;
- l’**outil en ligne de commande** `npm`, installé avec Node.js ;
- le format de description de projet, le fichier **`package.json`**.

Chaque paquet que tu installes est du code écrit par d’autres, qui s’exécutera avec tes
droits. Une dépendance est donc un **choix** : elle fait gagner du temps, mais elle doit être
maintenue, mise à jour et digne de confiance.

## Initialiser un projet

```bash
mkdir mon-outil
cd mon-outil
npm init -y
```

```text
Wrote to /home/camille/mon-outil/package.json:

{
  "name": "mon-outil",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs"
}
```

`-y` accepte toutes les valeurs par défaut (sans `-y`, npm pose des questions). Attention :
les versions récentes de npm écrivent `"type": "commonjs"`. Pour utiliser les modules ES,
change cette valeur, à la main ou avec :

```bash
npm pkg set type=module
```

### Les champs de package.json

| Champ             | Rôle                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `name`, `version` | identité du projet ; obligatoires seulement pour publier un paquet       |
| `description`     | une phrase de présentation                                               |
| `type`            | `module` pour les modules ES                                             |
| `main`            | le fichier principal, quand le projet est utilisé comme paquet           |
| `scripts`         | des commandes nommées (voir plus bas)                                    |
| `dependencies`    | les paquets nécessaires à l’exécution                                    |
| `devDependencies` | les paquets utiles seulement pour développer (tests, formatage…)         |
| `private`         | `true` empêche de publier le projet sur le registre par erreur           |
| `license`         | la licence du code                                                       |

Pour une application (et non une bibliothèque destinée au registre), ajoute
`"private": true` : un `npm publish` accidentel est alors refusé.

## Installer une dépendance

```bash
npm install slugify
```

```text
added 1 package, and audited 2 packages in 308ms

found 0 vulnerabilities
```

Trois choses ont changé :

1. `package.json` a gagné une section :

   ```json
   "dependencies": {
     "slugify": "^1.6.9"
   }
   ```

2. un dossier **`node_modules/`** contient le code du paquet (et de ses propres
   dépendances, s’il en a) ;
3. un fichier **`package-lock.json`** a été créé.

Utilisons-le dans `index.js` :

```js
import slugify from 'slugify';

const title = process.argv[2] ?? 'Été à Paris : 10 idées de sorties !';
const slug = slugify(title, { lower: true, strict: true, locale: 'fr' });
console.log(slug);
```

```bash
node index.js
node index.js "Les Misérables, tome 1"
node index.js "L'œuvre & l'été"
```

```text
ete-a-paris-10-idees-de-sorties
les-miserables-tome-1
loeuvre-et-lete
```

On importe un paquet par son **nom**, sans `./` : Node.js le cherche dans `node_modules`.
Les options `lower`, `strict` et `locale` sont documentées sur la page du paquet : lis
toujours la documentation d’un paquet avant de l’utiliser.

### Dépendances de développement

Un outil qui ne sert qu’au développement, comme le formateur de code Prettier, s’installe
avec `--save-dev` (ou `-D`) :

```bash
npm install --save-dev prettier
```

```json
"devDependencies": {
  "prettier": "^3.10.1"
}
```

En production, on peut installer seulement les dépendances d’exécution avec
`npm install --omit=dev`, ce qui réduit la taille du déploiement et le nombre de paquets
présents sur le serveur.

Pour voir ce qui est installé :

```bash
npm ls
```

```text
mon-outil@1.0.0 /home/camille/mon-outil
├── prettier@3.10.1
└── slugify@1.6.9
```

Pour retirer un paquet : `npm uninstall prettier` (le supprime de `node_modules` et de
`package.json`).

## node_modules et package-lock.json : que versionner ?

`node_modules/` peut contenir des milliers de fichiers et se reconstruit à partir de
`package.json` et du fichier de verrouillage. **On ne le versionne jamais** : il va dans
`.gitignore`.

```text
node_modules/
```

`package-lock.json`, en revanche, **doit être versionné**. Il enregistre la version
**exacte** de chaque paquet installé (y compris les dépendances de tes dépendances), l’adresse
d’où il a été téléchargé et une empreinte d’intégrité :

```json
"node_modules/slugify": {
  "version": "1.6.9",
  "resolved": "https://registry.npmjs.org/slugify/-/slugify-1.6.9.tgz",
  "integrity": "sha512-vZ7rfeehZui7wQs438JXBckYLkIIdfHOXsaVEUMyS5fHo1483l1bMdo0EDSWYclY0yZKFOipDy4KHuKs6ssvdg==",
  "license": "MIT",
  "engines": {
    "node": ">=8.0.0"
  }
}
```

Grâce à lui, toi, tes collègues et le serveur installez **exactement** les mêmes versions.
Sans lui, chacun obtiendrait la version la plus récente autorisée au moment de son
installation : c’est l’origine de beaucoup de « ça marche chez moi ».

### npm install ou npm ci ?

| Commande       | Usage                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| `npm install`  | installe ce que décrit `package.json`, met à jour le fichier de verrouillage si besoin     |
| `npm ci`       | supprime `node_modules` et installe **exactement** le fichier de verrouillage, sans le modifier |

`npm ci` (_clean install_) est fait pour l’intégration continue, les déploiements et le
premier clonage d’un projet. Si `package.json` et `package-lock.json` ne correspondent pas,
il refuse plutôt que de deviner :

```text
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Missing: picocolors@1.1.1 from lock file
```

## Comprendre les numéros de version

La plupart des paquets suivent la **gestion sémantique de version** (_semantic
versioning_, ou semver) : `MAJEUR.MINEUR.CORRECTIF`, par exemple `1.6.9`.

- **CORRECTIF** (`1.6.9` → `1.6.10`) : corrections de bugs, sans changement de
  l’interface.
- **MINEUR** (`1.6.9` → `1.7.0`) : nouvelles fonctionnalités **compatibles** avec
  l’existant.
- **MAJEUR** (`1.6.9` → `2.0.0`) : changements **incompatibles** ; il faut lire les notes de
  version avant de mettre à jour.

C’est une **convention** : rien n’empêche techniquement un auteur de casser quelque chose
dans une version mineure. D’où l’intérêt du fichier de verrouillage et des tests.

### Les intervalles dans package.json

`"slugify": "^1.6.9"` n’est pas une version mais un **intervalle** de versions acceptées :

| Écriture   | Versions acceptées                  | Exemple accepté | Exemple refusé |
| ---------- | ----------------------------------- | --------------- | -------------- |
| `^1.6.0`   | `>=1.6.0 <2.0.0`                    | `1.9.0`         | `2.0.0`        |
| `~1.6.0`   | `>=1.6.0 <1.7.0`                    | `1.6.9`         | `1.7.0`        |
| `1.6.0`    | exactement `1.6.0`                  | `1.6.0`         | `1.6.1`        |
| `^0.3.1`   | `>=0.3.1 <0.4.0`                    | `0.3.9`         | `0.4.0`        |

Le chapeau `^` (par défaut avec `npm install`) accepte les versions mineures et correctifs ;
le tilde `~` seulement les correctifs. Pour les versions `0.x`, le chapeau est plus prudent :
avant `1.0.0`, la convention considère que tout peut changer, donc `^0.3.1` n’accepte que
les correctifs de `0.3`. Les préversions (`2.0.0-beta.1`) ne sont jamais incluses par un
intervalle comme `^1.6.0`.

### Mettre à jour

```bash
npm outdated
```

```text
Package  Current  Wanted  Latest  Location              Depended by
slugify    1.6.0   1.6.9   1.6.9  node_modules/slugify  mon-outil
```

`Current` est la version installée, `Wanted` la plus récente autorisée par l’intervalle,
`Latest` la plus récente publiée. `npm update` monte jusqu’à `Wanted` ; pour passer une
version majeure, il faut le demander explicitement (`npm install slugify@latest`) après
avoir lu les notes de version, puis relancer les tests.

## Les scripts npm

Le champ `scripts` donne des noms à des commandes du projet :

```json
"scripts": {
  "start": "node index.js",
  "dev": "node --watch index.js",
  "format": "prettier --write .",
  "test": "node --test"
}
```

```bash
npm start
```

```text

> mon-outil@1.0.0 start
> node index.js

ete-a-paris-10-idees-de-sorties
```

- `start` et `test` sont des scripts spéciaux : `npm start` et `npm test` suffisent. Pour
  les autres, il faut `npm run` : `npm run dev`, `npm run format`.
- `npm run` sans argument liste les scripts disponibles.
- Pour transmettre des arguments au programme, sépare-les par `--` :

  ```bash
  npm start -- "Bonjour le monde"
  ```

  ```text

  > mon-outil@1.0.0 start
  > node index.js Bonjour le monde

  bonjour-le-monde
  ```

- `node --watch index.js` relance automatiquement le script à chaque modification d’un
  fichier : pratique pendant le développement.
- Dans un script npm, les commandes des paquets installés (`prettier`) sont trouvées
  automatiquement dans `node_modules/.bin`, sans installation globale.

Les scripts sont la **documentation exécutable** du projet : un nouveau venu lit
`package.json`, tape `npm ci` puis `npm test` et `npm start`, sans avoir à deviner les
commandes.

### npx

`npx` exécute la commande d’un paquet : celle installée dans le projet si elle existe.

```bash
npx prettier --check index.js
```

Si le paquet n’est pas installé, `npx` propose de le télécharger pour l’exécuter une fois.
Lis bien le nom avant d’accepter : c’est du code qui va s’exécuter sur ta machine.

## Choisir une dépendance avec prudence

Les paquets du registre sont publiés par n’importe qui. Les attaques sur la chaîne
d’approvisionnement existent : paquets malveillants aux noms proches de paquets connus
(une lettre de différence), comptes de mainteneurs compromis, scripts exécutés à
l’installation. Avant d’ajouter une dépendance :

1. Ai-je vraiment besoin d’un paquet ? Quelques lignes de code ou un module natif de
   Node.js suffisent parfois.
2. Le nom est-il exactement le bon ? Vérifie sur la page du paquet (registre et dépôt de
   code).
3. Est-il maintenu ? Date de la dernière version, problèmes ouverts, documentation.
4. Combien de dépendances apporte-t-il ? Chacune est une surface d’attaque de plus.

`npm audit` compare tes dépendances à une base de vulnérabilités connues ; npm l’exécute
d’ailleurs après chaque installation (`found 0 vulnerabilities`). Lis ses rapports, mais
ne lance pas `npm audit fix --force` à l’aveugle : il peut installer des versions majeures
incompatibles.

## Pièges courants

- **Versionner `node_modules`.** Des milliers de fichiers inutiles dans Git : ajoute-le au
  `.gitignore` dès le départ.
- **Ne pas versionner `package-lock.json`** ou le supprimer pour « régler » un problème.
  Tu perds la garantie d’installations identiques.
- **Modifier un fichier dans `node_modules`.** Tes changements disparaissent à la
  prochaine installation et personne d’autre ne les a.
- **Installer globalement (`npm install -g`) les outils du projet.** Chacun aurait une
  version différente ; installe-les en `devDependencies` et appelle-les via les scripts.
- **Oublier de changer `"type": "commonjs"`** après `npm init -y`.
- **Mettre un outil de test dans `dependencies`**, ou un paquet nécessaire à l’exécution
  dans `devDependencies` : l’application plante en production avec `--omit=dev`.

## Exercices

### Exercice 1 — Un projet complet

Crée un projet `titres` qui utilise les modules ES, installe `slugify`, et définit trois
scripts : `start` (exécute `index.js`), `dev` (même chose avec relance automatique) et
`test` (affiche « pas encore de tests » et réussit). `index.js` lit les titres passés en
arguments et affiche pour chacun `titre -> slug`. Donne `package.json` et la sortie de
`npm start -- "Bonjour !" "Café crème"`.

:::solution
```bash
mkdir titres
cd titres
npm init -y
npm pkg set type=module
npm pkg set private=true --json
npm install slugify
```

```json
{
  "name": "titres",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"pas encore de tests\"",
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "private": true,
  "dependencies": {
    "slugify": "^1.6.9"
  }
}
```

```js
// index.js
import slugify from 'slugify';

for (const title of process.argv.slice(2)) {
  console.log(`${title} -> ${slugify(title, { lower: true, strict: true, locale: 'fr' })}`);
}
```

```text

> titres@1.0.0 start
> node index.js Bonjour ! Café crème

Bonjour ! -> bonjour
Café crème -> cafe-creme
```

Le script `test` d’origine se terminait par `exit 1` : il échouait volontairement. Le
`--` transmet les arguments à `node index.js` ; npm les réaffiche sans guillemets, mais
chacun arrive bien comme un seul argument. La version de `slugify` peut être plus récente
chez toi.
:::

### Exercice 2 — Lire des intervalles

Pour chaque intervalle, dis si la version proposée sera acceptée par `npm install` :

1. `^2.3.1` et `2.10.0`
2. `^2.3.1` et `3.0.0`
3. `~2.3.1` et `2.3.8`
4. `~2.3.1` et `2.4.0`
5. `^0.8.2` et `0.9.0`
6. `2.3.1` et `2.3.2`

:::solution
1. Oui : `^` accepte toute version `>=2.3.1 <3.0.0`, et `2.10.0` (dix) est supérieure à
   `2.3.1` (les nombres se comparent un par un, pas comme du texte).
2. Non : changement de version majeure.
3. Oui : `~` accepte les correctifs `>=2.3.1 <2.4.0`.
4. Non : changement de version mineure.
5. Non : pour une version `0.x`, `^0.8.2` signifie `>=0.8.2 <0.9.0`.
6. Non : sans symbole, la version est exacte.
:::

### Exercice 3 — « Chez moi, ça marche »

Léa et Sam travaillent sur le même dépôt. Le `.gitignore` contient `node_modules/` et
`package-lock.json`. Sam installe le projet et obtient une erreur qui n’apparaît pas chez
Léa. Explique la cause probable et la correction.

:::solution
`package-lock.json` est ignoré : il n’est pas partagé. Chacun obtient donc, au moment de son
installation, les versions les plus récentes autorisées par les intervalles de
`package.json`. Si une dépendance a publié entre-temps une version (même mineure) qui
change un comportement, Sam et Léa n’exécutent pas le même code.

Correction : retirer `package-lock.json` du `.gitignore`, le commiter depuis l’installation
qui fonctionne (celle de Léa), puis Sam lance `npm ci`, qui installe exactement les
versions verrouillées. `node_modules/` reste ignoré.
:::

## Récapitulatif

- npm est à la fois un registre de paquets, un outil en ligne de commande et le format
  `package.json`.
- `npm init -y` crée `package.json` ; passe `type` à `module` et ajoute `"private": true`
  pour une application.
- `npm install paquet` ajoute une dépendance ; `-D` pour une dépendance de développement.
- `node_modules/` ne se versionne jamais ; `package-lock.json` toujours.
- `npm ci` installe exactement le fichier de verrouillage, idéal pour la CI et les
  déploiements.
- Semver : `MAJEUR.MINEUR.CORRECTIF` ; `^` accepte mineures et correctifs, `~` les
  correctifs ; prudence particulière avant `1.0.0`.
- Les scripts (`npm start`, `npm test`, `npm run nom`) documentent et automatisent les
  commandes du projet ; `--` transmet des arguments.
- Chaque dépendance est du code tiers qui s’exécute avec tes droits : choisis-la avec soin.
