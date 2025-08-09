// Authentication JavaScript
class AuthManager {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.init();
    }

    init() {
        // Check if we're on login or signup page
        if (document.getElementById('loginForm')) {
            this.initLogin();
        }
        if (document.getElementById('signupForm')) {
            this.initSignup();
        }
        
        // Check authentication status
        this.checkAuthStatus();
    }

    initLogin() {
        const loginForm = document.getElementById('loginForm');
        const togglePassword = document.getElementById('togglePassword');
        const googleSignIn = document.getElementById('googleSignIn');

        // Password toggle
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = togglePassword.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // Login form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Google Sign In
        googleSignIn.addEventListener('click', () => {
            this.handleGoogleAuth('signin');
        });
    }

    initSignup() {
        const signupForm = document.getElementById('signupForm');
        const togglePassword = document.getElementById('togglePassword');
        const payPeriodSelect = document.getElementById('payPeriodStart');
        const customDayInput = document.getElementById('customDayInput');
        const googleSignUp = document.getElementById('googleSignUp');

        // Password toggle
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = togglePassword.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        // Pay period custom day toggle
        payPeriodSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customDayInput.classList.remove('hidden');
                document.getElementById('customDay').required = true;
            } else {
                customDayInput.classList.add('hidden');
                document.getElementById('customDay').required = false;
            }
        });

        // Signup form submission
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Google Sign Up
        googleSignUp.addEventListener('click', () => {
            this.handleGoogleAuth('signup');
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        // Demo account check
        if (email === 'demo@hoursly.com' && password === 'demo123') {
            this.loginUser({
                name: 'Demo User',
                email: 'demo@hoursly.com',
                id: 1
            }, remember);
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, remember })
            });

            const data = await response.json();

            if (response.ok) {
                this.loginUser(data.user, remember);
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Invalid email or password. Try demo@hoursly.com / demo123', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup() {
        const formData = new FormData(document.getElementById('signupForm'));
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        // Get pay period start day
        let payPeriodStartDay = formData.get('payPeriodStart');
        if (payPeriodStartDay === 'custom') {
            payPeriodStartDay = formData.get('customDay');
        }

        const userData = {
            name: formData.get('fullName'),
            email: formData.get('email'),
            password: password,
            payPeriodStartDay: parseInt(payPeriodStartDay)
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.API_BASE}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Account created successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                throw new Error(data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Failed to create account. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleGoogleAuth(type) {
        // Placeholder for Google OAuth integration
        this.showNotification(`Google ${type} coming soon! Use demo account for now.`, 'info');
    }

    loginUser(user, remember) {
        // Store user data
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        if (remember) {
            localStorage.setItem('hoursly_user', JSON.stringify(userData));
            localStorage.setItem('hoursly_remember', 'true');
        } else {
            sessionStorage.setItem('hoursly_user', JSON.stringify(userData));
        }

        this.showNotification('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    checkAuthStatus() {
        // Check if user is logged in
        const userData = localStorage.getItem('hoursly_user') || sessionStorage.getItem('hoursly_user');
        
        if (!userData) {
            // Not logged in - redirect to login if not on auth pages
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        } else {
            // Logged in - redirect to dashboard if on auth pages
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('signup.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    static getCurrentUser() {
        const userData = localStorage.getItem('hoursly_user') || sessionStorage.getItem('hoursly_user');
        return userData ? JSON.parse(userData) : null;
    }

    static logout() {
        localStorage.removeItem('hoursly_user');
        localStorage.removeItem('hoursly_remember');
        sessionStorage.removeItem('hoursly_user');
        window.location.href = 'login.html';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
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
        }, 4000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
