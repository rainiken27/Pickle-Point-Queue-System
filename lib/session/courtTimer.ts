import { Court, ActiveCourt } from '@/types/court';

const TWENTY_MINUTES_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
const GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minute grace period for score entry

/**
 * Calculate court timer details from a court with active timer
 * @param court - Court object with court_timer_started_at timestamp
 * @returns ActiveCourt with calculated timer values
 */
export function calculateCourtTime(court: Court): ActiveCourt {
  if (!court.court_timer_started_at) {
    return {
      ...court,
      court_timer_remaining_minutes: null,
      court_timer_elapsed_minutes: null,
      is_timer_warning: false,
      is_timer_alert: false,
    };
  }

  const startTime = new Date(court.court_timer_started_at);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();
  const remainingMs = TWENTY_MINUTES_MS - elapsedMs;

  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  return {
    ...court,
    court_timer_elapsed_minutes: elapsedMinutes,
    court_timer_remaining_minutes: remainingMinutes,
    is_timer_warning: remainingMinutes <= 5 && remainingMinutes > 1,
    is_timer_alert: remainingMinutes <= 1 && remainingMinutes >= 0,
  };
}

/**
 * Check if court timer should show warning (< 5 min remaining)
 * @param court - ActiveCourt with timer data
 * @returns true if warning should be shown
 */
export function shouldAlertCourtTimer(court: ActiveCourt): boolean {
  return court.is_timer_warning || court.is_timer_alert;
}

/**
 * Check if court timer has expired (past 20 minutes)
 * @param court - Court object with court_timer_started_at
 * @returns true if timer has expired
 */
export function hasCourtTimerExpired(court: Court): boolean {
  if (!court.court_timer_started_at) return false;

  const startTime = new Date(court.court_timer_started_at);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();

  return elapsedMs > TWENTY_MINUTES_MS;
}

/**
 * Check if court is still within grace period after timer expiry
 * Grace period allows 2 minutes for court officer to enter scores
 * @param court - Court object with court_timer_started_at
 * @returns true if within grace period
 */
export function isInCourtGracePeriod(court: Court): boolean {
  if (!court.court_timer_started_at) return false;

  const startTime = new Date(court.court_timer_started_at);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();

  return elapsedMs > TWENTY_MINUTES_MS && elapsedMs <= (TWENTY_MINUTES_MS + GRACE_PERIOD_MS);
}

/**
 * Check if court should be auto-ended (expired + grace period passed)
 * @param court - Court object with court_timer_started_at
 * @returns true if should be auto-ended
 */
export function shouldAutoEndCourt(court: Court): boolean {
  if (!court.court_timer_started_at) return false;

  const startTime = new Date(court.court_timer_started_at);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();

  return elapsedMs > (TWENTY_MINUTES_MS + GRACE_PERIOD_MS);
}

/**
 * Get remaining time in milliseconds for court timer
 * @param court - Court object with court_timer_started_at
 * @returns Remaining milliseconds, or null if no timer
 */
export function getCourtRemainingMs(court: Court): number | null {
  if (!court.court_timer_started_at) return null;

  const startTime = new Date(court.court_timer_started_at);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();
  const remainingMs = TWENTY_MINUTES_MS - elapsedMs;

  return Math.max(0, remainingMs);
}
