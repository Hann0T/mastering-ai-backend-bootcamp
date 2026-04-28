import { DOC_EVENTS } from "../events/document.events";
import { NotFoundError } from "../lib/errors";
import { eventBus } from "../lib/events";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { getUserPermissions } from "./rbac.service";

export interface ListDocumentsOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  sortBy?: 'createdAt' | 'title' | 'chunkCount',
  sortOrder?: 'asc' | 'desc'
}

export async function listDocuments(
  userId: string,
  options: ListDocumentsOptions
) {
  const {
    page, limit,
    status, search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const where: any = {
    userId,
    deletedAt: null // soft delete filter
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitve' };
    where.description = { contains: search, mode: 'insensitve' };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        filename: true,
        status: true,
        chunkCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    data: documents,
    meta: { page, limit, total }
  };
}

export async function getDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, deletedAt: null }
  })
  if (!doc) { throw new NotFoundError('Document not found') }

  // Resource ownership check
  if (doc.userId !== userId) {
    // Admins can see everything
    const permissions = await getUserPermissions(userId);
    if (!permissions.has('users:manage')) {
      throw new NotFoundError('Document not found');
    }
  }

  return doc;
}

export async function createDocument(data: {
  userId: string;
  title: string;
  content: string;
}, correlationId?: string) {
  const { userId, title, content } = data;
  logger.info('Creating document', {
    correlationId: correlationId,
    userId,
    title,
  });

  const doc = await prisma.document.create({
    data: {
      title: title,
      content: content,
      filename: "file.txt",
      mimeType: "text/plain",
      fileSizeBytes: 1024,
      user: { connect: { id: userId } }
    }
  });

  eventBus.emit(DOC_EVENTS.CREATED, {
    userId,
    documentId: doc.id,
    title: doc.title,
    fileSizeBytes: doc.fileSizeBytes,
  });

  return doc;
}

export async function deleteDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, deletedAt: null }
  });
  if (!doc) { throw new NotFoundError('Document not found') }

  // Ownership check
  if (doc.userId !== userId) {
    throw new NotFoundError('Document not found');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      deletedAt: new Date(),
      deletedBy: userId
    }
  });

  eventBus.emit(DOC_EVENTS.DELETED, {
    deletedBy: userId,
    documentId: doc.id,
    title: doc.title,
  });

  return;
}
