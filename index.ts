import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as chatbotController from './src/controllers/chatbot.controller';

const PORT = process.env.PORT;
const app = express();

app.use(cors());

app.use(express.json());

/* ENDPOINTS */
app.get('/api/chatbot/model-info', chatbotController.getModelInfo);

app.post('/api/chatbot/chat', chatbotController.sendMessage);

// Global error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.log(err);
  res.status(500).json({ status: false, message: 'Internal Server Error. Try again later or contact support.' });
});

// Server initialization
app.listen(PORT, () => {
  console.log('Server running at port ' + PORT);
});
