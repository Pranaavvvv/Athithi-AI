export interface Session {
  phone: string;
  state: string;
  data: Record<string, any>;
  updated_at: Date;
}

export interface Enquiry {
  id?: number;
  phone: string;
  party_name?: string;
  event_type?: string;
  date?: string;
  time_slot?: string;
  guest_count?: string;
  gst_number?: string;
  package?: string;
  status: string;
  created_at?: Date;
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
  prompt: (phone: string, session: Session) => Promise<void>;
}
