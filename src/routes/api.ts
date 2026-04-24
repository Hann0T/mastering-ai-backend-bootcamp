import { Router } from 'express';
import authRoutes from './auth';
import documentRoutes from './documents';
import conversationRoutes from './conversation';
import adminRoutes from './admin';
import { apiLimiter, authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use('/auth', authLimiter, authRoutes);

router.use(apiLimiter);

router.use('/documents', documentRoutes);
router.use('/conversations', conversationRoutes);
router.use('/admin', adminRoutes);

export default router;
