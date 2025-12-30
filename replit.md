# Lanchat - Language Learning Chat App

## Overview
Lanchat is a language learning chat application built with Expo React Native. The app helps users practice languages by chatting with other learners. This project has been configured to run in the Replit environment using Vite for web bundling instead of Expo Metro.

## Project Architecture

### Frontend
- **Framework**: React Native with React Native Web for browser support
- **Bundler**: Vite (configured for React Native Web compatibility)
- **Routing**: Originally Expo Router, adapted for web via Vite
- **Port**: 5000 (required for Replit proxy)

### Backend
- **Framework**: Hono
- **API**: tRPC for type-safe API calls
- **Port**: 3001 (internal, proxied through Vite)

### Directory Structure
```
/
├── app/                 # Expo Router screens (mobile)
├── backend/
│   └── server.ts        # Hono backend server with tRPC
├── src/
│   ├── main.tsx        # Vite entry point
│   └── App.tsx         # Main React component for web
├── lib/
│   └── trpc.ts         # tRPC client configuration
├── vite.config.ts      # Vite configuration with RN Web aliases
├── index.html          # HTML entry point for Vite
└── package.json        # Dependencies and scripts
```

## Key Technical Decisions

### Vite instead of Metro
The Expo Metro bundler was replaced with Vite due to file watcher resource limitations in the Replit environment. Vite is configured with:
- Polling-based file watching to avoid inotify limits
- Ignored directories (.cache, node_modules, .git)
- React Native Web aliases for web compatibility

### Concurrent Servers
The development workflow runs both servers concurrently:
- Backend (Hono/tRPC) on port 3001
- Frontend (Vite) on port 5000

## Running the App

### Development
```bash
bun run dev
```
This starts both the backend and frontend servers concurrently.

### Build for Production
```bash
bun run build
```

### Production Deployment
```bash
bun run start
```
This sets NODE_ENV=production and starts the backend server which:
- Serves the built static files from the `dist` directory
- Runs on port 5000 (required for Replit)
- Handles tRPC API calls at `/trpc/*`

## Recent Changes

### December 21, 2025
- Converted from Expo Metro to Vite for web bundling
- Fixed file watcher resource limits with polling and ignore patterns
- Updated @vitejs/plugin-react to version 4 for Node.js compatibility
- Configured concurrent server execution for backend and frontend
- Built complete web app with:
  - Login and Register screens
  - Community screen with user search and language filters
  - Chats list screen
  - Individual chat screen with messaging
  - Profile screen with logout
  - Tab-based navigation (Community, Chats, Profile)
- Integrated AuthContext for authentication state management
- Using mock data from mocks/users.ts for demo functionality
