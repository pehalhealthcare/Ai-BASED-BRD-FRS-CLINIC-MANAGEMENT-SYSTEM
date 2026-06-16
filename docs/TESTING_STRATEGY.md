# Testing Strategy

Audit date: April 23, 2026

## Current Verified Commands

- `cd backend && npm test`
- `cd backend && npm run check:env`
- `cd frontend && npm run build`
- `cd ai-service && python -m pytest`

## Current Reality

Backend:

- Jest is the main automated verification layer.
- Current verified baseline: `17/17` suites, `104/104` tests passed.

AI service:

- Pytest covers health and rule-based placeholder endpoints.
- Current verified baseline: `21/21` tests passed.

Frontend:

- There is no dedicated automated test suite yet.
- Current verification is production build plus live dev-server startup checks.

## Recommended Near-Term Additions

- Add a minimal frontend smoke suite around auth guards and key route rendering.
- Add CI automation for backend Jest, frontend build, and AI pytest.
- Add Docker smoke verification in a Docker-enabled environment.
