# NEXORA — Real-World Engineering Problem-Solving Competition Platform
### Think. Solve. Adapt. Grow.
**Institutional Attribution:** Designed & Engineered by **E.G.S. Pillay Engineering College, Nagapattinam** (Autonomous, NAAC 'A' Grade Accredited).

---

## 1. Executive Summary & Purpose

**NEXORA** is a full-stack, production-oriented engineering problem-solving competition platform. Unlike traditional coding platforms that evaluate static submissions against expected unit tests, NEXORA is engineered to replicate real-world industrial unpredictability:

1. **Chronological 8-Stage Lifecycle:** From discovery to initial version (V1.0) immutable release, dual problem-solving pathways, unforeseen operational disruptions (V2.0 shift), live side-by-side constraint diffs, adaptive revisions, and standardized weighted evaluations.
2. **Dual Problem-Solving Pathways:** Equal recognition and standardized scoring for **Pathway A (AI-Assisted)** and **Pathway B (Without AI)**.
3. **Unexpected Problem Shifts:** Live injection of technical disruptions (e.g. sensor telemetry blackout, grid frequency collapse, hardware memory limits) requiring participants to submit adaptive revisions.
4. **Tamper-Proof Cryptographic Receipts:** Deterministic canonical SHA-256 ledger generating `NEX-SUB-YYYYMMDD-XXXXXXXX` and `NEX-REV-YYYYMMDD-XXXXXXXX` verifiable proofs.
5. **Absolute 3-Category Dashboard Architecture:** Strictly three dashboard views (**Member**, **Organiser**, and **Admin**). Judges access scoring via authorized Organizer permissions.
6. **Leaderboard Privacy:** Default concealed state for students until institutional release, preventing bias and preserving competition integrity. Ties are resolved by Criterion 3 (Adaptability to Problem Shift).

### Live Deployment URL
- **Production URL:** [https://nexora-egspec-2026.web.app](https://nexora-egspec-2026.web.app)
- **Firebase Project Console:** [https://console.firebase.google.com/project/nexora-egspec-2026/overview](https://console.firebase.google.com/project/nexora-egspec-2026/overview)
- **Firebase Project ID:** `nexora-egspec-2026`

---

## 2. Strict Dashboard Architecture (Exactly 3 Categories)

The platform strictly enforces **exactly three** dashboard categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXORA UNIFIED DASHBOARD                              │
├─────────────────────┬───────────────────────────┬───────────────────────────┤
│ 1. MEMBER           │ 2. ORGANISER              │ 3. ADMIN                  │
│    DASHBOARD        │    DASHBOARD              │    DASHBOARD              │
├─────────────────────┼───────────────────────────┼───────────────────────────┤
│ • Overview          │ • Competition Lifecycle   │ • System Metrics          │
│ • Enrolled Challenges│ • Problem V1 & V2 Engine │ • User & Role Management │
│ • Browse Challenges │ • Submissions & AI Decl.  │ • Master Leaderboard Ctrl │
│ • Submission Ledger │ • Scoped Judge Evaluation │ • Append-Only Audit Log   │
│ • Live Notifications│ • Leaderboard Visibility  │ • Server Health Monitor   │
└─────────────────────┴───────────────────────────┴───────────────────────────┘
```

> **Rules Enforced by Security Engine:**
> - No fourth dashboard exists or can be accessed.
> - No separate Judge Dashboard exists (Judges evaluate via scoped Organizer Dashboard permissions).
> - No separate Super Admin Dashboard exists.
> - The UI dynamically presents only the authenticated user's authorized category.

---

## 3. Technology Stack

- **Frontend:** Vanilla JavaScript (ES6+), Modern Semantic HTML5, CSS3 Custom Properties (Design System with Dark & Light Themes), Firebase JS SDK. No React, Angular, Vue, or Bootstrap.
- **Backend:** Node.js 20+, Express.js REST API, Helmet security headers, CORS protection, sliding-window rate limiting, bcryptjs credential hashing, native SHA-256 cryptographic receipt generator.
- **Database & Hosting:** Cloud Firestore (atomic transactions, immutable version history, participant limit caps), Firebase Authentication, Firebase Hosting.
- **Testing:** Node.js Native Test Runner (`node --test`), 31/31 core tests passing.

---

## 4. Eight-Stage Competition Workflow

```
[ Stage 01 ] ──▶ [ Stage 02 ] ──▶ [ Stage 03 ] ──▶ [ Stage 04 ]
Discovery &       Problem V1.0     Pathway Choice   Initial Solution
Registration      Release          (AI or Pure)     (NEX-SUB Receipt)
     │
     ▼
[ Stage 05 ] ──▶ [ Stage 06 ] ──▶ [ Stage 07 ] ──▶ [ Stage 08 ]
Problem Shift     Real-Time Alert   Adaptive Revision Evaluation &
V2.0 Disruption   & Diff Viewer    (NEX-REV Receipt) Standardized Rubric
```

### Seven-Criteria Weighted Rubric

1. **Problem Understanding:** 15%
2. **Technical Depth:** 15%
3. **Adaptability to Problem Shift:** 20% *(Primary Tie-Breaker)*
4. **Code Completeness:** 15%
5. **Practical Feasibility:** 15%
6. **Pathway Integrity:** 10%
7. **Innovation:** 10%
**Total = 100.00%**

---

## 5. Quick Start (Local Development)

### Prerequisites
- Node.js v20.x or higher
- Windows 11 PowerShell or Command Prompt

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Default development access keys:
- **Organizer Access Key:** `NEXORA-ORGANIZER-2026`
- **Administrator Access Key:** `NEXORA-ADMIN-2026`

### Step 3: Run Automated Verification Suite (31 Core Tests)
```powershell
npm test
```
*Executes all 31 automated tests verifying rubric calculations, score normalization, cross-key rejection, participant limits, version immutability, SHA-256 receipts, and hidden leaderboard protections.*

### Step 4: Launch Development Server
```powershell
npm start
```
Open your browser to:
- **Homepage:** `http://localhost:5000/index.html`
- **Competitions:** `http://localhost:5000/competitions.html`
- **Unified Login:** `http://localhost:5000/login.html`
- **Member Registration:** `http://localhost:5000/register.html`
- **Challenge Workspace:** `http://localhost:5000/workspace.html?id=comp-renewable-microgrid-2026`
- **Leaderboard:** `http://localhost:5000/results.html`

---

## 6. Deployment Guide (Windows 11 CMD / PowerShell)

### A. Firebase CLI Installation & Authentication
Open PowerShell as Administrator:
```powershell
npm install -g firebase-tools
firebase login
```

### B. Firebase Project Initialization
```powershell
firebase use --add
# Select your project id (e.g. nexora-egspec)
```

### C. Deploy Firestore Security Rules & Indexes
```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

### D. Deploy Frontend to Firebase Hosting
```powershell
firebase deploy --only hosting
```
The public frontend will be served securely with custom security headers defined in `firebase.json`.

### E. Deploy Backend to Google Cloud Run
For production deployment of the trusted Express backend:
```powershell
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project nexora-egspec

# Deploy containerized Express backend to Cloud Run
gcloud run deploy nexora-api `
  --source . `
  --platform managed `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars ORGANIZER_ACCESS_KEY="PROD-ORGANIZER-SECURE-KEY",ADMIN_ACCESS_KEY="PROD-ADMIN-SECURE-KEY"
```

---

## 7. Cost Monitoring, Quotas & Free Tier

NEXORA is designed with resource-conscious architecture:
1. **Firebase Hosting:** 10 GB storage free, 360 MB/day data transfer free.
2. **Cloud Firestore:** 50,000 document reads/day, 20,000 document writes/day, 1 GB storage free on Spark Plan.
3. **Cloud Run:** 2 million requests/month free on Google Cloud free tier.
4. **Billing & Alerts:** Set up budget alerts in Google Cloud Console (`Billing > Budgets & Alerts`) at \$5, \$10, and \$25 thresholds to eliminate unexpected charges.

---

## 8. Platform Security Architecture

- **Public Member Enrollment:** Restricted strictly to `@egspec.edu` domains. Public users are automatically assigned `role: participant`.
- **Privileged Access Keys:** Independent keys for Organizers and Admins verified on the trusted backend with cross-key rejection (Admin key rejected on Organizer dashboard, Organizer key rejected on Admin dashboard).
- **Session Expiration:** Protected categories automatically re-lock upon session invalidation or logout.
- **Append-Only Security Audit:** All login attempts, access denials, role alterations, and version publications are recorded in an immutable ledger.
- **Private Judge Moderation:** Evaluator internal remarks are stripped server-side and never delivered to participant clients.

---

**Institutional Attribution:**  
E.G.S. Pillay Engineering College, Nagapattinam &bull; Department of Academic Competitions & Industry Collaborations.  
*Think. Solve. Adapt. Grow.*
