import { Router } from 'express';
import authRoutes from './auth';
import documentRoutes from './documents';

const router = Router();

router.use('/auth', authRoutes)
router.use('/documents', documentRoutes)

export default router;
