'use client';

import React, { useState } from 'react';
import { getPlayerInitials, getAvatarSizeClasses, getDiceBearAvatarUrl, PlayerAvatarProps } from '@/lib/utils/playerDisplay';

export function PlayerAvatar({
  name,
  photo_url,
  display_photo = true,
  size = 'md',
  className = ''
}: PlayerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = getAvatarSizeClasses(size);

  if (display_photo && photo_url && !imageError) {
    return (
      <img
        src={photo_url}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Show DiceBear avatar if display_photo is true but image failed or no URL
  if (display_photo) {
    return (
      <img
        src={getDiceBearAvatarUrl(name)}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover ${className}`}
      />
    );
  }

  // Show initials when display_photo is false
  const initials = getPlayerInitials(name);

  return (
    <div className={`${sizeClasses} bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 ${className}`}>
      {initials}
    </div>
  );
}