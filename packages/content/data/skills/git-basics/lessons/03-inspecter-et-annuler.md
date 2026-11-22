---
title: Inspecter l’historique et annuler sans perte
summary: Explorer les commits et les différences, puis choisir la bonne commande pour annuler une modification.
durationMinutes: 60
sources:
  - title: Documentation de git log
    url: https://git-scm.com/docs/git-log
  - title: Documentation de git restore
    url: https://git-scm.com/docs/git-restore
  - title: Documentation de git revert
    url: https://git-scm.com/docs/git-revert
  - title: Documentation de git reset
    url: https://git-scm.com/docs/git-reset
---

## Le filet de sécurité, à condition de savoir s’en servir

Le grand intérêt de Git, c’est de pouvoir revenir en arrière. Mais « revenir en arrière »
recouvre des situations très différentes : jeter une modification ratée qui n’a jamais été
enregistrée, sortir un fichier de l’index, retrouver l’ancienne version d’un fichier,
annuler un commit déjà partagé… Chaque situation a sa commande, et certaines commandes
**détruisent** des données. Avant d’annuler, il faut donc savoir **regarder** : c’est la
première moitié de cette leçon.

Nous poursuivons le dépôt `mon-site`, dont l’historique est maintenant :

```text
0bd8ce8 (HEAD -> main) Ignore les dépendances, les secrets et les journaux
177e613 Ajoute une présentation et un pied de page
4e96c22 Ajoute une feuille de style de base
eeae4a2 Précise le titre de l'onglet
6dae829 Précise le titre principal
670d699 Ajoute la page d'accueil
```

## Désigner un commit

Beaucoup de commandes prennent un commit en argument. Tu peux le désigner :

- par son **empreinte**, complète ou abrégée (au moins 4 caractères, 7 en pratique) :
  `177e613` ;
- par **`HEAD`**, le commit sur lequel tu te trouves ;
- **relativement** : `HEAD~1` est le parent de `HEAD`, `HEAD~2` le grand-parent, etc.
  `HEAD^` est équivalent à `HEAD~1` ;
- par un **nom de branche** : `main` désigne le dernier commit de `main`.

## Explorer l’historique avec git log

`git log` accepte de nombreuses options qui se combinent :

| Commande                          | Affiche                                            |
| --------------------------------- | -------------------------------------------------- |
| `git log --oneline`               | une ligne par commit                               |
| `git log -3`                      | les trois derniers commits seulement               |
| `git log --stat`                  | les fichiers touchés par chaque commit             |
| `git log -p`                      | la différence complète de chaque commit            |
| `git log -- style.css`            | les commits qui ont modifié `style.css`            |
| `git log --grep="titre"`          | les commits dont le message contient « titre »     |
| `git log -S"footer"`              | les commits qui ajoutent ou retirent « footer »    |
| `git log HEAD~2..HEAD`            | les commits accessibles depuis `HEAD` mais pas depuis `HEAD~2` |

Exemples sur notre dépôt :

```bash
git log --oneline -- style.css
```

```text
4e96c22 Ajoute une feuille de style de base
```

```bash
git log --oneline --grep="titre"
```

```text
eeae4a2 Précise le titre de l'onglet
6dae829 Précise le titre principal
```

```bash
git log --oneline -S"footer"
```

```text
177e613 Ajoute une présentation et un pied de page
```

L’option `-S` est précieuse pour répondre à « quand cette ligne est-elle apparue ? »
même si tu ne te souviens pas du message du commit. Le `--` dans `git log -- style.css`
sépare les options des chemins de fichiers ; il évite toute ambiguïté si un fichier porte le
nom d’une branche.

### Voir un commit avec git show

```bash
git show 177e613
```

```diff
commit 177e613f398525f7b02b696b1036ec2a2f882b30
Author: Camille Martin <camille@example.com>
Date:   Tue Mar 3 09:20:00 2026 +0100

    Ajoute une présentation et un pied de page

diff --git a/index.html b/index.html
index e516a62..1d4f22f 100644
--- a/index.html
+++ b/index.html
@@ -7,5 +7,7 @@
   </head>
   <body>
     <h1>Bienvenue sur mon site</h1>
+    <p>Je m'appelle Camille et j'apprends le développement web.</p>
+    <footer>Contact : camille@example.com</footer>
   </body>
 </html>
```

`git show` sans argument montre `HEAD`. Pour lire un fichier **tel qu’il était** dans un
commit, sans rien modifier, utilise la syntaxe `commit:chemin` :

```bash
git show 4e96c22:style.css
```

```text
body {
  font-family: sans-serif;
}
```

### Qui a écrit cette ligne ? git blame

```bash
git blame index.html
```

```text
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  1) <!doctype html>
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  2) <html lang="fr">
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  3)   <head>
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  4)     <meta charset="utf-8" />
eeae4a26 (Camille Martin 2026-03-02 10:30:00 +0100  5)     <title>Mon site personnel</title>
4e96c22c (Camille Martin 2026-03-03 09:10:00 +0100  6)     <link rel="stylesheet" href="style.css" />
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  7)   </head>
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100  8)   <body>
6dae8295 (Camille Martin 2026-03-02 10:20:00 +0100  9)     <h1>Bienvenue sur mon site</h1>
177e613f (Camille Martin 2026-03-03 09:20:00 +0100 10)     <p>Je m'appelle Camille et j'apprends le développement web.</p>
177e613f (Camille Martin 2026-03-03 09:20:00 +0100 11)     <footer>Contact : camille@example.com</footer>
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100 12)   </body>
^670d699 (Camille Martin 2026-03-02 10:00:00 +0100 13) </html>
```

Pour chaque ligne : le commit qui l’a modifiée en dernier, l’auteur et la date. Le `^`
marque le tout premier commit. Malgré son nom, `blame` sert surtout à retrouver le
**contexte** d’une ligne (le message du commit explique souvent pourquoi elle existe), pas à
accuser quelqu’un.

## Comparer avec git diff

Tu connais déjà `git diff` (répertoire de travail contre index) et `git diff --staged`
(index contre dernier commit). `git diff` compare aussi deux commits quelconques :

```bash
git diff HEAD~3 HEAD --stat
```

```text
 .gitignore | 8 ++++++++
 index.html | 3 +++
 style.css  | 3 +++
 3 files changed, 14 insertions(+)
```

On peut limiter la comparaison à un fichier : `git diff eeae4a2 177e613 -- index.html`.
L’option `--stat` résume les changements par fichier ; sans elle, tu obtiens le détail ligne
par ligne.

## Annuler : choisir selon la situation

Voici la carte à garder sous la main. Les sections suivantes détaillent chaque cas.

| Situation                                            | Commande                          | Données perdues ?                   |
| ---------------------------------------------------- | --------------------------------- | ----------------------------------- |
| Jeter une modification **non indexée** d’un fichier  | `git restore fichier`             | **oui**, la modification jetée      |
| Sortir un fichier de l’index (garder la modification) | `git restore --staged fichier`   | non                                 |
| Récupérer un fichier tel qu’il était dans un commit  | `git restore --source=commit fichier` | la version actuelle non commitée |
| Mettre de côté son travail en cours                  | `git stash` puis `git stash pop`  | non                                 |
| Annuler un commit **déjà partagé**                   | `git revert commit`               | non (nouveau commit)                |
| Défaire des commits **locaux** non partagés          | `git reset --soft` ou `git reset` | non                                 |
| Tout remettre à l’état d’un commit                   | `git reset --hard commit`         | **oui**, tout le travail non commité |

:::note[restore et checkout]
Avant `git restore` et `git switch` (apparus en 2019 dans Git 2.23), une seule commande
faisait tout : `git checkout`. Tu la verras souvent dans des tutoriels et des réponses en
ligne : `git checkout -- fichier` équivaut à `git restore fichier`, et
`git checkout branche` à `git switch branche`. Les deux formes fonctionnent ; les
nouvelles sont plus explicites et moins risquées, c’est pourquoi nous les utilisons.
:::

### Jeter une modification du répertoire de travail

Tu as fait un essai malheureux dans `style.css` :

```bash
echo "body { color: red; }" > style.css
git status --short
git restore style.css
git status --short
cat style.css
```

```text
 M style.css
body {
  font-family: sans-serif;
}
```

`git restore style.css` a remplacé le fichier par sa version de l’index (ici identique au
dernier commit). **La modification jetée n’est enregistrée nulle part** : elle est perdue
définitivement. C’est l’une des rares commandes de cette leçon sans retour possible.

`git restore` sert aussi à récupérer un fichier supprimé par erreur :

```bash
rm index.html
git status --short
git restore index.html
```

```text
 D index.html
```

### Sortir un fichier de l’index

Tu as indexé une modification qui ne doit pas partir dans ce commit :

```bash
echo "h1 { color: navy; }" >> style.css
git add style.css
git status --short
git restore --staged style.css
git status --short
```

```text
M  style.css
 M style.css
```

La modification est passée de la colonne « index » à la colonne « répertoire de travail » :
elle n’est pas perdue, elle n’est simplement plus prévue pour le prochain commit.

### Récupérer une ancienne version d’un fichier

```bash
git restore --source=670d699 index.html
git status --short
```

```text
 M index.html
```

`index.html` a retrouvé dans ton répertoire de travail son contenu du premier commit.
L’historique n’a pas bougé : c’est une **modification** comme une autre, que tu peux
commiter (pour revenir à cette version) ou jeter avec `git restore index.html`.

### Mettre son travail de côté avec git stash

Tu es au milieu d’une modification et tu dois vite faire autre chose sur un état propre.
`git stash` range tes modifications de fichiers suivis dans une pile et nettoie le
répertoire de travail :

```bash
echo "h1 { font-size: 2rem; }" >> style.css
git stash
git status --short
git stash list
```

```text
Saved working directory and index state WIP on main: 0bd8ce8 Ignore les dépendances, les secrets et les journaux
stash@{0}: WIP on main: 0bd8ce8 Ignore les dépendances, les secrets et les journaux
```

`git status --short` n’affiche rien : le répertoire est propre. Pour récupérer ton travail :

```bash
git stash pop
```

Git affiche alors l’état complet (`git status`), puis une ligne `Dropped refs/stash@{0}`
qui confirme la suppression de l’entrée. `pop` réapplique en effet la dernière entrée de la
pile **et** la supprime. Par défaut, `git stash` ne
range pas les fichiers non suivis ; ajoute `-u` pour les inclure. Le stash est un outil de
dépannage : ne t’en sers pas comme d’un lieu de stockage durable, on y oublie vite des
choses.

### Annuler un commit partagé : git revert

Le commit `177e613` (présentation et pied de page) ne convient finalement pas, et il a déjà
été partagé avec ton équipe. On ne le supprime pas : on crée un **nouveau commit** qui fait
l’inverse.

```bash
git revert 177e613
```

Git ouvre ton éditeur avec un message prérempli (`--no-edit` l’accepte directement), puis :

```text
[main a908929] Revert "Ajoute une présentation et un pied de page"
 Date: Wed Mar 4 10:00:00 2026 +0100
 1 file changed, 2 deletions(-)
```

```bash
git log --oneline -3
```

```text
a908929 (HEAD -> main) Revert "Ajoute une présentation et un pied de page"
0bd8ce8 Ignore les dépendances, les secrets et les journaux
177e613 Ajoute une présentation et un pied de page
```

L’historique est **conservé** et raconte toute l’histoire : le changement a été fait, puis
annulé. C’est la seule façon sûre d’annuler un commit que d’autres ont déjà récupéré. Grâce
aux commits atomiques, l’annulation ne touche que ce sujet : la feuille de style et le
`.gitignore` restent intacts.

Pour suivre la suite de la leçon, reviens à l’état précédent avec
`git reset --hard HEAD~1` : c’est possible ici parce que ce commit de démonstration n’a
été partagé avec personne, et la section suivante explique exactement ce que fait cette
commande.

### Défaire des commits locaux : git reset

Si le commit est **local** (jamais envoyé), tu peux déplacer la branche vers un commit
antérieur avec `git reset`. Imagine un commit fait trop vite :

```bash
echo "p { margin: 0; }" >> style.css
git commit -am "Supprime les marges des paragraphes"
```

Trois variantes, de la plus douce à la plus brutale. Ce sont des **alternatives** : si tu
les essaies toutes, refais le commit entre deux essais (`git commit -am "…"`), sinon chaque
`reset` recule d’un commit de plus.

```bash
git reset --soft HEAD~1
```

La branche recule d’un commit ; les modifications du commit annulé sont **dans l’index**,
prêtes à être recommitées (par exemple avec un meilleur message). `git status --short`
affiche `M  style.css`.

```bash
git reset HEAD~1
```

```text
Unstaged changes after reset:
M	style.css
```

Mode par défaut (`--mixed`) : la branche recule, les modifications restent dans le
**répertoire de travail**, mais hors de l’index.

```bash
git reset --hard HEAD~1
```

```text
HEAD is now at 0bd8ce8 Ignore les dépendances, les secrets et les journaux
```

La branche recule **et** l’index et le répertoire de travail sont écrasés. Le commit annulé
n’est plus visible dans `git log`, et toute modification non commitée est **perdue**.

:::warning[reset réécrit l’histoire]
`git reset` retire des commits de la branche. Sur des commits déjà partagés, cela crée des
historiques divergents chez tes collègues. Règle simple : `reset` pour ce qui n’est jamais
sorti de ta machine, `revert` pour le reste. Et avant tout `--hard`, lance `git status` :
ce qui n’est pas commité ne pourra pas être récupéré.
:::

## Le journal des références : git reflog

Après un `git reset --hard`, le commit annulé semble disparu. En réalité, Git garde la trace
de toutes les positions successives de `HEAD` dans le **reflog** (journal des références).
Ces entrées ne sont pas éternelles : lors du nettoyage `git gc` (que Git lance de temps en
temps automatiquement), il supprime par défaut les entrées de plus de 30 jours qui pointent
vers un commit devenu inaccessible, comme notre commit annulé, et celles de plus de 90 jours
pour les autres. Un commit « perdu » se récupère donc sans souci pendant quelques semaines :

```bash
git reflog -2
```

```text
0bd8ce8 (HEAD -> main) HEAD@{0}: reset: moving to HEAD~1
7e1055c HEAD@{1}: commit: Supprime les marges des paragraphes
```

`HEAD@{1}` est la position précédente : notre commit `7e1055c`. Pour y revenir :

```bash
git reset --hard 7e1055c
```

```text
HEAD is now at 7e1055c Supprime les marges des paragraphes
```

Le reflog est **local** (il n’est jamais partagé) et ne contient que des commits. Il ne peut
rien pour une modification qui n’a jamais été commitée : d’où l’intérêt de commiter
souvent.

## Pièges courants

- **Confondre `git restore fichier` et `git restore --staged fichier`.** Le premier jette
  la modification, le second la garde. Relis la commande avant `Entrée`.
- **Faire `git reset --hard` pour « nettoyer » sans regarder.** Lance d’abord `git status`
  et `git stash` si tu as un doute.
- **Utiliser `reset` sur un commit partagé.** Ton prochain envoi sera refusé, ou pire,
  forcé et destructeur pour les autres. Utilise `revert`.
- **Croire que `git revert` revient à une version.** `git revert X` annule **uniquement**
  le commit `X`, pas tout ce qui le suit. Pour revenir à l’état d’un fichier, c’est
  `git restore --source`.
- **Oublier ce qu’il y a dans le stash.** `git stash list` régulièrement ; une entrée
  oubliée finit par entrer en conflit avec le reste.

## Exercices

### Exercice 1 — Choisir la commande

Pour chaque situation, donne la commande et dis si des données peuvent être perdues :

1. Tu as modifié `app.js` depuis le dernier commit et tu veux tout jeter.
2. Tu as fait `git add .` et tu t’aperçois que `brouillon.txt` est dans l’index.
3. Le commit `a1b2c3d`, poussé hier, a introduit un bug ; tes collègues ont déjà travaillé
   par-dessus.
4. Ton dernier commit, local, contient un fichier de trop ; tu veux le refaire.
5. Tu veux voir le contenu de `config.json` tel qu’il était il y a trois commits, sans rien
   modifier.

:::solution
1. `git restore app.js` : la modification non commitée est **perdue définitivement**.
2. `git restore --staged brouillon.txt` : rien n’est perdu, le fichier sort seulement de
   l’index.
3. `git revert a1b2c3d` : crée un commit inverse, l’historique partagé est préservé. Un
   `reset` réécrirait un historique que d’autres ont déjà.
4. `git reset --soft HEAD~1`, puis `git restore --staged fichier-en-trop`, puis un nouveau
   commit. Rien n’est perdu. (Variante : retirer le fichier de l’index puis
   `git commit --amend`.)
5. `git show HEAD~3:config.json` : simple lecture, rien ne change.
:::

### Exercice 2 — Le commit fantôme

Dans un dépôt d’essai, fais trois commits successifs (`un.txt`, `deux.txt`, `trois.txt`),
puis exécute `git reset --hard HEAD~2`. Retrouve le commit de `trois.txt` et ramène la
branche dessus. Explique pourquoi c’est possible.

:::solution
```bash
mkdir fantome
cd fantome
git init
echo 1 > un.txt && git add un.txt && git commit -m "Ajoute un.txt"
echo 2 > deux.txt && git add deux.txt && git commit -m "Ajoute deux.txt"
echo 3 > trois.txt && git add trois.txt && git commit -m "Ajoute trois.txt"
git reset --hard HEAD~2      # la branche revient au premier commit
ls                           # seulement un.txt
git reflog -3                # HEAD@{1} correspond à « commit: Ajoute trois.txt »
git reset --hard HEAD@{1}    # ou l'empreinte affichée par le reflog
ls                           # un.txt deux.txt trois.txt
```

C’est possible parce que `reset` n’efface pas les commits : il déplace seulement l’étiquette
de la branche. Les commits restent dans `.git` et le reflog garde la trace des positions
de `HEAD`. Si les fichiers n’avaient jamais été commités, rien n’aurait permis de les
retrouver.
:::

### Exercice 3 — Enquête dans l’historique

Sur `mon-site`, réponds avec une commande Git à chaque question : quel commit a ajouté la
ligne `<link rel="stylesheet" …>` ? Quels commits ont touché `index.html` ? Quelle était
la différence totale entre le premier commit et aujourd’hui, en nombre de lignes par
fichier ?

:::solution
```bash
git log --oneline -S"stylesheet"     # 4e96c22 Ajoute une feuille de style de base
git blame index.html                 # autre méthode : la ligne 6 pointe sur 4e96c22
git log --oneline -- index.html      # tous les commits qui ont modifié index.html
git diff 670d699 HEAD --stat         # lignes ajoutées et retirées par fichier
```

`-S` cherche les commits qui changent le nombre d’occurrences d’un texte ; `blame` part du
fichier actuel. Les deux méthodes se complètent.
:::

## Récapitulatif

- Un commit se désigne par son empreinte, `HEAD`, `HEAD~n` ou un nom de branche.
- `git log` se filtre par nombre (`-3`), fichier (`-- chemin`), message (`--grep`) ou
  contenu (`-S`) ; `--stat` et `-p` détaillent les changements.
- `git show commit` affiche un commit ; `git show commit:chemin` un fichier à cette époque ;
  `git blame` l’origine de chaque ligne.
- `git restore fichier` jette une modification non indexée (perte définitive) ;
  `--staged` sort de l’index ; `--source=commit` récupère une ancienne version.
- `git stash` met de côté, `git stash pop` réapplique.
- `git revert` annule un commit partagé en créant un commit inverse ; `git reset` déplace la
  branche pour défaire des commits locaux (`--soft`, mixte, `--hard` destructeur).
- `git reflog` permet de retrouver un commit « perdu » ; rien ne protège ce qui n’a jamais
  été commité.
