# Game Engine

This directory contains the **core game logic** for Among Lies.

## Why This Boundary Exists

The engine is intentionally isolated for:

- **Deterministic testing** — Same inputs always produce same outputs
- **Replayable state** — Game sessions can be reconstructed from commands
- **AI/bot compatibility** — Logic can run without network
- **Network independence** — No socket, HTTP, or I/O dependencies

## Game Rules

### Players
- **Minimum:** 3 players
- **Maximum:** 8 players
- **Imposter count:** Always 1

### Win Conditions
- **Citizens win:** Imposter is eliminated by majority vote
- **Imposter wins:** Imposter survives until final 2 players OR citizens vote wrong

### Win Check Timing
Win conditions are evaluated:
1. After every `VOTE_RESULT` phase
2. After every elimination

## What Belongs Here

- Pure validation functions (`validators.ts`)
- State reducers (`reducers.ts`)  
- Command orchestration (`core.ts`)
- Game rules and invariants

## What Does NOT Belong Here

- ❌ Socket handlers
- ❌ HTTP/network calls
- ❌ `Date.now()` or `Math.random()` (inject instead)
- ❌ Logging with side effects
- ❌ Database operations

## Commands

Commands represent **intent**, not effect.

```typescript
// Commands are:
// - Immutable
// - Validated before application
// - Never mutate state directly

type Command = 
  | { type: 'SUBMIT_VOTE', playerId, targetId }
  | { type: 'SUBMIT_HINT', playerId, hint }
  | { type: 'START_GAME', roomId }
```

## Invariants

1. All functions are **pure** — no mutations, no side effects
2. Time and randomness are **injected** via parameters
3. State changes return **new objects**, not mutations
4. Errors are returned as values, not thrown

## Phase Transitions

**`transitionToPhase` is the ONLY authority for phase changes.**

- `state.phase = ...` is FORBIDDEN outside engine
- Socket layer MUST use transitionToPhase
- Future: This will be technically enforced via readonly types

## Testing

```bash
npm test
```

All engine logic must be covered by unit tests.
