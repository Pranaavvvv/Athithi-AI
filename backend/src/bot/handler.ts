import { Request, Response } from 'express';
import { processMessage } from './stateMachine';
import { sendText } from './whatsapp';

export async function webhookGet(req: Request, res: Response) {
  const verifyToken = process.env.VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
}

export async function webhookPost(req: Request, res: Response) {
  // Handle Meta's 200 ack immediately before processing to avoid timeouts
  res.sendStatus(200);

  const { botData } = req as any;
  if (!botData) return;

  const { phone, text } = botData;
  if (!phone || !text) return;

  // We process the incoming message asynchronously
  processMessage(phone, text).catch(err => {
    console.error('Error in background processing:', err);
    sendText(phone, 'An unexpected error occurred. Please send RESTART to begin again.').catch(console.error);
  });
}
