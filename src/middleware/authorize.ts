import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors';
import { getUserPermissions } from '../services/rbac.service';

export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Not authenticated');
      }

      const userPermissions = await getUserPermissions(req.user.id);

      // use some instead? so we don't go through the entire array
      const missing = requiredPermissions.filter(
        p => !userPermissions.has(p)
      );

      if (missing.length > 0) {
        throw new ForbiddenError("You don't have the required permission");
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}
