import { Request, Response, NextFunction } from 'express';
import { getSession } from './db';

// Extend Express Request to include bot data
declare global {
  namespace Express {
    interface Request {
      botData?: {
        phone: string;
        text: string;
        session: any;
      };
    }
  }
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();

  if (req.body.object === 'whatsapp_business_account') {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const phone = message.from;
      let text = '';
      
      if (message.type === 'text') {
        text = message.text.body;
      } else if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
        text = message.interactive.button_reply.id;
      } else if (message.type === 'interactive' && message.interactive.type === 'list_reply') {
        text = message.interactive.list_reply.id;
      }

      const session = await getSession(phone);
      
      // Parse the data field if it's a string
      let parsedSession = session;
      if (session && typeof session.data === 'string') {
        try {
          parsedSession = {
            ...session,
            data: JSON.parse(session.data)
          };
        } catch (e) {
          console.error('Error parsing session data:', e);
          parsedSession = session;
        }
      }
      
      req.botData = {
        phone,
        text,
        session: parsedSession || { phone, state: 'GREETING', data: {}, updated_at: new Date() }
      };
    }
  }
  next();
}
