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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: MyPassword123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
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
