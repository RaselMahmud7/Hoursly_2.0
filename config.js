// Google API Configuration
// To get these credentials:
// 1. Go to https://console.developers.google.com/
// 2. Create a new project or select existing
// 3. Enable Google Sheets API
// 4. Create credentials (API Key and OAuth 2.0 Client ID)
// 5. Add your domain to authorized origins

const CONFIG = {
    // Replace these with your actual Google API credentials
    GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE',
    
    // Demo mode - set to true to use local storage instead of Google Sheets
    DEMO_MODE: true,
    
    // App settings
    APP_NAME: 'Hoursly Time Tracker',
    DEFAULT_PAY_PERIOD_START: 20
};

// Instructions for setup
const SETUP_INSTRUCTIONS = `
🔧 Google Sheets Setup Instructions:

1. Go to https://console.developers.google.com/
2. Create a new project or select existing
3. Enable "Google Sheets API"
4. Go to "Credentials" and create:
   - API Key (for accessing public data)
   - OAuth 2.0 Client ID (for user authentication)
5. In OAuth 2.0 settings, add your domain to "Authorized JavaScript origins"
6. Copy the credentials to config.js
7. Set DEMO_MODE to false in config.js

For local development, add: http://localhost:3000 or http://127.0.0.1:3000
For production, add your actual domain: https://yourdomain.com
`;

console.log(SETUP_INSTRUCTIONS);
