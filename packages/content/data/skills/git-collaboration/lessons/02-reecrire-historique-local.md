---
title: Réécrire un historique local
summary: Nettoyer ses commits avant de les proposer — amend, rebase interactif, fixup — et savoir quand s’en abstenir.
durationMinutes: 70
sources:
  - title: Pro Git — Réécrire l’historique (en français)
    url: https://git-scm.com/book/fr/v2/Utilitaires-Git-R%C3%A9%C3%A9crire-l%E2%80%99historique
  - title: Documentation de git rebase
    url: https://git-scm.com/docs/git-rebase
  - title: Documentation de git commit (options --amend et --fixup)
    url: https://git-scm.com/docs/git-commit
  - title: Documentation de git push (option --force-with-lease)
    url: https://git-scm.com/docs/git-push
---

## Un brouillon avant la publication

Quand tu travailles, tes commits suivent le fil de ta journée : « wip tests », « oups
arrondi », une faute de frappe corrigée trois commits plus tard. C’est normal, et c’est même
recommandé : commiter souvent te protège. Mais au moment de **proposer** ton travail à
l’équipe, cet historique-là n’aide personne. Un relecteur préfère trois commits qui
racontent une histoire claire (« ajoute la fonction », « la teste », « la documente »)
à cinq commits qui racontent tes hésitations.

Git permet de **réécrire** des commits : les fusionner, les réordonner, changer leurs
messages, les découper. Cette leçon t’apprend à le faire proprement… et surtout à
reconnaître le moment où il ne faut **plus** le faire : dès que d’autres possèdent ces
commits.

Rappel essentiel de la leçon précédente : un commit ne se modifie jamais. « Réécrire »,
c’est créer de **nouveaux** commits et déplacer l’étiquette de la branche dessus. Les
anciens restent dans le dépôt, accessibles par le reflog, pendant un certain temps.

## Rappel : corriger le dernier commit

Tu connais déjà `git commit --amend`, qui remplace le **dernier** commit :

- `git commit --amend -m "Nouveau message"` corrige le message ;
- `git add fichier-oublié` puis `git commit --amend --no-edit` ajoute un fichier oublié en
  gardant le message ;
- `git commit --amend --no-edit -a` intègre toutes les modifications des fichiers suivis.

L’empreinte change à chaque fois : c’est déjà une réécriture. Pour toucher un commit plus
ancien que le dernier, il faut le rebase interactif.

## Préparer l’atelier

Repars du clone de Camille de la leçon précédente (ou recrée l’atelier) et place-toi sur
un `main` à jour. Camille développe une remise, en cinq commits un peu désordonnés :

```bash
cd ~/equipe/camille
git switch main
git pull
git switch -c feat/remise
mkdir -p test
```

Crée `src/discount.js` :

```js
export function applyDiscount(amount, rate) {
  return amount - amount * rate;
}
```

Puis `test/discount.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from '../src/discount.js';

test('applique 10 % de remise', () => {
  assert.equal(applyDiscount(50, 0.1), 45);
});
```

```bash
git add src/discount.js
git commit -m "Ajoute la fonction de remise"
git add test/discount.test.js
git commit -m "wip tests"
printf '\n## Remise\n\nLa remsie se calcule sur le sous-total.\n' >> README.md
git commit -am "Documente la remise"
```

Camille s’aperçoit que la remise doit être arrondie au centime. Elle remplace la ligne
`return` de `src/discount.js` par la ligne suivante, puis commite :

```js
  return Math.round((amount - amount * rate) * 100) / 100;
```

```bash
git commit -am "oups arrondi"
```

Enfin, elle ajoute un test à la fin de `test/discount.test.js` et commite :

```js

test('arrondit au centime', () => {
  assert.equal(applyDiscount(19.99, 0.15), 16.99);
});
```

```bash
git commit -am "fini les tests"
git log --oneline
```

L’historique obtenu (empreintes différentes chez toi) :

```text
c966f21 (HEAD -> feat/remise) fini les tests
12502b9 oups arrondi
6240927 Documente la remise
100c1c6 wip tests
bd1e673 Ajoute la fonction de remise
df67a44 (origin/main, main) Ajoute le calcul du sous-total
```

`node --test` (lancé à la racine du dépôt) confirme que les deux tests passent. Le
**contenu** est bon ; c’est l’**histoire** qu’il faut nettoyer.

## Le rebase interactif

```bash
git rebase -i main
```

L’option `-i` (_interactive_) rejoue les commits de la branche qui ne sont pas dans `main`,
comme un rebase ordinaire, mais commence par t’ouvrir ton éditeur avec la **liste
d’instructions** (la _todo list_) :

```text
pick bd1e673 Ajoute la fonction de remise
pick 100c1c6 wip tests
pick 6240927 Documente la remise
pick 12502b9 oups arrondi
pick c966f21 fini les tests

# Rebase df67a44..c966f21 onto df67a44 (5 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup [-C | -c] <commit> = like "squash" but keep only the previous
#                    commit's log message, unless -C is used, in which case
#                    keep only this commit's message; -c is same as -C but
#                    opens the editor
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
```

(Suivent quelques commandes avancées et des rappels, également en commentaire.)

Attention, l’ordre est **inverse** de celui de `git log` : le plus **ancien** commit est en
haut, car les instructions s’exécutent de haut en bas. Tu modifies ce fichier, tu
l’enregistres, tu fermes l’éditeur : Git exécute les instructions. Si tu fermes sans rien
changer, chaque commit est repris tel quel et rien ne bouge.

Les instructions à connaître :

| Instruction | Effet                                                                           |
| ----------- | ------------------------------------------------------------------------------- |
| `pick`      | garder le commit tel quel                                                       |
| `reword`    | garder le commit, mais modifier son message (l’éditeur s’ouvre)                 |
| `edit`      | rejouer le commit puis **s’arrêter** pour le modifier (contenu, découpage)      |
| `squash`    | fusionner le commit avec le précédent et composer un message à partir des deux  |
| `fixup`     | fusionner le commit avec le précédent en **jetant** son message                 |
| `drop`      | supprimer le commit (supprimer la ligne a le même effet)                        |

Et tu peux **déplacer les lignes** pour réordonner les commits. `squash` et `fixup`
fusionnent avec la ligne **au-dessus** : pour fusionner « oups arrondi » dans « Ajoute la
fonction de remise », il faut d’abord placer sa ligne juste en dessous.

### Nettoyer la branche

Camille veut trois commits : la fonction (arrondi compris), les tests, la documentation.
Elle écrit :

```text
pick bd1e673 Ajoute la fonction de remise
fixup 12502b9 oups arrondi
pick 100c1c6 wip tests
squash c966f21 fini les tests
reword 6240927 Documente la remise
```

Git rejoue la fonction et y fond l’arrondi sans rien demander (`fixup`). Au `squash`, il
ouvre l’éditeur avec les deux messages à combiner :

```text
# This is a combination of 2 commits.
# This is the 1st commit message:

wip tests

# This is the commit message #2:

fini les tests

# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
```

(D’autres lignes de commentaire suivent, qui rappellent l’état du rebasage.) Camille
remplace les lignes non commentées par `Teste la fonction de remise`, enregistre et
ferme. Au `reword`, l’éditeur s’ouvre de nouveau avec `Documente la remise` ; elle écrit
`Documente la remise dans le README`. Git affiche alors :

```text
[detached HEAD 560076c] Teste la fonction de remise
 Date: Wed Feb 25 07:17:20 2026 +0100
 1 file changed, 11 insertions(+)
 create mode 100644 test/discount.test.js
[detached HEAD 662c335] Documente la remise dans le README
 Date: Wed Feb 25 07:18:20 2026 +0100
 1 file changed, 4 insertions(+)
Successfully rebased and updated refs/heads/feat/remise.
```

Les lignes `detached HEAD` sont normales : pendant le rebasage, Git construit les nouveaux
commits hors de toute branche, puis déplace `feat/remise` à la fin.

```bash
git log --oneline
```

```text
662c335 (HEAD -> feat/remise) Documente la remise dans le README
560076c Teste la fonction de remise
b8cc8fa Ajoute la fonction de remise
df67a44 (origin/main, main) Ajoute le calcul du sous-total
```

### Vérifier qu’on n’a rien perdu

Réorganiser des commits ne doit pas changer le **résultat final**. Juste après un
rebasage, Git mémorise l’ancienne pointe de la branche dans la référence spéciale
`ORIG_HEAD`. Compare :

```bash
git diff ORIG_HEAD
```

La commande n’affiche **rien** : le contenu du projet est identique à celui d’avant, seule
l’histoire a changé. C’est le contrôle à faire systématiquement après un rebase interactif.
Si tu as fait une erreur, `git reset --hard ORIG_HEAD` remet la branche dans son état
d’avant le rebasage (tant que tu n’as pas lancé une autre commande qui modifie
`ORIG_HEAD`, comme une fusion ou un autre rebasage).

Reste la faute « remsie » dans le README. Elle se trouve dans le **dernier** commit : un
simple `--amend` suffit.

```bash
sed -i.bak 's/remsie/remise/' README.md && rm README.md.bak   # ou corrige dans l'éditeur
git commit --amend --no-edit -a
```

```text
[feat/remise d68fc99] Documente la remise dans le README
 Date: Wed Feb 25 07:18:20 2026 +0100
 1 file changed, 4 insertions(+)
```

### Découper un commit avec edit

`edit` sert notamment à **découper** un commit qui mélange deux sujets. Le principe :
Git s’arrête juste après avoir rejoué le commit ; tu l’annules avec `git reset HEAD~`
(ses modifications reviennent dans le répertoire de travail), puis tu commites en
plusieurs fois et tu termines avec `git rebase --continue`. Lorsque Git s’arrête, il
l’annonce ainsi :

```text
Stopped at 5646534...  Ajoute le contact et une feuille de style
You can amend the commit now, with

  git commit --amend

Once you are satisfied with your changes, run

  git rebase --continue
```

Tu t’exerceras à ce découpage dans l’exercice 2.

## Corriger un ancien commit : fixup et autosquash

Après relecture, Camille veut que `applyDiscount` refuse un taux hors de `[0, 1]`. Cette
vérification appartient logiquement au **premier** commit, pas à un nouveau commit
« ajoute une vérification » qui viendrait après la documentation. Elle modifie
`src/discount.js` :

```js
export function applyDiscount(amount, rate) {
  if (rate < 0 || rate > 1) {
    throw new RangeError('rate must be between 0 and 1');
  }
  return Math.round((amount - amount * rate) * 100) / 100;
}
```

Puis elle crée un commit **marqué** comme correctif du premier, avec `--fixup` suivi de
l’empreinte visée (`b8cc8fa` ici, à lire dans ton `git log --oneline`) :

```bash
git commit -a --fixup=b8cc8fa
git log --oneline
```

```text
[feat/remise 1721894] fixup! Ajoute la fonction de remise
 1 file changed, 3 insertions(+)
1721894 (HEAD -> feat/remise) fixup! Ajoute la fonction de remise
d68fc99 Documente la remise dans le README
560076c Teste la fonction de remise
b8cc8fa Ajoute la fonction de remise
df67a44 (origin/main, main) Ajoute le calcul du sous-total
```

Le message commence par `fixup!` suivi du résumé du commit visé. L’option `--autosquash` du
rebase interactif reconnaît ce préfixe et **prépare la liste à ta place** :

```bash
git rebase -i --autosquash main
```

```text
pick b8cc8fa Ajoute la fonction de remise
fixup 1721894 fixup! Ajoute la fonction de remise
pick 560076c Teste la fonction de remise
pick d68fc99 Documente la remise dans le README
```

Le correctif a été déplacé sous sa cible et marqué `fixup`. Il n’y a plus qu’à enregistrer
et fermer l’éditeur :

```text
Successfully rebased and updated refs/heads/feat/remise.
```

```bash
git log --oneline
git show --stat HEAD~2
```

```text
f584636 (HEAD -> feat/remise) Documente la remise dans le README
6c3fdbb Teste la fonction de remise
efbeac4 Ajoute la fonction de remise
df67a44 (origin/main, main) Ajoute le calcul du sous-total
commit efbeac44d425db663ad552f1427dd44ab48227c8
Author: Camille Martin <camille@example.com>
Date:   Wed Feb 25 07:16:20 2026 +0100

    Ajoute la fonction de remise

 src/discount.js | 6 ++++++
 1 file changed, 6 insertions(+)
```

Le premier commit contient désormais la vérification. Note que **les trois** empreintes ont
changé : modifier un commit change son empreinte, donc celle de tous ses descendants, dont
le parent a changé.

:::tip[Rendre l’autosquash automatique]
`git config --global rebase.autoSquash true` active `--autosquash` à chaque rebase
interactif. Le flux devient : `git commit --fixup=<cible>` au fil de l’eau, puis un
`git rebase -i main` avant de publier.
:::

## Quand ça tourne mal

- **Pendant** un rebasage (arrêt sur `edit`, conflit, éditeur ouvert par erreur) :
  `git rebase --abort` remet la branche exactement dans son état d’avant. `git status`
  t’indique toujours si un rebasage est en cours (`interactive rebase in progress`).
- **Juste après** : `git reset --hard ORIG_HEAD` annule le rebasage terminé.
- **Plus tard** : le reflog garde toutes les positions de `HEAD`, y compris les étapes du
  rebasage. Après l’autosquash ci-dessus :

```bash
git reflog -6
```

```text
f584636 (HEAD -> feat/remise) HEAD@{0}: rebase (finish): returning to refs/heads/feat/remise
f584636 (HEAD -> feat/remise) HEAD@{1}: rebase (pick): Documente la remise dans le README
6c3fdbb HEAD@{2}: rebase (pick): Teste la fonction de remise
efbeac4 HEAD@{3}: rebase (fixup): Ajoute la fonction de remise
b8cc8fa HEAD@{4}: rebase (start): checkout main
1721894 HEAD@{5}: commit: fixup! Ajoute la fonction de remise
```

La ligne juste avant `rebase (start)` (ici `HEAD@{5}`, `1721894`) est la pointe de la
branche avant le rebasage : `git reset --hard 1721894` y reviendrait. La leçon 4 approfondit
le reflog.

## La règle d’or : ne pas réécrire ce qui est partagé

Tout ce qui précède est sans risque **tant que les commits n’existent que chez toi**. Dès
qu’ils ont été poussés et que quelqu’un a pu les récupérer, les réécrire pose problème.
Voyons pourquoi, concrètement.

Camille pousse sa branche. Sacha la récupère pour l’aider et y ajoute un test :

```bash
# Camille
git push -u origin feat/remise

# Sacha
cd ~/equipe/sacha
git fetch
git switch feat/remise
# … ajout d'un test « refuse un taux négatif » dans test/discount.test.js
git commit -am "Teste le refus d'un taux négatif"
git push
```

Camille, qui n’a rien récupéré depuis, décide de reformuler le premier message en
« Ajoute le calcul de la remise » (rebase interactif avec `reword`), puis pousse :

```text
 ! [rejected]        feat/remise -> feat/remise (fetch first)
error: failed to push some refs to '/home/camille/equipe/serveur.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
```

Le refus est une **protection** : le serveur a un commit (celui de Sacha) que Camille n’a
pas. Après un `git fetch`, le graphe montre deux histoires parallèles :

```text
* f481c1f (HEAD -> feat/remise) Documente la remise dans le README
* d707676 Teste la fonction de remise
* 1a8b1b0 Ajoute le calcul de la remise
| * 87f112b (origin/feat/remise) Teste le refus d'un taux négatif
| * f584636 Documente la remise dans le README
| * 6c3fdbb Teste la fonction de remise
| * efbeac4 Ajoute la fonction de remise
|/
* df67a44 (origin/main, main) Ajoute le calcul du sous-total
```

Les trois commits de Camille existent désormais **en double** sous deux empreintes, et le
commit de Sacha repose sur les anciennes versions. Si Camille force l’envoi, le serveur
adopte sa version : le commit `87f112b` de Sacha **disparaît de la branche distante**.

```text
 + 87f112b...f481c1f feat/remise -> feat/remise (forced update)
```

Et quand Sacha fait ensuite `git pull`, Git tente de fusionner les deux histoires, qui
ont chacune créé `test/discount.test.js` :

```text
From /home/camille/equipe/serveur
 + 87f112b...f481c1f feat/remise -> origin/feat/remise  (forced update)
Auto-merging test/discount.test.js
CONFLICT (add/add): Merge conflict in test/discount.test.js
Automatic merge failed; fix conflicts and then commit the result.
```

Si Sacha « résout » ce conflit et pousse, la branche contiendra chaque commit deux fois.
Réécrire un historique partagé produit exactement cela : du travail écrasé, des doublons et
des conflits absurdes.

D’où la règle, commune à toute la documentation de Git : **on ne réécrit pas des commits
que d’autres ont pu récupérer.** En pratique :

- jamais de réécriture sur `main` ni sur une branche partagée par plusieurs personnes ;
- sur une branche partagée, une correction se fait par un **nouveau commit** ;
- on nettoie sa branche **avant** de la pousser, ou au moins avant que quelqu’un d’autre
  ne s’en serve.

### Forcer prudemment : --force-with-lease

Il existe un cas où forcer est accepté : ta **propre** branche de pull request, que
personne d’autre ne modifie, quand l’équipe accepte que tu la nettoies (par exemple après
un autosquash, ou après l’avoir rebasée sur `main`). Dans ce cas, n’utilise jamais
`--force` seul, mais :

```bash
git push --force-with-lease
```

`--force-with-lease` n’écrase la branche distante **que si elle est encore là où ta
branche de suivi `origin/feat/remise` dit qu’elle est**. Dans le scénario précédent,
avant tout `fetch`, Camille aurait obtenu :

```text
 ! [rejected]        feat/remise -> feat/remise (stale info)
error: failed to push some refs to '/home/camille/equipe/serveur.git'
```

« stale info » : l’information de Camille sur le distant est périmée, quelqu’un a poussé
depuis. Le commit de Sacha est protégé.

Limite importante : la vérification porte sur `origin/feat/remise`. Si Camille fait un
`git fetch` (ou si son éditeur le fait automatiquement en arrière-plan), `origin/feat/remise`
connaît le commit de Sacha, et `--force-with-lease` **l’écrase sans broncher**. Git propose
une sécurité supplémentaire, `--force-if-includes`, qui refuse si la branche de suivi
contient des commits que tu n’as jamais intégrés à ta branche locale :

```bash
git push --force-with-lease --force-if-includes
```

```text
 ! [rejected]        feat/remise -> feat/remise (remote ref updated since checkout)
error: failed to push some refs to '/home/camille/equipe/serveur.git'
hint: Updates were rejected because the tip of the remote-tracking branch has
hint: been updated since the last checkout. If you want to integrate the
hint: remote changes, use 'git pull' before pushing again.
```

Aucune option ne remplace le réflexe : **avant de forcer, `git fetch` puis
`git log --oneline --graph --all`**, pour voir exactement ce que tu vas écraser.

### Réparer quand le mal est fait

Si une branche que tu possèdes a été réécrite par quelqu’un d’autre, tes commits existent
encore **chez toi**. Sacha peut les récupérer proprement : annuler la fusion ratée, poser
une étiquette de sauvegarde sur son commit, aligner sa branche sur la nouvelle version
distante, puis **réappliquer** son commit avec `git cherry-pick`, qui rejoue la
modification d’un commit donné sur la branche courante (c’est l’opération élémentaire du
rebasage).

```bash
git merge --abort
git branch sauvegarde                 # étiquette sur 87f112b, le commit de Sacha
git reset --hard origin/feat/remise   # la branche suit la version réécrite
git cherry-pick sauvegarde            # réapplique le commit de Sacha
git log --oneline --graph
```

```text
HEAD is now at f481c1f Documente la remise dans le README
[feat/remise d3d3ff0] Teste le refus d'un taux négatif
 Date: Wed Feb 25 07:25:20 2026 +0100
 1 file changed, 4 insertions(+)
* d3d3ff0 (HEAD -> feat/remise) Teste le refus d'un taux négatif
* f481c1f (origin/feat/remise) Documente la remise dans le README
* d707676 Teste la fonction de remise
* 1a8b1b0 Ajoute le calcul de la remise
* df67a44 (origin/main, origin/HEAD, main) Ajoute le calcul du sous-total
```

Sacha pousse, l’historique est de nouveau propre. Ensuite, `git branch -d sauvegarde`
refuse (« not fully merged ») : c’est logique, le commit réappliqué a une **autre**
empreinte. Après avoir vérifié le résultat, `git branch -D sauvegarde` supprime
l’étiquette. Le `git reset --hard` est sans danger ici parce que le répertoire de travail
était propre et que le commit de Sacha était protégé par l’étiquette `sauvegarde`.

## Pièges courants

- **Lire la liste à l’envers.** Dans la liste du rebase interactif, le plus ancien commit est
  en haut. Un `squash` sur la première ligne est impossible : il n’y a rien au-dessus.
- **Supprimer une ligne par mégarde.** Une ligne supprimée est un commit abandonné. En cas de
  doute, ferme l’éditeur après avoir vidé **tout** le fichier : Git annule alors le
  rebasage.
- **Oublier de vérifier.** `git diff ORIG_HEAD` juste après le rebasage doit être vide si tu
  ne voulais que réorganiser.
- **Réécrire après avoir poussé sur une branche partagée.** Même pour un simple message.
  Préfère un nouveau commit.
- **Utiliser `git push --force` par habitude.** Toujours `--force-with-lease`, et seulement
  sur ta propre branche, après un `git fetch` et une lecture du graphe.
- **Viser le mauvais commit avec `--fixup`.** Le préfixe `fixup!` reprend le résumé du
  commit visé : relis-le dans `git log` avant de lancer l’autosquash.

## Exercices

### Exercice 1 — Écrire la liste d’instructions

`git rebase -i main` t’affiche :

```text
pick a1a1a1a Ajoute le formulaire de contact
pick b2b2b2b Corrige une faute dans le formulaire
pick c3c3c3c Ajoute la validation du courriel
pick d4d4d4d console.log de debug
pick e5e5e5e Ajoute les tests de validation
```

Écris la liste qui produit trois commits : le formulaire (faute corrigée, message
inchangé), la validation **avec** ses tests dans un seul commit au message
« Valide le courriel du formulaire », et rien du commit de débogage.

:::solution
```text
pick a1a1a1a Ajoute le formulaire de contact
fixup b2b2b2b Corrige une faute dans le formulaire
pick c3c3c3c Ajoute la validation du courriel
squash e5e5e5e Ajoute les tests de validation
drop d4d4d4d console.log de debug
```

- `fixup` fond la correction dans le formulaire en gardant son message.
- La ligne des tests est **remontée** sous la validation, puis `squash` les combine ;
  l’éditeur s’ouvre et tu écris « Valide le courriel du formulaire ». `fixup` suivi d’un
  `reword` sur la ligne précédente aurait aussi fonctionné, mais `squash` te montre les deux
  messages.
- `drop` (ou la suppression de la ligne) abandonne le commit de débogage. Attention : si ce
  commit avait aussi modifié une ligne touchée plus tard, le rebasage pourrait s’arrêter sur
  un conflit (leçon suivante).
- Après le rebasage, `git diff ORIG_HEAD` doit montrer **uniquement** la disparition du
  `console.log`.
:::

### Exercice 2 — Découper un commit

Dans un dépôt d’essai, crée sur `main` un commit initial avec `README.md`. Sur une branche
`feat/contact`, fais **un seul** commit « Ajoute le contact et une feuille de style » qui
ajoute une ligne au `README.md` et crée `style.css`. Découpe-le en deux commits,
« Ajoute l’adresse de contact » puis « Ajoute une feuille de style ».

:::solution
```bash
mkdir decoupage && cd decoupage
git init
echo "# Boutique" > README.md
git add README.md && git commit -m "Initialise le projet"
git switch -c feat/contact
echo "Contact : equipe@example.com" >> README.md
printf 'body {\n  margin: 0;\n}\n' > style.css
git add README.md style.css
git commit -m "Ajoute le contact et une feuille de style"

git rebase -i main
# dans l'éditeur : remplacer « pick » par « edit », enregistrer, fermer
git reset HEAD~               # défait le commit, garde ses modifications
git status --short            #  M README.md  et  ?? style.css
git add README.md
git commit -m "Ajoute l'adresse de contact"
git add style.css
git commit -m "Ajoute une feuille de style"
git rebase --continue         # Successfully rebased and updated refs/heads/feat/contact.
git log --oneline             # deux commits au-dessus de « Initialise le projet »
```

Pourquoi `git reset HEAD~` ? Pendant l’arrêt `edit`, `HEAD` est le commit à découper. Le
reset en mode mixte recule d’un commit en gardant les modifications dans le répertoire de
travail, hors de l’index : `style.css` redevient un fichier non suivi (`??`), d’où le
`git add` explicite. Tant que `git rebase --continue` n’est pas lancé, `git rebase --abort`
remet tout comme avant.
:::

### Exercice 3 — Analyser une procédure dangereuse

Un collègue propose, pour « avoir un historique propre sur main avant la démo » :

```bash
git switch main
git pull
git rebase -i HEAD~10      # fusionne les 10 derniers commits en 3
git push --force
```

Explique ce qui va se passer pour l’équipe et propose une alternative.

:::solution
- Les dix derniers commits de `main` ont été poussés et récupérés par toute l’équipe. Le
  rebase interactif crée trois **nouveaux** commits qui remplacent ces dix-là : c’est une
  réécriture de l’historique **partagé**.
- `git push --force` impose cette version au serveur. Tout commit poussé par un collègue
  entre le `pull` et le `push` est **effacé** du serveur, sans avertissement (`--force`
  ne vérifie rien).
- Chaque collègue a encore les dix anciens commits : son prochain `git pull` tentera de
  fusionner les deux histoires, avec des doublons et des conflits sur des changements déjà
  intégrés. Les branches parties de l’ancien `main` reposent sur des commits qui n’existent
  plus dans `main`.
- Alternative : ne pas toucher à `main`. Un historique lisible s’obtient **en amont** :
  chacun nettoie sa branche avant de la proposer (rebase interactif, fixup), et l’équipe
  choisit une stratégie d’intégration (écrasement ou commit de fusion). Pour la démo, un
  `git log --oneline --first-parent main` ou une étiquette de version suffit à présenter
  l’historique.
:::

## Récapitulatif

- Réécrire, c’est créer de nouveaux commits et y déplacer la branche ; les anciens restent
  accessibles quelque temps par le reflog.
- `git commit --amend` remplace le dernier commit ; `git rebase -i main` permet de
  réordonner, fusionner (`squash`, `fixup`), renommer (`reword`), modifier ou découper
  (`edit`) et supprimer (`drop`) les commits de la branche.
- La liste d’instructions se lit du plus ancien (en haut) au plus récent.
- `git commit --fixup=<commit>` puis `git rebase -i --autosquash main` corrige un ancien
  commit sans effort.
- `git diff ORIG_HEAD` vérifie le résultat ; `git rebase --abort` et
  `git reset --hard ORIG_HEAD` annulent.
- **Règle d’or** : on ne réécrit pas des commits que d’autres ont pu récupérer. Sur une
  branche partagée, on corrige par un nouveau commit.
- Sur sa propre branche seulement : `git push --force-with-lease` (éventuellement avec
  `--force-if-includes`), après `git fetch` et lecture du graphe ; jamais `--force` seul.
- `git cherry-pick` réapplique un commit précis : utile pour récupérer son travail après une
  réécriture subie.
