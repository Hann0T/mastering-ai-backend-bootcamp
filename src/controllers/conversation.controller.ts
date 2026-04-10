import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function getConversationsHandler(req: Request, res: Response, next: NextFunction) {
  const docs = await prisma.conversation.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
}

export async function getConversationHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  const docs = await prisma.conversation.findMany({
    where: { id: req.params.id },
  });

  res.json(docs);
}

export async function createConversationHandler(req: Request, res: Response, next: NextFunction) {
  const docs = await prisma.conversation.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
}
