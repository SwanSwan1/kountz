/**
 * store.js - Gestion du stockage local pour Kountz
 * Utilise localStorage avec sérialisation JSON
 */

const Store = (() => {
  const STORAGE_KEY = 'kountz_data';

  // Structure par défaut
  const defaultData = {
    objectives: [],
    sessions: [],
    counters: [],
    counterEntries: []
  };

  /**
   * Génère un UUID v4 simple
   */
  function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
  }

  /**
   * Retourne la date du jour au format YYYY-MM-DD
   */
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /**
   * Charge toutes les données depuis localStorage
   */
  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultData };
      const parsed = JSON.parse(raw);
      // Fusionne avec les valeurs par défaut pour gérer les migrations
      return { ...defaultData, ...parsed };
    } catch (e) {
      console.error('Erreur de chargement des données:', e);
      return { ...defaultData };
    }
  }

  /**
   * Sauvegarde toutes les données dans localStorage
   */
  function saveAll(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur de sauvegarde des données:', e);
    }
  }

  // --- Objectifs ---

  function getObjectives() {
    return loadAll().objectives;
  }

  function getActiveObjectives() {
    return loadAll().objectives.filter(o => o.active);
  }

  function getObjective(id) {
    return loadAll().objectives.find(o => o.id === id) || null;
  }

  function saveObjective(obj) {
    const data = loadAll();
    if (!obj.id) {
      obj.id = generateId();
      obj.createdAt = today();
      data.objectives.push(obj);
    } else {
      const idx = data.objectives.findIndex(o => o.id === obj.id);
      if (idx >= 0) data.objectives[idx] = obj;
      else data.objectives.push(obj);
    }
    saveAll(data);
    return obj;
  }

  function deleteObjective(id) {
    const data = loadAll();
    data.objectives = data.objectives.filter(o => o.id !== id);
    // Supprimer aussi les sessions liées
    data.sessions = data.sessions.filter(s => s.objectiveId !== id);
    saveAll(data);
  }

  // --- Sessions ---

  function getSessions() {
    return loadAll().sessions;
  }

  function getSessionsForObjective(objectiveId) {
    return loadAll().sessions.filter(s => s.objectiveId === objectiveId);
  }

  function getTodaySession(objectiveId) {
    const t = today();
    return loadAll().sessions.find(
      s => s.objectiveId === objectiveId && s.date === t
    ) || null;
  }

  function saveSession(session) {
    const data = loadAll();
    if (!session.id) {
      session.id = generateId();
      data.sessions.push(session);
    } else {
      const idx = data.sessions.findIndex(s => s.id === session.id);
      if (idx >= 0) data.sessions[idx] = session;
      else data.sessions.push(session);
    }
    saveAll(data);
    return session;
  }

  // --- Compteurs libres ---

  function getCounters() {
    return loadAll().counters;
  }

  function getActiveCounters() {
    return loadAll().counters.filter(c => c.active);
  }

  function getCounter(id) {
    return loadAll().counters.find(c => c.id === id) || null;
  }

  function saveCounter(counter) {
    const data = loadAll();
    if (!counter.id) {
      counter.id = generateId();
      counter.createdAt = today();
      data.counters.push(counter);
    } else {
      const idx = data.counters.findIndex(c => c.id === counter.id);
      if (idx >= 0) data.counters[idx] = counter;
      else data.counters.push(counter);
    }
    saveAll(data);
    return counter;
  }

  function deleteCounter(id) {
    const data = loadAll();
    data.counters = data.counters.filter(c => c.id !== id);
    data.counterEntries = data.counterEntries.filter(e => e.counterId !== id);
    saveAll(data);
  }

  // --- Entrées de compteurs ---

  function getCounterEntry(counterId, date) {
    date = date || today();
    return loadAll().counterEntries.find(
      e => e.counterId === counterId && e.date === date
    ) || null;
  }

  function getCounterEntries(counterId) {
    return loadAll().counterEntries.filter(e => e.counterId === counterId);
  }

  function saveCounterEntry(entry) {
    const data = loadAll();
    const idx = data.counterEntries.findIndex(
      e => e.counterId === entry.counterId && e.date === entry.date
    );
    if (idx >= 0) {
      data.counterEntries[idx] = entry;
    } else {
      data.counterEntries.push(entry);
    }
    saveAll(data);
    return entry;
  }

  function incrementCounter(counterId, amount = 1) {
    const date = today();
    let entry = getCounterEntry(counterId, date);
    if (!entry) {
      entry = { counterId, date, count: 0 };
    }
    entry.count = Math.max(0, entry.count + amount);
    return saveCounterEntry(entry);
  }

  // --- Statistiques utilitaires ---

  /**
   * Retourne les sessions des N derniers jours pour un objectif
   */
  function getRecentSessions(objectiveId, days = 30) {
    const sessions = getSessionsForObjective(objectiveId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return sessions.filter(s => s.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calcule le streak actuel pour un objectif
   */
  function getStreak(objectiveId) {
    const obj = getObjective(objectiveId);
    if (!obj) return { current: 0, best: 0 };

    const sessions = getSessionsForObjective(objectiveId)
      .filter(s => s.completed)
      .map(s => s.date)
      .sort()
      .reverse();

    if (sessions.length === 0) return { current: 0, best: 0 };

    // Streak actuel (depuis aujourd'hui ou hier)
    let current = 0;
    let checkDate = new Date();
    // Si pas de session aujourd'hui, on commence à hier
    if (sessions[0] !== today()) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const sessionSet = new Set(sessions);
    let d = new Date(checkDate);
    while (sessionSet.has(d.toISOString().slice(0, 10))) {
      current++;
      d.setDate(d.getDate() - 1);
    }

    // Meilleur streak
    let best = 0;
    let streak = 1;
    const sorted = [...sessions].sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        best = Math.max(best, streak);
        streak = 1;
      }
    }
    best = Math.max(best, streak);

    return { current, best };
  }

  /**
   * Exporte toutes les données (pour backup)
   */
  function exportData() {
    return JSON.stringify(loadAll(), null, 2);
  }

  /**
   * Importe des données (depuis backup)
   */
  function importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      saveAll({ ...defaultData, ...data });
      return true;
    } catch (e) {
      console.error('Erreur d\'import:', e);
      return false;
    }
  }

  return {
    generateId,
    today,
    getObjectives,
    getActiveObjectives,
    getObjective,
    saveObjective,
    deleteObjective,
    getSessions,
    getSessionsForObjective,
    getTodaySession,
    saveSession,
    getRecentSessions,
    getStreak,
    getCounters,
    getActiveCounters,
    getCounter,
    saveCounter,
    deleteCounter,
    getCounterEntry,
    getCounterEntries,
    saveCounterEntry,
    incrementCounter,
    exportData,
    importData
  };
})();
