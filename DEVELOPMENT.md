# EduRPG Development Environment Setup

## Quick Start

1. **Setup Environment**
   ```bash
   # Windows
   setup-dev.bat
   
   # Or manually
   npm run setup:dev
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **If Port 3000 is Busy**
   ```bash
   npm run dev:port  # Uses port 3001
   ```

## Development Scripts

- `npm run dev` - Start development server on port 3000
- `npm run dev:clean` - Clean build cache and start dev server
- `npm run dev:port` - Start dev server on port 3001 (if 3000 is busy)
- `npm run setup:dev` - Setup development environment
- `npm run clean` - Clean build cache and node modules cache

## Fixed Issues

### ✅ Port Configuration
- Added port conflict resolution
- Alternative port (3001) available
- Process cleanup scripts

### ✅ MIME Type Errors
- Proper headers configuration in next.config.ts
- Static file caching headers
- SVG handling improvements

### ✅ Browser Console Errors
- Reduced console noise in development
- Better error boundary handling
- Conditional logging based on NODE_ENV

### ✅ Browser Extension Conflicts
- Disabled host checking in development
- Proper CORS headers
- Webpack configuration for development

## Environment Variables

The development environment uses `dev.env` file with safe defaults:
- Database: PostgreSQL on localhost:5432
- NextAuth: Development secret keys
- Logging: INFO level
- Test mode: Enabled

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use alternative port
npm run dev:port
```

### Build Cache Issues
```bash
npm run clean
npm run dev:clean
```

### Environment Issues
```bash
npm run setup:dev
```

## Development Features

- Hot reload enabled
- Source maps for debugging
- Error boundaries for graceful error handling
- Development-specific logging
- Optimized webpack configuration
- Proper MIME type handling
- Browser extension compatibility
