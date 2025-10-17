# Database Commands Reference

## 🏠 Local Database (PostgreSQL)

### Setup & Migration
```bash
npm run setup-local-db    # Create local database
npm run migrate:local     # Run migrations on local DB
npm run seed:local        # Add sample data to local DB
```

### Development
```bash
npm run dev              # Start server with local database
```

### Utilities
```bash
npm run fix-migrations   # Fix migration issues
npm run reset-db        # Reset local database completely
```

## ☁️ Neon Database (Production)

### Migration & Setup
```bash
npm run migrate:neon     # Run migrations on Neon DB
npm run seed:neon        # Add sample data to Neon DB
npm run test:neon        # Test Neon connection & subjects table
```

### Development
```bash
npm run dev:neon         # Start server with Neon database
```

## 📋 Quick Start Guide

### For Local Development:
1. `npm run setup-local-db`
2. `npm run migrate:local`
3. `npm run seed:local`
4. `npm run dev`

### For Neon Development:
1. `npm run migrate:neon`
2. `npm run seed:neon`
3. `npm run dev:neon`

### To Add Subjects Feature to Neon:
1. `npm run migrate:neon`  # Creates subjects table
2. `npm run test:neon`     # Verify table exists
3. `npm run dev:neon`      # Start with Neon DB

## 🔧 Environment Files

- **Local**: `.env.local` (PostgreSQL localhost)
- **Neon**: `.env.production` (Neon cloud database)

## 🚀 Production Deployment

The `npm start` command automatically uses production environment for deployment platforms like Render, Vercel, etc.