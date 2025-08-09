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
        this.setupEventListeners();
        this.setDefaultDate();
        this.updatePayPeriodSummary();
        this.loadPayPeriodSummary();
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
            // Clear any stored data
            localStorage.clear();
            // Redirect to login page or refresh
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
