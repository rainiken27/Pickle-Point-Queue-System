"use client";

import React, { useEffect, useState } from 'react';
import { useBuildings } from '@/store';
import { Building2, Power, PowerOff } from 'lucide-react';

export default function BuildingsManagementPage() {
  const { buildings, fetchBuildings, toggleBuildingStatus, subscribeToBuildings } = useBuildings();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBuildings();
    const unsubscribe = subscribeToBuildings();
    return () => unsubscribe();
  }, []);

  const handleToggleBuilding = async (buildingId: string, currentStatus: boolean) => {
    try {
      setLoading(buildingId);
      await toggleBuildingStatus(buildingId, !currentStatus);
    } catch (error) {
      console.error('Failed to toggle building:', error);
      alert('Failed to update building status');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Building Management
          </h1>
          <p className="text-gray-600">
            Enable or disable buildings. When disabled, players cannot queue for courts in that building.
          </p>
        </div>

        <div className="space-y-4">
          {buildings.map((building) => (
            <div
              key={building.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                building.is_active
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-red-200 hover:border-red-300 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      building.is_active ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    <Building2
                      className={`w-8 h-8 ${
                        building.is_active ? 'text-green-600' : 'text-red-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{building.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                          building.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {building.is_active ? (
                          <>
                            <Power className="w-4 h-4" />
                            Active
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Disabled
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleBuilding(building.id, building.is_active)}
                  disabled={loading === building.id}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                    building.is_active
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === building.id ? (
                    'Updating...'
                  ) : building.is_active ? (
                    <>
                      <PowerOff className="w-5 h-5 inline mr-2" />
                      Disable Building
                    </>
                  ) : (
                    <>
                      <Power className="w-5 h-5 inline mr-2" />
                      Enable Building
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {building.is_active ? (
                    'Players can join the queue for courts in this building.'
                  ) : (
                    <span className="text-red-600 font-medium">
                      This building is disabled. Players cannot queue for courts here.
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {buildings.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No buildings found</p>
            <p className="text-gray-400 text-sm mt-2">Make sure the database migration has been applied</p>
          </div>
        )}
      </div>
    </div>
  );
}
