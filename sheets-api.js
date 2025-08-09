// Google Sheets API Integration
class GoogleSheetsDB {
    constructor() {
        this.CLIENT_ID = ''; // Will be set during initialization
        this.API_KEY = ''; // Will be set during initialization
        this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
        this.spreadsheetId = null;
        this.isInitialized = false;
        this.isSignedIn = false;
    }

    async initialize(clientId, apiKey) {
        this.CLIENT_ID = clientId;
        this.API_KEY = apiKey;

        try {
            await gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    apiKey: this.API_KEY,
                    clientId: this.CLIENT_ID,
                    discoveryDocs: [this.DISCOVERY_DOC],
                    scope: this.SCOPES
                });

                this.isInitialized = true;
                this.authInstance = gapi.auth2.getAuthInstance();
                this.isSignedIn = this.authInstance.isSignedIn.get();
                
                // Listen for sign-in state changes
                this.authInstance.isSignedIn.listen(this.updateSigninStatus.bind(this));
                
                console.log('Google Sheets API initialized');
            });
        } catch (error) {
            console.error('Error initializing Google API:', error);
            throw error;
        }
    }

    updateSigninStatus(isSignedIn) {
        this.isSignedIn = isSignedIn;
        if (isSignedIn) {
            this.setupUserSpreadsheet();
        }
    }

    async signIn() {
        if (!this.isInitialized) {
            throw new Error('Google API not initialized');
        }
        
        try {
            await this.authInstance.signIn();
            return true;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        if (this.authInstance) {
            await this.authInstance.signOut();
            this.spreadsheetId = null;
            localStorage.removeItem('hoursly_spreadsheet_id');
        }
    }

    getCurrentUser() {
        if (!this.isSignedIn) return null;
        
        const user = this.authInstance.currentUser.get();
        const profile = user.getBasicProfile();
        
        return {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl()
        };
    }

    async setupUserSpreadsheet() {
        // Check if user already has a spreadsheet ID stored
        const storedSpreadsheetId = localStorage.getItem('hoursly_spreadsheet_id');
        
        if (storedSpreadsheetId) {
            // Verify the spreadsheet still exists and is accessible
            try {
                await this.getSpreadsheetInfo(storedSpreadsheetId);
                this.spreadsheetId = storedSpreadsheetId;
                console.log('Using existing spreadsheet:', this.spreadsheetId);
                return this.spreadsheetId;
            } catch (error) {
                console.log('Stored spreadsheet not accessible, creating new one');
                localStorage.removeItem('hoursly_spreadsheet_id');
            }
        }

        // Create new spreadsheet for the user
        return await this.createNewSpreadsheet();
    }

    async createNewSpreadsheet() {
        const user = this.getCurrentUser();
        const spreadsheetTitle = `Hoursly Timesheet - ${user.name}`;
        
        try {
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: spreadsheetTitle
                },
                sheets: [
                    {
                        properties: {
                            title: 'Time Entries',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 10
                            }
                        }
                    },
                    {
                        properties: {
                            title: 'Settings',
                            gridProperties: {
                                rowCount: 100,
                                columnCount: 5
                            }
                        }
                    }
                ]
            });

            this.spreadsheetId = response.result.spreadsheetId;
            localStorage.setItem('hoursly_spreadsheet_id', this.spreadsheetId);

            // Set up headers and initial data
            await this.setupSpreadsheetStructure();
            
            console.log('Created new spreadsheet:', this.spreadsheetId);
            return this.spreadsheetId;
        } catch (error) {
            console.error('Error creating spreadsheet:', error);
            throw error;
        }
    }

    async setupSpreadsheetStructure() {
        // Set up headers for Time Entries sheet
        const headers = [
            ['Date', 'Start Time', 'End Time', 'Break (min)', 'Total Minutes', 'Location', 'Overnight', 'Created At']
        ];

        // Set up Settings sheet
        const settings = [
            ['Setting', 'Value'],
            ['Pay Period Start Day', '20'],
            ['User Name', this.getCurrentUser().name],
            ['User Email', this.getCurrentUser().email]
        ];

        try {
            // Update Time Entries headers
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Time Entries!A1:H1',
                valueInputOption: 'RAW',
                resource: {
                    values: headers
                }
            });

            // Update Settings sheet
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Settings!A1:B4',
                valueInputOption: 'RAW',
                resource: {
                    values: settings
                }
            });

            // Format headers
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.2, green: 0.6, blue: 0.5 },
                                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)'
                            }
                        }
                    ]
                }
            });

        } catch (error) {
            console.error('Error setting up spreadsheet structure:', error);
            throw error;
        }
    }

    async getSpreadsheetInfo(spreadsheetId) {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId || this.spreadsheetId
            });
            return response.result;
        } catch (error) {
            console.error('Error getting spreadsheet info:', error);
            throw error;
        }
    }

    async addEntry(entry) {
        if (!this.spreadsheetId) {
            throw new Error('No spreadsheet available');
        }

        const row = [
            entry.date,
            entry.startTime,
            entry.endTime,
            entry.break || 0,
            entry.totalMinutes,
            entry.location || '',
            entry.overnight ? 'YES' : 'NO',
            new Date().toISOString()
        ];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Time Entries!A:H',
                valueInputOption: 'RAW',
                resource: {
                    values: [row]
                }
            });

            return response.result;
        } catch (error) {
            console.error('Error adding entry:', error);
            throw error;
        }
    }

    async getEntries(startDate = null, endDate = null) {
        if (!this.spreadsheetId) {
            throw new Error('No spreadsheet available');
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Time Entries!A2:H' // Skip header row
            });

            const rows = response.result.values || [];
            
            let entries = rows.map((row, index) => ({
                id: index + 2, // Row number (starting from 2)
                date: row[0] || '',
                startTime: row[1] || '',
                endTime: row[2] || '',
                break: parseInt(row[3]) || 0,
                totalMinutes: parseInt(row[4]) || 0,
                location: row[5] || '',
                overnight: row[6] === 'YES',
                createdAt: row[7] || ''
            }));

            // Filter by date range if provided
            if (startDate && endDate) {
                entries = entries.filter(entry => {
                    const entryDate = new Date(entry.date);
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    return entryDate >= start && entryDate <= end;
                });
            }

            // Sort by date and time (newest first)
            entries.sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                if (dateCompare !== 0) return dateCompare;
                return b.startTime.localeCompare(a.startTime);
            });

            return entries;
        } catch (error) {
            console.error('Error getting entries:', error);
            throw error;
        }
    }

    async updateEntry(entryId, updatedEntry) {
        if (!this.spreadsheetId) {
            throw new Error('No spreadsheet available');
        }

        const row = [
            updatedEntry.date,
            updatedEntry.startTime,
            updatedEntry.endTime,
            updatedEntry.break || 0,
            updatedEntry.totalMinutes,
            updatedEntry.location || '',
            updatedEntry.overnight ? 'YES' : 'NO',
            new Date().toISOString()
        ];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `Time Entries!A${entryId}:H${entryId}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [row]
                }
            });

            return response.result;
        } catch (error) {
            console.error('Error updating entry:', error);
            throw error;
        }
    }

    async deleteEntry(entryId) {
        if (!this.spreadsheetId) {
            throw new Error('No spreadsheet available');
        }

        try {
            // Get sheet ID for Time Entries
            const spreadsheetInfo = await this.getSpreadsheetInfo();
            const timeEntriesSheet = spreadsheetInfo.sheets.find(sheet => 
                sheet.properties.title === 'Time Entries'
            );
            const sheetId = timeEntriesSheet.properties.sheetId;

            // Delete the row
            const response = await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteDimension: {
                                range: {
                                    sheetId: sheetId,
                                    dimension: 'ROWS',
                                    startIndex: entryId - 1, // Convert to 0-based index
                                    endIndex: entryId
                                }
                            }
                        }
                    ]
                }
            });

            return response.result;
        } catch (error) {
            console.error('Error deleting entry:', error);
            throw error;
        }
    }

    async getSummary(startDate, endDate) {
        const entries = await this.getEntries(startDate, endDate);
        
        const totalMinutes = entries.reduce((sum, entry) => sum + entry.totalMinutes, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        return {
            totalHours,
            totalMinutes: remainingMinutes,
            totalMinutesRaw: totalMinutes,
            entryCount: entries.length
        };
    }

    async getSettings() {
        if (!this.spreadsheetId) {
            throw new Error('No spreadsheet available');
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Settings!A2:B10' // Skip header row
            });

            const rows = response.result.values || [];
            const settings = {};
            
            rows.forEach(row => {
                if (row[0] && row[1]) {
                    settings[row[0]] = row[1];
                }
            });

            return settings;
        } catch (error) {
            console.error('Error getting settings:', error);
            return { 'Pay Period Start Day': '20' }; // Default
        }
    }

    getSpreadsheetUrl() {
        if (!this.spreadsheetId) return null;
        return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
    }
}

// Global instance
window.sheetsDB = new GoogleSheetsDB();
