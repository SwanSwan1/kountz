/**
 * ui.js - Rendu de l'interface utilisateur
 * Gère toutes les vues et les composants visuels
 */

const UI = (() => {
  const app = () => document.getElementById('app');

  /**
   * Rend le contenu HTML dans le conteneur principal
   */
  function render(html) {
    app().innerHTML = html;
  }

  /**
   * Écran d'accueil avec les objectifs et compteurs du jour
   */
  function renderHome() {
    const objectives = Store.getActiveObjectives();
    const counters = Store.getActiveCounters();

    let html = `
      <header class="header">
        <h1 class="logo">Kountz</h1>
        <button class="btn-icon" onclick="App.navigate('settings')" aria-label="Paramètres">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </button>
      </header>
    `;

    // Section objectifs
    html += `<section class="section">
      <div class="section-header">
        <h2>Objectifs du jour</h2>
        <button class="btn btn-sm btn-primary" onclick="App.navigate('presets')">+ Nouveau</button>
      </div>`;

    if (objectives.length === 0) {
      html += `<div class="empty-state">
        <p>Aucun objectif actif</p>
        <p class="text-muted">Crée ton premier objectif pour commencer !</p>
      </div>`;
    } else {
      objectives.forEach(obj => {
        const session = Store.getTodaySession(obj.id);
        const isComplete = session && session.completed;
        const challenge = Store.getChallengeInfo(obj.id);
        const isTimed = obj.type === 'timed';

        // Calcul de la progression selon le type
        const progress = Objectives.getProgress(obj, session);
        const percent = Math.min(100, Math.round((progress.done / progress.target) * 100));
        let progressText;
        if (isTimed) {
          progressText = `<span class="progress-value">Séries : ${progress.done}</span>
            <span class="progress-sep">/</span>
            <span class="progress-target">${progress.target} aujourd'hui</span>`;
        } else {
          progressText = `<span class="progress-value">${progress.done}</span>
            <span class="progress-sep">/</span>
            <span class="progress-target">${progress.target}</span>`;
        }

        html += `
          <div class="card card-objective ${isComplete ? 'card-complete' : ''}"
               onclick="App.navigate('session', '${obj.id}')">
            <div class="card-content">
              <div class="card-title">
                ${escHtml(obj.name)}
                ${challenge ? `<span class="badge badge-info">Jour ${challenge.currentDay}/${challenge.totalDays}</span>` : ''}
              </div>
              <div class="card-progress-text">
                ${progressText}
                ${isComplete ? '<span class="badge badge-success">Terminé !</span>' : ''}
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${isComplete ? 'fill-success' : ''}"
                     style="width: ${percent}%"></div>
              </div>
              ${challenge ? `
                <div class="challenge-mini">
                  <div class="challenge-mini-text">
                    <span>${challenge.daysCompleted}j réussis</span>
                    <span class="text-muted">${challenge.daysMissed > 0 ? challenge.daysMissed + 'j manqués' : ''}</span>
                    <span>${challenge.daysRemaining}j restants</span>
                  </div>
                  <div class="progress-bar progress-bar-sm">
                    <div class="progress-fill fill-info" style="width: ${Math.round((challenge.currentDay / challenge.totalDays) * 100)}%"></div>
                  </div>
                </div>
              ` : ''}
            </div>
            <div class="card-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
          </div>`;
      });
    }
    html += `</section>`;

    // Section compteurs
    html += `<section class="section">
      <div class="section-header">
        <h2>Compteurs</h2>
        <button class="btn btn-sm btn-primary" onclick="App.navigate('newCounter')">+ Nouveau</button>
      </div>`;

    if (counters.length === 0) {
      html += `<div class="empty-state">
        <p>Aucun compteur actif</p>
      </div>`;
    } else {
      counters.forEach(counter => {
        const value = Counters.getTodayValue(counter.id);
        html += `
          <div class="card card-counter">
            <div class="card-content" onclick="App.navigate('counterView', '${counter.id}')">
              <div class="card-title">${escHtml(counter.name)}</div>
              <div class="counter-value">${value}</div>
            </div>
            <div class="counter-actions">
              <button class="btn btn-round btn-danger-light" onclick="event.stopPropagation(); App.counterDecrement('${counter.id}')">-1</button>
              <button class="btn btn-round btn-success" onclick="event.stopPropagation(); App.counterIncrement('${counter.id}')">+1</button>
            </div>
          </div>`;
      });
    }
    html += `</section>`;

    // Bouton stats global
    html += `
      <section class="section">
        <button class="btn btn-block btn-outline" onclick="App.navigate('statsOverview')">
          Voir les statistiques
        </button>
      </section>
    `;

    render(html);
  }

  /**
   * Formulaire de création / édition d'objectif
   */
  function renderObjectiveForm(existingId = null) {
    const obj = existingId ? Store.getObjective(existingId) : null;
    const isEdit = !!obj;

    const name = obj ? obj.name : '';
    const dailyTarget = obj ? obj.dailyTarget : '';
    const maxPerSet = obj ? obj.maxPerSet : '';
    const restMinutes = obj ? obj.restMinutes : 30;
    const startTime = obj ? obj.startTime : '';
    const endTime = obj ? (obj.endTime || '') : '';
    const distribution = obj ? obj.distribution : 'degressive';
    const durationDays = obj ? (obj.durationDays || '') : '';
    const startDate = obj ? (obj.startDate || '') : Store.today();

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${isEdit ? 'Modifier' : 'Nouvel'} objectif</h1>
        <div style="width:40px"></div>
      </header>

      <form id="objectiveForm" class="form" onsubmit="App.saveObjective(event)">
        ${isEdit ? `<input type="hidden" name="id" value="${obj.id}">` : ''}

        <div class="form-group">
          <label for="objName">Nom de l'objectif</label>
          <input type="text" id="objName" name="name" value="${escHtml(name)}"
                 placeholder="Ex: Pompes" required class="input">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="objTarget">Objectif quotidien</label>
            <input type="number" id="objTarget" name="dailyTarget" value="${dailyTarget}"
                   placeholder="200" required min="1" class="input"
                   oninput="App.updatePreview()">
          </div>
          <div class="form-group">
            <label for="objMax">Max par série</label>
            <input type="number" id="objMax" name="maxPerSet" value="${maxPerSet}"
                   placeholder="25" required min="1" class="input"
                   oninput="App.updatePreview()">
          </div>
        </div>

        <div class="form-group">
          <label for="objRest">Pause entre séries (min)</label>
          <input type="number" id="objRest" name="restMinutes" value="${restMinutes}"
                 min="1" max="180" required class="input"
                 oninput="App.updatePreview()">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="objStart">Heure de début</label>
            <input type="time" id="objStart" name="startTime" value="${startTime}"
                   required class="input" oninput="App.updatePreview()">
          </div>
          <div class="form-group">
            <label for="objEnd">Heure de fin <span class="text-muted">(optionnel)</span></label>
            <input type="time" id="objEnd" name="endTime" value="${endTime}"
                   class="input" oninput="App.updatePreview()">
          </div>
        </div>

        <div class="form-group">
          <label for="objDist">Mode de répartition</label>
          <select id="objDist" name="distribution" class="input" onchange="App.updatePreview()">
            <option value="degressive" ${distribution === 'degressive' ? 'selected' : ''}>
              Dégressif (recommandé)
            </option>
            <option value="progressive" ${distribution === 'progressive' ? 'selected' : ''}>
              Progressif
            </option>
            <option value="uniform" ${distribution === 'uniform' ? 'selected' : ''}>
              Uniforme
            </option>
          </select>
        </div>

        <div class="form-divider">
          <span>Durée du défi</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="objDuration">Nombre de jours <span class="text-muted">(optionnel)</span></label>
            <input type="number" id="objDuration" name="durationDays" value="${durationDays}"
                   placeholder="Ex: 30" min="1" max="365" class="input">
          </div>
          <div class="form-group">
            <label for="objStartDate">Date de début</label>
            <input type="date" id="objStartDate" name="startDate" value="${startDate}"
                   class="input">
          </div>
        </div>
        <p class="text-muted text-sm">Laisse vide pour un objectif permanent sans limite de durée.</p>

        <div id="preview" class="preview-box"></div>

        <div class="form-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="App.deleteObjective('${obj.id}')">Supprimer</button>` : ''}
          <button type="submit" class="btn btn-primary btn-block">
            ${isEdit ? 'Enregistrer' : 'Créer l\'objectif'}
          </button>
        </div>
      </form>
    `;

    render(html);

    // Affiche le preview si les champs sont remplis
    setTimeout(() => App.updatePreview(), 50);
  }

  /**
   * Met à jour la preview de répartition dans le formulaire
   */
  function updatePreview() {
    const preview = document.getElementById('preview');
    if (!preview) return;

    const target = parseInt(document.getElementById('objTarget')?.value);
    const maxPerSet = parseInt(document.getElementById('objMax')?.value);
    const restMinutes = parseInt(document.getElementById('objRest')?.value);
    const startTime = document.getElementById('objStart')?.value;
    const endTime = document.getElementById('objEnd')?.value;
    const distribution = document.getElementById('objDist')?.value;

    if (!target || !maxPerSet || target <= 0 || maxPerSet <= 0) {
      preview.innerHTML = '<p class="text-muted">Remplis l\'objectif et le max par série pour voir la preview</p>';
      return;
    }

    const sets = Objectives.calculateDistribution(target, maxPerSet, distribution);
    const schedule = startTime
      ? Objectives.calculateSchedule(startTime, restMinutes || 30, sets.length)
      : [];

    const timeCheck = startTime
      ? Objectives.checkTimeRange(startTime, endTime || null, restMinutes || 30, sets.length)
      : null;

    let html = `
      <h3>Preview - ${sets.length} séries</h3>
      <div class="preview-sets">
    `;

    sets.forEach((val, i) => {
      const time = schedule[i] || '';
      html += `<div class="preview-set">
        <span class="set-num">S${i + 1}</span>
        <span class="set-val">${val}</span>
        ${time ? `<span class="set-time">${time}</span>` : ''}
      </div>`;
    });

    html += `</div>`;
    html += `<div class="preview-total">Total : ${sets.reduce((a, b) => a + b, 0)}</div>`;

    if (timeCheck) {
      html += `<div class="preview-end">Fin estimée : ${timeCheck.estimatedEnd}</div>`;
      if (!timeCheck.sufficient) {
        html += `<div class="alert alert-warning">${timeCheck.message}</div>`;
      }
    }

    preview.innerHTML = html;
  }

  /**
   * Écran de session active pour un objectif
   */
  function renderSession(objectiveId) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) {
      renderHome();
      return;
    }

    // Route vers l'écran minuté si type timed
    if (obj.type === 'timed') {
      renderTimedSession(objectiveId);
      return;
    }

    const session = Objectives.getOrCreateTodaySession(objectiveId);
    const nextIdx = Objectives.getNextSetIndex(session);
    const allDone = nextIdx === -1;
    const totalDone = session.totalDone;
    const percent = Math.min(100, Math.round((totalDone / obj.dailyTarget) * 100));

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${escHtml(obj.name)}</h1>
        <button class="btn-icon" onclick="App.navigate('editObjective', '${obj.id}')" aria-label="Modifier">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
      </header>
    `;

    // Bandeau défi si applicable
    const challenge = Store.getChallengeInfo(objectiveId);
    if (challenge) {
      html += `
        <div class="challenge-banner">
          <div class="challenge-banner-title">Défi : Jour ${challenge.currentDay}/${challenge.totalDays}</div>
          <div class="challenge-banner-stats">
            <span class="challenge-stat">${challenge.daysCompleted} <small>réussis</small></span>
            ${challenge.daysMissed > 0 ? `<span class="challenge-stat text-warning">${challenge.daysMissed} <small>manqués</small></span>` : ''}
            <span class="challenge-stat">${challenge.daysRemaining} <small>restants</small></span>
            <span class="challenge-stat">${challenge.completionRate}%</span>
          </div>
          <div class="progress-bar progress-bar-sm">
            <div class="progress-fill fill-info" style="width: ${Math.round((challenge.currentDay / challenge.totalDays) * 100)}%"></div>
          </div>
        </div>
      `;
    }

    // Progression globale
    html += `
      <div class="session-progress">
        <div class="session-progress-text">
          <span class="big-number">${totalDone}</span>
          <span class="big-sep">/</span>
          <span class="big-target">${obj.dailyTarget}</span>
        </div>
        <div class="progress-bar progress-bar-lg">
          <div class="progress-fill ${session.completed ? 'fill-success' : ''}"
               style="width: ${percent}%"></div>
        </div>
        <div class="session-percent">${percent}%</div>
      </div>
    `;

    // Zone timer
    html += `<div id="timerZone" class="timer-zone"></div>`;

    // Série en cours
    if (allDone || session.completed) {
      html += `
        <div class="session-complete">
          <div class="complete-icon">&#10003;</div>
          <h2>Objectif terminé !</h2>
          <p>${totalDone} ${escHtml(obj.name).toLowerCase()} aujourd'hui</p>
        </div>
      `;
    } else {
      const currentSet = session.sets[nextIdx];
      html += `
        <div class="current-set">
          <div class="set-info">
            Série ${nextIdx + 1}/${session.sets.length}
          </div>
          <div class="set-planned">
            <span class="set-big-number" id="actualCount">${currentSet.planned}</span>
            <span class="set-unit">${escHtml(obj.name).toLowerCase()}</span>
          </div>
          <div class="set-adjust">
            <button class="btn btn-round btn-outline" onclick="App.adjustSet(-1)">-</button>
            <input type="number" id="setActual" value="${currentSet.planned}" min="0"
                   class="input input-center" onchange="App.onSetInputChange()">
            <button class="btn btn-round btn-outline" onclick="App.adjustSet(1)">+</button>
          </div>
          <button class="btn btn-lg btn-success btn-block" onclick="App.completeCurrentSet()">
            Fait !
          </button>
        </div>
      `;
    }

    // Historique des séries faites
    const completedSets = session.sets.filter(s => s.actual !== null);
    if (completedSets.length > 0) {
      html += `
        <div class="session-history">
          <h3>Séries complétées</h3>
          <div class="sets-list">
      `;
      session.sets.forEach((s, i) => {
        if (s.actual !== null) {
          const diff = s.actual - s.planned;
          const diffClass = diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : '';
          const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '';
          html += `
            <div class="set-done">
              <span class="set-done-num">S${i + 1}</span>
              <span class="set-done-val">${s.actual}/${s.planned}</span>
              ${diffText ? `<span class="set-done-diff ${diffClass}">${diffText}</span>` : ''}
              <span class="set-done-time">${s.completedAt}</span>
            </div>
          `;
        }
      });
      html += `</div></div>`;
    }

    // Bouton stats
    html += `
      <div class="section" style="margin-top:1rem">
        <button class="btn btn-block btn-outline" onclick="App.navigate('statsObjective', '${obj.id}')">
          Voir les statistiques
        </button>
      </div>
    `;

    render(html);

    // Restaure le timer s'il tournait en arrière-plan
    if (Timer.isRunning()) {
      Timer.restore(
        (data) => updateTimerDisplay(data),
        () => {
          updateTimerDisplay(null);
          renderSession(objectiveId);
        }
      );
    }
  }

  /**
   * Met à jour la zone timer sans re-render toute la page
   */
  function updateTimerDisplay(data) {
    const zone = document.getElementById('timerZone');
    if (!zone) return;

    if (!data || data.remaining <= 0) {
      zone.innerHTML = '';
      return;
    }

    const percent = Math.round(((data.total - data.remaining) / data.total) * 100);
    zone.innerHTML = `
      <div class="timer-display">
        <div class="timer-circle">
          <svg viewBox="0 0 100 100" class="timer-svg">
            <circle cx="50" cy="50" r="45" class="timer-bg"/>
            <circle cx="50" cy="50" r="45" class="timer-progress"
                    style="stroke-dashoffset: ${283 - (283 * percent / 100)}"/>
          </svg>
          <div class="timer-text">${Timer.formatTime(data.remaining)}</div>
        </div>
        <div class="timer-label">${data.paused ? 'En pause' : 'Pause en cours'}</div>
        <div class="timer-actions">
          <button class="btn btn-sm ${data.paused ? 'btn-success' : 'btn-warning'}"
                  onclick="App.toggleTimer()">
            ${data.paused ? 'Reprendre' : 'Pause'}
          </button>
          <button class="btn btn-sm btn-danger-light" onclick="App.skipTimer()">
            Passer
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Formulaire de nouveau compteur
   */
  function renderCounterForm() {
    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>Nouveau compteur</h1>
        <div style="width:40px"></div>
      </header>

      <form class="form" onsubmit="App.saveCounter(event)">
        <div class="form-group">
          <label for="counterName">Nom du compteur</label>
          <input type="text" id="counterName" name="name"
                 placeholder="Ex: Verres d'eau" required class="input">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Créer le compteur</button>
      </form>
    `;
    render(html);
  }

  /**
   * Vue détaillée d'un compteur libre
   */
  function renderCounterView(counterId) {
    const counter = Store.getCounter(counterId);
    if (!counter) {
      renderHome();
      return;
    }

    const value = Counters.getTodayValue(counterId);
    const stats = Counters.getStats(counterId, 30);

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${escHtml(counter.name)}</h1>
        <button class="btn-icon" onclick="App.deleteCounter('${counter.id}')" aria-label="Supprimer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
          </svg>
        </button>
      </header>

      <div class="counter-detail">
        <div class="counter-big-value">${value}</div>
        <div class="counter-today-label">Aujourd'hui</div>
        <div class="counter-detail-actions">
          <button class="btn btn-lg btn-round btn-danger-light" onclick="App.counterDecrement('${counter.id}')">
            <span style="font-size:1.5rem">-</span>
          </button>
          <button class="btn btn-xl btn-round btn-success" onclick="App.counterIncrement('${counter.id}')">
            <span style="font-size:2rem">+</span>
          </button>
        </div>
      </div>
    `;

    // Mini stats
    html += `
      <div class="section">
        <h3>30 derniers jours</h3>
        <div class="stats-summary">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.avg}</div>
            <div class="stat-label">Moyenne/jour</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.max}</div>
            <div class="stat-label">Record</div>
          </div>
        </div>
    `;

    // Mini barres
    if (stats.recent.length > 0) {
      const max = Math.max(...stats.recent.map(e => e.count), 1);
      html += `<div class="mini-bars">`;
      stats.recent.forEach(entry => {
        const h = Math.max(4, Math.round((entry.count / max) * 60));
        const label = entry.date.slice(8);
        html += `
          <div class="mini-bar-col">
            <div class="mini-bar" style="height:${h}px" title="${entry.date}: ${entry.count}"></div>
            <div class="mini-bar-label">${label}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
    render(html);
  }

  /**
   * Vue d'ensemble des statistiques
   */
  function renderStatsOverview() {
    const objectives = Store.getObjectives();
    const counters = Store.getCounters();

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>Statistiques</h1>
        <div style="width:40px"></div>
      </header>
    `;

    // Objectifs
    html += `<section class="section"><h2>Objectifs</h2>`;
    if (objectives.length === 0) {
      html += `<p class="text-muted">Aucun objectif</p>`;
    } else {
      objectives.forEach(obj => {
        const summary = Stats.getObjectiveSummary(obj.id);
        if (!summary) return;
        html += `
          <div class="card" onclick="App.navigate('statsObjective', '${obj.id}')">
            <div class="card-content">
              <div class="card-title">${escHtml(obj.name)} ${obj.active ? '' : '<span class="badge">Archivé</span>'}</div>
              <div class="stats-mini-row">
                <span>Streak : ${summary.streak.current}j</span>
                <span>Taux : ${summary.completionRate}%</span>
                <span>Total : ${summary.totalAll}</span>
              </div>
            </div>
            <div class="card-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
          </div>
        `;
      });
    }
    html += `</section>`;

    // Compteurs
    html += `<section class="section"><h2>Compteurs</h2>`;
    if (counters.length === 0) {
      html += `<p class="text-muted">Aucun compteur</p>`;
    } else {
      counters.forEach(counter => {
        const stats = Counters.getStats(counter.id, 30);
        html += `
          <div class="card" onclick="App.navigate('counterView', '${counter.id}')">
            <div class="card-content">
              <div class="card-title">${escHtml(counter.name)}</div>
              <div class="stats-mini-row">
                <span>Moy : ${stats.avg}/j</span>
                <span>Total 30j : ${stats.total}</span>
              </div>
            </div>
            <div class="card-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
          </div>
        `;
      });
    }
    html += `</section>`;

    render(html);
  }

  /**
   * Statistiques détaillées pour un objectif
   */
  function renderStatsObjective(objectiveId) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) {
      renderStatsOverview();
      return;
    }

    const summary = Stats.getObjectiveSummary(objectiveId);
    const barData = Stats.getObjectiveBarData(objectiveId, 14);
    const now = new Date();
    const calendar = Stats.getCalendarData(objectiveId, now.getFullYear(), now.getMonth());

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('statsOverview')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${escHtml(obj.name)}</h1>
        <div style="width:40px"></div>
      </header>
    `;

    // Bandeau défi si applicable
    const challengeStats = Store.getChallengeInfo(objectiveId);
    if (challengeStats) {
      html += `
        <div class="challenge-stats-card">
          <h3>Défi ${challengeStats.totalDays} jours</h3>
          <div class="challenge-progress-ring">
            <div class="challenge-day-counter">
              <span class="challenge-day-big">${challengeStats.currentDay}</span>
              <span class="challenge-day-sep">/</span>
              <span class="challenge-day-total">${challengeStats.totalDays}</span>
            </div>
          </div>
          <div class="stats-summary">
            <div class="stat-card">
              <div class="stat-value text-success">${challengeStats.daysCompleted}</div>
              <div class="stat-label">Jours réussis</div>
            </div>
            <div class="stat-card">
              <div class="stat-value text-warning">${challengeStats.daysMissed}</div>
              <div class="stat-label">Jours manqués</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${challengeStats.daysRemaining}</div>
              <div class="stat-label">Jours restants</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${challengeStats.completionRate}%</div>
              <div class="stat-label">Taux réussite</div>
            </div>
          </div>
          <div class="progress-bar progress-bar-lg" style="margin-top:0.5rem">
            <div class="progress-fill fill-info" style="width: ${Math.round((challengeStats.currentDay / challengeStats.totalDays) * 100)}%"></div>
          </div>
          <div class="challenge-dates">
            <span>Début : ${challengeStats.currentDay > 0 ? obj.startDate : '-'}</span>
            <span>Fin : ${challengeStats.endDate}</span>
          </div>
        </div>
      `;
    }

    // Résumé
    html += `
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-value">${summary.streak.current}</div>
          <div class="stat-label">Streak actuel</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.streak.best}</div>
          <div class="stat-label">Meilleur streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.totalAll}</div>
          <div class="stat-label">Total cumulé</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.completionRate}%</div>
          <div class="stat-label">Taux réussite</div>
        </div>
      </div>
    `;

    // Graphique barres (14 derniers jours)
    html += `
      <section class="section">
        <h3>14 derniers jours</h3>
        <div class="bar-chart">
    `;

    const chartTarget = Objectives.getProgress(obj, null).target;
    const maxVal = Math.max(...barData.map(d => d.done), chartTarget, 1);
    barData.forEach(d => {
      const h = Math.max(4, Math.round((d.done / maxVal) * 120));
      const targetH = Math.round((chartTarget / maxVal) * 120);
      const barClass = d.completed ? 'bar-success' : d.done > 0 ? 'bar-partial' : 'bar-none';
      html += `
        <div class="bar-col">
          <div class="bar-container" style="height:130px">
            <div class="bar-target-line" style="bottom:${targetH}px"></div>
            <div class="bar ${barClass}" style="height:${h}px"
                 title="${d.dayLabel}: ${d.done}/${d.target}"></div>
          </div>
          <div class="bar-label">${d.shortLabel}</div>
          <div class="bar-date">${d.dayLabel}</div>
        </div>
      `;
    });

    html += `</div></section>`;

    // Calendrier mensuel
    html += `
      <section class="section">
        <h3>${calendar.monthName} ${calendar.year}</h3>
        <div class="calendar">
          <div class="calendar-header">
    `;

    Stats.getDayNames().forEach(d => {
      html += `<div class="cal-day-name">${d}</div>`;
    });
    html += `</div>`;

    calendar.weeks.forEach(week => {
      html += `<div class="calendar-week">`;
      week.forEach(day => {
        if (!day) {
          html += `<div class="cal-day cal-empty"></div>`;
        } else {
          const cls = day.status === 'complete' ? 'cal-complete' :
            day.status === 'partial' ? 'cal-partial' :
              day.status === 'future' ? 'cal-future' : 'cal-none';
          html += `<div class="cal-day ${cls}" title="${day.date}: ${day.done}/${day.target}">
            ${day.day}
          </div>`;
        }
      });
      html += `</div>`;
    });

    html += `</div></section>`;

    render(html);
  }

  /**
   * Écran de paramètres
   */
  function renderSettings() {
    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>Paramètres</h1>
        <div style="width:40px"></div>
      </header>

      <section class="section">
        <h3>Données</h3>
        <button class="btn btn-block btn-outline" onclick="App.exportData()">
          Exporter les données (JSON)
        </button>
        <div style="margin-top:0.5rem">
          <label class="btn btn-block btn-outline" style="cursor:pointer">
            Importer des données
            <input type="file" accept=".json" style="display:none"
                   onchange="App.importData(event)">
          </label>
        </div>
        <button class="btn btn-block btn-danger" style="margin-top:1rem"
                onclick="App.clearAllData()">
          Effacer toutes les données
        </button>
      </section>

      <section class="section">
        <h3>Application</h3>
        <button class="btn btn-block btn-outline" onclick="App.forceUpdate()">
          Vérifier les mises à jour
        </button>
        <p class="text-muted" style="margin-top:0.5rem">
          Version : ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?'}
        </p>
      </section>

      <section class="section">
        <h3>Notifications</h3>
        <button class="btn btn-block btn-outline" onclick="App.requestNotifications()">
          Autoriser les notifications
        </button>
        <p class="text-muted" style="margin-top:0.5rem">
          Statut : ${typeof Notification !== 'undefined' ? Notification.permission : 'non supporté'}
        </p>
      </section>

      <section class="section text-center text-muted" style="margin-top:2rem">
        <p>Kountz v${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0'}</p>
        <p>PWA de comptage personnel</p>
      </section>
    `;

    render(html);
  }

  /**
   * Écran de sélection de preset / type d'objectif
   */
  function renderPresetSelection() {
    const presets = Store.getPresets();

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>Choisir un type</h1>
        <div style="width:40px"></div>
      </header>
    `;

    // Section presets
    html += `<section class="section">
      <h2 style="margin-bottom:12px">Presets</h2>`;

    presets.forEach(preset => {
      html += `
        <div class="card preset-card">
          <div class="card-content">
            <div class="card-title">
              <span class="preset-icon">${preset.icon}</span>
              ${escHtml(preset.name)}
            </div>
            <p class="text-muted text-sm" style="margin:6px 0">${escHtml(preset.description)}</p>
            <button class="btn btn-sm btn-primary" onclick="App.createFromPreset('${preset.id}')">Créer</button>
          </div>
        </div>`;
    });

    html += `</section>`;

    // Section personnalisé
    html += `<section class="section">
      <h2 style="margin-bottom:12px">Personnalisé</h2>
      <div style="display:flex;gap:12px">
        <button class="btn btn-outline" style="flex:1" onclick="App.navigate('newObjective')">
          Objectif comptage
        </button>
        <button class="btn btn-outline" style="flex:1" onclick="App.navigate('newTimedObjective')">
          Exercice minuté
        </button>
      </div>
    </section>`;

    render(html);
  }

  /**
   * Formulaire de création / édition d'un exercice minuté
   */
  function renderTimedObjectiveForm(presetId, existingId) {
    const preset = presetId ? Store.getPreset(presetId) : null;
    const obj = existingId ? Store.getObjective(existingId) : null;
    const isEdit = !!obj;
    const source = obj || preset; // Priorité à l'objectif existant

    const name = source ? source.name : '';
    const holdSeconds = source ? source.holdSeconds : 3;
    const releaseSeconds = source ? source.releaseSeconds : 5;
    const repsPerSet = source ? source.repsPerSet : 10;
    const setsPerDay = source ? source.setsPerDay : 3;
    const restMinutes = source ? source.restMinutes : 60;
    const durationDays = source ? (source.durationDays || '') : '';
    const startDate = obj ? (obj.startDate || Store.today()) : Store.today();
    const startTime = obj ? (obj.startTime || '') : '';
    const endTime = obj ? (obj.endTime || '') : '';
    const tips = obj ? (obj.tips || []) : (preset ? preset.tips || [] : []);

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('${isEdit ? 'home' : 'presets'}')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${isEdit ? 'Modifier' : 'Exercice minuté'}</h1>
        <div style="width:40px"></div>
      </header>

      <form id="timedObjectiveForm" class="form" onsubmit="App.saveTimedObjective(event)">
        ${isEdit ? `<input type="hidden" name="id" value="${obj.id}">` : ''}
        ${presetId ? `<input type="hidden" name="presetId" value="${presetId}">` : ''}

        <div class="form-group">
          <label for="timedName">Nom de l'exercice</label>
          <input type="text" id="timedName" name="name" value="${escHtml(name)}"
                 placeholder="Ex: Périnée" required class="input">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timedHold">Contraction (sec)</label>
            <input type="number" id="timedHold" name="holdSeconds" value="${holdSeconds}"
                   min="1" max="60" required class="input">
          </div>
          <div class="form-group">
            <label for="timedRelease">Relâchement (sec)</label>
            <input type="number" id="timedRelease" name="releaseSeconds" value="${releaseSeconds}"
                   min="1" max="60" required class="input">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timedReps">Répétitions/série</label>
            <input type="number" id="timedReps" name="repsPerSet" value="${repsPerSet}"
                   min="1" max="100" required class="input">
          </div>
          <div class="form-group">
            <label for="timedSets">Séries/jour</label>
            <input type="number" id="timedSets" name="setsPerDay" value="${setsPerDay}"
                   min="1" max="20" required class="input">
          </div>
        </div>

        <div class="form-group">
          <label for="timedRest">Pause entre séries (min)</label>
          <input type="number" id="timedRest" name="restMinutes" value="${restMinutes}"
                 min="1" max="480" required class="input">
        </div>

        <div class="form-divider">
          <span>Durée du défi</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timedDuration">Nombre de jours <span class="text-muted">(optionnel)</span></label>
            <input type="number" id="timedDuration" name="durationDays" value="${durationDays}"
                   placeholder="Ex: 90" min="1" max="365" class="input">
          </div>
          <div class="form-group">
            <label for="timedStartDate">Date de début</label>
            <input type="date" id="timedStartDate" name="startDate" value="${startDate}"
                   class="input">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timedStartTime">Heure de début <span class="text-muted">(optionnel)</span></label>
            <input type="time" id="timedStartTime" name="startTime" value="${startTime}"
                   class="input">
          </div>
          <div class="form-group">
            <label for="timedEndTime">Heure de fin <span class="text-muted">(optionnel)</span></label>
            <input type="time" id="timedEndTime" name="endTime" value="${endTime}"
                   class="input">
          </div>
        </div>
        <p class="text-muted text-sm">Laisse vide pour un objectif permanent sans limite de durée.</p>

        <div class="form-divider">
          <span>Progression automatique</span>
        </div>

        <div id="progressionRules" class="progression-rules">
    `;

    // Récupère les règles de progression
    const rules = obj ? (obj.progressionRules || []) : (preset ? preset.progressionRules || [] : []);

    if (rules.length > 0) {
      rules.forEach((rule, i) => {
        html += renderProgressionRuleRow(rule, i);
      });
    } else {
      html += `<p class="text-muted text-sm" id="noRulesMsg">Aucune progression configurée. L'exercice restera identique.</p>`;
    }

    html += `
        </div>
        <button type="button" class="btn btn-sm btn-outline" style="margin-top:8px"
                onclick="App.addProgressionRule()">
          + Ajouter un palier
        </button>
        <p class="text-muted text-sm" style="margin-top:6px">
          Chaque palier modifie les paramètres après X jours. Seuls les champs remplis sont modifiés.
        </p>
    `;

    // Affiche les conseils si disponibles
    if (tips.length > 0) {
      html += `
        <div class="tips-box" style="margin-top:16px">
          <h3 style="font-size:0.9rem;color:var(--primary-light);margin-bottom:8px">Conseils</h3>
          <ul style="list-style:none;padding:0">
      `;
      tips.forEach(tip => {
        html += `<li style="font-size:0.85rem;color:var(--text-muted);padding:4px 0">• ${escHtml(tip)}</li>`;
      });
      html += `</ul></div>`;
    }

    html += `
        <div class="form-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="App.deleteObjective('${obj.id}')">Supprimer</button>` : ''}
          <button type="submit" class="btn btn-primary btn-block">
            ${isEdit ? 'Enregistrer' : 'Créer l\'exercice'}
          </button>
        </div>
      </form>
    `;

    render(html);
  }

  /**
   * Génère le HTML d'une ligne de règle de progression
   */
  function renderProgressionRuleRow(rule, index) {
    const afterDays = rule.afterDays || '';
    const holdSec = rule.holdSeconds !== undefined ? rule.holdSeconds : '';
    const releaseSec = rule.releaseSeconds !== undefined ? rule.releaseSeconds : '';
    const reps = rule.repsPerSet !== undefined ? rule.repsPerSet : '';
    const sets = rule.setsPerDay !== undefined ? rule.setsPerDay : '';
    const note = rule.note || '';

    return `
      <div class="progression-rule" data-rule-index="${index}">
        <div class="progression-rule-header">
          <span class="progression-rule-title">Palier ${index + 1}</span>
          <button type="button" class="btn-icon btn-icon-sm text-danger"
                  onclick="App.removeProgressionRule(${index})" aria-label="Supprimer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="form-group">
          <label>Après combien de jours</label>
          <input type="number" class="input" name="rule_afterDays_${index}" value="${afterDays}"
                 min="1" max="365" required placeholder="Ex: 14">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contraction (sec) <span class="text-muted text-sm">opt.</span></label>
            <input type="number" class="input" name="rule_hold_${index}" value="${holdSec}"
                   min="1" max="60" placeholder="—">
          </div>
          <div class="form-group">
            <label>Relâchement (sec) <span class="text-muted text-sm">opt.</span></label>
            <input type="number" class="input" name="rule_release_${index}" value="${releaseSec}"
                   min="1" max="60" placeholder="—">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Reps/série <span class="text-muted text-sm">opt.</span></label>
            <input type="number" class="input" name="rule_reps_${index}" value="${reps}"
                   min="1" max="100" placeholder="—">
          </div>
          <div class="form-group">
            <label>Séries/jour <span class="text-muted text-sm">opt.</span></label>
            <input type="number" class="input" name="rule_sets_${index}" value="${sets}"
                   min="1" max="20" placeholder="—">
          </div>
        </div>
        <div class="form-group">
          <label>Note <span class="text-muted text-sm">opt.</span></label>
          <input type="text" class="input" name="rule_note_${index}" value="${escHtml(note)}"
                 placeholder="Ex: Essayez debout">
        </div>
      </div>
    `;
  }

  /**
   * Écran de session d'exercice minuté (guidé)
   */
  function renderTimedSession(objectiveId) {
    const obj = Store.getObjective(objectiveId);
    if (!obj) {
      renderHome();
      return;
    }

    const session = Objectives.getOrCreateTodaySession(objectiveId);
    const params = Objectives.getTimedParams(obj);
    const nextIdx = Objectives.getNextSetIndex(session);
    const allDone = nextIdx === -1;
    const setsDone = session.sets.filter(s => s.actual !== null).length;
    const setsTotal = session.sets.length;
    const percent = Math.min(100, Math.round((setsDone / setsTotal) * 100));

    let html = `
      <header class="header">
        <button class="btn-icon" onclick="App.navigate('home')" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1>${escHtml(obj.name)}</h1>
        <button class="btn-icon" onclick="App.navigate('editObjective', '${obj.id}')" aria-label="Modifier">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
      </header>
    `;

    // Bandeau défi si applicable
    const challenge = Store.getChallengeInfo(objectiveId);
    if (challenge) {
      html += `
        <div class="challenge-banner">
          <div class="challenge-banner-title">Défi : Jour ${challenge.currentDay}/${challenge.totalDays}</div>
          <div class="challenge-banner-stats">
            <span class="challenge-stat">${challenge.daysCompleted} <small>réussis</small></span>
            ${challenge.daysMissed > 0 ? `<span class="challenge-stat text-warning">${challenge.daysMissed} <small>manqués</small></span>` : ''}
            <span class="challenge-stat">${challenge.daysRemaining} <small>restants</small></span>
            <span class="challenge-stat">${challenge.completionRate}%</span>
          </div>
          <div class="progress-bar progress-bar-sm">
            <div class="progress-fill fill-info" style="width: ${Math.round((challenge.currentDay / challenge.totalDays) * 100)}%"></div>
          </div>
        </div>
      `;
    }

    // Note de progression si applicable
    if (params.progressionNote) {
      html += `
        <div class="alert alert-warning" style="margin-bottom:16px">
          Progression : ${escHtml(params.progressionNote)}
        </div>
      `;
    }

    // Progression globale (séries)
    html += `
      <div class="session-progress">
        <div class="session-progress-text">
          <span class="big-number">${setsDone}</span>
          <span class="big-sep">/</span>
          <span class="big-target">${setsTotal} séries</span>
        </div>
        <div class="progress-bar progress-bar-lg">
          <div class="progress-fill ${session.completed ? 'fill-success' : ''}"
               style="width: ${percent}%"></div>
        </div>
        <div class="session-percent">${percent}%</div>
      </div>
    `;

    // Zone timer (pour pause entre séries)
    html += `<div id="timerZone" class="timer-zone"></div>`;

    // Zone de l'exercice minuté
    html += `<div id="timedExerciseZone">`;

    if (allDone || session.completed) {
      html += `
        <div class="session-complete">
          <div class="complete-icon">&#10003;</div>
          <h2>Objectif du jour terminé !</h2>
          <p>${setsDone} séries de ${escHtml(obj.name).toLowerCase()} aujourd'hui</p>
        </div>
      `;
    } else {
      // Série en cours - affiche l'écran d'exercice
      html += `
        <div class="timed-exercise-card">
          <div class="set-info">Série ${nextIdx + 1}/${setsTotal}</div>
          <div class="timed-rep-info" id="timedRepInfo">Répétition 0/${params.repsPerSet}</div>

          <div class="timed-circle-container" id="timedCircle">
            <div class="timer-circle timed-circle">
              <svg viewBox="0 0 100 100" class="timer-svg">
                <circle cx="50" cy="50" r="45" class="timer-bg"/>
                <circle cx="50" cy="50" r="45" class="timer-progress timed-progress-ring" id="timedProgressRing"
                        style="stroke-dashoffset: 283"/>
              </svg>
              <div class="timed-circle-text" id="timedCircleText">
                <div class="timed-phase" id="timedPhase">PRÊT</div>
                <div class="timed-countdown" id="timedCountdown">--</div>
              </div>
            </div>
          </div>

          <div class="timed-set-progress">
            <div class="progress-bar">
              <div class="progress-fill" id="timedSetProgress" style="width:0%"></div>
            </div>
          </div>

          <div class="timed-actions" id="timedActions">
            <button class="btn btn-lg btn-success btn-block" id="timedStartBtn"
                    onclick="App.startTimedSet('${objectiveId}')">
              Démarrer la série
            </button>
            <div id="timedRunningActions" style="display:none">
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="btn btn-warning" onclick="App.pauseTimedExercise()">Pause</button>
                <button class="btn btn-danger-light" onclick="App.skipTimedSet()">Passer cette série</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    html += `</div>`;

    // Historique des séries faites
    const completedSets = session.sets.filter(s => s.actual !== null);
    if (completedSets.length > 0) {
      html += `
        <div class="session-history">
          <h3>Séries complétées</h3>
          <div class="sets-list">
      `;
      session.sets.forEach((s, i) => {
        if (s.actual !== null) {
          html += `
            <div class="set-done">
              <span class="set-done-num">S${i + 1}</span>
              <span class="set-done-val">${s.actual} reps</span>
              <span class="set-done-time">${s.completedAt}</span>
            </div>
          `;
        }
      });
      html += `</div></div>`;
    }

    // Conseils (section repliable)
    if (obj.tips && obj.tips.length > 0) {
      html += `
        <details class="tips-details" style="margin-top:16px">
          <summary class="tips-summary">Conseils</summary>
          <ul class="tips-list">
      `;
      obj.tips.forEach(tip => {
        html += `<li>${escHtml(tip)}</li>`;
      });
      html += `</ul></details>`;
    }

    // Bouton stats
    html += `
      <div class="section" style="margin-top:1rem">
        <button class="btn btn-block btn-outline" onclick="App.navigate('statsObjective', '${obj.id}')">
          Voir les statistiques
        </button>
      </div>
    `;

    render(html);

    // Restaure le timer de pause s'il tournait en arrière-plan
    if (Timer.isRunning()) {
      Timer.restore(
        (data) => updateTimerDisplay(data),
        () => {
          updateTimerDisplay(null);
          renderTimedSession(objectiveId);
        }
      );
    }
  }

  /**
   * Met à jour l'affichage de l'exercice minuté sans re-render complet
   * Appelé par le tick de l'exercice depuis app.js
   */
  function updateTimedExerciseDisplay(state) {
    const phaseEl = document.getElementById('timedPhase');
    const countdownEl = document.getElementById('timedCountdown');
    const ringEl = document.getElementById('timedProgressRing');
    const repInfoEl = document.getElementById('timedRepInfo');
    const setProgressEl = document.getElementById('timedSetProgress');
    const circleContainer = document.getElementById('timedCircle');

    if (!phaseEl || !countdownEl) return;

    // Met à jour le texte de phase
    if (state.phase === 'hold') {
      phaseEl.textContent = 'CONTRACTEZ';
      phaseEl.className = 'timed-phase timed-phase-hold';
      if (circleContainer) circleContainer.className = 'timed-circle-container timed-hold';
    } else if (state.phase === 'release') {
      phaseEl.textContent = 'RELÂCHEZ';
      phaseEl.className = 'timed-phase timed-phase-release';
      if (circleContainer) circleContainer.className = 'timed-circle-container timed-release';
    } else if (state.phase === 'done') {
      phaseEl.textContent = 'TERMINÉ';
      phaseEl.className = 'timed-phase timed-phase-done';
      countdownEl.textContent = '';
      if (circleContainer) circleContainer.className = 'timed-circle-container timed-done';
      return;
    }

    // Countdown avec décimale
    countdownEl.textContent = (state.countdown / 10).toFixed(1) + 's';

    // Anneau de progression pour la phase en cours
    const phaseDuration = state.phase === 'hold' ? state.holdTotal : state.releaseTotal;
    const phaseProgress = phaseDuration > 0 ? (1 - state.countdown / phaseDuration) : 0;
    if (ringEl) {
      const offset = 283 - (283 * phaseProgress);
      ringEl.style.strokeDashoffset = offset;
      ringEl.style.transition = 'none';
    }

    // Répétition en cours
    if (repInfoEl) {
      repInfoEl.textContent = `Répétition ${state.rep + 1}/${state.totalReps}`;
    }

    // Barre de progression de la série
    if (setProgressEl) {
      const totalPhases = state.totalReps * 2; // hold + release pour chaque rep
      const donePhases = state.rep * 2 + (state.phase === 'release' ? 1 : 0);
      const setPercent = Math.round((donePhases / totalPhases) * 100);
      setProgressEl.style.width = setPercent + '%';
    }
  }

  /**
   * Échappe le HTML pour éviter les injections
   */
  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    render,
    renderHome,
    renderObjectiveForm,
    updatePreview,
    renderSession,
    updateTimerDisplay,
    renderPresetSelection,
    renderTimedObjectiveForm,
    renderProgressionRuleRow,
    renderTimedSession,
    updateTimedExerciseDisplay,
    renderCounterForm,
    renderCounterView,
    renderStatsOverview,
    renderStatsObjective,
    renderSettings,
    escHtml
  };
})();
