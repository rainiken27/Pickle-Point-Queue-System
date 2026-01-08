/**
 * Utility functions for player display (photo vs initials)
 */

/**
 * Get player initials from their name
 */
export function getPlayerInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2); // Max 2 characters
}

/**
 * Component props for player avatar display
 */
export interface PlayerAvatarProps {
  name: string;
  photo_url: string | null;
  display_photo?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Get CSS classes for different avatar sizes
 */
export function getAvatarSizeClasses(size: PlayerAvatarProps['size'] = 'md'): string {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg',
  };
  
  return sizeClasses[size];
}