/**
 * Centralized haptic feedback system.
 * Uses navigator.vibrate with optional chaining so it silently no-ops
 * on iOS (which does not support the Vibration API).
 */
export const haptics = {
  /** Brief positive confirmation — e.g. trip created, item saved */
  success: () => navigator.vibrate?.([30]),
  /** Double pulse alert — e.g. API error, failed operation */
  error: () => navigator.vibrate?.([100, 50, 100]),
  /** Very brief tap — e.g. UI button press, navigation tap */
  impact: () => navigator.vibrate?.([15]),
  /** Medium warning pattern — e.g. delete warning, risky action */
  warning: () => navigator.vibrate?.([50, 30, 50]),
  /** Deletion confirmation rhythm — e.g. delete trip, delete flight */
  delete: () => navigator.vibrate?.([80, 40, 80, 40, 80]),
};
