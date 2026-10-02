import { useState } from "react";
import { recipeService } from "@/services";
import { PasswordDialog } from "./PasswordDialog";

/**
 * Gates write actions behind the admin password.
 * `requireUnlock(action)` runs the action right away when a password is
 * remembered; otherwise it shows the password dialog (render `dialog`) and
 * runs the action once the password is accepted.
 */
export function useUnlockGate() {
  const [unlocked, setUnlocked] = useState(() => recipeService.isUnlocked());
  const [pending, setPending] = useState<(() => void) | null>(null);

  function requireUnlock(action: () => void) {
    if (recipeService.isUnlocked()) action();
    else setPending(() => action);
  }

  function lock() {
    recipeService.lock();
    setUnlocked(false);
  }

  const dialog = pending ? (
    <PasswordDialog
      onUnlocked={() => {
        setPending(null);
        setUnlocked(true);
        pending();
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return { unlocked, requireUnlock, lock, dialog };
}
