---
title: Arguments, redirections, tubes et variables d’environnement
summary: Comprendre comment le shell lit une ligne de commande, rediriger les sorties, enchaîner des commandes et configurer un programme par l’environnement.
durationMinutes: 60
sources:
  - title: GNU Bash Reference Manual — Redirections et pipelines
    url: https://www.gnu.org/software/bash/manual/bash.html
  - title: GNU Coreutils — manuel
    url: https://www.gnu.org/software/coreutils/manual/coreutils.html
---

Une commande isolée rend service. Des commandes **combinées** deviennent un outil
puissant : compter les erreurs dans un journal de serveur, trier des résultats, garder
une trace d’une exécution dans un fichier. Et c’est par l’**environnement** que l’on
transmet à un programme sa configuration (port, adresse de la base de données, clé
d’API) sans l’écrire dans le code.

Cette leçon détaille ce que le shell fait d’une ligne de commande : découpage en
arguments, options, guillemets, redirections, tubes et variables. Prépare un dossier de
travail :

```bash
mkdir -p ~/atelier-terminal/flux
cd ~/atelier-terminal/flux
seq 1 100 > nombres.txt
echo 'Bonjour' > bonjour.txt
```

## Anatomie d’une ligne de commande

```text
ls   -l --all   ~/atelier-terminal/notes
│    │  │        │
│    │  │        └── argument (ce sur quoi la commande agit)
│    │  └── option longue
│    └── option courte
└── nom de la commande
```

- Les **options** modifient le comportement. Les **courtes** s’écrivent avec un tiret
  et une lettre (`-l`) et se combinent (`-la`). Les **longues** s’écrivent avec deux
  tirets et un mot (`--all`).
- Certaines options attendent une **valeur** : `head -n 3`, ou en version longue
  `head --lines=3`.
- Les **arguments** sont le reste : fichiers, dossiers, textes.

Ces conventions sont très répandues mais ne sont pas une loi : chaque programme choisit
les siennes. `--help` et `man` font foi.

### Guillemets et variables

Le shell découpe la ligne sur les espaces, puis remplace les **variables** (`$NOM`)
par leur valeur. Les guillemets changent ces règles :

```bash
echo "Bonjour $USER"
echo 'Bonjour $USER'
echo Bonjour     tout    le monde
echo "Bonjour     tout    le monde"
```

```text
Bonjour lea
Bonjour $USER
Bonjour tout le monde
Bonjour     tout    le monde
```

- Entre **guillemets doubles**, le texte forme un seul argument, mais les variables
  sont remplacées.
- Entre **apostrophes** (guillemets simples), tout est pris **littéralement**.
- Sans guillemets, les espaces multiples disparaissent : `echo` reçoit quatre arguments
  qu’il réaffiche séparés par une seule espace.

Règle pratique : mets entre guillemets doubles tout argument qui contient une variable
(`"$HOME/mes photos"`), et entre apostrophes les textes qui contiennent des caractères
spéciaux (`'{"text":"Bonjour"}'`, `'*.txt'`).

## Les trois flux standard

Chaque processus dispose de trois canaux, ouverts automatiquement :

| Flux                                | Numéro | Par défaut       |
| ----------------------------------- | ------ | ---------------- |
| Entrée standard (*stdin*)           | 0      | Le clavier       |
| Sortie standard (*stdout*)          | 1      | Le terminal      |
| Sortie d’erreur (*stderr*)          | 2      | Le terminal aussi |

Les résultats normaux vont sur la sortie standard, les messages d’erreur sur la sortie
d’erreur. Comme les deux s’affichent dans le terminal, on ne voit pas la différence…
jusqu’à ce qu’on les **redirige**.

## Les redirections

### Rediriger la sortie : > et >>

```bash
ls bonjour.txt inexistant.txt > sortie.txt
```

```text
ls: cannot access 'inexistant.txt': No such file or directory
```

```bash
cat sortie.txt
```

```text
bonjour.txt
```

La sortie standard (`bonjour.txt`) est partie dans le fichier ; le message d’erreur,
lui, s’affiche toujours : il passe par la sortie d’erreur, que `>` ne redirige pas.
`>` crée le fichier ou l’**écrase** ; `>>` **ajoute** à la fin.

### Rediriger les erreurs : 2> et 2>&1

```bash
ls bonjour.txt inexistant.txt > sortie.txt 2> erreurs.txt
cat erreurs.txt
```

```text
ls: cannot access 'inexistant.txt': No such file or directory
```

Cette fois, rien ne s’affiche pendant l’exécution : chaque flux a son fichier. Pour
envoyer **les deux** dans le même fichier, on redirige d’abord la sortie standard, puis
on dit « la sortie d’erreur (2) va au même endroit que la sortie standard (1) » :

```bash
ls bonjour.txt inexistant.txt > tout.txt 2>&1
cat tout.txt
```

```text
ls: cannot access 'inexistant.txt': No such file or directory
bonjour.txt
```

L’ordre compte : `2>&1 > tout.txt` enverrait les erreurs vers l’ancienne destination de
la sortie standard, le terminal.

Le fichier spécial **`/dev/null`** avale tout ce qu’on y écrit. `commande 2> /dev/null`
fait taire les erreurs, `commande > /dev/null` les résultats normaux. À utiliser avec
discernement : une erreur masquée reste une erreur.

### Rediriger l’entrée : <

`<` fournit le contenu d’un fichier sur l’entrée standard :

```bash
wc -l < nombres.txt
```

```text
100
```

Comparé à `wc -l nombres.txt`, qui affiche `100 nombres.txt`, le nom du fichier
n’apparaît plus : `wc` lit son entrée standard et ne connaît pas l’origine des données.

## Les tubes : enchaîner des commandes

Le **tube** (*pipe*) `|` branche la sortie standard d’une commande sur l’entrée
standard de la suivante. Chaque commande fait une seule chose ; le tube les assemble.

```bash
cat nombres.txt | head -n 3
ls | wc -l
```

```text
1
2
3
5
```

La seconde commande compte les éléments du dossier : `nombres.txt`, `bonjour.txt`,
`sortie.txt`, `erreurs.txt` et `tout.txt`.

### Analyser un journal de serveur

Voici un cas réel : un extrait de journal d’accès d’un serveur web. Copie tout le bloc
suivant dans le terminal ; la syntaxe `<<'EOF'` envoie les lignes qui suivent à `cat`
jusqu’à la ligne `EOF`.

```bash
cat > acces.log <<'EOF'
2026-11-21T09:00:01 GET /index.html 200
2026-11-21T09:00:02 GET /style.css 200
2026-11-21T09:00:02 GET /logo.png 404
2026-11-21T09:01:15 POST /api/orders 201
2026-11-21T09:01:20 GET /api/menu 200
2026-11-21T09:02:03 GET /logo.png 404
2026-11-21T09:02:41 POST /api/orders 500
2026-11-21T09:03:00 GET /index.html 200
2026-11-21T09:03:10 GET /favicon.ico 404
EOF
```

Quelques outils de filtrage :

| Commande              | Effet                                                         |
| --------------------- | ------------------------------------------------------------- |
| `grep motif`          | Garde les lignes qui contiennent le motif (`-v` : celles qui ne le contiennent pas ; `-i` : sans tenir compte de la casse ; `-c` : compte) |
| `cut -d ' ' -f 3`     | Garde le 3ᵉ champ, les champs étant séparés par des espaces    |
| `sort`                | Trie les lignes (`-n` : numériquement, `-r` : à l’envers, `-u` : sans doublons) |
| `uniq -c`             | Regroupe les lignes identiques **consécutives** et les compte |
| `head -n N`           | Garde les N premières lignes                                  |

Quelles requêtes ont échoué avec `404` ?

```bash
grep 404 acces.log
```

```text
2026-11-21T09:00:02 GET /logo.png 404
2026-11-21T09:02:03 GET /logo.png 404
2026-11-21T09:03:10 GET /favicon.ico 404
```

Combien de réponses par code de statut, du plus fréquent au moins fréquent ?

```bash
cut -d ' ' -f 4 acces.log | sort | uniq -c | sort -nr
```

```text
      4 200
      3 404
      1 500
      1 201
```

Lis ce tube étape par étape : `cut` extrait la 4ᵉ colonne (le code), `sort` regroupe les
codes identiques (indispensable, car `uniq` ne fusionne que des lignes **voisines**),
`uniq -c` compte chaque groupe, et `sort -nr` trie ces comptes du plus grand au plus
petit.

Quelles ressources manquent le plus souvent ?

```bash
grep ' 404$' acces.log | cut -d ' ' -f 3 | sort | uniq -c | sort -nr
```

```text
      2 /logo.png
      1 /favicon.ico
```

Le motif `' 404$'` est une **expression régulière** : `$` signifie « fin de ligne ». Il
évite de compter une ligne qui contiendrait `404` ailleurs, par exemple dans un chemin.

:::tip
Construis un tube **pas à pas** : exécute la première commande, regarde le résultat,
ajoute la suivante, et ainsi de suite. C’est aussi la meilleure façon de comprendre un
tube proposé par une IA : exécute-le morceau par morceau.
:::

## Les variables d’environnement

### Variables du shell et environnement

Une **variable** associe un nom à une valeur. Le shell en définit beaucoup :

```bash
echo $HOME
```

```text
/home/lea
```

Tu peux créer les tiennes, **sans espace autour du `=`** :

```bash
GREETING=Bonjour
echo $GREETING
printenv GREETING
echo "code=$?"
```

```text
Bonjour
code=1
```

`echo $GREETING` affiche la valeur, mais `printenv GREETING`, un **programme** distinct,
ne trouve rien (et termine avec le code 1). Une variable créée ainsi est une **variable
du shell** : elle reste dans le shell et n’est **pas transmise** aux programmes qu’il
lance. Pour cela, il faut l’**exporter** dans l’**environnement**, l’ensemble des
variables que chaque processus reçoit de son parent :

```bash
export GREETING
printenv GREETING
```

```text
Bonjour
```

On peut aussi définir une variable **pour une seule commande**, en l’écrivant juste
avant :

```bash
GREETING=Salut printenv GREETING
echo $GREETING
```

```text
Salut
Bonjour
```

Le programme a reçu `Salut`, mais la variable du shell n’a pas changé. C’est la forme
que tu utiliseras pour lancer un serveur avec une configuration :
`PORT=4000 node server.js`. `unset GREETING` supprime la variable.

:::note[Et sous Windows ?]
Dans PowerShell, une variable d’environnement se définit avec `$env:GREETING = "Salut"`
et se lit avec `$env:GREETING` ; dans l’invite de commandes `cmd`, avec
`set GREETING=Salut` et `%GREETING%`. Dans WSL, tout fonctionne comme dans cette leçon.
:::

### PATH : où le shell trouve les programmes

Quand tu tapes `ls` ou `node`, le shell cherche un programme de ce nom dans une liste de
dossiers, stockée dans la variable **`PATH`** et séparée par des `:` :

```bash
echo $PATH | tr ':' '\n'
```

`tr ':' '\n'` remplace chaque `:` par un saut de ligne, pour afficher un dossier par
ligne. Tu verras par exemple `/usr/local/bin`, `/usr/bin`, `/bin`. Le shell parcourt ces
dossiers **dans l’ordre** et lance le premier programme trouvé ; `type node` te dit
lequel. Si un programme est installé ailleurs, le shell répond `command not found` :
c’est pour cela que les installateurs, comme celui de Node.js, ajoutent leur dossier au
`PATH`.

### Rendre une variable permanente

Une variable exportée disparaît quand tu fermes le terminal. Pour la retrouver à chaque
ouverture, ajoute la ligne `export NOM=valeur` à la fin du fichier de configuration de
ton shell : `~/.bashrc` pour bash, `~/.zshrc` pour zsh. Elle sera active dans les
nouveaux terminaux ; dans le terminal courant, recharge le fichier avec
`source ~/.bashrc`.

:::warning[Les secrets]
Les variables d’environnement sont la bonne façon de donner un secret (mot de passe de
base de données, clé d’API) à un programme sans l’écrire dans le code. Mais attention :
une commande tapée, comme `export API_KEY=…`, est enregistrée dans l’**historique** du
shell, et un fichier de configuration ne doit jamais être publié. Tu apprendras plus
tard à utiliser un fichier `.env` exclu du dépôt Git.
:::

## Pièges et idées reçues

**« `NOM = valeur` crée une variable. »** Avec des espaces, le shell cherche une
commande nommée `NOM`. Écris `NOM=valeur`.

**« `> fichier` capture tout ce qui s’affiche. »** Seulement la sortie standard. Les
erreurs demandent `2>` ou `2>&1`.

**« `uniq` supprime tous les doublons. »** Seulement les doublons **consécutifs** :
trie d’abord avec `sort`, ou utilise `sort -u`.

**« J’ai défini la variable, mais mon programme ne la voit pas. »** Elle n’est pas
exportée. Utilise `export`, ou la forme `NOM=valeur commande`.

**« Le tube transmet les fichiers. »** Il transmet un **flux de texte** de la sortie
standard d’une commande à l’entrée standard de la suivante. Les messages d’erreur ne
passent pas dans le tube.

## Exercices

### Exercice 1 : interroger le journal

Avec `acces.log`, écris une commande pour chaque question, et donne son résultat :

1. Combien de requêtes `POST` contient le journal ?
2. Combien de requêtes n’ont **pas** reçu de réponse `200` ?
3. Affiche l’heure et le code de statut de chaque requête `POST`.
4. Liste, sans doublon, les chemins demandés, puis compte-les.

:::solution
```bash
grep -c POST acces.log
grep -v ' 200$' acces.log | wc -l
grep ' POST ' acces.log | cut -d ' ' -f 1,4
cut -d ' ' -f 3 acces.log | sort -u
cut -d ' ' -f 3 acces.log | sort -u | wc -l
```

Résultats :

1. `2`.
2. `5` : `grep -v` garde les lignes qui ne se terminent pas par ` 200` (les `404`, le
   `201` et le `500`), puis `wc -l` les compte. `grep -vc ' 200$' acces.log` donne
   aussi 5.
3. Deux lignes : `2026-11-21T09:01:15 201` et `2026-11-21T09:02:41 500`. `cut -f 1,4`
   garde les champs 1 et 4.
4. `/api/menu`, `/api/orders`, `/favicon.ico`, `/index.html`, `/logo.png`,
   `/style.css`, soit `6` chemins.
:::

### Exercice 2 : séparer résultats et erreurs

Dans `~/atelier-terminal/flux`, exécute `ls bonjour.txt absent.txt nombres.txt` de
trois façons :

1. les noms trouvés dans `ok.txt`, les erreurs affichées à l’écran ;
2. les noms trouvés à l’écran, les erreurs jetées ;
3. tout dans `journal.txt`, en **ajoutant** à la fin du fichier à chaque exécution.

Prévois le contenu de `journal.txt` après deux exécutions de la troisième commande.

:::solution
```bash
ls bonjour.txt absent.txt nombres.txt > ok.txt
ls bonjour.txt absent.txt nombres.txt 2> /dev/null
ls bonjour.txt absent.txt nombres.txt >> journal.txt 2>&1
```

1. L’erreur `ls: cannot access 'absent.txt': No such file or directory` s’affiche ;
   `ok.txt` contient `bonjour.txt` et `nombres.txt`.
2. Seuls `bonjour.txt` et `nombres.txt` s’affichent.
3. Après deux exécutions, `journal.txt` contient deux fois le même bloc de trois lignes :

```text
ls: cannot access 'absent.txt': No such file or directory
bonjour.txt
nombres.txt
ls: cannot access 'absent.txt': No such file or directory
bonjour.txt
nombres.txt
```

`ls` écrit son message d’erreur avant la liste des fichiers trouvés. Avec `>` au lieu de
`>>`, il n’y aurait qu’un seul bloc.
:::

### Exercice 3 : variable du shell ou d’environnement ?

Prévois ce qu’affiche chaque ligne, puis vérifie :

```bash
CITY=Lyon
bash -c 'echo "Ville : $CITY"'
export CITY
bash -c 'echo "Ville : $CITY"'
CITY=Brest bash -c 'echo "Ville : $CITY"'
echo "Ville : $CITY"
```

`bash -c '…'` lance un **nouveau** shell, donc un processus enfant, qui exécute le
texte donné.

:::solution
```text
Ville :
Ville : Lyon
Ville : Brest
Ville : Lyon
```

1. `CITY` n’est qu’une variable du shell : le shell enfant ne la reçoit pas, il affiche
   une valeur vide.
2. Après `export`, `CITY` fait partie de l’environnement transmis aux enfants.
3. `CITY=Brest` placé avant la commande ne vaut que pour cette commande.
4. Dans le shell courant, `CITY` vaut toujours `Lyon`.

Les apostrophes autour du texte de `bash -c` empêchent le shell **courant** de remplacer
`$CITY` lui-même : c’est bien le shell enfant qui le fait.
:::

## Récapitulatif

- Une ligne de commande : nom, **options** (courtes `-l`, longues `--all`, avec valeur
  `-n 3`) et **arguments**.
- Guillemets doubles : un seul argument, variables remplacées ; apostrophes : texte
  littéral.
- Trois flux : entrée standard (0), sortie standard (1), sortie d’erreur (2).
- Redirections : `>` (écraser), `>>` (ajouter), `2>` (erreurs), `2>&1` (erreurs avec la
  sortie), `<` (entrée), `/dev/null` (poubelle).
- Le tube `|` branche la sortie d’une commande sur l’entrée de la suivante ; `grep`,
  `cut`, `sort`, `uniq -c`, `wc -l`, `head` s’assemblent pour analyser du texte.
- `NOM=valeur` crée une variable du shell ; `export` la met dans l’**environnement**
  transmis aux programmes ; `NOM=valeur commande` la définit pour une seule commande.
- `PATH` liste les dossiers où le shell cherche les programmes.
- Les variables d’environnement transportent la configuration et les secrets, jamais le
  code source.
