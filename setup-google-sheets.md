# Google Sheets Setup Guide for Hoursly

This guide will help you set up Google Sheets API integration so each user can store their timesheet data in their own Google Sheet.

## Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select existing project
3. Enter project name: "Hoursly Timesheet"
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### Step 3: Create Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API Key and save it
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. If prompted, configure OAuth consent screen:
   - Choose "External" user type
   - Fill in app name: "Hoursly Timesheet"
   - Add your email as developer contact
   - Save and continue through all steps
6. For OAuth Client ID:
   - Application type: "Web application"
   - Name: "Hoursly Web Client"
   - Authorized JavaScript origins: Add your domain
     - For local development: `http://localhost:3000` or `http://127.0.0.1:3000`
     - For production: `https://yourdomain.com`
   - Click "Create"
7. Copy the Client ID

### Step 4: Update Configuration

1. Open `config.js` in your Hoursly project
2. Replace the placeholder values:
   ```javascript
   const CONFIG = {
       GOOGLE_API_KEY: 'your-api-key-here',
       GOOGLE_CLIENT_ID: 'your-client-id-here.apps.googleusercontent.com',
       DEMO_MODE: false, // Set to false to enable Google Sheets
       APP_NAME: 'Hoursly Time Tracker',
       DEFAULT_PAY_PERIOD_START: 20
   };
   ```

### Step 5: Test the Application

1. Open your Hoursly application in a web browser
2. You should see a prompt to connect Google Sheets
3. Click "Connect Google Sheets" and sign in with your Google account
4. Grant permissions to access Google Sheets
5. The app will automatically create a new spreadsheet for your timesheet data

## How It Works

- **Personal Data**: Each user gets their own Google Sheet stored in their Google Drive
- **Privacy**: Users own their data - you don't store anything on your servers
- **Automatic**: The app creates a spreadsheet with proper formatting and formulas
- **Real-time**: Changes sync immediately with Google Sheets
- **Backup**: Users can access their data directly in Google Sheets anytime

## Features

- ✅ **Automatic Spreadsheet Creation**: Creates formatted timesheet with headers
- ✅ **Real-time Sync**: All changes save instantly to Google Sheets
- ✅ **Data Ownership**: Each user owns their data in their Google Drive
- ✅ **Direct Access**: Users can view/edit data directly in Google Sheets
- ✅ **No Backend Required**: Pure client-side application
- ✅ **Offline Fallback**: Demo mode uses localStorage if Google Sheets unavailable

## Demo Mode

If you don't want to set up Google Sheets immediately, you can use demo mode:

1. Set `DEMO_MODE: true` in `config.js`
2. Data will be stored in browser's localStorage
3. Perfect for testing or personal use
4. No Google API setup required

## Troubleshooting

### Common Issues:

1. **"Google API not initialized"**
   - Check that your API key and Client ID are correct
   - Verify that Google Sheets API is enabled in your project

2. **"Sign in failed"**
   - Check that your domain is added to authorized origins
   - Make sure OAuth consent screen is properly configured

3. **"Spreadsheet access denied"**
   - User needs to grant permissions to Google Sheets
   - Check that the Google account has access to Google Drive

### Testing Locally:

- Add `http://localhost:3000` to authorized origins
- Use `http://localhost:3000` (not `127.0.0.1`) in your browser
- Clear browser cache if you change credentials

## Security Notes

- API keys and Client IDs are safe to expose in client-side code
- Users authenticate directly with Google (OAuth 2.0)
- No sensitive data passes through your servers
- Each user controls access to their own spreadsheet

## Production Deployment

1. Update authorized origins to include your production domain
2. Set `DEMO_MODE: false` in production
3. Consider adding your own domain to OAuth consent screen
4. Test with different Google accounts

---

**Need Help?** Check the [Google Sheets API documentation](https://developers.google.com/sheets/api/quickstart/js) for more details.
