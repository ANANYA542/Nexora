const axios = require('axios');
const AppError = require('./AppError');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.1-8b-instant';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

function getApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AppError('GROQ_API_KEY is not configured', 500);
  }
  return apiKey;
}

async function createChatCompletion({ messages, model = TEXT_MODEL, response_format } = {}) {
  try {
    const { data } = await axios.post(
      GROQ_API_URL,
      {
        model,
        messages,
        temperature: 0.3,
        max_completion_tokens: 800,
        ...(response_format ? { response_format } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message || 'AI request failed';
    throw new AppError(message, 502);
  }
}

async function createVisionCompletion({ prompt, dataUrl } = {}) {
  return createChatCompletion({
    model: VISION_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });
}

module.exports = {
  createChatCompletion,
  createVisionCompletion,
};
