# 🚀 NEXORA Platform — Complete Public Deployment Guide
### Institutional Competition Engine for E.G.S. Pillay Engineering College, Nagapattinam

This guide walks you through deploying the complete NEXORA platform to the public using:
- **MongoDB Atlas** (Cloud Database)
- **Render** (Node.js API & Web Service)
- **Vercel** (Frontend & Serverless Edge Hosting)
- **Firebase** (Firebase Hosting & Authentication)

---

## 🏗️ Architecture & Deployment Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                  Public Users & Students                    │
   └───────────────┬─────────────────────────────┬───────────────┘
                   │                             │
                   ▼                             ▼
       ┌───────────────────────┐     ┌───────────────────────┐
       │   Vercel / Firebase   │     │    Render Backend     │
       │   Edge CDN Frontend   │────▶│    Node.js Service    │
       │ (Static & Dashboards) │     │     (Port 10000)      │
       └───────────────────────┘     └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │     MongoDB Atlas     │
                                     │     Cloud Cluster     │
                                     │   (Collections Data)  │
                                     └───────────────────────┘
```

---

## 🍃 Step 1: Set Up MongoDB Atlas (Cloud Database)

1. **Sign Up**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and log in or create a free account.

2. **Create a Free Cluster**:
   - Choose the **M0 Free** cluster (Shared, AWS / Mumbai `ap-south-1` region recommended).
   - Cluster Name: `nexora-cluster` (or default `Cluster0`).

3. **Configure Database Access (User)**:
   - Navigate to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `nexora_admin`
   - Password: Choose a strong password (e.g. `EgspecNexora2026!`).
   - Role: **Read and write to any database**.
   - Click **Add User**.

4. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security** → **Network Access**.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Confirm**.

5. **Get Connection String**:
   - Navigate to **Database** → Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```
     mongodb+srv://nexora_admin:<password>@cluster0.abcde.mongodb.net/nexora?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password.
   - *(Note: If your password contains `@`, `#`, `$`, URL-encode them: `@` ➔ `%40`, `#` ➔ `%23`)*

6. **Verify Connection Locally**:
   - Add the string to your `.env` file:
     ```env
     MONGODB_URI="mongodb+srv://nexora_admin:EgspecNexora2026%21@cluster0.abcde.mongodb.net/nexora?retryWrites=true&w=majority"
     ```
   - Run the diagnostic test:
     ```bash
     npm run test:mongo
     ```

---

## ⚡ Step 2: Deploy Backend to Render

1. **Push Code to GitHub**:
   - Create a GitHub repository (e.g. `nexora-platform`) and push this codebase.

2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository.

3. **Configure Service**:
   - **Name**: `nexora-engine` (or your choice)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

4. **Add Environment Variables in Render**:
   In the Render dashboard under **Environment Variables**, add:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Auto-detected by Render |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas SRV URI |
   | `ORGANIZER_ACCESS_KEY` | `NEXORA-ORGANIZER-2026` | Change for production security |
   | `ADMIN_ACCESS_KEY` | `NEXORA-ADMIN-2026` | Change for production security |
   | `SESSION_SECRET` | `your_random_secret_32_characters_here` | Long secret token |
   | `HASH_SALT_ROUNDS` | `10` | Standard bcrypt rounds |

5. **Deploy**:
   - Click **Create Web Service**.
   - Render will build and deploy. Once live, your backend will be accessible at:
     `https://nexora-engine.onrender.com`
   - Health check: `https://nexora-engine.onrender.com/api/health`

---

## ▲ Step 3: Deploy Frontend & Fullstack to Vercel

Vercel can host the platform with global edge caching and fast loading.

### Option A: 1-Click Vercel Fullstack Deployment
Because `vercel.json` and `api/index.js` are already configured:
1. Go to [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Framework Preset: **Other**.
5. Root Directory: `./`
6. Add Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas URI
   - `ORGANIZER_ACCESS_KEY`: `NEXORA-ORGANIZER-2026`
   - `ADMIN_ACCESS_KEY`: `NEXORA-ADMIN-2026`
   - `SESSION_SECRET`: `your_random_secret`
7. Click **Deploy**.
8. Your platform will be live at `https://nexora-platform.vercel.app`!

### Option B: Vercel CLI Deployment
Run directly from terminal:
```bash
npm run deploy:vercel
```

---

## 🔥 Step 4: Deploy to Firebase Hosting

NEXORA comes pre-configured with `firebase.json` and `.firebaserc`.

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy to Firebase Hosting**:
   ```bash
   npm run deploy:firebase
   ```
   Or:
   ```bash
   firebase deploy --only hosting
   ```
4. Once deployed, the frontend will be publicly accessible at:
   `https://nexora-egspec-2026.web.app`

---

## 🔗 Step 5: Connecting Frontend to Render Backend (If Hosted Separately)

If you host the frontend on **Vercel** / **Firebase Hosting** and the backend on **Render**:
1. Open [`public/js/firebase-config.js`](file:///c:/Users/mural/Downloads/nexora/public/js/firebase-config.js).
2. Set your Render URL:
   ```javascript
   window.NEXORA_API_URL = "https://nexora-engine.onrender.com/api";
   ```
   *Or* users can run in browser console:
   ```javascript
   NexoraAPI.setApiBase("https://nexora-engine.onrender.com/api");
   ```
   *Or* if deploying fullstack to Render or Vercel, the default `'/api'` automatically connects to the same origin with zero configuration!

---

## 🧪 Verification Checklist After Deployment

- [ ] **Health Check**: Visit `https://your-backend/api/health` ➔ should show `"status": "ONLINE"` and `"mongoAtlas": { "connected": true }`.
- [ ] **Register Student**: Register a new student account using an `@egspec.edu` email on `/register.html`.
- [ ] **Organiser Login**: Log in at `/login.html` with Organizer Key `NEXORA-ORGANIZER-2026`.
- [ ] **Admin Login**: Log in with Admin Key `NEXORA-ADMIN-2026`.
- [ ] **Atlas Records**: Inspect MongoDB Atlas collections to see user and competition documents being synchronized in real time!
