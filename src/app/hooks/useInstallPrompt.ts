import { useEffect, useState, useCallback } from 'react';

// Chrome / Edge / Samsung Internet all dispatch this event. iOS Safari does
// not — there we fall back to a manual instruction card.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'spk-install-dismissed-at';
// After a user dismisses the prompt we snooze it for 7 days so we don't nag.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export interface InstallPromptState {
  /** True when the browser supports install prompts and the app isn't installed yet. */
  isAvailable: boolean;
  /** iOS Safari case — no programmatic prompt, needs manual instructions. */
  isIOS: boolean;
  /** Triggers the native install prompt (Chrome et al). */
  prompt: () => Promise<void>;
  /** Permanently dismiss for the current snooze window. */
  dismiss: () => void;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // Any of these flags means the PWA is already installed.
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes navigator.standalone
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isSnoozed(): boolean {
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < SNOOZE_MS;
}

/**
 * useInstallPrompt — centralizes PWA install UX.
 *
 * Listens for `beforeinstallprompt`, tracks standalone state and user
 * dismissals. Components render their own UI (banner, card, button) and
 * call `prompt()` / `dismiss()` from this hook to drive it.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(isSnoozed());

  useEffect(() => {
    if (installed) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [installed]);

  const prompt = useCallback(async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      setDismissed(true);
    }
    setDeferredEvent(null);
  }, [deferredEvent]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const iOS = isIOSDevice();
  const isAvailable = !installed && !dismissed && (deferredEvent !== null || iOS);

  return {
    isAvailable,
    isIOS: iOS,
    prompt,
    dismiss,
  };
}
