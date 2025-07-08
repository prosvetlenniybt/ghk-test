const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.options('/api/chat', cors());
app.options('*', cors());

app.post('/api/chat', (req, res) => {
  res.json({ reply: 'ok' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Backend started on port ${PORT}`)); 