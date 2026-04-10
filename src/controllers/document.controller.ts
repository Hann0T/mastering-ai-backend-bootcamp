import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  const docs = await prisma.document.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction) {
  res.json({ success: true });
}

export async function getDocumentHandler(req: Request, res: Response, next: NextFunction) {
  res.json({ success: true });
}

export async function deleteDocumentHandler(req: Request, res: Response, next: NextFunction) {
  res.json({ success: true });
}
