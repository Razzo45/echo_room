# Story Runtime Contract

## Canonical Room Phases
- waiting
- room_full
- ready_check
- preamble
- beat_input
- roll_reveal
- beat_consequence
- final_panel
- completed

## storyState shape (Room.storyState)
- phase
- currentBeat (1..3)
- readyCheck: { startedAt, deadlineAt, readyByPlayerId }
- beats[1..3]:
  - submissions[playerId] = actionText
  - revealed (bool)
  - rolls[playerId] = { value, band, rolledAt }
  - consequence = { text, mode, generatedAt }
  - resolved (bool)
- scoreboard:
  - playerTotals[playerId] 0..60
  - teamAverage 0..60
  - teamBand
- finalSynthesis: { status, text, mode }

## Idempotency
- One action submit per (room, beat, player)
- One roll per (room, beat, player)
- Consequence persisted once per beat (unless explicit admin override)

## Reconnect Rules
- UI renders from persisted phase only
- Skip suspense animation if roll already resolved
- Replay stored beat consequence text

## Scoring
- Player total out of 60
- Team score = average of 3 player totals, out of 60
- Bands apply to teamAverage
