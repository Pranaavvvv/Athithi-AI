import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const BASE_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

export async function sendText(phone: string, text: string): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;
  if (!text) return; // Skip empty messages

  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending text message:', error.response?.data || error.message);
  }
}

export async function sendButtons(
  phone: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  try {
    if (buttons.length > 3) {
      // Fallback to List message if more than 3 buttons
      await axios.post(
        BASE_URL,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: 'Options'
            },
            body: { text: bodyText },
            action: {
              button: 'Choose Option',
              sections: [
                {
                  title: 'Select one',
                  rows: buttons.map((btn) => ({
                    id: btn.id.substring(0, 200),
                    title: btn.title.substring(0, 24),
                  })),
                },
              ],
            },
          },
        },
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );
    } else {
      await axios.post(
        BASE_URL,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.map((btn) => ({
                type: 'reply',
                reply: {
                  id: btn.id.substring(0, 256),
                  title: btn.title.substring(0, 20),
                },
              })),
            },
          },
        },
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );
    }
  } catch (error: any) {
    console.error('Error sending interactive message:', error.response?.data || error.message);
  }
}

export async function sendList(
  phone: string,
  bodyText: string,
  buttonLabel: string,
  sections: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[],
  headerText?: string
): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  try {
    const interactive: any = {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel.substring(0, 20),
        sections: sections.map((section) => ({
          title: section.title.substring(0, 24),
          rows: section.rows.map((row) => ({
            id: row.id.substring(0, 200),
            title: row.title.substring(0, 24),
            description: row.description ? row.description.substring(0, 72) : undefined,
          })),
        })),
      },
    };

    if (headerText) {
      interactive.header = {
        type: 'text',
        text: headerText.substring(0, 60),
      };
    }

    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive,
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending list message:', error.response?.data || error.message);
  }
}

export async function sendImage(phone: string, imageUrl: string, caption?: string): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption || '',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending image message:', error.response?.data || error.message);
  }
}
