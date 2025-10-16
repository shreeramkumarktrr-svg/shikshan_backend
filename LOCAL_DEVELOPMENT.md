# Local Development Setup

This guide helps you set up the backend for local development using a local PostgreSQL database.

## Prerequisites

1. **PostgreSQL** installed and running locally
2. **Node.js** (v16 or higher)
3. **npm** or **yarn**

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Local Database
```bash
node setup-local-db.js
```

### 3. Run Migrations
```bash
npm run migrate:local
```

### 4. Seed Database (Optional)
```bash
npm run seed:local
```

### 5. Start Development Server
```bash
npm run dev
```

## Environment Configuration

### Local Development (.env.local)
- Uses local PostgreSQL database
- Database: `shikshan_dev`
- Host: `localhost`
- Port: `5432`

### Production (.env)
- Uses Neon cloud database
- Automatically used by Render deployment

## Available Scripts

- `npm run dev` - Start with local database (.env.local)
- `npm run dev:neon` - Start with Neon database (.env)
- `npm run migrate:local` - Run migrations on local database
- `npm run seed:local` - Seed local database
- `npm start` - Production start (uses .env)

## Database Configuration

### Local PostgreSQL Setup
1. Install PostgreSQL locally
2. Create a user (default: postgres/Shree123)
3. Run the setup script: `node setup-local-db.js`

### Switching Between Databases
- **Local Development**: `npm run dev`
- **Test with Neon**: `npm run dev:neon`

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running: `pg_ctl status`
2. Check credentials in `.env.local`
3. Test connection: `psql -h localhost -U postgres -d shikshan_dev`

### Migration Issues
1. Check database exists: `npm run setup-local-db`
2. Run migrations: `npm run migrate:local`
3. Check migration status: `npx sequelize-cli db:migrate:status --env development`

## File Structure
```
backend/
├── .env              # Production environment (Neon)
├── .env.local        # Local development environment
├── setup-local-db.js # Local database setup script
└── config/
    └── database.js   # Database configuration
```

## Notes
- `.env.local` is gitignored and won't be committed
- Production deployment uses `.env` automatically
- Local development uses `.env.local` automatically