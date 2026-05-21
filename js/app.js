/**
 * app.js - Point d'entrée de l'application Kountz
 * Gère la navigation (SPA), les événements et la logique principale
 */

const APP_VERSION = '1.3';

const App = (() => {
  // État local de l'application
  let currentView = 'home';
  let currentParam = null;
  let activeSessionId = null;
  let activeObjectiveId = null;

  // État de l'exercice minuté en cours
  let timedState = null;  // { phase, rep, setIndex, countdown, holdTotal, releaseTotal, totalReps, intervalId }
  let timedObjectiveId = null;

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
        // Si un exercice minuté est en cours, ne pas re-render (le tick continue)
        if (timedState && timedState.intervalId && !timedState.paused) return;
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
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // Force la mise à jour du SW si une nouvelle version est disponible
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Nouvelle version activée - recharge pour avoir les derniers fichiers
              window.location.reload();
            }
          });
        });
        // Vérifie les mises à jour
        reg.update();
      }, (err) => console.log('Service Worker non enregistré:', err));
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
    // Le timer de pause continue en arrière-plan même si on change de vue
    // Mais on arrête l'exercice minuté si on quitte la session
    if (timedState && timedState.intervalId && (view !== 'session' || param !== timedObjectiveId)) {
      clearInterval(timedState.intervalId);
      timedState = null;
    }

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
        // Route vers le bon formulaire selon le type d'objectif
        const editObj = Store.getObjective(param);
        if (editObj && editObj.type === 'timed') {
          UI.renderTimedObjectiveForm(null, param);
        } else {
          UI.renderObjectiveForm(param);
        }
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
      case 'presets':
        UI.renderPresetSelection();
        break;
      case 'newTimedObjective':
        UI.renderTimedObjectiveForm(param);
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

  // --- Actions exercice minuté ---

  /**
   * Crée un objectif depuis un preset
   */
  function createFromPreset(presetId) {
    const preset = Store.getPreset(presetId);
    if (!preset) return;

    const obj = {
      name: preset.name,
      type: 'timed',
      holdSeconds: preset.holdSeconds,
      releaseSeconds: preset.releaseSeconds,
      repsPerSet: preset.repsPerSet,
      setsPerDay: preset.setsPerDay,
      restMinutes: preset.restMinutes,
      durationDays: preset.durationDays || null,
      startDate: Store.today(),
      progressionRules: preset.progressionRules || [],
      tips: preset.tips || [],
      active: true
    };

    Store.saveObjective(obj);
    navigate('home');
  }

  /**
   * Sauvegarde un exercice minuté depuis le formulaire
   */
  function saveTimedObjective(event) {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);

    const id = data.get('id');
    const presetId = data.get('presetId');
    const preset = presetId ? Store.getPreset(presetId) : null;

    // En édition, on récupère l'existant pour garder les progression rules et tips
    const existing = id ? Store.getObjective(id) : null;

    const obj = {
      name: data.get('name').trim(),
      type: 'timed',
      holdSeconds: parseInt(data.get('holdSeconds')),
      releaseSeconds: parseInt(data.get('releaseSeconds')),
      repsPerSet: parseInt(data.get('repsPerSet')),
      setsPerDay: parseInt(data.get('setsPerDay')),
      restMinutes: parseInt(data.get('restMinutes')),
      durationDays: data.get('durationDays') ? parseInt(data.get('durationDays')) : null,
      startDate: data.get('startDate') || Store.today(),
      startTime: data.get('startTime') || null,
      endTime: data.get('endTime') || null,
      progressionRules: collectProgressionRules(data),
      tips: existing ? existing.tips : (preset ? preset.tips || [] : []),
      active: true
    };

    // Mode édition : conserver l'ID et la date de création
    if (id) {
      obj.id = id;
      if (existing) {
        obj.createdAt = existing.createdAt;
      }
    }

    // Validation
    if (!obj.name || !obj.holdSeconds || !obj.releaseSeconds || !obj.repsPerSet || !obj.setsPerDay) {
      alert('Remplis tous les champs obligatoires');
      return;
    }

    Store.saveObjective(obj);
    navigate('home');
  }

  /**
   * Collecte les règles de progression depuis le formulaire
   */
  function collectProgressionRules(data) {
    const rules = [];
    let i = 0;
    while (data.has(`rule_afterDays_${i}`)) {
      const afterDays = parseInt(data.get(`rule_afterDays_${i}`));
      if (!afterDays || afterDays <= 0) { i++; continue; }

      const rule = { afterDays };

      const hold = data.get(`rule_hold_${i}`);
      if (hold && parseInt(hold) > 0) rule.holdSeconds = parseInt(hold);

      const release = data.get(`rule_release_${i}`);
      if (release && parseInt(release) > 0) rule.releaseSeconds = parseInt(release);

      const reps = data.get(`rule_reps_${i}`);
      if (reps && parseInt(reps) > 0) rule.repsPerSet = parseInt(reps);

      const sets = data.get(`rule_sets_${i}`);
      if (sets && parseInt(sets) > 0) rule.setsPerDay = parseInt(sets);

      const note = data.get(`rule_note_${i}`);
      if (note && note.trim()) rule.note = note.trim();

      rules.push(rule);
      i++;
    }

    // Trie par afterDays croissant
    rules.sort((a, b) => a.afterDays - b.afterDays);
    return rules;
  }

  /**
   * Ajoute un nouveau palier de progression dans le formulaire
   */
  function addProgressionRule() {
    const container = document.getElementById('progressionRules');
    if (!container) return;

    // Supprime le message "aucune progression" s'il existe
    const noMsg = document.getElementById('noRulesMsg');
    if (noMsg) noMsg.remove();

    // Compte les règles existantes
    const existingRules = container.querySelectorAll('.progression-rule');
    const newIndex = existingRules.length;

    // Crée le HTML de la nouvelle règle
    const temp = document.createElement('div');
    temp.innerHTML = UI.renderProgressionRuleRow({ afterDays: '', holdSeconds: '', releaseSeconds: '', repsPerSet: '', setsPerDay: '', note: '' }, newIndex);
    container.appendChild(temp.firstElementChild);
  }

  /**
   * Supprime un palier de progression du formulaire
   */
  function removeProgressionRule(index) {
    const container = document.getElementById('progressionRules');
    if (!container) return;

    const rule = container.querySelector(`[data-rule-index="${index}"]`);
    if (rule) rule.remove();

    // Ré-indexe les règles restantes pour éviter les trous
    const remaining = container.querySelectorAll('.progression-rule');
    remaining.forEach((el, i) => {
      el.dataset.ruleIndex = i;
      el.querySelector('.progression-rule-title').textContent = `Palier ${i + 1}`;
      // Renomme les champs
      el.querySelectorAll('input').forEach(input => {
        const oldName = input.name;
        const suffix = oldName.replace(/^rule_\w+_\d+$/, '').length === 0
          ? oldName.replace(/_\d+$/, `_${i}`)
          : oldName.replace(/_\d+$/, `_${i}`);
        input.name = suffix;
      });
      // Met à jour le onclick du bouton supprimer
      const delBtn = el.querySelector('[onclick*="removeProgressionRule"]');
      if (delBtn) delBtn.setAttribute('onclick', `App.removeProgressionRule(${i})`);
    });

    // Si plus de règles, affiche le message
    if (remaining.length === 0) {
      container.innerHTML = '<p class="text-muted text-sm" id="noRulesMsg">Aucune progression configurée. L\'exercice restera identique.</p>';
    }
  }

  /**
   * Démarre une série d'exercice minuté
   */
  function startTimedSet(objectiveId) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) return;

    const session = Store.getTodaySession(objectiveId);
    if (!session) return;

    const nextIdx = Objectives.getNextSetIndex(session);
    if (nextIdx === -1) return;

    const params = Objectives.getTimedParams(obj);
    timedObjectiveId = objectiveId;

    // Initialise l'état de la machine
    timedState = {
      phase: 'hold',
      rep: 0,
      setIndex: nextIdx,
      countdown: params.holdSeconds * 10, // en dixièmes de seconde
      holdTotal: params.holdSeconds * 10,
      releaseTotal: params.releaseSeconds * 10,
      totalReps: params.repsPerSet,
      paused: false,
      intervalId: null
    };

    // Masque le bouton démarrer, affiche les boutons de contrôle
    const startBtn = document.getElementById('timedStartBtn');
    const runningActions = document.getElementById('timedRunningActions');
    if (startBtn) startBtn.style.display = 'none';
    if (runningActions) runningActions.style.display = 'block';

    // Premier affichage immédiat
    UI.updateTimedExerciseDisplay(timedState);

    // Démarre le tick à 100ms
    timedState.intervalId = setInterval(() => timedTick(), 100);
  }

  /**
   * Tick de l'exercice minuté (appelé toutes les 100ms)
   */
  function timedTick() {
    if (!timedState || timedState.paused) return;

    timedState.countdown--;

    if (timedState.countdown <= 0) {
      if (timedState.phase === 'hold') {
        // Passe au relâchement
        timedState.phase = 'release';
        timedState.countdown = timedState.releaseTotal;
      } else if (timedState.phase === 'release') {
        // Fin d'une répétition
        timedState.rep++;
        if (timedState.rep >= timedState.totalReps) {
          // Série terminée
          timedState.phase = 'done';
          completeTimedSet(timedObjectiveId);
          return;
        }
        // Prochaine répétition
        timedState.phase = 'hold';
        timedState.countdown = timedState.holdTotal;
      }
    }

    UI.updateTimedExerciseDisplay(timedState);
  }

  /**
   * Met en pause / reprend l'exercice minuté
   */
  function pauseTimedExercise() {
    if (!timedState) return;

    timedState.paused = !timedState.paused;

    // Met à jour le bouton pause
    const phaseEl = document.getElementById('timedPhase');
    if (timedState.paused && phaseEl) {
      phaseEl.textContent = 'EN PAUSE';
    } else {
      // Reprend - le prochain tick mettra à jour l'affichage
    }
  }

  /**
   * Passe la série en cours (sans la compléter normalement)
   */
  function skipTimedSet() {
    if (timedState && timedState.intervalId) {
      clearInterval(timedState.intervalId);
    }

    if (timedObjectiveId) {
      // Marque la série comme faite avec 0 reps
      const session = Store.getTodaySession(timedObjectiveId);
      if (session) {
        const nextIdx = Objectives.getNextSetIndex(session);
        if (nextIdx !== -1) {
          Objectives.completeSet(session.id, nextIdx, 0);
        }
      }
    }

    timedState = null;
    if (timedObjectiveId) {
      UI.renderTimedSession(timedObjectiveId);
    }
  }

  /**
   * Termine la série minutée en cours et lance le timer de pause
   */
  function completeTimedSet(objectiveId) {
    // Arrête le tick
    if (timedState && timedState.intervalId) {
      clearInterval(timedState.intervalId);
    }

    const session = Store.getTodaySession(objectiveId);
    if (!session) return;

    const setIndex = timedState ? timedState.setIndex : Objectives.getNextSetIndex(session);
    const reps = timedState ? timedState.rep : 0;

    // Valide la série avec le nombre de reps effectuées
    Objectives.completeSet(session.id, setIndex, reps);

    // Vibration de confirmation
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Lance le timer de pause si pas la dernière série
    const obj = Store.getObjective(objectiveId);
    const updatedSession = Store.getTodaySession(objectiveId);
    const newNextIdx = Objectives.getNextSetIndex(updatedSession);

    if (newNextIdx !== -1 && obj) {
      Timer.start(
        obj.restMinutes,
        (data) => UI.updateTimerDisplay(data),
        () => {
          UI.updateTimerDisplay(null);
          if (currentView === 'session' && currentParam === objectiveId) {
            UI.renderTimedSession(objectiveId);
          }
        }
      );
    }

    timedState = null;

    // Re-render
    UI.renderTimedSession(objectiveId);
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

  /**
   * Force la mise à jour du Service Worker et recharge l'app
   */
  function forceUpdate() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.unregister().then(() => {
            // Vide le cache
            caches.keys().then((names) => {
              Promise.all(names.map(name => caches.delete(name))).then(() => {
                alert('Mise à jour en cours...');
                window.location.reload(true);
              });
            });
          });
        } else {
          window.location.reload(true);
        }
      });
    } else {
      window.location.reload(true);
    }
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
    createFromPreset,
    saveTimedObjective,
    addProgressionRule,
    removeProgressionRule,
    startTimedSet,
    pauseTimedExercise,
    skipTimedSet,
    completeTimedSet,
    saveCounter,
    counterIncrement,
    counterDecrement,
    deleteCounter,
    exportData,
    importData,
    clearAllData,
    requestNotifications,
    forceUpdate
  };
})();

// Démarre l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', App.init);
