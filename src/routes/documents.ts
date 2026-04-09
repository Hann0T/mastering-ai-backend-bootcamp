import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const docs = await prisma.document.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
});

router.delete(
  '/admin/user/:id',
  authenticate,
  authorize('enterprise'),
  async (req, res) => {
    res.json({ success: true });
  }
);

export default router;
