// Main dashboard JavaScript
class HourslyApp {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.currentUser = {
            name: 'Rasel',
            email: 'r.mahmud2207@gmail.com'
        };
        this.payPeriodStartDay = 20;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.setDefaultDate();
        this.updatePayPeriodSummary();
        this.loadPayPeriodSummary();
        this.loadUserInfo();
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
        entry.hours = hours;

        try {
            const response = await fetch(`${this.API_BASE}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entry)
            });

            if (response.ok) {
                this.showNotification('Entry added successfully!', 'success');
                document.getElementById('timeEntryForm').reset();
                this.setDefaultDate();
                this.loadPayPeriodSummary();
            } else {
                throw new Error('Failed to add entry');
            }
        } catch (error) {
            console.error('Error adding entry:', error);
            this.showNotification('Failed to add entry. Please try again.', 'error');
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
        
        return { hours, minutes, totalMinutes };
    }

    async loadPayPeriodSummary() {
        try {
            const { startDate, endDate } = this.getCurrentPayPeriod();
            const response = await fetch(`${this.API_BASE}/entries/summary?startDate=${startDate}&endDate=${endDate}`);
            
            if (response.ok) {
                const data = await response.json();
                this.updateSummaryDisplay(data.totalHours, data.totalMinutes);
            }
        } catch (error) {
            console.error('Error loading summary:', error);
        }
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

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Use AuthManager logout
            if (typeof AuthManager !== 'undefined') {
                AuthManager.logout();
            } else {
                // Fallback
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        }
    }

    checkAuthentication() {
        const userData = localStorage.getItem('hoursly_user') || sessionStorage.getItem('hoursly_user');
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = JSON.parse(userData);
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
