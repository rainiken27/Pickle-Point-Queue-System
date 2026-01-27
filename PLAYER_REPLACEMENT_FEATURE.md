# Player Replacement Feature

## Overview
This feature allows court officers to replace a no-show player during the verification stage (before match starts) with another player from the queue. The replaced player automatically takes a break (their session remains active but they are removed from the queue).

## How It Works

### 1. Accessing the Feature
- Navigate to the Admin Dashboard (`/admin`)
- Click "Call Doubles" or "Call Singles" on an available court
- In the "Verify Players Present" section, look for unverified players (marked as "No-show")
- Each no-show player now has an individual "Replace" button

### 2. Replacing a No-Show Player
1. During player verification, uncheck any players who are not present
2. For each unverified player marked "No-show", click the "Replace" button next to their name
3. A modal will open showing:
   - **Current Player**: The no-show player being replaced (will take a break)
   - **Search Field**: Type the name of the replacement player
4. As you type, player suggestions will appear with autocomplete
5. Click on a player from the suggestions to select them
6. Click "Replace Player" to confirm

### 3. What Happens Behind the Scenes
1. **Current Player**: 
   - Removed from queue with "temporary_break" reason
   - Their session remains active (they can rejoin later via QR scan)
   - Removed from the match verification

2. **Replacement Player**:
   - Added to the queue
   - Replaces the no-show player in the match suggestion
   - Automatically marked as verified
   - Ready to start the match

### 4. Requirements for Replacement Players
- Must have an active session (checked in at cashier)
- Must not already be in queue or playing on another court
- Must exist in the players database

## User Interface

### Admin Dashboard - Player Verification
When verifying players for a match, each player shows:
- Checkbox to mark as present/absent
- Player name and number
- **For no-shows**: "No-show" label + "Replace" button (NEW)

### Player Replacement Modal
- **Current Player Info**: Shows who is being replaced
- **Search Field**: Autocomplete player search
- **Search Results**: List of matching players with photos
- **Selected Player**: Shows chosen replacement
- **Action Buttons**: Cancel / Replace Player

### Before vs After
**Before**: Single "Replace No-Shows" button that automatically replaces with next in queue
**After**: Individual "Replace" buttons for each no-show player with customizable replacement selection

## Technical Implementation

### Components
- `PlayerReplacement.tsx`: Modal component for replacement UI
- Modified admin page verification section to show individual replace buttons

### API Endpoints
- `GET /api/players/search`: Search for players by name (existing)
- `POST /api/queue/add`: Add player to queue (new)
- `POST /api/queue/remove`: Remove player from queue (existing)

### State Management
- Updates `matchSuggestions` to replace player in the current match
- Updates `verifiedPlayers` set to mark replacement as verified
- Maintains queue consistency

## Error Handling
- Player not found
- Player doesn't have active session
- Player already in queue/playing
- Network errors during replacement
- All errors show user-friendly messages

## Benefits
1. **Granular Control**: Replace specific no-show players individually
2. **Custom Selection**: Choose specific replacement players instead of automatic next-in-line
3. **Session Continuity**: Replaced players can rejoin later
4. **Queue Management**: Maintains proper queue positions
5. **User-Friendly**: Intuitive search and selection
6. **Real-time Updates**: Immediate reflection in verification UI

## Usage Example
```
Verify Players Present:
☑ 1. John Doe
☐ 2. Jane Smith [No-show] [Replace]
☑ 3. Bob Jones  
☐ 4. Sue Chen [No-show] [Replace]

✓ 2/4 players verified
💡 Individual "Replace" buttons are available for each no-show player above
```

## Future Enhancements
- Bulk replacement (replace multiple players at once)
- Replacement history tracking
- Automatic replacement suggestions based on skill level
- Integration with player preferences
