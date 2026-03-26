import { StateHandler, Session } from '../types';
import { sendText } from '../whatsapp';
import { processAiPipeline } from '../ai';

const AI_PIPELINE: StateHandler = {
  handle: async (input: string, session: Session) => {
    const history = session.data.aiChatHistory || [];
    history.push({ role: 'user', content: input });

    const extractionAttempt = await processAiPipeline(history, session.data.aiExtracted || {});

    history.push({ role: 'assistant', content: extractionAttempt.reply });

    if (extractionAttempt.isComplete) {
      const d = extractionAttempt.updatedData;
      return {
        nextState: 'CONFIRMATION',
        updatedData: {
          partyName: d.partyName,
          clientName: d.clientName,
          eventType: d.eventType,
          location: d.location,
          date: d.date,
          timeSlot: d.timeSlot,
          guestCount: d.guestCount,
          gstNumber: d.gstNumber,
          package: d.package,
          menu: d.menu,
          decoration: d.decoration,
          aiChatHistory: null,
          lastAiReply: null,
          aiExtracted: null,
        },
      };
    }

    return {
      nextState: 'AI_PIPELINE',
      updatedData: {
        aiChatHistory: history,
        aiExtracted: extractionAttempt.updatedData,
        lastAiReply: extractionAttempt.reply,
      },
    };
  },
  prompt: async (phone: string, session: Session) => {
    let message = session.data.lastAiReply;

    if (!message) {
      message =
        "🎉 *Welcome to AthithiAI AI!*\n\n" +
        "I'm your personal banquet concierge. Let's plan your perfect event together!\n\n" +
        "🍽️ *Our Packages:*\n" +
        "• *Standard* — ₹770/guest\n" +
        "• *Premium* — ₹1,140/guest\n" +
        "• *Elite* — ₹2,600/guest\n\n" +
        "📍 *Venues:* Main Hall · Rooftop Lounge · Garden Area · Poolside\n\n" +
        "Tell me — what's the occasion and what should we call this event? 🎊";
    }

    await sendText(phone, message);
  },
};

export default AI_PIPELINE;
