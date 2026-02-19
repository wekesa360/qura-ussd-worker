import { USSDSession, MenuState, Env } from '../types';
import { BackendClient } from '../services/backendClient';

export class MenuHandler {
  private backend: BackendClient;

  constructor(private env: Env) {
    this.backend = new BackendClient(env.BACKEND);
  }

  async handleInput(session: USSDSession, input: string | null): Promise<string> {
    console.log(`[MenuHandler] Current State: ${session.currentMenu}, Input: ${input}`);

    try {
      switch (session.currentMenu) {
        case MenuState.WELCOME:
          return this.handleWelcome(session, input);

        case MenuState.REQUEST_CODE:
          return this.handleRequestCode(session, input);

        case MenuState.VERIFY_ID:
          return this.handleVerifyId(session, input);
          
        case MenuState.VERIFY_CODE:
          return this.handleVerifyCode(session, input);

        case MenuState.BALLOT_POSITION:
          return this.handleBallotPosition(session, input);

        case MenuState.REVIEW_VOTES:
          return this.handleReviewVotes(session, input);
          
        case MenuState.CONFIRM_SUBMISSION:
          return this.handleConfirmSubmission(session, input);

        case MenuState.FINAL_CONFIRM:
          return this.handleFinalConfirm(session, input);

        default:
          console.error(`[MenuHandler] Invalid state: ${session.currentMenu}`);
          return 'END Invalid session state. Please try again.';
      }
    } catch (error: any) {
      console.error('[MenuHandler] Error:', error);
      return 'END System error. Please try again later.';
    }
  }

  private async handleWelcome(session: USSDSession, input: string | null): Promise<string> {
    try {
      // Fetch active elections
      const electionsResult = await this.backend.getActiveElections();
      
      if (!electionsResult.success || !electionsResult.elections) {
        return 'END No active elections available.\n\nPlease try again later.';
      }
      
      const elections = electionsResult.elections;
      
      if (elections.length === 0) {
        return 'END No active elections available.\n\nPlease try again later.';
      }

      // If election has already been selected in-session, proceed with action menu.
      if (session.electionId) {
        if (!input) {
          return 'CON Welcome\n\n1. Request Verification Code\n2. Vote in Election';
        }

        const choice = input.trim();
        if (choice === '1') {
          session.currentMenu = MenuState.REQUEST_CODE;
          return 'CON Enter your Voter ID:';
        } else if (choice === '2') {
          session.currentMenu = MenuState.VERIFY_ID;
          return 'CON Enter your Voter ID:';
        }

        return 'END Invalid option. Please dial again.';
      }
      
      // If only one election, auto-select it
      if (elections.length === 1) {
        session.electionId = elections[0].id;
        
        if (!input) {
          return `CON Welcome to ${elections[0].name}\n\n1. Request Verification Code\n2. Vote in Election`;
        }
        
        const choice = input.trim();
        if (choice === '1') {
          session.currentMenu = MenuState.REQUEST_CODE;
          return 'CON Enter your Voter ID:';
        } else if (choice === '2') {
          session.currentMenu = MenuState.VERIFY_ID;
          return 'CON Enter your Voter ID:';
        } else {
          return 'END Invalid option. Please dial again.';
        }
      }
      
      // Multiple elections - show selection menu
      if (!input) {
        let response = 'CON Select Election:\n';
        elections.forEach((election: any, index: number) => {
          response += `${index + 1}. ${election.name}\n`;
        });
        return response;
      }
      
      // Handle election selection
      const selectionIndex = parseInt(input.trim());
      if (isNaN(selectionIndex) || selectionIndex < 1 || selectionIndex > elections.length) {
        return 'END Invalid election selection.';
      }
      
      const selectedElection = elections[selectionIndex - 1];
      session.electionId = selectedElection.id;
      
      return `CON ${selectedElection.name}\n\n1. Request Verification Code\n2. Vote in Election`;
    } catch (error: any) {
      console.error('[Welcome] Exception:', error);
      return 'END Service temporarily unavailable.\n\nPlease try again later.';
    }
  }

  private async handleRequestCode(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Voter ID is required.';
    }
    
    if (!session.electionId) {
      return 'END Election not selected. Please dial again.';
    }
    
    try {
      const voterId = input.trim();
      
      const result = await this.backend.requestVerificationCode({
        voterId,
        phoneNumber: session.phoneNumber,
        electionId: session.electionId
      });
      
      if (!result.success) {
        const errorMsg = result.error || 'Failed to send code';
        console.error(`[RequestCode] Error: ${errorMsg}`, result);
        return `END ${errorMsg}\n\nPlease try again or contact support.`;
      }
      
      return `END Verification code sent to your phone.\n\nDial ${this.env.AFRICAS_TALKING_SHORTCODE} again to vote.`;
    } catch (error: any) {
      console.error('[RequestCode] Exception:', error);
      return 'END Service temporarily unavailable.\n\nPlease try again later.';
    }
  }

  private async handleVerifyId(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Voter ID is required.';
    }
    
    if (!session.electionId) {
      return 'END Election not selected. Please dial again.';
    }
    
    try {
      const voterId = input.trim();
      session.voterId = voterId;

      // 1. Check if already voted
      const voteCheck = await this.backend.hasVoted({
        electionId: session.electionId,
        voterId
      });

      if ((voteCheck as any).success === false) {
        const errorMsg = (voteCheck as any).error || 'Failed to validate voting status.';
        return `END ${errorMsg}`;
      }
      
      if (voteCheck.hasVoted) {
        return 'END You have already cast your ballot in this election.\n\nThank you for participating!';
      }

      // 2. Request verification code
      const result = await this.backend.requestVerificationCode({
        voterId,
        phoneNumber: session.phoneNumber,
        electionId: session.electionId
      });

      if (!result.success) {
        const errorMsg = result.error || 'Verification failed';
        console.error(`[VerifyId] Error: ${errorMsg}`, result);
        return `END ${errorMsg}\n\nPlease try again or contact support.`;
      }

      session.currentMenu = MenuState.VERIFY_CODE;
      return `CON A 6-digit code has been sent to your phone.\n\nEnter the code to proceed:`;
    } catch (error: any) {
      console.error('[VerifyId] Exception:', error);
      return 'END Service temporarily unavailable.\n\nPlease try again later.';
    }
  }
  
  private async handleVerifyCode(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Verification code is required.';
    }
    
    try {
      const code = input.trim();
      
      // Validate code format (6 digits)
      if (!/^\d{6}$/.test(code)) {
        return 'END Invalid code format.\n\nCode must be 6 digits.';
      }
      
      const result = await this.backend.verifyVoterIdentity({
        voterId: session.voterId!,
        phoneNumber: session.phoneNumber,
        verificationCode: code,
        electionId: session.electionId!
      });
      
      if (!result.success) {
        const errorMsg = result.error || 'Invalid code';
        console.error(`[VerifyCode] Error: ${errorMsg}`, result);
        
        // Provide helpful error messages
        if (result.errorCode === 'CODE_EXPIRED') {
          return `END ${errorMsg}\n\nDial ${this.env.AFRICAS_TALKING_SHORTCODE} to request a new code.`;
        } else if (result.errorCode === 'ALREADY_VOTED_BLACKLIST' || result.errorCode === 'ALREADY_VOTED') {
          return `END ${errorMsg}\n\nThank you for participating!`;
        } else {
          return `END ${errorMsg}\n\nPlease try again.`;
        }
      }
      
      session.voterName = result.voterName;
      session.currentMenu = MenuState.BALLOT_POSITION;
      session.votingProgress.currentPositionIndex = 0;
      
      return this.showBallotPosition(session);
    } catch (error: any) {
      console.error('[VerifyCode] Exception:', error);
      return 'END Service temporarily unavailable.\n\nPlease try again later.';
    }
  }

  private async showBallotPosition(session: USSDSession): Promise<string> {
    try {
      const ballotResult = await this.backend.getBallot({
        electionId: session.electionId!,
        voterId: session.voterId!
      });

      if (!ballotResult.success || !ballotResult.ballot) {
        console.error('[ShowBallot] Failed to load ballot:', ballotResult);
        return 'END Failed to load ballot.\n\nPlease try again later.';
      }

      const positions = ballotResult.ballot.positions;
      const currentIndex = session.votingProgress.currentPositionIndex;

      // Check if we've gone through all positions
      if (currentIndex >= positions.length) {
        session.currentMenu = MenuState.REVIEW_VOTES;
        return this.showReviewVotes(session, positions);
      }

      const position = positions[currentIndex];
      
      if (!position.candidates || position.candidates.length === 0) {
        console.warn(`[ShowBallot] No candidates for position: ${position.title}`);
        // Skip to next position
        session.votingProgress.currentPositionIndex++;
        return this.showBallotPosition(session);
      }
      
      let response = `CON Vote for ${position.title}\n`;
      
      position.candidates.forEach((candidate: { name: string }, index: number) => {
        response += `${index + 1}. ${candidate.name}\n`;
      });
      
      // Add navigation options
      if (currentIndex > 0) {
        response += `0. Back`;
      }
      
      return response;
    } catch (error: any) {
      console.error('[ShowBallot] Exception:', error);
      return 'END Failed to load ballot.\n\nPlease try again later.';
    }
  }
  
  private async handleBallotPosition(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Invalid input.';
    }
    
    try {
      const ballotResult = await this.backend.getBallot({
        electionId: session.electionId!,
        voterId: session.voterId!
      });
      
      if (!ballotResult.success || !ballotResult.ballot) {
        console.error('[BallotPosition] Failed to load ballot:', ballotResult);
        return 'END Failed to load ballot.\n\nPlease try again later.';
      }
      
      const positions = ballotResult.ballot.positions;
      const currentIndex = session.votingProgress.currentPositionIndex;
      const position = positions[currentIndex];
      
      const selectionIndex = parseInt(input.trim());
      
      // Handle "Back" navigation
      if (selectionIndex === 0 && currentIndex > 0) {
        session.votingProgress.currentPositionIndex--;
        return this.showBallotPosition(session);
      }
      
      // Handle "Cancel" on first position
      if (selectionIndex === 0 && currentIndex === 0) {
        return 'END Voting cancelled.\n\nYour vote was not submitted.';
      }
      
      // Validate selection
      if (isNaN(selectionIndex) || selectionIndex < 1 || selectionIndex > position.candidates.length) {
        return `CON Invalid choice. Try again.\n\n${this.getBallotPositionText(position, currentIndex)}`;
      }
      
      // Store selection
      const selectedCandidate = position.candidates[selectionIndex - 1];
      session.votingProgress.selections[position.id] = selectedCandidate.id;
      
      // Move to next position
      session.votingProgress.currentPositionIndex++;
      return this.showBallotPosition(session);
    } catch (error: any) {
      console.error('[BallotPosition] Exception:', error);
      return 'END Service error.\n\nPlease try again later.';
    }
  }
  
  private getBallotPositionText(position: any, currentIndex: number): string {
    let response = `Vote for ${position.title}\n`;
    position.candidates.forEach((candidate: any, index: number) => {
      response += `${index + 1}. ${candidate.name}\n`;
    });
    if (currentIndex > 0) response += `0. Back`;
    return response;
  }
  
  private async showReviewVotes(session: USSDSession, positions: any[]): Promise<string> {
    let response = `CON Review your choices:\n`;
    
    let hasSelections = false;
    positions.forEach((position) => {
      const selectedId = session.votingProgress.selections[position.id];
      const selectedCandidate = position.candidates.find((c: any) => c.id === selectedId);
      if (selectedCandidate) {
        response += `${position.title}: ${selectedCandidate.name}\n`;
        hasSelections = true;
      }
    });
    
    if (!hasSelections) {
      return 'END No selections made.\n\nVoting cancelled.';
    }
    
    response += `\n1. Submit Vote\n2. Change Choices\n0. Cancel`;
    session.currentMenu = MenuState.CONFIRM_SUBMISSION;
    
    return response;
  }
  
  private async handleReviewVotes(session: USSDSession, input: string | null): Promise<string> {
     // This state is just a transition, re-render review
     return this.handleConfirmSubmission(session, input);
  }
  
  private async handleConfirmSubmission(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Invalid input.';
    }
    
    const choice = input.trim();
    
    if (choice === '0') {
      return 'END Voting cancelled.\n\nYour vote was not submitted.';
    } else if (choice === '1') {
      // Move to final confirmation
      session.currentMenu = MenuState.FINAL_CONFIRM;
      return 'CON Are you sure you want to submit?\nThis action cannot be undone.\n\n1. Yes, Submit\n0. No, Go Back';
    } else if (choice === '2') {
      // Restart voting
      session.votingProgress.currentPositionIndex = 0;
      session.votingProgress.selections = {};
      session.currentMenu = MenuState.BALLOT_POSITION;
      return this.showBallotPosition(session);
    } else {
      return 'END Invalid option.';
    }
  }

  private async handleFinalConfirm(session: USSDSession, input: string | null): Promise<string> {
    if (!input || !input.trim()) {
      return 'END Invalid input.';
    }
    
    const choice = input.trim();
    
    if (choice === '0') {
      // Go back to review
      session.currentMenu = MenuState.REVIEW_VOTES;
      const ballotResult = await this.backend.getBallot({
        electionId: session.electionId!,
        voterId: session.voterId!
      });
      
      if (ballotResult.success && ballotResult.ballot) {
        return this.showReviewVotes(session, ballotResult.ballot.positions);
      } else {
        return 'END Failed to load ballot.\n\nPlease try again.';
      }
    } else if (choice === '1') {
      // Submit vote
      try {
        const result = await this.backend.submitVote({
          electionId: session.electionId!,
          voterId: session.voterId!,
          votes: session.votingProgress.selections,
          sessionId: session.sessionId,
          phoneNumber: session.phoneNumber
        });
        
        if (!result.success) {
          const errorMsg = result.error || 'Unknown error';
          console.error('[FinalConfirm] Submission failed:', errorMsg, result);
          return `END Submission Failed: ${errorMsg}\n\nPlease contact support if this persists.`;
        }
        
        session.currentMenu = MenuState.VOTE_SUBMITTED;
        return `END Vote Submitted Successfully!\n\nReceipt: ${result.receiptCode}\n\nThank you for voting!`;
      } catch (error: any) {
        console.error('[FinalConfirm] Exception:', error);
        return 'END Submission failed due to system error.\n\nPlease try again later.';
      }
    } else {
      return 'END Invalid option.';
    }
  }
}
