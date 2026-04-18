import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendMessage } from '../services/conversation.service';

type Params = {
  conversationId: string;
  messageId: string;
}

export async function getMessagesHandler(req: Request<Params>, res: Response, _: NextFunction) {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.conversationId },
  });

  res.json({ success: true, messages });
}

export async function getMessageHandler(req: Request<Params>, res: Response, _: NextFunction) {
  const message = await prisma.message.findMany({
    where: { id: req.params.messageId },
  });

  res.json({ success: true, message });
}

export async function sendMessageHandler(req: Request<Params>, res: Response, next: NextFunction) {
  try {
    const result = await sendMessage({
      conversationId: req.params.conversationId,
      userId: req.user!.id,
      content: req.body.content,
      documentId: req.body.documentId ?? null,
    });

    res.json({ success: true, ...result });
  } catch(error) {
    next(error);
  }
}
