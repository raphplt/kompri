---
title: Stocker les mots de passe
summary: Hacher les mots de passe avec scrypt, un sel aléatoire et une comparaison en temps constant, et connaître Argon2id et bcrypt.
durationMinutes: 55
sources:
  - title: OWASP — Password Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - title: Node.js — crypto.scrypt()
    url: https://nodejs.org/api/crypto.html
  - title: CNIL — Mots de passe, recommandations pour maîtriser sa sécurité
    url: https://www.cnil.fr/fr/mots-de-passe-recommandations-pour-maitriser-sa-securite
  - title: OWASP — Authentication Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
---

## Le problème : ta base va fuiter un jour

Il faut concevoir le stockage des mots de passe en partant d’une hypothèse pessimiste : un
jour, quelqu’un lira ta table `users`. Une injection SQL oubliée, une sauvegarde mal rangée,
un accès volé : les causes ne manquent pas. Ce jour-là, que trouvera-t-il ?

- **En clair** : tous les mots de passe, directement utilisables… y compris sur les autres
  sites où tes utilisateurs ont réutilisé le même. C’est la pire situation.
- **Chiffrés** : quiconque obtient aussi la clé de déchiffrement (souvent stockée sur le même
  serveur) retrouve tous les mots de passe.
- **Hachés correctement** : l’attaquant doit deviner chaque mot de passe un par un, et chaque
  essai lui coûte cher. C’est ce qu’on vise.

Un **hachage** est une fonction à sens unique : facile à calculer, impossible à inverser. Pour
vérifier un mot de passe, on ne le « déchiffre » pas : on hache la saisie et on compare les
empreintes. Le serveur n’a jamais besoin de connaître le mot de passe d’origine.

## Pourquoi pas SHA-256 ?

SHA-256 est une excellente fonction de hachage… pour vérifier l’intégrité d’un fichier. Pour
des mots de passe, elle a deux défauts. Observe-les :

```js
// fast-hash.js — pourquoi SHA-256 seul ne convient pas aux mots de passe
import { createHash, randomBytes } from 'node:crypto';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// 1. Sans sel : deux utilisateurs avec le même mot de passe ont la même empreinte
console.log('ada :', sha256('azerty123'));
console.log('bob :', sha256('azerty123'));

// 2. Avec un sel aléatoire, les empreintes diffèrent
const saltAda = randomBytes(16).toString('hex');
const saltBob = randomBytes(16).toString('hex');
console.log(sha256(saltAda + 'azerty123') === sha256(saltBob + 'azerty123'));

// 3. Mais SHA-256 reste beaucoup trop rapide
const start = performance.now();
let count = 0;
while (performance.now() - start < 1000) {
  sha256(`candidat-${count}`);
  count += 1;
}
console.log(`${count} essais en une seconde, sur un seul cœur de processeur`);
```

Sortie (`node fast-hash.js` ; le dernier nombre dépend de ta machine) :

```text
ada : f3029a66c61b61b41b428963a2fc134154a5383096c776f3b4064733c5463d90
bob : f3029a66c61b61b41b428963a2fc134154a5383096c776f3b4064733c5463d90
false
1151624 essais en une seconde, sur un seul cœur de processeur
```

1. **Sans sel**, deux mots de passe identiques donnent la même empreinte. L’attaquant voit
   immédiatement qui partage un mot de passe, et peut utiliser des **tables précalculées**
   (empreintes de millions de mots de passe courants, calculées une fois pour toutes).
2. Le **sel** (*salt*) est une valeur aléatoire, propre à chaque utilisateur, mélangée au mot
   de passe avant hachage. Il n’est pas secret : on le stocke à côté de l’empreinte. Il rend
   les tables précalculées inutiles et oblige à attaquer chaque compte séparément.
3. Mais même salé, SHA-256 se calcule **trop vite** : plus d’un million d’essais par seconde
   sur un seul cœur de processeur ordinaire, et beaucoup plus sur des cartes graphiques.
   Un mot de passe faible tombe en quelques instants.

Il faut donc une fonction **lente exprès**, et si possible gourmande en **mémoire** pour
gêner le calcul massivement parallèle. Ces fonctions ont des paramètres de coût qu’on
augmente quand le matériel progresse.

## Les algorithmes adaptés

L’OWASP (Password Storage Cheat Sheet) recommande, par ordre de préférence :

| Algorithme | Quand l’utiliser | Configuration minimale recommandée par l’OWASP |
| --- | --- | --- |
| **Argon2id** | Premier choix | Par exemple 19 Mio de mémoire, 2 itérations, parallélisme 1 |
| **scrypt** | Si Argon2id n’est pas disponible | Par exemple N=2^17 (128 Mio), r=8, p=1 |
| **bcrypt** | Systèmes existants | Facteur de travail d’au moins 10 ; entrée limitée à 72 octets |
| **PBKDF2** | Si une conformité FIPS-140 est exigée | 600 000 itérations avec HMAC-SHA-256 |

L’OWASP propose pour Argon2id et scrypt plusieurs configurations équivalentes qui échangent
mémoire contre calcul ; consulte la fiche pour les autres combinaisons et vérifie les valeurs
à jour avant un projet réel : ces minimums évoluent avec le matériel.

Dans ce cours, on utilise **scrypt**, intégré à Node.js depuis longtemps dans le module
`node:crypto` : aucune dépendance à installer. Pour Argon2id, des paquets npm existent, et les
versions récentes de Node.js 24 (à partir de la 24.7.0) proposent aussi `crypto.argon2()`.
bcrypt reste très répandu : si tu le rencontres, retiens que la plupart de ses
implémentations n’acceptent que 72 octets en entrée ; selon la bibliothèque, la suite du mot
de passe est ignorée ou l’entrée est refusée.

## Le module `password.js`

Crée `src/password.js` dans le projet de notes :

```js
// password.js — hachage et vérification des mots de passe avec scrypt
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Paramètres minimaux recommandés par l’OWASP pour scrypt : N=2^17, r=8, p=1
const COST = 2 ** 17; // N : coût mémoire et calcul
const BLOCK_SIZE = 8; // r
const PARALLELISM = 1; // p
const KEY_LENGTH = 64; // octets produits
const MAX_MEMORY = 256 * 1024 * 1024; // N=2^17 et r=8 demandent 128 Mio ; la limite par défaut est 32 Mio

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  });
  // On stocke l’algorithme et ses paramètres avec le sel et l’empreinte
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password, stored) {
  const [algorithm, n, r, p, saltText, hashText] = stored.split('$');
  if (algorithm !== 'scrypt') throw new Error('Format d’empreinte inconnu');
  const expected = Buffer.from(hashText, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltText, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  // Comparaison en temps constant : la durée ne dépend pas des octets identiques
  return timingSafeEqual(actual, expected);
}
```

Détaillons les choix :

- **`promisify(scrypt)`** : `crypto.scrypt` utilise un *callback* ; `util.promisify` le
  transforme en fonction qui renvoie une promesse, utilisable avec `await`. Le calcul se fait
  hors du fil principal : pendant ce temps, le serveur continue de répondre aux autres requêtes.
  N’utilise pas `scryptSync` dans un serveur : il bloquerait toutes les requêtes pendant le
  calcul.
- **Un sel de 16 octets** tiré par `randomBytes`, le générateur cryptographique de Node.js.
  Jamais `Math.random()`, qui n’est pas conçu pour la sécurité.
- **`maxmem`** : Node.js refuse par défaut un calcul qui dépasse 32 Mio. Avec N=2^17 et r=8,
  scrypt a besoin d’environ 128 × N × r octets, soit 128 Mio. Sans cette option, l’appel
  échoue avec `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` et le message
  `Invalid scrypt params: error:030000AC:digital envelope routines::memory limit exceeded`.
- **Le format stocké** `scrypt$N$r$p$sel$empreinte` garde les paramètres avec l’empreinte. Le
  jour où tu augmentes le coût, les anciennes empreintes restent vérifiables, et tu pourras les
  recalculer à la prochaine connexion de chaque utilisateur.
- **`timingSafeEqual`** compare deux tampons de même longueur en un temps qui ne dépend pas de
  leur contenu. Une comparaison ordinaire s’arrête à la première différence : en mesurant
  finement les durées, un attaquant pourrait en tirer de l’information. `actual` est calculé
  avec la longueur de `expected`, donc les deux tampons ont toujours la même taille.

Essaie-le :

```js
// try-password.js — essai du module de hachage
import { hashPassword, verifyPassword } from './src/password.js';

const password = 'cheval agrafe batterie correcte';

console.time('hachage');
const first = await hashPassword(password);
console.timeEnd('hachage');
const second = await hashPassword(password);

console.log(first);
console.log(first === second);
console.log(await verifyPassword(password, first));
console.log(await verifyPassword(password, second));
console.log(await verifyPassword('cheval agrafe batterie correctE', first));
```

Sortie (`node try-password.js` ; la durée, le sel et l’empreinte changent à chaque fois) :

```text
hachage: 321.188ms
scrypt$131072$8$1$O3U53zYi9OrzlzMRyglYFg==$oBkzxobb6mKNPEmkeV/gtkR7zTcAklu7Dc5ijERK97+tHsaSgIRC0bCHtCLK5CIGeTpcIADXE7mZMaD62kBldQ==
false
true
true
false
```

- Un hachage prend environ un tiers de seconde sur la machine de test : imperceptible pour
  un utilisateur qui se connecte, ruineux pour un attaquant qui doit répéter ce calcul des
  milliards de fois.
- Deux hachages du **même** mot de passe diffèrent (`false`) grâce au sel, et pourtant tous les
  deux se vérifient (`true`, `true`).
- Une seule lettre différente suffit à refuser le mot de passe.

:::warning[La mémoire est une ressource]
Chaque hachage mobilise 128 Mio pendant son calcul. Si mille requêtes de connexion arrivent en
même temps, le serveur souffre : c’est une des raisons de **limiter les tentatives** (leçon
suivante). L’OWASP propose aussi des configurations moins gourmandes en mémoire et plus en
calcul (par exemple N=2^16, r=8, p=2) : choisis selon ton serveur, mais ne descends pas
sous les minimums.

:::

## La route d’inscription

Voici une première version de l’inscription, sans session (elle sera ajoutée à la leçon
suivante) :

```js
// src/register-demo.js — inscription avec mot de passe haché
import express from 'express';
import pg from 'pg';
import { hashPassword } from './password.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json({ limit: '10kb' }));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide' });
  }
  if (password.length < 15 || password.length > 128) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir de 15 à 128 caractères' });
  }
  const passwordHash = await hashPassword(password);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash],
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse' });
    }
    throw error; // Express 5 transmet l’erreur au gestionnaire d’erreurs
  }
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

Lance `node src/register-demo.js` (avec `DATABASE_URL` défini) puis :

```bash
curl -s -w ' %{http_code}\n' -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":" Ada@Example.fr ","password":"cheval agrafe batterie correcte"}'
curl -s -w ' %{http_code}\n' -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"un autre mot de passe long"}'
curl -s -w ' %{http_code}\n' -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' -d '{"email":"bob@example.fr","password":"azerty123"}'
psql notes_auth -c "SELECT id, email, left(password_hash, 30) AS debut_empreinte FROM users"
```

```text
{"user":{"id":1,"email":"ada@example.fr"}} 201
{"error":"Un compte existe déjà avec cette adresse"} 409
{"error":"Le mot de passe doit contenir de 15 à 128 caractères"} 400
 id |     email      |        debut_empreinte
----+----------------+--------------------------------
  1 | ada@example.fr | scrypt$131072$8$1$O7j2bqHZGLZt
(1 row)
```

L’adresse a été nettoyée (`trim`, minuscules) avant l’enregistrement ; la seconde inscription
heurte la contrainte `UNIQUE` (code PostgreSQL `23505`), transformée en 409 ; la base ne
contient qu’une empreinte. La réponse ne renvoie **jamais** `password_hash` : la requête
`RETURNING` ne sélectionne que `id` et `email`.

### Quelle politique de mot de passe ?

Les recommandations ont beaucoup évolué. Aujourd’hui, l’OWASP (Authentication Cheat Sheet,
qui s’appuie sur le NIST) conseille notamment :

- d’imposer une **longueur minimale** : sans authentification multifacteur, un mot de passe de
  moins de 15 caractères y est jugé faible ;
- d’accepter au moins **64 caractères** pour permettre les phrases de passe, sans tronquer ;
- d’accepter **tous les caractères**, espaces et Unicode compris, **sans règles de composition**
  imposées (majuscule, chiffre, caractère spécial) ;
- de refuser les mots de passe courants ou déjà divulgués (liste de blocage) ;
- de ne **pas** imposer de changement périodique, mais d’en exiger un en cas de fuite.

La CNIL, dans sa recommandation de 2022, raisonne en **entropie** : elle fixe un niveau minimal
de 80 bits pour un mot de passe sans mesure complémentaire, et donne des exemples équivalents,
comme 12 caractères mêlant majuscules, minuscules, chiffres et caractères spéciaux, ou
14 caractères mêlant majuscules, minuscules et chiffres. Elle a aussi abandonné l’obligation de
renouvellement périodique pour les comptes ordinaires.

Ces deux sources ne formulent pas les règles de la même façon, mais vont dans le même sens :
privilégier la longueur. Notre API exige de 15 à 128 caractères, sans règle de composition ;
la limite haute évite qu’un client envoie un « mot de passe » de plusieurs mégaoctets.

## Pièges et idées reçues

- **« J’ai chiffré les mots de passe avec AES. »** Un chiffrement se déchiffre. Pour vérifier
  un mot de passe, on n’a besoin que d’un hachage.
- **« J’ai haché avec SHA-256 et un sel, c’est suffisant. »** Le sel ne ralentit pas
  l’attaquant ; seul un algorithme lent et coûteux en mémoire le fait.
- **« Le sel doit rester secret. »** Non : il est stocké avec l’empreinte. Une valeur secrète
  supplémentaire, gardée hors de la base, s’appelle un **poivre** (*pepper*) ; c’est une
  défense en profondeur facultative.
- **Comparer avec `===`.** Compare toujours des empreintes avec `timingSafeEqual`.
- **Journaliser le corps de `/register` ou `/login`.** Le mot de passe finit en clair dans les
  journaux.
- **Une même lettre, deux écritures.** En Unicode, `é` peut s’écrire en un caractère ou en deux
  (`e` suivi d’un accent combinant) : `'é'.normalize('NFD').length` vaut 2. Deux claviers
  peuvent ainsi produire des octets différents pour un mot de passe identique à l’œil. Certains
  projets normalisent la saisie (`normalize('NFC')`) avant de la hacher ; si tu le fais, fais-le
  **toujours**, à l’inscription comme à la connexion.

## Exercices

### Exercice 1 — Lire une empreinte

Voici une valeur de la colonne `password_hash` :
`scrypt$131072$8$1$O3U53zYi9OrzlzMRyglYFg==$oBkzxobb…`. Explique chaque partie. Un attaquant
qui lit cette valeur peut-il se connecter ? Que doit-il faire pour retrouver le mot de passe ?

:::solution
- `scrypt` : l’algorithme ;
- `131072` : N = 2^17, le coût ; `8` : r, la taille de bloc ; `1` : p, le parallélisme ;
- `O3U53zYi9OrzlzMRyglYFg==` : le sel de 16 octets, encodé en base64 ;
- la dernière partie : l’empreinte de 64 octets, en base64.

L’attaquant ne peut pas se connecter avec cette valeur : la route de connexion attend un mot
de passe, qu’elle hache à nouveau. Pour retrouver le mot de passe, il doit **deviner** des
candidats et calculer scrypt avec ce sel et ces paramètres pour chacun, soit environ un tiers de
seconde et 128 Mio de mémoire par essai sur une machine comme la nôtre. Un mot de passe long et
peu prévisible devient hors de portée ; un mot de passe très courant reste vulnérable, d’où les
listes de blocage.

:::

### Exercice 2 — Augmenter le coût sans casser les comptes

Tu veux passer un jour à des paramètres plus élevés. Écris une fonction
`needsRehash(stored)` qui renvoie `true` si une empreinte n’utilise pas l’algorithme et les
paramètres actuels. Explique ensuite où l’appeler.

:::solution
```js
import { hashPassword } from './src/password.js';

const CURRENT = { n: 2 ** 17, r: 8, p: 1 };

export function needsRehash(stored) {
  const [algorithm, n, r, p] = stored.split('$');
  return (
    algorithm !== 'scrypt' ||
    Number(n) !== CURRENT.n ||
    Number(r) !== CURRENT.r ||
    Number(p) !== CURRENT.p
  );
}

console.log(needsRehash('scrypt$16384$8$1$c2VsLXNlbC1zZWw=$ZW1wcmVpbnRl'));
console.log(needsRehash(await hashPassword('cheval agrafe batterie correcte')));
console.log(needsRehash('5f4dcc3b5aa765d61d8327deb882cf99'));
```

```text
true
false
true
```

On l’appelle dans la route de connexion, **après** une vérification réussie : c’est le seul
moment où le serveur dispose du mot de passe en clair. Si `needsRehash` renvoie `true`, on
calcule une nouvelle empreinte et on met à jour `users.password_hash`. Les comptes inactifs
gardent leur ancienne empreinte : l’OWASP signale qu’on peut, selon le contexte, exiger une
réinitialisation pour ne pas conserver indéfiniment des empreintes faibles. La troisième ligne
montre qu’une ancienne empreinte MD5 (sans paramètres) est elle aussi détectée.

:::

### Exercice 3 — Réparer un hachage maison

Une IA a proposé ce code. Relève les problèmes et réécris la vérification avec le module
`password.js`.

```js
import { createHash } from 'node:crypto';

const SALT = 'kompri';

export function hash(password) {
  return createHash('sha256').update(SALT + password).digest('hex');
}

export function check(password, stored) {
  return hash(password) === stored;
}
```

:::solution
- **Sel unique pour tous** (`'kompri'`) : deux utilisateurs avec le même mot de passe ont la
  même empreinte, et une table précalculée pour ce sel suffit pour toute la base.
- **SHA-256** est beaucoup trop rapide.
- **Comparaison `===`** : pas en temps constant.
- **Pas de paramètres stockés** : impossible de faire évoluer l’algorithme proprement.

```js
import { hashPassword, verifyPassword } from './src/password.js';

export async function hash(password) {
  return hashPassword(password); // sel aléatoire, scrypt, paramètres stockés
}

export async function check(password, stored) {
  return verifyPassword(password, stored); // timingSafeEqual
}
```

Les fonctions deviennent asynchrones : tous les appelants doivent utiliser `await`. Les
empreintes existantes, en SHA-256, ne se convertissent pas : on les vérifie avec l’ancienne
méthode une dernière fois à la connexion, puis on enregistre une empreinte scrypt (principe de
l’exercice 2), ou on demande une réinitialisation.

:::

## Récapitulatif

- On ne stocke ni ne chiffre les mots de passe : on les **hache** avec un algorithme lent et
  coûteux en mémoire.
- Ordre de préférence de l’OWASP : Argon2id, puis scrypt, bcrypt pour l’existant, PBKDF2 si
  FIPS est exigé. Minimum OWASP pour scrypt : N=2^17, r=8, p=1.
- Un sel aléatoire par mot de passe (`randomBytes(16)`), stocké avec l’empreinte et les
  paramètres.
- `promisify(scrypt)` pour ne pas bloquer le serveur, `maxmem` pour autoriser 128 Mio,
  `timingSafeEqual` pour comparer.
- Politique : privilégier la longueur (OWASP : au moins 15 caractères sans multifacteur,
  au moins 64 acceptés), pas de règles de composition imposées, pas de renouvellement
  périodique ; la CNIL fixe un minimum de 80 bits d’entropie.
- L’inscription normalise l’e-mail, transforme la violation d’unicité en 409 et ne renvoie
  jamais l’empreinte.
