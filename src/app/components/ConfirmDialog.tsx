import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface ConfirmDialogProps {
  /** Controls visibility. */
  open: boolean;
  /** Called when the user cancels or dismisses. */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading. */
  title: string;
  /** Body copy under the title. */
  description: string;
  /** Label for the confirmation button. Defaults to "Eliminar". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancelar". */
  cancelLabel?: string;
  /** Called when the user confirms the action. Can be async. */
  onConfirm: () => void | Promise<void>;
  /**
   * If true, disables the confirm button and shows an in-progress state.
   * Useful while the destructive action is running.
   */
  loading?: boolean;
  /** Tone of the confirm button. Defaults to "destructive". */
  variant?: 'destructive' | 'default';
}

/**
 * Accessible confirmation dialog backed by Radix AlertDialog.
 * Replaces `window.confirm()` so destructive actions are keyboard-navigable,
 * screen-reader friendly, and consistently styled.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  loading = false,
  variant = 'destructive',
}: ConfirmDialogProps) {
  const handleConfirm = async (event: React.MouseEvent) => {
    // Prevent the primitive from auto-closing until the async action resolves.
    event.preventDefault();
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error is surfaced by the caller (toast, form state, etc.).
      // Keep the dialog open so the user can retry or cancel.
    }
  };

  const confirmClass =
    variant === 'destructive'
      ? 'bg-spk-red text-white hover:bg-spk-red-dark focus:ring-[#E31E24]'
      : undefined;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={confirmClass}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
