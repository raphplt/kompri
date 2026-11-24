---
title: Construire une image Docker de production
summary: Comprendre images, conteneurs et couches, écrire un Dockerfile multi-étapes sans dépendances de développement ni secret, exécuté par un utilisateur non root, avec contrôle de santé et arrêt propre sur SIGTERM.
durationMinutes: 75
sources:
  - title: Docker — Dockerfile reference
    url: https://docs.docker.com/reference/dockerfile/
  - title: Docker — Building best practices
    url: https://docs.docker.com/build/building/best-practices/
  - title: Docker — Build secrets
    url: https://docs.docker.com/build/building/secrets/
  - title: OWASP — Docker Security Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
---

## Le problème : « chez moi, ça marche »

Pour faire tourner le livre d’or sur un serveur, il faut la bonne version de Node.js, les
dépendances exactes de `package-lock.json`, les bons fichiers, et la bonne commande de
démarrage. Installer tout cela à la main sur chaque machine est lent et source d’écarts : une
version de Node.js différente, un paquet oublié, et le comportement change.

**Docker** emballe l’application **avec** tout ce dont elle a besoin pour s’exécuter dans une
**image**. La même image tourne à l’identique sur ton poste, dans l’intégration continue et sur
le serveur. Seule la configuration, fournie par l’environnement (leçon 1), change.

## Le vocabulaire

| Terme | Définition |
| --- | --- |
| **Image** | Un modèle en lecture seule : un système de fichiers (Node.js, ton code, `node_modules`) et des métadonnées (commande de démarrage, utilisateur, port) |
| **Conteneur** | Un processus lancé à partir d’une image, isolé du reste de la machine, avec sa propre couche inscriptible (perdue à sa suppression) |
| **Couche** (*layer*) | Chaque instruction du `Dockerfile` qui modifie les fichiers produit une couche ; une image est une pile de couches |
| **Registre** | Un service qui stocke et distribue des images ; Docker Hub héberge les images officielles (`node`, `postgres`, `caddy`) |
| **Étiquette** (*tag*) | Le nom d’une version d’image : `node:24-trixie-slim`, `guestbook:1.0.0` |

Un conteneur n’est pas une machine virtuelle : il partage le noyau du système hôte.

Sur un serveur Linux, installe **Docker Engine** en suivant la documentation officielle de
Docker pour ta distribution ; sur macOS ou Windows, Docker Desktop fournit les mêmes
commandes. Vérifie :

```bash
docker run --rm node:24-trixie-slim node -v
```

```text
v24.22.3
```

Docker a téléchargé l’image depuis Docker Hub, créé un conteneur, exécuté `node -v`, puis
supprimé le conteneur (`--rm`).

## Choisir l’image de base

L’image officielle `node` existe en plusieurs variantes. Tailles mesurées sur disque avec
Docker 29 (elles évoluent à chaque publication) :

| Étiquette | Contenu | Taille |
| --- | --- | --- |
| `node:24` | Debian complète, compilateurs, outils | 1,65 Go |
| `node:24-trixie-slim` | Debian 13 « trixie » réduite au nécessaire | 337 Mo |
| `node:24-alpine` | Alpine Linux, bibliothèque C `musl` | 244 Mo |

On choisit `node:24-trixie-slim` : petite, basée sur Debian (bibliothèque C `glibc`, comme la
plupart des serveurs), sans compilateur. Alpine est encore plus petite, mais `musl` se
comporte parfois différemment ; c’est un choix possible, à tester. Moins de logiciels dans
l’image, c’est aussi moins de failles potentielles à surveiller.

L’étiquette fixe **ce que tu acceptes de recevoir** :

- `node:24-trixie-slim` : toujours la dernière 24.x. À chaque reconstruction, tu reçois les
  correctifs de sécurité ; deux constructions à un mois d’écart peuvent différer légèrement.
- `node:24.22.3-trixie-slim` : une version exacte, reproductible, que tu mets à jour toi-même.
- `node:latest` : la dernière version majeure, quelle qu’elle soit. Ta production peut changer
  de version majeure de Node.js sans que personne l’ait décidé. **À proscrire.**

## Ce qu’on envoie au constructeur : `.dockerignore`

`docker build .` envoie le dossier courant, le **contexte**, au constructeur. Un
`.dockerignore` exclut ce qui ne doit jamais y entrer :

```text
# Ne jamais envoyer au constructeur d’image : secrets, dépendances locales, historique
.env
.env.*
node_modules
.git
backups
*.log
```

Pourquoi c’est vital ? Voici un `Dockerfile` naïf, comme on en trouve beaucoup :

```dockerfile
FROM node:24
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

Construit **sans** `.dockerignore`, dans un dossier qui contient ton `.env` :

```bash
docker build -t guestbook:naive .
docker run --rm guestbook:naive grep -E 'DATABASE_URL|POSTGRES_PASSWORD' .env
```

```text
DATABASE_URL=postgres://postgres@localhost:5432/guestbook
POSTGRES_PASSWORD=remplace-moi
```

Ici, les valeurs sont celles du modèle ; sur un vrai projet, ce seraient tes mots de passe. Le
fichier de configuration est **dans l’image**. Quiconque peut
télécharger l’image peut le lire. `COPY . .` aurait aussi copié ton `node_modules` local
(compilé pour ton système) et tout l’historique Git. `.dockerignore` n’est pas un détail : c’est
la barrière qui empêche ces fuites.

## Le Dockerfile de production

```dockerfile
# syntax=docker/dockerfile:1

# Étape 1 : dépendances de production seulement
FROM node:24-trixie-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Étape 2 : l’image finale, sans npm cache ni outils de développement
FROM node:24-trixie-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
COPY public ./public
# La version, connue au moment de la construction (pas un secret)
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "scripts/healthcheck.js"]
CMD ["node", "src/server.js"]
```

Ligne par ligne :

- `# syntax=docker/dockerfile:1` : utilise la dernière syntaxe stable du `Dockerfile`.
- `FROM … AS deps` : une **étape** nommée. Un `Dockerfile` **multi-étapes** en contient
  plusieurs ; seule la dernière forme l’image finale, les autres ne servent qu’à préparer des
  fichiers.
- `WORKDIR /app` : dossier de travail, créé s’il n’existe pas.
- `COPY package.json package-lock.json ./` puis `RUN npm ci --omit=dev` : on installe les
  dépendances **avant** de copier le code (voir le cache, plus bas). `npm ci` installe
  exactement le contenu de `package-lock.json`, et échoue s’il ne correspond pas à
  `package.json`. `--omit=dev` exclut les `devDependencies`.
- `COPY --from=deps` : la seconde étape ne récupère que le dossier `node_modules` de la
  première. Le cache de npm (dans `/root/.npm`) reste dans l’étape `deps`, qui est jetée.
- Les `COPY` suivants listent **explicitement** ce qui sert à l’exécution. Les tests,
  `compose.yaml` ou le dossier `.github` n’entrent pas dans l’image.
- `ARG APP_VERSION` reçoit une valeur au moment de la construction (`--build-arg`) ; `ENV` la
  rend visible au processus. Placée tout à la fin, elle ne casse pas le cache des étapes
  précédentes quand la version change.
- `USER node` : le processus ne tourne pas en `root` (voir plus bas).
- `EXPOSE 3000` documente le port écouté, sans rien publier ; `HEALTHCHECK` et `CMD` sont
  expliqués plus bas.

Ajoute le script de contrôle de santé :

```js
// scripts/healthcheck.js — lancé par HEALTHCHECK : code 0 si l’API est disponible
const port = process.env.PORT ?? 3000;
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health/ready`, {
    signal: AbortSignal.timeout(2000),
  });
  process.exitCode = response.ok ? 0 : 1;
} catch {
  process.exitCode = 1;
}
```

Puis construis l’image, en l’étiquetant avec sa version :

```bash
docker build --build-arg APP_VERSION=1.0.0 -t guestbook:1.0.0 .
docker images guestbook
```

```text
IMAGE             ID             DISK USAGE   CONTENT SIZE   EXTRA
guestbook:1.0.0   831027c26a15        341MB         83.5MB
```

(les versions plus anciennes de Docker affichent une seule colonne `SIZE`). Notre application
n’ajoute que quelques mégaoctets à l’image de base ; l’image naïve, elle, pèse **1,67 Go**.

## Le cache des couches

Docker garde chaque couche construite. À la construction suivante, il **réutilise** une couche
si l’instruction et ses fichiers d’entrée n’ont pas changé, et reconstruit tout ce qui suit la
première couche modifiée. Modifie `src/app.js` puis reconstruis avec `--progress=plain` :

```text
#13 [deps 4/4] RUN npm ci --omit=dev
#13 CACHED
…
#16 [runtime 5/8] COPY src ./src
#16 DONE 0.0s
```

`npm ci` n’est pas relancé : `package.json` et `package-lock.json` n’ont pas changé. Seuls la
copie de `src` et les couches suivantes sont refaites. Avec `COPY . .` **avant** `npm ci`, la
moindre modification du code invaliderait la couche d’installation, et chaque construction
réinstallerait toutes les dépendances.

La règle : **ce qui change rarement en haut, ce qui change souvent en bas.**

## Taille : ce qui compte vraiment

Mesures sur le livre d’or :

| Variante | Taille sur disque |
| --- | --- |
| Naïve : `node:24`, `COPY . .`, `npm install` | 1,67 Go |
| `node:24-trixie-slim`, une seule étape, `npm ci --omit=dev`, `COPY . .` | 348 Mo |
| Notre Dockerfile multi-étapes | 341 Mo |

Soyons honnêtes : sans étape de compilation, le multi-étapes ne fait gagner que quelques
mégaoctets (le cache de npm, ici 2,5 Mo, et les fichiers inutiles) ; l’essentiel vient de
l’**image de base**. Il devient décisif dès qu’il y a une compilation (TypeScript, modules
natifs) : compilateurs et sources restent dans une étape intermédiaire, seul le résultat passe
dans l’image finale.

Le gain de `--omit=dev` est net dès que le projet a des outils de développement. Avec ESLint
(leçon 5) en `devDependencies` :

```text
npm ci             → added 157 packages, and audited 158 packages
npm ci --omit=dev  → added 79 packages, and audited 80 packages
```

Moins de paquets, c’est moins de code exécutable dans l’image, donc moins de failles
possibles.

:::warning[`NODE_ENV=production` change le comportement de npm]
Quand `NODE_ENV` vaut `production`, `npm ci` omet **déjà** les `devDependencies`, même sans
`--omit=dev`. Si une étape doit lancer ESLint ou les tests dans l’image, place
`ENV NODE_ENV=production` **après** cette étape, sinon les outils ne seront pas installés.
Dans notre Dockerfile, `ENV NODE_ENV=production` n’apparaît que dans l’étape finale.

:::

## Un utilisateur sans privilèges

Par défaut, un conteneur s’exécute en `root`. Si une faille permet d’exécuter du code dans ton
application, l’attaquant est alors `root` dans le conteneur : il peut modifier le code,
installer des outils, et profiter de la moindre faiblesse d’isolation. L’image officielle
`node` fournit un utilisateur `node` (identifiant 1000) :

```bash
docker run --rm guestbook:1.0.0 sh -c 'id; touch src/hack.js'
```

```text
uid=1000(node) gid=1000(node) groups=1000(node)
touch: cannot touch 'src/hack.js': Permission denied
```

Les fichiers copiés appartiennent à `root` ; l’utilisateur `node` peut les lire, pas les
modifier. L’application n’a besoin d’écrire nulle part : ses données sont dans PostgreSQL.

## Aucun secret dans l’image

Une image n’est pas un coffre-fort. Ses métadonnées et l’historique de ses couches se lisent
avec deux commandes. Essai avec un `Dockerfile` maladroit :

```dockerfile
FROM node:24-trixie-slim
ARG NPM_TOKEN
RUN echo "jeton utilisé : longueur ${#NPM_TOKEN}"
ENV DATABASE_URL=postgres://app:MotDePasse42@db:5432/guestbook
```

```bash
docker build --build-arg NPM_TOKEN=npm_abcdef123456 -t leak:test .
docker history --no-trunc --format '{{.CreatedBy}}' leak:test | head -3
docker image inspect leak:test --format '{{json .Config.Env}}'
```

```text
ENV DATABASE_URL=postgres://app:MotDePasse42@db:5432/guestbook
RUN |1 NPM_TOKEN=npm_abcdef123456 /bin/sh -c echo "jeton utilisé : longueur ${#NPM_TOKEN}" # buildkit
ARG NPM_TOKEN=npm_abcdef123456
["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","NODE_VERSION=24.22.3","YARN_VERSION=1.22.22","DATABASE_URL=postgres://app:MotDePasse42@db:5432/guestbook"]
```

Le mot de passe de `ENV` **et** le jeton passé par `--build-arg` sont lisibles. Règles :

- Les secrets d’**exécution** (mot de passe de la base) ne sont jamais dans l’image : ils sont
  fournis au conteneur au démarrage (`docker run -e`, ou Compose à la leçon 3).
- Un secret nécessaire **pendant la construction** (un jeton pour un registre npm privé, par
  exemple) passe par un montage de secret BuildKit, qui n’est visible que pendant une
  instruction `RUN` et n’est écrit dans aucune couche :

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-trixie-slim
RUN --mount=type=secret,id=npm_token \
  echo "jeton lu : $(wc -c < /run/secrets/npm_token) octets"
```

```bash
docker build --secret id=npm_token,env=NPM_TOKEN -t leak:secret .
```

L’historique de cette image ne contient que la commande, pas la valeur, et `/run/secrets`
n’existe pas dans le conteneur final.

## Lancer le conteneur

Sans configuration, l’échec rapide de la leçon 1 fonctionne aussi dans un conteneur :

```bash
docker run --rm guestbook:1.0.0; echo "code de sortie : $?"
```

```text
{"error":"Configuration invalide :\n- DATABASE_URL doit commencer par postgres:// ou postgresql://","time":"2026-11-24T14:02:12.693Z","level":"error","message":"invalid configuration"}
code de sortie : 1
```

Avec une configuration (la base `db` n’existe pas encore, elle arrivera avec Compose) :

```bash
docker run -d --name gb-alone -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL=postgres://guestbook@db:5432/guestbook guestbook:1.0.0
docker ps --filter name=gb-alone --format 'table {{.Image}}\t{{.Status}}\t{{.Ports}}'
curl -s -w ' %{http_code}\n' localhost:3000/api/health/live
curl -s -w ' %{http_code}\n' localhost:3000/api/health/ready
```

```text
IMAGE             STATUS                            PORTS
guestbook:1.0.0   Up 2 seconds (health: starting)   127.0.0.1:3000->3000/tcp
{"status":"ok"} 200
{"status":"unavailable"} 503
```

- `-d` lance le conteneur en arrière-plan ; `docker logs gb-alone` affiche ce qu’il a écrit sur
  sa sortie standard (les journaux JSON).
- `-p 127.0.0.1:3000:3000` **publie** le port 3000 du conteneur sur le port 3000 de la machine,
  **seulement** sur l’interface locale. Sans `127.0.0.1:`, le port serait ouvert sur toutes les
  interfaces, donc potentiellement à Internet.
- Le processus vit (`live` : 200) mais ne peut pas servir (`ready` : 503) ; le journal contient
  `{"error":"getaddrinfo ENOTFOUND db", … ,"message":"readiness check failed"}`.

:::warning[`localhost` dans un conteneur]
Dans un conteneur, `localhost` désigne **le conteneur lui-même**, pas ta machine. Un
`DATABASE_URL` en `localhost:5432` ne trouvera pas le PostgreSQL installé sur ton poste. Les
conteneurs se joignent par leur **nom de service** sur un réseau Docker : c’est le rôle de
Compose (leçon 3).

:::

## Le contrôle de santé

`HEALTHCHECK` demande à Docker d’exécuter régulièrement une commande **dans** le conteneur. Code
de sortie 0 : en bonne santé ; autre chose : échec. Les options :

- `--interval=30s` : une vérification toutes les 30 secondes ;
- `--timeout=3s` : une vérification plus longue compte comme un échec ;
- `--start-period=10s` : pendant le démarrage, les échecs ne comptent pas ;
- `--retries=3` : trois échecs consécutifs rendent le conteneur `unhealthy`.

L’état apparaît dans `docker ps` : `health: starting`, puis `healthy` ou `unhealthy`. Notre
conteneur sans base finit ainsi :

```text
IMAGE             STATUS
guestbook:1.0.0   Up About a minute (unhealthy)
```

Pourquoi un script Node.js plutôt que `curl` ? L’image `slim` ne contient ni `curl` ni `wget`,
et les installer ajouterait des paquets (et des failles potentielles). Node.js est déjà là, et
`fetch` est intégré. Le script vérifie `/api/health/ready`, qui interroge la base : un
`HEALTHCHECK` qui renverrait toujours 0 (`CMD ["true"]`) n’apporterait aucune information.

:::note[Docker ne répare rien tout seul]
Un conteneur `unhealthy` n’est **pas** redémarré par Docker Engine : il reste en place, marqué
comme tel. L’état sert à Compose (attendre qu’un service soit prêt, leçon 3), aux outils de
surveillance et aux orchestrateurs. Arrête ce conteneur d’essai : `docker rm -f gb-alone`.

:::

## Signaux et arrêt propre

`docker stop` (et `docker compose stop`) envoie `SIGTERM` au **processus principal** du
conteneur, celui de PID 1, attend 10 secondes par défaut, puis envoie `SIGKILL`, qui tue
immédiatement. Notre `server.js` gère `SIGTERM` : il termine les requêtes en cours, ferme le
pool, puis sort.

Deux pièges se cachent ici.

**1. Le processus de PID 1 n’a pas de comportement par défaut pour les signaux.** Un processus
ordinaire qui reçoit `SIGTERM` sans l’intercepter meurt. Le PID 1 d’un conteneur, lui,
**ignore** un signal qu’il n’intercepte pas. Node.js sans gestionnaire de `SIGTERM` ne s’arrête
donc qu’au `SIGKILL`, au bout de 10 secondes.

**2. `CMD ["npm", "start"]` met npm en PID 1.** npm lance un shell, qui lance Node.js. Au
`SIGTERM`, npm le transmet au shell, qui meurt sans le relayer ; npm se termine en erreur, et
Node.js est tué brutalement avec le conteneur, **sans** exécuter son gestionnaire.

Mesures avec `time docker stop` sur le livre d’or, selon la commande de démarrage :

| `CMD` dans le Dockerfile | Gestionnaire `SIGTERM` | Durée de l’arrêt | Code de sortie | Arrêt propre ? |
| --- | --- | --- | --- | --- |
| `["node", "src/server.js"]` | oui | 0,2 s | 0 | oui |
| `["node", "src/server.js"]` | non | 10,2 s | 137 | non (tué) |
| `node src/server.js` (forme shell) | oui | 10,2 s | 137 | non (tué) |
| `["npm", "start"]` | oui | 0,7 s | 1 | non |

Le code 137 vaut 128 + 9 : le processus a été tué par le signal 9, `SIGKILL`. La **forme
shell** (sans crochets) lance `/bin/sh -c "node src/server.js"` : le shell est PID 1, il ignore
`SIGTERM` et ne le transmet pas.

L’arrêt de npm paraît rapide, mais il est brutal. Pour le voir, on a ajouté au livre d’or une
route d’essai qui répond au bout de 3 secondes, puis lancé `docker stop` pendant une requête :

```text
CMD ["node", "src/server.js"]
{"done":true} 200                       ← la requête en cours se termine, l’arrêt prend 2,7 s
{"signal":"SIGTERM", … ,"message":"shutdown requested"}
{"method":"GET","path":"/api/slow","status":200,"durationMs":3007, … ,"message":"request"}
{ … ,"message":"shutdown complete"}

CMD ["npm", "start"]
 000                                    ← curl : connexion coupée, aucune réponse (code 52)
npm error signal SIGTERM
npm error command sh -c node src/server.js
```

Avec npm, ni `shutdown requested` ni `shutdown complete` : Node.js n’a jamais vu le signal.
Retiens donc : **forme exec** (crochets), **`node` directement**, **gestionnaire `SIGTERM`**.

`docker run --init` (ou `init: true` dans Compose) place un petit processus `init` en PID 1, qui
relaie les signaux. Il évite le blocage de 10 secondes, mais sans gestionnaire, Node.js meurt
quand même immédiatement (code 143, soit 128 + 15) : seul ton code peut terminer proprement les
requêtes en cours.

## Pièges et idées reçues

- **Copier `.env` dans l’image**, par `COPY . .` sans `.dockerignore` ou volontairement « pour
  que ça marche » : le secret voyage avec l’image.
- **`ENV` ou `ARG` pour un mot de passe** : lisibles avec `docker history` et `docker inspect`.
- **Rester en `root`** parce que « c’est dans un conteneur » : l’isolation n’est pas absolue, et
  un attaquant `root` peut réécrire ton code.
- **`CMD npm start`** : signal perdu, requêtes coupées à chaque déploiement.
- **Un `HEALTHCHECK` qui ne vérifie rien** : `CMD ["true"]` ou une route qui répond 200 sans
  regarder la base. Le conteneur est « healthy » pendant que le site est en panne.

## Exercices

### Exercice 1 — Relire un Dockerfile

Un assistant propose ce `Dockerfile` pour le livre d’or. Liste chaque défaut, sa conséquence
concrète, et réécris-le.

```dockerfile
FROM node:latest
WORKDIR /app
COPY . .
ENV DATABASE_URL=postgres://guestbook:Pa55word@db:5432/guestbook
RUN npm install
EXPOSE 3000
CMD npm start
```

:::solution
| Défaut | Conséquence | Correction |
| --- | --- | --- |
| `node:latest` | Version majeure imprévisible ; image de 1,6 Go environ | `node:24-trixie-slim` |
| `COPY . .` avant l’installation | Chaque modification du code réinstalle toutes les dépendances | Copier `package.json` et `package-lock.json`, installer, puis copier le code |
| `COPY . .` sans liste | `.env`, `.git`, tests, `node_modules` local dans l’image (sans `.dockerignore`) | `.dockerignore` et des `COPY` explicites |
| `ENV DATABASE_URL=…` | Mot de passe lisible par `docker inspect` et `docker history` | Variable fournie au démarrage du conteneur |
| `npm install` | Versions potentiellement différentes du fichier de verrouillage ; `devDependencies` installées | `npm ci --omit=dev` |
| Pas de `USER` | Processus en `root` | `USER node` |
| `CMD npm start` (forme shell) | `SIGTERM` jamais reçu par Node.js : arrêt au bout de 10 s, requêtes coupées | `CMD ["node", "src/server.js"]` |
| Pas de `HEALTHCHECK` | Aucun moyen de savoir si l’application sert vraiment | `HEALTHCHECK` sur `/api/health/ready` |

La réécriture est le Dockerfile de cette leçon. Le mot de passe, déjà publié dans le
`Dockerfile`, doit en plus être changé : il est dans l’historique Git.

:::

### Exercice 2 — Mesurer l’arrêt

Lance le livre d’or dans un conteneur, puis mesure l’arrêt :

```bash
docker run -d --name stop-test -e DATABASE_URL=postgres://x@db/x guestbook:1.0.0
sleep 2
time docker stop stop-test
docker inspect stop-test --format '{{.State.ExitCode}}'
docker logs stop-test | tail -2
docker rm stop-test
```

Recommence après avoir supprimé les deux lignes `process.once(…)` de `src/server.js` et
reconstruit l’image sous l’étiquette `guestbook:nohandler`. Explique les deux résultats.

:::solution
Avec le gestionnaire : `real` vaut environ 0,2 s, code de sortie `0`, et les deux dernières
lignes du journal sont `shutdown requested` (avec `"signal":"SIGTERM"`) et `shutdown complete`.

Sans gestionnaire : `real` vaut environ 10,2 s, code de sortie `137`, et aucune ligne d’arrêt.
Node.js est PID 1 (la forme exec et le script d’entrée de l’image officielle lui laissent cette
place) ; sans gestionnaire, le PID 1 ignore `SIGTERM`. Docker attend ses 10 secondes, puis
envoie `SIGKILL` (137 = 128 + 9). En production, chaque déploiement durerait 10 secondes de
plus et couperait les requêtes en cours.

:::

### Exercice 3 — Où est passé le cache ?

Un collègue a déplacé `ARG APP_VERSION` et `ENV APP_VERSION=$APP_VERSION` juste après le premier
`FROM … AS deps`. Il construit la 1.0.1 puis la 1.0.2 sans changer les dépendances. Que
constate-t-il, et pourquoi ?

:::solution
`npm ci --omit=dev` est relancé à chaque version. Un `ENV` fait partie de l’état de l’étape :
quand sa valeur change, la couche qu’il crée et **toutes** les suivantes de cette étape sont
reconstruites, y compris l’installation des dépendances. La version change à chaque
construction ; on la place donc le plus bas possible, dans l’étape finale, après les copies.

:::

## Récapitulatif

- Une **image** contient l’application et tout ce qu’il lui faut ; un **conteneur** en est une
  exécution isolée ; seule la configuration change d’un environnement à l’autre.
- Image de base officielle, réduite et étiquetée précisément : `node:24-trixie-slim`, jamais
  `latest`.
- `.dockerignore` (`.env`, `node_modules`, `.git`) et des `COPY` explicites.
- Multi-étapes : préparer dans une étape, n’emporter que le nécessaire ; `npm ci --omit=dev`.
- Ordre des instructions pour le cache : dépendances d’abord, code ensuite, version en dernier.
- `USER node` ; aucun secret en `ENV`/`ARG` (lisibles) ; montage `--mount=type=secret` pour
  la construction.
- `HEALTHCHECK` qui vérifie vraiment la disponibilité ; Docker n’en déduit aucun redémarrage.
- `CMD ["node", "src/server.js"]` en forme exec, plus un gestionnaire `SIGTERM` : arrêt en
  0,2 s, requêtes terminées ; `npm start` ou la forme shell : signal perdu.
