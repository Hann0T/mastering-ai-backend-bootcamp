import { Router } from 'express';
import authRoutes from './auth';
import documentRoutes from './documents';
import conversationRoutes from './conversation';

const router = Router();

router.use('/auth', authRoutes)
router.use('/documents', documentRoutes)
router.use('/conversations', conversationRoutes)

export default router;
