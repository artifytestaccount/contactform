const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Validate environment variables
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'artifytechsolutioncontactus';
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'credentials.json');

// Check for required environment variables
if (!SPREADSHEET_ID) {
  console.error('❌ Error: SPREADSHEET_ID is not set in .env file');
  process.exit(1);
}

if (!path.resolve(SERVICE_ACCOUNT_FILE)) {
  console.error('❌ Error: credentials.json file not found at', SERVICE_ACCOUNT_FILE);
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google Sheets authentication
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// POST /api/contact endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    console.error('❌ Missing required fields:', { name, email, message });
    return res.status(400).json({ error: 'Missing required fields: name, email, and message are required.' });
  }

  try {
    console.log('📥 Received contact form submission:', { name, email, phone, subject, message });

    // Authenticate with Google Sheets
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Append data to Google Sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString(), name, email, phone || '', subject || '', message]],
      },
    });

    console.log('✅ Successfully saved to Google Sheet:', response.data);
    res.status(200).json({ success: true, message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('❌ Error saving to Google Sheet:', error.message);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('Environment variables loaded:');
  console.log(`- PORT: ${PORT}`);
  console.log(`- SPREADSHEET_ID: ${SPREADSHEET_ID}`);
  console.log(`- SHEET_NAME: ${SHEET_NAME}`);
  console.log(`- SERVICE_ACCOUNT_FILE: ${SERVICE_ACCOUNT_FILE}`);
}).on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port by setting PORT in .env file.`);
  }
  process.exit(1);
});
