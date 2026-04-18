import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize, requirePermission } from '../middleware/authorize';
import {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema
} from '../validators/document.validator';
import {
  createDocumentHandler,
  deleteDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  processingStatus
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
  requirePermission('documents:read'),
  validate(listDocumentsSchema),
  listDocumentsHandler
);

router.post('/',
  requirePermission('documents:create'),
  validate(createDocumentSchema),
  createDocumentHandler
);

router.get('/:id',
  requirePermission('documents:read'),
  validate(documentParamsSchema),
  getDocumentHandler
);

router.delete(
  '/:id',
  requirePermission('admin:documents:delete'),
  validate(documentParamsSchema),
  deleteDocumentHandler
);

router.get(
  '/:id/processing-status',
  authenticate,
  requirePermission('documents:read'),
  processingStatus
)

export default router;
