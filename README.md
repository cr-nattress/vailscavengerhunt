# Vail Scavenger Hunt

A modern, team-based scavenger hunt application designed for exploring Vail, Colorado through interactive challenges and location-based activities.

## Overview

Vail Scavenger Hunt is a progressive web application that enables organizations to host engaging team-based scavenger hunts. Teams use verification codes to join hunts, visit various stops around Vail, complete challenges, upload photos, and track their progress on a real-time leaderboard.

### Key Features

- 🎯 **Team-Based Participation** - Secure team verification with unique access codes
- 📍 **Location-Based Challenges** - Multiple stops with various challenge types
- 📸 **Photo Challenges** - Upload and validate photo submissions for specific tasks
- 🏆 **Real-Time Leaderboard** - Track team rankings and completion percentages
- 👥 **Team Synchronization** - Progress syncs across all team members in real-time
- 🔒 **Device Lock System** - Prevents participants from joining multiple teams
- 💾 **Persistent Progress** - All progress saved to cloud storage
- 📱 **Mobile-First Design** - Optimized for smartphones and tablets
- 🌐 **Offline Capable** - Works with limited connectivity

## Architecture

### Tech Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR
- **Routing**: React Router

#### Backend
- **Functions**: Netlify Functions (Serverless)
- **Development Server**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based team tokens
- **File Storage**: Cloudinary (images)

#### Infrastructure
- **Hosting**: Netlify
- **Error Tracking**: Sentry
- **Analytics**: Custom event tracking

### Data Model

```
Organizations (e.g., "bhhs")
  └── Hunts (e.g., "fall-2025")
      └── Teams (unique ID + display name)
          ├── Team Members (via shared team code)
          ├── Progress (completed stops)
          └── Settings (preferences)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Cloudinary account (for image uploads)
- Netlify CLI (for serverless functions)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn

# Server
PORT=3001
```

### Installation

```bash
# Clone the repository
git clone https://github.com/cr-nattress/vailscavengerhunt.git
cd vailscavengerhunt

# Install dependencies
npm install

# Install Netlify Functions dependencies
cd netlify/functions
npm install
cd ../..
```

### Development

Run the application in development mode with hot reload:

```bash
# Start both frontend and backend
npm run dev

# Or run them separately:
npm run client:dev  # Frontend only (port 5173)
npm run server:dev  # Backend only (port 3001)
npm run netlify:dev # Netlify Functions (port 8888)
```

### Database Setup

Run the Supabase migration scripts:

```bash
# Create tables and indexes
npm run setup:supabase

# Verify setup
npm run validate:supabase
```

## Project Structure

```
vail-scavenger-hunt/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── components/             # Reusable UI components
│   ├── features/              # Feature-specific components
│   │   ├── app/              # Core app features
│   │   ├── stops/            # Stop-related features
│   │   └── teamLock/         # Team verification
│   ├── services/             # API and service layers
│   ├── store/                # Zustand state management
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript definitions
├── netlify/
│   └── functions/            # Serverless functions
│       └── _lib/            # Shared function utilities
├── scripts/                  # Build and migration scripts
├── public/                   # Static assets
└── tests/                    # Test suites
```

## Features in Detail

### Team Verification Flow
1. User enters team verification code
2. System validates code and issues JWT token
3. Device lock prevents multi-team participation
4. Team settings and progress are initialized

### Progress Tracking
- Stops marked as complete/incomplete
- Optional notes and timestamps
- Photo validation for specific challenges
- Real-time sync across team members

### Leaderboard System
- Rankings based on completion percentage
- Tie-breaking by completion time
- Filter by organization and hunt
- Real-time updates

## API Documentation

### Key Endpoints

#### Team Management
- `POST /api/team-verify` - Verify team code and get access token
- `GET /api/team-current` - Get current team information

#### Progress
- `GET /api/progress/{org}/{team}/{hunt}` - Get team progress
- `POST /api/progress` - Update team progress

#### Settings
- `GET /api/settings/{org}/{team}/{hunt}` - Get team settings
- `POST /api/settings/{org}/{team}/{hunt}` - Update settings

#### Leaderboard
- `GET /api/leaderboard?orgId={org}&huntId={hunt}` - Get rankings

## Deployment

### Netlify Deployment

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

### Environment Configuration

Configure environment variables in Netlify:
1. Go to Site Settings > Environment Variables
2. Add all variables from `.env`
3. Trigger redeploy

## Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run test` - Run test suite
- `npm run setup:supabase` - Initialize database
- `npm run validate:supabase` - Verify database setup

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

## Testing

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

**Team verification fails**
- Check team code is correct and active
- Verify Supabase connection
- Check browser localStorage for conflicts

**Progress not syncing**
- Verify network connection
- Check browser console for errors
- Confirm team token is valid

**Images not uploading**
- Verify Cloudinary configuration
- Check file size limits (10MB max)
- Ensure correct file format (JPG, PNG)

## Security Considerations

- Team codes expire after configured duration
- Device fingerprinting prevents multi-team abuse
- All API endpoints validate team tokens
- Sensitive data stored in environment variables
- Supabase Row Level Security enabled

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation

## Acknowledgments

Built with modern web technologies and best practices for a seamless scavenger hunt experience in beautiful Vail, Colorado.