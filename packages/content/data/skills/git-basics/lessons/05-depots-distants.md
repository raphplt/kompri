---
title: Travailler avec un dépôt distant
summary: Cloner, envoyer, récupérer et proposer ses changements avec une pull request.
durationMinutes: 70
sources:
  - title: Pro Git — Travailler avec des dépôts distants (en français)
    url: https://git-scm.com/book/fr/v2
  - title: Documentation de git push
    url: https://git-scm.com/docs/git-push
  - title: Documentation de git fetch
    url: https://git-scm.com/docs/git-fetch
  - title: Documentation de git pull
    url: https://git-scm.com/docs/git-pull
---

## Partager son historique

Jusqu’ici, ton dépôt vivait seul sur ton ordinateur. Pour sauvegarder ton travail ailleurs,
le publier ou collaborer, il faut un **dépôt distant** (_remote_) : une autre copie du
dépôt, en général hébergée sur un serveur, avec laquelle tu échanges des commits.

Git est **distribué** : chaque copie (chaque **clone**) contient l’historique complet. Il
n’y a pas de copie « maîtresse » d’un point de vue technique ; c’est une **convention**
d’équipe qui désigne un dépôt central, souvent hébergé sur GitHub ou GitLab, comme
référence commune.

Les commandes à connaître :

| Commande     | Rôle                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `git clone`  | créer une copie locale complète d’un dépôt distant                   |
| `git push`   | envoyer tes commits vers le dépôt distant                            |
| `git fetch`  | télécharger les nouveaux commits du distant, **sans** toucher à tes branches |
| `git pull`   | `git fetch`, puis intégrer les commits récupérés dans ta branche     |

## S’entraîner sans compte : un dépôt distant local

Un dépôt distant n’est pas forcément sur Internet : ce peut être un simple dossier. Pour
pratiquer sans créer de compte, nous allons simuler un serveur avec un **dépôt nu**
(_bare repository_) : un dépôt sans répertoire de travail, qui ne contient que l’historique.
C’est exactement ce qu’héberge un serveur Git.

On suppose que `mon-site` se trouve dans ton dossier personnel (ici `/home/camille`). Depuis
ce dossier personnel :

```bash
cd ~
git init --bare depots/mon-site.git
```

```text
Initialized empty Git repository in /home/camille/depots/mon-site.git/
```

Par convention, le nom d’un dépôt nu se termine par `.git`.

## Relier son dépôt et envoyer : remote et push

Dans `mon-site`, déclare ce dépôt comme distant sous le nom `origin` (nom conventionnel du
dépôt distant principal) :

```bash
cd ~/mon-site
git remote add origin ../depots/mon-site.git
git remote -v
```

```text
origin	../depots/mon-site.git (fetch)
origin	../depots/mon-site.git (push)
```

Envoie la branche `main` :

```bash
git push -u origin main
```

```text
Enumerating objects: 42, done.
Counting objects: 100% (42/42), done.
Delta compression using up to 4 threads
Compressing objects: 100% (38/38), done.
Writing objects: 100% (42/42), 4.20 KiB | 4.20 MiB/s, done.
Total 42 (delta 18), reused 0 (delta 0), pack-reused 0
To ../depots/mon-site.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

Les premières lignes décrivent le transfert (leurs nombres dépendent de ton historique).
L’essentiel est à la fin : une nouvelle branche `main` a été créée sur le distant, et
l’option `-u` (pour _upstream_) a associé ta branche locale `main` à `origin/main`. Grâce à
cette association, les prochains envois et récupérations se feront avec un simple
`git push` ou `git pull`.

```bash
git branch -a
git log --oneline -2
```

```text
* main
  remotes/origin/main
a56d594 (HEAD -> main, origin/main) Merge branch 'accueil'
262c51f Personnalise le titre d'accueil
```

`origin/main` est une **branche de suivi distante** : une étiquette locale qui mémorise
où en était `main` sur `origin` **lors du dernier échange**. Tu ne commites jamais
directement dessus ; elle est mise à jour par `fetch`, `pull` et `push`.

## Cloner : l’arrivée d’une collègue

Sacha rejoint le projet. Pour simuler son ordinateur, on clone le dépôt distant dans un
autre dossier :

```bash
cd ~
git clone depots/mon-site.git sacha
cd sacha
git config user.name "Sacha Bernard"
git config user.email "sacha@example.com"
git log --oneline -2
```

```text
Cloning into 'sacha'...
done.
a56d594 (HEAD -> main, origin/main, origin/HEAD) Merge branch 'accueil'
262c51f Personnalise le titre d'accueil
```

`git clone` a tout fait : copie de l’historique complet, création du distant `origin`,
création de la branche `main` associée à `origin/main`. Les `git config` sans `--global`
ne s’appliquent qu’à ce dépôt : c’est ce qui permet de simuler une seconde personne sur la
même machine.

Avec un hébergeur, tu clonerais une URL :

```bash
git clone https://github.com/compte/mon-site.git
git clone git@github.com:compte/mon-site.git
```

La première forme passe par HTTPS, la seconde par SSH (voir plus bas).

## Récupérer le travail des autres : fetch, merge et pull

Sacha améliore le style et envoie son commit :

```bash
# dans ~/sacha, après avoir ajouté une marge au pied de page dans style.css
git commit -am "Espace le pied de page du contenu"
git push
```

```text
[main 27baf47] Espace le pied de page du contenu
 1 file changed, 4 insertions(+)
To /home/camille/depots/mon-site.git
   a56d594..27baf47  main -> main
```

Retour chez Camille :

```bash
cd ~/mon-site
git status
```

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

« Up to date » alors que Sacha vient d’envoyer un commit ? Oui : `git status` compare avec
`origin/main` **tel qu’il était lors du dernier échange**. Git ne contacte jamais le serveur
de lui-même. Il faut le lui demander :

```bash
git fetch
git status
```

```text
From ../depots/mon-site
   a56d594..27baf47  main       -> origin/main
On branch main
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
```

`git fetch` a téléchargé le commit et avancé `origin/main`, **sans toucher** à ta branche
`main` ni à tes fichiers. Tu peux donc examiner ce qui arrive avant de l’intégrer :

```bash
git log --oneline --all -3
git diff main origin/main --stat
```

```text
27baf47 (origin/main) Espace le pied de page du contenu
a56d594 (HEAD -> main) Merge branch 'accueil'
262c51f Personnalise le titre d'accueil
 style.css | 4 ++++
 1 file changed, 4 insertions(+)
```

Puis intégrer avec une fusion, comme entre deux branches locales :

```bash
git merge
```

```text
Updating a56d594..27baf47
Fast-forward
 style.css | 4 ++++
 1 file changed, 4 insertions(+)
```

Sans argument, `git merge` fusionne la branche associée (`origin/main`). `git pull` fait les
deux étapes d’un coup : `fetch` puis intégration.

## Quand l’envoi est refusé

Sacha change le titre de la page de contact et pousse. Pendant ce temps, Camille change la
police et tente d’envoyer :

```bash
git commit -am "Utilise la police du système"
git push
```

```text
To ../depots/mon-site.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '../depots/mon-site.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

Le distant refuse : accepter ton envoi effacerait le commit de Sacha. Un `push` ne réussit
que si le distant peut **avancer rapidement** jusqu’à ton commit. La solution : récupérer
et intégrer d’abord.

```bash
git pull
```

```text
From ../depots/mon-site
   27baf47..f0ba7d1  main       -> origin/main
hint: You have divergent branches and need to specify how to reconcile them.
hint: You can do so by running one of the following commands sometime before
hint: your next pull:
hint:
hint:   git config pull.rebase false  # merge
hint:   git config pull.rebase true   # rebase
hint:   git config pull.ff only       # fast-forward only
hint:
hint: You can replace "git config" with "git config --global" to set a default
hint: preference for all repositories. You can also pass --rebase, --no-rebase,
hint: or --ff-only on the command line to override the configured default per
hint: invocation.
fatal: Need to specify how to reconcile divergent branches.
```

Les versions récentes de Git te demandent de choisir comment combiner deux histoires qui
ont divergé. Les trois options :

- `pull.rebase false` : **fusion**, un commit de fusion réunit les deux histoires. C’est ce
  que tu connais déjà ; c’est le choix le plus simple pour débuter.
- `pull.rebase true` : **rebasage**, tes commits locaux sont rejoués après ceux du distant,
  ce qui donne un historique linéaire. Puissant, mais il réécrit tes commits : à étudier
  plus tard.
- `pull.ff only` : n’accepte que l’avance rapide et refuse sinon.

```bash
git config --global pull.rebase false
git pull
```

```text
Merge made by the 'ort' strategy.
 contact.html | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

(Le `fetch` avait déjà été fait par la tentative précédente, d’où l’absence de ligne
`From`.) L’historique montre la fusion :

```text
*   596be79 (HEAD -> main) Merge branch 'main' of ../depots/mon-site
|\
| * f0ba7d1 (origin/main) Précise le titre de la page de contact
* | 8398890 Utilise la police du système
|/
* 27baf47 Espace le pied de page du contenu
```

Maintenant, l’envoi passe :

```bash
git push
```

```text
To ../depots/mon-site.git
   f0ba7d1..596be79  main -> main
```

Si les deux personnes avaient modifié les mêmes lignes, `git pull` aurait signalé un
**conflit**, à résoudre exactement comme dans la leçon précédente.

:::warning[Jamais de push --force sur une branche partagée]
`git push --force` remplace l’historique distant par le tien, et **efface** les commits des
autres qui n’y figurent pas. Sur une branche partagée, c’est presque toujours une erreur.
Si tu dois un jour réécrire une branche qui n’appartient qu’à toi, préfère
`git push --force-with-lease`, qui refuse d’écraser des commits que tu n’as pas récupérés.
:::

## Les pull requests

Sur GitHub, on parle de **pull request** ; sur GitLab, de **merge request**. C’est la même
idée : une **demande de fusion** d’une branche dans une autre, accompagnée d’une page web où
l’équipe relit les changements, commente, et où des vérifications automatiques (tests,
analyse) s’exécutent. Ce n’est pas une commande Git : c’est une fonction des plateformes
d’hébergement, construite autour des branches.

Le déroulé type :

1. Mettre à jour `main` : `git switch main` puis `git pull`.
2. Créer une branche dédiée : `git switch -c ajout-projets`.
3. Commiter, par petits commits atomiques.
4. Envoyer la branche : `git push -u origin ajout-projets`.
5. Sur la plateforme, ouvrir la pull request de `ajout-projets` vers `main`, avec un titre
   et une description : quoi, pourquoi, comment tester.
6. Les relecteurs commentent ; tu corriges par de nouveaux commits sur la même branche
   et un simple `git push` met la pull request à jour.
7. Une fois approuvée, la fusion est faite sur la plateforme (bouton de fusion).
8. En local : revenir sur `main`, `git pull`, supprimer la branche.

Dans beaucoup d’équipes, `main` est **protégée** : personne ne peut y pousser directement,
tout passe par une pull request relue.

### Simuler une pull request en local

Sans plateforme, on peut reproduire chaque étape Git. Camille prépare sa branche :

```bash
cd ~/mon-site
git switch -c ajout-projets
# ajout d'une section « Mes projets » dans index.html
git commit -am "Ajoute une section Mes projets"
git push -u origin ajout-projets
```

```text
Switched to a new branch 'ajout-projets'
[ajout-projets 326c525] Ajoute une section Mes projets
 1 file changed, 4 insertions(+)
To ../depots/mon-site.git
 * [new branch]      ajout-projets -> ajout-projets
branch 'ajout-projets' set up to track 'origin/ajout-projets'.
```

Sacha joue la relectrice. Elle récupère tout, puis regarde ce que la branche apporte
**par rapport à `main`** :

```bash
cd ~/sacha
git pull
git log --oneline main..origin/ajout-projets
git diff main...origin/ajout-projets
```

```text
326c525 (origin/ajout-projets) Ajoute une section Mes projets
```

```diff
diff --git a/index.html b/index.html
index 69f0948..3f892b9 100644
--- a/index.html
+++ b/index.html
@@ -8,6 +8,10 @@
   <body>
     <h1>Bonjour et bienvenue chez Camille !</h1>
     <p>Je m'appelle Camille et j'apprends le développement web.</p>
+    <h2>Mes projets</h2>
+    <ul>
+      <li>Un convertisseur de températures</li>
+    </ul>
     <footer><a href="contact.html">Me contacter</a></footer>
   </body>
 </html>
```

- `main..origin/ajout-projets` (deux points) : les commits de la branche absents de `main`.
- `main...origin/ajout-projets` (trois points) avec `git diff` : les changements de la
  branche depuis son point de départ commun avec `main`. C’est exactement ce qu’affiche
  l’onglet des fichiers modifiés d’une pull request.

La relecture est positive ; Sacha fusionne, comme le ferait le bouton de la plateforme, et
envoie :

```bash
git merge --no-ff origin/ajout-projets
git push
```

```text
Merge made by the 'ort' strategy.
 index.html | 4 ++++
 1 file changed, 4 insertions(+)
To /home/camille/depots/mon-site.git
   596be79..43c2877  main -> main
```

`--no-ff` force un commit de fusion même si l’avance rapide était possible : l’historique
garde ainsi la trace de la pull request, comme le font par défaut GitHub et GitLab avec leur
bouton de fusion standard.

Camille termine le cycle :

```bash
cd ~/mon-site
git switch main
git pull
git branch -d ajout-projets
git push origin --delete ajout-projets
```

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
From ../depots/mon-site
   596be79..43c2877  main       -> origin/main
Updating 596be79..43c2877
Fast-forward
 index.html | 4 ++++
 1 file changed, 4 insertions(+)
Deleted branch ajout-projets (was 326c525).
To ../depots/mon-site.git
 - [deleted]         ajout-projets
```

Chez Sacha, `git fetch --prune` supprime l’étiquette `origin/ajout-projets` devenue
inutile.

## Passer à une vraie plateforme

Le jour où tu crées un compte sur GitHub ou GitLab :

1. Crée un dépôt **vide** sur la plateforme (sans README si ton projet existe déjà).
2. Copie son URL et relie ton projet : `git remote add origin URL` (ou, si `origin`
   existe déjà, `git remote set-url origin URL`).
3. `git push -u origin main`.

Pour t’authentifier, GitHub n’accepte plus le mot de passe du compte pour les opérations
Git (depuis août 2021) ; les autres plateformes proposent les mêmes alternatives. Les deux
principales :

- **HTTPS avec un jeton d’accès personnel** (_personal access token_), créé dans les
  paramètres du compte et saisi à la place du mot de passe ; un gestionnaire d’identifiants
  peut le mémoriser.
- **SSH avec une paire de clés** : tu génères une clé, puis tu déclares la clé **publique**
  dans les paramètres du compte.

```bash
ssh-keygen -t ed25519 -C "camille@example.com"
cat ~/.ssh/id_ed25519.pub
```

Ne partage jamais la clé privée (`~/.ssh/id_ed25519`, sans `.pub`) ni un jeton : ce sont des
secrets, au même titre qu’un mot de passe.

Pour contribuer à un projet où tu n’as pas les droits d’écriture, on crée d’abord une
**fourche** (_fork_) : une copie du dépôt sous ton compte, dans laquelle tu pousses ta
branche, puis tu ouvres une pull request vers le projet d’origine.

## Pièges courants

- **Croire que `git status` interroge le serveur.** Il ne compare qu’avec la dernière
  information récupérée : fais `git fetch` d’abord.
- **Commencer sa journée sans `git pull`.** Tu travailles sur une base périmée et
  multiplies les conflits.
- **Forcer un envoi refusé.** Un refus signifie « intègre d’abord le travail des autres »,
  pas « force ».
- **Travailler directement sur `main` dans un projet d’équipe.** Une branche par sujet,
  une pull request par branche.
- **Pousser un secret.** Une fois sur un serveur, il faut le considérer comme compromis et
  le révoquer, même si tu supprimes le commit.

## Exercices

### Exercice 1 — Le cycle complet à deux

En partant d’un dossier vide `atelier`, crée un dépôt nu `atelier/serveur.git`, deux clones
`atelier/alice` et `atelier/bob` (avec des identités locales différentes), puis :
Alice crée et pousse `notes.txt` ; Bob le récupère, ajoute une ligne et pousse ; Alice
récupère la modification. Donne les commandes.

:::solution
```bash
mkdir atelier
cd atelier
git init --bare serveur.git
git clone serveur.git alice     # avertit : « You appear to have cloned an empty repository. »
git clone serveur.git bob

cd alice
git config user.name "Alice"
git config user.email "alice@example.com"
echo "Première note" > notes.txt
git add notes.txt
git commit -m "Ajoute les notes"
git push -u origin main         # la branche n'existe pas encore sur le serveur

cd ../bob
git config user.name "Bob"
git config user.email "bob@example.com"
git pull                        # récupère main, qui existe maintenant
echo "Note de Bob" >> notes.txt
git commit -am "Complète les notes"
git push

cd ../alice
git pull                        # avance rapide jusqu'au commit de Bob
git log --oneline               # deux commits, deux auteurs
```

Le clone d’un dépôt vide fonctionne mais n’a encore aucune branche : le premier
`git push -u origin main` d’Alice crée `main` sur le serveur. `git pull` de Bob la récupère.
Si la configuration `init.defaultBranch main` n’est pas réglée, la branche locale peut
s’appeler `master` : adapte le nom ou règle cette configuration.
:::

### Exercice 2 — Résoudre un envoi refusé

Reprends `atelier`. Alice et Bob modifient **la même ligne** de `notes.txt` chacun de leur
côté et commitent. Bob pousse le premier. Que se passe-t-il pour Alice, et comment s’en
sort-elle ?

:::solution
1. `git push` d’Alice est refusé (`! [rejected] main -> main (fetch first)`), car le serveur
   contient le commit de Bob qu’elle n’a pas.
2. Alice fait `git pull` (avec `pull.rebase false` configuré). Comme la même ligne a été
   modifiée, Git annonce `CONFLICT (content): Merge conflict in notes.txt`.
3. Alice ouvre `notes.txt`, choisit le contenu final, supprime les marqueurs
   `<<<<<<<`, `=======` et `>>>>>>>` (lors d’un `pull`, la partie distante est étiquetée par
   l’empreinte du commit récupéré au lieu d’un nom de branche), puis :

```bash
git add notes.txt
git commit            # termine la fusion
git push              # accepté : son historique contient maintenant celui de Bob
```

Ce qu’il faut savoir expliquer : le refus protège le travail de Bob ; `pull` est un
`fetch` suivi d’une fusion ; le conflit se résout comme n’importe quel conflit de fusion.
:::

### Exercice 3 — Relire une branche

Dans `atelier`, Bob crée une branche `correction-orthographe`, y fait deux commits et la
pousse. Quelles commandes Alice utilise-t-elle pour voir la liste des commits proposés, puis
les changements, sans modifier sa branche `main` ?

:::solution
```bash
git fetch
git log --oneline main..origin/correction-orthographe
git diff main...origin/correction-orthographe
```

`fetch` récupère la branche sans rien fusionner. Les deux points listent les commits
présents dans la branche mais pas dans `main` ; les trois points avec `git diff` montrent
les changements apportés par la branche depuis qu’elle s’est séparée de `main`. Pour tester
le code, Alice peut aussi faire `git switch correction-orthographe`, qui crée une branche
locale suivant `origin/correction-orthographe`.
:::

## Récapitulatif

- Un dépôt distant est une autre copie du dépôt ; `origin` est le nom conventionnel du
  principal. Un dépôt nu (`git init --bare`) suffit pour s’entraîner.
- `git clone` copie tout l’historique et configure `origin`.
- `git push -u origin branche` envoie et associe la branche ; ensuite `git push` suffit.
- `git fetch` télécharge sans toucher à tes branches ; `origin/main` mémorise l’état du
  distant au dernier échange. `git pull` = `fetch` + intégration.
- Un `push` refusé signifie que le distant a des commits que tu n’as pas : `git pull`,
  résoudre les conflits éventuels, puis `git push`. Jamais de `--force` sur une branche
  partagée.
- Une pull request (GitHub) ou merge request (GitLab) propose de fusionner une branche
  après relecture ; `main..branche` et `main...branche` permettent de la relire en local.
- L’authentification se fait par jeton (HTTPS) ou clé SSH, jamais en partageant ses
  secrets.
