---
title: Configurer avec les variables d’environnement
summary: Lire la configuration depuis l’environnement, la valider au démarrage et ne jamais exposer un secret.
durationMinutes: 50
sources:
  - title: Documentation Node.js — process.env
    url: https://nodejs.org/api/process.html#processenv
  - title: Documentation Node.js — Option --env-file
    url: https://nodejs.org/api/cli.html#--env-filefile
  - title: OWASP — Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
---

## Le même code, plusieurs environnements

Ton application tourne sur ton ordinateur avec une base de données locale, sur le serveur de
test avec une autre, et en production avec une troisième, protégée par un vrai mot de passe.
Le **code** est le même partout ; seule la **configuration** change : port d’écoute, adresse de
la base, clés d’API, niveau de journalisation.

Écrire ces valeurs dans le code pose deux problèmes :

1. il faudrait modifier le code pour chaque environnement ;
2. les **secrets** (mots de passe, clés) se retrouveraient dans Git, donc chez toute
   personne qui a accès au dépôt, et pour toujours dans l’historique.

La pratique la plus répandue consiste à passer la configuration par des **variables
d’environnement** : des paires nom-valeur que le système transmet à chaque programme au
moment de son lancement.

## Lire une variable : process.env

```bash
PORT=5000 node -e 'console.log(process.env.PORT, typeof process.env.PORT)'
```

```text
5000 string
```

- `PORT=5000 node …` définit la variable **pour cette commande seulement** (shells bash et
  zsh). `export PORT=5000` la définit pour toute la session du terminal. Sous Windows
  PowerShell, on écrit `$env:PORT = "5000"`.
- `process.env` est un objet dont chaque propriété est une variable d’environnement.
- Les valeurs sont **toujours des chaînes** ; une variable absente vaut `undefined`.

### Les pièges de conversion

Comme pour `process.argv`, il faut convertir explicitement, et prudemment :

```js
console.log(Boolean('false'));   // true : une chaîne non vide est truthy
console.log(Number(undefined));  // NaN
console.log(Number(''));         // 0
```

`DEBUG=false` produit la chaîne `'false'`, que `Boolean` transforme en `true` ! Il faut
comparer avec `=== 'true'`. Et une variable vide (`PORT=`) devient le nombre 0 si on ne la
contrôle pas.

À l’inverse, affecter une valeur à `process.env` la transforme en chaîne :
`process.env.LIMIT = undefined` y range la chaîne `'undefined'`. Traite `process.env` comme
une source en lecture.

## Valider la configuration au démarrage

Une configuration invalide doit être détectée **immédiatement**, avec un message clair,
plutôt qu’au milieu de la nuit quand le code atteint enfin la ligne qui l’utilise. On
centralise donc la lecture dans un module dédié, évalué une seule fois au démarrage (souviens-toi :
un module n’est évalué qu’une fois) :

```js
// src/config.js — lit et valide la configuration une seule fois, au démarrage

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

function readPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT invalide : « ${value} » (entier entre 1 et 65535 attendu)`);
  }
  return port;
}

function readBoolean(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} doit valoir true ou false, pas « ${value} »`);
}

export const config = Object.freeze({
  port: readPort(process.env.PORT ?? '3000'),
  databaseUrl: required('DATABASE_URL'),
  debug: readBoolean('DEBUG', false),
});
```

Les choix faits ici :

- `PORT` a une **valeur par défaut** raisonnable (`?? '3000'`) : son absence n’est pas grave.
- `DATABASE_URL` est **obligatoire** : sans base, l’application ne sert à rien. Inventer une
  valeur par défaut masquerait l’oubli.
- `DEBUG` n’accepte que `true` ou `false` : une faute de frappe (`DEBUG=oui`) est signalée au
  lieu d’être interprétée au hasard.
- `Object.freeze` empêche de modifier la configuration par accident ailleurs dans le code.

Le reste de l’application importe `config` et ne lit **jamais** `process.env` directement :
toute la configuration est documentée en un seul endroit.

```js
// src/app.js
import { config } from './config.js';
import { redactUrl } from './redact.js';

console.log(`Port : ${config.port}`);
console.log(`Base : ${redactUrl(config.databaseUrl)}`);
console.log(`Débogage : ${config.debug}`);
```

Sans `DATABASE_URL`, le programme s’arrête aussitôt :

```bash
node src/app.js
```

```text
Error: Variable d'environnement manquante : DATABASE_URL
    at required (file:///home/camille/boutique/src/config.js:6:11)
```

C’est voulu : on appelle ce principe **échouer tôt** (_fail fast_).

## Le fichier .env et l’option --env-file

Taper toutes les variables à chaque lancement est fastidieux. En développement, on les
range dans un fichier `.env` à la racine du projet :

```text
# Configuration locale de développement — ne pas versionner
PORT=4000
DATABASE_URL=postgres://boutique:s3cr3t-local@localhost:5432/boutique
DEBUG=true
```

Node.js sait le lire directement avec l’option `--env-file` :

```bash
node --env-file=.env src/app.js
```

```text
Port : 4000
Base : postgres://boutique:****@localhost:5432/boutique
Débogage : true
```

Quelques règles du format, telles que Node.js les applique :

- une variable par ligne, `NOM=valeur` ; les lignes commençant par `#` sont des
  commentaires, et un `#` après une valeur sans guillemets commence aussi un commentaire ;
- les guillemets permettent d’inclure des caractères spéciaux : `B="avec # dièse"` ;
- les espaces autour du nom et de la valeur sont retirés.

Une variable **déjà définie** dans l’environnement est prioritaire sur le fichier, ce qui
permet de surcharger ponctuellement une valeur :

```bash
DEBUG=false PORT=8080 node --env-file=.env src/app.js
```

```text
Port : 8080
Base : postgres://boutique:****@localhost:5432/boutique
Débogage : false
```

Si le fichier n’existe pas, `--env-file` arrête Node.js avec `node: .env: not found`. La
variante `--env-file-if-exists=.env` continue sans lui, en affichant seulement
`.env not found. Continuing without it.` sur la sortie d’erreur : pratique quand le fichier
est facultatif. Dans le code, `process.loadEnvFile()` charge un fichier `.env` sans option de
ligne de commande. On range la commande dans les scripts npm :

```json
"scripts": {
  "start": "node src/app.js",
  "dev": "node --env-file=.env --watch src/app.js"
}
```

En production, on n’utilise généralement pas de fichier `.env` : l’hébergeur ou le système
de déploiement fournit les variables, souvent depuis un gestionnaire de secrets. C’est pour
cela que le script `start` ci-dessus ne charge pas le fichier.

:::note[Et le paquet dotenv ?]
Beaucoup de projets et de tutoriels utilisent le paquet `dotenv` pour lire `.env`. Il reste
valable, mais avec Node.js 24, `--env-file` et `process.loadEnvFile()` suffisent pour les
besoins courants : une dépendance de moins.
:::

## Ne jamais exposer un secret

### Hors de Git : .env ignoré, .env.example versionné

Le fichier `.env` contient des secrets : il va dans `.gitignore` **dès le premier commit**.
Pour que les autres développeurs sachent quelles variables définir, on versionne un fichier
modèle sans valeurs sensibles :

```text
# .env.example — copier en .env et compléter
PORT=3000
DATABASE_URL=postgres://utilisateur:motdepasse@localhost:5432/boutique
DEBUG=false
```

```text
# .gitignore
node_modules/
.env
```

Si un secret a été commité puis publié, le supprimer dans un commit suivant ne suffit pas :
il reste dans l’historique. Il faut le **révoquer** (changer le mot de passe, régénérer la
clé) auprès du service concerné.

### Hors des journaux

Un journal (_log_) est copié, archivé, envoyé à des outils tiers, lu par d’autres personnes.
Un secret qui y apparaît est un secret divulgué. Donc :

- ne fais jamais `console.log(process.env)` ni `console.log(config)` si `config` contient des
  secrets ;
- masque la partie sensible quand il faut afficher une valeur, par exemple l’adresse de la
  base pour vérifier à quel serveur on se connecte :

```js
// src/redact.js — masque le mot de passe d'une URL de connexion avant de l'afficher
export function redactUrl(value) {
  const url = new URL(value);
  if (url.password) url.password = '****';
  return url.toString();
}
```

L’objet `URL` décompose l’adresse proprement, ce qui évite de bricoler avec des expressions
régulières.

### Hors du navigateur

Tout ce qui est envoyé au navigateur (HTML, JavaScript, réponses d’API) est lisible par
l’utilisateur. Une clé secrète n’a rien à faire dans le code exécuté côté client : elle
reste sur le serveur, qui fait lui-même les appels qui la nécessitent.

### NODE_ENV, une convention

Beaucoup d’outils lisent `NODE_ENV` (`development`, `production`, `test`) pour adapter leur
comportement. C’est une **convention** de l’écosystème, pas une règle de Node.js. Utilise-la
pour des choix de fonctionnement (verbosité des journaux), mais ne t’en sers pas pour
deviner des secrets : chaque environnement doit recevoir sa configuration explicitement.

## Pièges courants

- **`Boolean(process.env.DEBUG)`** : vrai dès que la variable contient un texte, y compris
  `'false'`.
- **Une valeur par défaut pour un secret** (`process.env.DB_PASSWORD ?? 'admin'`) : en cas
  d’oubli, l’application démarre avec un mot de passe connu de tous.
- **Lire `process.env` partout dans le code** : la configuration devient invisible et
  invérifiable ; centralise-la dans `config.js`.
- **Oublier `--env-file`** : la variable vaut `undefined` ; un module de configuration qui
  échoue tôt le signale tout de suite.
- **Commiter `.env`** ou afficher la configuration complète dans les journaux.
- **Valeurs avec espaces ou `#` sans guillemets** dans `.env` : le texte après `#` est
  considéré comme un commentaire.

## Exercices

### Exercice 1 — Compléter la configuration

Ajoute à `config.js` une variable `LOG_LEVEL`, facultative, qui ne peut valoir que
`debug`, `info`, `warn` ou `error`, avec `info` par défaut. Une autre valeur doit arrêter le
programme avec un message explicite. Teste avec `LOG_LEVEL=warn`, sans `LOG_LEVEL` et avec
`LOG_LEVEL=verbose`.

:::solution
```js
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

function readLogLevel(value = 'info') {
  if (!LOG_LEVELS.includes(value)) {
    throw new Error(`LOG_LEVEL invalide : « ${value} » (attendu : ${LOG_LEVELS.join(', ')})`);
  }
  return value;
}

export const config = Object.freeze({
  port: readPort(process.env.PORT ?? '3000'),
  databaseUrl: required('DATABASE_URL'),
  debug: readBoolean('DEBUG', false),
  logLevel: readLogLevel(process.env.LOG_LEVEL),
});
```

```text
$ LOG_LEVEL=warn node --env-file=.env -e "import('./src/config.js').then(({ config }) => console.log(config.logLevel))"
warn
$ node --env-file=.env -e "import('./src/config.js').then(({ config }) => console.log(config.logLevel))"
info
```

Avec `LOG_LEVEL=verbose`, la même commande s’arrête sur une erreur ; au milieu de la pile
d’appels affichée se trouve la ligne :

```text
Error: LOG_LEVEL invalide : « verbose » (attendu : debug, info, warn, error)
```

La valeur par défaut du paramètre
(`value = 'info'`) ne s’applique que si l’argument vaut `undefined`, c’est-à-dire si la
variable est absente ; une variable présente mais vide serait refusée, ce qui est
souhaitable. Pour un test rapide, `import()` charge le module depuis `node -e` ; tu peux
aussi simplement afficher `config.logLevel` dans `app.js`.
:::

### Exercice 2 — Revue de code

Relève tous les problèmes de ce fichier et propose une version corrigée.

```js
// db.js
const password = process.env.DB_PASSWORD || 'admin123';
const port = process.env.DB_PORT || 5432;
const ssl = Boolean(process.env.DB_SSL);

console.log('Connexion avec', { password, port, ssl });

export const connectionString = `postgres://app:${password}@localhost:${port}/app`;
```

:::solution
Problèmes :

1. **Secret par défaut** : si `DB_PASSWORD` manque, l’application utilise `admin123`, un mot
   de passe écrit dans le code (donc dans Git) et devinable. Il faut une variable obligatoire.
2. **Secret dans les journaux** : `console.log` affiche le mot de passe.
3. **`DB_SSL`** : `Boolean('false')` vaut `true`.
4. **`DB_PORT`** : reste une chaîne si elle est définie, devient le nombre 5432 sinon ; aucun
   contrôle de validité. `||` remplacerait aussi une valeur vide sans le signaler.
5. Lecture de `process.env` hors d’un module de configuration centralisé.

```js
// config.js (extrait)
export const config = Object.freeze({
  dbPassword: required('DB_PASSWORD'),
  dbPort: readPort(process.env.DB_PORT ?? '5432'),
  dbSsl: readBoolean('DB_SSL', true),
});
```

```js
// db.js
import { config } from './config.js';

console.log('Connexion à la base', { port: config.dbPort, ssl: config.dbSsl });

export const connectionString =
  `postgres://app:${encodeURIComponent(config.dbPassword)}@localhost:${config.dbPort}/app`;
```

`readPort` et `readBoolean` sont ceux de la leçon. Le mot de passe n’apparaît plus dans les
journaux, son absence arrête le programme, et `encodeURIComponent` protège l’URL si le mot de
passe contient des caractères comme `@` ou `/`. SSL est activé par défaut : en cas d’oubli,
on préfère l’option la plus sûre.
:::

### Exercice 3 — Préparer un projet pour l’équipe

Ton projet lit `PORT`, `DATABASE_URL` et `API_KEY` (une clé d’un service externe). Écris le
`.env.example`, le `.gitignore` et les scripts npm `start` et `dev`, puis explique en trois
phrases à un nouveau collègue comment lancer le projet.

:::solution
```text
# .env.example — copier en .env et compléter avec tes propres valeurs
PORT=3000
DATABASE_URL=postgres://utilisateur:motdepasse@localhost:5432/projet
API_KEY=
```

```text
# .gitignore
node_modules/
.env
```

```json
"scripts": {
  "start": "node src/app.js",
  "dev": "node --env-file=.env --watch src/app.js"
}
```

Explication : « Après `npm ci`, copie `.env.example` en `.env` et remplis-le avec tes propres
valeurs ; demande la clé d’API à l’équipe par le canal prévu pour les secrets, jamais par un
commit ni dans une discussion publique. Lance `npm run dev` : si une variable manque,
l’application s’arrête en la nommant. `.env` est ignoré par Git, ne le force jamais. »

`API_KEY` est vide dans le modèle : on n’y met jamais de vraie clé, même de test. Si
`required('API_KEY')` est utilisé, l’oubli de la remplir est signalé au démarrage.
:::

## Récapitulatif

- La configuration (ports, adresses, secrets) vient de l’environnement, pas du code.
- `process.env.NOM` renvoie une chaîne ou `undefined` : convertis et valide explicitement.
- Centralise la lecture dans un module `config.js` qui échoue tôt avec un message clair ;
  pas de valeur par défaut pour un secret.
- `node --env-file=.env` charge un fichier `.env` ; l’environnement réel est prioritaire ;
  `--env-file-if-exists` le rend facultatif.
- `.env` est ignoré par Git ; `.env.example` documente les variables sans valeurs
  sensibles.
- Un secret ne va ni dans Git, ni dans les journaux, ni dans le navigateur ; un secret
  publié doit être révoqué.
