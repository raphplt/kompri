---
title: Tester une API avec curl et les outils du navigateur
summary: Écrire des requêtes reproductibles avec curl, automatiser un scénario de test et passer du navigateur au terminal pour diagnostiquer.
durationMinutes: 60
sources:
  - title: curl — Manuel de référence (en anglais)
    url: https://curl.se/docs/manpage.html
  - title: Chrome for Developers — Network features reference
    url: https://developer.chrome.com/docs/devtools/network/reference
  - title: Firefox Source Docs — Network Monitor
    url: https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/
---

Tu sais maintenant lire et écrire des messages HTTP, choisir méthodes, codes et
en-têtes, et comprendre cookies et CORS. Reste à en faire un **outil de travail** :
vérifier qu’une API se comporte comme prévu, reproduire un bug signalé par un
utilisateur, transmettre à un collègue une requête qu’il pourra rejouer à l’identique.

Deux outils se complètent. **curl** donne des requêtes **précises et reproductibles**,
que l’on peut écrire dans un fichier et rejouer. Les **outils de développement** du
navigateur montrent ce que l’application envoie **réellement**, avec ses cookies et ses
en-têtes. Cette leçon t’apprend à passer de l’un à l’autre.

Pour les exemples, relance l’API des notes de la leçon 2 :

```bash
node notes-server.mjs
```

## curl : l’aide-mémoire

Tu as déjà utilisé la plupart de ces options. Les voici rassemblées :

| Option                     | Effet                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| `-i`                       | Affiche ligne de statut et en-têtes de réponse avant le corps      |
| `-I`                       | Envoie une requête `HEAD`                                          |
| `-v`                       | Mode bavard : requête (`>`), réponse (`<`) et informations (`*`)   |
| `-X MÉTHODE`               | Choisit la méthode (`-X DELETE`)                                   |
| `-H 'Nom: valeur'`         | Ajoute un en-tête de requête (répétable)                           |
| `-d 'données'`             | Envoie un corps ; passe en `POST` et annonce un formulaire par défaut |
| `--json 'données'`         | Envoie du JSON avec les bons `Content-Type` et `Accept` (curl 7.82 ou plus) |
| `-u nom:motdepasse`        | Authentification `Basic`                                           |
| `-c fichier`, `-b fichier` | Enregistre les cookies reçus, envoie les cookies d’un fichier      |
| `-L`                       | Suit les redirections                                              |
| `-s`, `-S`                 | Silencieux (pas de barre de progression) ; `-S` réaffiche les erreurs |
| `-o fichier`               | Écrit le corps dans un fichier (`-o /dev/null` pour l’ignorer)     |
| `-w 'format'`              | Affiche des informations après la requête (`%{http_code}`…)        |
| `-f`                       | Échoue (code de sortie non nul) si le statut est 400 ou plus       |

Deux règles de saisie, valables dans bash et zsh :

- entoure les URL qui contiennent `?` ou `&` de guillemets simples, sinon le shell
  interprète ces caractères : `curl 'http://localhost:3000/notes?done=true&sort=id'` ;
- entoure aussi les corps JSON de guillemets **simples**, pour que les guillemets
  doubles du JSON arrivent intacts.

:::warning[Windows]
Dans PowerShell, utilise `curl.exe`, et sache que les règles de guillemets diffèrent
fortement : un JSON entre guillemets simples peut perdre ses guillemets doubles en
route. Pour ce cours, utilise WSL ou Git Bash, où les commandes s’écrivent exactement
comme ici.

:::

### N’afficher que l’essentiel

Pour tester, on veut souvent **seulement le code de statut** :

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/notes
```

```text
200
```

`-o /dev/null` jette le corps, `-s` supprime la barre de progression, et `-w` affiche le
code suivi d’un saut de ligne. D’autres variables sont disponibles :

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' http://localhost:3000/notes/42
```

```text
404 application/json; charset=utf-8 29
```

Pour garder le corps dans un fichier tout en voyant les en-têtes, `-D -` écrit les
en-têtes sur la sortie standard :

```bash
curl -s -D - -o note.json http://localhost:3000/notes/1
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 48
Date: Sat, 21 Nov 2026 21:49:36 GMT
Connection: keep-alive
Keep-Alive: timeout=5

```

Le fichier `note.json` contient `{"id":1,"text":"Lire la RFC 9110","done":false}`.

:::tip
Si l’outil `jq` est installé sur ta machine, `curl -s http://localhost:3000/notes | jq .`
affiche le JSON indenté et coloré. Ce n’est pas indispensable : les outils de
développement du navigateur mettent aussi le JSON en forme.

:::

### Codes de sortie : quand curl échoue-t-il ?

Pour curl, recevoir une réponse `404` n’est **pas** un échec : l’échange HTTP a réussi.
Son **code de sortie** (le nombre qu’un programme renvoie au shell en se terminant, `0`
signifiant le succès) vaut donc `0`. Avec `-f`, curl considère tout statut supérieur ou
égal à 400 comme un échec :

```bash
curl -sSf http://localhost:3000/notes/42
echo $?
```

```text
curl: (22) The requested URL returned error: 404
22
```

`$?` affiche le code de sortie de la dernière commande. Les échecs réseau ont leurs
propres codes, quelle que soit l’option `-f` :

```bash
curl -sS http://nexistepas.invalid/
```

```text
curl: (6) Could not resolve host: nexistepas.invalid
```

```bash
curl -sS http://localhost:59999/
```

```text
curl: (7) Failed to connect to localhost port 59999 after 0 ms: Couldn't connect to server
```

Tu reconnais les étapes vues dans « Fonctionnement du web » : `6` est un échec DNS, `7`
une connexion refusée, `22` une réponse d’erreur HTTP. Le nombre de millisecondes peut
varier.

## Rendre ses tests reproductibles

Taper des commandes à la main convient pour explorer. Pour **vérifier** une API après
chaque modification, on écrit un **scénario** dans un fichier : n’importe qui peut le
relancer et obtenir le même verdict. Crée `test-notes.sh` à côté du serveur :

```bash
#!/usr/bin/env bash
# Scénario de test de l’API des notes.
# Prérequis : node notes-server.mjs tourne dans un autre terminal.
base='http://localhost:3000'
failures=0

# check CODE_ATTENDU DESCRIPTION OPTIONS_CURL...
check() {
  local expected=$1 description=$2
  shift 2
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [ "$status" = "$expected" ]; then
    echo "OK     $description ($status)"
  else
    echo "ÉCHEC  $description : attendu $expected, reçu $status"
    failures=$((failures + 1))
  fi
}

check 200 'lister les notes' "$base/notes"
check 201 'créer une note' -H 'Content-Type: application/json' -d '{"text":"Test"}' "$base/notes"
check 415 'refuser un formulaire' -d 'text=Test' "$base/notes"
check 400 'refuser un texte vide' -H 'Content-Type: application/json' -d '{"text":" "}' "$base/notes"
check 400 'refuser un JSON invalide' -H 'Content-Type: application/json' -d '{text}' "$base/notes"
check 404 'note inexistante' "$base/notes/999"
check 405 'PATCH non autorisé' -X PATCH "$base/notes/1"
check 200 'HEAD sur une note' -I "$base/notes/1"

echo "Échecs : $failures"
[ "$failures" -eq 0 ]
```

Tu n’as pas besoin de maîtriser tous les détails de bash : la fonction `check` lance
curl avec les options données, compare le code reçu au code attendu et compte les
échecs. La dernière ligne fait réussir le script seulement s’il n’y a aucun échec.

```bash
bash test-notes.sh
```

```text
OK     lister les notes (200)
OK     créer une note (201)
OK     refuser un formulaire (415)
OK     refuser un texte vide (400)
OK     refuser un JSON invalide (400)
OK     note inexistante (404)
OK     PATCH non autorisé (405)
OK     HEAD sur une note (200)
Échecs : 0
```

Un bon scénario couvre le **cas nominal** (tout va bien), les **erreurs du client**
(chaque code `4xx` prévu) et les **cas limites** (texte fait d’espaces, identifiant
inexistant). Il est **indépendant de l’ordre** quand c’est possible : ici, aucune
vérification ne dépend de la note créée par une autre. Plus tard, dans le parcours, tu
écriras ce genre de vérifications en JavaScript avec `node:test`.

## Les outils du navigateur pour une API

### Observer les appels d’une page

Dans une application web, ce n’est pas toi qui tapes les requêtes : c’est le JavaScript
de la page. Pour les voir, ouvre le panneau **Réseau**, filtre sur **Fetch/XHR**, et
utilise l’application. Pour chaque appel, l’onglet **En-têtes** donne méthode, URL,
statut et en-têtes ; **Charge utile** (*Payload*) le corps envoyé ; **Aperçu** et
**Réponse** le corps reçu, JSON mis en forme.

Tu peux aussi appeler l’API directement depuis la **console**. Ouvre
`http://localhost:3000/notes` dans le navigateur (la page affiche le JSON), puis colle
dans la console :

```js
const response = await fetch('/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Depuis la console' }),
});
console.log(response.status, response.headers.get('location'));
console.log(await response.json());
```

La console affiche `201` suivi de l’adresse `/notes/…` de la nouvelle note, puis l’objet
créé. La requête apparaît aussi dans le panneau Réseau : la page et l’API ont la même
origine, il n’y a donc aucune question de CORS.

### Rejouer et modifier une requête

- **Rejouer** : dans Chrome, clic droit sur une requête Fetch/XHR, **Replay XHR** la
  renvoie à l’identique. Dans Firefox, **Renvoyer** et **Modifier et renvoyer**
  (*Resend*, *Edit and Resend*) permettent même de changer la méthode, les en-têtes ou le corps avant l’envoi.
- **Copier en cURL** : clic droit, **Copier**, **Copier en tant que cURL**. Tu obtiens une
  commande qui reproduit la requête du navigateur, avec **tous** ses en-têtes. Sous
  Windows, Chrome propose une version « cmd » et une version « bash » : choisis bash
  pour WSL ou Git Bash.

La commande copiée ressemble à ceci (les valeurs dépendent de ton navigateur) :

```bash
curl 'http://localhost:3000/notes' \
  -H 'Accept: */*' \
  -H 'Accept-Language: fr-FR,fr;q=0.9' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/notes' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) …' \
  --data-raw '{"text":"Depuis la console"}'
```

Le `\` en fin de ligne permet de poursuivre la commande sur la ligne suivante.
`--data-raw` est une variante de `-d` qui envoie les données sans interprétation
particulière.

### Du navigateur au terminal : la démarche de diagnostic

Quand un utilisateur signale « l’enregistrement échoue » :

1. **Reproduis dans le navigateur**, panneau Réseau ouvert : trouve la requête en échec,
   note son statut et le corps de la réponse d’erreur.
2. **Copie-la en cURL** et rejoue-la dans le terminal : obtiens-tu le même statut ?
3. **Réduis** la commande : retire un à un les en-têtes inutiles (`User-Agent`,
   `Accept-Language`, `Referer`…) en vérifiant que le comportement ne change pas. Tu
   obtiens la requête **minimale** qui provoque le bug.
4. **Fais varier un seul élément** à la fois (une valeur du corps, un en-tête) pour
   isoler la cause.
5. **Ajoute le cas** à ton scénario de test, pour que le bug ne revienne pas.

:::warning[Ne partage pas tes cookies]
Une commande copiée depuis le navigateur contient souvent l’en-tête `Cookie` ou
`Authorization` avec **ta** session. Avant de la coller dans un ticket ou une
discussion, retire ces en-têtes ou remplace leur valeur. Un jeton publié doit être
considéré comme compromis et révoqué.

:::

### curl ou navigateur : qui voit quoi ?

| Aspect                         | Navigateur                                | curl                                   |
| ------------------------------ | ----------------------------------------- | -------------------------------------- |
| Cookies                        | Envoyés automatiquement selon leurs attributs | Seulement avec `-b`                 |
| CORS                           | Appliqué (blocage de lecture, prévol)     | Ignoré                                 |
| Redirections                   | Suivies automatiquement                   | Seulement avec `-L`                    |
| En-têtes ajoutés               | Nombreux (`User-Agent`, `Accept-Language`, `Origin`…) | Le minimum, plus ce que tu ajoutes |
| Cache                          | Utilisé (sauf « Désactiver le cache »)    | Aucun                                  |

C’est pour cela qu’une requête peut réussir avec curl et échouer dans le navigateur
(CORS, cookie absent à cause de `SameSite`), ou l’inverse (cookie présent dans le
navigateur mais pas dans ta commande).

## Pièges et idées reçues

**« curl a renvoyé 0, donc l’API fonctionne. »** Sans `-f`, curl renvoie 0 même pour une
`404` ou une `500` : vérifie le code de statut.

**« Ça marche avec curl, donc le bug est dans le navigateur. »** Compare les deux requêtes
en entier : en-têtes, cookies, origine. La différence est souvent là.

**« Je teste à la main, c’est suffisant. »** Un test à la main ne se rejoue pas à
l’identique. Écris les cas importants dans un scénario.

**« Je colle la commande copiée telle quelle dans le ticket. »** Elle contient peut-être
ta session. Nettoie-la.

## Exercices

### Exercice 1 : compléter le scénario

Ajoute à `test-notes.sh` des vérifications pour :

1. la redirection de `/old-notes` (sans la suivre) ;
2. la suppression d’une note existante puis une seconde suppression de la même note ;
3. une méthode non autorisée sur la collection `/notes`.

:::solution
```bash
check 301 'ancienne adresse redirigée' "$base/old-notes"
check 204 'supprimer la note 1' -X DELETE "$base/notes/1"
check 404 'supprimer à nouveau la note 1' -X DELETE "$base/notes/1"
check 405 'DELETE non autorisé sur la collection' -X DELETE "$base/notes"
```

Remarques :

- sans `-L`, curl ne suit pas la redirection : le statut reçu est bien `301` ;
- les deux suppressions **dépendent de l’ordre** et de l’état du serveur : relancer le
  scénario sans redémarrer le serveur fait échouer la première (`404` au lieu de `204`).
  C’est normal, et c’est une bonne question à se poser : pour que le scénario soit
  rejouable, il vaut mieux supprimer une note **créée par le scénario lui-même**, en
  récupérant son adresse dans l’en-tête `Location` ;
- `405` sur `/notes` : la collection n’accepte que `GET`, `HEAD`, `POST` et `OPTIONS`.

:::

### Exercice 2 : diagnostiquer avec les codes de sortie

Pour chacune de ces commandes, prévois le code de sortie et ce qu’affiche curl, puis
vérifie (serveur des notes lancé sur le port 3000) :

1. `curl -s -o /dev/null http://localhost:3000/notes/999`
2. `curl -sf -o /dev/null http://localhost:3000/notes/999`
3. `curl -s -o /dev/null http://localhost:3999/notes`
4. `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3999/notes`

:::solution
1. Code de sortie **0**, rien d’affiché : le serveur a répondu (`404`), l’échange HTTP a
   réussi du point de vue de curl.
2. Code de sortie **22**, rien d’affiché : `-f` transforme le `404` en échec, et `-s`
   masque le message d’erreur (il faudrait `-S` pour le voir).
3. Code de sortie **7**, rien d’affiché : rien n’écoute sur le port 3999, la connexion
   est refusée (sauf si un autre programme utilise ce port sur ta machine).
4. Code de sortie **7**, et curl affiche `000` : sans réponse HTTP, il n’y a pas de code
   de statut, et `%{http_code}` vaut `000`.

Vérifie chaque code avec `echo $?` juste après la commande.

:::

### Exercice 3 : du navigateur au terminal

Ouvre `http://localhost:3000/notes`, crée une note depuis la console avec le code de la
leçon, puis :

1. copie la requête `POST` en cURL depuis le panneau Réseau ;
2. réduis la commande au strict nécessaire pour obtenir encore `201` ;
3. explique pourquoi chaque élément conservé est indispensable.

:::solution
Commande minimale :

```bash
curl -i -H 'Content-Type: application/json' --data-raw '{"text":"Depuis la console"}' 'http://localhost:3000/notes'
```

- L’**URL** désigne la collection.
- Le **corps** (`--data-raw` ou `-d`) contient la note ; sa présence fait passer curl en
  `POST`, ce qui rend `-X POST` inutile.
- **`Content-Type: application/json`** est indispensable : sans lui, curl annonce un
  formulaire et le serveur répond `415`.

Les en-têtes `Accept`, `Accept-Language`, `Connection`, `Origin`, `Referer` et
`User-Agent` peuvent tous être retirés : ce serveur ne s’en sert pas. Sur une vraie
application, un cookie de session ou un en-tête `Authorization` ferait partie du
minimum, et ne devrait pas être partagé.

:::

## Récapitulatif

- curl construit des requêtes précises : `-X`, `-H`, `-d`/`--json`, `-u`, `-b`/`-c`, `-L` ;
  `-i`, `-I` et `-v` montrent la réponse et l’échange.
- `-s -o /dev/null -w '%{http_code}'` n’affiche que le code de statut, idéal pour tester.
- Code de sortie de curl : `0` dès qu’une réponse HTTP arrive (même `404`) ; `-f` fait
  échouer sur les statuts 400 et plus ; `6` échec DNS, `7` connexion refusée.
- Un **scénario** écrit dans un fichier rend les tests reproductibles : cas nominal,
  erreurs prévues, cas limites.
- Le panneau Réseau (filtre Fetch/XHR) montre les appels réels d’une page ; on peut les
  rejouer, les modifier et les **copier en cURL**.
- Démarche de diagnostic : reproduire, copier, réduire, faire varier un élément, ajouter
  au scénario.
- Cookies, CORS, redirections et cache diffèrent entre navigateur et curl ; ne partage
  jamais une commande contenant ta session.
