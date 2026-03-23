import 'dotenv/config';
import { OpenRouter } from '@openrouter/sdk';

const model = {
  author: 'arcee-ai',
  slug: 'trinity-large-preview:free',
};

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

export async function getModelInfo() {
  const result = await openRouter.endpoints.list({
    author: model.author,
    slug: model.slug,
  });
  
  return result;
}

