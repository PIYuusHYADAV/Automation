# Quote Management System — Backend API

A production-grade REST API built with **Node.js + TypeScript + Express** that manages quote requests, integrates with an external FastAPI AI service for document analysis, and stores structured results in PostgreSQL via Drizzle ORM.

---

## Design Questions & Answers

**Q1. Why did you separate controllers, services and repositories?**  
In this project, all route handling and business logic lives within `src/` as a deliberate choice for a focused assignment scope — keeping things flat and readable without unnecessary abstraction overhead. In a production system at scale, I would separate into controllers, services, and repositories so each layer has exactly one reason to change: controllers handle HTTP, services own business logic, repositories own DB queries. Swapping Drizzle for another ORM would touch only repositories. Adding a business rule would touch only services. For this assignment, the same principles are applied within the flat structure — DB logic stays in `db.ts`, schema in `schema.ts`, and route handlers in `index.ts`.

**Q2. If FastAPI takes 30 seconds to respond, should the client wait?**  
No. The axios call has a hard 5-second timeout. If FastAPI exceeds that, the system falls back to a mock response immediately rather than hanging the client. In a production system, this would be replaced with async processing — the analyze request gets queued via BullMQ + Redis, the client receives a `202 Accepted` with a job ID, and gets notified via webhook or polling when the result is ready.

**Q3. Suppose FastAPI returns invalid JSON. How should your backend behave?**  
The axios call is wrapped in a try/catch. If JSON parsing fails or the response shape is unexpected, the error is caught, the raw response is logged with the request ID for debugging, and the client receives a `502 Bad Gateway` with the message `"Analysis service returned an invalid response"`. The Node.js process never crashes and the client always gets a structured error response.

**Q4. If there are 500,000 quote requests, how would you improve performance?**  
Add database indexes on `status` and `created_date` since those are the most common filter/sort columns. Paginate all list endpoints using cursor-based pagination instead of offset. Add Redis caching for frequently read quotes with TTL-based invalidation. Use PostgreSQL connection pooling (already handled by pg-pool). For the analyze endpoint, move to async queue-based processing so heavy operations don't block the event loop.

**Q5. Suppose two users update the same quote simultaneously. How would you prevent inconsistent data?**  
Use optimistic locking — add a `version` integer column to `QuoteRequest`, increment it on every update, and reject any update where the incoming version doesn't match the current DB version (return `409 Conflict`). Alternatively, use `SELECT FOR UPDATE` inside a database transaction for pessimistic locking on critical operations. For status updates specifically, a transaction with a conditional update is sufficient.

**Q6. Would you store every FastAPI analysis or only the latest? Explain.**  
Only the latest. The current schema enforces this via a unique constraint on `quote_id` in `AnalysisResult` — one quote maps to one result. Storing every analysis adds noise without value for this use case since the latest risk assessment is always the relevant one. If audit history becomes a requirement later, a separate `analysisHistory` table can be added without touching the existing schema — but over-engineering upfront is a mistake.

**Q7. Where would you place business rules — controller, service or database?**  
Service layer always. Controllers are too close to HTTP concerns and get bloated fast if logic creeps in. Database-level constraints handle data integrity (NOT NULL, FK, unique) but cannot express complex business rules. The service layer is the only place that is testable in isolation without spinning up HTTP or DB, reusable across multiple controllers or consumers, and fully decoupled from both transport and persistence layers.

---

## Tech Stack

| Layer            | Technology                  |
| ---------------- | --------------------------- |
| Runtime          | Node.js                     |
| Language         | TypeScript                  |
| Framework        | Express.js                  |
| ORM              | Drizzle ORM                 |
| Database         | PostgreSQL (Docker)         |
| External Service | FastAPI (document analysis) |
| Logging          | Custom middleware           |

---

## Architecture

```
Request → index.ts (Express router)
               ↓
          middleware/          ← logging, request ID, validation
               ↓
            src/               ← all business logic, route handlers, FastAPI calls
          ┌─────────────────────────────────┐
          │  index.ts   schema.ts   db.ts   │
          └─────────────────────────────────┘
               ↓                    ↓
          FastAPI Service       PostgreSQL
          (document analysis)   (via Drizzle ORM)
               ↓
          utils/                ← shared helper functions
```

- **index.ts** — Express app entry point, route definitions, server startup
- **src/schema.ts** — Drizzle table definitions and relations
- **src/db.ts** — Database connection via pg-pool + Drizzle instance
- **middleware/** — request ID injection, structured logging, input validation
- **utils/** — shared utility functions used across the app
- **fastapi-service/** — standalone Python FastAPI service for document analysis

---

## Project Structure

```
├── fastapi-service/         # Python FastAPI document analysis service
│   └── main.py
├── src/                     # Core TypeScript source files
│   ├── index.ts             # Express app setup
│   ├── schema.ts            # Drizzle table definitions + relations
│   └── db.ts                # Database connection (Drizzle + pg-pool)
├── middleware/              # Logging, request ID, validation
├── utils/                   # Shared utility functions
├── drizzle/                 # Generated migration files
├── index.ts                 # App entry point
├── seed.ts                  # Database seeding script
├── drizzle.config.ts        # Drizzle Kit configuration
├── docker-compose.yaml      # PostgreSQL container setup
├── tsconfig.json
├── package.json
└── .env
```

---

## Database Schema

### QuoteRequest

| Column          | Type          | Notes                                    |
| --------------- | ------------- | ---------------------------------------- |
| id              | serial        | Primary key                              |
| customer        | varchar(255)  | Required                                 |
| project         | varchar(255)  | Required                                 |
| status          | varchar       | New / In Review / Needs Info / Completed |
| estimated_value | numeric(12,2) | Must be positive                         |
| created_date    | timestamp     | Auto-set                                 |

### AnalysisResult

| Column        | Type        | Notes                              |
| ------------- | ----------- | ---------------------------------- |
| id            | serial      | Primary key                        |
| quote_id      | integer     | FK → QuoteRequest (cascade delete) |
| risk          | varchar(50) | Low / Medium / High                |
| confidence    | integer     | 0–100                              |
| missing_items | text[]      | PostgreSQL native array            |
| analyzed_at   | timestamp   | Auto-set                           |

---

## API Reference

### `GET /quotes`

Returns all quote requests.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer": "Piyush Yadav",
      "project": "Office Renovation",
      "status": "New",
      "estimatedValue": "500000.00",
      "createdDate": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /quotes/:id`

Returns a single quote with its analysis result (if analyzed).

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer": "Piyush Yadav",
    "project": "Office Renovation",
    "status": "In Review",
    "estimatedValue": "500000.00",
    "createdDate": "2024-01-15T10:00:00.000Z",
    "analysisResult": {
      "risk": "Medium",
      "confidence": 91,
      "missingItems": ["Structural drawings", "Load requirements"],
      "analyzedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Response `404`** — Quote not found

---

### `POST /quotes`

Creates a new quote request with full validation.

**Request Body**

```json
{
  "customer": "Piyush Yadav",
  "project": "Office Renovation",
  "estimatedValue": 500000
}
```

**Validation Rules**

- `customer` — required, non-empty string
- `project` — required, non-empty string
- `estimatedValue` — required, must be a positive number
- `status` — optional, must be one of: `New`, `In Review`, `Needs Info`, `Completed`

**Response `201`** — Quote created  
**Response `400`** — Validation errors with specific messages

---

### `POST /quotes/:id/analyze`

The core endpoint. Orchestrates a full analysis pipeline:

1. Looks up the quote in PostgreSQL — returns `404` if not found
2. Calls the FastAPI document analysis service with the `quote_id`
3. Handles FastAPI timeout (5s) and unavailability gracefully — falls back to mock response
4. Saves the `AnalysisResult` to the database
5. Returns the quote and analysis merged as a single response

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer": "Piyush Yadav",
    "project": "Office Renovation",
    "status": "New",
    "analysis": {
      "risk": "Medium",
      "confidence": 91,
      "missingItems": ["Structural drawings", "Load requirements"],
      "analyzedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Response `404`** — Quote not found  
**Response `503`** — FastAPI service unavailable

---

### `PATCH /quotes/:id/status`

Updates the status of a quote.

**Request Body**

```json
{ "status": "In Review" }
```

**Allowed values:** `In Review`, `Needs Info`, `Completed`

**Response `200`** — Updated quote  
**Response `400`** — Invalid status value  
**Response `404`** — Quote not found

---

## Error Handling

Every error case is handled explicitly and returns a consistent JSON shape:

```json
{
  "success": false,
  "error": "Meaningful message here"
}
```

| Scenario                      | Status Code |
| ----------------------------- | ----------- |
| Quote not found               | 404         |
| Invalid request body          | 400         |
| Invalid status value          | 400         |
| FastAPI unavailable / timeout | 503         |
| Database failure              | 500         |
| Internal server error         | 500         |

---

## Middleware

### Request ID

Every request is assigned a UUID via `x-request-id` header, injected automatically and returned in the response headers. Enables end-to-end traceability across logs.

### Logger

Structured request/response logging with timestamps, method, route, status code, and response time:

```
[2024-01-15T10:23:01.000Z] [abc-123-def] → POST /quotes
[2024-01-15T10:23:01.045Z] [abc-123-def] ← 201 45ms
```

---

## Setup & Running Locally

### Prerequisites

- Node.js 20+
- Docker Desktop
- Python 3.10+ (for FastAPI service)

### 1. Clone and install

```bash
git clone <repo-url>
cd Backend
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/quotedb
FASTAPI_URL=http://localhost:8001
PORT=8000
```

### 4. Run migrations

```bash
npx drizzle-kit migrate
```

### 5. Seed database (optional)

```bash
npm run seed
```

### 6. Start FastAPI service

```bash
cd fastapi-service
pip install -r requirements.txt
uvicorn main:app --port 8001
```

### 7. Start Node.js server

```bash
npm run dev
```

Server runs at `http://localhost:8000`

---

## Testing the API

Import the included **Postman collection** and run requests in this order:

1. `POST /quotes` — create a quote, note the returned `id`
2. `GET /quotes` — verify it appears
3. `POST /quotes/:id/analyze` — trigger analysis
4. `GET /quotes/:id` — verify quote + analysis combined
5. `PATCH /quotes/:id/status` — update to `In Review`

---

## Author

**Piyush Yadav**  
B.Tech — AI & Data Science, GGSIPU (2023–2027)  
GitHub: [@PIYuusHYADAV](https://github.com/PIYuusHYADAV)
