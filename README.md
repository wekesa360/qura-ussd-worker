# USSD Worker

USSD Worker for the Qura Election System - provides mobile voting interface via Africa's Talking USSD gateway.

## Features

- 🗳️ **Complete Voting Flow** - Request code, verify identity, cast ballot
- 🔐 **Secure Authentication** - 6-digit verification codes with phone number validation
- 📱 **Dynamic Election Selection** - Automatically fetches active elections
- ✅ **Vote Confirmation** - Multi-step confirmation before final submission
- 🛡️ **Error Handling** - Comprehensive error handling with user-friendly messages
- 🔄 **Session Management** - 10-minute session timeout with state preservation

## Architecture

The USSD worker communicates with the backend exclusively through **Cloudflare Service Bindings**, ensuring:
- No direct database access from USSD worker
- Secure, type-safe RPC calls
- Minimal configuration and dependencies
- Automatic scaling and load balancing

## Project Structure

```
ussd-worker/
├── src/
│   ├── index.ts              # Main USSD webhook handler
│   ├── types/                # TypeScript interfaces
│   ├── handlers/
│   │   └── menuHandler.ts    # USSD menu state machine
│   └── services/
│       ├── sessionManager.ts # KV-based session management
│       └── backendClient.ts  # Service binding wrapper
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json
└── tsconfig.json
```

## Environment Variables

Set in `wrangler.toml`:

```toml
[vars]
NODE_ENV = "production"
AFRICAS_TALKING_USERNAME = "sandbox"
AFRICAS_TALKING_SHORTCODE = "*384*8941#"
AFRICAS_TALKING_API_KEY = "your-api-key"
```

## Bindings

- **BACKEND** - Service binding to election-system worker
- **USSD_SESSIONS** - KV namespace for session storage

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# View logs
wrangler tail
```

## USSD Flow

1. **Welcome** - Select election (if multiple) or show menu
2. **Request Code** - Enter Voter ID to receive verification code
3. **Vote** - Enter Voter ID → Enter code → Select candidates
4. **Review** - Review selections with option to edit or cancel
5. **Confirm** - Final confirmation before submission
6. **Receipt** - Display receipt code and vote hash

## Testing

Use the [Africa's Talking Simulator](https://account.africastalking.com/apps/sandbox/simulator) to test the USSD flow:

1. Select "USSD" service
2. Enter shortcode: `*384*8941#`
3. Enter phone number: `+254XXXXXXXXX`
4. Follow the prompts

## Error Handling

All errors are handled gracefully with user-friendly messages:
- Network failures → "Service temporarily unavailable"
- Invalid input → Specific validation messages
- Already voted → "You have already cast your ballot"
- Expired codes → Instructions to request new code

## Security

- Verification codes expire after 10 minutes
- Phone number validation against voter records
- Blacklist prevents double voting
- Sessions expire after 10 minutes of inactivity
- No sensitive data stored in USSD worker

## Related Documentation

- [USSD Menu Flows](../backend/USSD_MENU_FLOWS.md)
- [USSD API Specification](../backend/USSD_API_SPECIFICATION.md)
- [USSD System Design](../backend/USSD_SYSTEM_DESIGN.md)
- [Deployment Guide](../backend/USSD_DEPLOYMENT_GUIDE.md)

## License

Proprietary - Qura Election System
