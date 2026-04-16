import { Router } from 'express';
import authRoutes from './auth';
import documentRoutes from './documents';
import conversationRoutes from './conversation';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/conversations', conversationRoutes);
router.use('/admin', adminRoutes);

export default router;
