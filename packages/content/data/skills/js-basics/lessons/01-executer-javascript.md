---
title: Exécuter du JavaScript
summary: Lancer ses premières instructions dans la console du navigateur et avec Node.js, lire un message d’erreur et récupérer un argument de ligne de commande.
durationMinutes: 45
sources:
  - title: MDN — Qu’est-ce que JavaScript ?
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Core/Scripting/What_is_JavaScript
  - title: Node.js — process.argv
    url: https://nodejs.org/api/process.html#processargv
  - title: Node.js — process.exitCode
    url: https://nodejs.org/api/process.html#processexitcode
---

## Pourquoi commencer par là ?

Avant d’apprendre ce qu’est une variable ou un type, tu as besoin d’un endroit où taper du
code et voir immédiatement ce qu’il produit. Programmer, c’est faire des allers-retours
rapides : tu écris une instruction, tu l’exécutes, tu observes le résultat, tu corriges.
Sans cet aller-retour, on apprend par cœur au lieu de comprendre.

JavaScript a une particularité : il s’exécute dans **deux environnements** très
différents.

- Le **navigateur** (Firefox, Chrome, Edge, Safari…) : c’est là que JavaScript est né,
  pour rendre les pages web interactives. Chaque navigateur contient un moteur
  JavaScript.
- **Node.js** : un programme qui exécute du JavaScript en dehors du navigateur, dans un
  terminal. Il sert à écrire des scripts, des outils en ligne de commande et des
  serveurs web.

Le **langage** est le même dans les deux cas : les variables, les opérateurs, les
conditions ou les fonctions s’écrivent de la même façon. Ce qui change, ce sont les
**outils** disponibles autour du langage. Le navigateur donne accès à la page affichée ;
Node.js donne accès aux fichiers, au réseau et aux arguments de la ligne de commande.
Dans cette leçon, tu vas utiliser les deux.

## La console du navigateur

Tous les navigateurs modernes contiennent des **outils de développement**. L’un d’eux, la
**console**, permet de taper du JavaScript et de voir le résultat aussitôt.

Pour l’ouvrir :

- sous Windows et Linux, dans Firefox, Chrome ou Edge : touche `F12`, ou
  `Ctrl` + `Maj` + `I`, puis onglet « Console » ;
- sous macOS : `Cmd` + `Option` + `I`, puis onglet « Console » ;
- dans Safari, il faut d’abord activer les fonctionnalités pour les développeurs dans
  les réglages du navigateur.

Ouvre la console sur n’importe quelle page, par exemple un onglet vide. Tape ceci puis
appuie sur `Entrée` :

```text
2 + 3
```

La console affiche `5`. Elle a **évalué l’expression** : elle a calculé sa valeur et te
la montre. Essaie maintenant :

```text
console.log('Bonjour')
```

Tu vois apparaître `Bonjour`, puis, selon le navigateur, une ligne `undefined`. Ce n’est
pas une erreur. Deux choses se sont produites :

1. `console.log(...)` a **affiché** son argument : c’est son rôle.
2. La console a ensuite montré la **valeur** de l’expression `console.log('Bonjour')`
   elle-même. Or `console.log` ne renvoie rien de particulier, ce que JavaScript
   représente par la valeur `undefined`.

Retiens cette différence, elle reviendra souvent : **afficher** une valeur et
**obtenir** une valeur sont deux choses distinctes.

:::tip[Écrire plusieurs lignes dans la console]
`Entrée` exécute immédiatement la ligne. Pour passer à la ligne sans exécuter, utilise
`Maj` + `Entrée`. Pour des essais de plus de quelques lignes, passe plutôt à un fichier
exécuté avec Node.js : rien de ce que tu tapes dans la console n’est enregistré quand tu
fermes l’onglet.
:::

La console est parfaite pour vérifier une petite idée : « que vaut `'5' + 3` ? »,
« comment s’écrit cette méthode ? ». Tu t’en serviras tout au long du parcours.

:::note
Plus tard, dans la compétence consacrée au DOM et aux événements, tu chargeras ton
JavaScript depuis une page HTML pour la rendre interactive. Pour apprendre le langage
lui-même, la console et Node.js suffisent.
:::

## Node.js dans le terminal

### Installer et vérifier

Installe la version **LTS** de Node.js depuis le site officiel `nodejs.org` (LTS signifie
_Long Term Support_ : la version maintenue sur une longue durée, recommandée pour
travailler). Ce parcours utilise Node.js 24. Ouvre ensuite un terminal et vérifie :

```bash
node --version
```

```text
v24.21.0
```

Le numéro exact après `v24` peut être différent chez toi : ce qui compte, c’est le `24`.

### Le mode interactif

Si tu tapes simplement `node` puis `Entrée`, tu entres dans le **mode interactif** (on dit
aussi REPL, pour _Read-Eval-Print Loop_ : lire, évaluer, afficher, recommencer). Il se
comporte comme la console du navigateur :

```text
> 2 + 3
5
> 'kompri'.toUpperCase()
'KOMPRI'
```

Le chevron `>` est l’invite : c’est là que tu tapes. Pour sortir, tape `.exit` ou appuie
deux fois sur `Ctrl` + `C`.

### Exécuter un fichier

Le plus souvent, tu écriras ton code dans un **fichier** avec un éditeur de code (par
exemple Visual Studio Code, très répandu, mais n’importe quel éditeur de texte brut
convient). Crée un dossier de travail, puis un fichier `hello.js` :

```js
// hello.js — mon premier script
console.log('Bonjour depuis Node.js');
console.log('Deux plus trois font', 2 + 3);
```

Dans le terminal, place-toi dans le dossier qui contient le fichier, puis lance-le :

```bash
node hello.js
```

```text
Bonjour depuis Node.js
Deux plus trois font 5
```

Quelques observations :

- les instructions s’exécutent **de haut en bas**, une par une ;
- `console.log` accepte plusieurs arguments séparés par des virgules et les affiche sur
  une même ligne, séparés par une espace ;
- contrairement au mode interactif, Node.js n’affiche **que** ce que tu demandes avec
  `console.log` : la valeur des autres expressions n’est pas montrée.

## Anatomie d’un petit programme

```js
// Un commentaire sur une ligne : ignoré par JavaScript.

/*
  Un commentaire sur plusieurs lignes.
  Utile pour expliquer un bloc entier.
*/

console.log('Première instruction');
console.log('Deuxième instruction'); // un commentaire peut suivre du code
console.error('Ceci est un message d’erreur');
```

```text
Première instruction
Deuxième instruction
Ceci est un message d’erreur
```

- Une **instruction** est un ordre donné au programme. On termine chaque instruction par
  un point-virgule `;`. JavaScript sait parfois ajouter seul les points-virgules
  manquants, mais ce mécanisme a des exceptions surprenantes : dans ce parcours, la
  convention est de toujours les écrire.
- Les **commentaires** expliquent le code aux humains. Écris-les pour dire _pourquoi_,
  pas pour répéter _ce que_ fait la ligne.
- JavaScript **distingue les majuscules et les minuscules** : `console.log` fonctionne,
  `Console.log` ou `console.Log` provoquent une erreur.
- `console.error` affiche aussi un message, mais sur la **sortie d’erreur** du terminal
  (en anglais _standard error_) plutôt que sur la sortie normale (_standard output_).
  Dans un terminal, les deux apparaissent au même endroit ; la différence compte quand
  on redirige la sortie d’un programme vers un fichier.

Les textes entre apostrophes, comme `'Bonjour'`, sont des **chaînes de caractères**. Tu
les étudieras en détail dans la dernière leçon de cette compétence.

## Lire un message d’erreur

Tu vas faire des erreurs, tout le temps, et c’est normal. Le vrai savoir-faire consiste à
**lire** le message d’erreur au lieu de le fuir. Crée `typo.js` avec une faute de frappe
volontaire :

```js
const city = 'Lyon';
console.log(cty);
```

En l’exécutant avec `node typo.js`, tu obtiens un message de ce genre (le chemin dépend
de ta machine, et la liste des lignes `at ...` a été abrégée) :

```text
/home/alice/kompri/typo.js:2
console.log(cty);
            ^

ReferenceError: cty is not defined
    at Object.<anonymous> (/home/alice/kompri/typo.js:2:13)
    ...

Node.js v24.21.0
```

Lis-le dans cet ordre :

1. **Le type et le message** : `ReferenceError: cty is not defined`. Une
   `ReferenceError` signifie que tu utilises un nom que JavaScript ne connaît pas.
2. **L’emplacement** : `typo.js:2`, c’est-à-dire la ligne 2. Le `^` pointe la colonne
   fautive, et `2:13` signifie « ligne 2, colonne 13 ».
3. **Le reste** (les lignes `at ...`) est la pile d’appels. Elle deviendra utile avec les
   fonctions ; pour l’instant, la première ligne te suffit.

L’erreur arrête le programme : les instructions suivantes ne sont pas exécutées.

Autre erreur fréquente, la **`SyntaxError`** : le code n’est même pas du JavaScript
valide, il ne peut donc pas démarrer. Un cas classique est le copier-coller depuis un
traitement de texte qui transforme les apostrophes droites `'` en apostrophes
typographiques :

```text
console.log(‘Bonjour’);


SyntaxError: Invalid or unexpected token
```

Le code JavaScript n’accepte que les guillemets droits `'`, `"` et l’accent grave
`` ` `` comme délimiteurs de chaînes.

:::warning[Les erreurs les plus fréquentes du premier jour]

- `Error: Cannot find module '/chemin/vers/hello.js'` : le terminal n’est pas dans le
  bon dossier, ou le nom du fichier est mal écrit. Vérifie avec `ls` (macOS, Linux) ou
  `dir` (Windows).
- Rien ne change à l’exécution : le fichier n’a pas été enregistré dans l’éditeur.
- `node hello.js` tapé **dans** le mode interactif provoque une `SyntaxError` : sors
  d’abord du mode interactif avec `.exit`, puis tape la commande dans le terminal.

:::

## Recevoir une valeur depuis la ligne de commande

Un script devient bien plus utile quand on peut lui transmettre une valeur au moment de
le lancer, par exemple `node greet.js Alice`. Node.js range ces valeurs dans
`process.argv` (_argument values_). Voici un script `args.js` qui l’affiche :

```js
console.log(process.argv);
console.log(process.argv[2]);
```

```bash
node args.js 42 "Le Havre"
```

```text
[
  '/usr/local/bin/node',
  '/home/alice/kompri/args.js',
  '42',
  'Le Havre'
]
42
```

`process.argv` est une **liste** (un tableau, que tu étudieras plus tard). Ses éléments
sont numérotés à partir de **0** :

| Position | Contenu                                                   |
| -------- | --------------------------------------------------------- |
| `0`      | le chemin du programme Node.js                            |
| `1`      | le chemin du script exécuté                               |
| `2`      | le premier argument que tu as tapé (`'42'`)               |
| `3`      | le deuxième argument (`'Le Havre'`, grâce aux guillemets) |

Deux points essentiels :

- les arguments sont **toujours des chaînes de caractères**, même `42` : tu devras les
  convertir en nombre pour calculer (leçon sur les types) ;
- si l’argument n’a pas été fourni, `process.argv[2]` vaut `undefined`.

```bash
node args.js
```

```text
[ '/usr/local/bin/node', '/home/alice/kompri/args.js' ]
undefined
```

:::note
Les chemins affichés dépendent de ta machine et de ton système. Node.js met parfois le
tableau sur une seule ligne quand il est court, ou sur plusieurs lignes sinon : le
contenu, lui, est le même.
:::

### Signaler un échec au terminal

Quand un programme se termine, il renvoie au terminal un **code de sortie** : `0` signifie
« tout s’est bien passé », toute autre valeur signifie « échec ». Les outils
d’automatisation (scripts, intégration continue) s’appuient sur ce code. En Node.js, tu
peux le choisir avec `process.exitCode` :

```js
// fail.js
console.error('Erreur : argument manquant.');
process.exitCode = 1;
console.log('Cette ligne s’exécute quand même.');
```

```bash
node fail.js
echo $?
```

```text
Erreur : argument manquant.
Cette ligne s’exécute quand même.
1
```

`echo $?` affiche le code de sortie de la dernière commande (sous macOS et Linux ; dans
PowerShell, c’est `$LASTEXITCODE`). Note que `process.exitCode = 1` **n’arrête pas** le
script : il fixe le code qui sera renvoyé quand le programme se terminera normalement.
Il existe aussi `process.exit(1)`, qui arrête tout immédiatement, au risque de couper
un affichage en cours : préfère `process.exitCode` et laisse le programme finir.

## Exercices

### Exercice 1 — Carte de visite

Écris un script `card.js` qui affiche exactement ces trois lignes, puis exécute-le avec
Node.js :

```text
Nom : Ada Lovelace
Métier : développeuse
Langage préféré : JavaScript
```

Ajoute un commentaire en haut du fichier qui explique comment le lancer.

:::solution

```js
// card.js — à lancer avec : node card.js
console.log('Nom : Ada Lovelace');
console.log('Métier : développeuse');
console.log('Langage préféré : JavaScript');
```

```text
Nom : Ada Lovelace
Métier : développeuse
Langage préféré : JavaScript
```

Chaque `console.log` produit une ligne. Le commentaire est ignoré à l’exécution : il
sert au prochain lecteur, qui sera souvent toi dans trois semaines. Si tu obtiens
`Cannot find module`, vérifie le dossier courant du terminal.
:::

### Exercice 2 — Console ou script ?

Tu tapes ces deux lignes, d’abord dans la console du navigateur (une par une), puis dans
un fichier `predict.js` exécuté avec `node predict.js`. Prévois ce qui s’affiche dans
chaque cas **avant** d’essayer.

```text
10 * 4
console.log(10 * 4)
```

:::solution
Dans la **console**, chaque ligne est évaluée et sa valeur est montrée :

- `10 * 4` affiche `40` (valeur de l’expression) ;
- `console.log(10 * 4)` affiche `40` (l’affichage demandé), puis `undefined` (la
  valeur renvoyée par `console.log`), selon le navigateur.

Avec **Node.js**, seul l’affichage explicite apparaît :

```text
40
```

La première ligne calcule 40, mais personne ne demande de l’afficher : le résultat est
perdu. C’est la différence entre évaluer et afficher.
:::

### Exercice 3 — Bonjour personnalisé

Écris `greet.js` qui affiche `Bonjour` suivi du premier argument de la ligne de commande.
`node greet.js Inès` doit afficher `Bonjour Inès`. Que se passe-t-il avec `node greet.js`
sans argument ? Et avec `node greet.js Marie Curie` ?

:::solution

```js
// greet.js — usage : node greet.js <prénom>
console.log('Bonjour', process.argv[2]);
```

- `node greet.js Inès` affiche `Bonjour Inès` : `process.argv[2]` contient `'Inès'`.
- `node greet.js` affiche `Bonjour undefined` : l’argument manque, la position 2 est
  vide. Tu apprendras dans les leçons suivantes à détecter ce cas.
- `node greet.js Marie Curie` affiche `Bonjour Marie` : le terminal découpe les
  arguments sur les espaces, `'Curie'` se trouve en position 3. Pour transmettre un seul
  argument contenant une espace, entoure-le de guillemets : `node greet.js "Marie Curie"`.

:::

## Récapitulatif

- JavaScript s’exécute dans le navigateur et avec Node.js : même langage, outils
  différents autour.
- La console du navigateur et le mode interactif de Node.js **évaluent** chaque
  expression et montrent sa valeur ; un script exécuté avec `node fichier.js` n’affiche
  que ce que tu demandes avec `console.log`.
- Les instructions s’exécutent de haut en bas et se terminent par `;`. JavaScript
  distingue majuscules et minuscules.
- Un message d’erreur se lit dans l’ordre : type et message, puis fichier et ligne.
  `ReferenceError` signale un nom inconnu, `SyntaxError` un code invalide.
- `process.argv[2]` contient le premier argument de la ligne de commande, toujours sous
  forme de chaîne, ou `undefined` s’il est absent.
- `process.exitCode = 1` signale un échec au terminal sans interrompre brutalement le
  programme.
