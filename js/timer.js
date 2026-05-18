/**
 * timer.js - Timer de pause avec notifications
 * Gère le compte à rebours, les notifications et les vibrations
 */

const Timer = (() => {
  let intervalId = null;
  let remainingSeconds = 0;
  let totalSeconds = 0;
  let isPaused = false;
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
    stop(); // Arrête tout timer en cours

    totalSeconds = Math.round(minutes * 60);
    remainingSeconds = totalSeconds;
    isPaused = false;
    onTickCallback = onTick;
    onCompleteCallback = onComplete;

    // Premier tick immédiat
    tick();

    intervalId = setInterval(() => {
      if (!isPaused) {
        remainingSeconds--;
        tick();

        if (remainingSeconds <= 0) {
          complete();
        }
      }
    }, 1000);
  }

  /**
   * Tick interne - notifie le callback
   */
  function tick() {
    if (onTickCallback) {
      onTickCallback({
        remaining: remainingSeconds,
        total: totalSeconds,
        paused: isPaused
      });
    }
  }

  /**
   * Timer terminé - notification + vibration + son
   */
  function complete() {
    stop();

    // Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Kountz - Pause terminée !', {
          body: 'C\'est l\'heure de la prochaine série !',
          icon: 'icons/icon-192.svg',
          tag: 'kountz-timer',
          requireInteraction: true
        });
      } catch (e) {
        // Les notifications peuvent échouer en local
        console.log('Notification non disponible:', e);
      }
    }

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
   * Génère un beep via Web Audio API
   */
  function playBeep() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Premier beep
      beepTone(audioCtx, 880, 0, 0.15);
      // Deuxième beep
      beepTone(audioCtx, 880, 0.2, 0.15);
      // Troisième beep (plus haut)
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
    isPaused = !isPaused;
    tick();
    return isPaused;
  }

  /**
   * Arrête le timer
   */
  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    remainingSeconds = 0;
    isPaused = false;
  }

  /**
   * Vérifie si le timer est actif
   */
  function isRunning() {
    return intervalId !== null;
  }

  /**
   * Formate les secondes en MM:SS
   */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  return {
    requestPermission,
    start,
    stop,
    togglePause,
    isRunning,
    formatTime
  };
})();
