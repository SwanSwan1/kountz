/**
 * app.js - Point d'entrée de l'application Kountz
 * Gère la navigation (SPA), les événements et la logique principale
 */

const App = (() => {
  // État local de l'application
  let currentView = 'home';
  let currentParam = null;
  let activeSessionId = null;
  let activeObjectiveId = null;

  /**
   * Initialise l'application
   */
  function init() {
    // Enregistre le Service Worker
    registerServiceWorker();

    // Demande les permissions de notification
    Timer.requestPermission();

    // Quand la page redevient visible, recalcule le timer et rafraîchit la vue session
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && currentView === 'session' && activeObjectiveId) {
        UI.renderSession(activeObjectiveId);
      }
    });

    // Gère le bouton retour du navigateur
    window.addEventListener('popstate', (e) => {
      if (e.state) {
        navigateInternal(e.state.view, e.state.param, false);
      } else {
        navigateInternal('home', null, false);
      }
    });

    // Charge la vue depuis l'URL ou affiche l'accueil
    const hash = window.location.hash.slice(1);
    if (hash) {
      const [view, param] = hash.split('/');
      navigateInternal(view, param || null, false);
    } else {
      navigateInternal('home', null, true);
    }
  }

  /**
   * Enregistre le Service Worker pour le mode hors-ligne
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(
        () => console.log('Service Worker enregistré'),
        (err) => console.log('Service Worker non enregistré:', err)
      );
    }
  }

  /**
   * Navigation publique - ajoute à l'historique
   */
  function navigate(view, param = null) {
    navigateInternal(view, param, true);
  }

  /**
   * Navigation interne
   */
  function navigateInternal(view, param, pushState) {
    // Le timer continue en arrière-plan même si on change de vue

    currentView = view;
    currentParam = param;

    // Met à jour l'URL
    const hash = param ? `${view}/${param}` : view;
    if (pushState) {
      history.pushState({ view, param }, '', '#' + hash);
    }

    // Rend la vue correspondante
    switch (view) {
      case 'home':
        UI.renderHome();
        break;
      case 'newObjective':
        UI.renderObjectiveForm();
        break;
      case 'editObjective':
        UI.renderObjectiveForm(param);
        break;
      case 'session':
        activeObjectiveId = param;
        UI.renderSession(param);
        break;
      case 'newCounter':
        UI.renderCounterForm();
        break;
      case 'counterView':
        UI.renderCounterView(param);
        break;
      case 'statsOverview':
        UI.renderStatsOverview();
        break;
      case 'statsObjective':
        UI.renderStatsObjective(param);
        break;
      case 'settings':
        UI.renderSettings();
        break;
      default:
        UI.renderHome();
    }

    // Scroll en haut
    window.scrollTo(0, 0);
  }

  // --- Actions objectifs ---

  /**
   * Sauvegarde un objectif depuis le formulaire
   */
  function saveObjective(event) {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);

    const obj = {
      name: data.get('name').trim(),
      dailyTarget: parseInt(data.get('dailyTarget')),
      maxPerSet: parseInt(data.get('maxPerSet')),
      restMinutes: parseInt(data.get('restMinutes')),
      startTime: data.get('startTime'),
      endTime: data.get('endTime') || null,
      distribution: data.get('distribution'),
      durationDays: data.get('durationDays') ? parseInt(data.get('durationDays')) : null,
      startDate: data.get('startDate') || Store.today(),
      active: true
    };

    // Validation
    if (!obj.name || !obj.dailyTarget || !obj.maxPerSet || !obj.startTime) {
      alert('Remplis tous les champs obligatoires');
      return;
    }

    // Mode édition
    const id = data.get('id');
    if (id) {
      obj.id = id;
      const existing = Store.getObjective(id);
      if (existing) {
        obj.createdAt = existing.createdAt;
      }
    }

    Store.saveObjective(obj);
    navigate('home');
  }

  /**
   * Supprime un objectif
   */
  function deleteObjective(id) {
    if (confirm('Supprimer cet objectif et tout son historique ?')) {
      Store.deleteObjective(id);
      navigate('home');
    }
  }

  /**
   * Met à jour la preview dans le formulaire d'objectif
   */
  function updatePreview() {
    UI.updatePreview();
  }

  // --- Actions session ---

  /**
   * Valide la série en cours
   */
  function completeCurrentSet() {
    if (!activeObjectiveId) return;

    const session = Store.getTodaySession(activeObjectiveId);
    if (!session) return;

    const nextIdx = Objectives.getNextSetIndex(session);
    if (nextIdx === -1) return;

    // Récupère la valeur réelle saisie
    const input = document.getElementById('setActual');
    const actual = input ? parseInt(input.value) : session.sets[nextIdx].planned;

    activeSessionId = session.id;
    Objectives.completeSet(session.id, nextIdx, actual);

    // Lance le timer de pause si pas la dernière série
    const obj = Store.getObjective(activeObjectiveId);
    const updatedSession = Store.getTodaySession(activeObjectiveId);
    const newNextIdx = Objectives.getNextSetIndex(updatedSession);

    if (newNextIdx !== -1 && obj) {
      Timer.start(
        obj.restMinutes,
        (data) => UI.updateTimerDisplay(data),
        () => {
          UI.updateTimerDisplay(null);
          // Re-render pour montrer la prochaine série
          if (currentView === 'session' && currentParam === activeObjectiveId) {
            UI.renderSession(activeObjectiveId);
          }
        }
      );
    }

    // Re-render la session
    UI.renderSession(activeObjectiveId);
  }

  /**
   * Ajuste le nombre de la série en cours
   */
  function adjustSet(delta) {
    const input = document.getElementById('setActual');
    const display = document.getElementById('actualCount');
    if (!input) return;

    let val = parseInt(input.value) + delta;
    if (val < 0) val = 0;
    input.value = val;
    if (display) display.textContent = val;
  }

  /**
   * Quand l'input de série change manuellement
   */
  function onSetInputChange() {
    const input = document.getElementById('setActual');
    const display = document.getElementById('actualCount');
    if (input && display) {
      display.textContent = input.value;
    }
  }

  /**
   * Pause/reprend le timer
   */
  function toggleTimer() {
    Timer.togglePause();
  }

  /**
   * Passe le timer (fin anticipée)
   */
  function skipTimer() {
    Timer.stop();
    UI.updateTimerDisplay(null);
  }

  // --- Actions compteurs ---

  /**
   * Sauvegarde un nouveau compteur
   */
  function saveCounter(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value.trim();
    if (!name) return;

    Counters.create(name);
    navigate('home');
  }

  /**
   * Incrémente un compteur
   */
  function counterIncrement(counterId) {
    Counters.increment(counterId);
    refreshCurrentView();
  }

  /**
   * Décrémente un compteur
   */
  function counterDecrement(counterId) {
    Counters.decrement(counterId);
    refreshCurrentView();
  }

  /**
   * Supprime un compteur
   */
  function deleteCounter(id) {
    if (confirm('Supprimer ce compteur et son historique ?')) {
      Store.deleteCounter(id);
      navigate('home');
    }
  }

  // --- Actions paramètres ---

  /**
   * Exporte les données en JSON
   */
  function exportData() {
    const json = Store.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kountz-backup-${Store.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Importe des données depuis un fichier JSON
   */
  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (confirm('Cela remplacera toutes les données actuelles. Continuer ?')) {
        if (Store.importData(e.target.result)) {
          alert('Données importées avec succès !');
          navigate('home');
        } else {
          alert('Erreur lors de l\'import. Vérifie le fichier.');
        }
      }
    };
    reader.readAsText(file);
  }

  /**
   * Efface toutes les données
   */
  function clearAllData() {
    if (confirm('ATTENTION : Cela supprimera définitivement toutes les données. Continuer ?')) {
      if (confirm('Vraiment tout effacer ?')) {
        localStorage.removeItem('kountz_data');
        navigate('home');
      }
    }
  }

  /**
   * Demande les permissions de notification
   */
  function requestNotifications() {
    Timer.requestPermission().then(() => {
      navigate('settings');
    });
  }

  // --- Utilitaires ---

  /**
   * Rafraîchit la vue actuelle
   */
  function refreshCurrentView() {
    navigateInternal(currentView, currentParam, false);
  }

  // API publique
  return {
    init,
    navigate,
    saveObjective,
    deleteObjective,
    updatePreview,
    completeCurrentSet,
    adjustSet,
    onSetInputChange,
    toggleTimer,
    skipTimer,
    saveCounter,
    counterIncrement,
    counterDecrement,
    deleteCounter,
    exportData,
    importData,
    clearAllData,
    requestNotifications
  };
})();

// Démarre l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', App.init);
