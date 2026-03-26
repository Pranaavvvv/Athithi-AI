import { StateHandler, Session, Enquiry } from '../types';
import { sendText } from '../whatsapp';
import { createEnquiry, clearSession } from '../db';

const DONE: StateHandler = {
  handle: async (input: string, session: Session) => {
    return { nextState: 'WELCOME', updatedData: {} };
  },
  prompt: async (phone: string, session: Session) => {
    const data = session.data;

    let enquiryId: number | null = null;
    try {
      const enquiry: Enquiry = {
        phone,
        party_name: data.partyName,
        event_type: data.eventType,
        date: data.date,
        time_slot: data.timeSlot,
        guest_count: data.guestCount,
        gst_number: data.gstNumber === 'N/A' ? undefined : data.gstNumber,
        package: data.package,
        status: 'TEMPORARY_ENQUIRY',
      };
      
      enquiryId = await createEnquiry(enquiry);
    } catch (error) {
      console.error('Error creating enquiry in DB:', error);
      await sendText(phone, 'Sorry, there was an issue creating your enquiry. Our team has been notified.');
      return;
    }

    if (data.isPersonalized) {
      await sendText(phone, `Thank you! Your enquiry has been received (ID: ${enquiryId}). Our team will reach out to you shortly to discuss a personalized package.`);
    } else {
      await sendText(phone, `Awesome! Your enquiry (ID: ${enquiryId}) has been successfully created. Your dashboard link will be sent once the payment is confirmed.`);
    }

    await clearSession(phone);
  },
};

export default DONE;
