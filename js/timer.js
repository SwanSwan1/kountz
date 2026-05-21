/**
 * timer.js - Timer de pause avec notifications
 * Utilise un timestamp absolu pour survivre à la mise en arrière-plan
 */

const Timer = (() => {
  let intervalId = null;
  let endTime = null;       // Timestamp absolu de fin (ms)
  let totalSeconds = 0;
  let isPaused = false;
  let pausedRemaining = 0;  // Secondes restantes au moment de la pause
  let onTickCallback = null;
  let onCompleteCallback = null;
  let audioCtx = null;

  /**
   * Demande la permission pour les notifications
   */
  async function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  /**
   * Démarre un timer de pause
   * @param {number} minutes - Durée en minutes
   * @param {Function} onTick - Appelé chaque seconde avec { remaining, total, paused }
   * @param {Function} onComplete - Appelé quand le timer est terminé
   */
  function start(minutes, onTick, onComplete) {
    stop();

    totalSeconds = Math.round(minutes * 60);
    endTime = Date.now() + totalSeconds * 1000;
    isPaused = false;
    pausedRemaining = 0;
    onTickCallback = onTick;
    onCompleteCallback = onComplete;

    // Sauvegarde l'état dans localStorage pour persistance
    saveState();

    // Premier tick immédiat
    tick();

    // Interval pour le tick visuel (chaque seconde)
    intervalId = setInterval(tick, 1000);

    // Planifie la notification via le Service Worker si disponible
    scheduleNotification(totalSeconds);
  }

  /**
   * Tick interne - calcule le temps restant depuis le timestamp absolu
   */
  function tick() {
    if (isPaused) {
      notifyTick(pausedRemaining);
      return;
    }

    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

    if (remaining <= 0) {
      complete();
      return;
    }

    notifyTick(remaining);
  }

  /**
   * Notifie le callback avec l'état actuel
   */
  function notifyTick(remaining) {
    if (onTickCallback) {
      onTickCallback({
        remaining,
        total: totalSeconds,
        paused: isPaused
      });
    }
  }

  /**
   * Timer terminé - notification + vibration + son
   */
  function complete() {
    const wasRunning = intervalId !== null || endTime !== null;
    clearTimer();
    clearState();

    if (!wasRunning) return;

    // Notification
    sendNotification();

    // Vibration (3 vibrations courtes)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Son beep via Web Audio API
    playBeep();

    if (onCompleteCallback) {
      onCompleteCallback();
    }
  }

  /**
   * Envoie une notification via le Service Worker (fonctionne en arrière-plan sur Android)
   */
  function sendNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Privilégie le SW pour les notifications (plus fiable sur mobile)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification('Kountz - Pause terminée !', {
            body: 'C\'est l\'heure de la prochaine série !',
            icon: './icons/icon-192.svg',
            tag: 'kountz-timer',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
          });
        }).catch(() => {
          // Fallback notification classique
          try { new Notification('Kountz - Pause terminée !', { body: 'Prochaine série !' }); } catch (e) {}
        });
      } else {
        try { new Notification('Kountz - Pause terminée !', { body: 'Prochaine série !' }); } catch (e) {}
      }
    }
  }

  /**
   * Planifie une notification via le Service Worker (pour l'arrière-plan)
   */
  function scheduleNotification(delaySeconds) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delay: delaySeconds * 1000,
        title: 'Kountz - Pause terminée !',
        body: 'C\'est l\'heure de la prochaine série !'
      });
    }
  }

  /**
   * Annule la notification planifiée dans le Service Worker
   */
  function cancelScheduledNotification() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_NOTIFICATION'
      });
    }
  }

  /**
   * Sauvegarde l'état du timer dans localStorage
   */
  function saveState() {
    const state = {
      endTime,
      totalSeconds,
      isPaused,
      pausedRemaining
    };
    localStorage.setItem('kountz_timer', JSON.stringify(state));
  }

  /**
   * Supprime l'état sauvegardé
   */
  function clearState() {
    localStorage.removeItem('kountz_timer');
  }

  /**
   * Restaure le timer depuis localStorage (appelé au retour sur la page)
   */
  function restore(onTick, onComplete) {
    const saved = localStorage.getItem('kountz_timer');
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);
      endTime = state.endTime;
      totalSeconds = state.totalSeconds;
      isPaused = state.isPaused;
      pausedRemaining = state.pausedRemaining;
      onTickCallback = onTick;
      onCompleteCallback = onComplete;

      if (isPaused) {
        // Timer en pause - affiche l'état figé
        tick();
        intervalId = setInterval(tick, 1000);
        return true;
      }

      // Vérifie si le timer a expiré pendant l'absence
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        // Timer expiré - déclenche la complétion
        complete();
        return true;
      }

      // Timer toujours en cours - reprend le tick
      tick();
      intervalId = setInterval(tick, 1000);
      return true;
    } catch (e) {
      clearState();
      return false;
    }
  }

  /**
   * Génère un beep via Web Audio API
   */
  function playBeep() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      beepTone(audioCtx, 880, 0, 0.15);
      beepTone(audioCtx, 880, 0.2, 0.15);
      beepTone(audioCtx, 1100, 0.4, 0.25);
    } catch (e) {
      console.log('Web Audio non disponible:', e);
    }
  }

  /**
   * Joue une tonalité simple
   */
  function beepTone(ctx, frequency, startTime, duration) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01, ctx.currentTime + startTime + duration
    );

    oscillator.start(ctx.currentTime + startTime);
    oscillator.stop(ctx.currentTime + startTime + duration);
  }

  /**
   * Met en pause / reprend le timer
   */
  function togglePause() {
    if (isPaused) {
      // Reprend - recalcule endTime depuis le temps restant
      endTime = Date.now() + pausedRemaining * 1000;
      isPaused = false;
      scheduleNotification(pausedRemaining);
    } else {
      // Pause - capture le temps restant
      pausedRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      isPaused = true;
      cancelScheduledNotification();
    }
    saveState();
    tick();
    return isPaused;
  }

  /**
   * Nettoie l'interval sans toucher à l'état
   */
  function clearTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    endTime = null;
    isPaused = false;
    pausedRemaining = 0;
    cancelScheduledNotification();
  }

  /**
   * Arrête le timer complètement
   */
  function stop() {
    clearTimer();
    clearState();
  }

  /**
   * Vérifie si le timer est actif (en cours ou en pause)
   */
  function isRunning() {
    // Vérifie aussi localStorage au cas où le timer tourne en arrière-plan
    if (intervalId !== null) return true;
    const saved = localStorage.getItem('kountz_timer');
    return saved !== null;
  }

  /**
   * Formate les secondes en MM:SS
   */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // Écoute le retour au premier plan pour recalculer le timer
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && endTime && !isPaused) {
      // Page redevient visible - recalcule immédiatement
      tick();
    }
  });

  return {
    requestPermission,
    start,
    stop,
    restore,
    togglePause,
    isRunning,
    formatTime
  };
})();
