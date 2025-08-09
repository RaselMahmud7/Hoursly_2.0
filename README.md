# Hoursly - Time Tracking Web Application

A modern, responsive time tracking web application built with HTML, Tailwind CSS, JavaScript, and Node.js with SQLite database.

## Features

- ⏰ **Time Entry Management**: Add, edit, and delete work entries
- 📊 **Pay Period Tracking**: Configurable pay periods with automatic calculations
- 🗂️ **Work Entries Listing**: View all entries with filtering options
- 📍 **Location Tracking**: Track work locations with location-wise totals
- 📤 **Export Options**: Export data to CSV and print as PDF
- 🌙 **Overnight Work Support**: Handle overnight shifts automatically
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 👤 **User Account Management**: Basic user settings and integrations panel

## Technology Stack

### Frontend
- **HTML5**: Semantic markup structure
- **Tailwind CSS**: Utility-first CSS framework for styling
- **JavaScript (ES6+)**: Modern JavaScript for interactive functionality
- **Font Awesome**: Icon library for UI elements

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Web framework for API endpoints
- **SQLite3**: Lightweight database for data persistence
- **CORS**: Cross-origin resource sharing support

## Project Structure

```
Hoursly 2.0/
├── index.html          # Main dashboard page
├── entries.html        # Work entries listing page
├── script.js           # Main dashboard JavaScript
├── entries.js          # Entries page JavaScript
├── server.js           # Express server and API routes
├── init-db.js          # Database initialization script
├── package.json        # Node.js dependencies and scripts
├── hoursly.db          # SQLite database file (created after setup)
└── README.md           # This file
```

## Setup Instructions

### Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone or download the project** to your local machine

2. **Open terminal/command prompt** and navigate to the project directory:
   ```bash
   cd "Hoursly 2.0"
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Initialize the database**:
   ```bash
   npm run init-db
   ```

5. **Start the server**:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

The application provides a REST API with the following endpoints:

### Work Entries
- `GET /api/entries` - Get all work entries
- `GET /api/entries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get filtered entries
- `GET /api/entries/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get hours summary
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:id` - Update existing entry
- `DELETE /api/entries/:id` - Delete entry

### User Settings
- `GET /api/user` - Get user information
- `PUT /api/user` - Update user settings

## Usage Guide

### Adding Time Entries

1. On the main dashboard, fill in the time entry form:
   - **Date**: Select the work date
   - **Start Time**: Enter when you started work
   - **End Time**: Enter when you finished work
   - **Break**: Enter break time in minutes (optional)
   - **Location**: Enter work location (optional)
   - **Overnight Work**: Check if work continues to next day

2. Click **"Add Entry"** to save

### Viewing Entries

1. Click **"View Entries"** from the main dashboard
2. Use date filters to view specific periods:
   - **Period Filter**: Select start and end dates, then click "Filter"
   - **Show All**: View all entries without date filtering
   - **Current Time**: Filter to current pay period

### Editing Entries

1. In the entries page, click **"Edit"** next to any entry
2. Modify the details in the modal dialog
3. Click **"Save Changes"** to update

### Deleting Entries

1. Click **"Delete"** next to any entry
2. Confirm the deletion in the dialog

### Exporting Data

- **CSV Export**: Click "CSV" button to download entries as CSV file
- **PDF Export**: Click "Print as PDF" to print or save as PDF

### Pay Period Management

1. Click **"Edit"** next to the pay period start day
2. Enter a new day (1-31) when prompted
3. The summary will automatically recalculate

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    pay_period_start_day INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Work Entries Table
```sql
CREATE TABLE work_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    location TEXT,
    overnight BOOLEAN DEFAULT 0,
    total_minutes INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Customization

### Styling
- The application uses Tailwind CSS for styling
- Colors can be customized by modifying the Tailwind classes
- The primary color scheme uses teal (`teal-500`, `teal-600`, etc.)

### Database
- SQLite database file is stored as `hoursly.db` in the project root
- Database can be viewed/edited using SQLite browser tools
- Backup the database file regularly to prevent data loss

### User Information
- Default user is created during database initialization
- User details can be modified through the API or directly in the database

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Change the PORT in `server.js` or stop other applications using port 3000

2. **Database connection errors**:
   - Ensure `hoursly.db` exists (run `npm run init-db`)
   - Check file permissions in the project directory

3. **CSS not loading**:
   - Ensure internet connection for Tailwind CSS CDN
   - Check browser console for any loading errors

4. **API errors**:
   - Verify the server is running on `http://localhost:3000`
   - Check browser network tab for failed requests
   - Review server console for error messages

### Development Tips

- Use browser developer tools to debug JavaScript issues
- Check the browser console for error messages
- Monitor the server console for API request logs
- Use `npm run dev` for automatic server restart during development

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser and server console logs
3. Verify all setup steps were completed correctly

---

**Happy time tracking with Hoursly! ⏰**
