# AI Secure Data Intelligence Platform

AI-powered security analysis platform for logs and text inputs.

It combines:
- React frontend for file/text submission and result visualization
- Node.js backend API gateway
- Python FastAPI AI service for detection, scoring, and insights
- Optional MongoDB persistence (history)

## 1. Architecture

- Frontend: `frontend/` (React + Vite)
- Backend: `backend/` (Express API)
- AI Service: `ai-service/` (FastAPI)
- Data: MongoDB / MongoDB Atlas (optional but recommended)

Request flow:
1. Frontend submits content to backend (`POST /api/analyze`)
2. Backend forwards request to AI service
3. AI service returns findings, risk score, action, and insights
4. Backend stores result in MongoDB (if configured)
5. Frontend can load history from backend (`GET /api/history`)

## 2. Features

- Sensitive pattern detection (`password`, `api_key`, `token`, `stack_trace`, etc.)
- Risk scoring (`low`, `medium`, `high`, `critical`)
- LLM insights with provider fallback
- Rule-based fallback insights when LLM is unavailable
- Analysis history persisted in MongoDB
- History viewer in frontend with pagination and reload

## 3. Prerequisites

- Node.js 18+
- Python 3.10+
- Existing virtual environment in `ai-service/.venv`
- MongoDB local or MongoDB Atlas connection string (recommended)

## 4. Local Development

### 4.1 AI Service

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 4.2 Backend

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

### 4.3 Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL: `http://localhost:5173`

## 5. Environment Configuration

### 5.1 frontend/.env

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 5.2 backend/.env

```env
PORT=4000
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
```

### 5.3 ai-service/.env

```env
LLM_API_KEY=
LLM_MODEL=llama-3.1-8b-instant
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_PROVIDER_NAME=groq

LLM_FALLBACK_API_KEY=
LLM_FALLBACK_MODEL=meta-llama/llama-3.1-8b-instruct:free
LLM_FALLBACK_BASE_URL=https://openrouter.ai/api/v1
LLM_FALLBACK_PROVIDER_NAME=openrouter
```

## 6. API Endpoints

### 6.1 Analyze

`POST /api/analyze`

Multipart form fields:
- `input_type`: `text | file | sql | chat | log`
- `content`: string (if no file)
- `file`: `.log` or `.txt` (optional)
- `mask`: `true|false`
- `block_high_risk`: `true|false`
- `log_analysis`: `true|false`

### 6.2 History (MongoDB)

`GET /api/history?page=1&limit=8`
- Returns paginated analysis history (latest first)

`GET /api/history/:id`
- Returns one history record by id

If MongoDB is not connected, history API returns empty data with a message.

## 7. History Feature

The history feature is fully integrated:
- Backend stores analysis records after each successful analyze call
- Backend serves history list/detail APIs
- Frontend displays history panel with pagination
- Clicking a history item reloads that analysis into the result panel

## 8. Running with Docker

```powershell
docker compose up --build
```

## 9. Deployment Recommendation (Render + MongoDB Atlas)

Short answer: **Do not deploy all 3 components in a single Render Web Service container**.

Why:
- Render Web Service is designed for one primary process
- Multi-process (frontend + backend + AI in one container) is harder to manage and debug
- Health checks, restarts, logs, scaling, and port routing become fragile

Recommended production setup on Render:
1. Frontend: Render Static Site (from `frontend` build output)
2. Backend: Render Web Service (Node)
3. AI Service: Render Web Service (Python)
4. Database: MongoDB Atlas (external managed DB)

This setup is cleaner, more stable, and easier to maintain.

## 10. MongoDB Atlas Notes

- Use Atlas SRV URI in `backend/.env` as `MONGODB_URI`
- In Atlas Network Access, allow your Render outbound IPs (or temporary `0.0.0.0/0` for initial testing)
- Ensure correct username/password and database name in the URI
- If DNS/SRV issues occur, test with non-SRV URI format from Atlas connection options

## 11. Validation Commands

Use these quick checks:

```powershell
# AI service syntax check with existing venv
cd ai-service
.\.venv\Scripts\python.exe -m compileall app

# Backend module wiring check
cd ..\backend
node -e "require('./src/routes/analyze'); require('./src/controllers/historyController'); require('./src/services/analysisStore'); console.log('backend modules ok')"

# Frontend build check
cd ..\frontend
npm run build
```

## 12. License

ISC
