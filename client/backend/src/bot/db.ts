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
  return result.rows[0] || null;
}

export async function updateSession(phone: string, state: string, data: Record<string, any>): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (phone, state, data, updated_at) 
     VALUES ($1, $2, $3, NOW()) 
     ON CONFLICT (phone) DO UPDATE 
     SET state = EXCLUDED.state, data = EXCLUDED.data, updated_at = NOW()`,
    [phone, state, JSON.stringify(data)]
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
  const result = await pool.query(
    `INSERT INTO enquiries 
     (phone, party_name, event_type, date, time_slot, guest_count, gst_number, package, status, created_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
     RETURNING id`,
    [
      enquiry.phone,
      enquiry.party_name,
      enquiry.event_type,
      enquiry.date,
      enquiry.time_slot,
      enquiry.guest_count,
      enquiry.gst_number,
      enquiry.package,
      enquiry.status
    ]
  );
  return result.rows[0].id;
}

export async function checkDateConflict(dateString: string): Promise<boolean> {
  // Assuming dateString is DD/MM/YYYY
  const result = await pool.query('SELECT id FROM enquiries WHERE date = $1 LIMIT 1', [dateString]);
  return result.rows.length > 0;
}

// Simple lookup to find 2 nearest free dates (naive approach)
export async function getAlternativeDates(dateString: string): Promise<string[]> {
  const conflicts = await pool.query('SELECT date FROM enquiries');
  const booked = new Set(conflicts.rows.map((row: any) => row.date));
  
  const [d, m, y] = dateString.split('/');
  let baseDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  
  const alternatives: string[] = [];
  let daysToAdd = 1;
  while (alternatives.length < 2) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    
    const formatted = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
    if (!booked.has(formatted)) {
      alternatives.push(formatted);
    }
    daysToAdd++;
  }
  return alternatives;
}
