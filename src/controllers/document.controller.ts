import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { getUserPermissions } from '../services/rbac.service';

export async function listDocumentsHandler(req: Request, res: Response, next: NextFunction) {
  const docs = await prisma.document.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction) {
  const doc = await prisma.document.create({
    data: {
      title: req.body.title,
      content: req.body.content,
      filename: "file.txt",
      mimeType: "text/plain",
      fileSizeBytes: 1234,
      user: { connect: { id: req.user!.id } }
    }
  });
  res.json({ success: true, document: doc });
}

export async function getDocumentHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  const doc = await prisma.document.findUnique({
    where: { id: req.params.id }
  })
  if(!doc) {
    throw new NotFoundError('Document not found');
  }

  // Resource ownership check
  if (doc.userId !== req.user!.id) {
    // Admins can see everything
    const permissions = await getUserPermissions(req.user!.id);
    if (!permissions.has('users:manage')) {
      throw new NotFoundError('Document not found');
    }
  }

  res.json({ success: true, document: doc });
}

export async function deleteDocumentHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  await prisma.document.delete({
    where: { id: req.params.id }
  });
  res.json({ success: true });
}
