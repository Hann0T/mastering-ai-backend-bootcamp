import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { createDocumentSchema, documentParamsSchema, listDocumentsSchema } from '../validators/document.validator';
import { validate } from '../middleware/validate.middleware';
import { createDocumentHandler, deleteDocumentHandler, getDocumentHandler, listDocuments } from '../controllers/document.controller';

const router = Router();

router.use(authenticate);

router.get('/',
  validate(listDocumentsSchema),
  listDocuments
);

router.post('/',
  validate(createDocumentSchema),
  createDocumentHandler
);

router.get('/:id',
  validate(documentParamsSchema),
  getDocumentHandler
);

router.delete(
  '/:id',
  validate(documentParamsSchema),
  authorize('enterprise'),
  deleteDocumentHandler
);

export default router;
