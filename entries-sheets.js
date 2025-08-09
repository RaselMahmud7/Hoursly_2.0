// Work entries page JavaScript with Google Sheets integration
class EntriesPage {
    constructor() {
        this.entries = [];
        this.filteredEntries = [];
        this.currentUser = null;
        this.isGoogleApiReady = false;
        this.init();
    }

    async init() {
        try {
            // Initialize Google API if not in demo mode
            if (!CONFIG.DEMO_MODE) {
                await this.initializeGoogleAPI();
            } else {
                this.isGoogleApiReady = true;
            }
            
            this.checkAuthentication();
            this.setupEventListeners();
            await this.loadEntries();
            this.setDefaultDateRange();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize. Check your Google API configuration.', 'error');
        }
    }

    async initializeGoogleAPI() {
        if (CONFIG.GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
            throw new Error('Google API credentials not configured');
        }

        try {
            await sheetsDB.initialize(CONFIG.GOOGLE_CLIENT_ID, CONFIG.GOOGLE_API_KEY);
            this.isGoogleApiReady = true;
        } catch (error) {
            console.error('Google API initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Filtering
        document.getElementById('filterBtn').addEventListener('click', () => {
            this.filterEntries();
        });

        document.getElementById('showAllBtn').addEventListener('click', () => {
            this.showAllEntries();
        });

        document.getElementById('currentTimeBtn').addEventListener('click', () => {
            this.filterCurrentPayPeriod();
        });

        // Export
        document.getElementById('csvExport').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('pdfExport').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Edit modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editEntryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedEntry();
        });
    }

    setDefaultDateRange() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('endDate').value = lastDay.toISOString().split('T')[0];
    }

    async loadEntries() {
        try {
            if (CONFIG.DEMO_MODE) {
                this.entries = await this.getEntriesFromLocalStorage();
            } else if (sheetsDB.isSignedIn) {
                this.entries = await sheetsDB.getEntries();
            } else {
                this.entries = [];
                this.showConnectPrompt();
                return;
            }
            
            this.filteredEntries = [...this.entries];
            this.renderEntries();
            this.updateLocationTotals();
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showEmptyState();
        }
    }

    async getEntriesFromLocalStorage() {
        const entries = JSON.parse(localStorage.getItem('hoursly_entries') || '[]');
        return entries.map((entry, index) => ({
            ...entry,
            id: entry.id || index + 1
        }));
    }

    showConnectPrompt() {
        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="text-gray-500">
                        <i class="fab fa-google text-4xl mb-4 block"></i>
                        <h3 class="text-lg font-medium mb-2">Connect Google Sheets</h3>
                        <p class="mb-4">Sign in to Google to view your timesheet entries</p>
                        <button id="connectFromEntries" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            <i class="fab fa-google mr-2"></i>Connect Google Sheets
                        </button>
                    </div>
                </td>
            </tr>
        `;

        document.getElementById('connectFromEntries').addEventListener('click', async () => {
            try {
                await sheetsDB.signIn();
                await this.loadEntries();
            } catch (error) {
                this.showNotification('Failed to connect to Google Sheets', 'error');
            }
        });
    }

    renderEntries() {
        const tbody = document.getElementById('entriesTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredEntries.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        tbody.innerHTML = this.filteredEntries.map(entry => this.createEntryRow(entry)).join('');
        
        // Add event listeners for edit and delete buttons
        this.filteredEntries.forEach(entry => {
            const editBtn = document.getElementById(`edit-${entry.id}`);
            const deleteBtn = document.getElementById(`delete-${entry.id}`);
            
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.editEntry(entry);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteEntry(entry.id);
                });
            }
        });
    }

    createEntryRow(entry) {
        const date = new Date(entry.date).toLocaleDateString();
        const hours = Math.floor((entry.totalMinutes || 0) / 60);
        const minutes = (entry.totalMinutes || 0) % 60;
        const hoursDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;
        const breakDisplay = entry.break ? `${entry.break}m` : '0m';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.startTime || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.endTime || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${breakDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-600">${hoursDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.location || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button id="edit-${entry.id}" class="text-gray-600 hover:text-gray-900 mr-3">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button id="delete-${entry.id}" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }

    filterEntries() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        this.filteredEntries = this.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return entryDate >= start && entryDate <= end;
        });

        this.renderEntries();
        this.updateLocationTotals();
    }

    showAllEntries() {
        this.filteredEntries = [...this.entries];
        this.renderEntries();
        this.updateLocationTotals();
        
        // Clear date filters
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
    }

    filterCurrentPayPeriod() {
        const payPeriodStartDay = parseInt(localStorage.getItem('payPeriodStartDay')) || 20;
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let startDate, endDate;
        
        if (currentDay >= payPeriodStartDay) {
            startDate = new Date(currentYear, currentMonth, payPeriodStartDay);
            endDate = new Date(currentYear, currentMonth + 1, payPeriodStartDay - 1);
        } else {
            startDate = new Date(currentYear, currentMonth - 1, payPeriodStartDay);
            endDate = new Date(currentYear, currentMonth, payPeriodStartDay - 1);
        }

        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        
        this.filterEntries();
    }

    updateLocationTotals() {
        const locationTotals = {};
        
        this.filteredEntries.forEach(entry => {
            const location = entry.location || 'Unknown';
            if (!locationTotals[location]) {
                locationTotals[location] = 0;
            }
            locationTotals[location] += entry.totalMinutes || 0;
        });

        const tbody = document.getElementById('locationTotalsBody');
        tbody.innerHTML = Object.entries(locationTotals).map(([location, totalMinutes]) => {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const display = `${hours}h ${minutes}m`;
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${location}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-600">${display}</td>
                </tr>
            `;
        }).join('');
    }

    editEntry(entry) {
        document.getElementById('editEntryId').value = entry.id;
        document.getElementById('editDate').value = entry.date;
        document.getElementById('editStartTime').value = entry.startTime;
        document.getElementById('editEndTime').value = entry.endTime;
        document.getElementById('editBreak').value = entry.break || '';
        document.getElementById('editLocation').value = entry.location || '';
        
        document.getElementById('editModal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('editModal').classList.add('hidden');
    }

    async saveEditedEntry() {
        const entryId = document.getElementById('editEntryId').value;
        
        const updatedEntry = {
            date: document.getElementById('editDate').value,
            startTime: document.getElementById('editStartTime').value,
            endTime: document.getElementById('editEndTime').value,
            break: parseInt(document.getElementById('editBreak').value) || 0,
            location: document.getElementById('editLocation').value || ''
        };

        // Calculate hours
        const hours = this.calculateHours(updatedEntry.startTime, updatedEntry.endTime, updatedEntry.break);
        updatedEntry.totalMinutes = hours.totalMinutes;

        try {
            if (CONFIG.DEMO_MODE) {
                await this.updateEntryInLocalStorage(entryId, updatedEntry);
            } else {
                await sheetsDB.updateEntry(entryId, updatedEntry);
            }

            this.closeEditModal();
            await this.loadEntries();
            this.showNotification('Entry updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating entry:', error);
            this.showNotification('Failed to update entry. Please try again.', 'error');
        }
    }

    async updateEntryInLocalStorage(entryId, updatedEntry) {
        const entries = JSON.parse(localStorage.getItem('hoursly_entries') || '[]');
        const index = entries.findIndex(entry => entry.id == entryId);
        
        if (index !== -1) {
            entries[index] = { ...entries[index], ...updatedEntry };
            localStorage.setItem('hoursly_entries', JSON.stringify(entries));
        }
    }

    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) {
            return;
        }

        try {
            if (CONFIG.DEMO_MODE) {
                await this.deleteEntryFromLocalStorage(entryId);
            } else {
                await sheetsDB.deleteEntry(entryId);
            }

            await this.loadEntries();
            this.showNotification('Entry deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showNotification('Failed to delete entry. Please try again.', 'error');
        }
    }

    async deleteEntryFromLocalStorage(entryId) {
        const entries = JSON.parse(localStorage.getItem('hoursly_entries') || '[]');
        const filteredEntries = entries.filter(entry => entry.id != entryId);
        localStorage.setItem('hoursly_entries', JSON.stringify(filteredEntries));
    }

    calculateHours(startTime, endTime, breakMinutes, overnight = false) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let startDate = new Date();
        startDate.setHours(startHour, startMin, 0, 0);
        
        let endDate = new Date();
        endDate.setHours(endHour, endMin, 0, 0);
        
        if (overnight || endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
        }
        
        const diffMs = endDate - startDate;
        const totalMinutes = Math.floor(diffMs / (1000 * 60)) - breakMinutes;
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return { hours, minutes, totalMinutes: Math.max(0, totalMinutes) };
    }

    exportToCSV() {
        if (this.filteredEntries.length === 0) {
            alert('No entries to export');
            return;
        }

        const headers = ['Date', 'Start Time', 'End Time', 'Break (min)', 'Hours', 'Location'];
        const csvContent = [
            headers.join(','),
            ...this.filteredEntries.map(entry => {
                const date = new Date(entry.date).toLocaleDateString();
                const hours = Math.floor((entry.totalMinutes || 0) / 60);
                const minutes = (entry.totalMinutes || 0) % 60;
                const hoursDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;
                
                return [
                    `"${date}"`,
                    `"${entry.startTime || ''}"`,
                    `"${entry.endTime || ''}"`,
                    entry.break || 0,
                    `"${hoursDisplay}"`,
                    `"${entry.location || ''}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `hoursly-entries-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportToPDF() {
        window.print();
    }

    showEmptyState() {
        document.getElementById('entriesTableBody').innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
    }

    checkAuthentication() {
        if (CONFIG.DEMO_MODE) {
            this.currentUser = { name: 'Demo User', email: 'demo@hoursly.com' };
            return;
        }

        if (sheetsDB.isSignedIn) {
            this.currentUser = sheetsDB.getCurrentUser();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize entries page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EntriesPage();
});
