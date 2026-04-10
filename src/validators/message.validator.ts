import { z } from 'zod';

export const getMessagesSchema = z.object({
  params: z.object({
    conversationId: z.uuid('Invalid conversation ID'),
  }),
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.enum(['pending', 'processing', 'ready', 'failed']).optional(),
  })
});

export const getMessageSchema = z.object({
  params: z.object({
    conversationId: z.uuid('Invalid conversation ID'),
    messageId: z.uuid('Invalid message ID'),
  })
});

export const createMessageSchema = z.object({
  params: z.object({
    conversationId: z.uuid('Invalid conversation ID'),
  }),
  body: z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(500),
  })
});
