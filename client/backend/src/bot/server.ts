import express from 'express';
import dotenv from 'dotenv';
import { webhookGet, webhookPost } from './handler';
import { sessionMiddleware } from './middleware';

dotenv.config();

export const botRouter = express.Router();

botRouter.get('/webhook', webhookGet);
botRouter.post('/webhook', sessionMiddleware, async (req, res, next) => {
    try {
        await webhookPost(req, res);
    } catch (e) {
        next(e);
    }
});

const app = express();
app.use(express.json());
app.use('/', botRouter);

const PORT = process.env.BOT_PORT || 5556;

// Standalone server execution if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`IntelliManager WhatsApp Bot listening on port ${PORT}`);
  });
}

export default app;
