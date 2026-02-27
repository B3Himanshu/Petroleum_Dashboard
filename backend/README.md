# Petroleum Dashboard Backend API

Backend API server for the Petroleum Business Performance Dashboard.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your database connection details:

```env
DATABASE_URL=postgresql://username:password@host:port/database

# OR use individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petroleum_db
DB_USER=your_username
DB_PASSWORD=your_password

PORT=3001
FRONTEND_URL=http://localhost:8080
```

### 3. Explore Database Structure

Before connecting the frontend, explore your database to understand its structure:

```bash
npm run test-db
```

This will:
- List all schemas
- List all tables with their columns
- Show primary keys and foreign keys
- Display sample data
- List views and indexes

**Important:** Review the output and update the route files (`routes/sites.js` and `routes/dashboard.js`) with the correct table and column names.

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## 📋 API Endpoints

### Health Check
- `GET /health` - Check server and database connection status

### Sites
- `GET /api/sites` - Get all sites
- `GET /api/sites/:id` - Get site by ID
- `GET /api/sites/city/:cityId` - Get sites by city
- `GET /api/sites/cities/list` - Get list of unique cities

### Dashboard
- `GET /api/dashboard/metrics?siteId=1&month=12&year=2024` - Get dashboard metrics
- `GET /api/dashboard/charts/monthly-performance?siteId=1&year=2024` - Get monthly performance data
- `GET /api/dashboard/charts/sales-distribution?siteId=1&month=12&year=2024` - Get sales distribution
- `GET /api/dashboard/status?siteId=1` - Get status cards data

## 🔍 Database Exploration

The `test.js` script helps you understand your database structure:

```bash
npm run test-db
```

**What it does:**
1. Connects to your database
2. Lists all schemas
3. Lists all tables with detailed column information
4. Shows primary keys and foreign key relationships
5. Displays row counts and sample data
6. Lists views and indexes

**After running test.js:**
1. Review the output to understand your database structure
2. Update the SQL queries in `routes/sites.js` and `routes/dashboard.js`
3. Adjust table names and column names to match your actual database
4. Test the API endpoints

## 📝 Next Steps

1. **Run test.js** to explore your database:
   ```bash
   npm run test-db
   ```

2. **Update route files** with correct table/column names based on test.js output

3. **Test API endpoints** using:
   - Browser: `http://localhost:3001/health`
   - Postman/Thunder Client
   - curl: `curl http://localhost:3001/api/sites`

4. **Connect frontend** by updating API calls in your React components

## 🛠️ Project Structure

```
backend/
├── config/
│   └── database.js       # Database connection configuration
├── routes/
│   ├── sites.js          # Sites API routes
│   └── dashboard.js      # Dashboard API routes
├── test.js               # Database exploration script
├── server.js             # Express server setup
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (create this)
└── README.md             # This file
```

## 🔧 Troubleshooting

### Database Connection Issues

1. **Check .env file** - Ensure DATABASE_URL or DB_* variables are correct
2. **Verify PostgreSQL is running** - `pg_isready` or check service status
3. **Test connection** - Run `npm run test-db` to diagnose issues
4. **Check firewall** - Ensure port 5432 (or your DB port) is accessible

### Common Errors

- **"relation does not exist"** - Table name mismatch, update queries in route files
- **"password authentication failed"** - Check DB_USER and DB_PASSWORD in .env
- **"connection refused"** - PostgreSQL not running or wrong host/port

## 📚 Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 🔐 Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Consider using connection pooling for production
- Implement proper authentication/authorization for production use

