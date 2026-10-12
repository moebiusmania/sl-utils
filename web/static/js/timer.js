const TIMER_STORAGE_KEY = "sl-utils-timer";

function getStoredTimer() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return { minutes: 5, seconds: 0 };
    const data = JSON.parse(raw);
    const m = Number(data?.minutes);
    const s = Number(data?.seconds);
    if (
      Number.isInteger(m) &&
      Number.isInteger(s) &&
      m >= 0 &&
      m <= 99 &&
      s >= 0 &&
      s <= 59
    ) {
      return { minutes: m, seconds: s };
    }
  } catch (_) {
    // Storage unavailable or invalid data: fall back to the default
  }
  return { minutes: 5, seconds: 0 };
}

function saveTimer(minutes, seconds) {
  try {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({ minutes, seconds }),
    );
  } catch (_) {
    // Storage unavailable: the timer just won't be remembered
  }
}

function playAlarm() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {
    // Audio unavailable: skip the alarm sound
  }
}

document.addEventListener("alpine:init", () => {
  Alpine.data("countdownTimer", () => ({
    minutes: 5,
    seconds: 0,
    remaining: null,
    isRunning: false,
    isFlashing: false,
    interval: null,
    flashTimeout: null,

    init() {
      const stored = getStoredTimer();
      this.minutes = stored.minutes;
      this.seconds = stored.seconds;
    },

    destroy() {
      clearInterval(this.interval);
      clearTimeout(this.flashTimeout);
    },

    get totalConfigured() {
      return this.minutes * 60 + this.seconds;
    },
    get isConfigured() {
      return this.totalConfigured > 0;
    },
    get displaySeconds() {
      return this.remaining !== null ? this.remaining : this.totalConfigured;
    },
    get displayMinutes() {
      return Math.floor(this.displaySeconds / 60);
    },
    get displaySecs() {
      return this.displaySeconds % 60;
    },

    pad(n) {
      return n.toString().padStart(2, "0");
    },

    start() {
      if (!this.isConfigured) return;
      if (this.remaining === null || this.remaining === 0) {
        // Like the original effect cleanup: restarting cancels the end of
        // the flash, which then lasts until reset.
        if (this.remaining === 0) clearTimeout(this.flashTimeout);
        this.remaining = this.totalConfigured;
      }
      this.isRunning = true;
      clearInterval(this.interval);
      this.interval = setInterval(() => this.tick(), 1000);
    },

    tick() {
      if (this.remaining === null || this.remaining <= 1) {
        this.stop();
        this.remaining = 0;
        this.finished();
        return;
      }
      this.remaining -= 1;
    },

    stop() {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
    },

    finished() {
      playAlarm();
      this.isFlashing = true;
      clearTimeout(this.flashTimeout);
      this.flashTimeout = setTimeout(() => (this.isFlashing = false), 2000);
    },

    pause() {
      this.stop();
    },

    reset() {
      this.stop();
      this.remaining = null;
      this.isFlashing = false;
      clearTimeout(this.flashTimeout);
    },

    setMinutes(e) {
      const v = parseInt(e.target.value, 10);
      if (!this.isRunning && this.remaining === null) {
        const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v));
        this.minutes = next;
        saveTimer(next, this.seconds);
      }
    },

    setSeconds(e) {
      const v = parseInt(e.target.value, 10);
      if (!this.isRunning && this.remaining === null) {
        const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(59, v));
        this.seconds = next;
        saveTimer(this.minutes, next);
      }
    },
  }));
});
