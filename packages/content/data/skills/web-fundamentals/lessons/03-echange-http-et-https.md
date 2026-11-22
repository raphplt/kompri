---
title: Un échange HTTP et le rôle de HTTPS
summary: Lire une requête et une réponse HTTP simples, et comprendre ce que HTTPS protège et ne protège pas.
durationMinutes: 40
sources:
  - title: MDN — Un aperçu de HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Overview
  - title: MDN — HTTPS (glossaire)
    url: https://developer.mozilla.org/fr/docs/Glossary/HTTPS
  - title: RFC 9110 — HTTP Semantics
    url: https://www.rfc-editor.org/rfc/rfc9110.html
---

Tu sais maintenant que le navigateur trouve l’adresse du serveur grâce au DNS, puis ouvre
une connexion sur le bon port. Reste à savoir **ce qu’ils se disent**. Ce dialogue suit
un protocole, **HTTP**, et le connaître te permet de comprendre une grande partie des
problèmes que tu rencontreras : page introuvable, redirection inattendue, erreur du
serveur, avertissement de sécurité.

Cette leçon présente un échange HTTP simple et explique pourquoi presque tout le web
utilise aujourd’hui **HTTPS**. La compétence « HTTP en détail » approfondira ensuite
chaque élément : méthodes, codes de statut, en-têtes, cookies.

## HTTP : un dialogue en deux temps

**HTTP** (HyperText Transfer Protocol) fonctionne toujours de la même façon :

1. le client envoie une **requête** ;
2. le serveur renvoie **une réponse** à cette requête.

Le dialogue est donc fait de paires requête-réponse. Avec HTTP/1.1, ces messages sont du
texte lisible, ce qui les rend faciles à étudier. Les versions plus récentes, HTTP/2 et
HTTP/3, transportent les mêmes informations sous une forme binaire plus efficace, mais le
**sens** des messages reste identique : les outils de développement te les montrent
d’ailleurs de la même façon, quelle que soit la version.

### La requête

Voici une requête que ton navigateur pourrait envoyer pour afficher
`https://www.example.com/contact` :

```http
GET /contact HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0
Accept: text/html
Accept-Language: fr-FR,fr;q=0.9
```

Lis-la ligne par ligne :

- **`GET /contact HTTP/1.1`** est la **ligne de requête**. Elle contient la **méthode**
  (`GET`, « donne-moi »), le **chemin** de la ressource (`/contact`, éventuellement suivi
  de la requête `?…`) et la version du protocole.
- Les lignes suivantes sont des **en-têtes** (_headers_), au format `Nom: valeur`. Ce
  sont des informations complémentaires :
  - `Host` indique le nom de domaine demandé. Il est obligatoire, car une même machine
    héberge souvent plusieurs sites ;
  - `User-Agent` décrit le logiciel client ;
  - `Accept` indique le type de contenu souhaité, ici du HTML ;
  - `Accept-Language` indique les langues préférées de l’utilisateur.
- Une **ligne vide** marque la fin des en-têtes.

Remarque que le **schéma**, le **port** et le **fragment** de l’URL n’apparaissent pas
dans la requête : le schéma et le port ont servi à ouvrir la connexion, et le fragment
reste dans le navigateur.

### La réponse

Le serveur répond par exemple :

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 118
Date: Mon, 16 Nov 2026 10:00:00 GMT

<!doctype html>
<html lang="fr">
  <head><title>Contact</title></head>
  <body><h1>Nous contacter</h1></body>
</html>
```

- **`HTTP/1.1 200 OK`** est la **ligne de statut** : la version, le **code de statut**
  (`200`) et un court texte explicatif (`OK`).
- Viennent ensuite les **en-têtes de réponse** : `Content-Type` dit au navigateur qu’il
  reçoit du HTML encodé en UTF-8, `Content-Length` donne la taille du corps en octets,
  `Date` la date de la réponse.
- Après une ligne vide vient le **corps** (_body_) : le contenu lui-même, ici une page
  HTML.

:::note
Le navigateur se fie à `Content-Type`, pas à l’extension du fichier, pour savoir quoi
faire du contenu. Une feuille de style servie avec `Content-Type: text/plain` peut être
refusée par le navigateur.
:::

### Les codes de statut

Le code de statut est un nombre à trois chiffres. Le **premier chiffre** donne la
famille :

| Famille | Signification                           | Exemples courants                                      |
| ------- | --------------------------------------- | ------------------------------------------------------ |
| `1xx`   | Information, échange en cours           | Rares dans ton quotidien                               |
| `2xx`   | Succès                                  | `200 OK`                                               |
| `3xx`   | Redirection : la ressource est ailleurs | `301 Moved Permanently`, `304 Not Modified`            |
| `4xx`   | Erreur **du client**                    | `404 Not Found`, `403 Forbidden`                       |
| `5xx`   | Erreur **du serveur**                   | `500 Internal Server Error`, `503 Service Unavailable` |

Retenir les familles suffit pour commencer : un `4xx` signifie que la requête pose
problème (ressource inexistante, accès refusé), un `5xx` que le serveur a échoué en
essayant de la traiter. La compétence « HTTP en détail » te fera choisir le bon code
parmi les plus utilisés.

Une **redirection** fonctionne ainsi : le serveur répond avec un code `3xx` et un en-tête
`Location` qui contient la nouvelle adresse. Le navigateur envoie alors automatiquement
une nouvelle requête vers cette adresse.

```http
HTTP/1.1 301 Moved Permanently
Location: https://www.example.com/contact
Content-Length: 0
```

### GET et POST, les deux méthodes que tu croiseras d’abord

- **`GET`** demande une ressource. C’est la méthode utilisée quand tu tapes une URL,
  quand tu cliques sur un lien, et quand le navigateur charge une image ou une feuille de
  style. Une requête `GET` n’a pas de corps.
- **`POST`** envoie des données au serveur pour qu’il les traite : un formulaire de
  contact, une inscription, une commande. Les données voyagent dans le **corps** de la
  requête.

```http
POST /contact HTTP/1.1
Host: www.example.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 41

name=L%C3%A9a&message=Bonjour+%C3%A0+tous
```

Le corps contient ici les champs d’un formulaire, encodés comme dans une URL : `L%C3%A9a`
est « Léa », et le `+` représente une espace dans ce format.

### Un protocole sans mémoire

HTTP est **sans état** (_stateless_) : chaque requête est traitée indépendamment des
précédentes. Le serveur ne « se souvient » pas que tu viens de charger la page d’accueil.
Pour garder une session ouverte (rester connecté, conserver un panier), les sites
utilisent des mécanismes ajoutés par-dessus, principalement les **cookies**, que tu
étudieras dans « HTTP en détail ».

## HTTPS : HTTP protégé

### Le problème de HTTP en clair

Avec HTTP simple, tout le contenu des messages circule **en clair** entre ton appareil et
le serveur. Chaque intermédiaire sur le chemin peut le lire et le modifier : le réseau
Wi-Fi d’un café, un équipement compromis, ou quiconque contrôle un point de passage.
Concrètement, un attaquant sur le même Wi-Fi public pourrait :

- lire les mots de passe et les messages que tu envoies ;
- modifier la page que tu reçois, par exemple pour y injecter un script malveillant ;
- se faire passer pour le site que tu crois visiter.

### Ce que HTTPS apporte

**HTTPS** est HTTP transporté à l’intérieur d’une connexion chiffrée par le protocole
**TLS** (Transport Layer Security). Les messages HTTP sont les mêmes ; c’est le tuyau qui
change. TLS apporte trois garanties :

1. **Confidentialité** : les messages sont chiffrés, les intermédiaires ne voient que des
   données illisibles.
2. **Intégrité** : toute modification en route est détectée et la connexion échoue.
3. **Authentification du serveur** : le navigateur vérifie qu’il parle bien au
   propriétaire du nom de domaine demandé.

Cette authentification repose sur un **certificat** : un document numérique qui associe
un nom de domaine à une clé cryptographique, et qui est signé par une **autorité de
certification** reconnue par ton navigateur ou ton système. Au début de la connexion, le
serveur présente son certificat ; le navigateur vérifie qu’il est valide, non expiré, et
qu’il correspond bien au domaine de l’URL.

```text
Navigateur                                      Serveur www.example.com
    |  1. connexion TCP sur le port 443              |
    | ---------------------------------------------> |
    |  2. TLS : « voici mon certificat »             |
    | <--------------------------------------------- |
    |  3. vérification du certificat,                |
    |     accord sur des clés de chiffrement         |
    | <--------------------------------------------> |
    |  4. requête HTTP chiffrée                      |
    | ---------------------------------------------> |
    |  5. réponse HTTP chiffrée                      |
    | <--------------------------------------------- |
```

Si la vérification échoue (certificat expiré, domaine qui ne correspond pas, autorité
inconnue), le navigateur affiche une **page d’avertissement** pleine page et refuse
d’afficher le site sans action explicite de ta part.

### Ce que HTTPS ne garantit pas

Le cadenas affiché par le navigateur signifie seulement que **la connexion** est chiffrée
et que tu parles bien au domaine affiché. Il ne dit **rien** de l’honnêteté du site :

- un site d’hameçonnage peut obtenir un certificat valide pour son propre domaine,
  comme `connexion-securisee.example` ;
- un site en HTTPS peut contenir des failles de sécurité ou mal protéger tes données une
  fois qu’elles sont arrivées sur le serveur ;
- HTTPS protège le transport, pas ton ordinateur ni le serveur eux-mêmes.

:::warning[Cadenas ne veut pas dire confiance]
Vérifie toujours le nom de domaine dans la barre d’adresse. Un cadenas sur un domaine
inconnu ne prouve que la sécurité du tuyau, pas l’identité de l’entreprise que le site
prétend être.
:::

### HTTPS par défaut

Aujourd’hui, HTTPS est la norme pour tous les sites, pas seulement les banques : il évite
qu’un intermédiaire modifie les pages, et les navigateurs signalent les pages en HTTP
comme « non sécurisées ». Beaucoup de sites répondent à toute requête en `http://` par
une **redirection** `301` vers la même adresse en `https://`. Par exemple, au moment de la
rédaction de ce cours, une requête vers `http://developer.mozilla.org/fr/` recevait :

```http
HTTP/1.1 301 Moved Permanently
content-length: 0
location: https://developer.mozilla.org/fr/
```

Les noms d’en-têtes sont insensibles à la casse : `location` et `Location` sont
équivalents.

## Pièges et idées reçues

**« Un code 404 veut dire que le serveur est en panne. »** Au contraire : le serveur
fonctionne puisqu’il a répondu. Il dit simplement qu’il ne connaît pas la ressource
demandée. Un serveur en panne ne répond pas du tout, ou répond par un `5xx`.

**« HTTPS chiffre aussi l’adresse du site que je visite. »** Le chemin, la requête, les
en-têtes et le corps sont chiffrés. En revanche, le nom de domaine contacté reste
généralement visible des intermédiaires (via la requête DNS et le début de la connexion
TLS), ainsi que l’adresse IP du serveur.

**« Le cadenas prouve que le site est sûr. »** Il prouve que la connexion est chiffrée
et que le domaine est le bon, rien de plus.

**« POST est plus sécurisé que GET parce que les données ne sont pas dans l’URL. »** Les
données d’un `POST` ne s’affichent pas dans la barre d’adresse ni dans l’historique, ce
qui est préférable pour des informations sensibles. Mais sans HTTPS, le corps d’un `POST`
circule en clair exactement comme l’URL d’un `GET`. C’est HTTPS qui chiffre, pas la
méthode.

**« Le serveur se souvient de moi entre deux pages. »** HTTP est sans état. Si un site te
reconnaît, c’est parce que ton navigateur renvoie une information (un cookie) à chaque
requête.

## Exercices

### Exercice 1 : lire un échange

Voici un échange HTTP :

```http
GET /images/logo.png HTTP/1.1
Host: static.example.com
Accept: image/avif,image/webp,image/png
```

```http
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Content-Length: 25

<p>Image introuvable.</p>
```

1. Quelle ressource est demandée, et à quel domaine ?
2. Quelle méthode est utilisée, et pourquoi est-ce logique ?
3. La requête a-t-elle réussi ? Qui est en cause, le client ou le serveur ?
4. Quel type de contenu le serveur renvoie-t-il dans le corps ?

:::solution

1. La ressource `/images/logo.png` sur le domaine `static.example.com` (en-tête `Host`).
2. `GET` : le client veut **obtenir** une image, il n’envoie pas de données à traiter.
3. Non : `404 Not Found` est une erreur de la famille `4xx`, une erreur **côté client**.
   Le serveur fonctionne, mais la ressource demandée n’existe pas à ce chemin : la page
   qui référence cette image contient sans doute un chemin incorrect.
4. Du HTML (`Content-Type: text/html; charset=utf-8`), une courte page d’erreur, et non
   une image. Le navigateur ne pourra donc pas afficher le logo.

:::

### Exercice 2 : ce que voit l’intermédiaire

Tu es connecté au Wi-Fi public d’une gare. Pour chaque situation, indique ce qu’un
attaquant connecté au même réseau peut voir : le domaine, le chemin, le contenu des
messages.

1. Tu consultes `http://journal.example/article/42`.
2. Tu te connectes à `https://banque.example/compte` et tu envoies ton mot de passe.
3. Le site de la question 2 affiche un cadenas, mais tu remarques que le domaine est en
   réalité `banque.example.connexion-rapide.example`.

:::solution

1. **Tout** : le domaine, le chemin `/article/42`, les en-têtes et le contenu de la page,
   car HTTP circule en clair. L’attaquant pourrait même modifier la page reçue.
2. Le **domaine** `banque.example` (et l’adresse IP du serveur) reste généralement
   visible, mais le chemin `/compte`, les en-têtes et le mot de passe sont **chiffrés**
   par TLS. L’attaquant ne peut ni les lire ni les modifier sans que la connexion échoue.
3. La connexion est chiffrée, mais vers **le mauvais site** : le domaine enregistré est
   `connexion-rapide.example`, et `banque.example` n’en est qu’un sous-domaine. C’est
   probablement de l’hameçonnage. HTTPS a fait son travail (chiffrer le tuyau), mais il
   ne peut pas t’empêcher d’envoyer ton mot de passe au mauvais destinataire.

:::

### Exercice 3 : suivre une redirection

Un client envoie `GET /` à `http://www.example.com` et reçoit :

```http
HTTP/1.1 301 Moved Permanently
Location: https://www.example.com/
Content-Length: 0
```

1. Que fait ensuite le navigateur ?
2. Combien de requêtes HTTP au total faut-il pour obtenir la page ?
3. Pourquoi un site fait-il cela ?

:::solution

1. Il lit l’en-tête `Location` et envoie automatiquement une nouvelle requête `GET /`,
   cette fois en HTTPS, donc sur le port 443 avec une connexion TLS.
2. Deux : la première en HTTP (réponse `301`), la seconde en HTTPS (réponse `200` si tout
   va bien).
3. Pour que les visiteurs qui tapent l’adresse sans `https://`, ou qui suivent un ancien
   lien, arrivent quand même sur la version chiffrée du site. Le code `301` indique que
   le déplacement est permanent.

:::

## Récapitulatif

- HTTP est un dialogue fait de paires **requête** / **réponse** ; le client parle
  toujours en premier.
- Une requête contient une **ligne de requête** (méthode, chemin, version), des
  **en-têtes** dont `Host`, une ligne vide et parfois un **corps**.
- Une réponse contient une **ligne de statut** (version, code, texte), des en-têtes
  comme `Content-Type`, une ligne vide et un corps.
- Les codes de statut se lisent par famille : `2xx` succès, `3xx` redirection, `4xx`
  erreur du client, `5xx` erreur du serveur.
- `GET` demande une ressource ; `POST` envoie des données dans le corps.
- HTTP est **sans état** : chaque requête est indépendante.
- **HTTPS** = HTTP dans une connexion **TLS** : confidentialité, intégrité et
  authentification du serveur grâce à un **certificat**.
- Le cadenas garantit le tuyau et le domaine, pas l’honnêteté du site : lis toujours le
  nom de domaine.
