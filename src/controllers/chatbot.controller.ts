import * as openrouterService from '../services/openrouter.service';

export async function getModelInfo(req, res) {
  try {
    const modelInfo = await openrouterService.getModelInfo();
    res.json(modelInfo);
  } catch (error) {
    res.status(500).json({ status: false, message:'Error getting model endpoints' });
  }
}

