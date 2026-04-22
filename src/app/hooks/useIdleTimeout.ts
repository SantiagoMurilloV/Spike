import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Tracks user activity and fires two callbacks as inactivity grows:
 *   · `onWarn` when the user has been idle for `warnMs` (default: 1 min
 *     before the final logout) — UI shows "your session will end" modal.
 *   · `onTimeout` when the user has been idle for `timeoutMs` — this is
 *     where the caller should actually log the user out.
 *
 * "Activity" is any of: mousemove, mousedown, keydown, touchstart, scroll.
 * A shared throttle guards against resetting the timer every frame when
 * the user is dragging the mouse.
 *
 * Intentionally scoped by the caller: drop this hook into AdminLayout so
 * it only runs on /admin/*, not across the whole app. Judges use the
 * RefereeScore console (long static periods during rallies are normal)
 * and must NEVER be force-logged-out mid-match.
 */
interface UseIdleTimeoutOptions {
  /** Total idle time before onTimeout fires, in ms. */
  timeoutMs: number;
  /** How long before onTimeout to fire onWarn, in ms. */
  warnMs: number;
  /** Fires when we enter the warning window. */
  onWarn: () => void;
  /** Fires when we hit the timeout. */
  onTimeout: () => void;
  /**
   * If false the hook is fully disarmed — no listeners, no timers.
   * Useful so we can render the hook unconditionally but only enable it
   * for admins.
   */
  enabled?: boolean;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

// Cap how often "activity" can reset the timer — a drag can fire
// hundreds of mousemove events per second.
const ACTIVITY_THROTTLE_MS = 1000;

export function useIdleTimeout({
  timeoutMs,
  warnMs,
  onWarn,
  onTimeout,
  enabled = true,
}: UseIdleTimeoutOptions): {
  /** Call to manually reset the timer (e.g. after user clicks "Continuar" in the warning). */
  reset: () => void;
} {
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef<number>(Date.now());
  // Keep the callbacks in refs so the effect can stay stable and the
  // event listeners don't churn when the caller re-renders.
  const onWarnRef = useRef(onWarn);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onWarnRef.current = onWarn;
    onTimeoutRef.current = onTimeout;
  }, [onWarn, onTimeout]);

  const clearTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    warnTimer.current = null;
    timeoutTimer.current = null;
  }, []);

  const armTimers = useCallback(() => {
    clearTimers();
    const warnAt = Math.max(0, timeoutMs - warnMs);
    warnTimer.current = setTimeout(() => {
      onWarnRef.current();
    }, warnAt);
    timeoutTimer.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [clearTimers, timeoutMs, warnMs]);

  const reset = useCallback(() => {
    lastActivity.current = Date.now();
    if (enabled) armTimers();
  }, [enabled, armTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }
    armTimers();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity.current < ACTIVITY_THROTTLE_MS) return;
      lastActivity.current = now;
      armTimers();
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    // If the tab was hidden and comes back, re-check: treat returning as
    // "active" so the modal doesn't pop the instant focus comes back.
    const onVisibility = () => {
      if (!document.hidden) onActivity();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimers();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, armTimers, clearTimers]);

  return { reset };
}

/**
 * Tracks whether the user is "online" (has been active within the last N
 * seconds). Used to drive the little green dot in the admin sidebar —
 * goes dim when the user is idle / tab is hidden so there's a visible
 * cue that the dashboard isn't actively being watched.
 */
export function useActivePresence(activeWithinMs = 60_000): boolean {
  const [active, setActive] = useState(!document.hidden);
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActivity.current = Date.now();
      if (!active) setActive(true);
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActive, { passive: true });
    }

    const tick = setInterval(() => {
      const idle =
        document.hidden ||
        Date.now() - lastActivity.current > activeWithinMs;
      setActive(!idle);
    }, 5_000);

    const onVisibility = () => {
      if (!document.hidden) markActive();
      else setActive(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActive);
      }
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(tick);
    };
  }, [activeWithinMs, active]);

  return active;
}
