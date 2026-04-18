import { Router } from 'express';
import { verifyWebhookSignature } from '../middleware/verifyWebhook';
import { prisma } from '../lib/prisma';

const router = Router();

router.post(
  '/example',
  verifyWebhookSignature(`${process.env.WEBHOOK_SECRET}`, "x-signature"),
  async (req, res) => {
    const event = JSON.parse((req as any).rawBody.toString());

    const existing = await prisma.webhookEvent.findUnique({
      where: { id: event.id }
    });
    if (existing?.processedAt) {
      return res.json({
        received: true,
        duplicate: true
      });
    }

    await prisma.webhookEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        provider: 'example',
        eventType: event.type,
        payload: JSON.stringify(event),
      },
    });

    res.status(202).json({ received: true });

    try {
      await processWebhookEvent(event);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    } catch (error) {
      // Don't mark processedAt. The provider will retry.
      console.error(`Webhook ${event.id} processing failed:`, error);
    }
  }
);

async function processWebhookEvent(event: any) {
  switch (event.type) {
    case 'document.imported':
      // queue document
      break;
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

export default router;
