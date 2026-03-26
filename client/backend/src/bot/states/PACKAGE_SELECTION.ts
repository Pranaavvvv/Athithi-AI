import { StateHandler, Session } from '../types';
import { sendButtons } from '../whatsapp';
import { getFeatherlessReply } from '../ai';

const PACKAGE_SELECTION: StateHandler = {
  handle: async (input: string, session: Session) => {
    // Expected exact matches for buttons
    const validPackages = ['Standard', 'Premium', 'Elite', 'Personalized'];
    
    // If the input is NOT one of the buttons, we treat it as AI discussion.
    if (!validPackages.includes(input)) {
        const history = session.data.aiChatHistory || [];
        history.push({ role: 'user', content: input });
        
        // Let's call Featherless
        const aiResponse = await getFeatherlessReply(history, session.data);
        history.push({ role: 'assistant', content: aiResponse });

        // Stay on this state, but update the chat history
        return { nextState: 'PACKAGE_SELECTION', updatedData: { aiChatHistory: history, lastAiReply: aiResponse } };
    }

    if (input === 'Personalized') {
      return { nextState: 'DONE', updatedData: { package: input, isPersonalized: true } };
    }

    return { nextState: 'CONFIRMATION', updatedData: { package: input } };
  },
  prompt: async (phone: string, session: Session) => {
    
    // For WhatsApp Interactive message limits: body max 1024 characters
    let message = session.data.lastAiReply || 
        "🍾 *Menu & Vibe Check!*\nBefore you choose a standard package, what kind of vibe and food are you looking for? \n\nOur AI VIP Concierge is here! Tell me your preferences (e.g., 'A grand Indian vegetarian feast' or 'Continental minimal') and I'll recommend the perfect package and some cool dishes! 😎\n\nOr simply hit one of the options below to skip the chat:";

    // Provide the 4 buttons via Meta's interactive list formatting (if >3 buttons, it falls back to list securely in our whatsapp.ts)
    const buttons = [
      { id: 'Standard', title: 'Standard (1000 INR)' },
      { id: 'Premium', title: 'Premium (2000 INR)' },
      { id: 'Elite', title: 'Elite (3500 INR)' },
      { id: 'Personalized', title: 'Custom Quote' },
    ];

    await sendButtons(phone, message, buttons);
  },
};

export default PACKAGE_SELECTION;
