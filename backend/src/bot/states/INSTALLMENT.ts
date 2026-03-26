import { StateHandler, Session } from '../types';
import { createListMessage, createStateResponse } from '../messageBuilder';
import { updateEnquiry } from '../db';

const INSTALLMENT: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();
    const estimatedCost = session.data.estimated_cost || 0;

    if (input === 'plan_30_40_30' || (normalized.includes('30') && normalized.includes('40'))) {
      const advance = Math.round(estimatedCost * 0.3);
      const beforeEvent = Math.round(estimatedCost * 0.4);
      const afterEvent = estimatedCost - advance - beforeEvent;

      // Update enquiry with installment plan
      try {
        await updateEnquiry(session.phone, {
          installment_plan: '30_40_30',
          payment_schedule: [
            { due: 'now', amount: advance, label: 'Advance (30%)' },
            { due: 'before_event', amount: beforeEvent, label: 'Before Event (40%)' },
            { due: 'after_event', amount: afterEvent, label: 'After Event (30%)' },
          ],
        });
        console.log('Installment plan updated to 30_40_30');
      } catch (error) {
        console.error('Error updating enquiry with installment plan:', error);
      }

      return {
        nextState: 'PAYMENT_INITIATION',
        updatedData: {
          installment_plan: '30_40_30',
          payment_schedule: [
            { due: 'now', amount: advance, label: 'Advance (30%)' },
            { due: 'before_event', amount: beforeEvent, label: 'Before Event (40%)' },
            { due: 'after_event', amount: afterEvent, label: 'After Event (30%)' },
          ],
        },
      };
    }

    if (input === 'plan_50_50' || normalized.includes('50')) {
      const advance = Math.round(estimatedCost * 0.5);
      const beforeEvent = estimatedCost - advance;

      // Update enquiry with installment plan
      try {
        await updateEnquiry(session.phone, {
          installment_plan: '50_50',
          payment_schedule: [
            { due: 'now', amount: advance, label: 'Advance (50%)' },
            { due: 'before_event', amount: beforeEvent, label: 'Before Event (50%)' },
          ],
        });
        console.log('Installment plan updated to 50_50');
      } catch (error) {
        console.error('Error updating enquiry with installment plan:', error);
      }

      return {
        nextState: 'PAYMENT_INITIATION',
        updatedData: {
          installment_plan: '50_50',
          payment_schedule: [
            { due: 'now', amount: advance, label: 'Advance (50%)' },
            { due: 'before_event', amount: beforeEvent, label: 'Before Event (50%)' },
          ],
        },
      };
    }

    return {
      nextState: 'INSTALLMENT',
      error: 'Please select an installment plan from the list.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const estimatedCost = session.data.estimated_cost || 0;
    
    const plan1_advance = Math.round(estimatedCost * 0.3);
    const plan1_before = Math.round(estimatedCost * 0.4);
    const plan1_after = estimatedCost - plan1_advance - plan1_before;

    const plan2_advance = Math.round(estimatedCost * 0.5);
    const plan2_before = estimatedCost - plan2_advance;

    const message = createListMessage(
      phone,
      `Total estimated: ₹${estimatedCost.toLocaleString('en-IN')}\n\nChoose your installment plan:`,
      'Select Plan',
      [
        {
          title: 'Available Plans',
          rows: [
            {
              id: 'plan_30_40_30',
              title: '30 / 40 / 30',
              description: `₹${plan1_advance.toLocaleString('en-IN')} now · ₹${plan1_before.toLocaleString('en-IN')} before · ₹${plan1_after.toLocaleString('en-IN')} after`,
            },
            {
              id: 'plan_50_50',
              title: '50 / 50',
              description: `₹${plan2_advance.toLocaleString('en-IN')} now · ₹${plan2_before.toLocaleString('en-IN')} before event`,
            },
          ],
        },
      ],
      '💳 Payment Plan'
    );

    return createStateResponse('INSTALLMENT', phone, message);
  },
};

export default INSTALLMENT;
