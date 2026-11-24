# Mesures de l’examinateur

`pnpm evals:live` fait noter chaque oral de référence (`packages/evals/references`) trois fois
par le modèle configuré et compare le résultat aux notes attendues. Les références sont
`humanReview: pending` : elles ont été écrites par l’équipe, pas relues par des formateurs.
Ces mesures disent donc si le modèle s’accorde avec ces références, pas s’il est fiable au
sens d’une évaluation humaine.

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
