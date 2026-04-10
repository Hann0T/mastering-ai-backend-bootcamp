import { z } from 'zod';

export const getConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.enum(['pending', 'processing', 'ready', 'failed']).optional(),
  })
});

export const getConversationSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid conversation ID'),
  })
});

export const createConversationSchema = z.object({
  body: z.object({
    title: z.string().max(200).optional(),
  })
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid conversation ID'),
  }),
  body: z.object({
    content: z.string()
      .min(1, 'Message content is required')
      .max(1000, 'Message too long'),
    documentId: z.uuid().optional(),
  })
});
