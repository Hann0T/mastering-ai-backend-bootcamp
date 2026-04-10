import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema
} from '../validators/document.validator';
import {
  createDocumentHandler,
  deleteDocumentHandler,
  getDocumentHandler,
  listDocuments
} from '../controllers/document.controller';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List user's documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, ready, failed]
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Not authenticated
 */
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
