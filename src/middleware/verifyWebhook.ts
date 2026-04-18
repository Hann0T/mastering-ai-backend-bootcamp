import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UnauthorizedError } from '../lib/errors';

export function verifyWebhookSignature(
  secret: string,
  headerName: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers[headerName.toLowerCase()] as string;
    if (!signature) {
      throw new UnauthorizedError('Missing signature header');
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(500).json({
        error: 'Raw body not captured. Configure express.raw()'
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');

    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedError('Invalid signature');
    }

    next();
  };
}
