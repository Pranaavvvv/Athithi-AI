import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function getFeatherlessReply(messages: {role: string, content: string}[], eventDetails: any): Promise<string> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === 'your_featherless_key_here') {
    return "(AI disabled - Please set FEATHERLESS_API_KEY in .env to enable our conversational Event VIP Concierge). In the meantime, please select a package from the options below:";
  }

  const systemPrompt = `You are the IntelliManager AI Banquet VIP Concierge. You are chatting via WhatsApp.
The client is booking an event.
Current Event Context:
- Event: ${eventDetails.eventType || 'Unknown'} for ${eventDetails.partyName || 'Unknown'}
- Guests: ${eventDetails.guestCount || 'Unknown'}
- Date & Time: ${eventDetails.date || 'Unknown'} at ${eventDetails.timeSlot || 'Unknown'}

Available Packages (prices per plate):
1. Standard (1000 INR) - Basic setup & meal
2. Premium (2000 INR) - Premium decor & catering
3. Elite (3500 INR) - Luxury experience, exotic menu
4. Personalized - Custom quote for unique needs

Instructions:
Respond to their latest message naturally. Discuss menu preferences, suggest cuisines (Indian, Continental, Pan-Asian, etc.), and recommend one of the 4 packages based on their taste and guest count. 
Keep your response friendly, enthusiastic, and CONCISE (maximum 2-3 short sentences, because this is WhatsApp). Tell them they can lock in a choice by clicking one of the buttons below!`;

  try {
    const response = await axios.post(
      'https://api.featherless.ai/v1/chat/completions',
      {
        model: 'meta-llama/Meta-Llama-3-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 200,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err: any) {
    console.error('Featherless AI Error:', err.response?.data || err.message);
    return "I'm having a little trouble thinking of a custom menu right now, but please review our packages below and choose one you like!";
  }
}
