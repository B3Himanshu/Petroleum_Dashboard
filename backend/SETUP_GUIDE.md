# Backend Setup Guide

## 📋 Complete TODO Checklist

### ✅ Completed
- [x] Set up Node.js backend project structure
- [x] Create .env file for database URL and configuration
- [x] Create database connection module
- [x] Create test.js script to explore database
- [x] Create Express server with basic setup
- [x] Create API endpoints for sites, cities, and dashboard data
- [x] Add CORS middleware for frontend connection

### 🔄 Next Steps (Do These Now)

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Database Connection**
   - Create `.env` file (copy from `.env.example` if needed)
   - Add your database connection string:
     ```env
     DATABASE_URL=postgresql://username:password@host:port/database
     ```
   - OR use individual settings:
     ```env
     DB_HOST=your_host
     DB_PORT=5432
     DB_NAME=your_database
     DB_USER=your_username
     DB_PASSWORD=your_password
     ```

3. **Explore Your Database** ⚠️ **IMPORTANT - DO THIS FIRST**
   ```bash
   npm run test-db
   ```
   
   This will show you:
   - All tables in your database
   - Column names and types
   - Primary keys and foreign keys
   - Sample data
   - Row counts

4. **Update Route Files Based on Database Structure**
   
   After running `test.js`, you'll see your actual database structure. Update these files:
   
   - `routes/sites.js` - Update table name and column names
   - `routes/dashboard.js` - Update queries based on your actual tables
   
   **Example:** If your table is called `service_stations` instead of `sites`, update:
   ```javascript
   // Change from:
   FROM sites
   
   // To:
   FROM service_stations
   ```

5. **Start the Server**
   ```bash
   npm run dev
   ```

6. **Test the API**
   - Health check: `http://localhost:3001/health`
   - Get sites: `http://localhost:3001/api/sites`
   - Test in browser or use Postman/Thunder Client

7. **Connect Frontend**
   - Update frontend API calls to point to `http://localhost:3001`
   - Test the connection

## 🔍 Understanding Your Database

The `test.js` script will help you understand:

### What to Look For:

1. **Table Names**
   - What are your actual table names?
   - Example: `sites`, `service_stations`, `locations`, etc.

2. **Column Names**
   - How are columns named? (snake_case, camelCase, etc.)
   - Example: `post_code` vs `postCode` vs `postcode`

3. **Primary Keys**
   - Which column is the primary key?
   - Example: `id`, `site_id`, `location_id`

4. **Data Types**
   - What data types are used?
   - Example: `INTEGER`, `VARCHAR`, `DECIMAL`, `DATE`

5. **Relationships**
   - Are there foreign keys?
   - How are tables related?

## 📝 Example: Updating Routes After test.js

### Before (Generic):
```javascript
const result = await query(`
  SELECT id, name, post_code as "postCode", city
  FROM sites
  ORDER BY id;
`);
```

### After (Based on Your Database):
```javascript
// If your table is 'service_stations' with columns 'site_id', 'site_name', 'postcode', 'city_name'
const result = await query(`
  SELECT 
    site_id as id,
    site_name as name,
    postcode as "postCode",
    city_name as city
  FROM service_stations
  ORDER BY site_id;
`);
```

## 🚨 Common Issues & Solutions

### Issue: "relation does not exist"
**Solution:** Table name is wrong. Check test.js output and update route files.

### Issue: "column does not exist"
**Solution:** Column name is wrong. Check test.js output for actual column names.

### Issue: "password authentication failed"
**Solution:** Check your `.env` file - DB_USER and DB_PASSWORD must be correct.

### Issue: "connection refused"
**Solution:** 
- PostgreSQL might not be running
- Check DB_HOST and DB_PORT in `.env`
- Verify firewall settings

## 📊 Database Schema Documentation

After running `test.js`, document your findings here:

### Tables Found:
- [ ] Table 1: `_____________` (Purpose: _____________)
- [ ] Table 2: `_____________` (Purpose: _____________)
- [ ] Table 3: `_____________` (Purpose: _____________)

### Key Tables for Dashboard:
- **Sites Table:** `_____________`
- **Metrics Table:** `_____________`
- **Sales Table:** `_____________`

### Important Columns:
- Site ID: `_____________`
- Site Name: `_____________`
- City: `_____________`
- Sales Data: `_____________`

## 🎯 Quick Reference

### Start Database Exploration:
```bash
npm run test-db
```

### Start Development Server:
```bash
npm run dev
```

### Test Health Endpoint:
```bash
curl http://localhost:3001/health
```

### Test Sites Endpoint:
```bash
curl http://localhost:3001/api/sites
```

## 📞 Need Help?

1. Run `test.js` first - it will show you everything about your database
2. Check the error messages - they usually tell you what's wrong
3. Compare your database structure with the route files
4. Update the SQL queries to match your actual database

