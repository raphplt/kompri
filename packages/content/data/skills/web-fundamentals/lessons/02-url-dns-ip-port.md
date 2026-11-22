---
title: URL, DNS, adresses IP et ports
summary: Décomposer une adresse web et comprendre comment le navigateur trouve le bon programme sur la bonne machine.
durationMinutes: 45
sources:
  - title: MDN — Qu’est-ce qu’une URL ?
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL
  - title: MDN — Qu’est-ce qu’un nom de domaine ?
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_domain_name
  - title: WHATWG — URL Standard
    url: https://url.spec.whatwg.org/
  - title: RFC 5737 — Plages d’adresses IPv4 réservées à la documentation
    url: https://www.rfc-editor.org/rfc/rfc5737.html
---

Une URL comme `https://www.example.com:8443/boutique/produits?categorie=livres#avis`
contient beaucoup d’informations : avec quel protocole parler, à quelle machine, sur quelle
« porte » de cette machine, et quelle ressource demander. Savoir la lire, c’est savoir où
chercher quand quelque chose ne va pas : mauvais domaine, mauvais port, chemin incorrect,
paramètre mal encodé.

Cette leçon répond à trois questions : comment est construite une URL, comment le
navigateur transforme un nom comme `www.example.com` en adresse de machine, et pourquoi
on a besoin d’un numéro de port en plus de cette adresse.

## Anatomie d’une URL

Une **URL** (Uniform Resource Locator) indique où se trouve une ressource et comment
l’obtenir. Prenons cet exemple complet :

```text
https://www.example.com:8443/boutique/produits?categorie=livres&page=2#avis
└─┬─┘   └──────┬──────┘ └┬─┘└───────┬───────┘ └──────────┬─────────┘ └┬─┘
schéma        hôte     port       chemin             requête       fragment
```

| Partie                   | Dans l’exemple             | Rôle                                                         |
| ------------------------ | -------------------------- | ------------------------------------------------------------ |
| Schéma                   | `https`                    | Le protocole à utiliser (`http`, `https`, `mailto`, `file`…) |
| Hôte                     | `www.example.com`          | La machine à contacter : un nom de domaine ou une adresse IP |
| Port                     | `8443`                     | Le numéro du programme à joindre sur cette machine           |
| Chemin                   | `/boutique/produits`       | La ressource demandée sur le serveur                         |
| Requête (_query string_) | `?categorie=livres&page=2` | Des paramètres sous forme `nom=valeur`, séparés par `&`      |
| Fragment                 | `#avis`                    | Un emplacement dans la page, géré par le navigateur seul     |

Quelques règles à connaître :

- Le schéma est suivi de `://` pour les URL web.
- Le port est **facultatif**. S’il est absent, le navigateur utilise le port par défaut du
  schéma : **80 pour `http`**, **443 pour `https`**.
- Le chemin ressemble à un chemin de fichier, mais c’est le serveur qui décide comment
  l’interpréter. `/boutique/produits` ne correspond pas forcément à un dossier.
- Le **fragment n’est jamais envoyé au serveur**. Le navigateur l’utilise pour faire
  défiler la page jusqu’à l’élément correspondant, ou le laisse au JavaScript de la page.

### Décomposer une URL avec la console du navigateur

Tu n’as pas besoin de savoir programmer pour essayer. Ouvre n’importe quelle page dans ton
navigateur, puis la **console** des outils de développement : touche `F12`, ou
`Ctrl`+`Maj`+`J` sous Chrome et Edge, `Ctrl`+`Maj`+`K` sous Firefox, `Cmd`+`Option`+`J`
sous Chrome sur macOS. Colle les lignes suivantes et valide avec Entrée :

```js
const url = new URL(
  'https://www.example.com:8443/boutique/produits?categorie=livres&page=2#avis',
);
console.log(url.protocol);
console.log(url.hostname);
console.log(url.port);
console.log(url.pathname);
console.log(url.search);
console.log(url.searchParams.get('categorie'));
console.log(url.hash);
```

La console affiche :

```text
https:
www.example.com
8443
/boutique/produits
?categorie=livres&page=2
livres
#avis
```

`new URL(...)` demande au navigateur d’analyser l’adresse selon la norme URL du WHATWG,
celle que suivent tous les navigateurs. Chaque ligne affiche une partie. La console ajoute
souvent une ligne `undefined` à la fin : c’est simplement la valeur de la dernière
instruction, tu peux l’ignorer.

:::note
Si la console refuse de coller du code, elle affiche un avertissement qui te demande de
taper une phrase de confirmation : tape exactement celle qui est indiquée dans le
message, puis colle à nouveau. C’est une protection : des
escrocs demandent parfois à leurs victimes de coller du code dans la console. Ne colle
jamais de code dont tu ne comprends pas l’origine.
:::

### Le port par défaut n’apparaît pas

Essaie maintenant :

```js
console.log(new URL('https://www.example.com/').port === '');
console.log(new URL('HTTPS://WWW.Example.COM:443/Page').href);
```

Résultat :

```text
true
https://www.example.com/Page
```

La première ligne montre que, sans port écrit, la propriété `port` est vide : le port
443 est implicite. La seconde montre deux choses. Le schéma et le nom de domaine ne sont
**pas sensibles à la casse** : le navigateur les met en minuscules. Le port `:443`, qui
est celui par défaut de `https`, disparaît. En revanche le chemin `/Page` garde sa
majuscule : selon le serveur, `/Page` et `/page` peuvent être deux ressources différentes.

### Caractères spéciaux et encodage

Une URL ne peut contenir qu’un jeu limité de caractères. Les espaces, les lettres
accentuées et certains symboles sont **encodés en pourcentage** (_percent-encoding_) :
chaque octet est écrit `%` suivi de deux chiffres hexadécimaux.

```js
console.log(new URL('https://fr.wikipedia.org/wiki/Café').pathname);
console.log(new URL('https://example.com/recherche?q=pain au chocolat').search);
```

```text
/wiki/Caf%C3%A9
?q=pain%20au%20chocolat
```

Le « é » devient `%C3%A9` (ses deux octets en UTF-8) et l’espace devient `%20`. Ton
navigateur affiche souvent la version lisible dans la barre d’adresse, mais c’est la
version encodée qui circule réellement.

### URL absolues et relatives

Dans une page HTML, les liens sont souvent **relatifs** : ils sont résolus à partir de
l’URL de la page courante. Si la page est `https://example.com/blog/articles/web.html` :

```js
const base = 'https://example.com/blog/articles/web.html';
console.log(new URL('../images/logo.png', base).href);
console.log(new URL('/contact', base).href);
console.log(new URL('photo.jpg', base).href);
```

```text
https://example.com/blog/images/logo.png
https://example.com/contact
https://example.com/blog/articles/photo.jpg
```

- `photo.jpg` se résout dans le même « dossier » que la page.
- `../` remonte d’un niveau.
- Un chemin qui commence par `/` part de la **racine** du site.

## Noms de domaine

Les machines communiquent avec des adresses numériques, mais les humains retiennent
mieux des noms. Un **nom de domaine** comme `developer.mozilla.org` se lit **de droite
à gauche**, du plus général au plus précis :

- `org` est le **domaine de premier niveau** (TLD, _top-level domain_), comme `fr`, `com`
  ou `net` ;
- `mozilla.org` est le domaine enregistré par l’organisation ;
- `developer` est un **sous-domaine**, que le propriétaire de `mozilla.org` crée
  librement.

Un nom de domaine s’achète auprès d’un **bureau d’enregistrement** (_registrar_), pour
une durée limitée et renouvelable. Chaque TLD est géré par un organisme ; pour `.fr`,
c’est l’AFNIC.

:::warning[Lire le vrai domaine]
Dans `https://votre-banque.fr.connexion-securisee.example/`, le domaine enregistré est
`connexion-securisee.example`, pas `votre-banque.fr` : tout ce qui est à gauche n’est
qu’un sous-domaine choisi par le propriétaire. Les sites d’hameçonnage exploitent cette
confusion. Lis toujours le domaine en partant de la droite.
:::

## Adresses IP

Une **adresse IP** identifie une machine (plus précisément une interface réseau) sur un
réseau IP. Il en existe deux versions en usage :

- **IPv4** : quatre nombres de 0 à 255 séparés par des points, par exemple
  `203.0.113.42`. Il y a environ 4,3 milliards d’adresses IPv4 possibles (2 puissance 32),
  ce qui ne suffit plus pour tous les appareils connectés.
- **IPv6** : huit groupes de chiffres hexadécimaux séparés par `:`, par exemple
  `2001:db8::42` (les groupes de zéros consécutifs peuvent être abrégés en `::`). Elles
  sont codées sur 128 bits, ce qui en offre un nombre gigantesque.

:::note
Les adresses `203.0.113.x` et `2001:db8::` utilisées dans ce cours sont réservées à la
documentation : elles n’appartiennent à aucune machine réelle.
:::

Quelques adresses particulières :

| Adresse                                                | Signification                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `127.0.0.1` et `::1`                                   | **Ta propre machine** (boucle locale). Le nom `localhost` y correspond |
| `192.168.x.x`, `10.x.x.x`, `172.16.x.x` à `172.31.x.x` | Adresses **privées**, utilisées à l’intérieur d’un réseau local        |

Ton ordinateur a probablement une adresse privée comme `192.168.1.23` dans ton réseau
domestique. Vu d’internet, tous les appareils de la maison partagent l’adresse publique
de ta box. Quand tu développes, ton serveur est joignable à `http://localhost:3000`,
c’est-à-dire sur ta propre machine : personne d’autre n’y accède.

## Le DNS : l’annuaire d’internet

Le **DNS** (Domain Name System) traduit un nom de domaine en adresse IP. C’est un système
**distribué** : aucune machine ne connaît tous les noms, mais chacune sait à qui demander.

Quand ton navigateur a besoin de l’adresse de `www.example.com` :

1. Il regarde dans son **cache** : l’a-t-il déjà résolu récemment ?
2. Sinon, il demande au **système d’exploitation**, qui a aussi un cache et consulte un
   petit fichier local (`/etc/hosts` sous Linux et macOS).
3. Sinon, le système interroge un **résolveur DNS** : souvent celui de ton FAI, ou un
   résolveur public configuré sur ta machine ou ta box.
4. Le résolveur, s’il ne connaît pas la réponse, remonte la hiérarchie : il demande aux
   **serveurs racine** qui gère `com`, puis aux serveurs de `com` qui gère `example.com`,
   puis au **serveur faisant autorité** pour `example.com`, qui donne enfin l’adresse.
5. La réponse redescend, et chaque niveau la **garde en cache** pendant une durée fixée
   par le propriétaire du domaine (le **TTL**, _time to live_).

Le DNS stocke différents types d’**enregistrements** :

| Type    | Contenu                                                         |
| ------- | --------------------------------------------------------------- |
| `A`     | Une adresse IPv4                                                |
| `AAAA`  | Une adresse IPv6                                                |
| `CNAME` | Un alias : « ce nom est un autre nom pour… »                    |
| `MX`    | Les serveurs de courrier qui reçoivent les courriels du domaine |

### Observer une résolution DNS

L’outil `nslookup` existe sous Linux, macOS et Windows. Dans un terminal :

```bash
nslookup example.com
```

Une sortie obtenue lors de la rédaction de ce cours :

```text
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	example.com
Address: 104.20.23.154
Name:	example.com
Address: 172.66.147.243
```

Ta sortie sera différente : le serveur DNS interrogé dépend de ta configuration, et les
adresses d’un site changent avec le temps. Lis-la ainsi :

- `Server` est le résolveur DNS interrogé, et `#53` le port du service DNS ;
- _Non-authoritative answer_ signifie que la réponse vient d’un cache, pas directement
  du serveur faisant autorité ;
- un même nom peut avoir **plusieurs adresses** : les grands sites répartissent la charge
  entre plusieurs machines.

Avec un nom qui passe par un alias, tu verras une ligne `canonical name`, qui correspond
à un enregistrement `CNAME`.

:::tip
Une erreur comme « Ce site est inaccessible » accompagnée de `DNS_PROBE_FINISHED_NXDOMAIN`
dans Chrome signifie que le nom de domaine n’a pas pu être résolu : faute de frappe,
domaine expiré ou problème de DNS. Le serveur n’a même pas été contacté.
:::

## Les ports : quel programme sur la machine ?

Une adresse IP désigne une machine, mais une machine fait tourner plusieurs programmes
qui communiquent sur le réseau : un serveur web, une base de données, un serveur SSH…
Le **port** est un numéro, de 0 à 65535, qui désigne le programme destinataire. Si
l’adresse IP est l’adresse d’un immeuble, le port est le numéro de l’appartement.

Un programme serveur **écoute** sur un port : il attend les connexions qui arrivent à ce
numéro. Certains ports sont associés par convention à un service :

| Port           | Usage courant                                             |
| -------------- | --------------------------------------------------------- |
| `22`           | SSH                                                       |
| `53`           | DNS                                                       |
| `80`           | HTTP                                                      |
| `443`          | HTTPS                                                     |
| `5432`         | PostgreSQL (valeur par défaut)                            |
| `3000`, `8080` | Serveurs de développement (simple habitude, aucune norme) |

Le client, lui, utilise aussi un port, choisi automatiquement par le système (un port
« éphémère »). Une connexion est donc identifiée par quatre éléments : adresse et port du
client, adresse et port du serveur.

Conséquences pratiques :

- `http://localhost:3000` et `http://localhost:4000` désignent deux programmes différents
  sur ta machine.
- Si tu lances deux serveurs sur le même port, le second échoue : le port est déjà
  utilisé. Avec Node.js, l’erreur s’appelle `EADDRINUSE`.
- Si aucun programme n’écoute sur le port demandé, la connexion est refusée : le
  navigateur affiche une erreur du type « connexion refusée » (`ERR_CONNECTION_REFUSED`
  dans Chrome).

## Pièges et idées reçues

**« Le fragment `#section` est envoyé au serveur. »** Non : le navigateur le garde pour
lui. Deux URL qui ne diffèrent que par leur fragment provoquent la même requête.

**« `https://example.com` et `https://example.com:443` sont deux sites. »** Non : 443 est
le port par défaut de HTTPS, ce sont exactement les mêmes. En revanche
`http://example.com` (port 80) est un autre point d’accès.

**« Les URL ne tiennent pas compte de la casse. »** Seuls le schéma et le nom de domaine
sont insensibles à la casse. Le chemin et les paramètres peuvent l’être, selon le serveur.

**« `localhost` est accessible par mes collègues. »** `localhost` désigne toujours la
machine **sur laquelle tourne le client**. Sur l’ordinateur d’un collègue, `localhost`
désigne son ordinateur à lui.

**« Si le site ne s’affiche pas, c’est le serveur qui est en panne. »** Distingue les
étapes : un échec DNS (nom introuvable), une connexion refusée (rien n’écoute sur ce
port), un délai dépassé (machine injoignable) et une erreur renvoyée par le serveur
(il a répondu, mais avec un code d’erreur) sont quatre problèmes différents.

## Exercices

### Exercice 1 : décomposer des URL

Pour chaque URL, donne le schéma, l’hôte, le port **effectivement utilisé**, le chemin,
la requête et le fragment (écris « aucun » si la partie est absente).

1. `http://localhost:3000/api/tasks?done=false`
2. `https://fr.wikipedia.org/wiki/Hypertext_Transfer_Protocol#Méthodes`
3. `https://shop.example.com/cart`

Vérifie ensuite tes réponses avec `new URL(...)` dans la console.

:::solution

1. Schéma `http`, hôte `localhost`, port `3000` (écrit dans l’URL), chemin `/api/tasks`,
   requête `?done=false`, fragment aucun. `localhost` désigne ta propre machine.
2. Schéma `https`, hôte `fr.wikipedia.org`, port `443` (implicite pour `https`), chemin
   `/wiki/Hypertext_Transfer_Protocol`, requête aucune, fragment `#Méthodes`. Dans la
   console, `url.hash` affiche `#M%C3%A9thodes` : le « é » est encodé en pourcentage.
3. Schéma `https`, hôte `shop.example.com`, port `443` implicite, chemin `/cart`, requête
   aucune, fragment aucun. `url.port` affiche une chaîne vide, car le port par défaut
   n’est pas écrit : c’est à toi de savoir qu’il vaut 443.

:::

### Exercice 2 : quelle requête part vraiment ?

Pour chaque paire d’URL, dis si le navigateur contacte le **même programme** (même hôte
et même port) et s’il demande la **même ressource** (même chemin et même requête).

1. `https://example.com/page#haut` et `https://example.com/page#bas`
2. `https://example.com/` et `https://EXAMPLE.com:443/`
3. `http://localhost:3000/` et `http://localhost:5173/`
4. `https://example.com/Docs` et `https://example.com/docs`

:::solution

1. **Même programme, même ressource.** Seul le fragment change, et il n’est pas envoyé au
   serveur. Le navigateur fait défiler la page jusqu’à un autre endroit.
2. **Même programme, même ressource.** Le nom de domaine est insensible à la casse et 443
   est le port par défaut de `https`.
3. **Deux programmes différents** sur la même machine : les ports diffèrent.
4. **Même programme**, mais **pas forcément la même ressource** : le chemin peut être
   sensible à la casse. Seul le serveur peut le dire.

:::

### Exercice 3 : diagnostiquer

Une collègue te décrit trois erreurs. Pour chacune, dis à quelle étape le problème se
situe (DNS, connexion, réponse du serveur) et ce que tu vérifierais en premier.

1. « Le navigateur dit qu’il ne trouve pas l’adresse IP du serveur de `www.exmaple.com`. »
2. « Sur `http://localhost:3000`, j’ai “connexion refusée”. »
3. « La page de `https://example.com/produits/42` s’affiche, mais elle dit “Page
   introuvable”. »

:::solution

1. **DNS.** Le nom n’a pas pu être résolu. Ici il y a une faute de frappe (`exmaple` au
   lieu de `example`). Vérifie l’orthographe, puis teste avec `nslookup`.
2. **Connexion.** La machine (la tienne) a répondu, mais aucun programme n’écoute sur le
   port 3000. Vérifie que le serveur de développement est bien lancé, et sur quel port.
3. **Réponse du serveur.** DNS et connexion ont fonctionné : le serveur a répondu, mais
   avec une page d’erreur (en HTTP, probablement le code 404, vu dans la leçon suivante).
   Vérifie le chemin `/produits/42` : la ressource existe-t-elle ?

:::

## Récapitulatif

- Une URL se compose d’un **schéma**, d’un **hôte**, d’un **port** facultatif, d’un
  **chemin**, d’une **requête** facultative et d’un **fragment** facultatif.
- Sans port explicite : **80** pour `http`, **443** pour `https`.
- Le **fragment** reste dans le navigateur ; il n’est jamais envoyé au serveur.
- Schéma et domaine sont insensibles à la casse ; le chemin peut ne pas l’être.
- Les caractères spéciaux sont **encodés en pourcentage** (`%20` pour une espace).
- Un **nom de domaine** se lit de droite à gauche : TLD, domaine enregistré,
  sous-domaines.
- Une **adresse IP** (IPv4 ou IPv6) identifie une machine ; `127.0.0.1`, `::1` et
  `localhost` désignent ta propre machine.
- Le **DNS** traduit un nom en adresse IP grâce à une hiérarchie de serveurs et à des
  caches ; `nslookup` permet de l’observer.
- Le **port** désigne le programme qui écoute sur la machine ; deux programmes ne
  peuvent pas écouter sur le même port.
