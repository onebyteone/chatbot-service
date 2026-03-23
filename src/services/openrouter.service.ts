import 'dotenv/config';
import { OpenRouter } from '@openrouter/sdk';
import type { OpenResponsesInput } from '@openrouter/sdk/models';

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

export async function streamMessage(inputMessages: OpenResponsesInput, sendItem) {
  const result = openrouter.callModel({
    model:`${model.author}/${model.slug}`,
    input: inputMessages,
  });

  let fullResponse = '';

  for await (const item of result.getItemsStream()) {
    const content = item.content;
    if (content) {
      fullResponse += content;
    }
    if (sendItem) { sendItem(item); }
  }

  return fullResponse;
}

