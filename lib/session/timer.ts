import { Session, ActiveSession } from '@/types';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 25 * 60 * 1000;

export function calculateSessionTime(session: Session): ActiveSession {
  const startTime = new Date(session.start_time);
  const now = new Date();
  const elapsedMs = now.getTime() - startTime.getTime();
  const remainingMs = FIVE_HOURS_MS - elapsedMs;

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
  return session.remaining_minutes <= 30 && session.remaining_minutes > 5;
}

export function shouldAlertCourtOfficer(session: ActiveSession): boolean {
  return session.remaining_minutes <= 5;
}

export function canStartNewGame(session: ActiveSession): boolean {
  // Can start if more than 5 minutes remaining
  return session.remaining_minutes > 5;
}

export function isInGracePeriod(session: ActiveSession): boolean {
  // In grace period if time expired but within 25 min grace
  const elapsedMs = session.elapsed_minutes * 60000;
  return elapsedMs > FIVE_HOURS_MS && elapsedMs <= (FIVE_HOURS_MS + GRACE_PERIOD_MS);
}

export function hasExpired(session: ActiveSession): boolean {
  const elapsedMs = session.elapsed_minutes * 60000;
  return elapsedMs > (FIVE_HOURS_MS + GRACE_PERIOD_MS);
}
