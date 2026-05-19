/**
 * stats.js - Statistiques et historique
 * Génère les données pour les vues statistiques
 */

const Stats = (() => {

  /**
   * Données pour le graphique en barres d'un objectif (30 derniers jours)
   */
  function getObjectiveBarData(objectiveId, days = 30) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) return [];

    const sessions = Store.getRecentSessions(objectiveId, days);
    const sessionMap = new Map(sessions.map(s => [s.date, s]));
    const isTimed = obj.type === 'timed';

    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const session = sessionMap.get(dateStr);

      // Pour les exercices minutés, on affiche les séries complétées / séries totales
      let done, target;
      if (isTimed) {
        done = session ? session.sets.filter(s => s.actual !== null).length : 0;
        target = obj.setsPerDay || 3;
      } else {
        done = session ? session.totalDone : 0;
        target = obj.dailyTarget;
      }

      data.push({
        date: dateStr,
        dayLabel: String(d.getDate()).padStart(2, '0') + '/' +
          String(d.getMonth() + 1).padStart(2, '0'),
        shortLabel: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()],
        done,
        target,
        percent: target > 0 ? Math.round((done / target) * 100) : 0,
        completed: session ? session.completed : false
      });
    }

    return data;
  }

  /**
   * Données du calendrier mensuel pour un objectif
   * @param {string} objectiveId
   * @param {number} year
   * @param {number} month - 0-indexed (0=janvier)
   */
  function getCalendarData(objectiveId, year, month) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) return { weeks: [], year, month };

    const isTimed = obj.type === 'timed';
    const sessions = Store.getSessionsForObjective(objectiveId);
    const sessionMap = new Map(sessions.map(s => [s.date, s]));

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0

    const weeks = [];
    let week = new Array(startDayOfWeek).fill(null);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().slice(0, 10);
      const session = sessionMap.get(dateStr);
      const today = Store.today();
      const isFuture = dateStr > today;

      let status = 'none'; // gris
      if (session) {
        if (session.completed) {
          status = 'complete'; // vert
        } else if (session.totalDone > 0) {
          status = 'partial'; // orange
        }
      }

      // Pour les exercices minutés, affiche séries/setsPerDay
      const dayDone = isTimed
        ? (session ? session.sets.filter(s => s.actual !== null).length : 0)
        : (session ? session.totalDone : 0);
      const dayTarget = isTimed ? (obj.setsPerDay || 3) : obj.dailyTarget;

      week.push({
        day,
        date: dateStr,
        status: isFuture ? 'future' : status,
        done: dayDone,
        target: dayTarget
      });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // Complète la dernière semaine
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    return {
      weeks,
      year,
      month,
      monthName: getMonthName(month)
    };
  }

  /**
   * Résumé global pour un objectif
   */
  function getObjectiveSummary(objectiveId) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) return null;

    const sessions = Store.getSessionsForObjective(objectiveId);
    const streak = Store.getStreak(objectiveId);
    const totalAll = sessions.reduce((sum, s) => sum + s.totalDone, 0);
    const completedDays = sessions.filter(s => s.completed).length;
    const totalDays = sessions.length;

    return {
      objective: obj,
      streak,
      totalAll,
      completedDays,
      totalDays,
      completionRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
    };
  }

  /**
   * Statistiques pour un compteur libre
   */
  function getCounterStats(counterId, days = 30) {
    return Counters.getStats(counterId, days);
  }

  /**
   * Noms des mois en français
   */
  function getMonthName(month) {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month];
  }

  /**
   * Noms courts des jours
   */
  function getDayNames() {
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  }

  return {
    getObjectiveBarData,
    getCalendarData,
    getObjectiveSummary,
    getCounterStats,
    getMonthName,
    getDayNames
  };
})();
