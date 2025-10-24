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

## Deployment Guides

The following sections walk through end-to-end setup on the most common targets. Each flow assumes you have already cloned this repository unless otherwise specified.

### Windows 11 (PowerShell)

1. **Install prerequisites**
   - [Node.js 18+ (includes npm)](https://nodejs.org/en/download)
   - [Git for Windows](https://git-scm.com/download/win)
   - (Optional) [SQLite CLI](https://www.sqlite.org/download.html) if you want to inspect the database manually.
2. **Clone the repository**
   ```powershell
   git clone https://github.com/your-org/estimate-buddy.git
   cd estimate-buddy
   ```
3. **Create the environment file**
   ```powershell
   Copy-Item .env.example .env
   ```
4. **Install dependencies**
   ```powershell
   npm install --prefix backend
   npm install --prefix frontend
   ```
5. **Start the backend**
   ```powershell
   npm run dev --prefix backend
   ```
6. **Start the frontend** (in a second PowerShell window)
   ```powershell
   npm run dev --prefix frontend
   ```
7. **Open the app** at [http://localhost:5173](http://localhost:5173). The backend runs on [http://localhost:4000](http://localhost:4000).

> **Tip:** For production builds on Windows, run `npm run build --prefix frontend` and serve the contents of `frontend/dist` behind any static web server while pointing it to the running backend.

### Ubuntu (22.04 or similar)

1. **Install prerequisites**
   ```bash
   sudo apt update
   sudo apt install -y curl git sqlite3
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs build-essential
   ```
2. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/estimate-buddy.git
   cd estimate-buddy
   ```
3. **Create the environment file**
   ```bash
   cp .env.example .env
   ```
4. **Install dependencies**
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
5. **Start the backend**
   ```bash
   npm run dev --prefix backend
   ```
6. **Start the frontend** (new terminal)
   ```bash
   npm run dev --prefix frontend
   ```
7. **Visit the app** at `http://localhost:5173`.

### Docker (local containers)

1. **Prerequisites:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or the Docker Engine + Compose Plugin on Linux.
2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```
   Adjust values if necessary. `docker-compose.yml` reads the backend variables automatically.
3. **Launch the stack**
   ```bash
   docker compose up --build
   ```
   (Older Docker installations may require `docker-compose` with a hyphen.)
4. **Access services**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API & Socket.IO: [http://localhost:4000](http://localhost:4000)
5. **Persisted data** is stored in the host `./data` directory thanks to the volume mapping in `docker-compose.yml`.
6. **Stop containers** with `Ctrl+C`, then optionally clean up with `docker compose down`.

### Google Cloud Run

Cloud Run deploys container images. The repository already contains separate Dockerfiles for the backend and frontend plus a `docker-compose.yml` for local orchestration. For Cloud Run you typically deploy the backend as an API service and host the frontend separately (e.g., Cloud Storage + Cloud CDN). Below is a sample flow for the backend API.

1. **Install the Google Cloud CLI** by following the [official instructions](https://cloud.google.com/sdk/docs/install). Authenticate with your project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
2. **Enable required services**
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```
3. **Create an Artifact Registry repository** (once per project/region):
   ```bash
   gcloud artifacts repositories create estimate-buddy-repo \
     --repository-format=docker \
     --location=us-central1 \
     --description="Estimate Buddy containers"
   ```
4. **Build and push the backend image**
   ```bash
   gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/estimate-buddy-repo/backend:v1 backend
   ```
   This uses `backend/Dockerfile`. Update the tag as needed for later versions.
5. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy estimate-buddy-api \
     --image us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/estimate-buddy-repo/backend:v1 \
     --platform managed \
     --region us-central1 \
     --port 4000 \
     --set-env-vars "PORT=4000,DB_PATH=/tmp/estimatebuddy.db" \
     --allow-unauthenticated
   ```
   - For production-grade persistence, mount a Cloud SQL instance or Cloud Storage. The command above uses the container filesystem (ephemeral) for simplicity.
6. **Expose the frontend**
   - Run `npm run build --prefix frontend` locally.
   - Upload the contents of `frontend/dist` to a static host (e.g., Cloud Storage website, Firebase Hosting, or another Cloud Run service running a static file server like Nginx).
   - Configure the frontend environment variables (`VITE_API_URL`, `VITE_SOCKET_URL`) to point to the Cloud Run backend URL.
7. **Set up HTTPS domain & scaling** using standard Cloud Run features (custom domain mapping, min/max instances, etc.).

> **Debugging Cloud Run:** Use `gcloud run services describe estimate-buddy-api --region us-central1 --format=json` to inspect the live configuration and `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=estimate-buddy-api" --limit 50` for recent logs.


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
