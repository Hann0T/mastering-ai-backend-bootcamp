import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { createConversation, getConversation } from '../services/conversation.service';

export async function getConversationsHandler(req: Request, res: Response, next: NextFunction) {
  const docs = await prisma.conversation.findMany({
    where: { userId: req.user!.id },
  });

  res.json(docs);
}

export async function getConversationHandler(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const convo = await getConversation(req.user!.id, req.params.id);
    res.json({ success: true, data: { conversation: convo } });
  } catch (error) {
    next(error);
  }
}

export async function createConversationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const convo = await createConversation(req.user!.id, req.body.title);
    res.json({ success: true, data: { conversation: convo } });
  } catch (error) {
    next(error);
  }
}
