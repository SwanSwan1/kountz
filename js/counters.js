/**
 * counters.js - Logique des compteurs libres
 */

const Counters = (() => {

  /**
   * Crée un nouveau compteur
   */
  function create(name) {
    return Store.saveCounter({
      name,
      active: true
    });
  }

  /**
   * Incrémente le compteur du jour
   */
  function increment(counterId) {
    return Store.incrementCounter(counterId, 1);
  }

  /**
   * Décrémente le compteur du jour (minimum 0)
   */
  function decrement(counterId) {
    return Store.incrementCounter(counterId, -1);
  }

  /**
   * Retourne la valeur du compteur pour aujourd'hui
   */
  function getTodayValue(counterId) {
    const entry = Store.getCounterEntry(counterId);
    return entry ? entry.count : 0;
  }

  /**
   * Archive (désactive) un compteur
   */
  function archive(counterId) {
    const counter = Store.getCounter(counterId);
    if (counter) {
      counter.active = false;
      Store.saveCounter(counter);
    }
  }

  /**
   * Réactive un compteur
   */
  function reactivate(counterId) {
    const counter = Store.getCounter(counterId);
    if (counter) {
      counter.active = true;
      Store.saveCounter(counter);
    }
  }

  /**
   * Statistiques pour un compteur
   */
  function getStats(counterId, days = 30) {
    const entries = Store.getCounterEntries(counterId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const recent = entries
      .filter(e => e.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = recent.reduce((sum, e) => sum + e.count, 0);
    const avg = recent.length > 0 ? Math.round(total / recent.length * 10) / 10 : 0;
    const max = recent.length > 0 ? Math.max(...recent.map(e => e.count)) : 0;

    return { recent, total, avg, max, days: recent.length };
  }

  return {
    create,
    increment,
    decrement,
    getTodayValue,
    archive,
    reactivate,
    getStats
  };
})();
