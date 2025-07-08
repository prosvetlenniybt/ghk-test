const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const GEMINI_API_KEY = 'AIzaSyAMdxpXJDLmIPegh-lCBzoHA1WUF5j2guM';

const SHEET_ID = '1_XK3eodHB0E7rlwQzownmTMig1kYQe17xDvlMGaLhcE';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials', 'ai-jku-test.json');

// Если переменная окружения есть — создаём файл при запуске
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, process.env.GOOGLE_CREDENTIALS_JSON);
}

async function appendToSheet(question, answer) {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date().toLocaleString('ru-RU', { hour12: false });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[now, question, answer]],
    },
  });
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [{ parts: [{ text: message }] }]
      }
    );
    const aiReply = response.data.candidates[0].content.parts[0].text;
    appendToSheet(message, aiReply).catch(console.error);
    res.json({ reply: aiReply });
  } catch (error) {
    if (error.response) {
      console.error('AI error response:', error.response.data);
    } else {
      console.error('AI error:', error.message);
    }
    res.status(500).json({ error: 'Ошибка AI: ' + error.message });
  }
});

app.listen(5002, () => console.log('Backend started on port 5002')); 