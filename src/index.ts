import { Hono, Context } from 'hono';
import { SessionManager } from './services/sessionManager';
import { MenuHandler } from './handlers/menuHandler';
import { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get('/', (c: Context) => {
  return c.json({
    service: 'USSD Worker',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// USSD Webhook handler
app.post('/ussd', async (c: Context) => {
  const startTime = Date.now();
  let response = 'END System Error';
  
  try {
    const formData = await c.req.parseBody();
    
    const sessionId = formData['sessionId'] as string;
    const phoneNumber = formData['phoneNumber'] as string;
    const text = formData['text'] as string;
    const serviceCode = formData['serviceCode'] as string;
    
    console.log(`[USSD] Incoming: ${sessionId} | ${phoneNumber} | text: "${text}"`);
    
    if (!sessionId || !phoneNumber) {
      return c.text('END Invalid Request');
    }

    // Initialize session manager
    const sessionManager = new SessionManager(c.env.USSD_SESSIONS);
    let session = await sessionManager.getSession(sessionId);
    
    // Create new session if not exists
    if (!session) {
      session = await sessionManager.createSession(sessionId, phoneNumber);
    }
    
    // Update session phone number just in case
    session.phoneNumber = phoneNumber;
    
    // Get latest input (Africa's Talking sends concatenated string "1*2*1")
    const parts = text ? text.split('*') : [];
    const latestInput = parts.length > 0 ? parts[parts.length - 1] : null;
    
    // Handle menu logic
    const menuHandler = new MenuHandler(c.env);
    response = await menuHandler.handleInput(session, latestInput);
    
    // Save session state
    if (!response.startsWith('END')) {
      await sessionManager.saveSession(session);
    } else {
      // Optional: Clear session on END if we want generic cleanup
      // But keeping it allows for "Session Expired" checks or reentry logic if tailored
    }

  } catch (error: any) {
    console.error('[USSD] Error:', error);
    response = 'END Service temporarily unavailable. Please try again.';
  }
  
  const duration = Date.now() - startTime;
  console.log(`[USSD] Completed in ${duration}ms | Response: "${response.replace(/\n/g, '\\n')}"`);
  
  return c.text(response);
});

export default app;
