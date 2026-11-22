---
title: Internet, le web, les clients et les serveurs
summary: Distinguer le réseau mondial, le service qu’est le web et les rôles de client, de serveur et de navigateur.
durationMinutes: 35
sources:
  - title: MDN — Comment fonctionne le Web
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works
  - title: MDN — Un aperçu de HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Overview
---

Tu utilises le web tous les jours : tu tapes une adresse, une page s’affiche. Pour en
faire ton métier, tu dois savoir **qui parle à qui**, et avec quels mots. Quand une page
ne s’affiche pas, est-ce la faute de ta connexion, du site, de ton navigateur ou de ton
code ? Sans un modèle mental clair, tu ne peux que deviner.

Cette leçon pose le vocabulaire de base que toutes les suivantes utilisent : internet,
le web, un client, un serveur, un navigateur. Ces mots sont souvent employés comme
synonymes dans la vie courante. Ils ne le sont pas, et un développeur doit les distinguer.

## Internet : un réseau de réseaux

Imagine des millions d’ordinateurs, de téléphones, de serveurs et d’objets connectés.
Chacun appartient à un petit réseau : le Wi-Fi de ta maison, le réseau d’une entreprise,
le réseau d’un opérateur mobile. **Internet** est l’interconnexion de tous ces réseaux :
des équipements appelés **routeurs** font passer les données d’un réseau à l’autre
jusqu’à leur destination.

Concrètement, quand ton ordinateur envoie des données à un autre ordinateur :

1. Les données sont découpées en petits morceaux appelés **paquets**.
2. Chaque paquet porte l’adresse de son destinataire (une **adresse IP**, vue dans la
   leçon suivante).
3. Ta box ou ton téléphone transmet les paquets au réseau de ton fournisseur d’accès
   à internet (FAI).
4. De routeur en routeur, chaque paquet progresse vers sa destination. Deux paquets
   d’un même envoi peuvent même prendre des chemins différents.
5. L’ordinateur destinataire reçoit les paquets et reconstitue les données d’origine.

Pour que des machines de constructeurs différents se comprennent, elles suivent des
**protocoles** : des règles de communication écrites et publiques. Les deux protocoles
fondamentaux d’internet sont **IP** (Internet Protocol), qui achemine les paquets d’une
adresse à une autre, et **TCP** (Transmission Control Protocol), qui garantit que les
données arrivent complètes et dans l’ordre, en redemandant les paquets perdus.

:::note[Une analogie, avec ses limites]
On compare souvent internet à la poste : chaque paquet est une lettre avec une adresse,
les routeurs sont les centres de tri. L’analogie aide à démarrer, mais elle a des limites :
un paquet voyage en quelques millisecondes, et TCP vérifie que rien ne manque, ce que
la poste ne fait pas pour toi.

:::

Internet n’est donc qu’un **moyen de transport**. Il ne sait pas ce que contiennent les
paquets : une page web, un courriel, un appel vidéo ou une partie de jeu en ligne.

## Le web : un service parmi d’autres sur internet

Le **web** (World Wide Web) est un **service** qui utilise internet. Il repose sur trois
idées :

- des **ressources** (pages, images, feuilles de style, vidéos, données…) ;
- une **adresse unique** pour chaque ressource, l’**URL** (par exemple
  `https://developer.mozilla.org/fr/`) ;
- un **protocole** pour demander et recevoir ces ressources, **HTTP** (HyperText
  Transfer Protocol), et sa version sécurisée HTTPS.

Les pages web sont écrites en **HTML** et contiennent des **liens hypertextes** vers
d’autres ressources : c’est cette toile de liens qui a donné son nom au web (_web_
signifie « toile » en anglais). Le web a été proposé par Tim Berners-Lee au CERN à la
fin des années 1980.

D’autres services utilisent internet sans être le web :

| Service               | Protocoles principaux | Exemple d’usage                             |
| --------------------- | --------------------- | ------------------------------------------- |
| Web                   | HTTP, HTTPS           | Consulter un site, appeler une API          |
| Courrier électronique | SMTP, IMAP, POP3      | Envoyer et relever ses courriels            |
| Accès à distance      | SSH                   | Administrer un serveur en ligne de commande |
| Résolution de noms    | DNS                   | Traduire un nom de domaine en adresse IP    |

Quand tu lis tes courriels dans une application de messagerie, tu utilises internet
mais pas forcément le web. Quand tu les lis dans un webmail, dans ton navigateur, tu
utilises le web, qui lui-même échange avec des serveurs de courrier.

:::warning[Confusion courante]
« Internet ne marche pas » et « ce site ne marche pas » sont deux diagnostics différents.
Si tes autres sites et applications fonctionnent, internet n’est pas en cause : le
problème vient plutôt du site, de son nom de domaine ou de ton navigateur.

:::

## Clients et serveurs : deux rôles

Sur le web, les échanges suivent le modèle **client-serveur** :

- le **client** prend l’initiative : il envoie une **requête** pour demander quelque chose ;
- le **serveur** attend les requêtes, les traite et renvoie une **réponse**.

Une conversation web ressemble toujours à ceci :

```text
Client                                   Serveur
  |                                         |
  |  requête : « donne-moi /index.html »    |
  | --------------------------------------> |
  |                                         |  cherche le fichier,
  |                                         |  ou le fabrique
  |  réponse : « voici le contenu »         |
  | <-------------------------------------- |
  |                                         |
```

Retiens trois points essentiels.

**Le client parle en premier.** Un serveur web ne t’envoie pas une page de lui-même : il
répond à une requête. Même une page qui semble se mettre à jour toute seule le fait
parce que du code dans ton navigateur envoie des requêtes régulièrement, ou garde une
connexion ouverte pour cela.

**Client et serveur sont des rôles, pas des machines.** Le mot « serveur » désigne à la
fois un **programme** qui répond à des requêtes et, par extension, la **machine** qui
fait tourner ce programme. Pendant ce parcours, ton propre ordinateur jouera les deux
rôles : ton navigateur sera le client, et un programme Node.js que tu auras écrit sera le
serveur. Un serveur peut aussi devenir client : quand ton serveur interroge une base de
données ou une autre API, c’est lui qui envoie la requête.

**Un serveur sert de nombreux clients.** Des milliers de personnes peuvent consulter le
même site en même temps. Le serveur traite chaque requête indépendamment.

### Pages statiques et pages dynamiques

Un serveur peut répondre de deux façons :

- en renvoyant un **fichier existant**, toujours identique : on parle de contenu
  **statique** (une image, une feuille de style, une page HTML écrite à la main) ;
- en **fabriquant la réponse** au moment de la requête, à partir d’un programme et souvent
  d’une base de données : on parle de contenu **dynamique** (ta page de profil, les
  résultats d’une recherche, ton panier).

Pour le client, la différence est invisible : dans les deux cas, il reçoit une réponse
HTTP. C’est ce qui rend le web si souple.

### Les API : des serveurs qui parlent aux programmes

Tous les serveurs web ne renvoient pas des pages à afficher. Une **API** web
(Application Programming Interface) renvoie des **données** destinées à un programme,
le plus souvent au format JSON. Par exemple, une application météo sur ton téléphone
envoie une requête HTTP à l’API d’un service météo et reçoit en réponse un texte comme :

```json
{ "city": "Lyon", "temperature": 18.5, "unit": "celsius" }
```

L’application affiche ensuite ces données à sa façon. Tu construiras ce genre d’API plus
loin dans le parcours.

## Le navigateur : un client HTTP qui sait afficher

Le **navigateur** (Firefox, Chrome, Safari, Edge…) est le client web que tout le monde
connaît. Il cumule plusieurs métiers :

1. **Comprendre ce que tu demandes** : lire l’URL saisie ou le lien cliqué.
2. **Envoyer les requêtes HTTP** et recevoir les réponses.
3. **Construire la page** à partir du HTML, du CSS et du JavaScript reçus (c’est le rôle
   de son _moteur de rendu_, vu dans la quatrième leçon).
4. **Exécuter le JavaScript** de la page.
5. **Protéger l’utilisateur** : isoler les sites les uns des autres, avertir quand une
   connexion n’est pas sécurisée.
6. **Offrir des outils de développement** pour observer tout cela (cinquième leçon).

D’autres programmes sont des clients HTTP sans rien afficher : l’outil en ligne de
commande `curl`, une application mobile, un robot d’indexation de moteur de recherche,
ou un programme Node.js qui appelle une API.

:::tip
Quand un nouveau terme te résiste, demande à une IA de te le reformuler avec une autre
analogie, puis vérifie que tu sais l’expliquer toi-même en deux phrases, sans regarder.

:::

## Ce qui se passe quand tu tapes une adresse

Voici, en version simplifiée, le trajet complet quand tu tapes
`https://www.example.com/contact` dans la barre d’adresse. Chaque étape sera détaillée
dans les leçons suivantes.

1. **Le navigateur analyse l’URL** : protocole `https`, nom de domaine
   `www.example.com`, chemin `/contact`.
2. **Il trouve l’adresse IP du serveur** grâce au **DNS**, l’annuaire d’internet qui
   traduit un nom de domaine en adresse IP.
3. **Il ouvre une connexion** avec ce serveur, puis la **sécurise** parce que l’URL
   commence par `https`.
4. **Il envoie une requête HTTP** : « donne-moi `/contact` ».
5. **Le serveur répond** avec un code de statut (par exemple `200`, « tout va bien ») et
   le contenu HTML de la page.
6. **Le navigateur lit le HTML** et découvre qu’il a besoin d’autres ressources : une
   feuille de style, des images, des scripts. Il envoie une requête pour chacune.
7. **Il construit et affiche la page**, puis exécute le JavaScript.

Une seule page peut ainsi déclencher des dizaines de requêtes. Tu les verras de tes
propres yeux avec les outils de développement.

### Exemple : décrire une situation avec le bon vocabulaire

Situation : Léa ouvre l’application de sa banque sur son téléphone, en 4G, et consulte
son solde.

Description précise :

```text
Transport  : le réseau mobile de l’opérateur, relié à internet.
Client     : l’application bancaire sur le téléphone (pas un navigateur).
Serveur    : le serveur de l’API de la banque.
Protocole  : HTTPS, car des données personnelles circulent.
Échange    : l’application envoie une requête « donne-moi le solde du compte » ;
             le serveur renvoie des données (probablement en JSON),
             que l’application affiche à sa façon.
Web ?      : l’application utilise les protocoles du web (HTTP) sans être une page web.
```

Ce découpage, tu dois savoir le faire pour n’importe quelle situation : c’est le point de
départ de tout diagnostic.

## Pièges et idées reçues

**« Internet et le web, c’est pareil. »** Non. Internet est le réseau qui transporte des
paquets ; le web est un service qui l’utilise, avec HTTP, les URL et HTML. Le courriel ou
SSH utilisent internet sans être le web.

**« Le serveur, c’est forcément une grosse machine dans un centre de données. »** Un
serveur est d’abord un programme qui répond à des requêtes. Il peut tourner sur ton
portable : c’est ce que tu feras en développement, avec une adresse comme
`http://localhost:3000`.

**« Le site m’envoie des notifications, donc le serveur parle en premier. »** En HTTP,
c’est toujours le client qui envoie la requête. Les mécanismes qui donnent une impression
de temps réel s’appuient sur des connexions ouvertes **par le client** au préalable.

**« Le navigateur, c’est le web. »** Le navigateur n’est qu’un client parmi d’autres.
`curl`, une application mobile ou un programme Node.js peuvent envoyer exactement les
mêmes requêtes HTTP.

**« Le moteur de recherche, c’est internet. »** Taper un nom de site dans un moteur de
recherche puis cliquer sur un résultat n’est pas la même chose que taper une URL : dans
le premier cas, tu passes d’abord par un autre serveur, celui du moteur de recherche.

## Exercices

### Exercice 1 : internet ou web ?

Pour chaque activité, indique si elle utilise internet, et si elle utilise le web
(HTTP ou HTTPS). Justifie en une phrase.

1. Lire une page de Wikipédia dans Firefox.
2. Envoyer un courriel depuis une application de messagerie installée sur l’ordinateur,
   configurée en IMAP et SMTP.
3. Copier un fichier d’une clé USB vers ton disque dur.
4. Administrer un serveur distant avec la commande `ssh`.
5. Une application de transport qui affiche les horaires en appelant une API.

:::solution

1. **Internet et web.** Le navigateur envoie des requêtes HTTPS aux serveurs de
   Wikipédia et affiche le HTML reçu.
2. **Internet, mais pas le web.** Les protocoles utilisés sont SMTP (envoi) et IMAP
   (consultation), pas HTTP. Le même courriel lu dans un webmail passerait, lui, par le
   web.
3. **Ni l’un ni l’autre.** La copie se fait localement, sans réseau.
4. **Internet, mais pas le web.** SSH est un autre protocole, qui sert à ouvrir un terminal
   à distance.
5. **Internet et web**, sans navigateur. L’application est un client HTTP : elle appelle
   une API web et affiche les données à sa façon. Le web ne se limite pas aux pages
   affichées dans un navigateur.

:::

### Exercice 2 : qui est client, qui est serveur ?

Dans chaque scénario, identifie le ou les clients et le ou les serveurs. Attention, un
même programme peut jouer les deux rôles.

1. Tu ouvres `http://localhost:3000` dans ton navigateur ; un programme Node.js qui tourne
   sur ton ordinateur renvoie une page.
2. Ce même programme Node.js, pour fabriquer la page, interroge une base de données
   PostgreSQL.
3. Tu lances dans un terminal la commande `curl https://example.com`.
4. Un robot d’indexation parcourt les pages d’un site pour un moteur de recherche.

:::solution

1. **Client** : le navigateur. **Serveur** : le programme Node.js. Les deux tournent sur
   la même machine, ce qui montre bien que client et serveur sont des rôles.
2. Le programme Node.js devient **client** de la base de données, qui joue le rôle de
   **serveur** (avec son propre protocole, pas HTTP). Le programme Node.js est donc à la
   fois serveur pour le navigateur et client pour la base.
3. **Client** : `curl`, un client HTTP en ligne de commande qui affiche le HTML brut au
   lieu de l’afficher comme une page. **Serveur** : le serveur web de `example.com`.
4. **Client** : le robot, qui envoie des requêtes HTTP comme un navigateur mais sans
   afficher de page. **Serveur** : le serveur web du site parcouru.

:::

### Exercice 3 : raconter le trajet

Sans regarder la leçon, écris les étapes qui se produisent entre le moment où tu tapes
`https://www.example.com/contact` et l’affichage de la page. Utilise au moins les mots :
URL, DNS, adresse IP, requête, réponse, HTML, ressources.

:::solution
Une réponse correcte ressemble à ceci :

1. Le navigateur analyse l’**URL** : protocole `https`, domaine `www.example.com`, chemin
   `/contact`.
2. Il interroge le **DNS** pour obtenir l’**adresse IP** du serveur.
3. Il ouvre une connexion avec le serveur et la sécurise (HTTPS).
4. Il envoie une **requête** HTTP demandant `/contact`.
5. Le serveur renvoie une **réponse** avec un code de statut et le **HTML** de la page.
6. Le navigateur lit le HTML et envoie de nouvelles requêtes pour les **ressources**
   référencées : CSS, images, scripts.
7. Il construit la page, l’affiche et exécute le JavaScript.

L’ordre compte : sans adresse IP, pas de connexion ; sans HTML, le navigateur ne sait pas
quelles autres ressources demander.

:::

## Récapitulatif

- **Internet** est un réseau de réseaux qui transporte des paquets de données d’une
  adresse IP à une autre, grâce aux routeurs et aux protocoles IP et TCP.
- Le **web** est un service qui utilise internet : des ressources identifiées par des
  **URL**, échangées avec le protocole **HTTP** (ou HTTPS), et des pages HTML reliées par
  des liens.
- D’autres services (courriel, SSH, DNS) utilisent internet sans être le web.
- Sur le web, le **client** envoie une **requête**, le **serveur** renvoie une
  **réponse**. Le client parle toujours en premier.
- Client et serveur sont des **rôles** : un même programme peut être serveur pour l’un
  et client pour l’autre, et ton ordinateur peut jouer les deux.
- Le **navigateur** est un client HTTP qui sait aussi construire et afficher les pages ;
  `curl`, les applications mobiles et les programmes sont d’autres clients.
- Afficher une page déclenche une suite d’étapes : URL, DNS, connexion, requête,
  réponse, puis requêtes supplémentaires pour chaque ressource.
