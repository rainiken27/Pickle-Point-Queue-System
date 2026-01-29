import { Session, ActiveSession } from '@/types';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 25 * 60 * 1000;

export function calculateSessionTime(session: Session, unlimitedTime = false): ActiveSession {
  const startTime = new Date(session.start_time);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();

  // For unlimited time, set remaining to a large value and no warnings
  if (unlimitedTime) {
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    return {
      ...session,
      elapsed_minutes: elapsedMinutes,
      remaining_minutes: Infinity,
      is_time_warning: false,
      is_urgent: false,
    };
  }

  let remainingMs: number;
  
  // If session has an end_time (extended session), use that
  if (session.end_time) {
    const endTime = new Date(session.end_time);
    remainingMs = endTime.getTime() - now.getTime();
  } else {
    // Default calculation: 5 hours from start time
    remainingMs = FIVE_HOURS_MS - elapsedMs;
  }
  
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  return {
    ...session,
    elapsed_minutes: elapsedMinutes,
    remaining_minutes: remainingMinutes,
    is_time_warning: remainingMinutes <= 30 && remainingMinutes > 5,
    is_urgent: remainingMinutes <= 5,
  };
}

export function shouldShowSoftWarning(session: ActiveSession): boolean {
  // No warnings for unlimited time
  if (session.remaining_minutes === Infinity) return false;
  return session.remaining_minutes <= 30 && session.remaining_minutes > 5;
}

export function shouldAlertCourtOfficer(session: ActiveSession): boolean {
  // No alerts for unlimited time
  if (session.remaining_minutes === Infinity) return false;
  return session.remaining_minutes <= 5;
}

export function canStartNewGame(session: ActiveSession): boolean {
  // Can always start if unlimited time
  if (session.remaining_minutes === Infinity) return true;
  // Can start if more than 5 minutes remaining
  return session.remaining_minutes > 5;
}

export function isInGracePeriod(session: ActiveSession): boolean {
  // Never in grace period if unlimited time
  if (session.remaining_minutes === Infinity) return false;
  
  // In grace period if time expired but within 25 min grace
  let elapsedMs: number;
  
  if (session.end_time) {
    // For extended sessions, calculate from end_time
    const endTime = new Date(session.end_time);
    const now = new Date();
    elapsedMs = now.getTime() - endTime.getTime();
  } else {
    // For regular sessions, use the standard calculation
    elapsedMs = session.elapsed_minutes * 60000;
  }
  
  return elapsedMs > 0 && elapsedMs <= GRACE_PERIOD_MS;
}

export function hasExpired(session: ActiveSession): boolean {
  // Never expires if unlimited time
  if (session.remaining_minutes === Infinity) return false;
  
  let elapsedMs: number;
  
  if (session.end_time) {
    // For extended sessions, calculate from end_time
    const endTime = new Date(session.end_time);
    const now = new Date();
    elapsedMs = now.getTime() - endTime.getTime();
  } else {
    // For regular sessions, use the standard calculation
    elapsedMs = session.elapsed_minutes * 60000;
  }
  
  return elapsedMs > GRACE_PERIOD_MS;
}

/**
 * Format remaining time as HH:MM:SS countdown
 * @param remainingMinutes - Remaining time in minutes
 * @returns Formatted string like "02:34:15" or "∞" for unlimited
 */
export function formatCountdown(remainingMinutes: number): string {
  if (remainingMinutes === Infinity) return '∞';
  if (remainingMinutes <= 0) return '00:00:00';

  const totalSeconds = Math.max(0, remainingMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format remaining time in milliseconds as MM:SS countdown
 * @param remainingMs - Remaining time in milliseconds
 * @returns Formatted string like "14:32"
 */
export function formatCountdownMs(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00';

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
