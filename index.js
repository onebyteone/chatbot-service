import 'dotenv/config';
import express from 'express';
import * as chatbotController from './src/controllers/chatbot.controller.js';

const PORT = process.env.PORT;
const app = express();

/* ENDPOINTS */
app.get('/api/chatbot/model-info', chatbotController.getModelInfo);

// Global error handling
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({ status: false, message: 'Internal Server Error. Try again later or contact support.' });
});

// Server initialization
app.listen(PORT, () => {
  console.log('Server running at port ' + PORT);
});
