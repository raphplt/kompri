---
title: Ressources, URL et méthodes
summary: Modéliser une API autour de ressources, choisir des URL prévisibles et associer chaque opération à la bonne méthode HTTP.
durationMinutes: 45
sources:
  - title: MDN — REST (glossaire)
    url: https://developer.mozilla.org/fr/docs/Glossary/REST
  - title: MDN — Méthodes de requête HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Methods
  - title: RFC 9110 — HTTP Semantics (méthodes, sûreté, idempotence)
    url: https://www.rfc-editor.org/rfc/rfc9110
  - title: Roy Fielding — Representational State Transfer (chapitre 5 de la thèse)
    url: https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
---

## Le problème : des API imprévisibles

Imagine que tu doives utiliser l’API d’une bibliothèque, et que sa documentation liste :

```text
GET  /getAllBooks
POST /createBook
GET  /book_details?id=3
POST /updateBook/3
GET  /deleteBook?id=3
POST /books/search
```

Chaque adresse suit sa propre logique. Pour deviner comment supprimer un auteur, tu dois
lire toute la documentation. Pire : `GET /deleteBook?id=3` supprime un livre avec une
méthode censée seulement **lire**. Un robot d’indexation, un aperçu de lien dans une
messagerie ou un navigateur qui précharge les pages pourraient déclencher des
suppressions.

Une API **REST** s’organise autrement : autour de **ressources** désignées par des URL,
manipulées avec les **méthodes HTTP** standard. Une fois les conventions comprises, tu
peux deviner l’essentiel d’une API sans lire sa documentation :

```text
GET    /books        lister les livres
POST   /books        créer un livre
GET    /books/3      lire le livre 3
PUT    /books/3      remplacer le livre 3
PATCH  /books/3      modifier une partie du livre 3
DELETE /books/3      supprimer le livre 3
```

## Ce que REST veut dire (et ce qu’il ne veut pas dire)

REST (*Representational State Transfer*) est un **style d’architecture** décrit par Roy
Fielding dans sa thèse de doctorat, en 2000. Ce n’est ni une norme, ni une
bibliothèque, ni un format. Ses idées principales, appliquées au web :

- **Ressources** : tout ce qui mérite un nom (un livre, la liste des livres, un auteur)
  est une ressource identifiée par une URL.
- **Représentations** : le client ne manipule pas la ressource elle-même, mais une
  représentation, le plus souvent en JSON (`Content-Type: application/json`). La même
  ressource pourrait avoir une représentation HTML ou CSV.
- **Interface uniforme** : les mêmes méthodes HTTP, avec le même sens, pour toutes les
  ressources.
- **Sans état** (stateless) : chaque requête contient tout ce qu’il faut pour la
  comprendre. Le serveur ne se souvient pas de « l’étape précédente » du client entre
  deux requêtes (les données de l’application, elles, sont bien sûr conservées).

Dans la pratique, ce qu’on appelle « API REST » en entreprise est le plus souvent une
**API HTTP orientée ressources, en JSON**, qui applique une partie de ces principes. Ce
cours suit cet usage courant. Garde en tête la distinction :

| Nature         | Exemple                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| **Norme**      | Le sens de `GET`, `PUT`, `DELETE`, des codes 201, 404, 409 (RFC 9110).     |
| **Convention** | Noms de collections au pluriel, `/api` en préfixe, champs en `camelCase`.  |
| **Opinion**    | Préférer 422 à 400 pour une validation échouée, le format de pagination.   |

Une convention n’est pas une obligation, mais la suivre rend ton API prévisible pour les
autres développeurs.

## Modéliser les ressources

### Collections et éléments

On distingue deux formes de ressources :

- une **collection** : `/books`, l’ensemble des livres ;
- un **élément** de la collection : `/books/3`, le livre d’identifiant 3.

L’identifiant est attribué par le serveur (un nombre, ou un identifiant aléatoire comme
un UUID). Il ne change jamais pendant la vie de la ressource, contrairement au titre.

### Des noms, pas des verbes

L’URL désigne **quoi** ; la méthode dit **ce qu’on en fait**. `/createBook` mélange les
deux. Les conventions les plus répandues :

- des **noms au pluriel** pour les collections : `/books`, `/authors`, `/loans` ;
- des **minuscules**, les mots séparés par des tirets : `/book-reviews` plutôt que
  `/bookReviews` ou `/book_reviews` ;
- **pas d’extension** de fichier ni de barre oblique finale : `/books/3`, pas
  `/books/3.json/` ;
- un **préfixe** pour séparer l’API des pages du site : `/api/books`. Certains ajoutent
  un numéro de version (`/api/v1/books`) pour pouvoir faire évoluer l’API sans casser
  les anciens clients.

### Relations : sous-ressources, avec modération

Quand une ressource n’a de sens que rattachée à une autre, on peut l’imbriquer :
`/authors/1/books` désigne les livres de l’auteur 1. Voici une petite démonstration avec
Express, données en mémoire :

```js
// resources.js
import express from 'express';

const authors = [
  { id: 1, name: 'Victor Hugo' },
  { id: 2, name: 'Émile Zola' },
];
const books = [
  { id: 1, title: 'Les Misérables', authorId: 1 },
  { id: 2, title: 'Notre-Dame de Paris', authorId: 1 },
  { id: 3, title: 'Germinal', authorId: 2 },
];

const app = express();

// Collection des auteurs
app.get('/api/authors', (req, res) => {
  res.json(authors);
});

// Un auteur précis
app.get('/api/authors/:authorId', (req, res) => {
  const author = authors.find((item) => item.id === Number(req.params.authorId));
  if (!author) {
    res.status(404).json({ error: 'Auteur introuvable' });
    return;
  }
  res.json(author);
});

// Sous-collection : les livres d'un auteur
app.get('/api/authors/:authorId/books', (req, res) => {
  const authorId = Number(req.params.authorId);
  if (!authors.some((item) => item.id === authorId)) {
    res.status(404).json({ error: 'Auteur introuvable' });
    return;
  }
  res.json(books.filter((book) => book.authorId === authorId));
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/api/authors/1/books
curl -s -i http://localhost:3000/api/authors/9/books
```

```text
[{"id":1,"title":"Les Misérables","authorId":1},{"id":2,"title":"Notre-Dame de Paris","authorId":1}]
HTTP/1.1 404 Not Found
…
{"error":"Auteur introuvable"}
```

La sous-collection d’un auteur inexistant répond 404 et non une liste vide : la
ressource parente n’existe pas, donc l’adresse ne désigne rien.

Ne descends pas trop profond : `/authors/1/books/3/reviews/8/comments` devient pénible.
Une règle pratique : un seul niveau d’imbrication, et chaque élément reste accessible
directement par son propre identifiant (`/books/3`). Pour un simple filtre, préfère la
query string : `/books?author=hugo` (voir la leçon sur la pagination).

## Associer les opérations aux méthodes

### Le tableau de référence

| Opération              | Méthode  | URL         | Succès typique                    |
| ---------------------- | -------- | ----------- | --------------------------------- |
| Lister                 | `GET`    | `/books`    | 200 + tableau (ou page)           |
| Lire un élément        | `GET`    | `/books/3`  | 200 + élément                     |
| Créer                  | `POST`   | `/books`    | 201 + élément + en-tête `Location` |
| Remplacer entièrement  | `PUT`    | `/books/3`  | 200 + élément (ou 204)            |
| Modifier partiellement | `PATCH`  | `/books/3`  | 200 + élément (ou 204)            |
| Supprimer              | `DELETE` | `/books/3`  | 204 sans corps                    |

On parle de **CRUD** : Create, Read, Update, Delete (créer, lire, mettre à jour,
supprimer). Les erreurs les plus fréquentes : 404 si l’élément n’existe pas, 400 ou 422
si les données envoyées sont invalides, 409 si l’opération entre en conflit avec l’état
actuel (par exemple un code déjà utilisé). La leçon suivante les met en œuvre.

### Sûreté et idempotence

Deux propriétés définies par la norme HTTP (RFC 9110) guident le choix de la méthode :

- Une méthode **sûre** (safe) ne demande aucune modification côté serveur : `GET`,
  `HEAD`, `OPTIONS`. C’est pourquoi `GET /deleteBook?id=3` est une faute grave : tout
  logiciel a le droit d’envoyer des `GET` sans demander l’avis de l’utilisateur.
- Une méthode **idempotente** produit le **même effet** sur le serveur, qu’on envoie la
  requête une fois ou dix fois : les méthodes sûres, plus `PUT` et `DELETE`.

| Méthode  | Sûre | Idempotente  | Pourquoi                                                    |
| -------- | ---- | ------------ | ----------------------------------------------------------- |
| `GET`    | oui  | oui          | Ne fait que lire.                                           |
| `POST`   | non  | non          | Deux envois créent deux livres.                             |
| `PUT`    | non  | oui          | Remplacer par la même chose deux fois laisse le même état.  |
| `PATCH`  | non  | pas garanti  | Dépend de l’opération décrite (voir ci-dessous).            |
| `DELETE` | non  | oui          | Après une ou deux suppressions, le livre n’existe plus.     |

L’idempotence concerne **l’effet** sur le serveur, pas la réponse : un second `DELETE`
du même livre répond 404 au lieu de 204, mais l’état est le même. Pourquoi est-ce
important ? Si la connexion coupe avant la réponse, un client peut **renvoyer** sans
risque une requête idempotente. Renvoyer un `POST`, en revanche, peut créer un doublon
(une double commande, un double paiement). `PATCH` n’est idempotent que si la
modification l’est : « mettre `available` à `false` » l’est, « ajouter 1 au stock » ne
l’est pas.

:::note[Rendre un POST rejouable]
Certaines API acceptent un en-tête `Idempotency-Key` : le client envoie une clé unique
avec son `POST`, et le serveur n’exécute pas une seconde fois une requête portant la
même clé : il renvoie le résultat de la première. Ce n’est pas un en-tête défini par la
norme HTTP elle-même, mais une convention que tu rencontreras dans la documentation de
certaines API, notamment de paiement.

:::

### Les actions qui ne rentrent pas dans le CRUD

« Emprunter un livre », « annuler une commande » : ces actions ne sont pas des
créations ou des suppressions évidentes. Deux approches courantes :

1. **Transformer l’action en ressource** : emprunter, c’est créer un prêt.
   `POST /loans` avec `{ "bookId": 3 }`, puis `DELETE /loans/12` ou
   `PATCH /loans/12` avec `{ "returnedAt": "…" }` pour le retour. Le prêt devient une
   ressource qu’on peut lister, consulter et dater.
2. **Modifier un état** : `PATCH /orders/42` avec `{ "status": "cancelled" }`.

Certaines API exposent aussi une sous-ressource d’action, comme
`POST /orders/42/cancel`. Ce n’est pas « interdit », mais c’est un écart au modèle
orienté ressources : réserve-le aux cas où les deux approches précédentes seraient
artificielles, et documente-le.

## Pièges courants

- **Verbes dans les URL** : `/getBooks`, `/books/3/delete`. La méthode porte déjà le
  verbe.
- **`GET` qui modifie** des données : contraire à la sûreté, dangereux.
- **Tout en `POST`** : on perd la sûreté, l’idempotence et la lisibilité.
- **Identifiant dans le corps au lieu de l’URL** : `POST /books/update` avec
  `{ "id": 3 }`. L’élément visé doit apparaître dans l’URL : `PATCH /books/3`.
- **Mélange singulier/pluriel** : `/book/3` et `/authors`. Choisis une règle, applique-la
  partout.
- **Imbrication excessive** : au-delà d’un niveau, préfère des ressources de premier
  niveau et des filtres.
- **Croire que REST impose JSON ou des codes précis** : REST est un style ; le JSON et
  la plupart des choix de détail sont des conventions.

## Exercices

### Exercice 1 — Remettre de l’ordre

Réécris chaque point d’entrée de l’API imprévisible du début de la leçon en version
orientée ressources (méthode + URL), et indique le statut de succès attendu.

```text
GET  /getAllBooks
POST /createBook
GET  /book_details?id=3
POST /updateBook/3          (remplace toutes les informations)
GET  /deleteBook?id=3
POST /books/search          (corps : {"author": "hugo"})
```

:::solution

```text
GET    /api/books               200 (liste)
POST   /api/books               201 (+ Location: /api/books/<id>)
GET    /api/books/3             200 (ou 404)
PUT    /api/books/3             200 (ou 404)
DELETE /api/books/3             204 (ou 404)
GET    /api/books?author=hugo   200 (liste filtrée)
```

- Les verbes disparaissent des URL : ils sont portés par les méthodes.
- `id=3` passe dans le chemin : il désigne **la** ressource visée.
- La suppression quitte `GET`, méthode sûre, pour `DELETE`.
- La recherche est une lecture : `GET` avec une query string. On voit parfois `POST`
  pour des recherches très complexes (filtres volumineux), mais c’est une exception à
  justifier, car on perd la sûreté et la possibilité de partager l’URL.

:::

### Exercice 2 — Concevoir une API d’événements

Une association organise des événements (titre, date, nombre de places). Des
participants s’y inscrivent (nom, courriel). Conçois le tableau des points d’entrée :
lister et créer des événements, lire, modifier et supprimer un événement, lister les
inscriptions d’un événement, s’inscrire, annuler une inscription. Pour chaque ligne,
donne la méthode, l’URL, le statut de succès et au moins une erreur possible.

:::solution

Une proposition parmi d’autres, toutes défendables si elles sont cohérentes :

```text
GET    /api/events                              200
POST   /api/events                              201   422 données invalides
GET    /api/events/7                            200   404
PATCH  /api/events/7                            200   404, 422
DELETE /api/events/7                            204   404
GET    /api/events/7/registrations              200   404 si l’événement n’existe pas
POST   /api/events/7/registrations              201   404, 422, 409 si complet ou déjà inscrit
DELETE /api/events/7/registrations/15           204   404
```

- Les inscriptions sont une **sous-ressource** : elles n’existent qu’à l’intérieur d’un
  événement. Un seul niveau d’imbrication.
- S’inscrire = **créer** une inscription (`POST`), annuler = la **supprimer** (`DELETE`).
  Pas besoin de `/register` ou `/cancel`. Si l’on veut garder une trace des
  annulations, on peut préférer `PATCH …/registrations/15` avec
  `{ "status": "cancelled" }`.
- 409 traduit un conflit avec l’état actuel : l’événement est complet ou le courriel est
  déjà inscrit. Le client peut comprendre et changer sa demande.

:::

### Exercice 3 — Un élément d’une sous-collection

Ajoute à `resources.js` la route `GET /api/authors/:authorId/books/:bookId`. Elle renvoie
le livre seulement s’il appartient bien à l’auteur ; sinon, 404.

:::solution

À placer avant `app.listen` :

```js
// Un livre précis d'un auteur précis
app.get('/api/authors/:authorId/books/:bookId', (req, res) => {
  const book = books.find(
    (item) =>
      item.id === Number(req.params.bookId) &&
      item.authorId === Number(req.params.authorId),
  );
  if (!book) {
    res.status(404).json({ error: 'Livre introuvable pour cet auteur' });
    return;
  }
  res.json(book);
});
```

```bash
curl -s http://localhost:3000/api/authors/1/books/2
curl -s http://localhost:3000/api/authors/2/books/2
```

```text
{"id":2,"title":"Notre-Dame de Paris","authorId":1}
{"error":"Livre introuvable pour cet auteur"}
```

- Les deux paramètres sont des chaînes : on convertit les deux avec `Number`.
- Le livre 2 existe, mais pas sous l’auteur 2 : l’URL ne désigne rien, d’où 404. Ne
  pas vérifier l’appartenance laisserait croire qu’un livre appartient à n’importe quel
  auteur.
- Cette route fait doublon avec `/api/books/2` : c’est une commodité. Beaucoup d’API
  s’en passent et gardent l’accès direct comme unique adresse de l’élément.

:::

## Récapitulatif

- REST est un style d’architecture : des ressources identifiées par des URL, manipulées
  par une interface uniforme (les méthodes HTTP), sans état côté serveur entre deux
  requêtes.
- Distingue la **norme** (sens des méthodes et des codes), les **conventions** (pluriel,
  minuscules, `/api`) et les **opinions**.
- Collections au pluriel (`/books`) et éléments (`/books/3`) ; des noms, pas de verbes ;
  un niveau d’imbrication au plus ; la query string pour filtrer.
- CRUD : `GET` (lire), `POST` (créer, 201), `PUT` (remplacer), `PATCH` (modifier en
  partie), `DELETE` (supprimer, 204).
- `GET` est **sûre** ; `GET`, `PUT` et `DELETE` sont **idempotentes** ; `POST` ne l’est
  pas, `PATCH` pas forcément. L’idempotence permet de rejouer une requête sans risque.
- Une action métier devient souvent une ressource (un prêt, une inscription) ou un
  changement d’état.
