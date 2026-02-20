import { KVNamespace } from '@cloudflare/workers-types';

export enum MenuState {
  WELCOME = 'WELCOME',
  REQUEST_CODE = 'REQUEST_CODE',
  VERIFY_ID = 'VERIFY_ID',
  VERIFY_CODE = 'VERIFY_CODE',
  BALLOT_POSITION = 'BALLOT_POSITION',
  REVIEW_VOTES = 'REVIEW_VOTES',
  CONFIRM_SUBMISSION = 'CONFIRM_SUBMISSION',
  FINAL_CONFIRM = 'FINAL_CONFIRM',
  VOTE_SUBMITTED = 'VOTE_SUBMITTED',
}

export interface VotingProgress {
  currentPositionIndex: number;
  selections: Record<string, string>; // positionId -> candidateId
}

export interface BallotCandidate {
  id: string;
  name: string;
}

export interface BallotPosition {
  id: string;
  title: string;
  candidates: BallotCandidate[];
}

export interface BallotCache {
  electionId: string;
  voterId: string;
  positions: BallotPosition[];
  fetchedAt: number;
}

export interface USSDSession {
  sessionId: string;
  phoneNumber: string;
  currentMenu: MenuState;
  voterId?: string;
  voterName?: string;
  electionId?: string;
  ballotCache?: BallotCache;
  votingProgress: VotingProgress;
  lastActivity: number;
}

export interface BackendService {
  getActiveElections(params: any): Promise<any>;
  requestVerificationCode(params: any): Promise<any>;
  verifyVoterIdentity(params: any): Promise<any>;
  getBallot(params: any): Promise<any>;
  submitVote(params: any): Promise<any>;
  hasVoted(params: any): Promise<any>;
}

export interface Env {
  BACKEND: BackendService;
  USSD_SESSIONS: KVNamespace;
  AFRICAS_TALKING_USERNAME: string;
  AFRICAS_TALKING_API_KEY: string;
  AFRICAS_TALKING_SHORTCODE: string;
  USSD_SESSION_TTL_SECONDS?: string;
  NODE_ENV: string;
}
