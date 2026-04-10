import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema
} from '../validators/auth.validator';
import {
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler
} from '../controllers/auth.controller';

const router = Router();

router.post('/register',
  validate(registerSchema),
  registerHandler
);

router.post('/login',
  validate(loginSchema),
  loginHandler
);

router.post('/refresh',
  validate(refreshTokenSchema),
  refreshTokenHandler
);

router.post('/logout',
  validate(logoutSchema),
  logoutHandler
);

export default router;
