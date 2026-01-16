'use client';

import React, { useState } from 'react';
import { getDiceBearAvatarUrl, getPlayerInitials } from '@/lib/utils/playerDisplay';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  name: string; // Used to generate DiceBear fallback
  className?: string;
}

export function ImageWithFallback({ src, alt, name, className = '' }: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [dicebearError, setDicebearError] = useState(false);

  // Final fallback: show initials if both original and DiceBear fail
  if (imageError && dicebearError) {
    return (
      <div className={`${className} bg-gray-300 flex items-center justify-center font-bold text-gray-700`}>
        {getPlayerInitials(name)}
      </div>
    );
  }

  const imageSrc = (!src || imageError) ? getDiceBearAvatarUrl(name) : src;
  const handleError = imageError ? () => setDicebearError(true) : () => setImageError(true);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
