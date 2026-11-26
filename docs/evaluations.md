# Mesures de l’examinateur

`pnpm evals:live` fait noter chaque oral de référence (`packages/evals/references`) trois fois
par le modèle configuré et compare le résultat aux notes attendues. Les références sont
`humanReview: pending` : elles ont été écrites par l’équipe, pas relues par des formateurs.
Ces mesures disent donc si le modèle s’accorde avec ces références, pas s’il est fiable au
sens d’une évaluation humaine.

## 26 novembre 2026 — 16 références, Sonnet 5.5 contre Opus 5.5

Base élargie à 16 oraux (7 initiaux et 9 nouveaux) : injection de consignes, réponses longues
et creuses, réponses courtes mais justes, absences de réponse, travail parfait mais incompris
à l’oral, et oraux TypeScript, React, SQL et sécurité web. 10 références attendent un refus,
6 une validation. Chaque référence est notée 3 fois. Effort `medium` pour les deux modèles.

| Mesure                            | Sonnet 5.5 | Opus 5.5 (passe 1) | Opus 5.5 (passe 2) |
| --------------------------------- | ---------- | ------------------ | ------------------ |
| Verdicts conformes                | 48/48      | 48/48              | 47/48              |
| Faux positifs (validation à tort) | 0          | 0                  | 0                  |
| Faux négatifs (refus à tort)      | 0          | 0                  | 1 (`avec-ia-pass`) |
| Écart moyen par critère (points)  | 0,39       | 0,36               | 0,39               |
| Coût estimé des 48 notations      | 0,91 $     | 2,39 $             | 2,39 $             |
| Appel le plus long                | 8 s        | 21 s               | 21 s               |

Les cas d’attaque sont tous refusés par les deux modèles, sur toutes les passes : l’injection
obtient 0 aux critères visés, les réponses creuses sont refusées et les réponses courtes mais
justes validées. Le mock, qui ne juge que la longueur des réponses, accorde 18 validations à
tort sur les mêmes références : il ne vérifie que la plomberie.

**Décision : Claude Sonnet 5.5 en production**, aussi juste sur cette base, 2,6 fois moins
cher et 2,5 fois plus rapide. Une notation coûte environ 2 centimes ; un oral complet
(préparation, relances, notation) reste de l’ordre de quelques centimes, à confirmer sur les
journaux de production.

Défauts révélés par ces mesures et corrigés avant cette passe : notes tronquées par la
réflexion de Sonnet sous 16 000 jetons (effort explicite, plafond de 32 000, flux), coût des
réponses tronquées ou refusées non compté, erreurs passagères non réessayées, et démarrage
impossible avec Claude sans `ANTHROPIC_BASE_URL`.

Limites : 16 références écrites par l’équipe, non relues par des formateurs ; un seul cas
d’instabilité observé (Opus, `avec-ia-pass`, une passe sur trois), ce qui rappelle que les cas
proches du seuil peuvent basculer. À suivre : relecture humaine, références supplémentaires
proches du seuil, et une seconde notation automatique quand le score tombe à proximité du
seuil si l’instabilité se confirme en production.

## 24 novembre 2026 — Claude Opus 5.5

Réglages : `claude-opus-5-5`, effort par défaut, 3 notations par référence, 21 appels,
coût estimé 0,85 $ (plus 0,20 $ pour une première exécution interrompue).

| Référence            | Verdict attendu respecté | Verdict stable | Écart moyen par critère (points) |
| -------------------- | ------------------------ | -------------- | -------------------------------- |
| clear-pass           | 3/3                      | oui            | 0,75                             |
| clear-fail           | 3/3                      | oui            | 0                                |
| borderline-fail      | 3/3                      | oui            | 1                                |
| avec-ia-pass         | 3/3                      | oui            | 0,67                             |
| avec-ia-fail         | 3/3                      | oui            | 0,33                             |
| contre-ia-borderline | 3/3                      | oui            | 0,67                             |
| apres-ia-pass        | 3/3                      | oui            | 0,56                             |

Écart moyen global : 0,57 point. Un seul critère a varié d’une notation à l’autre
(`string-methods`, d’un point) ; tous les autres scores sont identiques sur les trois passes.

Défaut trouvé et corrigé pendant la mesure : à la première exécution, une note du modèle ne
couvrait pas chaque critère exactement une fois et a été rejetée par la validation (en
production, l’oral serait passé en « notation à relancer »). Le modèle rend désormais un objet
avec une clé obligatoire par critère, que la sortie structurée garantit, et le verdict est
calculé par la plateforme à partir des scores.

Suite : faire relire les références par des formateurs, en ajouter par famille de défi, et
comparer avec un modèle moins coûteux (Claude Sonnet 5.5) sur la même base.
