import * as states from './states';
import { Session, StateHandler } from './types';
import { updateSession, getSession, clearSession } from './db';
import { sendText } from './whatsapp';

export async function processMessage(phone: string, input: string): Promise<void> {
  if (!input) return;

  const normalizedInput = input.trim();

  // Handle global commands
  if (normalizedInput.toUpperCase() === 'RESTART') {
    await clearSession(phone);
    const newSession: Session = { phone, state: 'WELCOME', data: {}, updated_at: new Date() };
    await updateSession(phone, 'WELCOME', {});
    await states['WELCOME'].prompt(phone, newSession);
    return;
  }

  let session = await getSession(phone);
  if (!session) {
    session = { phone, state: 'WELCOME', data: {}, updated_at: new Date() };
    await updateSession(phone, 'WELCOME', {});
    await states['WELCOME'].prompt(phone, session);
    return;
  }

  if (normalizedInput.toUpperCase() === 'HELP') {
    await sendText(phone, "Available commands:\n- RESTART: Start over the booking process\n- HELP: Show this help message");
    const currentHandler = (states as Record<string, StateHandler>)[session.state];
    if (currentHandler) {
      setTimeout(() => currentHandler.prompt(phone, session as Session), 500); // Small delay
    }
    return;
  }

  const handler = (states as Record<string, StateHandler>)[session.state];
  if (!handler) {
    console.error(`Unknown state: ${session.state}`);
    await sendText(phone, 'We encountered an error. Type RESTART to begin again.');
    return;
  }

  try {
    const result = await handler.handle(normalizedInput, session);

    if (result.error) {
      await sendText(phone, result.error);
      await handler.prompt(phone, session);
      return;
    }

    if (result.nextState && result.nextState !== session.state) {
      const newData = { ...session.data, ...result.updatedData };
      await updateSession(phone, result.nextState, newData);
      
      const newSessionInfo: Session = { phone, state: result.nextState, data: newData, updated_at: new Date() };
      
      const nextHandler = (states as Record<string, StateHandler>)[result.nextState];
      if (nextHandler) {
        await nextHandler.prompt(phone, newSessionInfo);
        
        // Auto-handle subsequent states if needed (e.g. DONE state transitions automatically if we want)
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
      await handler.prompt(phone, newSessionInfo);
    }
  } catch (err) {
    console.error('Error in state machine:', err);
    await sendText(phone, 'Something went wrong processing your request. Please try again.');
  }
}
