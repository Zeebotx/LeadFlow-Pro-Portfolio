# Google login and application session

[Diagram index](README.md) · [Security](../../docs/security-and-privacy.md)

```mermaid
sequenceDiagram
    actor U as User
    participant B as Browser / popup
    participant A as Express authentication
    participant D as PostgreSQL
    participant G as Google / Passport
    U->>B: Choose Google sign-in
    B->>A: Begin login
    A->>D: Save expiring one-use state
    A-->>B: Provider authorization redirect
    B->>G: Authenticate and consent
    G-->>A: Authorization callback
    A->>D: Consume state
    A->>G: Passport identity exchange
    G-->>A: Provider profile
    A->>D: Find or create application identity
    A->>D: Save short-lived hashed handoff
    A-->>B: Redirect with one-use code
    B->>B: Remove code from browser URL
    B->>A: Exchange handoff code
    A->>D: Consume handoff and check authentication version
    A->>D: Record hashed refresh credential
    A-->>B: Application access credential and cookies
    B->>B: Persist session and notify initiating window when present
    B-->>U: Continue to workspace
```

The browser watcher checks message origin and popup source. The application then uses its own JWT and refresh lifecycle, not a Google bearer credential for lead APIs. Ordinary email/password login reaches that session model through bcrypt verification instead of the provider/handoff sequence.

The state implementation has cookie-correlation and compatibility behavior; this diagram does not claim unconditional browser binding. Provider verification, automatic account matching policy, popup restrictions, and deployed cookie/origin settings need appropriate review. The sequence describes the successful source path, with failure/revocation branches summarized in the security document.

Private evidence: `backend/routes/oauthRoutes.js`; `backend/config/passport.js`; `backend/middleware/oauthState.js`; `backend/controllers/oauthController.js`, `authController.js`; `frontend/src/app/auth/google/callback/page.js`; `frontend/src/lib/popupAuth.js`, `session.js`.
