import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
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
  sendMessageHandler,
  getMessageHandler,
  getMessagesHandler
} from '../controllers/message.controller';
import { createMessageSchema, getMessageSchema, getMessagesSchema } from '../validators/message.validator';
import { conditionalGet } from '../middleware/etag';

const router = Router();

router.use(authenticate);

router.get('/',
  requirePermission('conversations:read'),
  validate(getConversationsSchema),
  conditionalGet(),
  getConversationsHandler
);

router.post('/',
  requirePermission('conversations:create'),
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
  sendMessageHandler
);

router.get('/:conversationId/messages/:messageId',
  validate(getMessageSchema),
  getMessageHandler
);

export default router;
