# NexMeet — Real-Time Collaboration App

Native WebRTC (no third-party peer libraries, no polyfill issues) + Socket.io signaling.

## 🚀 Quick Start

### Step 1 — Install Server Dependencies
```bash
cd server
npm install
```

### Step 2 — Install Client Dependencies
```bash
cd ../client
npm install
```

### Step 3 — Start Server (Terminal 1)
```bash
cd server
npm run dev
# ✅ Should show: 🚀 Server running on port 5000
```

### Step 4 — Start Client (Terminal 2)
```bash
cd client
npm run dev
# ✅ Should show: Local: http://localhost:5173/
```

### Step 5 — Open Browser
Go to: http://localhost:5173

---

## 🧪 How to Test REAL Multi-User Communication

This is the important part — both users must join the **same room**.

1. Open **http://localhost:5173** in your normal browser window → Register/login as User 1.
   - You'll land in room `lobby` by default.
   - Click the **"🔗 Copy Invite"** pill at the top — it copies a link like:
     `http://localhost:5173/?room=lobby`

2. Open that **same copied link** in a **second window** (use an Incognito/Private window, or a different browser like Firefox) → Register/login as User 2.

3. Both browsers will request camera/mic permission — click **Allow** in both.

4. Within a couple seconds you should see:
   - User 1's video tile appear in User 2's window, and vice versa.
   - Typing in the Chat tab shows up instantly in both windows.
   - Drawing on the Whiteboard tab syncs live between both windows.
   - Uploading a file in Files tab shows up in both windows.

> Two tabs in the **same browser window** sharing one camera can sometimes show a black tile for the second tab (the OS only lets one tab use the webcam at a time) — use two different browsers or one normal + one incognito window for a true test.

### Inviting more people / a different room
Just change the URL query param manually, e.g.:
```
http://localhost:5173/?room=team-standup
```
Anyone opening that exact URL joins that same room and connects to everyone else already in it (full mesh — works well for small groups, ~2-6 people).

---

## 🐛 Why the Previous Version Showed a White Screen

The old client used the `simple-peer` npm package, which depends on Node.js core modules (`global`, `process`, `Buffer`) that don't exist in a browser. Vite doesn't auto-polyfill these like older bundlers (Webpack/CRA) did, which caused:

```
ReferenceError: global is not defined
```

**This version removes `simple-peer` entirely** and uses the browser's native `RTCPeerConnection` API directly in `src/hooks/useWebRTC.js`. Nothing to polyfill, nothing to break.

---

## 📁 Project Structure
```
nexmeet/
├── client/                     ← React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx        ← Login / Register
│   │   │   ├── VideoGrid.jsx   ← Multi-user video tiles
│   │   │   ├── Whiteboard.jsx  ← Collaborative canvas
│   │   │   ├── Chat.jsx        ← Encrypted chat
│   │   │   ├── FileShare.jsx   ← File upload/share
│   │   │   └── Controls.jsx    ← Bottom control bar
│   │   ├── hooks/
│   │   │   ├── useSocket.js    ← Socket.io connection
│   │   │   └── useWebRTC.js    ← Native RTCPeerConnection mesh
│   │   ├── App.jsx             ← Main app layout + room logic
│   │   └── main.jsx            ← React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                     ← Node.js + Express backend
    ├── routes/
    │   └── auth.js              ← Register / Login endpoints
    ├── index.js                 ← Socket.io rooms + WebRTC signaling relay
    ├── .env                     ← JWT secret + port config
    └── package.json
```

---

## 🔧 Features
- ✅ Video calling — real native WebRTC, multi-user mesh
- ✅ Screen sharing (`getDisplayMedia`)
- ✅ Collaborative whiteboard (synced via Socket.io)
- ✅ Encrypted file sharing (cross-user notifications)
- ✅ Real-time chat (cross-user, broadcast via server)
- ✅ JWT authentication
- ✅ E2E encryption (DTLS-SRTP, built into WebRTC by default)
- ✅ Shareable room links (`?room=xyz`)

## ⚠️ Known Limitations (by design, for a learning/demo project)
- Users list is in-memory on the server — restarting the server clears all registered accounts.
- No TURN server configured — works on the same network / most home networks via STUN, but users behind strict corporate firewalls may fail to connect peer-to-peer. For production, add a TURN server (e.g. https://www.metered.ca/tools/openrelay/) to the `ICE_SERVERS` array in `useWebRTC.js`.
- Full mesh WebRTC scales well up to ~6 participants; beyond that a media server (SFU) like mediasoup or LiveKit would be needed.
