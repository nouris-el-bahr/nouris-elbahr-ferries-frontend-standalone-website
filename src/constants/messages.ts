/**
 * Application messages and localization strings (French)
 */

export const MESSAGES = {
  // Common
  COMMON: {
    CANCEL: "Annuler",
    CONFIRM: "Confirmer",
    SUBMIT: "Soumettre",
    SAVE: "Enregistrer",
    DELETE: "Supprimer",
    CLEAR: "Effacer",
    CLOSE: "Fermer",
    LOADING: "Chargement...",
    ERROR: "Erreur",
    SUCCESS: "Succès",
    WARNING: "Avertissement",
  },

  // Validation
  VALIDATION: {
    REQUIRED: "Ce champ est requis",
    INVALID_EMAIL: "Adresse e-mail invalide",
    MIN_LENGTH: "La longueur minimale est {min} caractères",
    MAX_LENGTH: "La longueur maximale est {max} caractères",
    INVALID_FORMAT: "Format invalide",
    FILE_REQUIRED: "Veuillez sélectionner un fichier",
    FOLDER_REQUIRED: "Veuillez sélectionner un dossier",
    INVALID_FILE_TYPE: "Type de fichier non autorisé",
    FILE_TOO_LARGE: "Le fichier est trop volumineux",
    NO_FILES_FOUND: "Aucun fichier trouvé",
  },

  // Reports
  REPORTS: {
    PAYMENT: {
      TITLE: "Rapport de paiement",
      DESCRIPTION: "Générez la facture et le rapport de paiement groupé",
      SELECT_REFERENCE_FOLDER: "Dossier de rapports",
      SELECT_INVOICE_FILE: "Fichier de facture",
      BILLING_PERIOD: "Période de facturation",
      DOWNLOAD_DATE: "Date de téléchargement",
      PERIOD_START: "Début",
      PERIOD_END: "Fin",
      REFERENCE_FILES_HINT: "Sélectionnez le dossier contenant vos fichiers CSV ou Excel de référence",
      GENERATE_BUTTON: "Générer le rapport",
      GENERATING: "Génération en cours...",
      SUCCESS: "Rapport généré avec succès",
      ERROR: "Erreur lors de la génération du rapport",
    },
    SALES: {
      TITLE: "Rapport de ventes",
      DESCRIPTION: "Générez le rapport de ventes détaillé",
      SELECT_FILES: "Sélectionner les fichiers",
      PARAMETERS: "Paramètres",
      DOWNLOAD_DATE: "Date de téléchargement",
      FORMAT: "Format",
      VAT_SUFFIX: "Suffixe TVA",
      MODE: "Mode",
      ONLY_CHECKED_IN: "Uniquement les réservations confirmées",
      FILES_DETECTED: "Fichiers détectés",
      GENERATE_BUTTON: "Générer le rapport",
      GENERATING: "Génération en cours...",
      SUCCESS: "Rapports générés avec succès",
      ERROR: "Erreur lors de la génération du rapport",
    },
    CONSOLIDATED: {
      TITLE: "Facture consolidée",
      DESCRIPTION: "Générez la facture consolidée",
    },
  },

  // Results
  RESULTS: {
    TITLE: "Résultats de cette session",
    SUBTITLE: "Fichiers générés (session actuelle uniquement)",
    EMPTY: "Aucun résultat. Générez des rapports pour les voir ici.",
    CLEAR_ALL: "Effacer tous",
    TAB_ALL: "Tous",
    TAB_PAYMENT: "Paiement",
    TAB_SALES: "Ventes",
    TAB_CONSOLIDATED: "Consolidé",
    FILE_COLUMN: "Fichier",
    TYPE_COLUMN: "Type",
    GENERATED_COLUMN: "Généré le",
    NO_RESULTS_FOUND: "Aucun résultat trouvé.",
  },

  // Dashboard
  DASHBOARD: {
    TITLE: "Tableau de bord",
    SUBTITLE: "Mode hors ligne - Gestion des rapports Nouris El Bahr",
    TOTAL_REPORTS: "Total rapports",
    PAYMENT_REPORTS: "Rapports de paiement",
    SALES_REPORTS: "Rapports de ventes",
    QUICK_ACTIONS: "Actions rapides",
    RECENT_RESULTS: "Résultats de cette session",
    NO_RECENT_RESULTS: "Aucun résultat pour le moment. Générez des rapports pour les voir ici.",
  },

  // File Upload
  FILE_UPLOAD: {
    SELECT_FOLDER: "Sélectionner un dossier",
    SELECT_FILES: "Sélectionner des fichiers",
    DRAG_DROP: "Glissez-déposez vos fichiers ici ou cliquez pour parcourir",
    FILES_SELECTED: "{count} fichier(s) sélectionné(s)",
    UPLOADING: "Téléchargement en cours...",
    UPLOAD_COMPLETE: "Téléchargement terminé",
  },

  // Errors
  ERRORS: {
    NETWORK_ERROR: "Erreur réseau. Vérifiez votre connexion.",
    SERVER_ERROR: "Erreur serveur. Veuillez réessayer.",
    TIMEOUT: "La demande a expiré. Veuillez réessayer.",
    UNKNOWN_ERROR: "Une erreur inconnue s'est produite.",
    RETRY: "Réessayer",
  },
} as const;
