import { BackendService } from '../types';

export class BackendClient {
  constructor(private service: BackendService) {}

  async getActiveElections() {
    try {
      return await this.service.getActiveElections({});
    } catch (error) {
      console.error('[BackendClient] getActiveElections RPC error:', error);
      return {
        success: false,
        error: 'Service temporarily unavailable.',
      };
    }
  }

  async requestVerificationCode(params: {
    voterId: string;
    phoneNumber: string;
    electionId: string;
  }) {
    try {
      return await this.service.requestVerificationCode(params);
    } catch (error) {
      console.error('[BackendClient] requestVerificationCode RPC error:', error);
      return {
        success: false,
        error: 'Service temporarily unavailable.',
        errorCode: 'RPC_ERROR',
      };
    }
  }

  async verifyVoterIdentity(params: {
    voterId: string;
    phoneNumber: string;
    verificationCode: string;
    electionId: string;
  }) {
    try {
      return await this.service.verifyVoterIdentity(params);
    } catch (error) {
      console.error('[BackendClient] verifyVoterIdentity RPC error:', error);
      return {
        success: false,
        error: 'Service temporarily unavailable.',
        errorCode: 'RPC_ERROR',
      };
    }
  }

  async getBallot(params: {
    electionId: string;
    voterId: string;
  }) {
    try {
      return await this.service.getBallot(params);
    } catch (error) {
      console.error('[BackendClient] getBallot RPC error:', error);
      return {
        success: false,
        error: 'Failed to load ballot.',
      };
    }
  }

  async submitVote(params: {
    electionId: string;
    voterId: string;
    votes: Record<string, string>;
    sessionId: string;
    phoneNumber: string;
  }) {
    try {
      return await this.service.submitVote(params);
    } catch (error) {
      console.error('[BackendClient] submitVote RPC error:', error);
      return {
        success: false,
        error: 'Failed to submit vote.',
        errorCode: 'RPC_ERROR',
      };
    }
  }

  async hasVoted(params: {
    electionId: string;
    voterId: string;
  }) {
    try {
      return await this.service.hasVoted(params);
    } catch (error) {
      console.error('[BackendClient] hasVoted RPC error:', error);
      return {
        hasVoted: false,
        success: false,
        error: 'Unable to validate voter status. Please try again.',
      };
    }
  }
}
