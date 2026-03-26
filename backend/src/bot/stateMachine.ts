import * as states from './states';
import { Session, StateHandler, StateResponse } from './types';
import { updateSession, getSession, clearSession, createEnquiry } from './db';
import { sendText } from './whatsapp';

export async function processMessage(phone: string, input: string): Promise<void> {
  if (!input) return;

  const normalizedInput = input.trim();

  // Handle global commands
  if (normalizedInput.toUpperCase() === 'RESTART') {
    await clearSession(phone);
    // Create a new enquiry record for this booking flow
    try {
      await createEnquiry({ phone, status: 'ENQUIRED' });
      console.log('[SM] Created new enquiry for RESTART:', phone);
    } catch (err) {
      console.error('[SM] Error creating enquiry on RESTART:', err);
    }
    const newSession: Session = { phone, state: 'GREETING', data: {}, updated_at: new Date() };
    await updateSession(phone, 'GREETING', {});
    const response = await states['GREETING'].prompt(phone, newSession);
    await sendWhatsAppResponse(response);
    return;
  }

  if (normalizedInput.toUpperCase() === 'CLEAR') {
    await clearSession(phone);
    await sendText(phone, '🧹 Chat cleared! Starting fresh. How can I help you today?');
    // Create a new enquiry record for this booking flow
    try {
      await createEnquiry({ phone, status: 'ENQUIRED' });
      console.log('[SM] Created new enquiry for CLEAR:', phone);
    } catch (err) {
      console.error('[SM] Error creating enquiry on CLEAR:', err);
    }
    const newSession: Session = { phone, state: 'GREETING', data: {}, updated_at: new Date() };
    await updateSession(phone, 'GREETING', {});
    const response = await states['GREETING'].prompt(phone, newSession);
    await sendWhatsAppResponse(response);
    return;
  }

  let session = await getSession(phone);
  if (!session) {
    // Create ENQUIRED record for new user
    try {
      await createEnquiry({
        phone,
        status: 'ENQUIRED'
      });
    } catch (err) {
      console.error('Error creating ENQUIRED record:', err);
    }
    
    session = { phone, state: 'GREETING', data: {}, updated_at: new Date() };
    await updateSession(phone, 'GREETING', {});
    const response = await states['GREETING'].prompt(phone, session);
    await sendWhatsAppResponse(response);
    return;
  }

  if (normalizedInput.toUpperCase() === 'HELP') {
    await sendText(phone, "Available commands:\n- RESTART: Start over the booking process\n- CLEAR: Clear chat and start fresh\n- HELP: Show this help message");
    const currentHandler = (states as Record<string, StateHandler>)[session.state];
    if (currentHandler) {
      setTimeout(async () => {
        const response = await currentHandler.prompt(phone, session as Session);
        await sendWhatsAppResponse(response);
      }, 500); // Small delay
    }
    return;
  }

  const handler = (states as Record<string, StateHandler>)[session.state];
  if (!handler) {
    console.warn(`Unknown state: ${session.state}. Resetting to GREETING.`);
    await clearSession(phone);
    const newSession: Session = { phone, state: 'GREETING', data: {}, updated_at: new Date() };
    await updateSession(phone, 'GREETING', {});
    const response = await states['GREETING'].prompt(phone, newSession);
    await sendWhatsAppResponse(response);
    return;
  }

  try {
    const result = await handler.handle(normalizedInput, session);

    if (result.error) {
      await sendText(phone, result.error);
      const response = await handler.prompt(phone, session);
      await sendWhatsAppResponse(response);
      return;
    }

    if (result.nextState && result.nextState !== session.state) {
      const newData = { ...session.data, ...result.updatedData };
      await updateSession(phone, result.nextState, newData);
      
      const newSessionInfo: Session = { phone, state: result.nextState, data: newData, updated_at: new Date() };
      
      const nextHandler = (states as Record<string, StateHandler>)[result.nextState];
      if (nextHandler) {
        const response = await nextHandler.prompt(phone, newSessionInfo);
        await sendWhatsAppResponse(response);
        
        // Handle special case for SUMMARY_CONFIRM with pending button message
        if (result.nextState === 'SUMMARY_CONFIRM' && newData.pending_button_message) {
          setTimeout(async () => {
            await sendWhatsAppResponse({
              next_state: 'SUMMARY_CONFIRM',
              session_updates: {},
              whatsapp_message: newData.pending_button_message
            });
          }, 500);
        }
        
        // Since DONE doesn't expect input, it resets the flow. 
        if (result.nextState === 'DONE') {
           // DONE has been called and displayed summary. We should move back to HOME/clear.
           // However, the prompt in DONE already clears session.
        }
      }
    } else if (result.nextState === session.state) {
      // Re-prompt in same state if data updated (like waiting for other event type)
      const newData = { ...session.data, ...result.updatedData };
      await updateSession(phone, session.state, newData);
      const newSessionInfo: Session = { phone, state: session.state, data: newData, updated_at: new Date() };
      const response = await handler.prompt(phone, newSessionInfo);
      await sendWhatsAppResponse(response);
    }
  } catch (err) {
    console.error('Error in state machine:', err);
    await sendText(phone, 'Something went wrong processing your request. Please try again.');
  }
}

export async function sendWhatsAppResponse(response: StateResponse): Promise<void> {
  // Send the main WhatsApp message
  await sendRawWhatsAppMessage(response.whatsapp_message);
  
  // Handle pending messages (for multi-message responses like image + text)
  if (response.session_updates?.pending_messages && Array.isArray(response.session_updates.pending_messages)) {
    // Send each pending message with a small delay
    for (const pendingMessage of response.session_updates.pending_messages) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between messages
      await sendRawWhatsAppMessage(pendingMessage);
    }
    
    // Clear pending messages after sending
    const updatedSessionUpdates = { ...response.session_updates };
    delete updatedSessionUpdates.pending_messages;
    // Note: We don't update the session here as it's already updated in the main flow
  }
}

async function sendRawWhatsAppMessage(message: any): Promise<void> {
  // Import the WhatsApp functions here to avoid circular dependencies
  const { sendText, sendButtons, sendList, sendImage } = await import('./whatsapp');
  
  if (message.type === 'text' && message.text) {
    await sendText(message.to, message.text.body);
  } else if (message.type === 'image' && message.image) {
    await sendImage(message.to, message.image.link, message.image.caption);
  } else if (message.type === 'interactive' && message.interactive) {
    if (message.interactive.type === 'button') {
      const buttons = message.interactive.action?.buttons?.map((btn: any) => ({
        id: btn.reply?.id || '',
        title: btn.reply?.title || '',
      }));
      await sendButtons(message.to, message.interactive.body.text, buttons);
    } else if (message.interactive.type === 'list') {
      const sections = message.interactive.action?.sections?.map((section: any) => ({
        title: section.title,
        rows: section.rows?.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
        })),
      }));
      await sendList(
        message.to,
        message.interactive.body.text,
        message.interactive.action?.button || 'Options',
        sections
      );
    }
  }
}
