---
title: Publier derrière un proxy inverse en HTTPS
summary: Préparer un serveur Linux, placer Caddy devant l’API pour obtenir et renouveler les certificats, rediriger HTTP vers HTTPS, envoyer HSTS, et régler trust proxy dans Express pour lire les en-têtes X-Forwarded.
durationMinutes: 65
sources:
  - title: Caddy — Automatic HTTPS
    url: https://caddyserver.com/docs/automatic-https
  - title: Caddy — Directive reverse_proxy
    url: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
  - title: Express — Derrière un proxy (trust proxy)
    url: https://expressjs.com/en/guide/behind-proxies.html
  - title: MDN — Strict-Transport-Security
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
---

## Le problème : HTTPS, et un seul point d’entrée

Le livre d’or répond en HTTP sur le port 3000. Sur Internet, il doit répondre en **HTTPS** sur
le port 443 : sans chiffrement, chaque message, chaque cookie de session (dans l’application
« Tâches ») circule en clair sur les réseaux traversés. HTTPS exige un **certificat** signé par
une autorité reconnue des navigateurs, renouvelé avant son expiration.

On pourrait gérer tout cela dans Node.js. En pratique, on place devant l’application un **proxy
inverse** (*reverse proxy*) : un serveur qui reçoit toutes les connexions des visiteurs et les
transmet à l’application sur le réseau interne. Il s’occupe de ce qui n’est pas du métier :

- **terminer TLS** : déchiffrer HTTPS, présenter le certificat, le renouveler ;
- **rediriger** HTTP vers HTTPS ;
- **ajouter des en-têtes** communs (HSTS) et compresser les réponses ;
- **indiquer à l’application** qui est le vrai client (en-têtes `X-Forwarded-*`).

L’application, elle, reste simple : HTTP sur un réseau privé, inaccessible directement.

On utilise **Caddy**, dont la particularité est d’obtenir et de renouveler les certificats
**automatiquement**. **nginx** est l’autre choix très répandu ; il fait le même travail de proxy,
mais les certificats y sont gérés par un outil séparé. Les principes de cette leçon (en-têtes,
`trust proxy`, HSTS) s’appliquent à l’un comme à l’autre.

## Le serveur

On décrit un serveur Linux générique, loué chez un hébergeur (un **VPS**, serveur privé
virtuel) ou installé chez toi, avec une adresse IP publique. D’autres modèles existent : les
plateformes qui exécutent un conteneur et fournissent HTTPS elles-mêmes, ou les bases de données
gérées. Ils te déchargent d’une partie de ce qui suit, avec d’autres contraintes ; ce cours
choisit le serveur nu parce qu’il montre chaque pièce.

### Préparer la machine

Sur une installation neuve de Debian ou Ubuntu, avant tout déploiement :

1. **Connexion par clé SSH**, puis désactivation de l’authentification SSH par mot de passe.
2. **Un compte non `root`** pour travailler (`deploy`, par exemple), avec `sudo`.
3. **Mises à jour** du système (`sudo apt update && sudo apt upgrade`), et leur application
   automatique pour les correctifs de sécurité (paquet `unattended-upgrades`).
4. **Un pare-feu** qui n’ouvre que SSH (22), HTTP (80) et HTTPS (443), par exemple avec `ufw`.
   Rappel de la leçon 3 : les ports publiés par Docker contournent `ufw` ; seuls les ports de
   Caddy doivent l’être.
5. **Docker Engine et Compose**, installés depuis le dépôt officiel de Docker selon sa
   documentation.

:::warning[Le groupe `docker` équivaut à `root`]
Ajouter `deploy` au groupe `docker` lui évite de taper `sudo docker`. Mais un membre de ce groupe
peut lancer un conteneur qui monte `/` du serveur : il a, de fait, tous les droits. Ne l’accorde
qu’aux comptes qui administrent déjà la machine.

:::

L’ANSSI publie des recommandations détaillées pour durcir un système GNU/Linux ; elles vont bien
au-delà de cette liste minimale.

### Le nom de domaine

Les certificats sont délivrés pour un **nom**, pas pour une adresse IP. Chez ton fournisseur de
nom de domaine, crée un enregistrement DNS de type `A` (adresse IPv4) et, si ton serveur en a
une, `AAAA` (IPv6), qui fait pointer `livre.example.fr` vers l’adresse du serveur. Vérifie avec
`dig +short livre.example.fr` (ou `nslookup`) que le nom renvoie la bonne adresse avant
d’aller plus loin.

### Le code sur le serveur

```bash
sudo mkdir -p /srv/guestbook && sudo chown deploy: /srv/guestbook
git clone https://github.com/ton-compte/guestbook.git /srv/guestbook
cd /srv/guestbook
```

Puis crée `.env` à la main (`chmod 600`), construis l’image et lance Compose, comme à la leçon 3.
Le dépôt ne contient aucun secret : le cloner sur le serveur ne pose pas de problème.

## Ajouter Caddy

Un `Caddyfile` à la racine du projet :

```text
# Caddyfile — HTTPS automatique devant l’API
{$SITE_ADDRESS} {
	encode
	header Strict-Transport-Security "max-age=31536000"
	reverse_proxy api:3000
}
```

- `{$SITE_ADDRESS}` est remplacé par la variable d’environnement de même nom au chargement :
  `livre.example.fr` en production, `localhost` pour l’atelier local. Le même fichier sert
  partout.
- `encode` compresse les réponses (gzip ou zstd, selon ce qu’annonce le navigateur).
- `header` ajoute HSTS à toutes les réponses (plus bas).
- `reverse_proxy api:3000` transmet chaque requête au service `api`, joint par son nom sur le
  réseau `web`.

Le format attendu est indenté par tabulations : sinon, Caddy accepte le fichier mais signale
`Caddyfile input is not formatted` dans ses journaux, et `caddy fmt --overwrite` le reformate.

Dans `compose.yaml`, ajoute le service `caddy` et ses volumes, et modifie `api` :

```diff
   api:
     image: guestbook:${APP_VERSION}
     restart: unless-stopped
     environment:
       NODE_ENV: production
       DATABASE_URL: postgres://guestbook:${POSTGRES_PASSWORD}@db:5432/guestbook
-      TRUST_PROXY: 0
+      TRUST_PROXY: 1
     networks: [backend, web]
-    ports:
-      - "127.0.0.1:3000:3000"
     depends_on:
```

```yaml
  caddy:
    image: caddy:2
    restart: unless-stopped
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:?SITE_ADDRESS manquant dans .env}
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks: [web]
    depends_on:
      api:
        condition: service_healthy

volumes:
  db-data:
  caddy-data:
  caddy-config:
```

- L’API ne publie **plus aucun port** : seul Caddy, sur le réseau `web`, peut la joindre.
- Caddy publie 80 et 443 sur toutes les interfaces : ce sont les seules portes d’entrée. Le
  port `443/udp` sert à HTTP/3, que Caddy active par défaut.
- `./Caddyfile:/etc/caddy/Caddyfile:ro` monte le fichier du projet dans le conteneur, en lecture
  seule.
- Le volume `caddy-data` conserve **les certificats et les clés privées**. Sans lui, chaque
  recréation du conteneur redemanderait des certificats.
- `depends_on` avec `service_healthy` : Caddy attend que l’API soit prête.

Ajoute `SITE_ADDRESS` au `.env` du serveur, puis `docker compose up -d`.

## HTTPS automatique en production

Avec `SITE_ADDRESS=livre.example.fr`, Caddy obtient seul un certificat auprès d’une autorité
de certification gratuite (Let’s Encrypt par défaut, ZeroSSL en secours), par le protocole
**ACME** : l’autorité vérifie que tu contrôles le nom en contactant le serveur sur le port 80
ou 443. Conditions pour que ça marche :

- l’enregistrement DNS pointe vers le serveur ;
- les ports 80 et 443 sont joignables depuis Internet ;
- l’adresse est un **nom de domaine** public.

Caddy renouvelle ensuite les certificats bien avant leur expiration, sans intervention. Les
autorités limitent le nombre de certificats délivrés pour un même nom sur une période : c’est
une raison de plus de conserver le volume `caddy-data`. Pour des essais répétés, l’option globale
`acme_ca` permet de viser l’environnement de test de Let’s Encrypt, dont les certificats ne sont
pas reconnus des navigateurs mais qui n’est pas soumis aux mêmes limites.

Les journaux de Caddy (`docker compose logs caddy`) racontent chaque étape : obtention,
échec éventuel (DNS incorrect, port 80 fermé) et renouvellements.

## La redirection de HTTP vers HTTPS

Caddy écoute aussi le port 80, et y **redirige** toute requête vers HTTPS. Pas une ligne de
configuration :

```bash
curl -sI http://localhost/
```

```text
HTTP/1.1 308 Permanent Redirect
Connection: close
Location: https://localhost/
Server: Caddy
Date: Tue, 24 Nov 2026 14:07:27 GMT
```

`308` est une redirection permanente qui conserve la méthode et le corps de la requête.

## HSTS : ne plus jamais revenir en HTTP

La redirection laisse une faiblesse : la **première** requête d’un visiteur qui tape
`livre.example.fr` part en HTTP, en clair, et un attaquant sur le même réseau peut l’intercepter
avant la redirection. L’en-tête **HSTS** (*HTTP Strict Transport Security*) répond à ce
problème :

```http
Strict-Transport-Security: max-age=31536000
```

Après l’avoir reçu une fois en HTTPS, le navigateur utilisera **uniquement HTTPS** pour ce nom
pendant `max-age` secondes (ici un an), sans même tenter HTTP. Points d’attention :

- le navigateur l’ignore s’il le reçoit en HTTP : il n’a de sens qu’en HTTPS ;
- c’est un engagement : si HTTPS tombe en panne, les visiteurs ne pourront plus accéder au
  site, même en HTTP. Beaucoup commencent avec un `max-age` court (une semaine), puis
  l’allongent ;
- `includeSubDomains` étend la règle à tous les sous-domaines : ne l’ajoute que si **tous**
  fonctionnent en HTTPS.

Envoie HSTS à **un seul endroit**. Dans l’application « Tâches », Express l’envoyait en
production ; derrière Caddy, c’est le proxy, qui gère HTTPS, qui s’en charge.

## L’atelier local : HTTPS sur `localhost`

Sur ton poste, aucune autorité publique ne délivrera de certificat pour `localhost`. Avec
`SITE_ADDRESS=localhost`, Caddy crée sa **propre autorité de certification locale** et signe
lui-même le certificat. Les journaux l’indiquent :

```text
{"level":"info", … ,"logger":"tls.obtain","msg":"certificate obtained successfully","identifier":"localhost","issuer":"local"}
```

(Caddy essaie aussi d’installer cette autorité dans le magasin de confiance du système : dans un
conteneur, c’est celui du conteneur, pas celui de ta machine. Ces messages sont sans
conséquence.) Un client qui ne connaît pas cette autorité refuse la connexion :

```bash
curl https://localhost/api/health/ready
```

```text
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

C’est le comportement attendu : le certificat n’est signé par aucune autorité reconnue. Deux
façons de faire l’essai :

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
curl -s --cacert caddy-root.crt -D - -o /dev/null https://localhost/api/messages
```

```text
HTTP/2 200
alt-svc: h3=":443"; ma=2592000
content-type: application/json; charset=utf-8
date: Tue, 24 Nov 2026 14:07:27 GMT
etag: W/"67-CDVgAs4CFuU/+JwHHWUBnf3MHqU"
strict-transport-security: max-age=31536000
via: 1.1 Caddy
content-length: 103
```

`--cacert` indique à curl de faire confiance au certificat racine de l’autorité locale de Caddy :
la vérification complète a lieu, avec cette autorité en plus. On voit HTTP/2, l’en-tête HSTS,
`via: 1.1 Caddy` ajouté par le proxy, et `alt-svc`, qui annonce HTTP/3.

La seconde façon, `curl -k`, **désactive** toute vérification du certificat. Elle suffit pour un
essai rapide en local, mais n’apprend rien sur la validité du certificat et ne protège plus
contre une interception : ne l’utilise jamais vers un serveur réel, ni dans un script. Un
navigateur, lui, affiche un avertissement de sécurité sur `https://localhost`, pour la même
raison : c’est attendu dans cet atelier, et ce serait une alerte sérieuse sur un vrai site.

## Ce que l’application voit : `X-Forwarded-*` et `trust proxy`

Derrière Caddy, la connexion TCP qui arrive à Node.js vient **du conteneur Caddy**, en HTTP. Sans
autre information, l’application croit que tous les visiteurs ont l’adresse de Caddy et
utilisent HTTP. Caddy ajoute donc à chaque requête transmise :

| En-tête | Contenu |
| --- | --- |
| `X-Forwarded-For` | l’adresse IP du client |
| `X-Forwarded-Proto` | le protocole d’origine : `https` |
| `X-Forwarded-Host` | le nom demandé : `livre.example.fr` |

Express **ignore** ces en-têtes par défaut, et il a raison : n’importe quel client peut les
écrire. Le réglage `trust proxy` lui indique combien de proxys **de confiance** se trouvent
devant lui ; Express lit alors `X-Forwarded-For` de droite à gauche en sautant ce nombre de
proxys. `config.trustProxy` alimente ce réglage dans `src/app.js` (leçon 1).

Essai : une requête qui envoie elle-même un faux `X-Forwarded-For: 203.0.113.7`, observée dans le
journal des requêtes avec deux valeurs de `TRUST_PROXY` :

```bash
curl -s --cacert caddy-root.crt -o /dev/null -H 'X-Forwarded-For: 203.0.113.7' \
  https://localhost/api/health/live
docker compose logs api --no-log-prefix | grep live | tail -1
```

```text
TRUST_PROXY=0 : {"method":"GET","path":"/api/health/live","status":200,"durationMs":5,"ip":"172.18.0.3","protocol":"http", … }
TRUST_PROXY=1 : {"method":"GET","path":"/api/health/live","status":200,"durationMs":1,"ip":"172.18.0.1","protocol":"https", … }
```

- Avec `0`, l’application voit l’adresse du conteneur Caddy (`172.18.0.3`) et croit la requête
  en HTTP. Un limiteur de tentatives bloquerait tous les visiteurs ensemble, et un cookie
  `Secure` ou une redirection construite avec `req.protocol` seraient faux.
- Avec `1`, elle voit l’adresse du client et `https`. Ici, le client est ta machine, vue par
  Docker à travers sa passerelle (`172.18.0.1`) ; sur le serveur, c’est l’adresse du visiteur.
- Le faux `203.0.113.7` n’apparaît dans aucun cas : Caddy **remplace** l’en-tête envoyé par un
  client qu’il ne considère pas comme un proxy de confiance. Même avec `TRUST_PROXY=2`, le
  journal affiche `172.18.0.1`.

La valeur juste est le **nombre exact** de proxys entre Internet et l’application : 1 ici. Si un
répartiteur de charge de l’hébergeur s’ajoutait devant Caddy, ce serait 2 (et Caddy devrait
lui-même être configuré pour faire confiance à ce répartiteur).

:::warning[`trust proxy` sur une application joignable directement]
`TRUST_PROXY=1` n’est sûr que si **personne** ne peut joindre l’application sans passer par le
proxy. Si le port 3000 était publié, un client s’y connecterait directement avec un
`X-Forwarded-For` de son choix, et changerait d’adresse apparente à chaque requête. C’est pour
cela qu’on a retiré le bloc `ports` de l’API.

:::

## Modifier la configuration de Caddy

Après une modification du `Caddyfile`, recharge la configuration sans couper les connexions :

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

En cas d’erreur de syntaxe, Caddy refuse la nouvelle configuration et garde l’ancienne.

## Pièges et idées reçues

- **Laisser l’API publiée** (`3000:3000`) en plus de Caddy : HTTP en clair accessible, et
  `trust proxy` devient une faille.
- **`trust proxy` à `true`** : Express fait confiance à toute la chaîne `X-Forwarded-For`,
  que le client peut préremplir. Donne le nombre exact.
- **Oublier le volume `/data` de Caddy** : certificats redemandés à chaque recréation, jusqu’à
  atteindre les limites de l’autorité et rester sans certificat.
- **Tester avec `curl -k` puis le garder dans un script** de surveillance : un certificat expiré
  ou usurpé passerait inaperçu.
- **Activer HSTS avec `includeSubDomains`** alors qu’un sous-domaine n’a pas HTTPS : il devient
  inaccessible pour tous les visiteurs déjà passés sur le site.
- **Le DNS pas encore propagé** au premier lancement : Caddy échoue à obtenir le certificat et
  réessaie ; vérifie le nom avec `dig` avant de lancer.

## Exercices

### Exercice 1 — Lire une configuration nginx

Une équipe utilise nginx. Sans connaître sa syntaxe en détail, retrouve dans cet extrait les
éléments vus dans la leçon, et dis quelle valeur de `trust proxy` donner à Express.

```text
server {
    listen 443 ssl;
    server_name livre.example.fr;
    ssl_certificate     /etc/letsencrypt/live/livre.example.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livre.example.fr/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

:::solution
- `listen 443 ssl` et `ssl_certificate…` : nginx termine TLS sur le port 443 avec un certificat
  stocké sur le disque. Contrairement à Caddy, il ne l’obtient pas seul : un outil séparé
  (ici, des chemins typiques de Let’s Encrypt) doit le demander et le renouveler.
- `add_header Strict-Transport-Security` : l’en-tête HSTS, d’un an.
- `proxy_pass http://127.0.0.1:3000` : la requête est transmise en HTTP à l’application, qui
  écoute sur la boucle locale.
- `proxy_set_header X-Forwarded-For $remote_addr` : nginx **remplace** l’en-tête par l’adresse
  du client (comme Caddy), et `X-Forwarded-Proto $scheme` transmet `https`.
- Il manque la redirection de HTTP vers HTTPS : il faudrait un second bloc `server` qui écoute
  le port 80 et renvoie une redirection permanente.

Un seul proxy devant l’application : `TRUST_PROXY=1`. L’application doit écouter seulement sur
`127.0.0.1`, sinon le port 3000 resterait joignable directement.

:::

### Exercice 2 — Diagnostiquer un déploiement

Après le premier `docker compose up -d` sur le serveur, `https://livre.example.fr` ne répond pas,
et `docker compose logs caddy` contient des erreurs d’obtention de certificat. Liste, dans
l’ordre, les vérifications que tu fais et la commande pour chacune.

:::solution
1. **Le DNS** : `dig +short livre.example.fr` doit renvoyer l’adresse IP publique du serveur.
   Sinon, corriger l’enregistrement `A`/`AAAA` et attendre la propagation.
2. **Les conteneurs** : `docker compose ps` ; Caddy doit être `Up`, et l’API `healthy` (sinon
   Caddy n’a pas démarré, à cause de `depends_on`).
3. **Les ports publiés** : `docker compose ps` doit montrer `0.0.0.0:80->80/tcp` et
   `0.0.0.0:443->443/tcp` pour Caddy.
4. **Le pare-feu de l’hébergeur** : certains hébergeurs filtrent aussi le trafic en amont du
   serveur ; depuis une autre machine, `curl -I http://livre.example.fr` doit au moins obtenir
   la redirection `308` de Caddy.
5. **La variable** : `SITE_ADDRESS` dans `.env` doit valoir exactement `livre.example.fr`
   (pas `https://…`, pas d’espace).
6. **Les journaux** : relire le message de Caddy, qui indique en général la cause (délai de
   connexion, réponse inattendue de l’autorité, limite atteinte).

:::

## Récapitulatif

- Un proxy inverse termine HTTPS, redirige HTTP, ajoute des en-têtes et transmet à
  l’application en HTTP sur un réseau privé ; l’application ne publie plus aucun port.
- Serveur Linux préparé : clé SSH, compte non `root`, mises à jour, pare-feu (22, 80, 443),
  Docker officiel ; le groupe `docker` équivaut à `root`.
- Caddy obtient et renouvelle seul les certificats (DNS correct, ports 80 et 443 ouverts) ;
  le volume `/data` les conserve ; il redirige HTTP vers HTTPS avec un `308`.
- HSTS (`max-age`) oblige le navigateur à utiliser HTTPS ; un seul endroit l’envoie ;
  prudence avec `includeSubDomains`.
- En local, `localhost` utilise l’autorité interne de Caddy : `curl --cacert` pour vérifier,
  `-k` seulement pour un essai jetable.
- `X-Forwarded-For` et `X-Forwarded-Proto` donnent le vrai client et `https` ; Express ne
  les lit qu’avec `trust proxy` réglé sur le nombre exact de proxys, et seulement si
  l’application n’est pas joignable directement.
