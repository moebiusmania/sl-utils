import { useEffect, useRef, useState } from "preact/hooks";

const TIMER_STORAGE_KEY = "sl-utils-timer";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getStoredTimer(): { minutes: number; seconds: number } {
  if (typeof window === "undefined") return { minutes: 5, seconds: 0 };
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

export default function CountdownTimer() {
  const [minutes, setMinutes] = useState(() => getStoredTimer().minutes);
  const [seconds, setSeconds] = useState(() => getStoredTimer().seconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const wasRunningRef = useRef(false);

  const totalConfigured = minutes * 60 + seconds;
  const isConfigured = totalConfigured > 0;

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          wasRunningRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      wasRunningRef.current
    ) {
      wasRunningRef.current = false;
      playAlarm();
      setIsFlashing(true);
      const t = setTimeout(() => setIsFlashing(false), 2000);
      return () => clearTimeout(t);
    }
  }, [remainingSeconds]);

  const displaySeconds = remainingSeconds !== null
    ? remainingSeconds
    : totalConfigured;
  const displayMinutes = Math.floor(displaySeconds / 60);
  const displaySecs = displaySeconds % 60;

  const handleStart = () => {
    if (!isConfigured) return;
    if (remainingSeconds === null || remainingSeconds === 0) {
      setRemainingSeconds(totalConfigured);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(null);
    setIsFlashing(false);
  };

  const handleMinutesChange = (e: Event) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isRunning && remainingSeconds === null) {
      const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v));
      setMinutes(next);
      saveTimer(next, seconds);
    }
  };

  const handleSecondsChange = (e: Event) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isRunning && remainingSeconds === null) {
      const next = Number.isNaN(v) ? 0 : Math.max(0, Math.min(59, v));
      setSeconds(next);
      saveTimer(minutes, next);
    }
  };

  return (
    <>
      <div
        class={`timer-display-wrapper${
          isFlashing ? " timer-display-wrapper--flash" : ""
        }`}
      >
        <div class="timer-display" aria-live="polite">
          <span class="timer-value">{pad(displayMinutes)}</span>
          <span class="timer-separator">:</span>
          <span class="timer-value">{pad(displaySecs)}</span>
        </div>
        <p class="timer-display-label">minutes : seconds</p>
      </div>

      <div class="timer-controls">
        {remainingSeconds === null
          ? (
            <div class="timer-inputs">
              <div class="form-group timer-input-group">
                <label class="form-label" htmlFor="timer-minutes">
                  Minutes
                </label>
                <input
                  id="timer-minutes"
                  type="number"
                  class="input timer-input"
                  min={0}
                  max={99}
                  value={minutes}
                  onInput={handleMinutesChange}
                />
              </div>
              <div class="form-group timer-input-group">
                <label class="form-label" htmlFor="timer-seconds">
                  Seconds
                </label>
                <input
                  id="timer-seconds"
                  type="number"
                  class="input timer-input"
                  min={0}
                  max={59}
                  value={seconds}
                  onInput={handleSecondsChange}
                />
              </div>
            </div>
          )
          : null}

        <div class="timer-buttons">
          {!isRunning
            ? (
              <button
                type="button"
                class="btn btn-lg btn-primary"
                onClick={handleStart}
                disabled={!isConfigured}
              >
                Start
              </button>
            )
            : (
              <button
                type="button"
                class="btn btn-lg btn-secondary"
                onClick={handlePause}
              >
                Pause
              </button>
            )}
          {(remainingSeconds !== null || isRunning) && (
            <button
              type="button"
              class="btn btn-lg btn-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </>
  );
}
