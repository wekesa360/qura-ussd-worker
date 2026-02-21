import { KVNamespace } from '@cloudflare/workers-types';
import { USSDSession, MenuState } from '../types';

export class SessionManager {
  private kv: KVNamespace;
  private readonly ttlSeconds: number;

  constructor(kv: KVNamespace, ttlSeconds: number = 60 * 30) {
    this.kv = kv;
    this.ttlSeconds = Math.max(60, ttlSeconds); // never below 1 minute
  }

  async getSession(sessionId: string): Promise<USSDSession | null> {
    try {
      const data = await this.kv.get(sessionId);
      if (!data) return null;
      
      try {
        return JSON.parse(data);
      } catch (parseError) {
        console.error('[SessionManager] JSON parse error:', parseError);
        // Delete corrupted session
        await this.kv.delete(sessionId).catch(() => {});
        return null;
      }
    } catch (error) {
      console.error('[SessionManager] KV get error:', error);
      return null; // Gracefully fail - will create new session
    }
  }

  async createSession(sessionId: string, phoneNumber: string): Promise<USSDSession> {
    const session: USSDSession = {
      sessionId,
      phoneNumber,
      currentMenu: MenuState.WELCOME,
      votingProgress: {
        currentPositionIndex: 0,
        selections: {},
      },
      lastActivity: Date.now(),
    };
    
    await this.saveSession(session);
    return session;
  }

  async saveSession(session: USSDSession): Promise<void> {
    try {
      session.lastActivity = Date.now();
      await this.kv.put(session.sessionId, JSON.stringify(session), {
        expirationTtl: this.ttlSeconds,
      });
    } catch (error) {
      console.error('[SessionManager] Save session error:', error);
      // Don't throw - let the flow continue
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.kv.delete(sessionId);
    } catch (error) {
      console.error('[SessionManager] Delete session error:', error);
      // Ignore deletion errors
    }
  }
}
