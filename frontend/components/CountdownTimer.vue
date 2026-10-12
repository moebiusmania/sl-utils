<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const TIMER_STORAGE_KEY = "sl-utils-timer";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getStoredTimer(): { minutes: number; seconds: number } {
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

function saveTimer(minutes: number, seconds: number) {
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

// The server renders the default; the stored timer is applied on mount
const minutes = ref(5);
const seconds = ref(0);
const remainingSeconds = ref<number | null>(null);
const isRunning = ref(false);
const isFlashing = ref(false);
let wasRunning = false;

onMounted(() => {
  const stored = getStoredTimer();
  minutes.value = stored.minutes;
  seconds.value = stored.seconds;
});

const totalConfigured = computed(() => minutes.value * 60 + seconds.value);
const isConfigured = computed(() => totalConfigured.value > 0);

watch(isRunning, (running, _, onCleanup) => {
  if (!running) return;

  const interval = setInterval(() => {
    const prev = remainingSeconds.value;
    if (prev === null || prev <= 1) {
      clearInterval(interval);
      isRunning.value = false;
      wasRunning = true;
      remainingSeconds.value = 0;
      return;
    }
    remainingSeconds.value = prev - 1;
  }, 1000);

  onCleanup(() => clearInterval(interval));
});

watch(remainingSeconds, (remaining, _, onCleanup) => {
  if (remaining === 0 && wasRunning) {
    wasRunning = false;
    playAlarm();
    isFlashing.value = true;
    const t = setTimeout(() => (isFlashing.value = false), 2000);
    onCleanup(() => clearTimeout(t));
  }
});

const displaySeconds = computed(() =>
  remainingSeconds.value !== null ? remainingSeconds.value : totalConfigured.value
);
const displayMinutes = computed(() => Math.floor(displaySeconds.value / 60));
const displaySecs = computed(() => displaySeconds.value % 60);

const handleStart = () => {
  if (!isConfigured.value) return;
  if (remainingSeconds.value === null || remainingSeconds.value === 0) {
    remainingSeconds.value = totalConfigured.value;
  }
  isRunning.value = true;
};

const handlePause = () => {
  isRunning.value = false;
};

const handleReset = () => {
  isRunning.value = false;
  remainingSeconds.value = null;
  isFlashing.value = false;
};

const handleMinutesChange = (e: Event) => {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isRunning.value && remainingSeconds.value === null) {
    const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v));
    minutes.value = next;
    saveTimer(next, seconds.value);
  }
};

const handleSecondsChange = (e: Event) => {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isRunning.value && remainingSeconds.value === null) {
    const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(59, v));
    seconds.value = next;
    saveTimer(minutes.value, next);
  }
};
</script>

<template>
  <div :class="`timer-display-wrapper${isFlashing ? ' timer-display-wrapper--flash' : ''}`">
    <div class="timer-display" aria-live="polite">
      <span class="timer-value">{{ pad(displayMinutes) }}</span>
      <span class="timer-separator">:</span>
      <span class="timer-value">{{ pad(displaySecs) }}</span>
    </div>
    <p class="timer-display-label">minutes : seconds</p>
  </div>

  <div class="timer-controls">
    <div v-if="remainingSeconds === null" class="timer-inputs">
      <div class="form-group timer-input-group">
        <label class="form-label" for="timer-minutes">Minutes</label>
        <input
          id="timer-minutes"
          type="number"
          class="input timer-input"
          :min="0"
          :max="99"
          :value="minutes"
          @input="handleMinutesChange"
        />
      </div>
      <div class="form-group timer-input-group">
        <label class="form-label" for="timer-seconds">Seconds</label>
        <input
          id="timer-seconds"
          type="number"
          class="input timer-input"
          :min="0"
          :max="59"
          :value="seconds"
          @input="handleSecondsChange"
        />
      </div>
    </div>

    <div class="timer-buttons">
      <button
        v-if="!isRunning"
        type="button"
        class="btn btn-lg btn-primary"
        :disabled="!isConfigured"
        @click="handleStart"
      >
        Start
      </button>
      <button
        v-else
        type="button"
        class="btn btn-lg btn-secondary"
        @click="handlePause"
      >
        Pause
      </button>
      <button
        v-if="remainingSeconds !== null || isRunning"
        type="button"
        class="btn btn-lg btn-secondary"
        @click="handleReset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
