import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { createDocumentSchema, documentParamsSchema, listDocumentsSchema } from '../validators/document.validator';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/',
  validate(listDocumentsSchema),
  async (req, res) => {
    const docs = await prisma.document.findMany({
      where: { userId: req.user!.id },
    });

    res.json(docs);
  }
);

router.post('/',
  validate(createDocumentSchema),
  async (_, res) => {
    res.json({ success: true });
  }
);

router.get('/:id',
  validate(documentParamsSchema),
  async (_, res) => {
    res.json({ success: true });
  }
);

router.delete(
  '/:id',
  validate(documentParamsSchema),
  authorize('enterprise'),
  async (_, res) => {
    res.json({ success: true });
  }
);

export default router;
