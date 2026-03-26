import { Pool } from 'pg';
import { Session, Enquiry, Package } from './types';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function getSession(phone: string): Promise<Session | null> {
  const result = await pool.query('SELECT * FROM sessions WHERE phone = $1', [phone]);
  const session = result.rows[0] || null;
  
  if (session) {
    console.log(`Retrieved session for ${phone}:`, {
      state: session.state,
      dataKeys: Object.keys(session.data || {}),
      data: session.data
    });
  } else {
    console.log(`No session found for ${phone}`);
  }
  
  return session;
}

export async function updateSession(phone: string, state: string, data: Record<string, any>): Promise<void> {
  // Get existing session data to merge
  const existingSession = await getSession(phone);
  const mergedData = existingSession ? { ...existingSession.data, ...data } : data;
  
  console.log(`Updating session for ${phone}:`, {
    state,
    newData: data,
    existingData: existingSession?.data,
    mergedData
  });
  
  await pool.query(
    `INSERT INTO sessions (phone, state, data, updated_at) 
     VALUES ($1, $2, $3, NOW()) 
     ON CONFLICT (phone) DO UPDATE 
     SET state = EXCLUDED.state, data = EXCLUDED.data, updated_at = NOW()`,
    [phone, state, JSON.stringify(mergedData)]
  );
}

export async function clearSession(phone: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE phone = $1', [phone]);
}

export async function getPackages(): Promise<Package[]> {
  const result = await pool.query('SELECT * FROM packages ORDER BY price_per_plate ASC');
  return result.rows;
}

export async function createEnquiry(enquiry: Enquiry): Promise<number> {
  console.log('[DB] createEnquiry called for phone:', enquiry.phone, 'status:', enquiry.status);
  try {
    const result = await pool.query(
      `INSERT INTO enquiries 
       (phone, event_name, occasion_type, client_name, client_phone, guest_count, event_date, event_time_slot, 
        gst_number, package, estimated_cost, venue_id, venue_name, menu_type, menu_items, 
        decoration_id, decoration_name, installment_plan, payment_schedule, status, booking_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()) 
       RETURNING id`,
      [
        enquiry.phone,
        enquiry.event_name || null,
        enquiry.occasion_type || null,
        enquiry.client_name || null,
        enquiry.client_phone || null,
        enquiry.guest_count || null,
        enquiry.event_date || null,
        enquiry.event_time_slot || null,
        enquiry.gst_number || null,
        enquiry.package || null,
        enquiry.estimated_cost || null,
        enquiry.venue_id || null,
        enquiry.venue_name || null,
        enquiry.menu_type || null,
        enquiry.menu_items || null,
        enquiry.decoration_id || null,
        enquiry.decoration_name || null,
        enquiry.installment_plan || null,
        enquiry.payment_schedule ? JSON.stringify(enquiry.payment_schedule) : null,
        enquiry.status,
        enquiry.booking_id || null,
      ]
    );
    console.log('[DB] createEnquiry SUCCESS - id:', result.rows[0].id);
    return result.rows[0].id;
  } catch (err) {
    console.error('[DB] createEnquiry FAILED:', err);
    throw err;
  }
}

export async function updateEnquiry(phone: string, updateData: Partial<Enquiry>): Promise<void> {
  console.log('[DB] updateEnquiry called for phone:', phone, 'keys:', Object.keys(updateData));
  
  // First check if enquiry exists
  const existing = await pool.query('SELECT id FROM enquiries WHERE phone = $1 ORDER BY created_at DESC LIMIT 1', [phone]);
  console.log('[DB] updateEnquiry - existing rows found:', existing.rows.length);
  
  if (existing.rows.length === 0) {
    // No enquiry exists — create one with the provided data
    console.log(`[DB] No enquiry found for ${phone}, creating new one.`);
    await createEnquiry({
      phone,
      status: updateData.status || 'ENQUIRED',
      event_name: updateData.event_name,
      occasion_type: updateData.occasion_type,
      client_name: updateData.client_name,
      client_phone: updateData.client_phone,
      guest_count: updateData.guest_count,
      event_date: updateData.event_date,
      event_time_slot: updateData.event_time_slot,
      gst_number: updateData.gst_number,
      package: updateData.package,
      estimated_cost: updateData.estimated_cost,
      venue_id: updateData.venue_id,
      venue_name: updateData.venue_name,
      menu_type: updateData.menu_type,
      menu_items: updateData.menu_items,
      decoration_id: updateData.decoration_id,
      decoration_name: updateData.decoration_name,
      installment_plan: updateData.installment_plan,
      payment_schedule: updateData.payment_schedule,
    });
    return;
  }

  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Build dynamic update query
  for (const [key, value] of Object.entries(updateData)) {
    if (key !== 'id' && key !== 'phone' && key !== 'created_at') {
      if (key === 'payment_schedule' && value) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    console.log('[DB] updateEnquiry - no fields to update');
    return;
  }

  // Always update updated_at
  fields.push(`updated_at = NOW()`);

  values.push(existing.rows[0].id); // Use the enquiry ID for precise update

  const query = `UPDATE enquiries SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
  console.log('[DB] updateEnquiry - running query:', query, 'with', values.length, 'values');
  const result = await pool.query(query, values);
  console.log('[DB] updateEnquiry - rows affected:', result.rowCount);
}

export async function getEnquiryByPhone(phone: string): Promise<Enquiry | null> {
  const result = await pool.query('SELECT * FROM enquiries WHERE phone = $1 ORDER BY created_at DESC LIMIT 1', [phone]);
  return result.rows[0] || null;
}

export async function checkDateConflict(dateString: string, timeSlot: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM enquiries WHERE event_date = $1 AND event_time_slot = $2 AND status = $3 LIMIT 1',
    [dateString, timeSlot, 'BOOKED']
  );
  return result.rows.length > 0;
}

export async function getAlternativeDates(dateString: string): Promise<string[]> {
  const conflicts = await pool.query('SELECT event_date FROM enquiries WHERE status = $1', ['BOOKED']);
  const booked = new Set(conflicts.rows.map((row: any) => row.event_date));
  
  const [y, m, d] = dateString.split('-');
  let baseDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  
  const alternatives: string[] = [];
  let daysToAdd = 1;
  while (alternatives.length < 2) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    
    const formatted = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    if (!booked.has(formatted)) {
      alternatives.push(formatted);
    }
    daysToAdd++;
  }
  return alternatives;
}
