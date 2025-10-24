# Estimate Buddy

Estimate Buddy is a lightweight real-time planning poker tool that helps agile teams agree on story sizes together. Create a room, invite your teammates, and estimate in real-time from any device.

## Features

- ⚡️ Instant rooms with shareable links
- 👥 Join as facilitator or participant with your own name
- 🗳️ Vote with classic Fibonacci or t-shirt sizes
- 👀 Reveal votes together and view the numeric average
- ♻️ Reset for the next story while keeping everyone connected
- 🗄️ Rooms and votes are stored in SQLite for simple persistence

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Real-time:** Socket.IO
- **Database:** SQLite (better-sqlite3)
- **Containerisation:** Docker & Docker Compose

## Getting Started

### 1. Clone and install dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure environment variables

Copy the example file and adjust values if needed:

```bash
cp .env.example .env
```

Key options:

- `PORT` – backend port (default `4000`)
- `CLIENT_ORIGIN` – URL of the frontend during development
- `DB_PATH` – SQLite database location (`./data/estimatebuddy.db` by default)
- `VITE_API_URL` – frontend API base URL (defaults to `http://localhost:4000`)
- `VITE_SOCKET_URL` – Socket.IO server URL

### 3. Run the backend

```bash
npm run dev --prefix backend
```

The API will start on `http://localhost:4000`.

### 4. Run the frontend

Open a second terminal and start Vite:

```bash
npm run dev --prefix frontend
```

Visit `http://localhost:5173` to use the app.

### Hosting a session

1. Create a room from the landing page and keep the facilitator tab open.
2. Share the link shown in the room controls (it omits the private owner token).
3. Ask teammates to join, enter their names, and pick their estimates.
4. Click **Reveal Votes** once everyone has submitted.
5. Use **Save & Reset Votes** to move on to the next story.

## Using Docker

You can build and run both services together with Docker Compose:

```bash
docker-compose up --build
```

The frontend will be available on `http://localhost:5173` and the backend on `http://localhost:4000`. Database data is stored in the local `./data` directory.

## Project Structure

```
estimate-buddy/
├── backend/
│   ├── server.js
│   ├── sockets.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/
│   │   │   └── useRoomSocket.js
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   └── RoomPage.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev --prefix backend` | Start the backend with hot reload (nodemon). |
| `npm start --prefix backend` | Start the backend server. |
| `npm run dev --prefix frontend` | Start the Vite dev server. |
| `npm run build --prefix frontend` | Build the production frontend bundle. |

## License

This project is provided as-is for demonstration purposes.
