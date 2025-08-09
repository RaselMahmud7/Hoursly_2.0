// Main dashboard JavaScript with Google Sheets integration
class HourslyApp {
    constructor() {
        this.currentUser = null;
        this.payPeriodStartDay = 20;
        this.isGoogleApiReady = false;
        this.init();
    }

    async init() {
        try {
            // Initialize Google API if not in demo mode
            if (!CONFIG.DEMO_MODE) {
                await this.initializeGoogleAPI();
            } else {
                console.log('Running in DEMO MODE - using localStorage');
                this.isGoogleApiReady = true;
            }
            
            this.checkAuthentication();
            this.setupEventListeners();
            this.setDefaultDate();
            this.updatePayPeriodSummary();
            await this.loadPayPeriodSummary();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize app. Check your Google API configuration.', 'error');
        }
    }

    async initializeGoogleAPI() {
        if (CONFIG.GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
            throw new Error('Google API credentials not configured. Please update config.js');
        }

        try {
            await sheetsDB.initialize(CONFIG.GOOGLE_CLIENT_ID, CONFIG.GOOGLE_API_KEY);
            this.isGoogleApiReady = true;
            console.log('Google Sheets API ready');
        } catch (error) {
            console.error('Google API initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('timeEntryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitTimeEntry();
        });

        // Navigation
        document.getElementById('viewEntriesBtn').addEventListener('click', () => {
            window.location.href = 'entries.html';
        });

        // Hamburger menu
        const hamburgerBtn = document.querySelector('.fa-bars').parentElement;
        hamburgerBtn.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Account sidebar
        document.getElementById('accountBtn').addEventListener('click', () => {
            this.toggleAccountSidebar();
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeAccountSidebar();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.closeAccountSidebar();
        });

        // Google Sheets connection
        const connectGoogleBtn = document.querySelector('button:contains("Connect Google Sheets")') || 
                                 document.querySelector('[data-action="connect-sheets"]');
        if (connectGoogleBtn) {
            connectGoogleBtn.addEventListener('click', () => {
                this.connectGoogleSheets();
            });
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Pay period edit
        document.getElementById('editPayPeriod').addEventListener('click', () => {
            this.editPayPeriod();
        });
    }

    setDefaultDate() {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('date').value = dateString;
    }

    async submitTimeEntry() {
        if (!this.isGoogleApiReady) {
            this.showNotification('Please wait for Google API to load...', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('timeEntryForm'));
        const entry = {
            date: formData.get('date'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            break: parseInt(formData.get('break')) || 0,
            location: formData.get('location') || '',
            overnight: formData.get('overnight') === 'on'
        };

        // Calculate hours
        const hours = this.calculateHours(entry.startTime, entry.endTime, entry.break, entry.overnight);
        entry.totalMinutes = hours.totalMinutes;

        try {
            if (CONFIG.DEMO_MODE) {
                await this.addEntryToLocalStorage(entry);
            } else {
                // Check if user is signed in to Google
                if (!sheetsDB.isSignedIn) {
                    this.showNotification('Please sign in to Google Sheets first', 'error');
                    await this.connectGoogleSheets();
                    return;
                }
                await sheetsDB.addEntry(entry);
            }

            this.showNotification('Entry added successfully!', 'success');
            document.getElementById('timeEntryForm').reset();
            this.setDefaultDate();
            await this.loadPayPeriodSummary();
        } catch (error) {
            console.error('Error adding entry:', error);
            this.showNotification('Failed to add entry. Please try again.', 'error');
        }
    }

    async addEntryToLocalStorage(entry) {
        const entries = JSON.parse(localStorage.getItem('hoursly_entries') || '[]');
        entry.id = Date.now(); // Simple ID generation
        entry.createdAt = new Date().toISOString();
        entries.push(entry);
        localStorage.setItem('hoursly_entries', JSON.stringify(entries));
    }

    async connectGoogleSheets() {
        if (CONFIG.DEMO_MODE) {
            this.showNotification('Demo mode active - data stored locally', 'info');
            return;
        }

        try {
            await sheetsDB.signIn();
            const user = sheetsDB.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.loadUserInfo();
                this.showNotification(`Connected to Google Sheets as ${user.name}`, 'success');
                
                // Update the connect button
                this.updateGoogleSheetsButton(true);
            }
        } catch (error) {
            console.error('Google Sheets connection error:', error);
            this.showNotification('Failed to connect to Google Sheets', 'error');
        }
    }

    updateGoogleSheetsButton(connected) {
        // Update UI to show connection status
        const connectBtn = document.querySelector('[data-action="connect-sheets"]');
        if (connectBtn) {
            if (connected) {
                connectBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Connected to Google Sheets';
                connectBtn.classList.remove('text-teal-500');
                connectBtn.classList.add('text-green-500');
            } else {
                connectBtn.innerHTML = '<i class="fab fa-google mr-2"></i>Connect Google Sheets';
                connectBtn.classList.remove('text-green-500');
                connectBtn.classList.add('text-teal-500');
            }
        }
    }

    calculateHours(startTime, endTime, breakMinutes, overnight = false) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let startDate = new Date();
        startDate.setHours(startHour, startMin, 0, 0);
        
        let endDate = new Date();
        endDate.setHours(endHour, endMin, 0, 0);
        
        // If overnight work, add a day to end time
        if (overnight || endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
        }
        
        const diffMs = endDate - startDate;
        const totalMinutes = Math.floor(diffMs / (1000 * 60)) - breakMinutes;
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return { hours, minutes, totalMinutes: Math.max(0, totalMinutes) };
    }

    async loadPayPeriodSummary() {
        try {
            const { startDate, endDate } = this.getCurrentPayPeriod();
            
            let summary;
            if (CONFIG.DEMO_MODE) {
                summary = await this.getLocalStorageSummary(startDate, endDate);
            } else if (sheetsDB.isSignedIn) {
                summary = await sheetsDB.getSummary(startDate, endDate);
            } else {
                summary = { totalHours: 0, totalMinutes: 0 };
            }
            
            this.updateSummaryDisplay(summary.totalHours, summary.totalMinutes);
        } catch (error) {
            console.error('Error loading summary:', error);
            this.updateSummaryDisplay(0, 0);
        }
    }

    async getLocalStorageSummary(startDate, endDate) {
        const entries = JSON.parse(localStorage.getItem('hoursly_entries') || '[]');
        
        const filteredEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return entryDate >= start && entryDate <= end;
        });

        const totalMinutes = filteredEntries.reduce((sum, entry) => sum + (entry.totalMinutes || 0), 0);
        
        return {
            totalHours: Math.floor(totalMinutes / 60),
            totalMinutes: totalMinutes % 60,
            totalMinutesRaw: totalMinutes
        };
    }

    getCurrentPayPeriod() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let startDate, endDate;
        
        if (currentDay >= this.payPeriodStartDay) {
            // Current period
            startDate = new Date(currentYear, currentMonth, this.payPeriodStartDay);
            endDate = new Date(currentYear, currentMonth + 1, this.payPeriodStartDay - 1);
        } else {
            // Previous month's period
            startDate = new Date(currentYear, currentMonth - 1, this.payPeriodStartDay);
            endDate = new Date(currentYear, currentMonth, this.payPeriodStartDay - 1);
        }
        
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }

    updatePayPeriodSummary() {
        const { startDate, endDate } = this.getCurrentPayPeriod();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const options = { day: 'numeric', month: 'short' };
        const startFormatted = start.toLocaleDateString('en-US', options);
        const endFormatted = end.toLocaleDateString('en-US', options);
        
        document.getElementById('payPeriodRange').textContent = `${startFormatted} - ${endFormatted}`;
    }

    updateSummaryDisplay(hours, minutes) {
        document.getElementById('totalHours').textContent = hours || 0;
        document.getElementById('totalMinutes').textContent = String(minutes || 0).padStart(2, '0');
    }

    checkAuthentication() {
        // For demo mode or Google Sheets, we'll handle auth differently
        if (CONFIG.DEMO_MODE) {
            this.currentUser = {
                name: 'Demo User',
                email: 'demo@hoursly.com'
            };
            this.loadUserInfo();
            return;
        }

        // Check if Google user is signed in
        if (sheetsDB.isSignedIn) {
            this.currentUser = sheetsDB.getCurrentUser();
            this.loadUserInfo();
        } else {
            // Show a connect button instead of redirecting
            this.showGoogleSignInPrompt();
        }
    }

    showGoogleSignInPrompt() {
        // Instead of redirecting, show a prompt to connect Google Sheets
        const promptDiv = document.createElement('div');
        promptDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        promptDiv.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md">
                <div class="text-center">
                    <div class="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-clock text-white text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">Welcome to Hoursly</h2>
                    <p class="text-gray-600 mb-6">Connect your Google Sheets to store your timesheet data securely in your own Google Drive.</p>
                    <button id="connectGoogleSheetsBtn" class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 mb-3">
                        <i class="fab fa-google mr-2"></i>
                        Connect Google Sheets
                    </button>
                    <button id="useDemoBtn" class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600">
                        Use Demo Mode (Local Storage)
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(promptDiv);
        
        document.getElementById('connectGoogleSheetsBtn').addEventListener('click', async () => {
            promptDiv.remove();
            await this.connectGoogleSheets();
        });
        
        document.getElementById('useDemoBtn').addEventListener('click', () => {
            promptDiv.remove();
            CONFIG.DEMO_MODE = true;
            this.currentUser = { name: 'Demo User', email: 'demo@hoursly.com' };
            this.loadUserInfo();
        });
    }

    loadUserInfo() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userEmail').textContent = this.currentUser.email;
        }
    }

    toggleMobileMenu() {
        // Create mobile menu if it doesn't exist
        let mobileMenu = document.getElementById('mobileMenu');
        
        if (!mobileMenu) {
            mobileMenu = this.createMobileMenu();
        }
        
        // Toggle visibility
        if (mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.remove('hidden');
            document.getElementById('overlay').classList.remove('hidden');
        } else {
            mobileMenu.classList.add('hidden');
            document.getElementById('overlay').classList.add('hidden');
        }
    }

    createMobileMenu() {
        const mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobileMenu';
        mobileMenu.className = 'fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 hidden';
        
        mobileMenu.innerHTML = `
            <div class="flex justify-between items-center p-6 border-b">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-clock text-white text-sm"></i>
                    </div>
                    <span class="text-xl font-semibold text-gray-900">Hoursly</span>
                </div>
                <button id="closeMobileMenu" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <nav class="p-6">
                <ul class="space-y-4">
                    <li>
                        <a href="index.html" class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition duration-200">
                            <i class="fas fa-home mr-3 text-gray-500"></i>
                            <span class="text-gray-700">Dashboard</span>
                        </a>
                    </li>
                    <li>
                        <a href="entries.html" class="flex items-center p-3 rounded-lg hover:bg-gray-100 transition duration-200">
                            <i class="fas fa-list mr-3 text-gray-500"></i>
                            <span class="text-gray-700">Work Entries</span>
                        </a>
                    </li>
                    <li>
                        <button id="mobileAccountBtn" class="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 transition duration-200 text-left">
                            <i class="fas fa-user mr-3 text-gray-500"></i>
                            <span class="text-gray-700">Account</span>
                        </button>
                    </li>
                    ${!CONFIG.DEMO_MODE ? `
                    <li>
                        <button id="mobileViewSheetsBtn" class="w-full flex items-center p-3 rounded-lg hover:bg-blue-50 transition duration-200 text-left text-blue-600">
                            <i class="fas fa-external-link-alt mr-3"></i>
                            <span>View Google Sheet</span>
                        </button>
                    </li>
                    ` : ''}
                    <li>
                        <button id="mobileLogoutBtn" class="w-full flex items-center p-3 rounded-lg hover:bg-red-50 transition duration-200 text-left text-red-600">
                            <i class="fas fa-sign-out-alt mr-3"></i>
                            <span>Logout</span>
                        </button>
                    </li>
                </ul>
            </nav>
        `;
        
        document.body.appendChild(mobileMenu);
        
        // Add event listeners
        document.getElementById('closeMobileMenu').addEventListener('click', () => {
            this.closeMobileMenu();
        });
        
        document.getElementById('mobileAccountBtn').addEventListener('click', () => {
            this.closeMobileMenu();
            this.toggleAccountSidebar();
        });
        
        if (!CONFIG.DEMO_MODE) {
            document.getElementById('mobileViewSheetsBtn').addEventListener('click', () => {
                this.closeMobileMenu();
                this.openGoogleSheet();
            });
        }
        
        document.getElementById('mobileLogoutBtn').addEventListener('click', () => {
            this.closeMobileMenu();
            this.logout();
        });
        
        return mobileMenu;
    }

    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }
        document.getElementById('overlay').classList.add('hidden');
    }

    toggleAccountSidebar() {
        const sidebar = document.getElementById('accountSidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar.classList.contains('translate-x-full')) {
            sidebar.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            this.closeAccountSidebar();
        }
    }

    closeAccountSidebar() {
        const sidebar = document.getElementById('accountSidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }

    openGoogleSheet() {
        if (sheetsDB.spreadsheetId) {
            window.open(sheetsDB.getSpreadsheetUrl(), '_blank');
        } else {
            this.showNotification('No spreadsheet available', 'error');
        }
    }

    editPayPeriod() {
        const newDay = prompt('Enter new pay period start day (1-31):', this.payPeriodStartDay);
        if (newDay && !isNaN(newDay) && newDay >= 1 && newDay <= 31) {
            this.payPeriodStartDay = parseInt(newDay);
            document.getElementById('payPeriodDay').textContent = this.payPeriodStartDay;
            this.updatePayPeriodSummary();
            this.loadPayPeriodSummary();
            
            // Save to localStorage
            localStorage.setItem('payPeriodStartDay', this.payPeriodStartDay);
        }
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            if (!CONFIG.DEMO_MODE && sheetsDB.isSignedIn) {
                await sheetsDB.signOut();
            }
            
            // Clear local storage
            localStorage.removeItem('hoursly_entries');
            localStorage.removeItem('payPeriodStartDay');
            
            // Reload page
            window.location.reload();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved pay period start day
    const savedPayPeriodDay = localStorage.getItem('payPeriodStartDay');
    if (savedPayPeriodDay) {
        document.getElementById('payPeriodDay').textContent = savedPayPeriodDay;
    }
    
    new HourslyApp();
});
