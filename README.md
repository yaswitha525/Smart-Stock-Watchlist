# Smart Market Watchlist API (CODE 2026 Challenge)

A production-oriented, scalable Node.js + Express + TypeScript backend designed for the **Smart Market Watchlist** project.

Instead of just showing static stock prices, this system helps users immediately understand **what meaningfully changed in their watched stocks since their last visit/snapshot**.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express (v4.x)
- **Language**: TypeScript (v5.x, Strict Mode)
- **Configuration & Validation**: `dotenv`, `zod`
- **Logging**: `pino`, `pino-http`
- **Security**: `helmet`, `cors`
- **Testing**: `vitest`, `supertest`

---

## 🏛 Architecture & Project Structure

The project follows a **Modular Monolith** architecture with clean separation of concerns (`Routes` → `Controllers` → `Services` → `Database/External APIs`).

```
c:/stockAI/
├── .env.example                # Configuration template
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript compiler config (Strict Mode)
├── vitest.config.ts            # Test runner configuration
├── README.md                   # Documentation
├── src/
│   ├── app.ts                  # Express application wiring & middleware
│   ├── server.ts               # Server startup & graceful shutdown handlers
│   ├── config/
│   │   ├── index.ts            # Environment loader & Zod validation schema
│   │   └── logger.ts           # Centralized Pino logger setup
│   ├── errors/
│   │   └── app-error.ts        # AppError base class & operational HTTP error hierarchy
│   ├── middleware/
│   │   ├── error-handler.ts    # Centralized error handler returning consistent JSON
│   │   ├── not-found-handler.ts# Catch-all 404 route handler
│   │   ├── request-logger.ts  # HTTP logging & correlation IDs
│   │   └── validate-request.ts# Zod request payload validator wrapper
│   ├── controllers/
│   │   └── health.controller.ts# Health check HTTP handler
│   ├── services/
│   │   └── health.service.ts   # System metrics and status logic
│   ├── routes/
│   │   ├── index.ts            # Main API v1 router
│   │   └── health.routes.ts    # Health check route mappings
│   ├── types/
│   │   └── api.ts              # Standardized API response contracts
│   └── utils/
│       ├── async-handler.ts    # Async wrapper for route controllers
│       └── response.ts         # Consistent success/error response helpers
└── tests/
    └── integration/
        └── health.test.ts      # Integration tests for health check & 404
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Type | Phase Requirement | Description | Default |
|---|---|---|---|---|
| `PORT` | Number | **Required (Phase 1)** | HTTP server listener port | `3000` |
| `NODE_ENV` | Enum (`development` \| `production` \| `test`) | **Required (Phase 1)** | Runtime environment | `development` |
| `LOG_LEVEL` | Enum (`fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace`) | **Required (Phase 1)** | Pino log level | `info` |
| `DATABASE_URL` | String | Optional (Phase 2+) | PostgreSQL Connection String | - |
| `REDIS_URL` | String | Optional (Phase 7+) | Redis Connection String | - |
| `JWT_SECRET` | String | Optional (Phase 3+) | JWT Secret Key for Auth | - |
| `MARKET_DATA_PROVIDER` | Enum (`mock` \| `real`) | **Required (Phase 8)** | Market provider engine (`mock` or `real`) | `mock` |
| `MARKET_API_KEY` | String | Optional (Phase 8) | Live external Market Data API key | - |
| `MARKET_API_BASE_URL` | String | Optional (Phase 8) | External Market Data API base URL | `https://api.marketdata.app/v1` |

---

## 📈 Market Data Provider Architecture (Phase 8)

The backend features a swappable `IMarketDataProvider` abstraction:

```
                  IMarketDataProvider
                           |
            +--------------+--------------+
            |                             |
  MockMarketDataProvider       RealMarketDataProvider
  (Deterministic Dev/Test)                |
                                          ↓
                                 External Market API
```

### Provider Selection (`MARKET_DATA_PROVIDER`)
- **`MARKET_DATA_PROVIDER=mock`** (default): Uses deterministic in-memory `MockMarketDataProvider`. Ideal for offline development, local unit tests, and reproducible test runs.
- **`MARKET_DATA_PROVIDER=real`**: Uses `RealMarketDataProvider` which makes live HTTP requests to the external market data API.

### Response Mapping & Data Timestamp Integrity
- External API quotes (e.g. MarketData.app array/flat responses) are sanitized and mapped into standard `MarketQuoteMetadata`.
- The provider quote timestamp is recorded as `dataTimestamp` on `StockSnapshot`.
- Database write timestamp is recorded separately as `recordedAt`.
- If a market snapshot's `dataTimestamp` is older than `STALE_DATA_THRESHOLD_MS` (default 5 mins), it is automatically flagged as `isStale: true`.

### API Key Security & Sanitization
- API keys are strictly configured via environment variables (`MARKET_API_KEY` or `MARKET_DATA_API_KEY`).
- All loggers, error tracebacks, and client responses automatically mask API credentials (`token=***MASKED***`).


---

## 🚀 Setup & Local Execution

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Type Check

```bash
npm run type-check
```

### 3. Run Development Server (with Auto-Reload)

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🧪 Running Tests

Run the integration test suite:

```bash
npm test
```

---

## 📡 API Endpoints

### 1. Health Check
- **Endpoint**: `GET /api/health` or `GET /api/v1/health`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "smart-market-watchlist-api",
  "version": "1.0.0",
  "timestamp": "2026-09-05T07:33:00.000Z",
  "environment": "development",
  "uptime": 12
}
```

### 2. Standardized Error Response Example (e.g. 404 Not Found)
- **Response**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found: GET /api/unknown-route"
  }
}
```

---

## 🛡 Security & Resilience Highlights

1. **Graceful Shutdown**: Intercepts `SIGINT` / `SIGTERM` and drains active HTTP requests before exit with a safety timeout.
2. **Centralized Error Masking**: Prevents internal server implementation details / stack traces from leaking to clients in production mode.
3. **Strict Validation**: Fails early on invalid environment parameters using `zod`.
