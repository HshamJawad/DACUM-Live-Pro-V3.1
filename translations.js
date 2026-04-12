/* translations.js v3 -- DACUM Live Pro i18n Engine */
(function () {
  'use strict';
  var TRANSLATIONS = {
    en: {
      appSubtitle: 'Analysis • Verification • Competency Mapping • Learning Design',
      tabChartInfo: 'Chart Info',
      tabDuties: 'Duties & Tasks',
      tabAdditionalInfo: 'Additional Info',
      tabVerification: 'Task Verification',
      tabClustering: 'Competency Clusters',
      tabLearningOutcomes: 'Learning Outcomes',
      tabModuleMapping: 'Module Mapping',
      tabHelp: 'Help',
      h2ChartInfo: 'DACUM Research Chart Information',
      labelDate: 'DACUM Date:',
      labelVenue: 'Venue:',
      labelProducedFor: 'Produced For:',
      labelProducedBy: 'Produced By:',
      labelOccupation: 'Occupation Title:',
      labelJobTitle: 'Job Title:',
      labelSector: 'Sector (Optional):',
      labelContext: 'Country / Context (Optional):',
      labelFacilitators: 'Facilitators:',
      labelObservers: 'Observers:',
      labelPanelMembers: 'Panel Members:',
      labelAddLogo: 'Add Logo',
      labelRemove: 'Remove',
      btnProceedDuties: 'Proceed to Duties & Tasks →',
      phVenue: 'e.g., Conference Center, City',
      phProducedFor: 'e.g., Company/Organization Name',
      phProducedBy: 'e.g., Training Institution Name',
      phOccupation: 'e.g., Automotive Technician',
      phJobTitle: 'e.g., Service Technician Level 2',
      phSector: 'e.g., Automotive, Healthcare, IT',
      phContext: 'e.g., Iraq, Middle East',
      phFacilitators: 'Enter facilitator names (one per line)',
      phObservers: 'Enter observer names (one per line)',
      phPanel: 'Enter panel member names (one per line)',
      h2Duties: 'Duties and Tasks',
      aiCardTitle: 'AI-Powered DACUM Generation',
      aiCardDesc: 'Generate complete duties and tasks automatically based on occupation details',
      btnGenerateAI: 'Generate AI Draft',
      aiCardHint: 'Make sure to fill Occupation Title and Job Title in Chart Info tab first',
      refineTitle: 'Refine AI Results',
      refineDesc: 'Clean duplicates, normalize wording, remove result clauses and fragments.',
      refineReversible: 'Reversible with Ctrl+Z.',
      btnRefine: 'Refine Results',
      btnAddDuty: 'Add Duty',
      btnProceedAdditional: 'Proceed to Additional Info →',
      btnClearTab: 'Clear This Tab',
      btnTableView: 'Table View',
      btnCardView: 'Card View',
      h2Additional: 'Additional Information',
      additionalDesc: 'Enter information for each section. Click rename to customize headings.',
      sectionKnowledge: 'Knowledge Requirements',
      sectionSkills: 'Skills Requirements',
      sectionBehaviors: 'Worker Behaviors/Traits',
      sectionTools: 'Tools, Equipment, Supplies and Materials',
      sectionTrends: 'Future Trends and Concerns',
      sectionAcronyms: 'Acronyms',
      sectionCareerPath: 'Career Path',
      btnAddSection: 'Add Section',
      btnRename: 'Rename',
      btnClearSection: 'Clear',
      btnNumber: 'Number',
      btnBullet: 'Bullet',
      skillsMatrixTitle: 'Skills Level Matrix (click to expand)',
      skillsMatrixSubtitle: 'Employability Competencies by Occupational Level',
      btnProceedVerification: 'Proceed to Task Verification →',
      h2Verification: 'Task Verification & Training Priority',
      verificationDesc: 'Rate each task on three scales (0-3). Select the data collection mode first.',
      modeWorkshop: 'Workshop (Facilitated)',
      modeSurvey: 'Individual / Survey',
      modeStandard: 'Standard (DACUM)',
      modeExtended: 'Extended (DACUM)',
      labelParticipants: 'Number of Workshop Participants:',
      formulaIF: 'Importance x Frequency',
      formulaIFD: 'Importance x Frequency x Difficulty',
      btnRefreshDuties: 'Refresh Duties & Tasks',
      btnFinalize: 'Finalize & Create Live Voting Session',
      btnBypass: 'Proceed to Competency Clustering Without Verification',
      btnResetDecision: 'Reset Decision',
      btnRefreshResults: 'Refresh Voting Results',
      btnCloseVoting: 'Close Voting (Lock Submissions)',
      btnProceedClustering: 'Proceed to Competency Clustering →',
      h2Clustering: 'Competency Clusters',
      availableTasksTitle: 'Available Tasks',
      availableTasksDesc: 'Select tasks to group into a cluster, then click Create Cluster.',
      createdClustersTitle: 'Created Clusters',
      btnCreateCluster: 'Create Cluster',
      btnProceedLO: 'Proceed to Learning Outcomes →',
      h2LO: 'Learning Outcomes',
      btnCreateLO: 'Create Learning Outcome from Selected Criteria',
      btnProceedModule: 'Proceed to Module Mapping →',
      h2Module: 'Module Mapping',
      btnCreateModule: 'Create New Module',
      btnProceedModuleBuilder: 'Proceed to Module Builder',
      h2Help: 'Help Center',
      helpSubtitle: 'Everything you need to use DACUM Live Pro effectively',
      msgModeWorkshop: 'Data collection mode: Workshop (Facilitated)',
      msgModeSurvey: 'Data collection mode: Individual / Survey',
      msgWorkflowStandard: 'Workflow mode: Standard (DACUM)',
      msgWorkflowExtended: 'Workflow mode: Extended (DACUM)',
      msgParticipantsSet: 'Participants set to {n}. Re-validating all tasks...',
      msgFormulaIF: 'Priority formula: I x F',
      msgFormulaIFD: 'Priority formula: I x F x D',
      msgExportAppendix: 'Export mode: Include as Appendix',
      msgExportStandalone: 'Export mode: Standalone Report',
      msgLoadedTasks: 'Loaded {d} duties with {t} tasks for verification',
      msgNoDuties: 'No Duties Found',
      msgNoDutiesDesc: 'Please go to Duties & Tasks tab and create duties with tasks first.',
      msgNoDutiesHint: 'Once duties are added, click Refresh Duties & Tasks above.',
      msgDashboardCsvOnly: 'Dashboard export only available in Workshop mode',
      msgDashboardExported: 'Dashboard exported as CSV successfully!',
      msgClearAll: 'All data cleared successfully. Ready for a new DACUM session.',
      msgClearChartInfo: 'Chart Info cleared!',
      msgClearDuties: 'Duties & Tasks cleared!',
      msgClearAdditional: 'Additional Info cleared!',
      msgClearVerification: 'Task Verification cleared!',
      msgClearClustering: 'Competency Clusters cleared!',
      msgClearLO: 'Learning Outcomes cleared!',
      msgClearModule: 'Module Mapping cleared!',
      msgAiLimitReached: 'Daily limit reached ({n} generations). Try again tomorrow!',
      msgAiNeedTitles: 'Please enter Occupation Title and Job Title before generating.',
      msgAiCancelled: 'AI generation cancelled. Existing duties preserved.',
      msgAiSuccess: 'AI draft generated! {n} duties with tasks created.',
      msgAiError: 'Error: {msg}. Check browser console for details.',
      msgProjectCreated: 'Project "{name}" created',
      msgProjectRenamed: 'Renamed to "{name}"',
      msgProjectDeleted: 'Project deleted',
      thTask: 'Task',
      thImportance: 'Importance (0-3)',
      thFrequency: 'Frequency (0-3)',
      thDifficulty: 'Learning Difficulty (0-3)',
      thTaskScore: 'Task Score',
      thCompletion: 'Completion',
      thMeanImportance: 'Mean Importance',
      thMeanFrequency: 'Mean Frequency',
      thMeanDifficulty: 'Mean Difficulty',
      thPriorityIndex: 'Priority Index',
      thImportanceCounts: 'Importance Counts (0-3)',
      thFrequencyCounts: 'Frequency Counts (0-3)',
      thDifficultyCounts: 'Difficulty Counts (0-3)',
      thPerforms: 'Performs?',
      thCriticalityCounts: 'Criticality Counts (0-3)',
      thWeightedScore: 'Weighted Score',
      thPriority: 'Priority',
      thComments: 'Comments',
      skillCatCommunication: 'Communication',
      skillCatTeamwork: 'Teamwork',
      skillCatSelfMarketing: 'Self-marketing',
      skillCatProblemSolving: 'Problem Solving',
      skillCatEntrepreneurship: 'Entrepreneurship',
      skillCatICT: 'Computer/ICT skills',
      skillCatLanguages: 'Foreign Languages',
      skillCatMaths: 'Mathematical Skills',
      expDacumChart: 'DACUM Research Chart',
      expDutiesAndTasks: 'Duties and Tasks',
      expAdditionalInfo: 'Additional Information',
      expKnowledge: 'Knowledge Requirements',
      expSkills: 'Skills Requirements',
      expBehaviors: 'Worker Behaviors/Traits',
      expTools: 'Tools, Equipment, Supplies and Materials',
      expTrends: 'Future Trends and Concerns',
      expAcronyms: 'Acronyms',
      expCareerPath: 'Career Path',
      expSkillsMatrix: 'Employability Competencies by Occupational Level',
      expTaskVerification: 'Task Verification & Training Priority Analysis',
      expTaskVerifAppendix: 'Task Verification & Training Priority Analysis (Appendix)',
      expPostVoteResults: 'DACUM Live Pro - Verified (Post-Vote) Results (Appendix)',
      expClusters: 'Competency Clusters',
      expLearningOutcomes: 'Learning Outcomes',
      expModuleMapping: 'Module Mapping',
      expDutyTitle: 'Duty Title',
      expTasks: 'Tasks',
      expAvgPriority: 'Avg Priority',
      expTrainingLoad: 'Training Load',
      expCompetency: 'Competency',
      expCraftsman: 'Craftsman / Supervisor',
      expSkilled: 'Skilled',
      expSemiSkilled: 'Semi-skilled',
      expFoundation: 'Foundation skills',
      msgProjectNotFound: 'Project not found',
      msgProjectLoaded: 'Loaded: "{name}"',
      msgStorageFull: 'Storage full - oldest project removed.',
      msgTVWordExported: 'Task Verification Word document exported successfully!',
      expMethodologySummary: 'Methodology Summary',
      expPriorityRankings: 'Priority Rankings',
      expDutyLevelSummary: 'Duty-Level Summary',
    },
    fr: {
      appSubtitle: 'Analyse • Vérification • Cartographie des compétences • Ingénierie pédagogique',
      tabChartInfo: 'Fiche DACUM',
      tabDuties: 'Tâches & Activités',
      tabAdditionalInfo: 'Informations complémentaires',
      tabVerification: 'Vérification des tâches',
      tabClustering: 'Groupes de compétences',
      tabLearningOutcomes: 'Résultats d’apprentissage',
      tabModuleMapping: 'Cartographie des modules',
      tabHelp: 'Aide',
      h2ChartInfo: 'Informations sur la fiche DACUM',
      labelDate: 'Date DACUM :',
      labelVenue: 'Lieu :',
      labelProducedFor: 'Produit pour :',
      labelProducedBy: 'Produit par :',
      labelOccupation: 'Intitulé du métier :',
      labelJobTitle: 'Titre du poste :',
      labelSector: 'Secteur (facultatif) :',
      labelContext: 'Pays / Contexte (facultatif) :',
      labelFacilitators: 'Facilitateurs :',
      labelObservers: 'Observateurs :',
      labelPanelMembers: 'Membres du panel :',
      labelAddLogo: 'Ajouter un logo',
      labelRemove: 'Supprimer',
      btnProceedDuties: 'Passer aux tâches & activités →',
      phVenue: 'ex. : Centre de conférences, Ville',
      phProducedFor: 'ex. : Nom de l’entreprise / organisation',
      phProducedBy: 'ex. : Nom de l’établissement de formation',
      phOccupation: 'ex. : Technicien automobile',
      phJobTitle: 'ex. : Technicien de service niveau 2',
      phSector: 'ex. : Automobile, Santé, TIC',
      phContext: 'ex. : Irak, Moyen-Orient',
      phFacilitators: 'Entrez les noms des facilitateurs (un par ligne)',
      phObservers: 'Entrez les noms des observateurs (un par ligne)',
      phPanel: 'Entrez les noms des membres du panel (un par ligne)',
      h2Duties: 'Tâches et activités',
      aiCardTitle: 'Génération DACUM assistée par IA',
      aiCardDesc: 'Générez automatiquement les tâches et activités à partir des détails du poste',
      btnGenerateAI: 'Générer un brouillon IA',
      aiCardHint: 'Assurez-vous de renseigner l’intitulé du métier dans l’onglet Fiche DACUM',
      refineTitle: 'Affiner les résultats IA',
      refineDesc: 'Supprimer les doublons, normaliser la formulation, retirer les clauses de résultat.',
      refineReversible: 'Réversible avec Ctrl+Z.',
      btnRefine: 'Affiner les résultats',
      btnAddDuty: 'Ajouter une activité',
      btnProceedAdditional: 'Passer aux informations complémentaires →',
      btnClearTab: 'Effacer cet onglet',
      btnTableView: 'Vue tableau',
      btnCardView: 'Vue carte',
      h2Additional: 'Informations complémentaires',
      additionalDesc: 'Saisissez les informations pour chaque section. Cliquez sur Renommer pour personnaliser les titres.',
      sectionKnowledge: 'Savoirs requis',
      sectionSkills: 'Savoir-faire requis',
      sectionBehaviors: 'Attitudes et comportements professionnels',
      sectionTools: 'Outils, équipements, fournitures et matériaux',
      sectionTrends: 'Tendances et enjeux futurs',
      sectionAcronyms: 'Acronymes',
      sectionCareerPath: 'Parcours de carrière',
      btnAddSection: 'Ajouter une section',
      btnRename: 'Renommer',
      btnClearSection: 'Effacer',
      btnNumber: 'Numérotation',
      btnBullet: 'Puces',
      skillsMatrixTitle: 'Matrice des niveaux de compétences (cliquer pour développer)',
      skillsMatrixSubtitle: 'Compétences d’employabilité par niveau professionnel',
      btnProceedVerification: 'Passer à la vérification des tâches →',
      h2Verification: 'Vérification des tâches & Priorités de formation',
      verificationDesc: 'Évaluez chaque tâche sur trois échelles (0-3). Sélectionnez d’abord le mode de collecte.',
      modeWorkshop: 'Atelier (facilité)',
      modeSurvey: 'Individuel / Enquête',
      modeStandard: 'Standard (DACUM)',
      modeExtended: 'Étendu (DACUM)',
      labelParticipants: 'Nombre de participants à l’atelier :',
      formulaIF: 'Importance x Fréquence',
      formulaIFD: 'Importance x Fréquence x Difficulté',
      btnRefreshDuties: 'Actualiser les tâches',
      btnFinalize: 'Finaliser & Créer une session de vote en direct',
      btnBypass: 'Passer directement au regroupement des compétences',
      btnResetDecision: 'Réinitialiser la décision',
      btnRefreshResults: 'Actualiser les résultats',
      btnCloseVoting: 'Clôturer le vote',
      btnProceedClustering: 'Passer au regroupement des compétences →',
      h2Clustering: 'Groupes de compétences',
      availableTasksTitle: 'Tâches disponibles',
      availableTasksDesc: 'Sélectionnez des tâches à regrouper puis cliquez sur Créer un groupe.',
      createdClustersTitle: 'Groupes créés',
      btnCreateCluster: 'Créer un groupe',
      btnProceedLO: 'Passer aux résultats d’apprentissage →',
      h2LO: 'Résultats d’apprentissage',
      btnCreateLO: 'Créer un résultat d’apprentissage à partir des critères sélectionnés',
      btnProceedModule: 'Passer à la cartographie des modules →',
      h2Module: 'Cartographie des modules',
      btnCreateModule: 'Créer un nouveau module',
      btnProceedModuleBuilder: 'Passer au constructeur de modules',
      h2Help: 'Centre d’aide',
      helpSubtitle: 'Tout ce dont vous avez besoin pour utiliser DACUM Live Pro efficacement',
      msgModeWorkshop: 'Mode de collecte : Atelier (facilité)',
      msgModeSurvey: 'Mode de collecte : Individuel / Enquête',
      msgWorkflowStandard: 'Mode de travail : Standard (DACUM)',
      msgWorkflowExtended: 'Mode de travail : Étendu (DACUM)',
      msgParticipantsSet: 'Nombre de participants défini à {n}. Revalidation des tâches...',
      msgFormulaIF: 'Formule de priorité : I x F',
      msgFormulaIFD: 'Formule de priorité : I x F x D',
      msgExportAppendix: 'Mode d’export : Inclure en annexe',
      msgExportStandalone: 'Mode d’export : Rapport autonome',
      msgLoadedTasks: '{d} activités chargées avec {t} tâches pour vérification',
      msgNoDuties: 'Aucune activité trouvée',
      msgNoDutiesDesc: 'Veuillez aller dans l’onglet Tâches & Activités et créer des activités.',
      msgNoDutiesHint: 'Une fois les activités ajoutées, cliquez sur Actualiser les tâches.',
      msgDashboardCsvOnly: 'L’export du tableau de bord est disponible uniquement en mode Atelier',
      msgDashboardExported: 'Tableau de bord exporté en CSV avec succès !',
      msgClearAll: 'Toutes les données ont été effacées. Prêt pour une nouvelle session DACUM.',
      msgClearChartInfo: 'Fiche DACUM effacée !',
      msgClearDuties: 'Tâches & Activités effacées !',
      msgClearAdditional: 'Informations complémentaires effacées !',
      msgClearVerification: 'Vérification des tâches effacée !',
      msgClearClustering: 'Groupes de compétences effacés !',
      msgClearLO: 'Résultats d’apprentissage effacés !',
      msgClearModule: 'Cartographie des modules effacée !',
      msgAiLimitReached: 'Limite quotidienne atteinte ({n} générations). Réessayez demain !',
      msgAiNeedTitles: 'Veuillez renseigner l’intitulé du métier et le titre du poste avant de générer.',
      msgAiCancelled: 'Génération IA annulée. Vos activités existantes sont conservées.',
      msgAiSuccess: 'Brouillon IA généré ! {n} activités créées.',
      msgAiError: 'Erreur : {msg}. Consultez la console du navigateur.',
      msgProjectCreated: 'Projet "{name}" créé',
      msgProjectRenamed: 'Renommé en "{name}"',
      msgProjectDeleted: 'Projet supprimé',
      thTask: 'Tâche',
      thImportance: 'Importance (0-3)',
      thFrequency: 'Fréquence (0-3)',
      thDifficulty: 'Difficulté d’apprentissage (0-3)',
      thTaskScore: 'Score de la tâche',
      thCompletion: 'Complétion',
      thMeanImportance: 'Importance moyenne',
      thMeanFrequency: 'Fréquence moyenne',
      thMeanDifficulty: 'Difficulté moyenne',
      thPriorityIndex: 'Indice de priorité',
      thImportanceCounts: 'Votes Importance (0-3)',
      thFrequencyCounts: 'Votes Fréquence (0-3)',
      thDifficultyCounts: 'Votes Difficulté (0-3)',
      thPerforms: 'Effectue ?',
      thCriticalityCounts: 'Votes Criticité (0-3)',
      thWeightedScore: 'Score pondéré',
      thPriority: 'Priorité',
      thComments: 'Commentaires',
      skillCatCommunication: 'Communication',
      skillCatTeamwork: 'Travail en équipe',
      skillCatSelfMarketing: 'Auto-promotion professionnelle',
      skillCatProblemSolving: 'Résolution de problèmes',
      skillCatEntrepreneurship: 'Esprit d’entreprise',
      skillCatICT: 'Compétences informatiques / TIC',
      skillCatLanguages: 'Langues étrangères',
      skillCatMaths: 'Compétences mathématiques',
      expDacumChart: 'Charte de recherche DACUM',
      expDutiesAndTasks: 'Tâches et activités',
      expAdditionalInfo: 'Informations complémentaires',
      expKnowledge: 'Savoirs requis',
      expSkills: 'Savoir-faire requis',
      expBehaviors: 'Attitudes et comportements professionnels',
      expTools: 'Outils, équipements, fournitures et matériaux',
      expTrends: 'Tendances et enjeux futurs',
      expAcronyms: 'Acronymes',
      expCareerPath: 'Parcours de carrière',
      expSkillsMatrix: 'Compétences d’employabilité par niveau professionnel',
      expTaskVerification: 'Vérification des tâches & Analyse des priorités de formation',
      expTaskVerifAppendix: 'Vérification des tâches & Analyse des priorités (Annexe)',
      expPostVoteResults: 'DACUM Live Pro - Résultats vérifiés (Annexe)',
      expClusters: 'Groupes de compétences',
      expLearningOutcomes: 'Résultats d’apprentissage',
      expModuleMapping: 'Cartographie des modules',
      expDutyTitle: 'Intitulé de l’activité',
      expTasks: 'Tâches',
      expAvgPriority: 'Priorité moy.',
      expTrainingLoad: 'Charge de formation',
      expCompetency: 'Compétence',
      expCraftsman: 'Artisan / Superviseur',
      expSkilled: 'Qualifié',
      expSemiSkilled: 'Semi-qualifié',
      expFoundation: 'Compétences de base',
      msgProjectNotFound: 'Projet introuvable',
      msgProjectLoaded: 'Chargé : « {name} »',
      msgStorageFull: 'Stockage plein - le projet le plus ancien a été supprimé.',
      msgTVWordExported: 'Document Word de vérification des tâches exporté avec succès !',
      expMethodologySummary: 'Résumé méthodologique',
      expPriorityRankings: 'Classement des priorités',
      expDutyLevelSummary: 'Résumé par activité',
    },
  };

  var _current = localStorage.getItem('dacum_lang') || 'en';

  function t(key) {
    var lang = TRANSLATIONS[_current] || TRANSLATIONS.en;
    if (lang[key] !== undefined)            return lang[key];
    if (TRANSLATIONS.en[key] !== undefined) return TRANSLATIONS.en[key];
    return key;
  }

  function tf(key, vars) {
    var s = t(key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return s;
  }

  function setLang(code) {
    if (!TRANSLATIONS[code]) return;
    _current = code;
    localStorage.setItem('dacum_lang', code);
    applyTranslations();
  }

  function getLang() { return _current; }

  function _safeUpdate(el, val, attr) {
    if (attr === 'placeholder') { el.placeholder = val; return; }
    if (attr === 'title')       { el.title       = val; return; }
    var hasChild = false;
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === Node.ELEMENT_NODE) { hasChild = true; break; }
    }
    if (!hasChild) el.textContent = val;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      _safeUpdate(el, t(el.getAttribute('data-i18n')),
                      el.getAttribute('data-i18n-attr') || 'text');
    });
    document.documentElement.lang = _current;
    var sel = document.getElementById('dacumLangSelector');
    if (sel) sel.value = _current;
    window.dispatchEvent(new CustomEvent('dacum:langchange', { detail: { lang: _current } }));
  }

  function _injectSelector() {
    if (document.getElementById('dacumLangSelector')) return;
    var wrap = document.createElement('div');
    wrap.id = 'dacumLangWrap';
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:5px;flex-shrink:0;';
    var globe = document.createElement('span');
    globe.textContent = '🌐';
    globe.setAttribute('aria-hidden', 'true');
    globe.style.cssText = 'font-size:0.78em;line-height:1;';
    var sel = document.createElement('select');
    sel.id = 'dacumLangSelector';
    sel.title = 'Select language / Choisir la langue';
    sel.style.cssText = 'padding:4px 8px;border:1.5px solid #e2e2e4;border-radius:99px;' +
      'background:#fff;font-size:0.78em;font-weight:600;cursor:pointer;' +
      'color:#1a1a1a;outline:none;appearance:none;-webkit-appearance:none;' +
      'min-width:58px;text-align:center;';
    [{ value: 'en', label: 'EN' }, { value: 'fr', label: 'FR' }].forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    wrap.appendChild(globe);
    wrap.appendChild(sel);
    var right = document.querySelector('.dtb-right');
    if (right) right.appendChild(wrap);
    else { var tb = document.getElementById('dacumTopToolbar'); if (tb) tb.appendChild(wrap); }
    sel.addEventListener('change', function () { setLang(this.value); });
  }

  window.i18n = { t: t, tf: tf, setLang: setLang, getLang: getLang, apply: applyTranslations };

  function _init() { _injectSelector(); applyTranslations(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();