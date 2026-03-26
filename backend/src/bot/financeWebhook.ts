import { Request, Response } from 'express';
import { getSession, updateSession, updateEnquiry } from './db';
import * as states from './states';
import { sendWhatsAppResponse } from './stateMachine';

/**
 * Webhook endpoint for Finance Manager to confirm payment received
 * POST /api/bot/finance/confirm-payment
 * Body: { phone: string, payment_confirmed: boolean }
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const { phone, payment_confirmed } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const session = await getSession(phone);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.state !== 'AWAITING_FINANCE') {
      return res.status(400).json({ error: 'Session is not in AWAITING_FINANCE state' });
    }

    if (payment_confirmed) {
      // Move to DONE state
      await updateSession(phone, 'DONE', session.data);
      
      // Update enquiry status to BOOKED
      await updateEnquiry(phone, { status: 'BOOKED' });
      
      const newSession = { ...session, state: 'DONE' };
      const response = await states.DONE.prompt(phone, newSession);
      await sendWhatsAppResponse(response);

      return res.json({ success: true, message: 'Payment confirmed, booking completed' });
    } else {
      return res.json({ success: false, message: 'Payment not confirmed' });
    }
  } catch (err) {
    console.error('Error in confirmPayment webhook:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all pending finance confirmations
 * GET /api/bot/finance/pending
 */
export async function getPendingConfirmations(req: Request, res: Response) {
  try {
    // This would typically query the database for all enquiries with status 'ENQUIRY'
    // and state 'AWAITING_FINANCE'
    const { Pool } = require('pg');
    const dotenv = require('dotenv');
    dotenv.config();
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const result = await pool.query(
      `SELECT e.*, s.state FROM enquiries e 
       LEFT JOIN sessions s ON e.phone = s.phone 
       WHERE e.status = 'ENQUIRY' AND s.state = 'AWAITING_FINANCE'
       ORDER BY e.created_at DESC`
    );

    return res.json({
      success: true,
      pending_confirmations: result.rows
    });
  } catch (err) {
    console.error('Error in getPendingConfirmations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
