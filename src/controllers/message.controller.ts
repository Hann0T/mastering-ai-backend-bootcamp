import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

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

export async function createMessageHandler(req: Request<Params>, res: Response, _: NextFunction) {
  const message = await prisma.message.create({
    data: {
      role: req.body.role,
      content: req.body.content,
      conversation: { connect: { id: req.params.conversationId } }
    }
  });

  res.json({ success: true, message });
}
