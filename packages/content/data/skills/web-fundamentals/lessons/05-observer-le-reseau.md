---
title: Observer le réseau avec les outils de développement
summary: Ouvrir les outils de développement du navigateur et utiliser le panneau Réseau pour voir chaque requête, sa réponse et sa durée.
durationMinutes: 50
sources:
  - title: MDN — Que sont les outils de développement d’un navigateur ?
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools
  - title: Chrome for Developers — Network features reference
    url: https://developer.chrome.com/docs/devtools/network/reference
  - title: Firefox Source Docs — Network Monitor
    url: https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/
---

Jusqu’ici, tu as appris ce qui se passe **en théorie** quand une page se charge. Les
navigateurs te permettent de le voir **en vrai** : chaque requête, son code de statut,
ses en-têtes, sa taille, sa durée. Les **outils de développement** (*DevTools*) sont
l’instrument de travail quotidien d’un développeur web, au même titre que l’éditeur de
code.

Dans cette leçon, tu apprends à ouvrir ces outils, à t’orienter dans leurs principaux
panneaux, puis à utiliser le **panneau Réseau** pour répondre à des questions concrètes :
combien de requêtes cette page envoie-t-elle ? Laquelle échoue ? Laquelle est lente ?
D’où vient cette redirection ?

## Ouvrir les outils de développement

Tous les navigateurs de bureau courants intègrent ces outils :

| Navigateur             | Raccourci Windows et Linux | Raccourci macOS     |
| ---------------------- | -------------------------- | ------------------- |
| Chrome, Edge, Firefox  | `F12` ou `Ctrl`+`Maj`+`I`  | `Cmd`+`Option`+`I`  |
| Safari                 | sans objet                 | `Cmd`+`Option`+`I`, après activation |

Tu peux aussi faire un clic droit sur un élément de la page et choisir **Inspecter**.
Dans Safari, il faut d’abord activer les fonctionnalités pour les développeurs web dans
les réglages avancés de l’application.

:::note
Ce cours décrit Chrome et Firefox. Edge reprend les outils de Chrome ; Safari propose les
mêmes fonctions avec une présentation différente. Les intitulés exacts dépendent de la
version et de la langue de ton navigateur : cherche la fonction décrite plutôt que le mot
exact. Quand un intitulé est donné en anglais, c’est celui de l’interface anglaise.

:::

Les outils s’ouvrent en général en bas ou sur le côté de la fenêtre, avec plusieurs
onglets appelés **panneaux**. Trois d’entre eux te serviront dès maintenant :

| Panneau (Chrome / Firefox)         | À quoi il sert                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| **Éléments** / **Inspecteur**      | Voir et modifier le DOM et les styles CSS appliqués          |
| **Console**                        | Lire les messages et erreurs, exécuter du JavaScript         |
| **Réseau**                         | Voir toutes les requêtes HTTP envoyées par la page           |

Tout ce que tu modifies dans les outils de développement est **temporaire** et **local** :
tu changes la copie de la page dans ton navigateur, pas le site. Un rechargement efface
tes modifications.

## Le panneau Réseau

### Enregistrer un chargement de page

Le panneau Réseau n’enregistre les requêtes **que lorsqu’il est ouvert**. La méthode est
donc toujours la même :

1. Ouvre les outils de développement sur l’onglet **Réseau**.
2. **Recharge** la page (`F5` ou `Ctrl`+`R`, `Cmd`+`R` sur macOS).
3. Observe la liste qui se remplit.

Essaie sur `https://developer.mozilla.org/fr/`. Chaque ligne est **une requête HTTP**
et sa réponse. Tu verras le document HTML en premier, puis les feuilles de style, les
scripts, les polices, les images… Une page ordinaire peut en déclencher des dizaines.

### Lire les colonnes

Les colonnes par défaut varient un peu selon le navigateur, mais tu retrouveras
toujours ces informations :

| Information                  | Ce qu’elle t’apprend                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| Nom ou fichier, et domaine   | La ressource demandée ; survole pour voir l’URL complète               |
| Statut                       | Le code de statut HTTP (`200`, `301`, `404`…)                          |
| Méthode                      | `GET`, `POST`… (clic droit sur l’en-tête des colonnes pour l’ajouter dans Chrome) |
| Type                         | Document, feuille de style, script, image, police, `fetch`…            |
| Initiateur                   | Qui a déclenché la requête : le HTML, un fichier CSS, un script        |
| Taille ou transfert          | Le poids téléchargé ; une mention de cache si rien n’a été téléchargé  |
| Durée et chronologie         | Le temps total et une barre qui situe la requête dans le temps         |

En bas du panneau, une **barre de résumé** indique le nombre de requêtes, le volume
transféré et, selon le navigateur, les durées jusqu’aux événements `DOMContentLoaded`
et `load` que tu as découverts dans la leçon précédente.

La colonne **chronologie** (*waterfall*, « cascade ») est très parlante : tu y vois que
le document HTML arrive d’abord, puis que les autres ressources partent presque toutes
ensemble, au moment où le navigateur les découvre en analysant le HTML.

### Filtrer

Une barre de filtres permet de n’afficher que certains types de requêtes : documents,
CSS, JS, images, polices, et **Fetch/XHR** (les requêtes envoyées par le JavaScript de la
page, souvent vers une API). Un champ de recherche filtre par texte dans l’URL : tape
`.css` pour ne garder que les feuilles de style.

### Deux cases à connaître

- **Désactiver le cache** (*Disable cache*) : tant que les outils de développement sont
  ouverts, le navigateur ignore son cache et retélécharge tout. Utile pour voir le
  chargement comme un nouveau visiteur, ou pour être sûr d’obtenir la dernière version
  de ton CSS pendant le développement.
- **Conserver le journal** (*Preserve log* dans Chrome, *Persist Logs* dans Firefox) :
  normalement, la liste est vidée à chaque nouvelle page. Coche cette case pour garder
  les requêtes d’une page à l’autre, par exemple pour observer une **redirection** ou
  l’envoi d’un formulaire suivi d’un changement de page.

### Le cache du navigateur

Recharge la page **sans** désactiver le cache. Beaucoup de ressources n’ont plus été
téléchargées : Chrome l’indique dans la colonne Taille avec une mention comme
`(memory cache)` ou `(disk cache)`, Firefox avec une mention dans la colonne Transfert
(*cached* dans l’interface anglaise). Le navigateur a gardé une copie lors de la
première visite et l’a
réutilisée. D’autres ressources peuvent afficher le statut `304 Not Modified` : le
navigateur a demandé au serveur si sa copie était encore valable, et le serveur a
répondu « oui, garde-la » sans renvoyer le contenu. La compétence « HTTP en détail »
explique les en-têtes qui pilotent ce cache.

## Examiner une requête en détail

Clique sur une ligne : un panneau de détails s’ouvre, avec plusieurs onglets.

**En-têtes** (*Headers*). C’est l’onglet le plus utile. Il contient :

- un résumé : URL de la requête, méthode, code de statut, et l’**adresse distante**
  (*Remote Address*), c’est-à-dire l’adresse IP et le port du serveur contacté, le
  résultat concret de la résolution DNS ;
- les **en-têtes de réponse** envoyés par le serveur (`content-type`, `location` pour
  une redirection…) ;
- les **en-têtes de requête** envoyés par ton navigateur (`host`, `user-agent`,
  `accept`…).

**Réponse** et **Aperçu** (*Response*, *Preview*). Le corps de la réponse, brut ou mis en
forme : le HTML, le contenu d’un fichier CSS, une image, ou des données JSON présentées
sous forme d’arbre dépliable.

**Charge utile** (*Payload*, onglet « Requête » dans Firefox). Pour un `POST`, les
données envoyées par le navigateur, par exemple les champs d’un formulaire.

**Délais** (*Timing*). La décomposition de la durée : attente dans la file, résolution
DNS, connexion, négociation TLS, **attente de la réponse du serveur** (le temps que le
serveur met à commencer à répondre) et téléchargement du contenu. Si l’attente du serveur
domine, le serveur est lent ; si le téléchargement domine, la ressource est lourde.

:::warning[Données sensibles]
Les en-têtes de requête contiennent souvent tes **cookies** de connexion. Ne fais jamais
de capture d’écran ni de copie de ces en-têtes pour les partager publiquement : avec ton
cookie de session, quelqu’un pourrait se faire passer pour toi sur le site.

:::

### Copier une requête

Un clic droit sur une requête propose **Copier**, puis par exemple **Copier en tant que
cURL** (*Copy as cURL*). Tu obtiens une commande que tu peux coller dans un terminal pour
rejouer exactement la même requête. Tu t’en serviras dans la compétence « HTTP en
détail ». Attention : cette commande inclut tes cookies, la même règle de confidentialité
s’applique.

## Observer des situations typiques

Voici quatre expériences à faire toi-même. Elles reprennent tout ce que tu as appris
dans cette compétence. Les sites réels évoluent : si un résultat diffère un peu de la
description, cherche à comprendre pourquoi plutôt que de t’en inquiéter.

### Une redirection

1. Ouvre le panneau Réseau et coche **Conserver le journal**.
2. Tape `http://developer.mozilla.org/fr/` (bien avec `http`, sans `s`) dans la barre
   d’adresse.
3. La première ligne affiche le statut `301` (ou `307` si ton navigateur force lui-même
   HTTPS), et ses en-têtes de réponse contiennent `location: https://developer.mozilla.org/fr/`.
   La ligne suivante est la requête vers l’adresse HTTPS, avec le statut `200`.

### Une ressource introuvable

Ouvre `https://developer.mozilla.org/fr/docs/Une_page_qui_n_existe_pas`. Le document
principal a le statut `404` : le serveur a bien répondu, avec une page d’erreur. Remarque
que cette page d’erreur charge elle-même du CSS et des scripts avec le statut `200`.

### Un nom de domaine introuvable

Ouvre `https://exemple.invalid/`. Le domaine de premier niveau `.invalid` est réservé et
ne peut jamais être résolu. Le navigateur affiche une page d’erreur ; dans le panneau
Réseau, la requête échoue **sans code de statut** (Chrome indique une erreur comme
`net::ERR_NAME_NOT_RESOLVED`). Aucun serveur n’a été contacté, il n’y a donc pas de
réponse HTTP.

### Une connexion refusée

Ouvre `http://localhost:59999/`. À moins qu’un programme écoute par hasard sur ce port,
la requête échoue elle aussi sans code de statut (Chrome indique
`net::ERR_CONNECTION_REFUSED`) : ta machine a bien été trouvée, mais rien n’écoute sur ce
port.

Retiens la différence : **pas de code de statut** signifie que l’échange HTTP n’a pas eu
lieu (DNS, connexion, certificat). **Un code d’erreur** (`4xx`, `5xx`) signifie que le
serveur a répondu.

## La console au service du réseau

Le panneau **Console** affiche aussi les erreurs liées au réseau : une ressource
introuvable, un script qui n’a pas pu être chargé, une requête bloquée par une règle de
sécurité du navigateur. Prends l’habitude de regarder la console **et** le panneau
Réseau dès qu’une page se comporte mal : la console te dit souvent *quoi*, le panneau
Réseau te dit *comment* et *quand*.

## Pièges et idées reçues

**« Le panneau Réseau est vide. »** Il n’enregistre que lorsqu’il est ouvert : recharge
la page après l’avoir ouvert.

**« Mes modifications CSS dans l’inspecteur ont disparu. »** Les outils de développement
modifient la copie locale de la page ; un rechargement repart du serveur. Recopie tes
modifications dans tes fichiers.

**« J’ai corrigé mon CSS mais rien ne change. »** Le navigateur utilise peut-être une
copie en cache. Coche **Désactiver le cache** pendant que tu développes, et vérifie dans
le panneau Réseau que le fichier est bien retéléchargé.

**« La redirection n’apparaît pas. »** Sans **Conserver le journal**, la liste est vidée
au changement de page et tu ne vois que la dernière requête.

**« Une ligne rouge, c’est forcément un bug de mon code. »** Une requête en échec peut
venir d’une extension du navigateur (bloqueur de publicité), d’un service tiers en
panne, ou d’une ressource optionnelle. Lis le statut et l’initiateur avant de conclure.

## Exercices

### Exercice 1 : radiographie d’une page

Ouvre `https://developer.mozilla.org/fr/` avec le panneau Réseau, cache désactivé, puis
réponds :

1. Combien de requêtes la page déclenche-t-elle au total ? Quel volume est transféré ?
2. Quelle est la toute première requête, son type et son statut ?
3. Trouve une feuille de style : quel est son `content-type` ? Qui est son initiateur ?
4. Quelle est l’adresse distante (IP et port) du document principal ?
5. Recharge la page **sans** désactiver le cache. Que remarques-tu ?

:::solution
Les chiffres exacts varient avec le temps et le navigateur ; c’est la démarche qui compte.

1. Le nombre et le volume se lisent dans la barre de résumé en bas du panneau. Une page
   comme celle-ci déclenche généralement plusieurs dizaines de requêtes.
2. La première requête est le **document HTML** (type « document »), en `GET`, avec le
   statut `200`. C’est logique : sans le HTML, le navigateur ne connaît pas les autres
   ressources.
3. Dans les en-têtes de réponse, `content-type: text/css` (parfois suivi d’un
   `charset`). L’initiateur est le document HTML, qui contient l’élément `link`, ou un
   autre fichier CSS qui l’importe.
4. L’adresse distante figure dans le résumé des en-têtes. Le port est `443`, puisque l’URL
   est en `https` sans port explicite. L’adresse IP est celle que le DNS a renvoyée ;
   tu peux la comparer avec le résultat de `nslookup developer.mozilla.org`.
5. Beaucoup de ressources ne sont pas retéléchargées : elles sont servies depuis le cache
   du navigateur, ou validées par le serveur avec un `304`. Le volume transféré baisse
   nettement, et la page se charge plus vite.

:::

### Exercice 2 : la page qui ne charge pas

Une amie t’envoie trois captures du panneau Réseau. Pour chacune, explique ce qui se
passe et ce que tu lui conseilles.

1. Le document principal est en `200`, mais `style.css` est en `404`. La page s’affiche
   sans mise en forme.
2. Le document principal n’a pas de code de statut ; l’erreur indiquée est
   `net::ERR_NAME_NOT_RESOLVED`.
3. Le document principal est en `500`.

:::solution
1. Le serveur fonctionne et la page HTML est bien arrivée, mais la feuille de style est
   introuvable au chemin demandé. Conseil : vérifier dans le HTML l’attribut `href` de
   l’élément `link` (faute de frappe, chemin relatif mal résolu, majuscules) et l’URL
   complète de la requête dans le panneau Réseau.
2. Le nom de domaine n’a pas pu être résolu par le DNS : aucun serveur n’a été contacté.
   Conseil : vérifier l’orthographe du domaine, puis tester avec `nslookup`. Si le nom
   est correct, le domaine a peut-être expiré ou sa configuration DNS est cassée.
3. Le serveur a répondu, mais il a rencontré une erreur interne en traitant la requête.
   Le problème est côté serveur : l’utilisatrice n’y peut rien, à part réessayer plus
   tard ou prévenir les responsables du site. Si c’est son propre serveur, il faut lire
   ses journaux d’erreurs.

:::

### Exercice 3 : rejouer le trajet complet

Ouvre le panneau Réseau sur une page de ton choix, clique sur le document principal et
utilise l’onglet **Délais** pour retrouver, dans l’ordre, les étapes vues dans cette
compétence. Associe chaque segment de la durée à une notion du cours.

:::solution
Selon le navigateur, l’onglet affiche des segments de ce type (certains peuvent être
absents ou nuls si une connexion était déjà ouverte ou si le DNS était en cache) :

- **mise en file d’attente** : le navigateur attend de pouvoir envoyer la requête ;
- **résolution DNS** : traduction du nom de domaine en adresse IP (leçon 2) ;
- **connexion initiale** : ouverture de la connexion vers l’adresse IP et le port (leçon 2) ;
- **TLS** ou **SSL** : vérification du certificat et mise en place du chiffrement (leçon 3) ;
- **requête envoyée** puis **attente de la réponse du serveur** : le serveur reçoit la
  requête HTTP et prépare sa réponse (leçon 3) ;
- **téléchargement du contenu** : réception du corps de la réponse, ensuite analysé par
  le navigateur pour construire la page (leçon 4).

Si tu recharges la page, la résolution DNS et la connexion disparaissent souvent : le
navigateur réutilise son cache DNS et une connexion déjà ouverte.

:::

## Récapitulatif

- Les **outils de développement** s’ouvrent avec `F12`, `Ctrl`+`Maj`+`I` ou
  `Cmd`+`Option`+`I` ; leurs modifications sont temporaires et locales.
- **Éléments / Inspecteur** montre le DOM et les styles, **Console** les messages et
  erreurs, **Réseau** toutes les requêtes HTTP.
- Le panneau Réseau n’enregistre que lorsqu’il est ouvert : ouvre-le, puis recharge.
- Chaque ligne donne la ressource, le **statut**, le **type**, l’**initiateur**, la
  **taille** et la **durée** ; un clic ouvre les en-têtes, le corps et les délais.
- **Désactiver le cache** simule une première visite ; **Conserver le journal** garde
  les requêtes d’une page à l’autre, indispensable pour voir une redirection.
- **Pas de code de statut** : l’échange HTTP n’a pas eu lieu (DNS, connexion). **Un code
  d’erreur** : le serveur a répondu.
- Les en-têtes et les commandes copiées contiennent tes cookies : ne les partage pas.
