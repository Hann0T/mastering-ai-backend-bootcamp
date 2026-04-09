import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.email('Must be a valid email address')
      .transform((email) => email.toLowerCase().trim()),
    password: z.string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must be at most 128 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email('Must be a valid email address'),
    password: z.string().min(1, 'Password is required'),
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })
});
