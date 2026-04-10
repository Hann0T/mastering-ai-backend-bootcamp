import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema
} from '../validators/document.validator';
import { validate } from '../middleware/validate.middleware';
import {
  createConversationSchema,
  getConversationSchema,
  getConversationsSchema
} from '../validators/conversation.validator';
import {
  createConversationHandler,
  getConversationHandler,
  getConversationsHandler
} from '../controllers/conversation.controller';
import {
  createMessageHandler,
  getMessageHandler,
  getMessagesHandler
} from '../controllers/message.controller';
import { createMessageSchema, getMessageSchema, getMessagesSchema } from '../validators/message.validator';

const router = Router();

router.use(authenticate);

router.get('/',
  validate(getConversationsSchema),
  getConversationsHandler
);

router.post('/',
  validate(createConversationSchema),
  createConversationHandler
);

router.get('/:id',
  validate(getConversationSchema),
  getConversationHandler
);

router.get('/:conversationId/messages',
  validate(getMessagesSchema),
  getMessagesHandler
);

router.post('/:conversationId/messages',
  validate(createMessageSchema),
  createMessageHandler
);

router.get('/:conversationId/messages/:messageId',
  validate(getMessageSchema),
  getMessageHandler
);

export default router;
