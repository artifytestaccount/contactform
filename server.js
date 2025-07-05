const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const env = require('dotenv')
env.config();

// CONFIGURE
const PORT =  process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // <-- Replace this
const SHEET_NAME = 'artifytechsolutioncontactus'; // or whatever your sheet tab is named
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'credentials.json');

// INIT APP
const app = express();
app.use(cors());
app.use(bodyParser.json());

// GOOGLE AUTH
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  const { name, email, phone , subject , message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString(), name, email, phone , subject , message]],
      },
    });

    console.log('Contact form submitted:', { name, email, message });

    res.status(200).json({ success: true, message: 'Form submitted!' });
  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
