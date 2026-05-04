import { NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { assembleContext, generateRAGResponse } from "./rag.service";
import { semanticSearch } from "./search.service";

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

// TODO: re do this function right now it has a couple of issues
export async function sendMessage(data: {
  conversationId: string,
  userId: string,
  content: string,
  documentId?: string,
  correlationId?: string
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: data.conversationId, deletedAt: null, userId: data.userId }
  });
  if (!conversation) { throw new NotFoundError('Conversation not found'); }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      documentId: data.documentId ?? null,
      role: 'user',
      content: data.content
    }
  });

  const history = await prisma.message.findMany({
    where: {
      conversationId: data.conversationId,
      createdAt: { lte: userMessage.createdAt }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { role: true, content: true }
  });
  const conversationHistory = history.reverse();

  const searchResults = await semanticSearch({
    query: data.content,
    userId: data.userId,
    documentId: data.documentId || '',
  }, data.correlationId);

  const context = assembleContext(searchResults);

  const ragResponse = await generateRAGResponse({
    question: data.content,
    context,
    conversationHistory,
    userId: data.userId,
    conversationId: data.conversationId,
    correlationId: data.correlationId || ''
  });

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      documentId: data.documentId ?? null,
      role: 'assistant',
      content: ragResponse.answer,
      promptTokens: ragResponse.tokensUsed.prompt,
      completionTokens: ragResponse.tokensUsed.completion,
      costUsd: ragResponse.costUsd,
      metadata: JSON.stringify({
        model: ragResponse.model,
        citations: ragResponse.citations,
        contextChunks: context.chunks.length
      })
    }
  });

  // await prisma.usageLog.create({
  //   data: {
  //     userId: data.userId,
  //     action: 'chat',
  //     tokens: 0,
  //     costUsd: 0
  //   }
  // });

  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() }
  });

  return {
    userMessage,
    assistantMessage: {
      ...assistantMessage,
      citations: ragResponse.citations,
    }
  };
}
