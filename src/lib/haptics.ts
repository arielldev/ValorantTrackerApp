let enabled = true;

export const haptics = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  tap() {
    if (!enabled) return;
    try {
      navigator.vibrate?.(8);
    } catch {

    }
  },
  success() {
    if (!enabled) return;
    try {
      navigator.vibrate?.([10, 30, 14]);
    } catch {

    }
  },
};
