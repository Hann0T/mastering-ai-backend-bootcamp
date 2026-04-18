import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { createDocument, deleteDocument, getDocument, listDocuments } from '../services/document.service';
import { documentQueue, queueDocumentForProcessing } from '../queues/document.queue';
import { DOC_EVENTS } from '../events/document.events';
import { eventBus } from '../lib/events';

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
    const doc = await createDocument(req.user!.id, title, content);

    const jobId = await queueDocumentForProcessing(doc.id, req.user!.id);

    eventBus.emit(DOC_EVENTS.CREATED, {
      userId: req.user!.id,
      documentId: doc.id,
      title: doc.title,
      fileSizeBytes: doc.fileSizeBytes,
    });

    res.status(202).json({ success: true, document: doc, jobId });
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
