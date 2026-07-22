# Echo Room as an addon (GTM B)

Echo Room’s differentiated layer is the **playspace** (collaborative story rooms → companions + artifacts). Layers 1–2 (directory, IM, forum) are valuable in the full companion, but **not required** for addon distribution.

## What partners integrate

| Capability | Endpoint / surface | Notes |
|------------|-------------------|--------|
| Identity handoff | `POST /api/addon/session` | Bearer `ADDON_PARTNER_KEY`; returns handoff URL |
| Join / identity (native) | `POST /api/auth/start` with event code | Full companion path |
| Start private play | `POST /api/play-invites` → accept → `roomId` | Deep-link to `/room/[id]/play` |
| Open playspace | `/world` or quest join via `POST /api/room/join` | Matchmaking rooms; `isPrivate: false` |
| Seed content | `POST /api/organiser/events/[id]/forum` with `seedPlayspace: true` | Or future webhook with `{ title, body, type }` |
| Companions out | `GET /api/companions` | For host apps to show “people I already know” |
| Artifacts | `/artifact/[id]` + export APIs | Shareable decision/story maps |

## Session handoff (stub)

Set env `ADDON_PARTNER_KEY` on the Echo Room deployment.

```http
POST /api/addon/session
Authorization: Bearer <ADDON_PARTNER_KEY>
Content-Type: application/json

{
  "externalUserId": "whova_123",
  "displayName": "Alex Chen",
  "organisation": "Acme",
  "eventCode": "TEST2",
  "eventExternalId": "optional-if-no-eventCode",
  "returnUrl": "https://partner.app/event/…"
}
```

Response:

```json
{
  "echoSessionToken": "…",
  "playspaceUrl": "https://echo…/api/addon/handoff?token=…&next=/world%3Fembed%3D1",
  "userId": "…",
  "eventId": "…",
  "needsProfile": true,
  "expiresAt": "…"
}
```

Partner redirects the attendee browser to `playspaceUrl`.  
`GET /api/addon/handoff` sets the session cookie and forwards into `/world?embed=1`.

`eventCode` (preferred) or `eventExternalId` matching an active event code / event id is required. Users are upserted by `(eventId, externalUserId)`.

## Non-goals for addon v1

- Replacing partner agenda, check-in, or exhibitor tools
- Requiring the Event feed UI (content can be pushed via API)
- Slot-machine retention hooks
- Full SSO / OIDC (roadmap)

## Positioning one-liner

*Cold outreach becomes warm companionship because attendees co-authored a story — drop Echo Room in beside your existing event app.*
