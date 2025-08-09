// Express server for Hoursly API
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Database connection
const dbPath = path.join(__dirname, 'hoursly.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Helper function to calculate hours
function calculateHours(startTime, endTime, breakMinutes, overnight = false) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);
    
    let endDate = new Date();
    endDate.setHours(endHour, endMin, 0, 0);
    
    // If overnight work or end time is before start time, add a day
    if (overnight || endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }
    
    const diffMs = endDate - startDate;
    const totalMinutes = Math.floor(diffMs / (1000 * 60)) - (breakMinutes || 0);
    
    return Math.max(0, totalMinutes); // Ensure non-negative
}

// Routes

// Get all work entries
app.get('/api/entries', (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query = `SELECT * FROM work_entries ORDER BY date DESC, start_time DESC`;
    let params = [];
    
    if (startDate && endDate) {
        query = `SELECT * FROM work_entries WHERE date BETWEEN ? AND ? ORDER BY date DESC, start_time DESC`;
        params = [startDate, endDate];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching entries:', err.message);
            res.status(500).json({ error: 'Failed to fetch entries' });
            return;
        }
        res.json(rows);
    });
});

// Get work entries summary
app.get('/api/entries/summary', (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
    }
    
    const query = `SELECT SUM(total_minutes) as totalMinutes FROM work_entries WHERE date BETWEEN ? AND ?`;
    
    db.get(query, [startDate, endDate], (err, row) => {
        if (err) {
            console.error('Error fetching summary:', err.message);
            res.status(500).json({ error: 'Failed to fetch summary' });
            return;
        }
        
        const totalMinutes = row.totalMinutes || 0;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        res.json({
            totalHours,
            totalMinutes: remainingMinutes,
            totalMinutesRaw: totalMinutes
        });
    });
});

// Create new work entry
app.post('/api/entries', (req, res) => {
    const { date, startTime, endTime, break: breakMinutes, location, overnight } = req.body;
    
    if (!date || !startTime || !endTime) {
        res.status(400).json({ error: 'Date, start time, and end time are required' });
        return;
    }
    
    // Calculate total minutes
    const totalMinutes = calculateHours(startTime, endTime, breakMinutes, overnight);
    
    const query = `INSERT INTO work_entries 
        (date, start_time, end_time, break_minutes, location, overnight, total_minutes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        date,
        startTime,
        endTime,
        breakMinutes || 0,
        location || '',
        overnight ? 1 : 0,
        totalMinutes
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Error creating entry:', err.message);
            res.status(500).json({ error: 'Failed to create entry' });
            return;
        }
        
        res.status(201).json({
            id: this.lastID,
            message: 'Entry created successfully'
        });
    });
});

// Update work entry
app.put('/api/entries/:id', (req, res) => {
    const entryId = req.params.id;
    const { date, startTime, endTime, break: breakMinutes, location, overnight } = req.body;
    
    if (!date || !startTime || !endTime) {
        res.status(400).json({ error: 'Date, start time, and end time are required' });
        return;
    }
    
    // Calculate total minutes
    const totalMinutes = calculateHours(startTime, endTime, breakMinutes, overnight);
    
    const query = `UPDATE work_entries 
        SET date = ?, start_time = ?, end_time = ?, break_minutes = ?, 
            location = ?, overnight = ?, total_minutes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const params = [
        date,
        startTime,
        endTime,
        breakMinutes || 0,
        location || '',
        overnight ? 1 : 0,
        totalMinutes,
        entryId
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating entry:', err.message);
            res.status(500).json({ error: 'Failed to update entry' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Entry not found' });
            return;
        }
        
        res.json({ message: 'Entry updated successfully' });
    });
});

// Delete work entry
app.delete('/api/entries/:id', (req, res) => {
    const entryId = req.params.id;
    
    const query = `DELETE FROM work_entries WHERE id = ?`;
    
    db.run(query, [entryId], function(err) {
        if (err) {
            console.error('Error deleting entry:', err.message);
            res.status(500).json({ error: 'Failed to delete entry' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Entry not found' });
            return;
        }
        
        res.json({ message: 'Entry deleted successfully' });
    });
});

// Get user settings
app.get('/api/user', (req, res) => {
    const query = `SELECT * FROM users WHERE id = 1`;
    
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            res.status(500).json({ error: 'Failed to fetch user' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        
        res.json(row);
    });
});

// Update user settings
app.put('/api/user', (req, res) => {
    const { name, email, payPeriodStartDay } = req.body;
    
    const query = `UPDATE users 
        SET name = ?, email = ?, pay_period_start_day = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`;
    
    const params = [name, email, payPeriodStartDay];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating user:', err.message);
            res.status(500).json({ error: 'Failed to update user' });
            return;
        }
        
        res.json({ message: 'User updated successfully' });
    });
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/entries', (req, res) => {
    res.sendFile(path.join(__dirname, 'entries.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API endpoints available at:');
    console.log(`  GET    http://localhost:${PORT}/api/entries`);
    console.log(`  POST   http://localhost:${PORT}/api/entries`);
    console.log(`  PUT    http://localhost:${PORT}/api/entries/:id`);
    console.log(`  DELETE http://localhost:${PORT}/api/entries/:id`);
    console.log(`  GET    http://localhost:${PORT}/api/user`);
    console.log(`  PUT    http://localhost:${PORT}/api/user`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
