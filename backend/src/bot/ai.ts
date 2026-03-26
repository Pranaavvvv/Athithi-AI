import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

function getMenuData(): string {
  try {
    const csvPath = path.resolve(__dirname, '../../../../agents/data/menu_pricing.csv');
    return fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    // Fallback with hardcoded data
    return `tier,category,item_name,price_per_guest
standard,starter,Veg Spring Rolls,80
standard,starter,Paneer Tikka,100
standard,starter,Aloo Tikki Chaat,70
standard,main_course,Dal Makhani,120
standard,main_course,Jeera Rice,80
standard,main_course,Mixed Veg Curry,100
standard,main_course,Butter Naan,40
standard,dessert,Gulab Jamun,60
standard,dessert,Ice Cream,50
standard,beverage,Soft Drinks,40
standard,beverage,Masala Chai,30
premium,starter,Hara Bhara Kebab,130
premium,starter,Tandoori Mushroom,150
premium,starter,Dahi Ke Kebab,120
premium,main_course,Paneer Butter Masala,180
premium,main_course,Hyderabadi Biryani,200
premium,main_course,Garlic Naan,60
premium,main_course,Raita,40
premium,dessert,Rasmalai,90
premium,dessert,Phirni,80
premium,beverage,Fresh Lime Soda,50
premium,beverage,Masala Chaas,40
elite,starter,Truffle Mushroom Vol-au-Vent,250
elite,starter,Saffron Paneer Tikka,220
elite,starter,Lobster Bisque Shots,350
elite,main_course,Lobster Thermidor,400
elite,main_course,Truffle Risotto,300
elite,main_course,Lamb Shank Rogan Josh,350
elite,main_course,Artisan Sourdough,100
elite,dessert,Belgian Chocolate Mousse,200
elite,dessert,Saffron Crème Brûlée,180
elite,beverage,Mocktail Bar,150
elite,beverage,Premium Coffee Station,100`;
  }
}

const SYSTEM_PROMPT = `You are AthithiAI AI 🎩, a smart and charming Banquet Event Planner on WhatsApp.

YOUR MISSION: Have a natural, warm, flowing conversation to collect ALL booking details. You are NOT a robotic form. Act like a real human event planner who discusses, recommends, and guides the client.

═══════════════════════════════════════
📋 FIELDS TO COLLECT (all required):
═══════════════════════════════════════

1. **partyName** — Name of the event (e.g., "Sharma Wedding", "ACME Annual Gala")
2. **clientName** — Full name of the person booking
3. **eventType** — Wedding / Birthday / Anniversary / Corporate / Other
4. **location** — One of: Main Hall, Rooftop Lounge, Garden Area, Poolside
   - Main Hall: Grand, 500+ capacity, ideal for weddings
   - Rooftop Lounge: Intimate, 100 capacity, city views, great for cocktails
   - Garden Area: Open-air, 300 capacity, perfect for daytime events
   - Poolside: 200 capacity, modern vibe, great for parties
5. **date** — Event date (accept ANY natural format: "next Saturday", "March 28", "28/03/2026", etc. Convert to DD/MM/YYYY)
6. **timeSlot** — Morning (8am-12pm) / Afternoon (12pm-5pm) / Evening (5pm-11pm)
7. **guestCount** — Number of expected guests (accept natural language: "around 200", "roughly 150")
8. **gstNumber** — GST number for billing. If they say "no", "don't have one", "NA", "not applicable" — set to "N/A"
9. **package** — Menu tier: Standard / Premium / Elite (recommend based on guest count + event type)
10. **menu** — Specific menu items selected from the CSV below (recommend items intelligently)
11. **decoration** — Minimalist Floral / Theme Based / Grand Extravaganza

═══════════════════════════════════════
🍽️ MENU PRICING DATA (from CSV):
═══════════════════════════════════════

MENU_DATA_PLACEHOLDER

═══════════════════════════════════════
💰 PACKAGE TIER PRICING (per guest):
═══════════════════════════════════════

• **Standard** — ~₹770/guest (basic starters, dal makhani, rice, naan, basic desserts, soft drinks)
• **Premium** — ~₹1,140/guest (kebabs, biryani, paneer butter masala, rasmalai, fresh lime)
• **Elite** — ~₹2,600/guest (truffle dishes, lobster, saffron items, belgian chocolate, mocktail bar)

═══════════════════════════════════════
🎀 DECORATION OPTIONS:
═══════════════════════════════════════

• **Minimalist Floral** — Simple elegant flower arrangements
• **Theme Based** — Custom themes (Vintage, Neon, Royal, Rustic, etc.)
• **Grand Extravaganza** — Imported flowers, chandeliers, LED setups

═══════════════════════════════════════
🧠 CONVERSATION RULES:
═══════════════════════════════════════

1. Be CONVERSATIONAL. Don't ask for all fields at once. Start with name and event type, then location, then date/time, then guests, then package/menu, then decorations, then GST.
2. RECOMMEND things! If someone says "wedding for 200", suggest Garden Area or Main Hall, Premium or Elite package, and specific menu items.
3. When they mention guest count, immediately compute and mention estimated cost: "For 200 guests on Premium, that's approximately ₹2,28,000 🎉"
4. UNDERSTAND natural language:
   - "i dont have gst" → gstNumber: "N/A"
   - "this friday" → convert to actual date
   - "evening party" → timeSlot: "Evening"
   - "about 300 people" → guestCount: "300"
   - "go with premium" → package: "Premium"
5. Use emojis naturally (🎉 🍾 ✨ 🎊 🍽️ 💐) but don't overdo it.
6. Keep messages concise for WhatsApp — avoid walls of text.
7. PERSIST data from previous messages. Never lose already-collected information.

═══════════════════════════════════════
📤 OUTPUT FORMAT (STRICT):
═══════════════════════════════════════

You MUST output your ENTIRE response as a SINGLE valid JSON object. NO text outside the JSON.

{
  "replyToUser": "Your warm, conversational WhatsApp message here",
  "collectedData": {
    "partyName": "fill if known, else null",
    "clientName": "fill if known, else null",
    "eventType": "fill if known, else null",
    "location": "fill if known, else null",
    "date": "DD/MM/YYYY if known, else null",
    "timeSlot": "Morning/Afternoon/Evening if known, else null",
    "guestCount": "number as string if known, else null",
    "gstNumber": "GST number or N/A if known, else null",
    "package": "Standard/Premium/Elite if known, else null",
    "menu": "comma-separated selected items if known, else null",
    "decoration": "Minimalist Floral/Theme Based/Grand Extravaganza if known, else null"
  },
  "isComplete": false
}

Set "isComplete" to true ONLY when ALL 11 fields have valid non-null values.`;

/**
 * Process the full AI pipeline conversation for booking.
 */
export async function processAiPipeline(
  messages: { role: string; content: string }[],
  currentData: Record<string, any>
): Promise<{ reply: string; updatedData: any; isComplete: boolean }> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === 'your_featherless_key_here') {
    return {
      reply: "⚠️ AI is currently offline. Please try again later or type RESTART.",
      updatedData: currentData,
      isComplete: false,
    };
  }

  const menuData = getMenuData();
  const fullSystemPrompt = SYSTEM_PROMPT.replace('MENU_DATA_PLACEHOLDER', menuData);

  // Inject current data context so AI remembers
  const contextMessages = [
    { role: 'system', content: fullSystemPrompt },
    ...messages,
    {
      role: 'system',
      content: `CURRENT COLLECTED DATA (preserve these): ${JSON.stringify(currentData)}\n\nIMPORTANT: YOUR ENTIRE RESPONSE MUST BE A VALID JSON OBJECT. NO MARKDOWN, NO EXPLANATIONS. Format: {"replyToUser":"...","collectedData":{...},"isComplete":false}`,
    },
  ];

  try {
    const response = await axios.post(
      'https://api.featherless.ai/v1/chat/completions',
      {
        model: process.env.FEATHERLESS_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: contextMessages,
        max_tokens: 800,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    let rawString = response.data.choices[0].message.content.trim();

    // Strip markdown code fences if LLM wraps in ```json
    rawString = rawString.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

        // Try to locate JSON block anywhere in the text
        const jsonMatch = rawString.match(/\{[\s\S]*"collectedData"[\s\S]*\}/);
        if (jsonMatch) {
            rawString = jsonMatch[0];
        } else if (!rawString.startsWith("{")) {
            // The model output raw text instead of JSON.
            // Let's wrap it in our expected format so it doesn't fail.
            return {
                reply: rawString,
                updatedData: currentData,
                isComplete: false,
            };
        }

        try {
            const parsed = JSON.parse(rawString);
            // Merge: keep previously collected data, overlay new
            const mergedData: Record<string, any> = { ...currentData };
      if (parsed.collectedData) {
        for (const [key, value] of Object.entries(parsed.collectedData)) {
          if (value !== null && value !== undefined && value !== '') {
            mergedData[key] = value;
          }
        }
      }

      return {
        reply: parsed.replyToUser || "I'm here to help! What are we planning? 🎉",
        updatedData: mergedData,
        isComplete: parsed.isComplete === true,
      };
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', rawString);
      return {
        reply: "I got a bit tangled there! 😅 Could you repeat that? I want to make sure I get everything right.",
        updatedData: currentData,
        isComplete: false,
      };
    }
  } catch (err: any) {
    console.error('Featherless API Error:', err.response?.data || err.message);
    return {
      reply: "My AI brain is taking a quick nap 😴 Please try again in a moment!",
      updatedData: currentData,
      isComplete: false,
    };
  }
}

/**
 * Generic Featherless LLM call wrapper — used by AI_PLANNING and other states.
 */
export async function getFeatherlessReply(
  history: { role: string; content: string }[],
  sessionData: Record<string, any>
): Promise<string> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === 'your_featherless_key_here') {
    return "AI is currently unavailable. Please try again later.";
  }

  const menuData = getMenuData();
  const systemPrompt = `You are AthithiAI AI, a banquet event planning assistant.
You have access to this menu pricing data:
${menuData}

Available locations: Main Hall, Rooftop Lounge, Garden Area, Poolside
Decoration options: Minimalist Floral, Theme Based, Grand Extravaganza

The client has already provided these details:
${JSON.stringify(sessionData, null, 2)}

Help them finalize their package, menu selection, and decoration.
When ALL choices are finalized, include this tag in your response:
[FINALIZED_SELECTION: {"package": "...", "menu": "...", "decoration": "..."}]

Be conversational, use emojis, and keep messages WhatsApp-friendly.`;

  try {
    const response = await axios.post(
      'https://api.featherless.ai/v1/chat/completions',
      {
        model: process.env.FEATHERLESS_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        max_tokens: 600,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err: any) {
    console.error('Featherless API Error:', err.response?.data || err.message);
    return "I'm having trouble connecting right now. Please try again! 🔄";
  }
}
