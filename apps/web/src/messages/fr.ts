export const fr = {
  title: 'Kompri',
  tagline: 'Apprends avec l’IA, prouve sans elle.',
  description:
    'Kompri est une plateforme d’apprentissage du développement web où l’IA est autorisée pour apprendre et interdite pour prouver : chaque compétence se valide à l’oral.',
  nav: {
    path: 'Parcours',
    search: 'Rechercher',
    dashboard: 'Tableau de bord',
    account: 'Mon compte',
    login: 'Se connecter',
    register: 'Créer un compte',
    logout: 'Se déconnecter',
    skip: 'Aller au contenu',
  },
  footer: {
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    terms: 'Conditions d’utilisation',
    about: 'Comment ça marche',
    note: 'Contenus pédagogiques rédigés avec assistance et en attente de relecture humaine.',
  },
  home: {
    heroTitle: 'Apprends avec l’IA.\nProuve sans elle.',
    heroText:
      'Des cours complets de développement web, des défis concrets, et un oral face à un examinateur qui vérifie que tu as vraiment compris.',
    start: 'Commencer gratuitement',
    explore: 'Explorer le parcours',
    continue: 'Reprendre mon parcours',
    stepsTitle: 'Comment ça marche',
    steps: [
      {
        title: 'Apprendre',
        text: 'Des leçons détaillées, des exemples exécutables et des exercices corrigés. Utilise l’IA pour te faire expliquer ce qui bloque.',
      },
      {
        title: 'Pratiquer',
        text: 'Quatre familles de défis : sans IA, avec l’IA, contre l’IA et après l’IA. Comme dans un vrai métier.',
      },
      {
        title: 'Défendre à l’oral',
        text: 'Un oral chronométré, sans aide : l’examinateur te questionne sur ton propre travail et te fait modifier ou déboguer.',
      },
      {
        title: 'Entretenir',
        text: 'Une compétence validée expire. Tu la renouvelles pour garder une preuve à jour de ce que tu sais faire.',
      },
    ],
    treeTitle: 'Le parcours développement web full-stack',
    treeText:
      'Six domaines, des fondations du web jusqu’à une application complète. Chaque compétence débloque les suivantes.',
  },
  tree: {
    unavailable:
      'Le parcours est momentanément indisponible. Réessaie dans un instant.',
    prerequisites: 'Prérequis',
    none: 'Aucun',
    hours: (hours: number) => `${hours} h`,
    lessons: (count: number) => `${count} leçon${count > 1 ? 's' : ''}`,
    upcoming: 'Bientôt disponible',
  },
  states: {
    validated: 'Validée',
    expired: 'À renouveler',
    available: 'Disponible',
    locked: 'Verrouillée',
    upcoming: 'À venir',
  },
  stateHelp: {
    validated: 'Compétence validée à l’oral, en cours de validité.',
    expired: 'Ta validation a expiré : repasse un oral pour la renouveler.',
    available: 'Tous les prérequis sont validés : tu peux passer l’oral.',
    locked:
      'Prérequis non validés : valide-les d’abord, ou passe l’oral en positionnement si tu les maîtrises déjà.',
    upcoming: 'Le contenu de cette compétence est en préparation.',
  },
  families: {
    SANS_IA: {
      label: 'Sans IA',
      text: 'Un exercice court sur les fondamentaux, à réaliser seul.',
    },
    AVEC_IA: {
      label: 'Avec l’IA',
      text: 'Un mini-projet réalisé avec l’IA, que tu dois comprendre et défendre.',
    },
    CONTRE_IA: {
      label: 'Contre l’IA',
      text: 'Du code généré qui contient des failles : trouve-les et corrige-les.',
    },
    APRES_IA: {
      label: 'Après l’IA',
      text: 'Un projet existant à faire évoluer ou à dépanner sans tout régénérer.',
    },
  },
  skill: {
    objectives: 'Ce que tu sauras faire',
    lessons: 'Leçons',
    challenges: 'Défis',
    challengesIntro:
      'Réalise un défi, soumets ton travail, puis défends-le à l’oral pour valider la compétence.',
    minutes: (minutes: number) => `${minutes} min`,
    startLesson: 'Commencer le cours',
    noLessons: 'Les leçons de cette compétence sont en préparation.',
    noChallenges: 'Les défis de cette compétence sont en préparation.',
    validUntil: (date: string) => `Valide jusqu’au ${date}`,
    expiredOn: (date: string) => `Expirée le ${date}`,
    domain: 'Domaine',
    lessonsRead: (read: number, total: number) => `${read} / ${total} lues`,
    readMark: 'Lue',
  },
  lesson: {
    sources: 'Pour aller plus loin',
    previous: 'Leçon précédente',
    next: 'Leçon suivante',
    backToSkill: 'Retour à la compétence',
    toChallenges: 'Passer aux défis',
    contents: 'Leçons de la compétence',
    solution: 'Solution',
    markRead: 'Marquer comme lue',
    read: 'Leçon lue',
    markUnread: 'Marquer comme non lue',
    note: 'À noter',
    tip: 'Astuce',
    warning: 'Attention',
  },
  challenge: {
    instructions: 'Consigne',
    deliverable: 'À soumettre',
    rubric: 'Grille d’évaluation de l’oral',
    rubricIntro: (percent: number) =>
      `L’oral est réussi à partir de ${percent} % des points. Seule la compréhension démontrée à l’oral compte.`,
    criterion: 'Critère',
    points: (count: number) => `${count} pt${count > 1 ? 's' : ''}`,
    submitTitle: 'Soumettre mon travail',
    submitHelp:
      'Colle ton code et tes explications. Ton travail est enregistré dans ton compte, puis tu pourras passer l’oral quand tu te sens prêt.',
    workLabel: 'Ton travail',
    submit: 'Enregistrer mon travail',
    loginToSubmit: 'Connecte-toi pour soumettre un travail et passer l’oral.',
    upcoming: 'Ce défi n’est pas encore ouvert aux soumissions.',
    attempts: 'Mes tentatives',
    attemptOn: (date: string) => `Travail du ${date}`,
    startOral: 'Passer l’oral',
    viewOral: 'Voir l’oral',
    resumeOral: 'Reprendre l’oral',
    oralWarningTitle: 'Avant de commencer l’oral',
    oralWarning: (questions: number, minutes: number) =>
      `${questions} questions, ${minutes} minutes par réponse, sans aide ni copier-coller. Une réponse non envoyée à temps compte comme absente. L’oral consomme une session de ton quota.`,
    lockedHint:
      'Valide d’abord les compétences prérequises pour passer cet oral.',
    placementTitle: 'Oral de positionnement',
    placementText:
      'Tu n’as pas encore validé les prérequis de cette compétence. Si tu les maîtrises déjà, passe cet oral en positionnement : en cas de réussite, les compétences prérequises compteront comme acquises pour débloquer la suite du parcours.',
    startPlacement: 'Passer l’oral en positionnement',
    estimated: (minutes: number) => `Environ ${minutes} min`,
  },
  oral: {
    title: 'Oral',
    question: (index: number, total: number) =>
      `Question ${index} sur ${total}`,
    timeLeft: 'Temps restant',
    answerLabel: 'Ta réponse',
    answerSection: 'Répondre à la question',
    answerHelp:
      'Réponds avec tes mots. Le collage est désactivé : l’oral vérifie ta compréhension, pas ta capacité à copier.',
    send: 'Envoyer ma réponse',
    sending: 'L’examinateur lit ta réponse…',
    pasteBlocked: 'Le collage est désactivé pendant l’oral.',
    abandon: 'Abandonner l’oral',
    abandonConfirm:
      'Abandonner l’oral ? Les questions restantes compteront comme sans réponse.',
    examiner: 'Examinateur',
    you: 'Toi',
    timeUp: 'Temps écoulé : ta réponse en cours est envoyée.',
    leaveWarning: 'Un oral est en cours. Quitter la page ne l’arrête pas.',
    resultTitle: 'Résultat de l’oral',
    passed: 'Compétence validée',
    failed: 'Pas encore validée',
    score: (score: number, max: number) => `${score} / ${max} points`,
    threshold: (percent: number) => `seuil de réussite : ${percent} %`,
    feedback: 'Retour de l’examinateur',
    criteria: 'Détail par critère',
    validUntil: (date: string) => `Validation valable jusqu’au ${date}.`,
    gradingFailed:
      'L’examinateur n’a pas pu terminer la notation. Ton oral est enregistré : relance la notation.',
    retryGrading: 'Relancer la notation',
    backToChallenge: 'Retour au défi',
    backToSkill: 'Retour à la compétence',
    tryAgain:
      'Pour retenter, revois les notions signalées puis soumets une nouvelle version de ton travail.',
    transcript: 'Transcription',
    error: 'Une erreur est survenue. Réessaie dans un instant.',
  },
  search: {
    title: 'Rechercher dans les cours',
    label: 'Mots à rechercher',
    placeholder: 'Par exemple : promesse, jointure, cookie…',
    submit: 'Rechercher',
    help: 'Les accents et les terminaisons sont ignorés. Mets un groupe de mots entre guillemets pour le chercher tel quel.',
    tooShort: 'Saisis au moins deux caractères.',
    count: (n: number, query: string) =>
      n === 0
        ? `Aucune leçon pour « ${query} »`
        : `${n} leçon${n > 1 ? 's' : ''} pour « ${query} »`,
    none: 'Essaie un autre mot ou un terme plus général.',
  },
  dashboard: {
    title: 'Tableau de bord',
    hello: (name: string) => `Bonjour ${name}`,
    activeOral: 'Tu as un oral en cours.',
    resume: 'Reprendre',
    nextLesson: 'Reprendre la lecture',
    readLesson: 'Lire la leçon',
    quota: (used: number, limit: number, hours: number) =>
      `${used} oral${used > 1 ? 's' : ''} sur ${limit} utilisés sur les ${hours} dernières heures.`,
    validated: 'Compétences validées',
    lessonsRead: (read: number, total: number) =>
      `${read} leçon${read > 1 ? 's' : ''} lue${read > 1 ? 's' : ''} sur ${total}`,
    toRenew: 'À renouveler',
    expiringSoon: 'Expire bientôt',
    available: 'Prochaines étapes',
    recentOrals: 'Derniers oraux',
    noOrals:
      'Aucun oral pour l’instant. Choisis une compétence disponible pour commencer.',
    progress: (done: number, total: number) =>
      `${done} compétence${done > 1 ? 's' : ''} validée${done > 1 ? 's' : ''} sur ${total}`,
    empty: 'Rien ici pour le moment.',
    oralStatus: {
      active: 'En cours',
      grading_failed: 'Notation à relancer',
      completed: 'Terminé',
    },
    verdict: { PASSED: 'Réussi', FAILED: 'Non validé' },
  },
  auth: {
    loginTitle: 'Se connecter',
    registerTitle: 'Créer un compte',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    passwordHelp:
      'Au moins 12 caractères. Une phrase de passe facile à retenir est idéale.',
    displayName: 'Prénom ou pseudonyme',
    loginSubmit: 'Se connecter',
    registerSubmit: 'Créer mon compte',
    noAccount: 'Pas encore de compte ?',
    forgot: 'Mot de passe oublié ?',
    forgotTitle: 'Mot de passe oublié',
    forgotText:
      'Indique l’adresse de ton compte : tu recevras un lien valable une heure pour choisir un nouveau mot de passe.',
    forgotSubmit: 'Recevoir le lien',
    forgotSent:
      'Si un compte existe avec cette adresse, un e-mail vient de lui être envoyé. Pense à regarder dans les indésirables.',
    resetTitle: 'Nouveau mot de passe',
    resetSubmit: 'Enregistrer le nouveau mot de passe',
    resetDone: 'Ton mot de passe a été changé : connecte-toi avec le nouveau.',
    newPassword: 'Nouveau mot de passe',
    hasAccount: 'Déjà un compte ?',
    consent:
      'En créant un compte, tu acceptes les conditions d’utilisation et le traitement de tes travaux et oraux pour t’évaluer, comme décrit dans la politique de confidentialité.',
    errors: {
      invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
      account_locked:
        'Trop de tentatives échouées. Réessaie dans quelques minutes.',
      email_taken: 'Un compte existe déjà avec cette adresse.',
      invalid_input: 'Vérifie les champs du formulaire.',
      password_short: 'Le mot de passe doit contenir au moins 12 caractères.',
      reset_link_invalid:
        'Ce lien est invalide, expiré ou déjà utilisé. Demande un nouveau lien.',
      generic: 'Une erreur est survenue. Réessaie dans un instant.',
    },
  },
  account: {
    title: 'Mon compte',
    profile: 'Profil',
    memberSince: (date: string) => `Membre depuis le ${date}`,
    exportTitle: 'Exporter mes données',
    exportText:
      'Télécharge l’ensemble de tes données : profil, travaux soumis, transcriptions d’oraux et validations, au format JSON.',
    exportButton: 'Télécharger mes données',
    deleteTitle: 'Supprimer mon compte',
    deleteText:
      'La suppression est immédiate et définitive : travaux, oraux, validations et sessions sont effacés.',
    deleteConfirm: 'Confirme avec ton mot de passe',
    deleteButton: 'Supprimer définitivement mon compte',
  },
  errors: {
    oral_in_progress:
      'Un autre oral est déjà en cours : termine-le ou abandonne-le d’abord.',
    quota_exceeded:
      'Tu as atteint ton quota d’oraux pour la période. Reviens un peu plus tard.',
    prerequisites_missing: 'Valide d’abord toutes les compétences prérequises.',
    oral_exists:
      'Cette tentative a déjà son oral. Soumets une nouvelle version pour retenter.',
    examiner_unavailable:
      'L’examinateur est momentanément indisponible. Réessaie dans un instant.',
    skill_unavailable: 'Cette compétence n’est pas encore ouverte.',
    oral_closed: 'Cet oral est terminé.',
    answer_conflict: 'Cette question a déjà reçu une réponse.',
    examiner_changed:
      'L’examinateur a changé pendant l’oral. Contacte le support.',
    session_expired: 'Ta session a expiré : reconnecte-toi.',
    email_unverified:
      'Confirme d’abord ton adresse e-mail : le lien t’a été envoyé à l’inscription.',
    review_exists: 'Un réexamen a déjà été demandé pour cet oral.',
    review_window_closed: 'Le délai pour demander un réexamen est dépassé.',
    review_not_allowed: 'Seul un oral noté peut être réexaminé.',
    review_closed: 'Cette demande a déjà été traitée.',
    verification_rate_limited:
      'Trop de liens envoyés : réessaie dans une heure.',
    verification_link_invalid:
      'Ce lien de confirmation est invalide, expiré ou déjà utilisé.',
    email_taken: 'Un compte existe déjà avec cette adresse.',
    email_unchanged: 'C’est déjà ton adresse actuelle.',
    invalid_credentials: 'Mot de passe incorrect.',
    admin_only: 'Accès réservé aux administrateurs.',
    not_found: 'Élément introuvable.',
    invalid_input: 'Le contenu envoyé est invalide.',
    generic: 'Une erreur est survenue. Réessaie dans un instant.',
  },
  tutor: {
    open: 'Poser une question au tuteur IA',
    title: 'Tuteur IA',
    intro:
      'Pose tes questions sur cette leçon. Le tuteur explique, donne des indices et des exemples. Il peut se tromper : vérifie ce qu’il dit.',
    placeholder: 'Ta question…',
    send: 'Envoyer',
    close: 'Fermer le tuteur',
    thinking: 'Le tuteur réfléchit…',
    you: 'Toi',
    tutor: 'Tuteur',
    quota: (used: number, limit: number) =>
      `${used} / ${limit} réponses utilisées aujourd’hui`,
    loginRequired: 'Connecte-toi pour utiliser le tuteur.',
    privacy:
      'La conversation n’est pas enregistrée : elle disparaît quand tu quittes la page.',
    errors: {
      tutor_during_oral:
        'Le tuteur est désactivé pendant un oral : l’IA est autorisée pour apprendre, pas pour prouver.',
      tutor_quota_exceeded:
        'Tu as utilisé toutes tes réponses du tuteur pour cette période.',
      unauthenticated: 'Connecte-toi pour utiliser le tuteur.',
      generic: 'Le tuteur est momentanément indisponible.',
    },
    reset: 'Nouvelle conversation',
  },
  verify: {
    banner: 'Confirme ton adresse e-mail pour pouvoir passer les oraux.',
    resend: 'Renvoyer le lien',
    resent: 'Un nouveau lien vient d’être envoyé.',
    title: 'Confirmer mon adresse e-mail',
    text: 'Clique sur le bouton pour confirmer ton adresse e-mail.',
    submit: 'Confirmer mon adresse',
    done: 'Ton adresse e-mail est confirmée.',
    toDashboard: 'Aller au tableau de bord',
  },
  settings: {
    passwordTitle: 'Changer mon mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    passwordSubmit: 'Changer le mot de passe',
    passwordDone:
      'Mot de passe changé. Tes autres appareils ont été déconnectés.',
    emailTitle: 'Changer mon adresse e-mail',
    newEmail: 'Nouvelle adresse e-mail',
    emailSubmit: 'Recevoir le lien de confirmation',
    emailDone:
      'Un lien a été envoyé à la nouvelle adresse : le changement prendra effet après confirmation.',
    unverified: 'Adresse non confirmée',
  },
  review: {
    title: 'Contester ce résultat',
    text: 'Si tu penses que la notation est injuste (question ambiguë, incident technique, réponse mal comprise), explique pourquoi : une personne réexaminera ton oral.',
    label: 'Ton explication (20 caractères au moins)',
    submit: 'Demander un réexamen',
    deadline: (date: string) => `Possible jusqu’au ${date}.`,
    statusTitle: 'Demande de réexamen',
    open: 'Ta demande est en attente d’examen par une personne.',
    confirmed: 'Après réexamen, le résultat est confirmé.',
    overturned: 'Après réexamen, le résultat a été modifié.',
    response: 'Réponse',
    yourMessage: 'Ta demande',
  },
  admin: {
    nav: 'Administration',
    title: 'Réexamens',
    empty: 'Aucune demande en attente.',
    showAll: 'Voir aussi les demandes traitées',
    showOpen: 'Voir seulement les demandes en attente',
    learner: 'Apprenant',
    challenge: 'Défi',
    verdict: 'Verdict actuel',
    status: {
      open: 'En attente',
      confirmed: 'Confirmé',
      overturned: 'Modifié',
    },
    message: 'Demande de l’apprenant',
    instructions: 'Consigne du défi',
    notes: 'Notes d’examinateur (confidentielles)',
    submission: 'Travail soumis',
    transcript: 'Transcription',
    decisionTitle: 'Décision',
    confirm: 'Confirmer le résultat',
    overturn: (verdict: string) =>
      verdict === 'PASSED'
        ? 'Invalider la compétence'
        : 'Valider la compétence',
    response: 'Réponse envoyée à l’apprenant',
    submit: 'Enregistrer la décision',
    decided: 'Décision enregistrée et apprenant prévenu par e-mail.',
    signals: (paste: number, focus: number, first: string, typing: string) =>
      `Collages bloqués : ${paste} · sorties de l’onglet : ${focus} · première frappe : ${first} · durée de saisie : ${typing}`,
    signalsNote:
      'Indicateurs informatifs mesurés par le navigateur : ils ne prouvent rien seuls et n’entrent pas dans la note.',
    statsNav: 'Statistiques',
    reviewsNav: 'Réexamens',
    statsTitle: 'Statistiques',
    statsIntro:
      'Données agrégées pour repérer les défis mal calibrés : taux de réussite extrême, scores atypiques ou contestations fréquentes.',
    learners: 'Apprenants',
    active: 'Actifs sur 30 jours',
    orals7d: 'Oraux sur 7 jours',
    openReviews: 'Réexamens en attente',
    columns: {
      challenge: 'Défi',
      orals: 'Oraux notés',
      passRate: 'Réussite',
      score: 'Score moyen',
      reviews: 'Contestations',
      overturned: 'Modifiés',
    },
  },
  failure: {
    title: 'Une erreur est survenue',
    text: 'La page n’a pas pu s’afficher. Réessaie dans un instant ; si le problème persiste, écris-nous.',
    retry: 'Réessayer',
    home: 'Retour à l’accueil',
  },
  loading: 'Chargement…',
  notFound: {
    title: 'Page introuvable',
    text: 'Cette page n’existe pas ou plus.',
    back: 'Retour à l’accueil',
  },
};

export type Messages = typeof fr;
