import * as openrouterService from '../services/openrouter.service';

export async function getModelInfo(req, res) {
  try {
    const modelInfo = await openrouterService.getModelInfo();
    res.json(modelInfo);
  } catch (error) {
    res.status(500).json({ status: false, message:'Error getting model endpoints' });
  }
}

export async function sendMessage(req, res) {
  try {
    const { inputMessages } = req.body;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    await openRouterService.streamMessage(
      inputMessages,
      (chunk) => {
        res.write(chunk);
      }
    );

    res.end();
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error sending message'});
  }
}

