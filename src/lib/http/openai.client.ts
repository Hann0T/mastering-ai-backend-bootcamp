import axios, { type AxiosInstance } from 'axios';
import { logger } from '../logger';

export const openaiClient: AxiosInstance = axios.create({
  baseURL: 'http://api.openai.com/v1',
  timeout: 30000, // 30s for AI responses
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": 'application/json',
    "User-Agent": "DocuChat/1.0"
  }
});

openaiClient.interceptors.request.use((config) => {
  const startTime = Date.now();
  (config as any).metadata = { startTime };
  logger.info('→ OpenAI', {
    method: config.method?.toUpperCase(),
    url: config.url
  });
  return config;
});

openaiClient.interceptors.response.use((response) => {
  const remaining = parseInt(
    response.headers['x-ratelimit-remaining-requests'] || '999'
  );

  if (remaining < 50) {
    // TODO: slow down the requests
    logger.warn('OpenAI rate limit getting low', {
      remaining
    });
  }

  return response;
})

openaiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any)?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;
    logger.info('← OpenAI', {
      responseStatus: response.status,
      url: response.config?.url,
      duration
    });
    return response;
  },
  (error) => {
    const startTime = (error.config as any)?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;

    if (error.response) {
      logger.error('✕ OpenAI, with response', {
        responseStatus: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
        duration
      });
    } else if (error.request) {
      // No response recieved (timeout, network error)
      logger.error('✕ OpenAI, no response', {
        url: error.config?.url,
        duration
      });
    } else {
      logger.error('✕ OpenAI default case error', {
        message: error.message,
      });
    }

    return error;
  }
);
