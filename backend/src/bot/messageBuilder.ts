import { WhatsAppMessage, StateResponse } from './types';

/**
 * Creates a WhatsApp text message object
 */
export function createTextMessage(to: string, body: string): WhatsAppMessage {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body,
    },
  };
}

/**
 * Creates a WhatsApp image message object
 */
export function createImageMessage(to: string, imageUrl: string, caption?: string): WhatsAppMessage {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption || '',
    },
  };
}

/**
 * Creates a WhatsApp button message object
 */
export function createButtonMessage(to: string, body: string, buttons: Array<{ id: string; title: string }>): WhatsAppMessage {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: body,
      },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    },
  };
}

/**
 * Creates a WhatsApp list message object
 */
export function createListMessage(
  to: string,
  body: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>,
  header?: string
): WhatsAppMessage {
  const message: WhatsAppMessage = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: body,
      },
      action: {
        button: buttonText,
        sections,
      },
    },
  };

  if (header) {
    message.interactive!.header = {
      type: 'text',
      text: header,
    };
  }

  return message;
}

/**
 * Creates a state response object with the standardized JSON format
 */
export function createStateResponse(
  nextState: string,
  phone: string,
  whatsappMessage: WhatsAppMessage,
  sessionUpdates: Record<string, any> = {}
): StateResponse {
  return {
    next_state: nextState,
    session_updates: sessionUpdates,
    whatsapp_message: whatsappMessage,
  };
}

/**
 * Creates a multi-message response (for image + text combinations)
 */
export function createMultiMessageResponse(
  nextState: string,
  phone: string,
  messages: WhatsAppMessage[],
  sessionUpdates: Record<string, any> = {}
): StateResponse {
  return {
    next_state: nextState,
    session_updates: {
      ...sessionUpdates,
      pending_messages: messages.slice(1), // Store additional messages
    },
    whatsapp_message: messages[0], // First message is sent immediately
  };
}
