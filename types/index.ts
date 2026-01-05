// Re-export all types from a central location
export * from './player';
export * from './session';
export * from './preferences';
export * from './queue';
export * from './court';
export * from './matchmaking';
export * from './analytics';
export * from './group';
export * from './building';

// Auth types
export type StaffRole = 'court_officer' | 'cashier';

export interface StaffUser {
  user_id: string;
  role: StaffRole;
  created_at: string;
}
