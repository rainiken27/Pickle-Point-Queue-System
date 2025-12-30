<<<<<<< HEAD
# Pickleball Queue System

A professional queue management system for pickleball courts built with Next.js, React, and TypeScript.

## Features

### Admin Panel (`/admin`)
- **Multi-Court Management**: Manage 4 courts simultaneously
- **Court Status Grid**: Visual overview of all court availability
- **Queue Management**: Add, edit, and remove groups from the queue
- **Specific Court Assignment**: Call groups to specific courts
- **Session Completion**: Mark sessions as complete and track duration per court
- **Real-time Stats**: View today's statistics (sessions, players, avg duration)
- **Session Log**: Complete history with court assignments and durations
- **Keyboard Shortcuts**: 
  - `Ctrl+N` / `Cmd+N`: Add new group
- **Notifications**: Visual feedback for all actions
- **Data Export**: Export session data as JSON

### TV Display (`/display`)
- **4-Court Grid Layout**: Shows all courts in a 2x2 grid
- **Real-time Court Status**: See which groups are playing on each court
- **Session Timers**: Live duration tracking for active sessions
- **Queue Display**: Shows next 8 groups with estimated wait times
- **Large Format Display**: Optimized for wall-mounted TVs
- **Live Clock**: Real-time clock and date display
- **Daily Stats**: Shows total sessions and players
- **Auto-refresh**: Updates automatically when queue changes

### Data Persistence
- **LocalStorage**: All data persists across browser refreshes
- **Session Logs**: Complete history of completed sessions
- **Queue State**: Maintains queue state even after closing browser

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

```bash
npm run build
npm start
```

## Usage

### Accessing the System

The system now has separate URLs for different functions:

- **Admin Panel**: `http://localhost:3000/admin` - Queue management interface
- **TV Display**: `http://localhost:3000/display` - Public display for TVs
- **Home**: `http://localhost:3000/` - Redirects to admin panel

### Multi-Court Management

The system now supports 4 pickleball courts:

#### Admin Panel (`/admin`)
- **Court Status Grid**: See all 4 courts at a glance
- **Individual Court Management**: Call groups to specific courts
- **Queue Management**: Add, edit, remove groups from the waiting queue
- **Session Tracking**: Complete sessions and track duration per court

#### TV Display (`/display`)
- **4-Court Grid Layout**: Shows current status of all courts
- **Now Playing**: Displays which groups are on each court
- **Queue Display**: Shows next 8 groups with estimated wait times
- **Real-time Updates**: Automatically refreshes when queue changes

### Adding Groups to Queue
1. In admin panel, click "Add Group" button or press `Ctrl+N`
2. Enter group name and select number of players (2-4)
3. Click "Add to Queue"

### Managing Courts
- **Call to Specific Court**: Click "Call Next" button on any available court
- **Complete Sessions**: Click "Complete Session" when a group finishes
- **View Court History**: See which court each completed session used

### Managing Queue
- **Edit**: Click the edit icon to modify group details
- **Remove**: Click the trash icon to remove a group
- **Real-time Sync**: Changes appear instantly on TV display

### Viewing Statistics
- Click "Show" in the Stats panel to view today's metrics
- Stats include: total sessions, total players, average duration, current waiting count

### TV Display Features
- **Multi-Court View**: Grid showing all 4 courts simultaneously
- **Session Timers**: Shows how long each group has been playing
- **Estimated Wait Times**: Calculates wait times based on queue position and average session duration
- **Full-Screen Friendly**: Optimized for wall-mounted TVs

## Deployment

### Deploy to Vercel (Free)

This app can be deployed to Vercel for free! See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Quick Steps:**
1. Upload code to GitHub (public repository)
2. Connect GitHub to Vercel
3. Deploy with one click
4. Get live URLs for admin and display

**Live URLs after deployment:**
- Admin Panel: `https://your-app.vercel.app/admin`
- TV Display: `https://your-app.vercel.app/display`

### Production Considerations

**Current Setup (Perfect for Testing):**
- Uses localStorage for data persistence
- Works great for single-location use
- Data resets if browser cache is cleared

**For Production Use:**
- Consider adding a database (Supabase, Firebase, etc.)
- Enable real-time sync across multiple devices
- Add user authentication for admin features

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Hooks with custom storage layer

## Future Enhancements

Potential improvements for future versions:
- Multi-court support
- Backend database integration (Firebase/Supabase)
- User authentication for admin features
- SMS/Email notifications for groups
- Mobile app version
- Advanced analytics and reporting
- Reservation system
- Payment integration

## License

Private project
=======
# Pickle-Point-Queue-System
>>>>>>> a55ef5f3ef276b8b7a8681df16c4a235fbaeb7d3
