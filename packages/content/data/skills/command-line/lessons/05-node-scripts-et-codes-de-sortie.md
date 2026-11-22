---
title: Installer Node.js, lancer un script et lire les erreurs
summary: Installer Node.js 24 LTS, exécuter des scripts avec arguments et variables d’environnement, interpréter codes de sortie et messages d’erreur.
durationMinutes: 55
sources:
  - title: Node.js — Télécharger
    url: https://nodejs.org/fr/download
  - title: Node.js — Documentation de process (v24)
    url: https://nodejs.org/docs/latest-v24.x/api/process.html
  - title: GNU Bash Reference Manual — Exit Status
    url: https://www.gnu.org/software/bash/manual/bash.html
---

Tout le reste du parcours repose sur **Node.js** : le serveur de tes applications, les
outils de test, le gestionnaire de paquets npm. Il faut donc l’installer proprement, et
surtout savoir réagir quand un script échoue. Un débutant voit un pavé de texte rouge et
panique ; un développeur cherche **trois informations** : quel fichier, quelle ligne,
quelle erreur. Puis il regarde le **code de sortie** pour savoir si la commande a
réussi.

## Node.js et ses versions

**Node.js** est un programme qui exécute du JavaScript en dehors du navigateur. Il
publie régulièrement de nouvelles versions majeures, dont certaines deviennent des
versions **LTS** (*Long Term Support*) : elles sont maintenues longtemps et sont celles
qu’on utilise pour travailler. Ce parcours utilise **Node.js 24**, une version LTS ; la
page de téléchargement indique quelles versions le sont.

Deux façons de l’installer :

| Méthode                         | Avantages                                         | Pour qui              |
| ------------------------------- | ------------------------------------------------- | --------------------- |
| Installateur du site officiel   | Simple, quelques clics                            | Windows et macOS, si tu ne veux qu’une version |
| Gestionnaire de versions **nvm** | Plusieurs versions côte à côte, pas besoin de droits administrateur | Linux, macOS, WSL ; recommandé |

### Méthode 1 : l’installateur officiel

Sur `https://nodejs.org/fr/download`, choisis la version **24 (LTS)** et ton système,
télécharge l’installateur (`.msi` pour Windows, `.pkg` pour macOS) et suis ses étapes.
Il installe `node` et `npm` et les ajoute au `PATH`. **Ferme puis rouvre ton
terminal**, pour qu’il relise le `PATH`.

Si tu travailles dans WSL, c’est **dans Linux** qu’il faut installer Node.js : un
Node.js installé côté Windows n’est pas celui qu’utilise bash dans WSL. Utilise alors
la méthode 2.

### Méthode 2 : nvm (Linux, macOS, WSL)

**nvm** (*Node Version Manager*) installe et change de version de Node.js à la demande.
Son installation se fait par un script fourni dans le README de son dépôt officiel,
`https://github.com/nvm-sh/nvm`. Au moment de la rédaction de ce cours, la commande
indiquée est :

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
```

Le numéro de version de nvm évolue : **copie la commande depuis le README** plutôt que
depuis ce cours. Cette commande télécharge un script avec curl et le fait exécuter par
bash : ne le fais qu’avec une source officielle, jamais avec une commande trouvée sur un
site inconnu.

Ferme puis rouvre le terminal (le script a ajouté nvm au fichier de configuration du
shell), puis :

```bash
nvm install 24
nvm use 24
nvm alias default 24
```

- `nvm install 24` télécharge et installe la dernière version 24 ;
- `nvm use 24` l’active dans le terminal courant ;
- `nvm alias default 24` en fait la version par défaut des nouveaux terminaux.

### Vérifier l’installation

```bash
node --version
npm --version
```

```text
v24.21.0
11.19.0
```

Ces numéros sont ceux obtenus lors de la rédaction : tu dois voir un numéro commençant
par `v24`, les autres chiffres dépendent de la date d’installation. Si le shell répond
`command not found`, rouvre le terminal ; si le problème persiste, le dossier de Node.js
n’est pas dans le `PATH` (`type node` pour vérifier).

## Lancer un script

Crée un dossier `~/atelier-terminal/scripts`, place-toi dedans et crée `bonjour.js`
avec ton éditeur :

```js
console.log('Bonjour depuis Node.js !');
console.log(`Version de Node.js : ${process.version}`);
```

```bash
node bonjour.js
```

```text
Bonjour depuis Node.js !
Version de Node.js : v24.21.0
```

`node` reçoit en argument le **chemin** du script : relatif au répertoire courant
(`bonjour.js`), ou absolu. `console.log` écrit sur la **sortie standard** : tu peux donc
rediriger ou envoyer dans un tube ce qu’affiche un script, comme pour toute commande.

### Recevoir des arguments

Les arguments tapés après le nom du script arrivent dans `process.argv`. Crée
`saluer.js` :

```js
// process.argv contient : le chemin de node, celui du script, puis les arguments.
const name = process.argv[2];

if (name === undefined) {
  console.error('Usage : node saluer.js PRÉNOM');
  process.exitCode = 1;
} else {
  console.log(`Bonjour ${name} !`);
}
```

```bash
node saluer.js Lina
node saluer.js "Marie Curie"
node saluer.js Marie Curie
```

```text
Bonjour Lina !
Bonjour Marie Curie !
Bonjour Marie !
```

Tu retrouves la règle des guillemets de la leçon précédente : sans guillemets, `Marie`
et `Curie` sont deux arguments, et le script n’utilise que le premier.

Remarque `console.error` : le message d’usage part sur la **sortie d’erreur**, comme
doivent le faire tous les messages d’erreur.

### Lire l’environnement

`process.env` contient les variables d’environnement. Crée `config.js` :

```js
const port = process.env.APP_PORT ?? '3000';
console.log(`Le serveur utiliserait le port ${port}`);
```

```bash
node config.js
APP_PORT=8080 node config.js
```

```text
Le serveur utiliserait le port 3000
Le serveur utiliserait le port 8080
```

L’opérateur `??` fournit une valeur par défaut quand la variable est absente. C’est
ainsi que les serveurs reçoivent leur configuration, et les secrets restent hors du
code.

## Le code de sortie

Chaque processus, en se terminant, renvoie au shell un **code de sortie** (*exit
status*), un nombre entier :

- **`0`** signifie le **succès** ;
- **toute autre valeur** signifie un **échec**, et sa valeur précise dépend du
  programme.

Le shell le range dans la variable spéciale **`$?`**, valable juste après la commande :

```bash
node saluer.js Lina
echo $?
node saluer.js
echo $?
```

```text
Bonjour Lina !
0
Usage : node saluer.js PRÉNOM
1
```

Dans `saluer.js`, `process.exitCode = 1` fixe le code renvoyé quand le script se
termine normalement. Quelques codes à reconnaître :

| Code  | Signification courante                                                |
| ----- | --------------------------------------------------------------------- |
| `0`   | Succès                                                                |
| `1`   | Erreur générale ; c’est notamment le code d’un script Node.js qui plante |
| `2`   | Mauvaise utilisation, pour beaucoup d’outils (sous Linux, `ls` sur un fichier absent renvoie 2) |
| `127` | Commande introuvable (`command not found`)                            |
| `130` | Processus interrompu par `Ctrl`+`C`                                   |

Sous PowerShell, le code de sortie de la dernière commande externe est dans
`$LASTEXITCODE` ; dans `cmd`, dans `%ERRORLEVEL%`.

### Enchaîner selon le résultat : && et ||

- `a && b` lance `b` **seulement si** `a` a réussi (code 0) ;
- `a || b` lance `b` **seulement si** `a` a échoué.

```bash
node bonjour.js && echo "Réussi"
node saluer.js && echo "Réussi" || echo "Échec"
```

```text
Bonjour depuis Node.js !
Version de Node.js : v24.21.0
Réussi
Usage : node saluer.js PRÉNOM
Échec
```

Les outils d’automatisation (scripts npm, intégration continue) s’appuient entièrement
sur ce mécanisme : un test qui échoue renvoie un code non nul, et la chaîne s’arrête.
C’est pour cela qu’un script doit **toujours** signaler un échec par un code non nul.

### Regrouper des commandes dans un script bash

Une suite de commandes que tu tapes souvent peut être enregistrée dans un fichier, un
**script bash**, puis lancée avec `bash fichier.sh`. Dans `~/atelier-terminal/scripts`,
crée `compter.sh` :

```bash
#!/usr/bin/env bash
# Compte les lignes d’un fichier du dossier flux. Usage : bash compter.sh FICHIER
cd ~/atelier-terminal/flux || exit 1
wc -l < "$1" || exit 2
echo "Comptage terminé pour $1"
```

- La première ligne (le *shebang*) indique quel programme doit interpréter le fichier ;
  les lignes qui commencent par `#` sont des commentaires.
- `$1` vaut le premier argument donné au script, `$2` le deuxième, etc.
- `exit 2` arrête **le script** avec le code 2. Sans `exit`, le code de sortie d’un
  script est celui de sa dernière commande.
- `cd … || exit 1` est un réflexe important : si le dossier n’existe pas, le script
  s’arrête au lieu d’exécuter la suite **dans le mauvais dossier**.

```bash
bash compter.sh nombres.txt; echo $?
bash compter.sh absent.txt; echo $?
```

```text
100
Comptage terminé pour nombres.txt
0
compter.sh: line 4: absent.txt: No such file or directory
2
```

Le script s’exécute dans son propre processus : son `cd` ne change pas le répertoire
courant de ton terminal. Pour écrire toi-même un message sur la sortie d’erreur dans un
script, redirige `echo` vers le flux 2 : `echo "Fichier introuvable" >&2`.

## Lire une erreur

### Une erreur à l’exécution

Crée `total.js`, qui contient une erreur volontaire :

```js
const prices = [12, 8, 15];
console.log('Calcul du total...');
const total = prices.reduce((sum, price) => sum + price, 0);
console.log(formatPrice(total));
console.log('Fin du script');
```

```bash
node total.js
echo $?
```

```text
Calcul du total...
/home/lea/atelier-terminal/scripts/total.js:4
console.log(formatPrice(total));
        ^

ReferenceError: formatPrice is not defined
    at Object.<anonymous> (/home/lea/atelier-terminal/scripts/total.js:4:9)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)
    at Module._load (node:internal/modules/cjs/loader:1443:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47

Node.js v24.21.0
1
```

Ne lis pas tout : cherche les trois informations utiles.

1. **Où ?** La première ligne : `total.js:4`, le fichier et le **numéro de ligne**. Node.js
   recopie la ligne fautive et place un `^` sous l’endroit précis.
2. **Quoi ?** La ligne `ReferenceError: formatPrice is not defined` : le **type**
   d’erreur et son **message**. Ici, une fonction utilisée n’existe pas.
3. **Par où est-on passé ?** La **pile d’appels** (*stack trace*), les lignes `at …`.
   La première qui mentionne **ton** fichier (`total.js:4:9`, ligne 4, colonne 9) est
   la plus utile. Les lignes `node:internal/…` concernent le fonctionnement interne de
   Node.js : ignore-les, elles varient d’une version à l’autre.

Remarque aussi le déroulement : `Calcul du total...` s’est affiché, puis le script s’est
arrêté à la ligne 4 ; `Fin du script` n’apparaît jamais. Le code de sortie est `1`.

### Une erreur de syntaxe

Crée `syntaxe.js` :

```js
console.log('Début');
const message = 'Bonjour;
console.log(message);
```

```bash
node syntaxe.js
```

```text
/home/lea/atelier-terminal/scripts/syntaxe.js:2
const message = 'Bonjour;
                ^^^^^^^^^

SyntaxError: Invalid or unexpected token
```

(suivi d’une pile d’appels interne et de la version de Node.js). Cette fois, même
`Début` ne s’affiche pas : avec une **erreur de syntaxe**, Node.js ne peut pas lire le
fichier, donc n’exécute **aucune** ligne. Ici, l’apostrophe fermante manque.

### Un fichier introuvable

```bash
node absent.js
```

```text
node:internal/modules/cjs/loader:1568
  throw err;
  ^

Error: Cannot find module '/home/lea/atelier-terminal/scripts/absent.js'
```

Le message donne le chemin **absolu** que Node.js a cherché : compare-le à l’endroit où
se trouve vraiment ton fichier. Le plus souvent, tu n’es pas dans le bon dossier
(`pwd`) ou le nom est mal orthographié (`ls`).

Et si c’est `node` lui-même qui est mal orthographié, c’est le shell qui répond :

```bash
nod bonjour.js
echo $?
```

```text
bash: nod: command not found
127
```

:::tip[Demander de l’aide efficacement]
Quand tu demandes de l’aide à une personne ou à une IA, donne : la commande exacte,
le répertoire courant, le message d’erreur **complet** (copié, pas résumé) et le code
concerné. Mais vérifie d’abord toi-même les trois informations : fichier, ligne, type
d’erreur. Très souvent, elles suffisent.

:::

## Pièges et idées reçues

**« Le script a affiché quelque chose, donc il a réussi. »** Seul le code de sortie le
dit. Un script peut afficher des résultats puis planter.

**« Il faut lire toute la pile d’appels. »** Lis le type d’erreur et la première ligne
qui pointe vers ton propre fichier.

**« J’ai installé Node.js mais `node` est introuvable. »** Rouvre le terminal. Sous WSL,
vérifie que Node.js est installé côté Linux, pas seulement côté Windows.

**« `node --version` affiche v18, pourtant j’ai installé la 24. »** Plusieurs versions
coexistent : le shell lance la première trouvée dans le `PATH`. `type node` montre
laquelle ; avec nvm, `nvm use 24`.

**« Un message d’erreur, c’est la sortie standard. »** Les erreurs vont sur la sortie
d’erreur : `node script.js > resultat.txt` laisse les erreurs s’afficher à l’écran.

## Exercices

### Exercice 1 : prévoir les codes de sortie

Dans `~/atelier-terminal/scripts`, prévois ce qu’affiche chaque ligne, puis vérifie :

```bash
node saluer.js Ada; echo $?
node saluer.js > /dev/null; echo $?
node saluer.js 2> /dev/null; echo $?
node total.js > /dev/null 2>&1 || echo "total.js a échoué"
ls absent.txt 2> /dev/null; echo $?
```

Le `;` sépare deux commandes sur une même ligne : la seconde s’exécute dans tous les cas.

:::solution
```text
Bonjour Ada !
0
Usage : node saluer.js PRÉNOM
1
1
total.js a échoué
2
```

- Ligne 1 : succès, code 0.
- Ligne 2 : `> /dev/null` jette la sortie standard, mais le message d’usage passe par la
  **sortie d’erreur** (`console.error`) : il reste affiché. Code 1.
- Ligne 3 : cette fois, la sortie d’erreur est jetée : seul le code `1` s’affiche.
- Ligne 4 : tout est jeté, mais le code de sortie est 1, donc `||` lance `echo`.
- Ligne 5 : `ls` ne trouve pas le fichier, l’erreur est jetée, le code vaut 2 sous
  Linux (le `ls` de macOS renvoie 1 : seule la distinction entre 0 et « non nul » est
  universelle).

:::

### Exercice 2 : diagnostiquer trois échecs

Pour chaque situation, indique la cause la plus probable et ce que tu vérifies :

1. `node server.js` affiche `Error: Cannot find module '/home/lea/server.js'`.
2. `node app.js` affiche une première ligne `app.js:12`, puis
   `TypeError: Cannot read properties of undefined (reading 'name')`.
3. `node calcul.js` affiche `SyntaxError: Unexpected end of input` et rien d’autre de
   ton script.

:::solution
1. Node.js a cherché `server.js` dans `/home/lea`, ton dossier personnel : tu n’es
   probablement pas dans le dossier du projet. Vérifie avec `pwd` et `ls`, puis fais
   `cd` vers le projet (ou donne le chemin complet du script).
2. Erreur à l’exécution, **ligne 12** de `app.js` : le code lit la propriété `name` d’une
   valeur qui vaut `undefined` (une variable non définie, un argument absent, une
   donnée manquante). Ouvre `app.js` à la ligne 12 et cherche quelle expression précède
   `.name`.
3. Erreur de **syntaxe** : le fichier n’a pas pu être lu, donc aucune ligne ne s’est
   exécutée. « Unexpected end of input » signifie que le fichier se termine alors que
   quelque chose n’est pas refermé : une accolade, une parenthèse ou une chaîne.
   Vérifie les paires ouvrantes et fermantes.

:::

### Exercice 3 : un script qui signale ses échecs

Écris `diviser.js` qui reçoit deux nombres en arguments et affiche leur quotient.
Exigences :

- s’il manque un argument, ou si la conversion en nombre échoue, ou si le diviseur vaut
  0, afficher un message sur la **sortie d’erreur** et terminer avec le code **1** ;
- sinon afficher le résultat et terminer avec le code **0**.

Vérifie avec `node diviser.js 10 4`, `node diviser.js 10 0`, `node diviser.js 10 abc`
et `node diviser.js`, en affichant `$?` après chaque commande.

:::solution
```js
const dividend = Number(process.argv[2]);
const divisor = Number(process.argv[3]);

if (
  process.argv.length < 4 ||
  Number.isNaN(dividend) ||
  Number.isNaN(divisor)
) {
  console.error('Usage : node diviser.js NOMBRE NOMBRE');
  process.exitCode = 1;
} else if (divisor === 0) {
  console.error('Erreur : division par zéro');
  process.exitCode = 1;
} else {
  console.log(dividend / divisor);
}
```

```bash
node diviser.js 10 4; echo $?
node diviser.js 10 0; echo $?
node diviser.js 10 abc; echo $?
node diviser.js; echo $?
```

```text
2.5
0
Erreur : division par zéro
1
Usage : node diviser.js NOMBRE NOMBRE
1
Usage : node diviser.js NOMBRE NOMBRE
1
```

`Number('abc')` donne `NaN`, que l’on teste avec `Number.isNaN`. On vérifie le nombre
d’arguments avec `process.argv.length` : les deux premières cases sont occupées par les
chemins de `node` et du script. `process.exitCode = 1` laisse le script se terminer
normalement tout en signalant l’échec au shell.

:::

## Récapitulatif

- Installe **Node.js 24 LTS** avec l’installateur officiel ou, sous Linux, macOS et WSL,
  avec **nvm** (`nvm install 24`, `nvm alias default 24`) ; vérifie avec
  `node --version`.
- `node fichier.js` exécute un script ; les arguments arrivent dans `process.argv`, les
  variables d’environnement dans `process.env`.
- `console.log` écrit sur la sortie standard, `console.error` sur la sortie d’erreur.
- Le **code de sortie** vaut `0` en cas de succès, autre chose en cas d’échec ; `$?` le
  contient ; `process.exitCode = 1` le fixe dans un script ; `&&` et `||` en dépendent.
- Un script bash (`bash fichier.sh`) reçoit ses arguments dans `$1`, `$2`… ; `exit N`
  l’arrête avec le code N ; `cd dossier || exit 1` évite d’agir dans le mauvais dossier ;
  `echo "…" >&2` écrit sur la sortie d’erreur.
- Codes utiles : `1` erreur générale (script Node.js qui plante), `127` commande
  introuvable, `130` interruption par `Ctrl`+`C`.
- Pour lire une erreur : **fichier et ligne**, **type et message**, première ligne de
  la pile d’appels qui pointe vers ton code.
- Une erreur de syntaxe empêche l’exécution de tout le fichier ; une erreur à
  l’exécution arrête le script à la ligne fautive.
