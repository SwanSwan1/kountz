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
        <button class="btn btn-sm btn-primary" onclick="App.navigate('newObjective')">+ Nouveau</button>
      </div>`;

    if (objectives.length === 0) {
      html += `<div class="empty-state">
        <p>Aucun objectif actif</p>
        <p class="text-muted">Crée ton premier objectif pour commencer !</p>
      </div>`;
    } else {
      objectives.forEach(obj => {
        const session = Store.getTodaySession(obj.id);
        const done = session ? session.totalDone : 0;
        const target = obj.dailyTarget;
        const percent = Math.min(100, Math.round((done / target) * 100));
        const isComplete = session && session.completed;

        html += `
          <div class="card card-objective ${isComplete ? 'card-complete' : ''}"
               onclick="App.navigate('session', '${obj.id}')">
            <div class="card-content">
              <div class="card-title">${escHtml(obj.name)}</div>
              <div class="card-progress-text">
                <span class="progress-value">${done}</span>
                <span class="progress-sep">/</span>
                <span class="progress-target">${target}</span>
                ${isComplete ? '<span class="badge badge-success">Terminé !</span>' : ''}
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${isComplete ? 'fill-success' : ''}"
                     style="width: ${percent}%"></div>
              </div>
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

    const maxVal = Math.max(...barData.map(d => d.done), obj.dailyTarget, 1);
    barData.forEach(d => {
      const h = Math.max(4, Math.round((d.done / maxVal) * 120));
      const targetH = Math.round((obj.dailyTarget / maxVal) * 120);
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
        <h3>Notifications</h3>
        <button class="btn btn-block btn-outline" onclick="App.requestNotifications()">
          Autoriser les notifications
        </button>
        <p class="text-muted" style="margin-top:0.5rem">
          Statut : ${typeof Notification !== 'undefined' ? Notification.permission : 'non supporté'}
        </p>
      </section>

      <section class="section text-center text-muted" style="margin-top:2rem">
        <p>Kountz v1.0</p>
        <p>PWA de comptage personnel</p>
      </section>
    `;

    render(html);
  }

  /**
   * Échappe le HTML pour éviter les injections
   */
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    render,
    renderHome,
    renderObjectiveForm,
    updatePreview,
    renderSession,
    updateTimerDisplay,
    renderCounterForm,
    renderCounterView,
    renderStatsOverview,
    renderStatsObjective,
    renderSettings,
    escHtml
  };
})();
