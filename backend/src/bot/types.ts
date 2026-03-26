export interface Session {
  phone: string;
  state: string;
  data: Record<string, any>;
  updated_at: Date;
}

export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'interactive' | 'image';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
  image?: {
    link: string;
    caption?: string;
  };
}

export interface StateResponse {
  next_state: string;
  session_updates: Record<string, any>;
  whatsapp_message: WhatsAppMessage;
}

export interface Enquiry {
  id?: number;
  phone: string;
  event_name?: string;
  occasion_type?: string;
  client_name?: string;
  client_phone?: string;
  guest_count?: number;
  event_date?: string;
  event_time_slot?: string;
  gst_number?: string;
  package?: string;
  estimated_cost?: number;
  venue_id?: string;
  venue_name?: string;
  menu_type?: string;
  menu_items?: string;
  decoration_id?: string;
  decoration_name?: string;
  installment_plan?: string;
  payment_schedule?: any;
  status: string;
  booking_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Package {
  id: number;
  name: string;
  price_per_plate: number;
  description: string;
}

export interface StateResult {
  nextState?: string;
  updatedData?: Record<string, any>;
  error?: string;
}

export interface StateHandler {
  handle: (input: string, session: Session) => Promise<StateResult>;
  prompt: (phone: string, session: Session) => Promise<StateResponse>;
}
