import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { getUserPermissions } from '../services/rbac.service';
import { createDocument, deleteDocument, getDocument, listDocuments, type ListDocumentsOptions } from '../services/document.service';

export async function listDocumentsHandler(
  req: Request<{}, {}, {}, ListDocumentsOptions>,
  res: Response,
  next: NextFunction
) {
  try {
    const docs = await listDocuments(req.user!.id, req.query);
    res.json({ success: true, ...docs });
  } catch (error) {
    next(error);
  }
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    const doc = await createDocument(req.user!.id, title, content);
    res.json({ success: true, document: doc });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const doc = await getDocument(req.user!.id, req.params.id);

    res.json({ success: true, document: doc });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocumentHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    await deleteDocument(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
