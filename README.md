# Estimate Buddy

Estimate Buddy is a lightweight Scrum story sizing tool. Capture, update, and delete backlog items while keeping track of their story point estimates.

## Features

- Add new stories with a title, description, and story point size.
- View the full list of stories saved in PostgreSQL.
- Edit or delete existing stories directly from the list.

## Project structure

```
scrum-size-it/
├── backend/
│   ├── Dockerfile
│   └── src/
├── frontend/
│   ├── Dockerfile
│   └── src/
└── docker-compose.yml
```

## Environment variables

Copy `.env.example` to `.env` (or export the variables manually) and update as needed.

```
# Backend configuration
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=estimate_buddy

# Frontend configuration
VITE_API_BASE_URL=http://localhost:4000
```

The backend requires the PostgreSQL connection variables. The frontend reads `VITE_API_BASE_URL` to reach the API.

## 1. Local development (without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend listens on the port defined by `PORT` (defaults to `4000`). Ensure a PostgreSQL database is available and matches the configured credentials.

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev -- --host
```

The React app runs on [http://localhost:5173](http://localhost:5173) and expects the backend to be reachable at the URL provided by `VITE_API_BASE_URL`.

## 2. Local Docker deployment

Build and run every component together:

```bash
docker compose up --build
```

- PostgreSQL: `localhost:5432`
- Backend API: [http://localhost:4000](http://localhost:4000)
- Frontend UI: [http://localhost:5173](http://localhost:5173)

## 3. GCP VM deployment (Compute Engine)

1. Copy the repository to the VM and install Docker & Docker Compose.
2. Export the required environment variables or provide a `.env` file.
3. Build and run the containers just like on a local machine:
   ```bash
   docker compose up --build -d
   ```
4. Expose ports `4000` (backend) and `5173` (frontend) through the VM firewall if you need remote access.

## 4. Cloud Run deployment (backend)

The backend runs as a standalone container and is ready for Cloud Run. From the `backend` directory:

```bash
# Authenticate Docker to Google Artifact Registry (replace REGION and PROJECT_ID)
gcloud auth configure-docker REGION-docker.pkg.dev

# Build the container image
docker build -t REGION-docker.pkg.dev/PROJECT_ID/estimate-buddy/estimate-buddy-backend:latest .

# Push the image
docker push REGION-docker.pkg.dev/PROJECT_ID/estimate-buddy/estimate-buddy-backend:latest
```

After pushing, deploy the image to Cloud Run and set the environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT`). Point the frontend at the Cloud Run URL by updating `VITE_API_BASE_URL` before building.

## Database schema

The backend automatically creates the `stories` table if it does not exist:

```sql
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  size INTEGER NOT NULL CHECK (size > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Useful commands

- `npm run dev` (backend): start the Express API with hot reload via `nodemon`.
- `npm run dev` (frontend): start the Vite development server.
- `npm run build` (frontend): generate an optimized production build.
