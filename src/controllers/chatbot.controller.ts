import * as openrouterService from '../services/openrouter.service';

export async function getModelInfo(req: any, res: any) {
  try {
    const modelInfo = await openrouterService.getModelInfo();
    res.json(modelInfo);
  } catch (error) {
    res.status(500).json({ status: false, message:'Error getting model endpoints' });
  }
}

export async function sendMessage(req: any, res: any) {
  try {
    const { inputMessages } = req.body;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    await openrouterService.streamMessage(
      inputMessages,
      (chunk: any) => {
        res.write(JSON.stringify(chunk) + "\n");
      }
    );

    res.end();
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error sending message'});
  }
}

