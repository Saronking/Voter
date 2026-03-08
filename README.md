[README.md](https://github.com/user-attachments/files/25823263/README.md)
# VoteLive 🗳️

A real-time voting app with QR code sharing. Hosts manage sessions; participants vote instantly after scanning a QR code — no login required for voters.

---

## Features

- **Two voting modes**
  - **Elimination**: All options shown each round; the losing option is removed until one winner remains
  - **Bracket**: 2 or 4 options shown per round, cycling through all options
- **Real-time updates** via Supabase Postgres + Realtime
- **QR code generation & download** per session
- **Session persistence** — sessions are stored and can be restarted at any time
- **Live vote bars** update instantly for the host
- **Anonymous voting** — voters use a session-scoped ID, no account needed

---

## Setup

### 1. Create a Supabase Project

1. Go to https://supabase.com and create a new project
2. Wait for it to provision (~1 minute)

### 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** → **New query**
2. Paste the entire contents of `supabase-schema.sql` and click **Run**

### 3. Enable Realtime

1. Go to **Database** → **Replication**
2. Under **supabase_realtime**, enable the `sessions` table

### 4. Create an Admin User

1. Go to **Authentication** → **Users** → **Add user**
2. Create a user with email + password — this is your admin login

### 5. Configure the App

Open `src/lib/supabase.js` and paste in your credentials:

```js
const supabaseUrl = 'https://your-project-id.supabase.co'
const supabaseAnonKey = 'your-anon-public-key'
```

Find these in: **Project Settings** → **API** → Project URL + anon public key.

### 6. Run / Deploy

```bash
npm install
npm run dev
```

Or push to GitHub and import into bolt.new.

---

## Tech Stack

- **React 18** + **Vite**
- **Supabase** (Postgres + Realtime + Auth)
- **react-router-dom**
- **qrcode**

---

## Project Structure

```
src/
  lib/supabase.js          ← fill in your credentials here
  hooks/useAuth.js
  hooks/useSessions.js
  pages/LoginPage.jsx
  pages/AdminDashboard.jsx
  pages/SessionBuilder.jsx
  pages/ActiveSession.jsx
  pages/VoterView.jsx
  components/shared/QRModal.jsx
supabase-schema.sql        ← run this in Supabase SQL Editor
```
