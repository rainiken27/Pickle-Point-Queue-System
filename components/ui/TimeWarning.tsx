"use client";

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimeWarningProps {
  remainingMinutes: number;
  playerName: string;
  onDismiss?: () => void;
}

export function TimeWarning({ remainingMinutes, playerName, onDismiss }: TimeWarningProps) {
  const isUrgent = remainingMinutes <= 5;
  const isWarning = remainingMinutes <= 30 && remainingMinutes > 5;

  if (!isWarning && !isUrgent) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 p-6 rounded-lg shadow-2xl border-2 ${
        isUrgent
          ? 'bg-red-600 border-red-700 text-white animate-pulse'
          : 'bg-yellow-500 border-yellow-600 text-gray-900'
      } max-w-md`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-700' : 'bg-yellow-600'}`}>
          {isUrgent ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-xl mb-1">
            {isUrgent ? 'TIME ALMOST UP!' : 'Time Warning'}
          </h3>
          <p className="text-lg mb-2">
            <strong>{playerName}</strong>
          </p>
          <p className="text-base">
            {isUrgent
              ? `Only ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} remaining! Please finish your current game.`
              : `${remainingMinutes} minutes remaining in your 5-hour session.`
            }
          </p>
          {isUrgent && (
            <p className="text-sm mt-2 opacity-90">
              Grace period: You may finish your current game (max 25 min).
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`text-2xl hover:opacity-80 ${isUrgent ? 'text-white' : 'text-gray-900'}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

interface TimeWarningBadgeProps {
  remainingMinutes: number;
}

export function TimeWarningBadge({ remainingMinutes }: TimeWarningBadgeProps) {
  const isUrgent = remainingMinutes <= 5;
  const isWarning = remainingMinutes <= 30 && remainingMinutes > 5;

  if (!isWarning && !isUrgent) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
        isUrgent
          ? 'bg-red-600 text-white animate-pulse'
          : 'bg-yellow-500 text-gray-900'
      }`}
    >
      <Clock className="w-4 h-4" />
      {remainingMinutes} min left
    </div>
  );
}
