'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GroupWithMembers, Player } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Users, Plus, X, Search, Trash2, UserPlus, UserMinus, ArrowLeft, AlertCircle } from 'lucide-react';

export default function GroupsManagementPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GroupWithMembers | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    }
  };

  // Fetch all players
  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    }
  };

  useEffect(() => {
    Promise.all([fetchGroups(), fetchPlayers()]).finally(() => setLoading(false));
  }, []);

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Create new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedPlayers.length < 2 || selectedPlayers.length > 4) {
      setError('Please select 2-4 players for the group');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          member_ids: selectedPlayers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create group');
      }

      await fetchGroups();
      setNewGroupName('');
      setSelectedPlayers([]);
      setPlayerSearchTerm('');
      setShowCreateModal(false);
      setSuccess(`Group "${newGroupName}" created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      const response = await fetch(`/api/groups/${groupToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }

      await fetchGroups();
      if (selectedGroup?.id === groupToDelete.id) {
        setSelectedGroup(null);
      }
      setShowDeleteModal(false);
      setGroupToDelete(null);
      setSuccess(`Group "${groupToDelete.name}" deleted successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  // View group details
  const handleViewGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) throw new Error('Failed to fetch group details');
      const data = await response.json();
      setSelectedGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch group details');
    }
  };

  // Add member to group
  const handleAddMember = async (groupId: string, playerId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      await Promise.all([fetchGroups(), handleViewGroup(groupId)]);
      setSuccess('Member added successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  // Remove member from group
  const handleRemoveMember = async (groupId: string, playerId: string, playerName: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members?playerId=${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      await Promise.all([fetchGroups(), handleViewGroup(groupId)]);
      setSuccess(`${playerName} removed from group`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  // Toggle player selection
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Get available players (not in the selected group)
  const getAvailablePlayers = (group: GroupWithMembers) => {
    const memberIds = group.members?.map((m: any) => m.player.id) || [];
    return players.filter(p => !memberIds.includes(p.id));
  };

  // Filter groups by search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-400 animate-pulse" />
          <div className="text-xl text-gray-600">Loading groups...</div>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedGroup) {
    const availablePlayers = getAvailablePlayers(selectedGroup);

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    {selectedGroup.name}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {selectedGroup.member_count} member{selectedGroup.member_count !== 1 ? 's' : ''} • Created {new Date(selectedGroup.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                onClick={() => {
                  setGroupToDelete(selectedGroup);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-800">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Members */}
            <div>
              <h2 className="text-xl font-bold mb-4">Current Members</h2>
              <div className="space-y-3">
                {selectedGroup.members?.map((member: any) => (
                  <Card key={member.id} className="border-blue-200">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">
                              {member.player.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.player.name}</p>
                            <p className="text-sm text-gray-600">
                              {member.player.skill_level} • {member.player.gender}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveMember(selectedGroup.id, member.player.id, member.player.name)}
                          disabled={selectedGroup.member_count <= 2}
                          title={selectedGroup.member_count <= 2 ? 'Groups must have at least 2 members' : 'Remove member'}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {selectedGroup.member_count < 2 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Groups must have at least 2 members
                  </p>
                </div>
              )}
            </div>

            {/* Add Members */}
            {selectedGroup.member_count < 4 && (
              <div>
                <h2 className="text-xl font-bold mb-4">
                  Add Active Player ({4 - selectedGroup.member_count} slot{4 - selectedGroup.member_count !== 1 ? 's' : ''} available)
                </h2>
                <div className="space-y-3">
                  {availablePlayers.length > 0 ? (
                    availablePlayers.map(player => (
                      <div key={player.id} onClick={() => handleAddMember(selectedGroup.id, player.id)} className="cursor-pointer">
                        <Card className="hover:border-green-300 transition-colors">
                          <CardBody className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-lg font-bold text-green-600">
                                    {player.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{player.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {player.skill_level} • {player.gender}
                                    {(player as any).active_session && (
                                      <span className="ml-1 text-blue-600">
                                        • Active Session
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <UserPlus className="w-5 h-5 text-green-600" />
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600">No additional active players available</p>
                      <p className="text-sm text-gray-500 mt-1">Players must have active sessions to join groups</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedGroup.member_count >= 4 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Group Full</h2>
                <div className="text-center py-12 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <Users className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <p className="text-blue-900 font-semibold">This group is at maximum capacity</p>
                  <p className="text-sm text-blue-700 mt-1">Groups can have up to 4 members</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="w-8 h-8 text-blue-600" />
                Group Management
              </h1>
              <p className="text-gray-600 mt-1">Create and manage friend groups for queue priority</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <div key={group.id} onClick={() => handleViewGroup(group.id)} className="cursor-pointer">
                <Card className="hover:shadow-lg transition-all border-blue-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        {group.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupToDelete(group);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Members</span>
                        <span className="font-bold text-blue-600">{group.member_count}/4</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Created</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(group.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <Button size="sm" className="w-full" onClick={(e) => {
                          e.stopPropagation();
                          handleViewGroup(group.id);
                        }}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No groups found' : 'No groups yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? `No groups match "${searchTerm}"`
                : 'Create your first friend group to give players queue priority when playing together'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Create New Group
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setSelectedPlayers([]);
                  setPlayerSearchTerm('');
                  setError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a name for this group..."
                  required
                />
              </div>

              {/* Player Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Active Players (2-4)
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">
                    Only players with active sessions can join groups
                  </p>
                </div>
                {/* Player Search */}
                <div className="relative mb-3">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players by name..."
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    autoComplete="off"
                  />
                </div>
                <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                  {players.length > 0 ? (
                    players
                      .filter(player =>
                        player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                      )
                      .map(player => (
                      <label
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedPlayers.includes(player.id)
                            ? 'bg-blue-100 border-2 border-blue-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        } ${
                          !selectedPlayers.includes(player.id) && selectedPlayers.length >= 4
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(player.id)}
                          onChange={() => togglePlayerSelection(player.id)}
                          disabled={
                            !selectedPlayers.includes(player.id) &&
                            selectedPlayers.length >= 4
                          }
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-700">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{player.name}</p>
                          <p className="text-sm text-gray-600">
                            {player.skill_level} • {player.gender}
                            {(player as any).active_session && (
                              <span className="ml-1 text-blue-600 font-medium">
                                • Active Session
                              </span>
                            )}
                          </p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No active players found</p>
                      <p className="text-sm mt-1">Players must check in at the cashier first</p>
                    </div>
                  )}
                  {players.length > 0 && players.filter(p => p.name.toLowerCase().includes(playerSearchTerm.toLowerCase())).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No players match "{playerSearchTerm}"</p>
                      <p className="text-sm mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2 flex items-center justify-between">
                  <span>Selected players:</span>
                  <span className={`font-bold ${
                    selectedPlayers.length < 2 || selectedPlayers.length > 4
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {selectedPlayers.length}/4
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                    setSelectedPlayers([]);
                    setPlayerSearchTerm('');
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={selectedPlayers.length < 2 || selectedPlayers.length > 4 || !newGroupName.trim()}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Group?</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  You're about to delete <strong>"{groupToDelete.name}"</strong> with {groupToDelete.member_count} member{groupToDelete.member_count !== 1 ? 's' : ''}.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setGroupToDelete(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteGroup}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
