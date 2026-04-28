import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { createDocument, deleteDocument, getDocument, listDocuments } from '../services/document.service';
import { documentQueue, queueDocumentForProcessing } from '../queues/document.queue';
import { CACHE_TTL, cache } from '../lib/cache';
import type { Document } from '../../generated/prisma/client';

export async function listDocumentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const docs = await listDocuments(req.user!.id, (req as any).validated.query);
    res.json({ success: true, ...docs });
  } catch (error) {
    next(error);
  }
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    const correlationId = (req as any).correlationId;
    const doc = await createDocument({
      userId: req.user!.id, title, content
    }, correlationId);

    const jobId = await queueDocumentForProcessing(
      doc.id,
      req.user!.id,
      correlationId
    );

    res.status(202).json({ success: true, document: doc, jobId });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const documentId = req.params.id;
    const key = `doc:${documentId}`;
    let doc = await cache.get<Document>(key);
    if (doc) {
      res.json({success: true, document: doc});
      return;
    }

    doc = await getDocument(req.user!.id, documentId);

    await cache.set(key, doc, CACHE_TTL.DOCUMENT);

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

export async function processingStatus(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const doc = await prisma.document.findUnique({
      where: {id: req.params.id},
      select: {id: true, status: true, error: true, userId: true}
    });

    if(!doc || doc.userId !== req.user!.id) {
      throw new NotFoundError('Document not found');
    }

    const jobs = await documentQueue.getJobs(['active', 'waiting']);
    const activeJob = jobs.find(
      j => j.data.documentId === req.params.id
    );

    res.json({ success: true, data: {
      status: doc.status,
      error: doc.error,
      progress: activeJob ? activeJob.progress : null,
    }});
  } catch (error) {
    next(error);
  }
}
