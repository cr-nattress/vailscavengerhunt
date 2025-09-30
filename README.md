# Vail Scavenger Hunt

A modern, team-based scavenger hunt progressive web application designed for exploring Vail, Colorado through interactive challenges and location-based activities.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/your-site-name/deploys)

## Overview

Vail Scavenger Hunt is a full-stack application that enables organizations to host engaging team-based scavenger hunts. Teams use verification codes to join hunts, visit various stops around Vail, complete challenges, upload photos, and track their progress on a real-time leaderboard.

### Key Features

- **Team-Based Participation** - Secure team verification with unique access codes
- **Location-Based Challenges** - Multiple stops with clues, hints, and photo challenges
- **Photo Upload System** - Cloudinary-powered image uploads with validation
- **Real-Time Leaderboard** - Live team rankings based on completion percentage
- **Team Synchronization** - Progress syncs across all team members in real-time
- **Device Lock System** - Prevents participants from joining multiple teams
- **Persistent Progress** - All data stored in Supabase PostgreSQL database
- **Mobile-First Design** - Optimized responsive UI for smartphones and tablets
- **Sponsor Integration** - Dynamic sponsor cards with configurable layouts (1x1, 1x2, 1x3)
- **Offline Support** - Works with limited connectivity
- **Error Tracking** - Comprehensive logging with Sentry integration
- **Hunt Flexibility** - Supports both randomized and fixed stop ordering

## Architecture

### Tech Stack

#### Frontend
- **Framework**: React 18 with TypeScript/JSX
- **Build Tool**: Vite 5
- **State Management**: Zustand
- **Data Fetching**: SWR + TanStack Query
- **Styling**: Inline styles with CSS custom properties
- **Routing**: React Router (embedded in navigation)

#### Backend
- **Serverless Functions**: Netlify Functions (Node.js)
- **Development Server**: Express.js with TypeScript (tsx)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based team tokens
- **File Storage**: Cloudinary (images)
- **KV Storage**: Netlify Blobs

#### Infrastructure
- **Hosting**: Netlify
- **Error Tracking**: Sentry (Browser + Node)
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Cloudinary (image delivery)

### Database Schema

The application uses Supabase PostgreSQL with the following core tables:

```
organizations
├── hunts
│   ├── teams
│   │   ├── team_codes (verification codes)
│   │   ├── hunt_progress (stop completion)
│   │   ├── settings (team preferences)
│   │   └── sessions (device tracking)
│   ├── hunt_locations (stops/challenges)
│   └── sponsor_assets (sponsor imagery)
└── device_locks (multi-team prevention)
```

Key relationships:
- **Organizations** → **Hunts** (one-to-many)
- **Hunts** → **Teams** (one-to-many)
- **Teams** → **Progress** (one-to-many)
- **Teams** → **Settings** (one-to-one)

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- **Cloudinary** account for image uploads
- **Netlify CLI** for local development (optional but recommended)
- **Sentry** account for error tracking (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/cr-nattress/vaillovehunt.git
cd vaillovehunt

# Install root dependencies
npm install

# Install Netlify Functions dependencies
cd netlify/functions
npm install
cd ../..
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Cloudinary Configuration (Required for photo uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Sentry Configuration (Optional - for error tracking)
# Client-side (Vite)
VITE_ENABLE_SENTRY=true
VITE_SENTRY_DSN=https://YOUR_PUBLIC_KEY@o123456.ingest.sentry.io/1234567
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=1.0.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# Server-side
SENTRY_DSN=https://YOUR_PUBLIC_KEY@o123456.ingest.sentry.io/1234567
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1

# Build Configuration (Optional - for source maps)
SENTRY_AUTH_TOKEN=sntrys_YOUR_AUTH_TOKEN_HERE
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug

# Development Server (Optional)
PORT=3001
```

See `.env.sentry.template` for detailed Sentry configuration options.

### Database Setup

Initialize the Supabase database schema:

```bash
# Create tables, indexes, and RLS policies
npm run setup:supabase

# Add Row Level Security policies
npm run setup:supabase-rls

# Add performance indexes
npm run setup:supabase-performance

# Verify database setup
npm run validate:supabase
```

Alternatively, run the SQL scripts manually in the Supabase SQL Editor:
1. `scripts/sql/supabase-schema.sql` - Core tables
2. `scripts/sql/supabase-rls.sql` - Security policies
3. `scripts/sql/supabase-performance.sql` - Performance indexes
4. `scripts/sql/sponsor-assets-schema.sql` - Sponsor system

## Development

### Running the Application

#### Option 1: Netlify Dev (Recommended)
```bash
# Start frontend + Netlify Functions (single command)
npm run start:netlify
```
This runs:
- Vite dev server on port 5173
- Netlify Dev on port 8888 (with function proxying)

#### Option 2: Separate Processes
```bash
# Terminal 1: Start frontend only
npm run dev

# Terminal 2: Start Express backend (optional, for legacy endpoints)
npm run server:dev
```

#### Option 3: All Services (Advanced)
```bash
# Start UI + API + State Server
npm run start:all
```

### Development Workflow

1. **Frontend Development**: Edit files in `src/`, hot reload enabled
2. **Serverless Functions**: Edit files in `netlify/functions/`, auto-reload with Netlify Dev
3. **Database Changes**: Run SQL scripts in Supabase dashboard
4. **Styling**: Update inline styles or CSS custom properties in theme files

### Project Structure

```
vail-scavenger-hunt/
├── src/
│   ├── App.jsx                        # Main application component
│   ├── main.jsx                       # React entry point
│   ├── components/                    # Reusable UI components
│   │   ├── AlbumViewer.tsx           # Photo gallery viewer
│   │   └── ProgressGauge.tsx         # Circular progress indicator
│   ├── features/                      # Feature-specific components
│   │   ├── app/                      # Core app features
│   │   │   ├── Header.tsx            # App header with menu
│   │   │   ├── SettingsPanel.tsx    # Settings management
│   │   │   ├── StopCard.tsx         # Individual stop card
│   │   │   └── CompletedAccordion.tsx
│   │   ├── views/                    # Main view components
│   │   │   ├── ActiveView.tsx       # Main hunt view
│   │   │   ├── LeaderboardView.tsx  # Team rankings
│   │   │   ├── UpdatesView.tsx      # Activity feed
│   │   │   ├── HealthView.tsx       # System health
│   │   │   └── DiagnosticsView.tsx  # Debug panel
│   │   ├── teamLock/                 # Team verification system
│   │   │   ├── TeamLockWrapper.tsx  # Auth wrapper
│   │   │   ├── SplashGate.tsx       # Login screen
│   │   │   └── useTeamLock.ts       # Team lock hook
│   │   ├── navigation/               # Bottom navigation
│   │   │   ├── BottomNavigation.tsx
│   │   │   ├── TabContainer.tsx
│   │   │   └── navigationStore.ts
│   │   ├── sponsors/                 # Sponsor integration
│   │   │   ├── SponsorCard.tsx
│   │   │   └── useSponsors.ts
│   │   ├── notifications/            # Toast system
│   │   │   └── ToastProvider.tsx
│   │   └── upload/                   # Photo upload
│   │       └── UploadContext.tsx
│   ├── services/                     # API and business logic
│   │   ├── apiClient.ts             # Central HTTP client
│   │   ├── TeamService.ts           # Team operations
│   │   ├── ConfigService.ts         # Hunt configuration
│   │   ├── SponsorsService.ts       # Sponsor data
│   │   ├── HuntConfigService.ts     # Hunt setup
│   │   ├── ServerSettingsService.ts # Settings management
│   │   └── ConsolidatedDataService.ts
│   ├── store/                        # State management
│   │   ├── appStore.ts              # Global app state (Zustand)
│   │   └── uiStore.ts               # UI state
│   ├── hooks/                        # Custom React hooks
│   │   ├── useActiveData.ts         # Active hunt data
│   │   ├── useProgressQuery.ts      # Progress fetching
│   │   ├── useSettingsQuery.ts      # Settings fetching
│   │   ├── useHuntStops.ts          # Stop data
│   │   ├── useTeamContext.ts        # Team context
│   │   ├── useCollage.ts            # Photo collage
│   │   └── useSponsors.ts           # Sponsor hook
│   ├── logging/                      # Logging system
│   │   ├── client.ts                # Client logger
│   │   ├── server.ts                # Server logger
│   │   ├── initSentryClient.ts      # Sentry browser setup
│   │   ├── initSentryNode.ts        # Sentry Node setup
│   │   ├── MultiSinkLogger.ts       # Multi-destination logging
│   │   └── sinks/                   # Log destinations
│   │       ├── ConsoleSink.ts
│   │       ├── SentryBrowserSink.ts
│   │       └── SentryNodeSink.ts
│   ├── types/                        # TypeScript definitions
│   │   ├── index.ts                 # Core types
│   │   ├── config.ts                # Configuration types
│   │   ├── sponsors.ts              # Sponsor types
│   │   ├── consolidated.ts          # API response types
│   │   ├── supabase.ts              # Database types
│   │   └── hunt-system.ts           # Hunt types
│   ├── utils/                        # Utility functions
│   │   ├── image.ts                 # Image processing
│   │   ├── canvas.ts                # Canvas operations
│   │   ├── id.ts                    # ID generation
│   │   ├── slug.ts                  # URL slugs
│   │   ├── url.ts                   # URL parsing
│   │   ├── random.ts                # Randomization
│   │   └── validation.ts            # Data validation
│   └── server/                       # Express server (legacy)
│       ├── server.ts                # Express app
│       ├── kvRoute.ts               # KV endpoints
│       ├── leaderboardRoute.ts      # Leaderboard endpoints
│       ├── photoRoute.ts            # Photo endpoints
│       ├── settingsRoute.ts         # Settings endpoints
│       └── teamRoute.ts             # Team endpoints
├── netlify/
│   └── functions/                    # Serverless functions
│       ├── consolidated-active.js   # Get active hunt data
│       ├── consolidated-history.js  # Get progress history
│       ├── consolidated-updates.js  # Get activity updates
│       ├── consolidated-rankings.js # Get leaderboard
│       ├── team-verify.js          # Verify team code
│       ├── team-current.js         # Get current team
│       ├── team-setup.js           # Initialize team
│       ├── login-initialize.js     # Quick init endpoint
│       ├── photo-upload.js         # Upload photo
│       ├── photo-upload-complete.js # Atomic upload + progress
│       ├── progress-get-supabase.js
│       ├── progress-set-supabase.js
│       ├── settings-get-supabase.js
│       ├── settings-set-supabase.js
│       ├── leaderboard-get-supabase.js
│       ├── sponsors-get.js         # Get sponsor data
│       ├── kv-get-supabase.js
│       ├── kv-upsert-supabase.js
│       ├── health.js               # Health check
│       ├── write-log.js            # Remote logging
│       ├── _lib/                   # Shared utilities
│       │   ├── supabase.js        # Supabase client
│       │   ├── headers.js         # CORS headers
│       │   └── errors.js          # Error handling
│       └── package.json           # Function dependencies
├── scripts/                          # Build and utility scripts
│   ├── js/                          # JavaScript utilities
│   │   ├── setup-supabase-schema.js
│   │   ├── setup-supabase-rls.js
│   │   ├── setup-supabase-performance.js
│   │   ├── validate-supabase.js
│   │   ├── clear-team-progress.js
│   │   └── clear-all-team-progress.js
│   └── sql/                         # SQL migration scripts
│       ├── supabase-schema.sql
│       ├── supabase-rls.sql
│       ├── supabase-performance.sql
│       ├── sponsor-assets-schema.sql
│       └── seed-sponsor-data.sql
├── public/                          # Static assets
│   ├── _redirects                   # Netlify redirects
│   ├── app-logo.svg
│   ├── favicon.svg
│   └── images/
├── tests/                           # Test suites
│   └── e2e/                        # End-to-end tests
├── .env                            # Environment variables (gitignored)
├── .env.sentry.template            # Sentry config template
├── .gitignore
├── index.html                      # HTML entry point
├── netlify.toml                    # Netlify configuration
├── package.json                    # Root dependencies
├── vite.config.js                 # Vite configuration
└── README.md
```

## API Documentation

### Consolidated Endpoints

The application uses consolidated endpoints for efficient data fetching:

#### `GET /api/consolidated/active/:orgId/:teamId/:huntId`
Get all active hunt data (stops, progress, settings, sponsors) in a single request.

**Response:**
```json
{
  "activeData": {
    "stops": [...],
    "progress": {...},
    "settings": {...},
    "sponsors": {...}
  },
  "organization": {...},
  "hunt": {...},
  "team": {...}
}
```

#### `GET /api/consolidated/history/:orgId/:teamId/:huntId`
Get progress history and completed stops.

#### `GET /api/consolidated/updates/:orgId/:teamId/:huntId`
Get recent team activity updates.

#### `GET /api/consolidated/rankings?orgId=X&huntId=Y`
Get leaderboard rankings for a hunt.

### Team Management

#### `POST /api/team-verify`
Verify team code and get access token.

**Request:**
```json
{
  "code": "team-code-here",
  "deviceInfo": {
    "userAgent": "...",
    "screenSize": "1920x1080"
  }
}
```

**Response:**
```json
{
  "success": true,
  "teamId": "uuid",
  "teamName": "team-alpha",
  "token": "jwt-token",
  "organization": {...},
  "hunt": {...}
}
```

#### `GET /api/team-current`
Get current team information from token.

#### `POST /api/team-setup`
Initialize team settings and progress.

### Progress Management

#### `GET /api/progress/:orgId/:teamId/:huntId`
Get team progress data.

#### `POST /api/progress/:orgId/:teamId/:huntId`
Update team progress (mark stops as complete).

**Request:**
```json
{
  "locationId": "stop-1",
  "done": true,
  "notes": "Completed the challenge",
  "photoUrl": "https://cloudinary.com/..."
}
```

### Settings

#### `GET /api/settings/:orgId/:teamId/:huntId`
Get team settings.

#### `POST /api/settings/:orgId/:teamId/:huntId`
Update team settings.

**Request:**
```json
{
  "locationName": "Vail Village",
  "eventName": "Fall Hunt 2025",
  "config": {
    "sponsorLayout": "1x2"
  }
}
```

### Photo Upload

#### `POST /api/photo-upload-complete`
Atomic endpoint that uploads photo and updates progress in one transaction.

**Request:** `multipart/form-data`
- `file`: Image file
- `organizationId`: Organization ID
- `teamId`: Team ID
- `huntId`: Hunt ID
- `locationId`: Stop ID

**Response:**
```json
{
  "success": true,
  "photoUrl": "https://res.cloudinary.com/...",
  "progress": {...}
}
```

### Sponsors

#### `POST /api/sponsors-get`
Get sponsor cards for a hunt.

**Request:**
```json
{
  "organizationId": "bhhs",
  "huntId": "fall-2025"
}
```

**Response:**
```json
{
  "layout": "1x2",
  "items": [
    {
      "id": "uuid",
      "companyId": "sponsor-1",
      "companyName": "Sponsor Name",
      "alt": "Sponsor logo",
      "type": "svg",
      "svg": "<svg>...</svg>"
    }
  ]
}
```

### Health & Monitoring

#### `GET /api/health`
System health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-29T12:00:00Z",
  "services": {
    "supabase": "ok",
    "cloudinary": "ok"
  }
}
```

## Deployment

### Netlify Deployment

The application is configured for automatic deployment on Netlify.

#### Environment Variables

Configure these in Netlify Dashboard → Site Settings → Environment Variables:

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Optional (Sentry):**
- `VITE_ENABLE_SENTRY`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT` (set to "production")
- `VITE_SENTRY_RELEASE`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT` (set to "production")
- `SENTRY_AUTH_TOKEN` (for source maps)
- `SENTRY_ORG`
- `SENTRY_PROJECT`

#### Build Configuration

The `netlify.toml` file handles:
- Build command: Installs function dependencies → builds Vite app
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- API redirects: `/api/*` → `/.netlify/functions/*`
- SPA fallback: All routes → `index.html`

#### Manual Deploy

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

### Database Migration

When deploying to production for the first time:

1. Run database schema scripts in Supabase SQL Editor
2. Create organizations and hunts
3. Generate team codes
4. Upload sponsor assets
5. Configure hunt stops

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: `src/**/*.test.ts(x)`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`

## Scripts Reference

### Development
- `npm run dev` - Start Vite dev server (port 5173)
- `npm run server:dev` - Start Express server (port 3001)
- `npm run start:netlify` - Start Netlify Dev (port 8888)
- `npm run start:all` - Start all services

### Build
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Database
- `npm run setup:supabase` - Initialize Supabase schema
- `npm run setup:supabase-rls` - Add Row Level Security
- `npm run setup:supabase-performance` - Add performance indexes
- `npm run validate:supabase` - Verify database setup

### Data Management
- `npm run clear:all:dry` - Preview progress clear (all teams)
- `npm run clear:all:run` - Clear all team progress
- `npm run clear:all:run:default` - Clear bhhs/fall-2025 progress

### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run with coverage
- `npm run test:e2e` - Run E2E tests

### Sponsors
- `npm run setup:sponsor-assets` - Setup sponsor assets
- `npm run seed:sponsor-data` - Seed sponsor data
- `npm run test:sponsor-api` - Test sponsor API

## Features in Detail

### Team Verification Flow

1. User opens app → sees splash screen
2. Enters team verification code
3. System validates code against `team_codes` table
4. Generates JWT token with team information
5. Creates device lock to prevent multi-team joining
6. Initializes team settings and progress
7. User gains access to hunt interface

### Progress Tracking

- **Stop Completion**: Mark stops as done with optional notes
- **Photo Validation**: Upload photos for photo challenges
- **Hint System**: Reveal hints progressively (tracked per team)
- **Real-Time Sync**: Progress syncs across all team members via Supabase
- **Atomic Operations**: Photo upload + progress update in single transaction
- **History Tracking**: Complete audit trail of all progress changes

### Leaderboard System

- **Ranking Algorithm**: Based on completion percentage, tie-broken by completion time
- **Real-Time Updates**: Automatic refresh when viewing leaderboard
- **Team Highlighting**: Current team highlighted in rankings
- **Progress Visualization**: Progress bars and percentage indicators
- **Activity Timestamps**: Shows last activity time for each team

### Sponsor Integration

- **Dynamic Loading**: Sponsors fetched from database per hunt
- **Layout Options**: 1x1 (single), 1x2 (two column), 1x3 (three column)
- **Asset Types**: SVG (inline) or raster images (PNG/JPEG via signed URLs)
- **Caching**: Client-side caching for performance
- **Team Settings**: Layout preference stored per team

### Hunt Configuration

- **Randomized Stops**: Optional randomization per team (set via `is_randomized` flag)
- **Fixed Order**: Traditional linear progression through stops
- **Multi-Organization**: Support for multiple organizations and hunts
- **Flexible Stops**: Stops stored in `hunt_locations` table
- **Dynamic Content**: Clues, hints, and locations configurable per hunt

## Troubleshooting

### Common Issues

**Team verification fails**
- Check team code is active in `team_codes` table
- Verify Supabase connection
- Clear browser localStorage and try again
- Check console for error messages

**Progress not syncing**
- Verify network connection
- Check browser console for API errors
- Confirm team token is valid (check localStorage)
- Try refreshing the page

**Images not uploading**
- Verify Cloudinary credentials in environment variables
- Check file size (max 10MB)
- Ensure correct file format (JPG, PNG, JPEG)
- Check network tab for upload errors
- Verify Cloudinary storage quota

**Leaderboard not updating**
- Click "Refresh" button manually
- Check `/api/leaderboard/:org/:hunt` endpoint
- Verify progress records in database
- Check for CORS errors in console

**Netlify Functions failing**
- Check function logs in Netlify Dashboard
- Verify environment variables are set
- Check function dependencies are installed
- Review Sentry error reports

**Database connection issues**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project is active
- Verify RLS policies aren't blocking queries
- Test connection with `npm run validate:supabase`

## Security Considerations

- **JWT Tokens**: Short-lived tokens for team authentication
- **Device Locking**: Fingerprinting prevents multi-team participation
- **Row Level Security**: Supabase RLS policies enforce data isolation
- **Service Role Key**: Used only in backend functions, never exposed to client
- **CORS Configuration**: Restricted to same origin in production
- **Input Validation**: All inputs validated on both client and server
- **Environment Variables**: Sensitive data stored securely, never committed
- **Photo Validation**: File type and size validation before upload
- **SQL Injection**: Protection via parameterized queries

## Performance Optimization

- **Consolidated Endpoints**: Single request fetches all required data
- **Database Indexes**: Optimized indexes on frequently queried columns
- **Image CDN**: Cloudinary handles image optimization and delivery
- **Client-Side Caching**: SWR caches API responses
- **Code Splitting**: Vite automatically splits bundles
- **Lazy Loading**: Components loaded on demand
- **Connection Pooling**: Supabase handles database connection pooling

## Contributing

### Development Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit using conventional commits: `git commit -m 'feat: add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, semicolons, etc.)
- `refactor:` - Code refactoring (no functional changes)
- `perf:` - Performance improvements
- `test:` - Test additions or changes
- `chore:` - Maintenance tasks (dependencies, build config, etc.)

### Code Style

- Use TypeScript for new files when possible
- Follow existing patterns for consistency
- Add JSDoc comments for complex functions
- Write unit tests for business logic
- Keep components small and focused
- Use meaningful variable names

## License

This project is proprietary software. All rights reserved.

## Support

For issues, questions, or feature requests:

- **GitHub Issues**: [vaillovehunt/issues](https://github.com/cr-nattress/vaillovehunt/issues)
- **Email**: Contact repository maintainers
- **Documentation**: Check this README and inline code comments

## Acknowledgments

Built with modern web technologies for the Vail community.

### Technology Credits

- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Supabase](https://supabase.com/) - Backend as a Service
- [Netlify](https://www.netlify.com/) - Hosting and serverless functions
- [Cloudinary](https://cloudinary.com/) - Image management
- [Sentry](https://sentry.io/) - Error tracking
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [SWR](https://swr.vercel.app/) - Data fetching

---

**Last Updated**: September 29, 2025
**Version**: 1.0.0
**Repository**: https://github.com/cr-nattress/vaillovehunt