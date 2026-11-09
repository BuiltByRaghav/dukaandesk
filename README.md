# DukaanDesk

Grocery shop order manager with voice ordering (React + Vite, Node + Express, Gnani STT).

## Run locally

**Server** (terminal 1)
```
cd server
npm install
copy .env.example .env      (Mac/Linux: cp .env.example .env)
npm run dev
```
Then open `server/.env` and add your `GNANI_API_KEY`.

**Website** (terminal 2, project root)
```
npm install
copy .env.example .env      (Mac/Linux: cp .env.example .env)
npm run dev
```
Open http://localhost:5173

## Notes
- Orders are saved in `server/storage/orders.json`. Delete it to wipe all data.
- The Gnani key lives only in `server/.env`. Never put it in React code.
- Voice needs Chrome or Edge and microphone permission.