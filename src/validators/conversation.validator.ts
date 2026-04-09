import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({
    documentId: z.uuid('Invalid document ID format'),
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
