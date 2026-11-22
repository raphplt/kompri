---
title: Penser en modèle de menace
summary: Repérer les entrées non fiables, mesurer la surface d’attaque et lire ses risques avec le Top 10 de l’OWASP.
durationMinutes: 50
sources:
  - title: OWASP — Threat Modeling Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
  - title: OWASP Top 10 — édition 2021
    url: https://owasp.org/Top10/2021/
  - title: OWASP Top 10 — édition 2025
    url: https://owasp.org/Top10/2025/
  - title: OWASP — Input Validation Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
---

## Pourquoi commencer par le raisonnement ?

Tu sais déjà construire une API Express qui lit du JSON, interroge PostgreSQL et renvoie une
réponse. Tant que tu es le seul à l’utiliser, tout se passe bien : tu envoies des données
correctes, dans l’ordre prévu, avec les bons types. En production, ce n’est plus vrai. Ton
serveur reçoit des requêtes de n’importe qui, et certaines sont écrites **exprès** pour le
faire mal fonctionner.

La sécurité ne se résume pas à une liste de recettes à appliquer à la fin. C’est une façon
de regarder son code : « qu’est-ce que quelqu’un de malveillant pourrait envoyer ici, et que
se passerait-il ? ». Cette façon de regarder s’appelle la **modélisation des menaces**
(_threat modeling_). Cette leçon t’apprend à la pratiquer sur une petite application, puis à
classer ce que tu trouves avec une grille reconnue : le **Top 10 de l’OWASP**.

Les leçons suivantes détaillent les attaques les plus courantes et leurs parades :
injection SQL, XSS, CSRF, secrets et en-têtes.

## Le vocabulaire minimal

Quelques mots reviennent sans cesse. Ils ont un sens précis :

| Terme                  | Sens                                                                           | Exemple dans une application de notes             |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Actif                  | Ce qui a de la valeur et mérite protection                                     | Les notes privées, les comptes, la base           |
| Menace                 | Ce qui pourrait arriver de mal                                                 | Lire les notes d’un autre utilisateur             |
| Vulnérabilité          | La faiblesse qui rend la menace possible                                       | Une route qui ne vérifie pas le propriétaire      |
| Attaquant              | Celui qui exploite la faiblesse                                                | Un utilisateur inscrit un peu trop curieux        |
| Surface d’attaque      | L’ensemble des points d’entrée accessibles                                     | Les routes, les formulaires, les fichiers envoyés |
| Frontière de confiance | L’endroit où des données passent d’une zone non maîtrisée à une zone maîtrisée | L’arrivée d’une requête HTTP dans Express         |

Retiens surtout la dernière ligne. Tout ce qui **franchit une frontière de confiance** doit
être considéré comme non fiable jusqu’à preuve du contraire.

## Quatre questions pour modéliser les menaces

L’OWASP résume la démarche en quatre questions, que tu peux te poser sur une fonctionnalité
aussi petite qu’une route :

1. **Sur quoi travaillons-nous ?** Dessine le chemin des données : navigateur, API,
   base de données, services externes.
2. **Qu’est-ce qui peut mal tourner ?** Pour chaque flèche du dessin, imagine une donnée
   modifiée, volée, rejouée ou envoyée en masse.
3. **Que faisons-nous contre ?** Une parade par menace : validation, contrôle d’accès,
   échappement, limitation…
4. **Avons-nous fait du bon travail ?** Vérifie avec des tests, une relecture, un outil.

Pour la deuxième question, un moyen mnémotechnique classique est **STRIDE**, proposé à
l’origine chez Microsoft. Chaque lettre désigne une famille de menaces :

| Lettre                       | Menace                  | Question à se poser                                          |
| ---------------------------- | ----------------------- | ------------------------------------------------------------ |
| S — _Spoofing_               | Usurpation d’identité   | Quelqu’un peut-il se faire passer pour un autre ?            |
| T — _Tampering_              | Altération              | Quelqu’un peut-il modifier une donnée qu’il ne devrait pas ? |
| R — _Repudiation_            | Répudiation             | Pourra-t-on prouver qui a fait quoi ?                        |
| I — _Information disclosure_ | Fuite d’information     | Quelqu’un peut-il lire ce qui ne lui est pas destiné ?       |
| D — _Denial of service_      | Déni de service         | Quelqu’un peut-il rendre le service indisponible ?           |
| E — _Elevation of privilege_ | Élévation de privilèges | Quelqu’un peut-il obtenir plus de droits que prévu ?         |

STRIDE n’est pas une norme : c’est une **liste de contrôle** pour ne rien oublier.

## Les entrées non fiables

Dans une application Express, presque tout ce que contient `req` vient du client. Le
navigateur n’est qu’un client parmi d’autres : `curl`, un script ou un outil d’attaque peuvent
envoyer exactement ce qu’ils veulent, sans passer par ton formulaire ni par ton JavaScript.

| Partie de la requête          | Accès dans Express                            | Contrôlée par le client ?             |
| ----------------------------- | --------------------------------------------- | ------------------------------------- |
| Chemin et paramètres de route | `req.params`                                  | Oui                                   |
| Paramètres de requête         | `req.query`                                   | Oui (et peut contenir un tableau)     |
| Corps JSON                    | `req.body`                                    | Oui, structure comprise               |
| En-têtes                      | `req.get('User-Agent')`, `req.get('Origin')`… | Oui, tous                             |
| Cookies                       | `req.headers.cookie`                          | Oui : le client renvoie ce qu’il veut |
| Fichiers envoyés              | selon le middleware                           | Oui, nom et contenu                   |

Deux autres sources sont souvent oubliées :

- les **données déjà en base** qui proviennent d’utilisateurs (un pseudo, un commentaire) :
  elles ont été écrites par quelqu’un d’autre et peuvent contenir n’importe quoi ;
- les **réponses de services externes** (une API météo, un webhook) : ton code ne les
  maîtrise pas.

:::warning[La validation côté navigateur ne protège pas le serveur]
Un attribut `required` ou `maxlength`, ou une vérification en JavaScript, améliore
l’expérience de l’utilisateur honnête. Elle ne protège rien : une requête envoyée avec
`curl` ne passe jamais par ta page. Toute règle importante est **revérifiée sur le serveur**.

:::

### Un exemple concret : le prix envoyé par le client

Voici une petite boutique. La version 1 fait confiance au prix reçu ; la version 2 ne laisse
au client que le choix du produit et de la quantité.

Prépare un dossier avec Express 5 :

```bash
mkdir shop && cd shop
npm init -y
npm pkg set type=module
npm install express@5
```

Fichier `shop.js` :

```js
// shop.js — deux façons de calculer le montant d’une commande
import express from 'express';

const app = express();
app.use(express.json());

// Catalogue côté serveur : la seule source de vérité pour les prix
const catalog = new Map([
  ['teapot', { name: 'Théière en fonte', priceCents: 3900 }],
  ['cup', { name: 'Tasse en grès', priceCents: 1200 }],
]);

// VULNÉRABLE : le serveur fait confiance au prix envoyé par le client
app.post('/api/v1/orders', (req, res) => {
  const { productId, quantity, priceCents } = req.body;
  res.status(201).json({ productId, totalCents: priceCents * quantity });
});

// CORRIGÉ : le client choisit seulement quoi acheter ; le serveur valide et calcule
app.post('/api/v2/orders', (req, res) => {
  const { productId, quantity } = req.body ?? {};
  const product = catalog.get(productId);
  if (!product) {
    return res.status(400).json({ error: 'Produit inconnu' });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return res.status(400).json({ error: 'Quantité entre 1 et 20 attendue' });
  }
  res
    .status(201)
    .json({ productId, totalCents: product.priceCents * quantity });
});

app.listen(3000, () => console.log('Boutique sur http://localhost:3000'));
```

Lance `node shop.js`, puis, dans un second terminal, joue l’attaquant :

```bash
curl -s -X POST http://localhost:3000/api/v1/orders -H 'Content-Type: application/json' \
  -d '{"productId":"teapot","quantity":2,"priceCents":1}'; echo
curl -s -X POST http://localhost:3000/api/v1/orders -H 'Content-Type: application/json' \
  -d '{"productId":"teapot","quantity":-3,"priceCents":3900}'; echo
curl -s -X POST http://localhost:3000/api/v2/orders -H 'Content-Type: application/json' \
  -d '{"productId":"teapot","quantity":2,"priceCents":1}'; echo
curl -s -X POST http://localhost:3000/api/v2/orders -H 'Content-Type: application/json' \
  -d '{"productId":"teapot","quantity":-3}'; echo
curl -s -X POST http://localhost:3000/api/v2/orders -H 'Content-Type: application/json' \
  -d '{"productId":"__proto__","quantity":1}'; echo
```

Sortie :

```text
{"productId":"teapot","totalCents":2}
{"productId":"teapot","totalCents":-11700}
{"productId":"teapot","totalCents":7800}
{"error":"Quantité entre 1 et 20 attendue"}
{"error":"Produit inconnu"}
```

La version 1 accepte deux théières pour 2 centimes, puis un montant **négatif** : un
remboursement offert. La version 2 ignore le champ `priceCents` (il n’est même pas lu),
refuse la quantité négative et refuse un identifiant de produit inventé. Remarque l’usage
d’une `Map` : `catalog.get('__proto__')` renvoie `undefined`, alors qu’un objet littéral
`{ teapot: … }` aurait renvoyé `Object.prototype` pour la clé `__proto__`.

### Valider par liste blanche

La version 2 applique le principe de la **liste blanche** (_allowlist_) : on décrit ce qui est
accepté (un identifiant connu, un entier entre 1 et 20) et on refuse tout le reste. L’inverse,
la **liste noire** (_denylist_), consiste à interdire les valeurs « dangereuses » connues ; elle
échoue dès qu’un attaquant trouve une variante à laquelle tu n’avais pas pensé.

La validation vérifie qu’une donnée a **la forme attendue**. Elle ne suffit pas toujours :
un commentaire peut légitimement contenir `<` ou une apostrophe. Pour ces données, la
protection se fait au moment de l’**utilisation** : requête paramétrée pour SQL, échappement
pour HTML. Retiens la formule : **valider à l’entrée, encoder à la sortie**.

## La surface d’attaque

La surface d’attaque, c’est la liste de tout ce qu’un attaquant peut atteindre. Pour une API
Express, commence par l’inventaire :

- chaque route, avec sa méthode, ses paramètres et qui a le droit de l’appeler ;
- les fichiers servis par `express.static` (attention aux fichiers oubliés dans `public/`) ;
- les routes de diagnostic ou de test laissées actives ;
- les services exposés sur le réseau : la base PostgreSQL ne devrait jamais être joignable
  depuis Internet ;
- les dépendances npm, qui exécutent du code dans ton processus.

Réduire la surface d’attaque est souvent la parade la moins chère : une route supprimée ne
peut plus être attaquée. Deux principes accompagnent cette réduction :

- **Moindre privilège** : chaque composant n’a que les droits nécessaires. Par exemple, l’API
  se connecte à PostgreSQL avec un utilisateur qui peut lire et écrire les tables de
  l’application, mais pas supprimer la base ni créer des rôles.
- **Défense en profondeur** : plusieurs barrières indépendantes. Si l’une cède (un bug, un
  oubli), la suivante limite les dégâts. Tu en verras un exemple avec XSS : échappement
  **et** Content-Security-Policy.

## Le Top 10 de l’OWASP comme grille de lecture

L’**OWASP** (_Open Worldwide Application Security Project_) est une fondation à but non
lucratif qui publie des guides libres sur la sécurité des applications. Son document le plus
connu, le **Top 10**, classe les grandes catégories de risques observées dans les
applications web. Ce cours s’appuie sur l’édition 2021, encore très citée dans les audits,
les outils et les offres d’emploi. Une édition 2025 a depuis été publiée (voir l’encadré plus
bas) : précise donc toujours l’année quand tu cites un code comme `A03`.
Les intitulés officiels sont en anglais ; voici ceux de l’édition 2021 :

| Code     | Intitulé officiel                          | En clair                                            | Exemple dans notre pile                                               |
| -------- | ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------- |
| A01:2021 | Broken Access Control                      | Contrôle d’accès défaillant                         | `GET /api/notes/42` renvoie la note d’un autre utilisateur            |
| A02:2021 | Cryptographic Failures                     | Défaillances cryptographiques                       | Mots de passe stockés en clair, site sans HTTPS                       |
| A03:2021 | Injection                                  | Injection (SQL, commandes… et XSS)                  | Requête SQL construite par concaténation                              |
| A04:2021 | Insecure Design                            | Conception non sécurisée                            | Prix de la commande fourni par le client                              |
| A05:2021 | Security Misconfiguration                  | Mauvaise configuration                              | Messages d’erreur détaillés en production, en-têtes absents           |
| A06:2021 | Vulnerable and Outdated Components         | Composants vulnérables ou obsolètes                 | Dépendance npm avec une faille connue                                 |
| A07:2021 | Identification and Authentication Failures | Défaillances d’identification et d’authentification | Connexion sans limitation des tentatives                              |
| A08:2021 | Software and Data Integrity Failures       | Défaillances d’intégrité                            | Script chargé depuis un CDN sans contrôle d’intégrité                 |
| A09:2021 | Security Logging and Monitoring Failures   | Journalisation et surveillance insuffisantes        | Aucune trace des échecs de connexion                                  |
| A10:2021 | Server-Side Request Forgery (SSRF)         | Falsification de requête côté serveur               | Le serveur télécharge une URL fournie par l’utilisateur sans contrôle |

Dans l’édition 2021, le XSS est rangé dans la catégorie A03 (Injection) : dans les deux cas,
une donnée est interprétée comme du code.

:::note[L’édition 2025]
L’édition 2025 garde l’essentiel des risques mais change l’ordre et donc les codes : par
exemple, Injection y devient `A05:2025` et Security Misconfiguration `A02:2025`. Le SSRF est
rattaché à Broken Access Control (`A01:2025`), et deux catégories apparaissent : _Software
Supply Chain Failures_ (chaîne d’approvisionnement logicielle, qui élargit les composants
vulnérables) et _Mishandling of Exceptional Conditions_ (mauvaise gestion des erreurs et cas
anormaux). La démarche de cette leçon reste la même : passer chaque catégorie en revue et
justifier une parade.

:::

### Comment s’en servir

Le Top 10 n’est **pas** une liste exhaustive ni une norme de conformité. C’est une grille de
lecture pour relire une fonctionnalité :

1. Pour chaque route, passe les dix catégories en revue : « cette route est-elle concernée par
   A01 ? par A03 ? ».
2. Note les risques trouvés avec leur catégorie : cela donne un vocabulaire commun avec
   l’équipe et avec les outils d’audit.
3. Pour chaque risque, associe une parade et un test qui la vérifie.

Par exemple, la version 1 de la boutique relève d’**A04** (le défaut est dans la conception :
le client décide du prix) et sa correction relève de la validation côté serveur.

:::tip
Tu peux demander à une IA de t’aider à remplir une grille STRIDE ou Top 10 pour ton projet.
Traite sa réponse comme un brouillon : vérifie chaque menace sur ton propre code et
élimine celles qui ne s’appliquent pas. À l’oral, c’est toi qui dois justifier chaque ligne.

:::

## Pièges et idées reçues

- **« Personne ne connaît l’adresse de cette route. »** Les URL se devinent, apparaissent dans
  le code JavaScript envoyé au navigateur et dans l’historique. Cacher n’est pas protéger.
- **« Le champ est désactivé dans le formulaire, donc il ne peut pas changer. »** Le client
  envoie ce qu’il veut ; seul le serveur décide.
- **« L’en-tête `X-Forwarded-For` donne l’adresse IP du client. »** N’importe qui peut
  l’écrire. Il n’est fiable que s’il est ajouté par un proxy que tu contrôles et que tu as
  configuré Express pour lui faire confiance.
- **« On sécurisera à la fin. »** Une conception non sûre (A04) coûte cher à corriger après
  coup. Pose les quatre questions dès qu’une fonctionnalité est dessinée.
- **« Valider suffit. »** Valider n’empêche pas d’échapper. Un nom comme `O'Brien` est valide
  et doit pourtant être inséré sans casser une requête SQL ni une page HTML.

## Exercices

### Exercice 1 — Inventaire des entrées

Voici une route. Liste toutes les données non fiables qu’elle utilise, et pour chacune ce
qu’un attaquant pourrait tenter.

```js
app.patch('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const lang = req.get('Accept-Language') ?? 'fr';
  const { displayName, role } = req.body;
  // … met à jour l’utilisateur id avec displayName et role
  res.json({ id, displayName, role, lang });
});
```

:::solution
Entrées non fiables et tentatives possibles :

- `req.params.id` : modifier l’identifiant pour cibler **un autre utilisateur** (A01). La route
  doit vérifier que l’utilisateur connecté a le droit de modifier ce compte. `Number('abc')`
  donne aussi `NaN`, à refuser.
- `Accept-Language` : un en-tête est libre ; ici il est seulement renvoyé, mais s’il était
  inséré dans du HTML ou du SQL, il faudrait l’échapper ou le paramétrer.
- `displayName` : chaîne arbitraire, éventuellement très longue ou contenant du HTML. À
  valider (type, longueur) puis à échapper au moment de l’affichage (XSS stockée).
- `role` : c’est le défaut le plus grave. Un utilisateur peut s’attribuer `"admin"`
  (élévation de privilèges, le « E » de STRIDE, A01). Le rôle ne doit **jamais** être lu dans le
  corps d’une requête d’utilisateur ordinaire. On parle d’**assignation de masse** (_mass
  assignment_) quand un serveur recopie tous les champs reçus.
- Le corps entier : `req.body` peut être `undefined` si le client n’envoie pas de JSON ; la
  déstructuration planterait. Un `req.body ?? {}` et une validation explicite évitent l’erreur.

:::

### Exercice 2 — Une grille de lecture

Une application de prise de notes propose : inscription, connexion, création de notes,
partage d’une note par lien public, import d’une image depuis une URL. Pour chacune des
situations suivantes, donne la catégorie du Top 10 2021 la plus pertinente et une parade.

1. Le lien public d’une note est `/share/1`, `/share/2`, etc.
2. Le serveur va chercher l’image à l’URL fournie, y compris `http://localhost:5432`.
3. Le mot de passe est stocké en SHA-256 sans sel.
4. Le paquet npm utilisé pour lire les images n’a pas été mis à jour depuis des années et a
   une faille publiée.
5. Les échecs de connexion ne laissent aucune trace.

:::solution

1. **A01 Broken Access Control** : les identifiants séquentiels se devinent. Parade : un
   jeton de partage aléatoire et long (par exemple 32 octets de `crypto.randomBytes`), et la
   possibilité de révoquer le partage.
2. **A10 Server-Side Request Forgery (SSRF)** : le serveur devient un relais vers le réseau
   interne. Parade : liste blanche de schémas (`https:` seulement) et de domaines, refus des
   adresses internes, ou suppression de la fonctionnalité au profit d’un envoi de fichier.
3. **A02 Cryptographic Failures** : SHA-256 est trop rapide et l’absence de sel permet les
   tables précalculées. Parade : un algorithme de hachage de mots de passe (scrypt, Argon2id,
   bcrypt), vu dans la compétence suivante.
4. **A06 Vulnerable and Outdated Components** : parade `npm audit`, mise à jour ou
   remplacement de la dépendance, et suivi régulier.
5. **A09 Security Logging and Monitoring Failures** : parade : journaliser les échecs (sans le
   mot de passe !) avec l’heure, l’adresse IP et l’identifiant visé, et alerter en cas de
   rafale.

Plusieurs réponses peuvent se défendre : la 1 est aussi un problème de conception (A04).
L’important est de justifier la catégorie et de proposer une parade vérifiable.

:::

### Exercice 3 — Corriger une validation par liste noire

Ce validateur de nom de fichier veut empêcher de sortir du dossier `uploads/`. Explique
pourquoi il est insuffisant et réécris-le par liste blanche : seules les lettres minuscules,
chiffres et tirets sont acceptés, suivis de `.png` ou `.jpg`, 64 caractères au plus.

```js
function isSafeFileName(name) {
  return !name.includes('../');
}
```

:::solution
La liste noire oublie des variantes : `..\` sous Windows, un chemin absolu comme
`/etc/passwd`, ou le nom `..` tout seul. Elle laisse aussi passer des noms vides, très longs ou
avec des caractères de contrôle.

```js
function isSafeFileName(name) {
  // Liste blanche : on décrit exactement ce qui est accepté
  return typeof name === 'string' && /^[a-z0-9-]{1,60}\.(png|jpg)$/.test(name);
}

console.log(isSafeFileName('photo-1.png'));
console.log(isSafeFileName('../secret.png'));
console.log(isSafeFileName('/etc/passwd'));
console.log(isSafeFileName('Photo.PNG'));
```

Sortie :

```text
true
false
false
false
```

`^` et `$` imposent que **toute** la chaîne corresponde. Le nom fait au plus 60 + 4 = 64
caractères. Le refus de `Photo.PNG` est un choix assumé : la liste blanche préfère refuser un
cas légitime rare plutôt qu’accepter un cas dangereux.

:::

## Récapitulatif

- La modélisation des menaces répond à quatre questions : sur quoi travaillons-nous, qu’est-ce
  qui peut mal tourner, que faisons-nous contre, avons-nous fait du bon travail ?
- STRIDE aide à imaginer les menaces : usurpation, altération, répudiation, fuite, déni de
  service, élévation de privilèges.
- Tout ce qui franchit une frontière de confiance est non fiable : paramètres, corps,
  en-têtes, cookies, fichiers, mais aussi données d’utilisateurs déjà en base.
- Le serveur décide : il ne fait jamais confiance à un prix, un rôle ou un identifiant fourni
  par le client sans le vérifier.
- Valider à l’entrée par liste blanche, encoder à la sortie selon le contexte.
- Réduire la surface d’attaque, appliquer le moindre privilège et la défense en profondeur.
- Le Top 10 de l’OWASP (édition 2021 : A01 Broken Access Control à A10 SSRF) est une grille de
  lecture commune, pas une liste exhaustive.
