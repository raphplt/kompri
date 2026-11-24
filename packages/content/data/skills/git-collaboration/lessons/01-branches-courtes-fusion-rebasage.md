---
title: Branches courtes, fusion ou rebasage
summary: Organiser le travail d’équipe en branches courtes et choisir comment les intégrer.
durationMinutes: 60
sources:
  - title: Pro Git — Rebaser (en français)
    url: https://git-scm.com/book/fr/v2/Les-branches-avec-Git-Rebaser-Rebasing
  - title: Documentation de git rebase
    url: https://git-scm.com/docs/git-rebase
  - title: Documentation de git merge
    url: https://git-scm.com/docs/git-merge
  - title: GitHub Docs — GitHub flow
    url: https://docs.github.com/en/get-started/using-github/github-flow
---

## Quand l’équipe grandit

Tu sais déjà créer une branche, la fusionner, pousser et récupérer du travail. À deux ou à
cinq sur le même dépôt, une nouvelle question se pose : **comment organiser** ces branches
pour que chacun avance sans bloquer les autres, et **comment les intégrer** pour que
l’historique reste lisible ?

Deux situations reviennent sans cesse :

- ta branche a pris du retard sur `main`, parce que des collègues y ont intégré leur
  travail ;
- ta branche est prête et il faut l’intégrer à `main`.

Pour chacune, Git propose deux familles d’outils : la **fusion** (`git merge`), que tu
connais, et le **rebasage** (`git rebase`), que tu vas découvrir. Cette leçon t’apprend à
les utiliser et surtout à **choisir**.

## Le flux de travail en branches courtes

La plupart des équipes qui livrent souvent suivent un modèle simple, que GitHub décrit sous
le nom de _GitHub flow_ :

1. `main` est toujours dans un état stable, qu’on pourrait livrer à tout moment.
2. Chaque sujet (une fonctionnalité, une correction) part d’un `main` à jour, sur une
   **branche dédiée**.
3. La branche est **courte** : quelques heures à quelques jours de travail, un seul sujet.
4. Elle est relue (pull request), puis intégrée à `main` et supprimée.

Pourquoi « courte » ? Parce que chaque jour qui passe, `main` avance sans toi. Plus ta
branche s’en écarte, plus tu risques de modifier les mêmes lignes qu’un collègue (donc des
conflits), plus la relecture est longue et plus l’intégration est risquée. Une branche de
deux jours qui touche trois fichiers se relit en un quart d’heure ; une branche de trois
semaines qui touche quarante fichiers ne se relit vraiment jamais.

Quelques règles pratiques, qui sont des **conventions** d’équipe et non des contraintes de
Git :

- **Un sujet par branche.** Si tu découvres un autre problème en route, note-le et ouvre
  une autre branche plus tard.
- **Un nom qui dit le sujet**, souvent préfixé par un type : `feat/frais-livraison`,
  `fix/total-negatif`, `docs/installation`. La barre oblique est autorisée dans un nom de
  branche ; elle ne crée aucune hiérarchie technique, elle aide seulement à trier.
- **Partir d’un `main` à jour** : `git switch main`, `git pull`, puis `git switch -c …`.
- **Se resynchroniser souvent** avec `main`, au moins chaque jour où la branche vit.
- **Découper** un gros chantier en plusieurs petites branches intégrées l’une après
  l’autre. Une fonctionnalité inachevée peut être intégrée si elle n’est pas encore
  accessible aux utilisateurs (par exemple derrière un réglage désactivé).

:::note[D’autres modèles existent]
Certaines équipes utilisent des branches longues supplémentaires (`develop`, branches de
version…), notamment pour des logiciels livrés en versions numérotées et maintenues en
parallèle. Ce cours s’en tient aux branches courtes sur `main`, un modèle simple et très
utilisé pour les applications web. Dans une équipe existante, applique le modèle en
place.
:::

## Mettre en place un atelier à deux

Pour pratiquer, reprends la méthode de la compétence précédente : un dépôt nu joue le
serveur, deux clones jouent Camille et Sacha. Depuis ton dossier personnel :

```bash
mkdir ~/equipe
cd ~/equipe
git init --bare serveur.git
git clone serveur.git camille
cd camille
git config user.name "Camille Martin"
git config user.email "camille@example.com"
mkdir src
printf '# Boutique\n\nCalcul du panier de la boutique en ligne.\n' > README.md
```

Crée `src/cart.js` :

```js
export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

Puis publie le premier commit et crée le clone de Sacha :

```bash
git add README.md src/cart.js
git commit -m "Ajoute le calcul du sous-total"
git push -u origin main
cd ..
git clone serveur.git sacha
cd sacha
git config user.name "Sacha Bernard"
git config user.email "sacha@example.com"
```

Les configurations sans `--global` ne valent que pour le clone concerné : c’est ce qui te
permet d’incarner deux personnes sur une même machine. Les sorties ci-dessous ont été
obtenues avec Git 2.43 ; chez toi, **les empreintes des commits seront différentes**
(elles dépendent de la date et de l’auteur) et les chemins dépendent de ton dossier
personnel. Les lignes de progression des transferts (`Enumerating objects…`) sont omises.

## Une branche qui prend du retard

Camille commence les frais de livraison sur une branche courte :

```bash
cd ~/equipe/camille
git switch -c feat/livraison
```

Elle crée `src/shipping.js` :

```js
export function shippingCost(subtotal) {
  return subtotal >= 50 ? 0 : 4.5;
}
```

Puis elle ajoute au `README.md` une section « Livraison » et commite en deux fois :

```bash
git add src/shipping.js
git commit -m "Ajoute le calcul des frais de livraison"
printf '\n## Livraison\n\nGratuite à partir de 50 euros, 4,50 euros sinon.\n' >> README.md
git commit -am "Documente les frais de livraison"
```

Pendant ce temps, Sacha ajoute une licence et la publie directement sur `main` (pour
l’exemple ; dans l’équipe, elle passerait aussi par une branche) :

```bash
cd ~/equipe/sacha
printf 'Code sous licence MIT.\n' > LICENSE
git add LICENSE
git commit -m "Ajoute la licence"
git push
```

Camille récupère les nouveautés et regarde le graphe :

```bash
cd ~/equipe/camille
git fetch
git log --oneline --graph --all
```

```text
* 10d6e22 (origin/main) Ajoute la licence
| * 9097449 (HEAD -> feat/livraison) Documente les frais de livraison
| * cf30005 Ajoute le calcul des frais de livraison
|/
* df67a44 (main) Ajoute le calcul du sous-total
```

Les deux histoires ont **divergé** depuis `df67a44`. Pour tester sa fonctionnalité avec le
code le plus récent, Camille veut que sa branche contienne aussi la licence. Deux options.

### Option 1 : fusionner main dans la branche

```bash
git merge origin/main
```

```text
Merge made by the 'ort' strategy.
 LICENSE | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 LICENSE
```

```text
*   dac01a8 (HEAD -> feat/livraison) Merge remote-tracking branch 'origin/main' into feat/livraison
|\
| * 10d6e22 (origin/main) Ajoute la licence
* | 9097449 Documente les frais de livraison
* | cf30005 Ajoute le calcul des frais de livraison
|/
* df67a44 (main) Ajoute le calcul du sous-total
```

Rien n’est réécrit : les commits de Camille gardent leurs empreintes, et un commit de
fusion réunit les deux lignes. C’est sûr, même si la branche a déjà été partagée. En
revanche, si Camille se resynchronise chaque jour pendant une semaine, sa branche
accumulera des commits « Merge remote-tracking branch… » qui ne disent rien de son travail.

Pour essayer l’autre option, annulons cette fusion locale. Le commit de fusion n’a été
envoyé nulle part, et `HEAD~1` désigne son **premier parent**, c’est-à-dire l’ancienne
pointe de `feat/livraison` :

```bash
git reset --hard HEAD~1
```

```text
HEAD is now at 9097449 Documente les frais de livraison
```

### Option 2 : rebaser la branche sur main

```bash
git rebase origin/main
```

```text
Successfully rebased and updated refs/heads/feat/livraison.
```

```text
* 5926a79 (HEAD -> feat/livraison) Documente les frais de livraison
* cd046d0 Ajoute le calcul des frais de livraison
* 10d6e22 (origin/main) Ajoute la licence
* df67a44 (main) Ajoute le calcul du sous-total
```

L’historique est devenu **linéaire** : tout se passe comme si Camille avait commencé son
travail après la licence. Regarde bien les empreintes : `cf30005` est devenu `cd046d0`, et
`9097449` est devenu `5926a79`.

## Ce que fait vraiment git rebase

« Rebaser » signifie **changer la base** d’une branche. `git rebase origin/main`, lancé
depuis `feat/livraison`, procède ainsi :

1. Il cherche l’ancêtre commun de la branche courante et de `origin/main` (ici `df67a44`).
2. Il met de côté les commits de la branche qui ne sont pas dans `origin/main` (ici les
   deux commits de Camille).
3. Il place `HEAD` sur `origin/main`.
4. Il **rejoue** les commits mis de côté un par un, dans l’ordre, en appliquant chacun
   comme un correctif. Chaque rejeu crée un **nouveau commit**.
5. Il déplace l’étiquette `feat/livraison` sur le dernier commit créé.

```text
Avant :

      cf30005 - 9097449  (feat/livraison)
     /
df67a44 - 10d6e22  (origin/main)

Après :

                cd046d0 - 5926a79  (feat/livraison)
               /
df67a44 - 10d6e22  (origin/main)
```

Pourquoi de nouvelles empreintes ? L’empreinte d’un commit est calculée à partir de tout
ce qui le compose : l’instantané des fichiers, le message, l’auteur, les dates et
**l’empreinte de son parent**. Le commit rejoué a le même message, le même auteur et apporte
la même modification, mais son parent n’est plus le même : c’est donc un autre commit. Les
anciens `cf30005` et `9097449` existent toujours dans le dépôt de Camille, mais plus aucune
branche ne pointe dessus.

Cette conséquence est capitale : **rebaser réécrit l’historique**. Pour Camille seule, ce
n’est pas un problème. Si quelqu’un d’autre possédait déjà les anciens commits, ce serait
une source de confusion ; la leçon suivante y est consacrée.

:::warning[Le sens compte]
`git rebase X` déplace **la branche courante** au-dessus de `X`. On rebase sa branche de
travail sur `main`, jamais `main` sur sa branche de travail : `main` est partagée, on ne
réécrit pas ses commits.
:::

## Intégrer une branche terminée dans main

La branche est prête. Camille la publie, puis met son `main` local à jour :

```bash
git push -u origin feat/livraison
git switch main
git pull
```

```text
Updating df67a44..10d6e22
Fast-forward
 LICENSE | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 LICENSE
```

Dans une équipe, l’intégration passe normalement par une pull request (leçon 5). Mais le
bouton de fusion de la plateforme applique l’une des trois stratégies suivantes, que tu
peux reproduire en local pour comprendre ce qu’elles produisent. Ce sont des
**alternatives** : pour les comparer, on remet `main` à l’état de `origin/main` entre deux
essais avec `git reset --hard origin/main`, possible ici car rien n’a été poussé.

### Avance rapide seulement

```bash
git merge --ff-only feat/livraison
```

```text
Updating 10d6e22..5926a79
Fast-forward
 README.md       | 4 ++++
 src/shipping.js | 3 +++
 2 files changed, 7 insertions(+)
 create mode 100644 src/shipping.js
```

Le graphe, avec `git log --oneline --graph -4` :

```text
* 5926a79 (HEAD -> main, origin/feat/livraison, feat/livraison) Documente les frais de livraison
* cd046d0 Ajoute le calcul des frais de livraison
* 10d6e22 (origin/main) Ajoute la licence
* df67a44 Ajoute le calcul du sous-total
```

Grâce au rebasage, `main` était un ancêtre direct de la branche : l’étiquette a simplement
avancé. L’option `--ff-only` est une sécurité : si l’avance rapide est impossible, Git
**refuse** au lieu de créer un commit de fusion. Si Sacha avait poussé un nouveau commit
sur `main` entre-temps, tu obtiendrais :

```text
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
hint: Disable this message with "git config advice.diverging false"
fatal: Not possible to fast-forward, aborting.
```

Il faudrait alors rebaser de nouveau la branche sur le `main` à jour, puis recommencer.

### Commit de fusion systématique

```bash
git merge --no-ff feat/livraison
```

```text
Merge made by the 'ort' strategy.
 README.md       | 4 ++++
 src/shipping.js | 3 +++
 2 files changed, 7 insertions(+)
 create mode 100644 src/shipping.js
```

Le graphe, avec `git log --oneline --graph -5` :

```text
*   ed2ab36 (HEAD -> main) Merge branch 'feat/livraison'
|\
| * 5926a79 (origin/feat/livraison, feat/livraison) Documente les frais de livraison
| * cd046d0 Ajoute le calcul des frais de livraison
|/
* 10d6e22 (origin/main) Ajoute la licence
* df67a44 Ajoute le calcul du sous-total
```

Même quand l’avance rapide était possible, `--no-ff` crée un commit de fusion. Avantage :
l’historique montre clairement quels commits formaient la branche, et le commit de fusion
représente toute la fonctionnalité. On peut l’annuler d’un coup (leçon 4).

### Fusion avec écrasement (squash)

```bash
git merge --squash feat/livraison
git status --short
```

```text
Updating 10d6e22..5926a79
Fast-forward
Squash commit -- not updating HEAD
 README.md       | 4 ++++
 src/shipping.js | 3 +++
 2 files changed, 7 insertions(+)
 create mode 100644 src/shipping.js
M  README.md
A  src/shipping.js
```

`--squash` calcule le résultat de la fusion, le place **dans l’index**, mais ne crée aucun
commit (« not updating HEAD ») : c’est à toi de commiter, avec un message qui résume toute
la branche.

```bash
git commit -m "Ajoute les frais de livraison"
git log --oneline --graph --all -5
```

```text
* 4dac8fa (HEAD -> main) Ajoute les frais de livraison
| * 5926a79 (origin/feat/livraison, feat/livraison) Documente les frais de livraison
| * cd046d0 Ajoute le calcul des frais de livraison
|/
* 10d6e22 (origin/main) Ajoute la licence
* df67a44 Ajoute le calcul du sous-total
```

`main` reçoit **un seul commit** ordinaire (un seul parent) qui contient tout le travail.
Les commits de la branche n’entrent pas dans `main` : pour Git, `feat/livraison` n’est
**pas fusionnée**, et ses commits détaillés ne restent visibles que tant que la branche
existe. C’est pourquoi on supprime la branche juste après une fusion avec écrasement, et on
ne continue jamais à travailler dessus.

## Se resynchroniser avec git pull --rebase

Le rebasage sert aussi au quotidien, sur `main` ou sur ta branche, quand tu as des commits
locaux **non poussés** et que le distant a avancé. Après ces essais, Camille a remis son
`main` sur `origin/main`, qui contient maintenant aussi un commit de Sacha, « Explique
comment contribuer ». Elle ajoute une fonction `itemCount` à `src/cart.js` et commite
« Ajoute le comptage des articles » directement sur `main` (dans un petit projet, certaines
équipes l’acceptent) ; Sacha a poussé « Précise le titulaire des droits » entre-temps. Un `git pull` classique créerait un
commit « Merge branch 'main' of… ». À la place :

```bash
git pull --rebase
```

```text
From /home/camille/equipe/serveur
   d25dd4f..68dab7d  main       -> origin/main
Successfully rebased and updated refs/heads/main.
```

```text
* c85ba78 (HEAD -> main) Ajoute le comptage des articles
* 68dab7d (origin/main) Précise le titulaire des droits
* d25dd4f Explique comment contribuer
* 10d6e22 Ajoute la licence
```

`git pull --rebase` fait un `fetch`, puis rebase tes commits locaux sur la branche distante.
Il ne réécrit que **tes commits qui n’ont jamais quitté ta machine** : c’est sans danger,
et l’historique partagé reste linéaire. Si tu veux en faire ton comportement par défaut,
`git config --global pull.rebase true` remplace le réglage `false` choisi dans la compétence
précédente ; ce choix revient à toi ou à ton équipe.

## Fusion ou rebasage : comment choisir

Il n’y a pas de réponse universelle ; il y a des critères et une règle de sécurité.

| Besoin                                         | Fusion (`merge`)                       | Rebasage (`rebase`)                       |
| ---------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Réécrit des commits ?                          | non                                    | **oui** (nouvelles empreintes)            |
| Sûr sur une branche déjà partagée ?            | oui                                    | non, sauf accord explicite                |
| Historique obtenu                              | fidèle, avec des commits de fusion     | linéaire, plus facile à lire              |
| Conflits                                       | résolus une fois, dans le commit de fusion | résolus commit par commit (leçon 3)   |
| Trace de « quand la branche a été intégrée »   | oui (commit de fusion)                 | non, sauf avec `--no-ff` au moment final  |

Une pratique répandue, à adapter à ton équipe :

- **pour mettre à jour ta propre branche** avec `main` : rebasage, tant que personne d’autre
  ne travaille sur cette branche ; fusion de `main` dans la branche si elle est partagée ;
- **pour intégrer une branche dans `main`** : la stratégie choisie par l’équipe sur la
  plateforme (commit de fusion, écrasement ou rebasage), appliquée de façon cohérente ;
- **jamais** de rebasage de `main` ; pas de rebasage d’une branche dont d’autres possèdent
  les commits sans leur accord explicite.

Ce que l’équipe choisit doit être **écrit** (dans un fichier `CONTRIBUTING.md`, par
exemple) : un historique où chacun applique sa préférence est le plus difficile à lire.

## Pièges courants

- **Rebaser sur un `main` périmé.** `git rebase main` utilise ta copie **locale** de `main`,
  qui peut dater de plusieurs jours. Fais `git fetch` puis `git rebase origin/main`, ou mets
  d’abord `main` à jour avec `git pull`.
- **Rebaser dans le mauvais sens.** Sur `main`, `git rebase feat/livraison` rejouerait les
  commits de `main` absents de la branche au-dessus de celle-ci : c’est réécrire `main`.
  Vérifie la branche courante avant de lancer la commande.
- **Croire que `--squash` fusionne la branche.** Après un écrasement, la branche n’est pas
  considérée comme fusionnée : la reprendre plus tard pour « continuer » mélange des
  commits déjà intégrés sous une autre forme. Supprime-la et repars de `main`.
- **Laisser vivre une branche des semaines.** Les conflits et le temps de relecture croissent
  avec l’écart. Découpe et intègre souvent.
- **Accumuler des fusions de synchronisation.** Fusionner `main` dans ta branche chaque
  matin produit un historique bruité ; sur une branche personnelle, un rebasage est plus
  lisible.

## Exercices

### Exercice 1 — Prédire le graphe

Situation : `main` pointe sur `A`. Tu crées `feat/recherche` et y fais deux commits `B` et
`C`. Un collègue pousse `D` sur `main`. Tu fais `git fetch`. Dessine le graphe obtenu, dans
le style de `git log --oneline --graph --all`, après chacune de ces opérations
(indépendantes) :

1. depuis `feat/recherche`, `git merge origin/main` ;
2. depuis `feat/recherche`, `git rebase origin/main` ;
3. après l’opération 2, depuis `main` mis à jour, `git merge --no-ff feat/recherche` ;
4. après l’opération 2, depuis `main` mis à jour, `git merge --squash feat/recherche` puis
   `git commit`.

:::solution
1. Un commit de fusion `M` sur la branche, avec deux parents `C` et `D` :

   ```text
   *   M (HEAD -> feat/recherche) Merge remote-tracking branch 'origin/main' into feat/recherche
   |\
   | * D (origin/main) …
   * | C …
   * | B …
   |/
   * A (main) …
   ```

2. Historique linéaire `A - D - B' - C'` : `B'` et `C'` sont de **nouveaux** commits, avec
   les mêmes messages et modifications que `B` et `C` mais d’autres empreintes.
3. Un commit de fusion sur `main`, de parents `D` et `C'`, même si l’avance rapide était
   possible : c’est le rôle de `--no-ff`.
4. Un seul nouveau commit `S` sur `main`, de parent `D`, qui contient les modifications de
   `B'` et `C'` ; la branche reste à côté, non fusionnée aux yeux de Git.

Vérifie tes réponses dans l’atelier : crée les commits avec de petits fichiers texte et
compare avec `git log --oneline --graph --all`.
:::

### Exercice 2 — Mettre sa branche à jour puis l’intégrer sans commit de fusion

Dans l’atelier, Camille crée `feat/promo` et y commite un fichier `src/promo.js`. Sacha
pousse sur `main` une modification du `README.md`. Fais en sorte que `main` contienne les
deux travaux avec un historique **linéaire**, sans aucun commit de fusion, puis publie
`main`. Donne les commandes et le graphe final attendu.

:::solution
```bash
# Côté Camille : une branche courte depuis un main à jour
cd ~/equipe/camille
git switch main
git pull
git switch -c feat/promo
printf 'export const PROMO_RATE = 0.1;\n' > src/promo.js
git add src/promo.js
git commit -m "Ajoute le taux de promotion"

# Côté Sacha : une modification publiée sur main pendant ce temps
cd ~/equipe/sacha
git pull
printf '\nContact : equipe@example.com\n' >> README.md
git commit -am "Ajoute le contact de l'équipe"
git push

# Côté Camille : rattraper main, puis intégrer
cd ~/equipe/camille
git fetch
git rebase origin/main         # la branche repart du main le plus récent
git switch main
git pull                       # avance rapide jusqu'au commit de Sacha
git merge --ff-only feat/promo # refuserait s'il fallait un commit de fusion
git push
git branch -d feat/promo
git log --oneline --graph -3
```

```text
* 14ec04d (HEAD -> main, origin/main) Ajoute le taux de promotion
* 6886f28 Ajoute le contact de l'équipe
* c85ba78 Ajoute le comptage des articles
```

Le graphe est une seule ligne : le commit de Sacha, puis celui de Camille au-dessus. Si tu
relances `git rebase origin/main` alors que la branche est déjà à jour, Git répond
`Current branch feat/promo is up to date.` sans rien changer. `--ff-only` garantit
qu’aucun commit de fusion n’a pu être créé par erreur.
:::

### Exercice 3 — Choisir une stratégie

Pour chaque situation, propose fusion ou rebasage et justifie en une phrase.

1. Ta branche personnelle `fix/arrondi`, jamais poussée, a deux jours de retard sur `main`.
2. La branche `feat/paiement` est partagée par trois personnes qui y poussent chacune ; il
   faut y intégrer les dernières nouveautés de `main`.
3. Tu as un commit local sur `main` et `git push` est refusé parce que le distant a avancé.
4. Ta pull request contient douze petits commits « essai », « oups », « encore » ; l’équipe
   veut un historique de `main` où chaque commit correspond à un sujet.

:::solution
1. **Rebasage** (`git fetch` puis `git rebase origin/main`) : la branche n’existe que chez
   toi, réécrire ses commits ne gêne personne et l’historique reste linéaire.
2. **Fusion** de `origin/main` dans `feat/paiement` : rebaser réécrirait des commits que
   tes collègues possèdent déjà ; la fusion n’en modifie aucun.
3. **`git pull --rebase`** puis `git push` : ton commit n’a jamais été publié, le rejouer
   au-dessus du distant évite un commit de fusion inutile.
4. **Fusion avec écrasement** au moment de l’intégration, ou nettoyage préalable de la
   branche par rebase interactif (leçon suivante) si plusieurs commits méritent d’être
   gardés séparément.
:::

## Récapitulatif

- Le flux en **branches courtes** : `main` toujours stable, une branche par sujet partie
  d’un `main` à jour, resynchronisée souvent, relue puis intégrée et supprimée vite.
- `git rebase origin/main` rejoue les commits de ta branche au-dessus de `origin/main` :
  historique linéaire, mais **nouveaux commits**, donc historique réécrit.
- Fusionner `main` dans ta branche ne réécrit rien mais ajoute des commits de fusion.
- Trois façons d’intégrer une branche dans `main` : **avance rapide** (`--ff-only`),
  **commit de fusion** systématique (`--no-ff`), **écrasement** en un seul commit
  (`--squash` puis `git commit`).
- `git pull --rebase` rejoue tes commits locaux non poussés au-dessus du distant.
- Règle de sécurité : on rebase ce qui n’appartient qu’à soi, jamais `main` ni une branche
  dont d’autres possèdent les commits.
- La stratégie d’intégration est une **décision d’équipe**, à écrire et à appliquer de
  façon cohérente.
