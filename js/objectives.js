/**
 * objectives.js - Logique de calcul des objectifs structurés
 * Gère la répartition des séries selon différents modes
 */

const Objectives = (() => {

  /**
   * Calcule la répartition des séries pour un objectif
   * @param {number} target - Objectif total (ex: 200)
   * @param {number} maxPerSet - Max par série (ex: 25)
   * @param {string} mode - "degressive", "progressive", "uniform"
   * @returns {number[]} Tableau des valeurs par série
   */
  function calculateDistribution(target, maxPerSet, mode = 'degressive') {
    if (target <= 0 || maxPerSet <= 0) return [];

    if (target <= maxPerSet) return [target];

    const baseNumSets = Math.ceil(target / maxPerSet);

    if (mode === 'uniform') {
      return calculateUniform(target, baseNumSets);
    }

    // Pour dégressif/progressif, on veut un vrai gradient.
    // On utilise plus de séries si nécessaire pour avoir de la variation
    // (minimum last = ~2-3, maximum first ~ maxPerSet * 1.2)
    // On cherche le bon nombre de séries pour un ratio first/last ~ 3-5x
    let numSets = baseNumSets;
    const minLast = Math.max(1, Math.floor(maxPerSet * 0.15));
    // Essaie d'augmenter le nombre de séries pour obtenir un bon gradient
    // avec first ~ maxPerSet et last ~ minLast
    // Somme = n*(first + last)/2 = target => n = 2*target/(first+last)
    const idealN = Math.round(2 * target / (maxPerSet + minLast));
    if (idealN > numSets) {
      numSets = idealN;
    }

    const sets = calculateDegressive(target, numSets, maxPerSet);

    if (mode === 'progressive') {
      return sets.reverse();
    }
    return sets;
  }

  /**
   * Mode uniforme : répartition égale avec reste distribué au début
   */
  function calculateUniform(target, numSets) {
    const base = Math.floor(target / numSets);
    const remainder = target - (base * numSets);
    const sets = [];
    for (let i = 0; i < numSets; i++) {
      sets.push(base + (i < remainder ? 1 : 0));
    }
    return sets;
  }

  /**
   * Mode dégressif : séries décroissantes linéairement
   * La première série est la plus grosse, la dernière la plus petite
   */
  function calculateDegressive(target, numSets, maxPerSet) {
    if (numSets <= 1) return [target];

    // On veut une distribution linéaire décroissante
    // a[i] = first - i * step, pour i = 0..n-1
    // Somme = n * first - step * n*(n-1)/2 = target
    // On veut first <= maxPerSet et toutes les valeurs >= 1

    // Essayons avec first = maxPerSet
    // target = n * first - step * n*(n-1)/2
    // step = (n * first - target) / (n*(n-1)/2)
    let first = maxPerSet;
    const n = numSets;
    const halfN = n * (n - 1) / 2;

    let step = (n * first - target) / halfN;

    // Si step négatif, first est trop petit - on ajuste
    if (step < 0) {
      // Toutes les séries sont au max, pas assez de variation
      // On augmente first (peut dépasser maxPerSet dans ce cas)
      step = 0;
      first = target / n;
    }

    // Si la dernière valeur serait < 1, on réduit first
    let last = first - (n - 1) * step;
    if (last < 1) {
      // On force last = 1 et recalcule
      // target = n*first - step * halfN
      // last = first - (n-1)*step = 1
      // => first = 1 + (n-1)*step
      // => target = n*(1 + (n-1)*step) - step * halfN
      // => target = n + n*(n-1)*step - step * n*(n-1)/2
      // => target = n + step * n*(n-1) * (1 - 1/2)
      // => target = n + step * n*(n-1)/2
      // => step = (target - n) / halfN
      step = (target - n) / halfN;
      first = 1 + (n - 1) * step;
    }

    // Génère les valeurs flottantes
    const floatSets = [];
    for (let i = 0; i < n; i++) {
      floatSets.push(first - i * step);
    }

    // Arrondit intelligemment pour que la somme = target exact
    return roundToTarget(floatSets, target);
  }

  /**
   * Arrondit un tableau de flottants pour que la somme soit exactement target
   * Utilise l'algorithme "largest remainder" pour minimiser l'erreur
   */
  function roundToTarget(values, target) {
    // Arrondi initial vers le bas
    const floored = values.map(v => Math.floor(v));
    let currentSum = floored.reduce((a, b) => a + b, 0);
    let deficit = target - currentSum;

    // Calcule les restes (partie fractionnaire)
    const remainders = values.map((v, i) => ({
      index: i,
      remainder: v - Math.floor(v)
    }));

    // Trie par reste décroissant
    remainders.sort((a, b) => b.remainder - a.remainder);

    // Distribue le déficit un par un aux plus gros restes
    for (let i = 0; i < deficit && i < remainders.length; i++) {
      floored[remainders[i].index]++;
    }

    // Vérifie - si des valeurs sont à 0, redistribue
    for (let i = floored.length - 1; i >= 0; i--) {
      if (floored[i] <= 0) {
        floored[i] = 1;
        // Retire 1 de la plus grosse valeur
        const maxIdx = floored.indexOf(Math.max(...floored));
        if (maxIdx !== i) floored[maxIdx]--;
      }
    }

    return floored;
  }

  /**
   * Calcule les horaires estimés pour chaque série
   * @param {string} startTime - Heure de début "HH:MM"
   * @param {number} restMinutes - Temps de pause entre séries
   * @param {number} numSets - Nombre de séries
   * @returns {string[]} Horaires estimés pour chaque série
   */
  function calculateSchedule(startTime, restMinutes, numSets) {
    if (!startTime || numSets <= 0) return [];

    const [startH, startM] = startTime.split(':').map(Number);
    let currentMinutes = startH * 60 + startM;

    const schedule = [];
    for (let i = 0; i < numSets; i++) {
      const h = Math.floor(currentMinutes / 60) % 24;
      const m = currentMinutes % 60;
      schedule.push(
        String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
      );
      currentMinutes += restMinutes;
    }

    return schedule;
  }

  /**
   * Vérifie si la plage horaire est suffisante
   * @returns {{ sufficient: boolean, estimatedEnd: string, message: string }}
   */
  function checkTimeRange(startTime, endTime, restMinutes, numSets) {
    const schedule = calculateSchedule(startTime, restMinutes, numSets);
    if (schedule.length === 0) return { sufficient: true, estimatedEnd: '--:--', message: '' };

    // L'heure de fin estimée = dernière série + temps de pause
    const lastSchedule = schedule[schedule.length - 1];
    const [lastH, lastM] = lastSchedule.split(':').map(Number);
    const endMinutes = lastH * 60 + lastM + restMinutes;
    const estimatedEndH = Math.floor(endMinutes / 60) % 24;
    const estimatedEndM = endMinutes % 60;
    const estimatedEnd = String(estimatedEndH).padStart(2, '0') + ':' +
      String(estimatedEndM).padStart(2, '0');

    if (!endTime) {
      return { sufficient: true, estimatedEnd, message: '' };
    }

    const [endH, endM] = endTime.split(':').map(Number);
    const endTimeMinutes = endH * 60 + endM;

    if (endMinutes > endTimeMinutes) {
      const overflowMin = endMinutes - endTimeMinutes;
      return {
        sufficient: false,
        estimatedEnd,
        message: `Plage insuffisante ! Dépasse de ${overflowMin} min (fin estimée : ${estimatedEnd})`
      };
    }

    return { sufficient: true, estimatedEnd, message: '' };
  }

  /**
   * Retourne la progression (done/target) pour un objectif, qu'il soit minuté ou comptage
   * @param {object} obj - L'objectif
   * @param {object|null} session - La session du jour (ou null)
   * @returns {{ done: number, target: number }}
   */
  function getProgress(obj, session) {
    if (obj.type === 'timed' || obj.type === 'routine') {
      const setsTotal = obj.setsPerDay || Store.DEFAULT_SETS_PER_DAY;
      const setsDone = session ? session.sets.filter(s => s.actual !== null).length : 0;
      return { done: setsDone, target: setsTotal };
    }
    return {
      done: session ? session.totalDone : 0,
      target: obj.dailyTarget
    };
  }

  /**
   * Calcule les paramètres d'exercice minuté en tenant compte de la progression
   * @param {object} obj - L'objectif avec progression rules
   * @returns {object} { holdSeconds, releaseSeconds, repsPerSet, setsPerDay, progressionNote }
   */
  function getTimedParams(obj) {
    // Paramètres de base depuis l'objectif
    let holdSeconds = obj.holdSeconds || 3;
    let releaseSeconds = obj.releaseSeconds || 5;
    let repsPerSet = obj.repsPerSet || 10;
    let setsPerDay = obj.setsPerDay || Store.DEFAULT_SETS_PER_DAY;
    let progressionNote = null;

    // Applique les règles de progression si disponibles
    if (obj.progressionRules && obj.progressionRules.length > 0 && obj.startDate) {
      const startDate = new Date(obj.startDate);
      const todayDate = new Date(Store.today());
      const daysSinceStart = Math.floor((todayDate - startDate) / (1000 * 60 * 60 * 24));

      // Trouve la règle la plus avancée applicable
      const sortedRules = [...obj.progressionRules].sort((a, b) => b.afterDays - a.afterDays);
      for (const rule of sortedRules) {
        if (daysSinceStart >= rule.afterDays) {
          // Applique les surcharges de cette règle
          if (rule.holdSeconds !== undefined) holdSeconds = rule.holdSeconds;
          if (rule.releaseSeconds !== undefined) releaseSeconds = rule.releaseSeconds;
          if (rule.repsPerSet !== undefined) repsPerSet = rule.repsPerSet;
          if (rule.setsPerDay !== undefined) setsPerDay = rule.setsPerDay;
          progressionNote = rule.note || null;
          break;
        }
      }
    }

    return { holdSeconds, releaseSeconds, repsPerSet, setsPerDay, progressionNote };
  }

  /**
   * Résout les paramètres d'une routine multi-segments en appliquant la progression.
   * La progression (longHoldSeconds) ajuste le maintien du premier segment 'contract'
   * (les contractions longues).
   * @returns {object} { segments, setsPerDay, progressionNote }
   */
  function getRoutineParams(obj) {
    // Clone profond léger des segments pour ne pas muter l'objectif stocké
    const segments = (obj.segments || []).map(s => ({ ...s }));
    let progressionNote = null;

    if (obj.progressionRules && obj.progressionRules.length > 0 && obj.startDate) {
      const startDate = new Date(obj.startDate);
      const todayDate = new Date(Store.today());
      const daysSinceStart = Math.floor((todayDate - startDate) / (1000 * 60 * 60 * 24));

      const sortedRules = [...obj.progressionRules].sort((a, b) => b.afterDays - a.afterDays);
      for (const rule of sortedRules) {
        if (daysSinceStart >= rule.afterDays) {
          if (rule.longHoldSeconds !== undefined) {
            const firstContract = segments.find(s => s.kind === 'contract');
            if (firstContract) firstContract.holdSeconds = rule.longHoldSeconds;
          }
          progressionNote = rule.note || null;
          break;
        }
      }
    }

    return {
      segments,
      setsPerDay: obj.setsPerDay || 1,
      progressionNote
    };
  }

  /**
   * Crée ou récupère la session du jour pour une routine multi-segments
   */
  function getOrCreateRoutineSession(objectiveId) {
    let session = Store.getTodaySession(objectiveId);
    if (session) return session;

    const obj = Store.getObjective(objectiveId);
    if (!obj) return null;

    const params = getRoutineParams(obj);

    // Une "série" = une séance complète de la routine
    const sets = [];
    for (let i = 0; i < params.setsPerDay; i++) {
      sets.push({ planned: 1, actual: null, completedAt: null });
    }

    session = {
      objectiveId,
      date: Store.today(),
      type: 'routine',
      sets,
      totalDone: 0,
      completed: false
    };

    return Store.saveSession(session);
  }

  /**
   * Crée ou récupère la session du jour pour un exercice minuté
   */
  function getOrCreateTimedSession(objectiveId) {
    let session = Store.getTodaySession(objectiveId);
    if (session) return session;

    const obj = Store.getObjective(objectiveId);
    if (!obj) return null;

    const params = getTimedParams(obj);

    // Crée les séries pour la journée
    const sets = [];
    for (let i = 0; i < params.setsPerDay; i++) {
      sets.push({
        planned: params.repsPerSet,
        actual: null,
        completedAt: null
      });
    }

    session = {
      objectiveId,
      date: Store.today(),
      type: 'timed',
      sets,
      totalDone: 0,
      completed: false,
      timedParams: {
        holdSeconds: params.holdSeconds,
        releaseSeconds: params.releaseSeconds,
        repsPerSet: params.repsPerSet
      }
    };

    return Store.saveSession(session);
  }

  /**
   * Crée ou récupère la session du jour pour un objectif
   * Route vers la version minutée si le type est 'timed'
   */
  function getOrCreateTodaySession(objectiveId) {
    // Vérifie d'abord si une session existe déjà
    let session = Store.getTodaySession(objectiveId);
    if (session) return session;

    const obj = Store.getObjective(objectiveId);
    if (!obj) return null;

    // Route vers la bonne logique selon le type
    if (obj.type === 'timed') {
      return getOrCreateTimedSession(objectiveId);
    }
    if (obj.type === 'routine') {
      return getOrCreateRoutineSession(objectiveId);
    }

    // Type "count" par défaut (comportement existant)
    const distribution = calculateDistribution(
      obj.dailyTarget, obj.maxPerSet, obj.distribution
    );

    session = {
      objectiveId,
      date: Store.today(),
      sets: distribution.map(planned => ({
        planned,
        actual: null,
        completedAt: null
      })),
      totalDone: 0,
      completed: false
    };

    return Store.saveSession(session);
  }

  /**
   * Valide une série dans la session
   * @param {string} sessionId - ID de la session
   * @param {number} setIndex - Index de la série
   * @param {number|null} actualCount - Nombre réel (null = utilise le planifié)
   */
  function completeSet(sessionId, setIndex, actualCount) {
    const data = Store.getSessions();
    const session = data.find(s => s.id === sessionId);
    if (!session || setIndex >= session.sets.length) return null;

    const set = session.sets[setIndex];
    set.actual = actualCount !== null && actualCount !== undefined
      ? actualCount
      : set.planned;

    const now = new Date();
    set.completedAt = String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');

    // Recalcule le total
    session.totalDone = session.sets.reduce(
      (sum, s) => sum + (s.actual || 0), 0
    );

    // Vérifie si terminé
    const obj = Store.getObjective(session.objectiveId);
    const allDone = session.sets.every(s => s.actual !== null);
    if (obj && (obj.type === 'timed' || obj.type === 'routine')) {
      // Exercices minutés et routines : terminé quand toutes les séances sont faites
      session.completed = allDone;
    } else {
      // Pour les objectifs de comptage, terminé quand tout fait ou objectif atteint
      session.completed = allDone || (obj && session.totalDone >= obj.dailyTarget);
    }

    return Store.saveSession(session);
  }

  /**
   * Retourne l'index de la prochaine série à faire
   */
  function getNextSetIndex(session) {
    if (!session) return 0;
    return session.sets.findIndex(s => s.actual === null);
  }

  /**
   * Texte descriptif du mode de distribution
   */
  function getDistributionLabel(mode) {
    switch (mode) {
      case 'degressive': return 'Dégressif (fort au début)';
      case 'progressive': return 'Progressif (fort à la fin)';
      case 'uniform': return 'Uniforme';
      default: return mode;
    }
  }

  return {
    calculateDistribution,
    calculateSchedule,
    checkTimeRange,
    getProgress,
    getTimedParams,
    getRoutineParams,
    getOrCreateTodaySession,
    getOrCreateTimedSession,
    getOrCreateRoutineSession,
    completeSet,
    getNextSetIndex,
    getDistributionLabel
  };
})();
