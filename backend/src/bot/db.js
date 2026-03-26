const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getSession(phone) {
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

async function updateSession(phone, state, data) {
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

async function clearSession(phone) {
  await pool.query('DELETE FROM sessions WHERE phone = $1', [phone]);
}

async function getPackages() {
  const result = await pool.query('SELECT * FROM packages ORDER BY price_per_plate ASC');
  return result.rows;
}

async function createEnquiry(enquiry) {
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
  return result.rows[0].id;
}

async function updateEnquiry(phone, updateData) {
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
    return; // No fields to update
  }

  // Always update updated_at
  fields.push(`updated_at = NOW()`);

  values.push(phone); // Add phone for WHERE clause

  const query = `UPDATE enquiries SET ${fields.join(', ')} WHERE phone = $${paramIndex}`;
  await pool.query(query, values);
}

async function getEnquiryByPhone(phone) {
  const result = await pool.query('SELECT * FROM enquiries WHERE phone = $1 ORDER BY created_at DESC LIMIT 1', [phone]);
  return result.rows[0] || null;
}

async function checkDateConflict(dateString, timeSlot) {
  const result = await pool.query(
    'SELECT id FROM enquiries WHERE event_date = $1 AND event_time_slot = $2 AND status = $3 LIMIT 1',
    [dateString, timeSlot, 'BOOKED']
  );
  return result.rows.length > 0;
}

async function getAlternativeDates(dateString) {
  const conflicts = await pool.query('SELECT event_date FROM enquiries WHERE status = $1', ['BOOKED']);
  const booked = new Set(conflicts.rows.map((row) => row.event_date));
  
  const [y, m, d] = dateString.split('-');
  let baseDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  
  const alternatives = [];
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

module.exports = {
  getSession,
  updateSession,
  clearSession,
  getPackages,
  createEnquiry,
  updateEnquiry,
  getEnquiryByPhone,
  checkDateConflict,
  getAlternativeDates
};
