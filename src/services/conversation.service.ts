import { NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export async function createConversation(userId: string, title: string) {
  const convo = await prisma.conversation.create({
    data: {
      title, userId
    }
  });

  return convo;
}

export async function getConversation(userId: string, conversationId: string) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });
  if (!convo) { throw new NotFoundError('Conversation not found') }

  if (convo.userId !== userId) {
    throw new NotFoundError('Conversation not found');
  }

  return convo;
}

export async function listConversation(
  userId: string,
  options: { page: number, limit: number }
) {
  const { page, limit } = options;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // only the last message
          select: {
            content: true,
            role: true,
            createdAt: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    }),
    prisma.conversation.count({ where: { userId } }),
  ]);

  return {
    data: conversations.map(convo => ({
      id: convo.id,
      title: convo.title,
      messageCount: convo._count.messages,
      lastMessage: convo.messages[0] || null,
      updatedAt: convo.updatedAt
    })),
    meta: {
      page,
      limit,
      total
    }
  };
}

export async function sendMessage(data: {
  conversationId: string,
  userId: string,
  content: string,
  documentId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: data.conversationId, deletedAt: null, userId: data.userId }
    });
    if (!conversation) { throw new NotFoundError('Conversation not found'); }

    const userMessage = await tx.message.create({
      data: {
        conversationId: conversation.id,
        documentId: data.documentId ?? null,
        role: 'user',
        content: data.content
      }
    });

    await tx.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() }
    });

    const assistantMessage = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        documentId: data.documentId ?? null,
        role: 'assistant',
        content: 'placeholder for week 4',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0
      }
    });

    await tx.usageLog.create({
      data: {
        userId: data.userId,
        action: 'chat',
        tokens: 0,
        costUsd: 0
      }
    });

    return { userMessage, assistantMessage };
  });
}
