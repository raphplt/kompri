# Déploiement et exploitation

Ce document décrit la mise en production sur un serveur Linux avec Docker Compose. La
mise en ligne effective reste une décision du porteur du projet : hébergeur, nom de domaine,
fournisseur de modèle et mentions légales doivent être choisis et complétés avant.

## Architecture de production

```text
Internet ──HTTPS──> proxy inverse (Caddy, nginx…) ──> web :3000 (Next.js)
                                                         │ réseau interne
                                                         ▼
                                                    api :3001 (NestJS) ──> postgres :5432
```

- Seul le port web est publié, sur la boucle locale du serveur ; le proxy inverse termine
  TLS et le publie. L’API et PostgreSQL ne sont jamais exposés.
- Le navigateur ne parle qu’au serveur web : les actions serveur transmettent le jeton de
  session à l’API. Le cookie `kompri_session` est `HttpOnly`, `SameSite=Lax` et `Secure`.
- Le conteneur `migrate` applique les migrations puis synchronise le contenu à chaque
  déploiement, avant le démarrage de l’API.

## Prérequis

- Docker Engine avec Compose v2, 2 Go de RAM au moins (le hachage scrypt utilise 128 Mo
  par connexion simultanée).
- Un nom de domaine et un proxy inverse HTTPS.
- Un compte chez le fournisseur de modèle choisi pour l’examinateur et sa clé.
  Vérifier les conditions d’hébergement et de conservation des données (voir la page de
  confidentialité, qui contient des champs à compléter).

## Première installation

```bash
git clone <dépôt> kompri && cd kompri
cp .env.production.example .env.production   # puis compléter, droits 600
docker compose -f compose.prod.yaml --env-file .env.production build
docker compose -f compose.prod.yaml --env-file .env.production up -d
docker compose -f compose.prod.yaml --env-file .env.production ps
```

`POSTGRES_PASSWORD` doit être long et aléatoire (par exemple `openssl rand -base64 32`).
Derrière un proxy d’entreprise qui inspecte TLS, ajouter au build
`--secret id=extra_ca,src=/chemin/ca.pem` (option du Dockerfile, sans effet sinon).

Exemple de configuration Caddy, qui obtient le certificat automatiquement :

```text
kompri.example.fr {
  reverse_proxy 127.0.0.1:3000
}
```

## Variables

| Variable                                          | Rôle                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                               | Mot de passe PostgreSQL, utilisé pour construire `DATABASE_URL` |
| `ORAL_QUESTION_COUNT`, `ORAL_ANSWER_SECONDS`      | Nombre de questions et temps par réponse                        |
| `ORAL_LIMIT_PER_WINDOW`, `ORAL_WINDOW_HOURS`      | Quota d’oraux sur une fenêtre glissante                         |
| `VALIDATION_DAYS`, `SESSION_DAYS`                 | Durée d’une validation et d’une session de connexion            |
| `LLM_<USAGE>_PROVIDER`, `_MODEL`, tarifs          | Fournisseur et modèle par usage (voir `.env.example`)           |
| `<FOURNISSEUR>_API_KEY`, `<FOURNISSEUR>_BASE_URL` | Clé et endpoint du fournisseur                                  |
| `WEB_PORT`                                        | Port publié sur la boucle locale (3000 par défaut)              |
| `WEB_INSECURE_COOKIES=true`                       | Uniquement pour un essai local sans HTTPS                       |

## Administrateurs et tâche quotidienne

Donner le rôle d’administrateur à un compte existant (accès aux réexamens) :

```bash
docker compose -f compose.prod.yaml --env-file .env.production run --rm api \
  node --import tsx src/jobs/make-admin.ts admin@example.fr
```

La tâche quotidienne envoie les rappels d’expiration et, si `INACTIVE_ACCOUNT_DAYS` est
défini, prévient les comptes inactifs 14 jours avant de les supprimer. Elle est idempotente.
La planifier une fois par jour sur le serveur (`crontab -e`) :

```text
17 4 * * * cd /srv/kompri && docker compose -f compose.prod.yaml --env-file .env.production run --rm api node --import tsx src/jobs/daily.ts >> /var/log/kompri-daily.log 2>&1
```

## Mise à jour

```bash
git pull
docker compose -f compose.prod.yaml --env-file .env.production build
docker compose -f compose.prod.yaml --env-file .env.production up -d
```

Les migrations sont appliquées par `migrate`. Une migration appliquée n’est jamais
réécrite. Le seed met à jour le contenu et archive ce qui a été retiré, sans rien effacer.

**Retour arrière** : revenir au commit précédent et reconstruire. Si la version annulée
contenait une migration, restaurer la sauvegarde prise juste avant la mise à jour : les
migrations ne sont pas réversibles automatiquement.

## Sauvegardes

```bash
docker compose -f compose.prod.yaml exec -T postgres \
  pg_dump -U kompri -d kompri --format=custom > kompri-$(date +%F).dump
```

Planifier cette commande chaque jour (cron), chiffrer et copier les fichiers hors du serveur,
et tester régulièrement une restauration :

```bash
docker compose -f compose.prod.yaml exec -T postgres \
  pg_restore -U kompri -d kompri --clean --if-exists < kompri-AAAA-MM-JJ.dump
```

Les sauvegardes contiennent des données personnelles : leur durée de conservation doit
figurer dans la politique de confidentialité.

## Supervision

- Santé : `GET /health` de l’API (vérifie PostgreSQL) et les `HEALTHCHECK` des images ;
  `docker compose ps` affiche l’état.
- Journaux : `docker compose logs -f api web`. L’API écrit une ligne JSON par requête
  (méthode, route, statut, durée) et une ligne par appel au modèle (usage, modèle, durée,
  tokens, coût estimé, statut). Aucun contenu d’échange, corps de requête ni identité n’y
  figure.
- Coûts : additionner `estimatedCostUsd` des lignes LLM ; fixer des plafonds de dépense
  chez le fournisseur.

## Sécurité

- En-têtes appliqués par le web en production : CSP restrictive, HSTS, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Mots de passe hachés avec scrypt (N = 2^17, r = 8, p = 1), verrouillage de 15 minutes
  après 5 échecs. Sessions aléatoires de 256 bits, stockées sous forme de condensat.
- `pnpm audit --prod` doit être propre avant chaque mise en production.
- Les conteneurs s’exécutent avec l’utilisateur non privilégié `node`.

## Avant l’ouverture au public

- [ ] Compléter les mentions légales et la politique de confidentialité (champs entre crochets).
- [ ] Choisir et contractualiser le fournisseur de modèle ; mesurer l’examinateur avec
      `pnpm evals:live` sur des références relues par des humains.
- [ ] Faire relire les cours par des formateurs (contenus marqués « relecture en attente »).
- [ ] Mettre en place sauvegardes, supervision et alertes.
