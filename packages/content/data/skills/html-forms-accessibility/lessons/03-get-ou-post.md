---
title: Envoyer un formulaire, GET ou POST
summary: Comprendre ce que le navigateur envoie réellement et choisir la bonne méthode HTTP.
durationMinutes: 40
sources:
  - title: MDN — Envoyer et extraire les données des formulaires
    url: https://developer.mozilla.org/fr/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data
  - title: WHATWG — Envoi des formulaires
    url: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-2
  - title: IETF — RFC 9110, HTTP Semantics (en anglais)
    url: https://www.rfc-editor.org/rfc/rfc9110
---

## Que se passe-t-il quand on clique sur « Envoyer » ?

Tu as construit des formulaires et ajouté des contraintes. Reste la dernière étape :
l’envoi. Quand la personne valide, le navigateur rassemble les valeurs des champs, les
encode et les envoie au serveur dans une **requête HTTP**. Rappel du prérequis
« Fonctionnement du web » : une requête HTTP a une méthode (GET, POST…), une adresse,
des en-têtes et parfois un corps.

Deux attributs du `form` décident de la forme de cette requête :

- `action` : l’adresse de destination ;
- `method` : `get` (valeur par défaut) ou `post`.

Le choix entre GET et POST n’est pas une question de goût : il change l’endroit où
voyagent les données, ce que l’on peut partager ou mettre en favori, et ce qui se passe
quand on recharge la page.

## Ce qui est envoyé : des paires nom=valeur

Le navigateur construit une liste de paires `name=value` à partir des champs du
formulaire, dans l’ordre du document. Toutes les captures de cette leçon ont été
obtenues avec Chromium, en interceptant les requêtes réellement envoyées.

Prends ce formulaire de commande, rempli tel quel :

```html
<form action="/commande" method="post">
  <input type="hidden" name="product" value="bol-42">

  <label for="qty">Quantité</label>
  <input type="number" id="qty" name="quantity" value="2">

  <label for="ref">Référence</label>
  <input id="ref" name="reference" value="BOL-42" readonly>

  <label for="promo">Code promo</label>
  <input id="promo" name="promo" value="ETE26A" disabled>

  <input type="checkbox" id="gift" name="gift" value="yes">
  <label for="gift">Paquet cadeau</label>

  <input type="checkbox" id="news" name="newsletter" checked>
  <label for="news">Lettre d’information</label>

  <label for="comment">Commentaire</label>
  <textarea id="comment" name="comment">Livrer après 18 h, merci !</textarea>

  <label for="note">Note interne</label>
  <input id="note" value="à ne pas envoyer">

  <button type="submit" name="action" value="order">Commander</button>
</form>
```

Le corps de la requête envoyée est :

```text
product=bol-42&quantity=2&reference=BOL-42&newsletter=on&comment=Livrer+apr%C3%A8s+18+h%2C+merci+%21&action=order
```

Lis-le attentivement, chaque détail compte :

- `input type="hidden"` est envoyé : c’est un champ invisible, souvent utilisé pour un
  identifiant. **Invisible ne veut pas dire protégé** : n’importe qui peut le lire et le
  modifier dans l’inspecteur ;
- `readonly` est envoyé, `disabled` **ne l’est pas** ;
- la case « Paquet cadeau » non cochée n’envoie **rien** ; la case cochée sans `value`
  envoie `on` ;
- le champ « Note interne » n’a pas de `name` : il n’est pas envoyé ;
- le bouton qui a servi à envoyer ajoute sa propre paire (`action=order`), car il a un
  `name` ;
- les caractères spéciaux sont **encodés** : l’espace devient `+`, la virgule `%2C`, le
  point d’exclamation `%21`, et « è » devient `%C3%A8`, ses deux octets UTF-8 écrits en
  hexadécimal.

Ce format s’appelle `application/x-www-form-urlencoded`. Les paires sont séparées par
`&`, le nom et la valeur par `=`. C’est pour cela qu’un `&` ou un `=` tapé par
l’utilisateur doit être encodé (`%26`, `%3D`) : sinon il serait pris pour un séparateur.

Quand plusieurs champs portent le même `name`, comme des cases à cocher d’un même
groupe, chaque valeur cochée produit **sa propre paire** : `day=tuesday&day=saturday`.
Le serveur devra récupérer une liste.

## GET : les données dans l’adresse

Avec `method="get"`, les paires sont ajoutées à l’adresse, après un point
d’interrogation : c’est la **chaîne de requête** (query string).

```html
<form action="/recherche" method="get">
  <label for="q">Rechercher</label>
  <input type="search" id="q" name="q">
  <select name="niveau">
    <option value="debutant">Débutant</option>
  </select>
  <button type="submit">Chercher</button>
</form>
```

Avec la saisie « pots en grès & émail », le navigateur demande :

```http
GET /recherche?q=pots+en+gr%C3%A8s+%26+%C3%A9mail&niveau=debutant HTTP/1.1
Host: atelier.test
```

Il n’y a **pas de corps** : tout est dans l’adresse, visible dans la barre d’adresse.

Conséquences, qui sont autant d’avantages pour une recherche :

- on peut **mettre la page de résultats en favori** ou **partager le lien** : il
  contient toute la recherche ;
- le bouton « Précédent » et l’historique fonctionnent naturellement ;
- les réponses peuvent être mises en cache.

Et autant d’inconvénients pour des données sensibles :

- l’adresse complète reste dans **l’historique** du navigateur ;
- elle peut être enregistrée dans les **journaux** (logs) des serveurs et des
  intermédiaires ;
- elle se partage par simple copier-coller, avec tout ce qu’elle contient ;
- sa longueur est limitée en pratique par les navigateurs et les serveurs : GET ne
  convient pas pour de gros volumes.

:::note[Sans action ni method]
Un formulaire sans `action` est envoyé à l’adresse de la page courante, et sans
`method`, il utilise GET. Depuis `/cours/page.html`, un formulaire nu contenant un champ
`a` valant 1 demande `/cours/page.html?a=1`. Écris toujours les deux attributs pour que
l’intention soit explicite.
:::

## POST : les données dans le corps

Avec `method="post"`, les paires voyagent dans le **corps** de la requête. L’en-tête
`Content-Type` indique leur format :

```http
POST /commande HTTP/1.1
Host: atelier.test
Content-Type: application/x-www-form-urlencoded

product=bol-42&quantity=2&reference=BOL-42&newsletter=on&comment=Livrer+apr%C3%A8s+18+h%2C+merci+%21&action=order
```

Conséquences :

- les données n’apparaissent pas dans l’adresse, ni dans l’historique, ni dans les
  favoris ;
- si l’on recharge la page de résultat, le navigateur **demande une confirmation** avant
  de renvoyer les données : il sait qu’un second envoi pourrait passer une seconde
  commande ;
- il n’y a pas de limite pratique comparable à celle des adresses : on peut envoyer de
  longs textes et des fichiers.

:::warning[POST n’est pas chiffré]
POST **cache** les données de la barre d’adresse, il ne les **protège** pas. Le corps de
la requête est visible dans l’onglet Réseau des outils de développement, et il circule
en clair sur le réseau si le site n’utilise pas HTTPS. Un formulaire de connexion doit
utiliser POST **et** HTTPS : l’un ne remplace pas l’autre.
:::

## Ce que dit HTTP : méthodes sûres et idempotentes

La norme HTTP (RFC 9110) définit des propriétés pour chaque méthode :

- une méthode **sûre** ne demande aucune modification sur le serveur : elle sert à
  lire. GET est sûre ;
- une méthode **idempotente** produit le même effet qu’on l’envoie une ou plusieurs
  fois. GET l’est ; POST **ne l’est pas**.

Ces propriétés ne sont pas qu’une théorie. Des logiciels comptent dessus : un navigateur
peut précharger des liens, un robot d’indexation suit les liens GET, un intermédiaire
peut rejouer une requête GET qui a échoué. Si un simple lien GET comme
`/supprimer?id=42` supprimait une donnée, un robot pourrait vider ta base en suivant les
liens. Toute action qui **modifie** quelque chose passe donc par POST (ou par d’autres
méthodes comme PUT et DELETE, que tu utiliseras avec JavaScript et les API).

## Envoyer des fichiers : multipart/form-data

Le format urlencodé ne sait pas transporter un fichier. Pour un champ `type="file"`, il
faut ajouter l’attribut `enctype` et utiliser POST :

```html
<form action="/avis" method="post" enctype="multipart/form-data">
  <label for="title">Titre</label>
  <input type="text" id="title" name="title">

  <label for="photo">Photo de ta création</label>
  <input type="file" id="photo" name="photo" accept="image/png, image/jpeg">

  <button type="submit">Envoyer</button>
</form>
```

Le corps est alors découpé en parties séparées par une **frontière** (boundary) que le
navigateur génère au hasard. Sous une forme simplifiée :

```http
POST /avis HTTP/1.1
Host: atelier.test
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary39GKv1oS3P7dS6Wp

------WebKitFormBoundary39GKv1oS3P7dS6Wp
Content-Disposition: form-data; name="title"

Mon bol
------WebKitFormBoundary39GKv1oS3P7dS6Wp
Content-Disposition: form-data; name="photo"; filename="bol.jpg"
Content-Type: image/jpeg

(les octets de l’image)
------WebKitFormBoundary39GKv1oS3P7dS6Wp--
```

L’attribut `accept` filtre les fichiers proposés dans la boîte de dialogue, mais comme
toutes les contraintes côté client, il se contourne : le serveur vérifiera le type et la
taille réels du fichier.

## Choisir : la règle pratique

| Situation                                              | Méthode | Pourquoi                                          |
| ------------------------------------------------------ | ------- | ------------------------------------------------- |
| Recherche, filtres, tri, pagination                    | GET     | lecture seule ; le lien doit pouvoir se partager  |
| Inscription, commande, message de contact              | POST    | crée quelque chose ; ne pas rejouer par erreur    |
| Connexion avec mot de passe                            | POST    | jamais de mot de passe dans une adresse           |
| Modification d’un profil, suppression                  | POST    | modifie l’état du serveur                         |
| Envoi de fichier                                       | POST    | avec `enctype="multipart/form-data"`              |
| Données personnelles (santé, adresse, date de naissance) | POST  | pas d’historique, pas de journaux d’adresses      |

Résumé en une phrase : **GET pour lire et partager, POST pour agir ou transmettre des
données sensibles**.

## Observer l’envoi dans le navigateur

Les outils de développement montrent exactement ce qui part :

1. ouvre l’onglet **Réseau** (Network), puis envoie le formulaire ;
2. clique sur la requête qui apparaît : l’onglet des en-têtes (Headers) montre la
   méthode, l’adresse et le `Content-Type` ;
3. un autre onglet de la requête (Payload dans Chrome, Request dans Firefox ; les
   libellés varient selon la langue et la version) montre les paires envoyées, décodées
   ou brutes.

Sans serveur, l’envoi aboutira à une page d’erreur (fichier introuvable) : ce n’est pas
grave, la requête est quand même visible dans l’onglet Réseau. Active l’option qui
conserve le journal lors des changements de page (Preserve log dans Chrome, Persist
Logs dans Firefox) pour qu’elle ne disparaisse pas.

## Pièges courants

- **Un formulaire de connexion en GET** : le mot de passe finit dans l’historique et les
  journaux. Correction : POST et HTTPS.
- **Croire que POST protège les données**. Correction : POST les sort de l’adresse,
  HTTPS les chiffre, le serveur les valide.
- **Une recherche en POST** : impossible de partager ou de mettre en favori les
  résultats, et le rechargement demande une confirmation. Correction : GET.
- **Une action destructrice derrière un lien GET**. Correction : un formulaire POST avec
  un bouton.
- **Oublier `enctype="multipart/form-data"`** pour un fichier : seul le nom du fichier
  est envoyé, pas son contenu.
- **Faire confiance aux champs `hidden` ou `disabled`** : leur valeur se modifie dans
  l’inspecteur ; un champ désactivé peut être réactivé.

## Exercices

### Exercice 1 — Prédire l’adresse

Le formulaire de recherche de cours de la leçon 1 (champ `q`, cases `day`, liste
`level`, méthode GET vers `/cours`) est rempli ainsi : mot-clé « tour », jours mardi et
samedi cochés, niveau « Débutant ». Écris l’adresse demandée, puis dis ce qui change si
le mot-clé devient « tour & émail ».

:::solution
```text
/cours?q=tour&day=tuesday&day=saturday&level=beginner
```

- Les paires suivent l’ordre du document : `q`, puis les cases, puis `level`.
- Chaque case cochée envoie sa paire ; jeudi, non coché, n’apparaît pas.
- C’est le `value` de l’option qui est envoyé (`beginner`), pas son texte.

Avec « tour & émail », le début devient `q=tour+%26+%C3%A9mail` : les espaces deviennent
`+`, le `&` devient `%26` pour ne pas être pris pour un séparateur, et « é » devient ses
deux octets UTF-8 `%C3%A9`.
:::

### Exercice 2 — GET ou POST ?

Pour chaque formulaire, choisis la méthode et justifie en une phrase.

1. Le filtre « prix maximum » d’un catalogue.
2. Le formulaire « Mot de passe oublié » qui envoie un e-mail de réinitialisation.
3. La pagination « page suivante » d’une liste d’articles.
4. Le bouton « Supprimer ce commentaire ».
5. Un questionnaire médical avant un rendez-vous.
6. Le choix de la langue d’affichage d’un site de documentation.

:::solution
1. GET : c’est une lecture filtrée ; le lien des résultats doit pouvoir se partager.
2. POST : la requête déclenche une action (envoi d’un e-mail) qu’on ne veut pas
   rejouer, et elle contient une adresse personnelle.
3. GET : lecture, et l’adresse de la page 3 doit pouvoir se mettre en favori.
4. POST : la suppression modifie le serveur ; un robot qui suit les liens ne doit pas
   pouvoir la déclencher.
5. POST : données de santé, très sensibles, qui ne doivent pas apparaître dans les
   adresses, l’historique ou les journaux ; HTTPS obligatoire.
6. GET est défendable (l’adresse `?lang=en` se partage), POST aussi si le choix est
   enregistré dans le profil de l’utilisateur. L’important est de justifier : lecture
   d’une version de la page ou modification d’une préférence.
:::

### Exercice 3 — Prédire le corps d’une requête POST

```html
<form action="/inscription" method="post">
  <input name="pseudo" value="Ana Lima">
  <input name="code" value="1+1=2" readonly>
  <input name="x" value="desactive" disabled>
  <input value="sans-nom">
  <input type="checkbox" name="themes" value="html" checked>
  <input type="checkbox" name="themes" value="css" checked>
  <input type="checkbox" name="themes" value="js">
  <input type="checkbox" name="newsletter">
  <input type="checkbox" name="cgu" checked>
  <input type="radio" name="niveau" value="debutant">
  <input type="radio" name="niveau" value="avance" checked>
  <textarea name="message">Bonjour,
ligne 2</textarea>
  <button type="submit" name="action" value="envoyer">Envoyer</button>
</form>
```

(Les étiquettes sont omises pour raccourcir l’exercice ; dans un vrai formulaire, chaque
champ en aurait une.) Écris le corps exact envoyé quand on clique sur « Envoyer ».

:::solution
```text
pseudo=Ana+Lima&code=1%2B1%3D2&themes=html&themes=css&cgu=on&niveau=avance&message=Bonjour%2C%0D%0Aligne+2&action=envoyer
```

- `Ana Lima` : l’espace devient `+`.
- `1+1=2` : le `+` littéral devient `%2B` (sinon il serait relu comme une espace) et
  le `=` devient `%3D`. Le champ `readonly` est envoyé.
- Le champ `disabled` et le champ sans `name` ne sont pas envoyés.
- Deux cases `themes` cochées : deux paires. `js` et `newsletter` non cochées : rien.
- `cgu` cochée sans `value` : `on`.
- Seul le radio coché du groupe `niveau` est envoyé.
- Dans le `textarea`, la virgule devient `%2C` et le retour à la ligne est normalisé en
  `%0D%0A` (retour chariot plus saut de ligne).
- Le bouton d’envoi ajoute `action=envoyer`.
:::

## Récapitulatif

- Le navigateur envoie des paires `name=value` pour les champs qui ont un `name`, ne
  sont pas désactivés et, pour les cases et radios, sont cochés.
- Format par défaut : `application/x-www-form-urlencoded`, avec `&`, `=`, `+` et des
  `%XX` pour les caractères spéciaux et non ASCII.
- GET place les données dans l’adresse : partageable, en favori, en cache, mais visible
  dans l’historique et les journaux. GET est sûre et idempotente.
- POST place les données dans le corps : pour créer, modifier, se connecter, envoyer des
  données sensibles ou des fichiers. POST n’est pas idempotente.
- POST ne chiffre rien : seul HTTPS protège les données en transit.
- Les fichiers exigent POST et `enctype="multipart/form-data"`.
- L’onglet Réseau des outils de développement montre exactement ce qui est envoyé.
