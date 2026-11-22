---
title: Terminal, shell et processus
summary: Comprendre ce qu’on manipule quand on tape une commande, et prendre ses repères dans un terminal sous Linux, macOS ou Windows.
durationMinutes: 40
sources:
  - title: GNU Bash Reference Manual
    url: https://www.gnu.org/software/bash/manual/bash.html
  - title: Microsoft Learn — Installer Linux sur Windows avec WSL
    url: https://learn.microsoft.com/fr-fr/windows/wsl/install
---

Les développeurs passent une grande partie de leur journée dans une fenêtre noire où
l’on tape des commandes. Ce n’est pas de la nostalgie : beaucoup d’outils du métier
n’existent qu’en ligne de commande (Git, Node.js, npm, le client PostgreSQL `psql`,
curl), et une commande écrite se **répète**, se **partage** et s’**automatise**, ce que
ne permet pas une suite de clics.

Cette première leçon explique ce que sont un terminal, un shell et un processus, puis
te donne les gestes de base pour ne jamais te sentir perdu : lire l’invite, obtenir de
l’aide, interrompre une commande, retrouver une commande précédente.

## Trois mots à ne pas confondre

**Le terminal** est l’application qui affiche une fenêtre de texte : elle transmet ce
que tu tapes et affiche ce que les programmes écrivent. Sous macOS, c’est l’application
Terminal ; sous Linux, souvent GNOME Terminal ou Konsole ; sous Windows, Windows
Terminal.

**Le shell** est le programme qui tourne **dans** le terminal et qui **interprète** tes
commandes : il lit la ligne que tu as tapée, la découpe, trouve le programme à lancer,
le lance et t’affiche une nouvelle invite. Les plus courants :

| Shell        | Où on le trouve                                               |
| ------------ | ------------------------------------------------------------- |
| `bash`       | Shell par défaut de la plupart des distributions Linux, et de WSL |
| `zsh`        | Shell par défaut des versions récentes de macOS ; très proche de bash pour ce cours |
| PowerShell   | Windows ; syntaxe et commandes différentes                    |

**Un processus** est un programme **en cours d’exécution**. Le shell lui-même est un
processus ; chaque commande que tu lances en crée un nouveau, qui se termine quand la
commande a fini.

```text
Toi ──clavier──> Terminal ──texte──> Shell (bash) ──lance──> processus « ls »
                    ▲                                              │
                    └──────────── texte affiché ◄──────────────────┘
```

Ce cours utilise **bash**. Tout ce qui suit fonctionne aussi dans zsh sous macOS, sauf
quelques messages d’erreur formulés différemment.

## Installer un environnement bash

- **Linux** : ouvre l’application Terminal de ta distribution, bash est déjà là.
- **macOS** : ouvre Terminal (dans Applications, puis Utilitaires). Le shell est zsh ;
  tu peux suivre le cours tel quel.
- **Windows** : installe **WSL** (*Windows Subsystem for Linux*), qui fait tourner un
  vrai Linux dans Windows. Ouvre PowerShell **en tant qu’administrateur** et tape :

```bash
wsl --install
```

Redémarre si on te le demande, puis ouvre l’application « Ubuntu » depuis le menu
Démarrer : elle te demande de choisir un nom d’utilisateur et un mot de passe Linux.
Tu es alors dans bash. La documentation Microsoft citée en source détaille les
variantes.

:::note[Pourquoi pas PowerShell ?]
PowerShell est un excellent shell, mais ses commandes et sa syntaxe diffèrent de bash.
Le développement web se fait le plus souvent sur des serveurs Linux, et la plupart des
documentations donnent des commandes bash. Avec WSL, tu travailles comme sur ces
serveurs. Quand une différence avec Windows compte, le cours la signale.
:::

## L’invite et ta première commande

Quand le shell attend une commande, il affiche une **invite** (*prompt*). Sous Ubuntu,
elle ressemble à :

```text
lea@portable:~$
```

Elle se lit : utilisatrice `lea`, sur la machine `portable`, dans le dossier `~` (ton
dossier personnel, expliqué dans la leçon suivante). Le `$` signifie « à toi ». Sous
macOS, l’invite de zsh se termine par `%`. Dans ce cours, les blocs de commandes ne
montrent pas l’invite : tape seulement la commande, puis Entrée.

```bash
echo Bonjour depuis le terminal
```

```text
Bonjour depuis le terminal
```

`echo` affiche ses arguments. Essaie aussi :

```bash
whoami
date
```

`whoami` affiche ton nom d’utilisateur, `date` la date et l’heure courantes. Ces
sorties dépendent évidemment de ta machine.

:::tip[Les gestes qui font gagner du temps]
- **Flèche haut** et **flèche bas** : parcourir les commandes déjà tapées.
- **Tab** : compléter automatiquement un nom de commande, de fichier ou de dossier.
  Appuie deux fois s’il y a plusieurs possibilités. Utilise-la tout le temps : elle
  évite les fautes de frappe.
- **`Ctrl`+`C`** : interrompre la commande en cours.
- **`Ctrl`+`L`** ou la commande `clear` : effacer l’écran.
- **Copier-coller** : dans la plupart des terminaux Linux, `Ctrl`+`Maj`+`C` et
  `Ctrl`+`Maj`+`V` (car `Ctrl`+`C` interrompt) ; sous macOS, `Cmd`+`C` et `Cmd`+`V`.
:::

## Qu’est-ce qu’une commande ?

Quand tu tapes `echo Bonjour`, le shell découpe la ligne en **mots** séparés par des
espaces. Le premier mot est le **nom de la commande** ; les suivants sont ses
**arguments**. La commande peut être :

- une commande **intégrée** au shell (*builtin*), comme `cd` ou `echo` ;
- un **programme** installé sur le disque, comme `ls` ou `node`.

La commande `type` te dit de quoi il s’agit :

```bash
type cd
type ls
```

```text
cd is a shell builtin
ls is /usr/bin/ls
```

`cd` fait partie de bash ; `ls` est un programme rangé dans `/usr/bin`. (Sur certaines
distributions, `type ls` indique plutôt un **alias**, un raccourci qui ajoute des
options de couleur ; c’est normal. Si ton système est en français, les messages
peuvent aussi être traduits.)

Si le shell ne trouve aucune commande de ce nom, il le dit :

```bash
nodee
```

```text
bash: nodee: command not found
```

Avant de chercher plus loin, vérifie l’orthographe : c’est la cause la plus fréquente.
La leçon 4 expliquera **où** le shell cherche les programmes.

## Obtenir de l’aide

Personne ne connaît toutes les options de toutes les commandes. Deux réflexes :

- **`commande --help`** affiche un résumé de l’aide pour la plupart des programmes
  Linux : `ls --help`.
- **`man commande`** ouvre le manuel complet : `man ls`. Navigue avec les flèches ou
  Espace, cherche un mot en tapant `/mot` puis Entrée, et **quitte avec `q`**.

:::note
Sous macOS, les commandes de base viennent d’une autre famille (BSD) que sous Linux
(GNU). Elles se ressemblent beaucoup, mais certaines options diffèrent, et `--help`
n’existe pas toujours : `man` reste la référence. Tu peux aussi demander à une IA
d’expliquer une option, puis vérifier dans `man`.
:::

## Les processus

### Un programme qui tourne

Chaque commande lancée devient un **processus**, identifié par un numéro unique, le
**PID** (*process identifier*). La commande `ps` liste les processus lancés depuis ton
terminal :

```bash
ps
```

```text
    PID TTY          TIME CMD
  12345 pts/0    00:00:00 bash
  12399 pts/0    00:00:00 ps
```

Tes numéros seront différents. On y voit le shell `bash` et `ps` lui-même, qui tournait
au moment où il a pris la photo. La variable spéciale `$$` contient le PID du shell :
`echo $$`.

### Premier plan et interruption

Par défaut, une commande tourne au **premier plan** : le shell attend qu’elle se
termine avant de te rendre la main. `sleep 60` attend 60 secondes sans rien faire :

```bash
sleep 60
```

Pendant ce temps, l’invite n’apparaît pas. Appuie sur `Ctrl`+`C` : le terminal envoie
un **signal d’interruption** au processus, qui s’arrête, et l’invite revient. Tu
utiliseras ce geste en permanence pour arrêter un serveur de développement.

### Arrière-plan

Un `&` à la fin d’une commande la lance en **arrière-plan** : le shell te rend la main
immédiatement.

```bash
sleep 60 &
```

```text
[1] 12400
```

`[1]` est le numéro de **tâche** (*job*) dans ce shell, `12400` le PID. `jobs` liste
les tâches, et `kill %1` arrête la tâche 1 ; bash affiche ensuite une ligne du type
`[1]+  Terminated  sleep 60`. Tu peux aussi arrêter un processus par son PID :
`kill 12400`.

:::warning[Fermer le terminal arrête ce qu’il a lancé]
En général, fermer la fenêtre du terminal arrête les processus qui y tournent, y
compris un serveur lancé en arrière-plan. Pour un serveur de développement, garde une
fenêtre ou un onglet dédié, au premier plan, et arrête-le avec `Ctrl`+`C`.
:::

Pour voir **tous** les processus de la machine et leur consommation, `top` affiche un
tableau mis à jour en continu (quitte avec `q`).

## Pièges et idées reçues

**« Le terminal et le shell, c’est pareil. »** Le terminal affiche ; le shell
interprète. Tu peux changer de shell sans changer de terminal.

**« `Ctrl`+`C` copie le texte. »** Dans un terminal, `Ctrl`+`C` **interrompt** la
commande en cours. Pour copier, utilise `Ctrl`+`Maj`+`C` (Linux) ou `Cmd`+`C` (macOS).

**« Rien ne s’affiche, c’est planté. »** Beaucoup de commandes n’affichent rien quand
tout va bien (c’est la tradition Unix), et un serveur qui tourne occupe le terminal en
attendant des requêtes. Si l’invite ne revient pas, la commande est probablement
encore en cours.

**« Les commandes PowerShell et bash sont les mêmes. »** Certaines portent le même nom
par compatibilité (`ls`, `cd`) mais n’acceptent pas les mêmes options. Suis ce cours
dans bash (WSL sous Windows).

**« J’ai tout cassé en tapant une commande au hasard. »** Les commandes de cette leçon
ne modifient rien. La leçon 3 t’apprendra les rares commandes dangereuses et comment
les utiliser prudemment.

## Exercices

### Exercice 1 : identifier les commandes

Utilise `type` pour savoir si `pwd`, `echo`, `cat` et `type` sont des commandes
intégrées ou des programmes. Puis affiche l’aide résumée de `cat` et trouve dans le
manuel de `ls` ce que fait l’option `-r`.

:::solution
```bash
type pwd
type echo
type cat
type type
```

Sous bash, `pwd`, `echo` et `type` sont des commandes **intégrées** (`… is a shell
builtin`), tandis que `cat` est un **programme** (par exemple `cat is /usr/bin/cat`).
Certaines commandes, comme `echo` et `pwd`, existent aussi en version programme ; le
shell utilise en priorité sa version intégrée.

Aide résumée : `cat --help`. Dans le manuel (`man ls`), tape `/-r` puis Entrée : `-r`
(ou `--reverse`) inverse l’ordre du tri. Quitte avec `q`.
:::

### Exercice 2 : maîtriser un processus

1. Lance `sleep 300` au premier plan, puis rends-toi la main sans fermer le terminal.
2. Lance `sleep 300 &` deux fois de suite. Liste les tâches, puis arrête uniquement la
   deuxième.
3. Vérifie avec `ps` qu’il reste un seul processus `sleep`.

:::solution
1. `sleep 300`, puis `Ctrl`+`C` : le signal d’interruption arrête `sleep` et l’invite
   revient.
2. Commandes :

```bash
sleep 300 &
sleep 300 &
jobs
kill %2
```

`jobs` affiche deux lignes, `[1]` et `[2]`, toutes deux `Running`. `kill %2` arrête la
tâche 2 ; bash le confirme par une ligne `Terminated` (affichée au plus tard à la
commande suivante).

3. `ps` liste `bash`, un seul `sleep` et `ps`. Pour finir proprement : `kill %1`.
:::

### Exercice 3 : expliquer à quelqu’un

Ton ami te dit : « J’ai ouvert le terminal, j’ai tapé `node server.js`, et depuis le
terminal ne répond plus. J’ai fermé la fenêtre, et mon site ne marche plus. » Explique
ce qui s’est passé avec les mots terminal, shell, processus et premier plan.

:::solution
Le terminal a transmis la ligne au **shell**, qui a lancé un **processus** `node`. Ce
processus est un serveur : il ne se termine pas, il attend des requêtes. Comme il tourne
au **premier plan**, le shell attend sa fin et n’affiche pas de nouvelle invite : le
terminal n’est pas bloqué, il est occupé. En fermant la fenêtre, ton ami a arrêté le
shell et les processus qu’il avait lancés, donc le serveur. Il fallait laisser cette
fenêtre ouverte et en ouvrir une autre pour continuer à travailler, puis arrêter le
serveur avec `Ctrl`+`C` le moment venu.
:::

## Récapitulatif

- Le **terminal** affiche du texte ; le **shell** (bash, zsh, PowerShell) interprète
  les commandes ; un **processus** est un programme en cours d’exécution, identifié par
  un **PID**.
- Sous Windows, utilise **WSL** (`wsl --install`) pour disposer de bash.
- Une ligne de commande = un **nom de commande** suivi d’**arguments** ; `type` dit si
  c’est une commande intégrée, un alias ou un programme.
- Aide : `commande --help` et `man commande` (quitter avec `q`).
- Raccourcis : flèches pour l’historique, **Tab** pour compléter, `Ctrl`+`C` pour
  interrompre, `Ctrl`+`L` pour effacer.
- Premier plan : le shell attend la fin ; `&` lance en arrière-plan ; `jobs`, `kill`
  et `ps` gèrent les processus.
