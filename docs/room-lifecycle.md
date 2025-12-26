# Room Lifecycle - Design Document

> **Status:** Planning Only (No Code)

## Current State (What We Have)

- `game.ts` is monolithic
- Socket handlers mutate state directly
- No clear command pattern

## Target State (What We Want)

### RoomState as Single Source of Truth

```typescript
type RoomState = {
  id: string;
  players: Player[];
  phase: GamePhase;
  votes: Record<string, string>;
  // ...all game data
};
```

### Socket Handler = Thin Adapter

```typescript
// Current (bad)
socket.on('submit_vote', (targetId) => {
  room.gameState.votes[playerId] = targetId; // Direct mutation
});

// Target (good)
socket.on('submit_vote', (targetId) => {
  const cmd = { type: 'SUBMIT_VOTE', playerId, targetId };
  const result = applyCommand(roomState, cmd);
  if (result.success) {
    roomState = result.newState;
    broadcastState(roomState);
  }
});
```

### Command Pattern

```typescript
function applyCommand(state: RoomState, cmd: Command): Result<RoomState> {
  // 1. Validate
  const error = validateCommand(state, cmd);
  if (error) return { success: false, error };
  
  // 2. Apply (pure reducer)
  const newState = reduceCommand(state, cmd);
  
  return { success: true, newState };
}
```

## Why Not Now?

1. Phase contract not yet battle-tested in production
2. Game commands still evolving
3. High regression risk

## Trigger Conditions

Start this work when:
- [ ] Phase contract stable for 2+ weeks
- [ ] No new game commands added
- [ ] Reconnect/resume feature requested

---

*This is a planning document. No code changes.*
