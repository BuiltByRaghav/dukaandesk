# 🛒 DukaanDesk

**A modern grocery shop management app with voice ordering in four languages.**

Take orders by tapping, typing or simply *speaking*: "2 kilo tamatar aur 1 doodh". DukaanDesk understands English, हिन्दी, मराठी and ગુજરાતી.

🔗 **Live demo:** (https://dukaandesk-bowi.vercel.app/)
💻 **Source code:** https://github.com/BuiltByRaghav/dukaandesk

> **Demo login:** username `shopkeeper` · password `Jaibhole@2007`

---

## ✨ Features

- 🎤 **Voice ordering:** speak your order and it is turned into products and quantities (powered by Gnani Prisma v3.0 speech-to-text)
- 🌐 **Multilingual:** English, Hindi, Marathi and Gujarati, with automatic language detection
- 🧾 **Multiple orders:** run several independent customer orders side by side
- ✅ **Mark as Done:** completed orders move to a permanent history
- 🥬 **Custom products:** add your own items (like Paneer) alongside the built-in catalogue
- 🔐 **Shop-owner login** to protect the app
- 🔒 **Server-side pricing:** prices and totals are always calculated on the server, never trusted from the browser
- 🎨 **Clean green-and-white design** with smooth Framer Motion animations

---

## 🧰 Tech stack

| Part | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS, Framer Motion |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Voice | Gnani Speech-to-Text API |
| Hosting | Vercel (multi-service: website + API in one project) |

---

## 🗂️ Project structure

```
dukaandesk/
├── src/                  # React app
│   ├── components/
│   ├── utils/            # audio to WAV conversion
│   └── api.js            # all backend calls
├── server/               # Express API
│   ├── routes/           # products, orders, voice
│   ├── data/             # database access
│   ├── services/         # Gnani + order parser
│   └── server.js
└── vercel.json           # deploys website and API together
```

---

## 🚀 Run locally

**Requirements:** Node.js 18 or newer, and Chrome or Edge for voice.

**1. Start the server** (terminal 1)

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev
```

Open `server/.env` and add your key:

```
GNANI_API_KEY=your_key_here
```

**2. Start the website** (terminal 2, project root)

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev
```

Open **http://localhost:5173**

---

## ☁️ Deployment

Deployed on Vercel as a project with two services, configured in `vercel.json`:

- `app`: the React website, served at `/`
- `server`: the Express API, served at `/api/*`

Environment variables set in Vercel: `GNANI_API_KEY` and the login secrets. The microphone works because Vercel serves the site over HTTPS.

---

## ⚠️ Demo notes

- This is a demo build. Data is stored in SQLite on a temporary disk, so orders and custom products can reset after a redeploy or a period of inactivity.
- For real shop use, the next step is moving to a hosted database such as Turso.
- Each voice recording uses Gnani credit.

---

## 🛣️ Roadmap

- [ ] Hosted database for permanent storage
- [ ] Edit product prices from the app
- [ ] Translate the full interface
- [ ] Daily sales summary

---

Built with ❤️ by **Raghav**
