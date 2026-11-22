// Long-form pages. Bracketed placeholders must be completed by the publisher
// before any public launch: they are legal facts that cannot be invented.

export const legalNotice = `## Éditeur du site

- Raison sociale ou nom : **[à compléter avant mise en ligne]**
- Adresse : **[à compléter]**
- Contact : **[adresse e-mail de contact à compléter]**
- Directeur ou directrice de la publication : **[à compléter]**
- Immatriculation (RCS, SIREN) le cas échéant : **[à compléter]**

## Hébergement

- Hébergeur : **[nom, adresse et téléphone de l’hébergeur à compléter]**

## Propriété intellectuelle

Les cours, défis et grilles d’évaluation publiés sur Kompri sont protégés. Toute reproduction
substantielle sans autorisation est interdite. Les extraits de code des cours peuvent être
réutilisés librement dans vos propres projets d’apprentissage.

## Contenus générés avec assistance

Les contenus pédagogiques ont été rédigés avec l’assistance d’outils d’IA puis vérifiés
techniquement. Ils sont en attente de relecture humaine complète : signalez toute erreur à
l’adresse de contact.`;

export const privacyPolicy = `Cette page explique quelles données Kompri traite, pourquoi, et comment exercer tes
droits. Elle décrit le fonctionnement réel de l’application.

## Responsable du traitement

**[Identité et coordonnées du responsable à compléter avant mise en ligne]**

## Données traitées

| Données | Finalité | Base légale |
| --- | --- | --- |
| Adresse e-mail, prénom ou pseudonyme | Créer et gérer ton compte | Exécution du service |
| Mot de passe | Te connecter ; seul un condensat (scrypt) est conservé | Exécution du service |
| Travaux soumis aux défis | Préparer et conduire l’oral | Exécution du service |
| Transcriptions d’oraux, notes et retours | Évaluer et suivre ta progression | Exécution du service |
| Validations et dates d’expiration | Afficher tes compétences validées | Exécution du service |
| Nombre d’oraux passés et de réponses du tuteur | Appliquer les quotas d’utilisation | Intérêt légitime |
| Demandes de réinitialisation du mot de passe | Envoyer un lien à usage unique, valable une heure | Exécution du service |

Kompri ne collecte ni données de navigation publicitaires, ni traceurs tiers.

## Examinateur IA et sous-traitants

Pendant un oral, la consigne du défi, la grille, ton travail et tes réponses sont transmis au
fournisseur de modèle de langage configuré pour générer les questions et la notation. Ton
adresse e-mail et ton identifiant ne sont jamais transmis. Évite de mettre des données
personnelles dans tes travaux.

- Fournisseur de modèle utilisé : **[à compléter : nom, pays d’hébergement, garanties]**
- Service d’envoi des e-mails : **[à compléter]**

Les journaux techniques des appels au modèle ne contiennent que l’usage, le modèle, la durée,
le nombre de jetons, le coût estimé et le statut : jamais le contenu des échanges.

## Décision automatisée

La validation d’une compétence résulte d’une évaluation automatisée par l’examinateur IA,
fondée sur une grille publique et justifiée critère par critère. Elle n’a pas d’effet
juridique. Tu peux contester un résultat et demander un réexamen humain en écrivant à
l’adresse de contact.

## Durées de conservation

- Compte et données associées : jusqu’à la suppression du compte.
- Sessions de connexion : 30 jours au plus.
- Liens de réinitialisation : une heure, utilisables une seule fois.
- Comptes inactifs : **[durée à définir avant mise en ligne]**.

## Cookies

Kompri dépose un seul cookie, strictement nécessaire : \`kompri_session\`, qui maintient ta
connexion. Il n’est utilisé à aucune autre fin et ne requiert donc pas de consentement.

## Tes droits

Tu disposes des droits d’accès, de rectification, d’effacement, de limitation, d’opposition
et de portabilité. Depuis ton compte, tu peux à tout moment :

- **exporter** l’ensemble de tes données au format JSON ;
- **supprimer** ton compte : la suppression est immédiate et efface travaux, oraux,
  validations et sessions.

Pour toute autre demande : **[adresse de contact à compléter]**. Tu peux aussi introduire une
réclamation auprès de la CNIL (cnil.fr).`;

export function howItWorks(settings: {
  questions: number;
  minutes: number;
  orals: number;
  hours: number;
  validityDays: number;
}) {
  return `Kompri part d’un constat : avec l’IA, produire du code ne prouve plus qu’on le comprend.
La plateforme sépare donc deux moments. **Pour apprendre, l’IA est autorisée** et même
encouragée. **Pour prouver, elle est interdite** : chaque compétence se valide à l’oral.

## 1. Apprendre

Chaque compétence propose des leçons complètes : explications progressives, exemples de code
exécutables, pièges courants et exercices corrigés. Tu peux demander à une IA de reformuler
ce qui bloque : l’essentiel est de pouvoir ensuite l’expliquer seul.

## 2. Pratiquer avec quatre familles de défis

| Famille | Ce que tu fais | Ce que ça prouve |
| --- | --- | --- |
| Sans IA | Un exercice court sur les fondamentaux | Tu maîtrises les bases |
| Avec l’IA | Un mini-projet réalisé avec l’IA | Tu comprends ce que l’IA a produit |
| Contre l’IA | Trouver les failles d’un code généré | Tu sais relire et corriger |
| Après l’IA | Faire évoluer un projet existant | Tu sais intervenir sans tout régénérer |

## 3. Défendre son travail à l’oral

Quand ton travail est prêt, tu le soumets puis tu passes l’oral :

- ${settings.questions} questions posées par l’examinateur à partir de **ton** travail : explication,
  modification, bug introduit, cas limite ;
- ${settings.minutes} minutes par réponse, affichées par un minuteur ; une réponse non envoyée à
  temps compte comme absente ;
- pas d’aide ni de copier-coller : c’est ta compréhension qui est évaluée ;
- une notation critère par critère, selon la grille publiée sur la page du défi, avec une
  justification et un retour écrit.

Tu peux passer jusqu’à ${settings.orals} oraux par période de ${settings.hours} heures. Pour retenter un
oral, soumets une nouvelle version de ton travail.

## 4. Entretenir ses compétences

Une compétence validée l’est pour ${settings.validityDays} jours. Ensuite, elle passe « à renouveler » :
un nouvel oral la revalide. Pour passer l’oral d’une compétence, ses prérequis doivent avoir
été validés au moins une fois.

## Ce que l’examinateur n’est pas

L’examinateur est un modèle de langage guidé par une grille, des notes de correction et des
garde-fous. Il peut se tromper : chaque note est justifiée et tu peux demander un réexamen
humain. Sa fiabilité est mesurée en continu sur des oraux de référence.`;
}
