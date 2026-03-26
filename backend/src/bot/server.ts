import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webhookGet, webhookPost } from './handler';
import { sessionMiddleware } from './middleware';
import { confirmPayment, getPendingConfirmations } from './financeWebhook';

dotenv.config();

export const botRouter = express.Router();

// WhatsApp webhook routes
botRouter.get('/webhook', webhookGet);
botRouter.post('/webhook', sessionMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await webhookPost(req, res);
    } catch (e) {
        next(e);
    }
});

// Finance Manager webhook routes (called by dashboard/agent)
botRouter.post('/finance/confirm-payment', confirmPayment);
botRouter.get('/finance/pending', getPendingConfirmations);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', botRouter);

const PORT = process.env.BOT_PORT || 5556;

// Standalone server execution if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AthithiAI WhatsApp Bot listening on port ${PORT}`);
    console.log(`  - WhatsApp webhook: POST /webhook`);
    console.log(`  - Finance confirm: POST /finance/confirm-payment`);
    console.log(`  - Finance pending: GET  /finance/pending`);
  });
}

export default app;
