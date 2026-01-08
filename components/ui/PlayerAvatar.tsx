import React from 'react';
import { getPlayerInitials, getAvatarSizeClasses, PlayerAvatarProps } from '@/lib/utils/playerDisplay';

export function PlayerAvatar({ 
  name, 
  photo_url, 
  display_photo = true, 
  size = 'md', 
  className = '' 
}: PlayerAvatarProps) {
  const sizeClasses = getAvatarSizeClasses(size);
  
  if (display_photo && photo_url) {
    return (
      <img
        src={photo_url}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover ${className}`}
      />
    );
  }
  
  // Show initials
  const initials = getPlayerInitials(name);
  
  return (
    <div className={`${sizeClasses} bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 ${className}`}>
      {initials}
    </div>
  );
}