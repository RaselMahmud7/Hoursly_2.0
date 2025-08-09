// Database initialization script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hoursly.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        pay_period_start_day INTEGER DEFAULT 20,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Work entries table
    db.run(`CREATE TABLE IF NOT EXISTS work_entries (
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
    )`);

    // Insert default user
    db.run(`INSERT OR IGNORE INTO users (id, name, email) VALUES (1, 'Rasel', 'r.mahmud2207@gmail.com')`);

    // Insert sample data for demonstration
    db.run(`INSERT OR IGNORE INTO work_entries 
        (id, date, start_time, end_time, break_minutes, location, total_minutes) 
        VALUES (1, '2025-08-09', '04:00', '08:00', 0, 'dk', 240)`);

    console.log('Database tables created successfully!');
});

// Close database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
        return;
    }
    console.log('Database connection closed.');
});
