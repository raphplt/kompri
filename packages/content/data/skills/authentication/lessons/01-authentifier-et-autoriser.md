---
title: Authentifier et autoriser
summary: Distinguer « qui es-tu ? » de « as-tu le droit ? », choisir entre 401, 403 et 404, et préparer le projet de la compétence.
durationMinutes: 45
sources:
  - title: OWASP — Authentication Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  - title: OWASP — Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  - title: RFC 9110 — HTTP Semantics (codes 401 et 403)
    url: https://www.rfc-editor.org/rfc/rfc9110
  - title: CNIL — Mots de passe, recommandations pour maîtriser sa sécurité
    url: https://www.cnil.fr/fr/mots-de-passe-recommandations-pour-maitriser-sa-securite
---

## Le problème : des données qui appartiennent à quelqu’un

Jusqu’ici, tes API répondaient à n’importe qui de la même façon. Dès qu’une application
garde des données personnelles — des notes, des commandes, des messages — deux questions se
posent à **chaque** requête :

1. **Qui fait cette demande ?** C’est l’**authentification**.
2. **Cette personne a-t-elle le droit de faire cela, sur cette donnée ?** C’est
   l’**autorisation**.

Les confondre est l’origine d’une grande partie des failles réelles. Dans le Top 10 de
l’OWASP 2025, la première catégorie, **A01 Broken Access Control**, concerne l’autorisation ;
la septième, **A07 Authentication Failures**, concerne l’authentification.

Dans cette compétence, tu vas construire pas à pas une API de notes personnelles : inscription
avec mot de passe correctement haché, connexion par session et cookie, déconnexion, et
accès limité aux notes de chacun. La dernière leçon compare cette approche aux jetons JWT.

## Trois notions à ne pas mélanger

| Notion | Question | Exemple |
| --- | --- | --- |
| Identification | Qui prétends-tu être ? | Tu saisis `ada@example.fr` |
| Authentification | Prouve-le | Tu fournis le bon mot de passe |
| Autorisation | Que peux-tu faire ? | Tu peux lire **tes** notes, pas celles de Bob |

L’identification seule ne prouve rien : n’importe qui peut taper l’adresse d’Ada.
L’authentification apporte une **preuve**. On classe traditionnellement les preuves en trois
familles, appelées **facteurs** :

- ce que l’on **sait** : un mot de passe, un code PIN ;
- ce que l’on **possède** : un téléphone qui reçoit un code, une clé de sécurité physique ;
- ce que l’on **est** : une empreinte digitale, un visage.

L’**authentification multifacteur** combine au moins deux familles différentes. La CNIL
rappelle que ces méthodes offrent davantage de sécurité que le mot de passe seul. Elle sort
du cadre de cette compétence, mais tout ce que tu construis ici en est la base.

Une fois l’utilisateur authentifié, le serveur ne lui redemande pas son mot de passe à chaque
requête. Il lui remet un **jeton** (un identifiant de session dans un cookie, ou un JWT) qui
prouve, pour les requêtes suivantes, que l’authentification a eu lieu. Les leçons 3 et 5
détaillent ces deux options.

## 401, 403 ou 404 ?

HTTP prévoit deux codes d’erreur distincts, dont les noms historiques prêtent à confusion :

| Code | Nom officiel | Sens réel | Exemple |
| --- | --- | --- | --- |
| 401 | Unauthorized | **Non authentifié** : pas de preuve, ou preuve invalide | Pas de cookie de session, session expirée |
| 403 | Forbidden | **Authentifié mais non autorisé** | Un membre appelle une route d’administration |
| 404 | Not Found | La ressource n’existe pas… **pour toi** | Bob demande la note d’Ada |

Quelques règles pratiques :

- **401** invite le client à s’authentifier (ou à recommencer). La norme HTTP (RFC 9110)
  demande d’accompagner un 401 d’un en-tête `WWW-Authenticate` qui indique le schéma attendu ;
  beaucoup d’API JSON qui utilisent des cookies l’omettent.
- **403** signifie : « je sais qui tu es, et c’est non ». Recommencer avec la même identité
  ne changera rien.
- Pour une ressource qui appartient à un autre utilisateur, **404** est souvent préférable à
  403 : un 403 confirmerait que la note numéro 17 existe. C’est un choix de conception, pas une
  obligation de la norme ; l’important est d’être cohérent.

## Un premier exemple : clé d’accès et rôle

Avant les mots de passe et les sessions, voici les deux étapes isolées. Chaque utilisateur
possède une clé secrète qu’il envoie dans l’en-tête `Authorization`. (Les clés sont écrites en
dur pour l’exemple : dans un vrai projet, elles seraient aléatoires et stockées hachées.)

Dans un dossier avec Express 5 (`npm init -y`, `npm pkg set type=module`,
`npm install express@5`), crée `roles-demo.js` :

```js
// roles-demo.js — authentification (qui es-tu ?) puis autorisation (as-tu le droit ?)
import express from 'express';

// Pour l’exemple seulement : des clés écrites en dur, associées à des utilisateurs
const usersByKey = new Map([
  ['cle-ada-7f3a9c', { id: 1, name: 'Ada', role: 'admin' }],
  ['cle-bob-2b81e4', { id: 2, name: 'Bob', role: 'member' }],
]);

const app = express();

// 1. Authentification : retrouver l’utilisateur à partir de la preuve fournie
function authenticate(req, res, next) {
  const header = req.get('Authorization') ?? '';
  const key = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  req.user = key ? (usersByKey.get(key) ?? null) : null;
  if (!req.user) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
}

// 2. Autorisation : vérifier que l’utilisateur connu a le droit d’agir
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Action non autorisée' });
    }
    next();
  };
}

app.get('/api/me', authenticate, (req, res) => {
  res.json({ name: req.user.name, role: req.user.role });
});

app.get('/api/admin/stats', authenticate, requireRole('admin'), (req, res) => {
  res.json({ users: usersByKey.size });
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

Lance `node roles-demo.js`, puis :

```bash
curl -s -i http://localhost:3000/api/me
curl -s -H 'Authorization: Bearer cle-bob-2b81e4' http://localhost:3000/api/me
curl -s -w ' %{http_code}\n' -H 'Authorization: Bearer cle-bob-2b81e4' http://localhost:3000/api/admin/stats
curl -s -w ' %{http_code}\n' -H 'Authorization: Bearer cle-ada-7f3a9c' http://localhost:3000/api/admin/stats
curl -s -w ' %{http_code}\n' -H 'Authorization: Bearer inventee' http://localhost:3000/api/admin/stats
```

Sortie (en-têtes de la première réponse abrégés) :

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
…
{"error":"Authentification requise"}
{"name":"Bob","role":"member"}
{"error":"Action non autorisée"} 403
{"users":2} 200
{"error":"Authentification requise"} 401
```

Observe la **chaîne de middlewares** : `authenticate` s’exécute d’abord et garantit que
`req.user` existe ; `requireRole('admin')` peut donc lire `req.user.role` sans risque. L’ordre
compte : placé avant `authenticate`, `requireRole` planterait sur `req.user` indéfini.

`requireRole` est une **fabrique de middlewares** : une fonction qui reçoit un paramètre
(`'admin'`) et renvoie un middleware. C’est une fermeture, que tu as vue en JavaScript.

## Où placer les contrôles ?

Le contrôle d’accès se fait **sur le serveur, à chaque requête**. Masquer un bouton
« Supprimer » dans l’interface améliore l’ergonomie, mais ne protège rien : la route reste
appelable avec `curl`.

Dans une application Express, on retrouve presque toujours ce découpage :

1. un middleware global qui **identifie** l’utilisateur à partir de la requête (cookie ou
   en-tête) et remplit `req.user`, ou `null` ;
2. un middleware `requireAuth` sur les routes réservées, qui renvoie 401 si `req.user` est
   `null` ;
3. des contrôles d’**autorisation** : par rôle (`requireRole`), et surtout par
   **propriétaire** de la ressource, directement dans la requête SQL (leçon 4).

Le principe directeur s’appelle **refus par défaut** (*deny by default*) : une route est
fermée tant qu’on n’a pas explicitement décidé qui peut l’utiliser.

## Préparer le projet de la compétence

Les leçons suivantes construisent une API de notes. Crée la base et les tables maintenant.

```bash
mkdir notes-api && cd notes-api
npm init -y
npm pkg set type=module
npm install express@5 pg
mkdir -p src migrations test
createdb notes_auth
```

Fichier `migrations/001_auth.sql` :

```sql
-- 001_auth.sql — utilisateurs, sessions et notes
CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE notes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_owner_id_idx ON notes (owner_id);
```

```bash
psql notes_auth -f migrations/001_auth.sql
export DATABASE_URL=postgres://postgres@localhost:5432/notes_auth
```

Adapte `DATABASE_URL` à ton installation (utilisateur, mot de passe, port). Quelques choix à
remarquer :

- `email` est `UNIQUE` : deux comptes ne peuvent pas partager une adresse. L’application la
  mettra en minuscules avant de l’enregistrer.
- La colonne s’appelle `password_hash` : on ne stocke **jamais** le mot de passe lui-même.
- La table `sessions` stocke une **empreinte** du jeton de session (`token_hash`), pas le jeton.
- `ON DELETE CASCADE` : supprimer un utilisateur supprime ses sessions et ses notes.
- `notes.owner_id` relie chaque note à son propriétaire : c’est sur cette colonne que reposera
  l’autorisation.

## Pièges et idées reçues

- **« 401 veut dire non autorisé, donc je l’utilise pour un membre qui n’est pas admin. »** Non :
  l’utilisateur est authentifié, c’est un 403.
- **« Le bouton est caché, donc l’action est protégée. »** L’interface n’est pas une barrière ;
  seul le serveur décide.
- **« Le rôle est dans le corps de la requête ou dans un cookie lisible. »** Tout ce qui vient
  du client est modifiable. Le rôle se lit en base, à partir de l’identité authentifiée.
- **« Une fois connecté, l’utilisateur peut tout faire sur l’API. »** L’authentification ne
  dit rien des droits sur **une** ressource précise : il faut encore vérifier le propriétaire.
- **Des messages trop bavards.** « Aucun compte avec cet e-mail » renseigne un attaquant sur
  les adresses inscrites (énumération de comptes). À la connexion, un message unique :
  « E-mail ou mot de passe incorrect ».

## Exercices

### Exercice 1 — Authentification ou autorisation ?

Pour chaque situation, dis s’il s’agit d’un défaut d’authentification ou d’autorisation, et
quel code HTTP le serveur devrait renvoyer.

1. Une requête sans cookie demande la liste de ses notes.
2. Bob, connecté, demande `GET /api/notes/17`, une note d’Ada.
3. Bob, connecté, appelle `DELETE /api/users/1` réservé aux administrateurs.
4. Un cookie de session expiré depuis hier est envoyé.
5. Bob envoie `{"title":"…","owner_id":1}` pour créer une note au nom d’Ada.

:::solution
1. Authentification : aucune preuve → **401**.
2. Autorisation (propriétaire) : Bob est authentifié mais la note n’est pas à lui → **404**
   de préférence, pour ne pas révéler son existence (403 se défend aussi).
3. Autorisation (rôle) → **403**.
4. Authentification : la preuve n’est plus valable → **401** ; l’interface proposera de se
   reconnecter.
5. Autorisation : le serveur doit **ignorer** `owner_id` et utiliser l’identité de la
   session. La note est créée pour Bob (201), ou la requête est refusée si le schéma de
   validation interdit les champs inconnus (400). Accepter `owner_id` serait une
   assignation de masse.

:::

### Exercice 2 — Un middleware d’autorisation plus souple

Écris `requireAnyRole(...roles)`, qui laisse passer un utilisateur dont le rôle fait partie de
la liste, et ajoute une route `GET /api/reports` accessible aux rôles `admin` et `editor`.
Que se passe-t-il si on oublie `authenticate` devant ?

:::solution
```js
function requireAnyRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ error: 'Action non autorisée' });
    }
    next();
  };
}

app.get('/api/reports', authenticate, requireAnyRole('admin', 'editor'), (req, res) => {
  res.json({ reports: [] });
});
```

Avec les clés de l’exemple, Ada (`admin`) obtient `{"reports":[]}` et Bob (`member`) un 403.
Le paramètre du reste `...roles` regroupe tous les arguments dans un tableau ; le `Set` rend
le test `has` lisible.

Sans `authenticate`, `req.user` vaut `undefined` et `req.user.role` lève une `TypeError` :
Express 5 la transmet au gestionnaire d’erreurs, qui répond 500. La route ne s’ouvre pas,
mais l’erreur masque le vrai problème. Une version plus défensive commence par
`if (!req.user) return res.status(401)…`.

:::

### Exercice 3 — Lire une migration

En t’appuyant sur `001_auth.sql`, réponds : que devient une note quand son propriétaire est
supprimé ? Pourquoi un index sur `notes.owner_id` ? Que se passe-t-il si l’application tente
d’insérer deux fois `ada@example.fr` ?

:::solution
- `ON DELETE CASCADE` sur `notes.owner_id` : les notes de l’utilisateur supprimé sont
  supprimées avec lui, comme ses sessions. Aucune note orpheline ne peut subsister.
- Presque toutes les requêtes de l’API filtrent par propriétaire
  (`WHERE owner_id = $1`) : l’index évite de parcourir toute la table.
- La seconde insertion viole la contrainte `UNIQUE` : PostgreSQL renvoie une erreur de code
  `23505` (*unique_violation*). L’application l’interceptera pour répondre 409 plutôt
  que 500. Sans mise en minuscules préalable, `Ada@Example.fr` passerait la contrainte : c’est
  pourquoi l’application normalise l’adresse.

:::

## Récapitulatif

- Identification : déclarer qui on est. Authentification : le prouver. Autorisation :
  vérifier les droits sur une action et une ressource.
- Facteurs : ce qu’on sait, possède, est ; l’authentification multifacteur en combine
  plusieurs.
- 401 = non authentifié, 403 = authentifié mais interdit, 404 = ressource d’un autre utilisateur
  (choix courant pour ne rien révéler).
- Les contrôles se font sur le serveur, à chaque requête, dans des middlewares placés dans le
  bon ordre ; refus par défaut.
- Le rôle et le propriétaire viennent de la session et de la base, jamais du corps de la
  requête.
- Le projet : tables `users`, `sessions` (empreinte du jeton) et `notes` (propriétaire), avec
  cascades de suppression.
