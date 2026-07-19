# SewornaAI SaaS Integration

## Backend Environment

Set these variables before running `npm run dev`:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=sewornaai
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
CLIENT_ORIGIN=http://localhost:5173
PAYSTACK_SECRET_KEY=sk_live_...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=...
CONTACT_FROM_EMAIL=mailer@example.com
CONTACT_TO_EMAIL=admin@example.com
```

`FIREBASE_SERVICE_ACCOUNT_JSON` can be replaced with `GOOGLE_APPLICATION_CREDENTIALS` if the runtime uses Application Default Credentials.

## Frontend Environment

```bash
VITE_API_BASE_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Data Ownership

Every persisted user row stores `firebaseUid`, and every document stores `ownerId`. Workspace documents additionally store `workspaceId`; access is granted when the authenticated Firebase `uid` is a workspace member.

## React Integration Pattern

Wrap the app in `AuthProvider`, call `useAuth()` where UI needs sign-in state, and pass `getIdToken` into API functions:

```tsx
const { user, signInWithGoogle, getIdToken } = useAuth();
const { documents } = await listDocuments({ getIdToken });
await saveDocumentState({ title, bodyHtml, citationStyle }, { getIdToken });
```

Search and document upload already use this pattern. Workspace screens can use `listWorkspaces`, `createWorkspace`, and `upsertWorkspaceMember` from `apps/client/src/api/workspaces.ts`.

## Paystack Webhook

Create a Paystack webhook endpoint pointing to:

```text
POST /api/webhooks/paystack
```

Send subscription metadata with:

```json
{
  "firebaseUid": "firebase-user-id",
  "tier": "premium"
}
```

Supported tiers are `free`, `premium`, and `team`. Deleted subscriptions downgrade the user to `free`.
