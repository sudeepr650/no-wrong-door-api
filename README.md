# No Wrong Door API

A unified API that combines resident information from two independent source systems:

- **Resident Index** — Paginated REST service
- **Benefits Register** — Slow and unreliable XML service

The API is designed to handle pagination, duplicate records, temporary source failures, retries, and graceful degradation.

---

## Project Features

- Fetches all pages from the Resident Index REST service.
- Removes duplicate resident records caused by duplicate records across pages.
- Fetches and parses records from the Benefits Register XML service.
- Retries failed XML requests up to 3 times.
- Returns available data even when one source is unavailable.
- Clearly identifies unavailable sources and failure reasons.
- Provides consistent results for repeated requests.

---

## Project Structure

```text
no-wrong-door-api/
│
├── src/
│   ├── adapters/
│   │   ├── restAdapter.js
│   │   └── xmlAdapter.js
│   │
│   ├── config/
│   │   └── config.js
│   │
│   ├── routes/
│   │   └── unifiedRoutes.js
│   │
│   ├── services/
│   │   └── unifiedService.js
│   │
│   └── app.js
│
├── testRest.js
├── testXml.js
├── testUnified.js
├── testIdempotency.js
├── README.md
├── DECISIONS.md
├── AI-USAGE.md
├── package.json
└── package-lock.json


Requirements

Make sure the following are installed:

Node.js 18 or later
Python 3

Check:

node --version
npm --version
python --version
Setup from a Clean Clone
1. Clone the repository
git clone <YOUR-REPOSITORY-URL>
cd no-wrong-door-api
2. Install Node.js dependencies
npm install
3. Start the provided mock services

The project requires the Brite Spark data pack containing:

services/
├── rest_service.py
├── xml_service.py
├── _rest_data.json
├── _xml_data.json
└── run_both.sh

Open a terminal in the services folder.

Terminal 1 — Start REST service
python rest_service.py --port 8081

Expected:

Resident Index (REST) on http://127.0.0.1:8081
Terminal 2 — Start XML service
python xml_service.py --port 8082

Expected:

Benefits Register (XML) on http://127.0.0.1:8082

Keep both terminals running.

4. Start the No Wrong Door API

Open another terminal inside:

no-wrong-door-api

Run:

node src/app.js

The API runs on:

http://localhost:3000
API Endpoints
Health Check
GET /health

Example:

Invoke-RestMethod "http://localhost:3000/health"

Expected response:

{
  "status": "ok",
  "service": "no-wrong-door-api"
}
Unified Data
GET /api/unified

Example:

Invoke-RestMethod "http://localhost:3000/api/unified"

The response contains:

status — complete, partial, or unavailable
residents
benefits
missingSources
sourceStatus
errors
Response behavior
Source availability	API status
Both sources available	complete
One source unavailable	partial
Both sources unavailable	unavailable

The API returns available data whenever possible and reports unavailable sources instead of returning a bare failure.

Testing
Test REST Pagination and Deduplication
node testRest.js
Test XML Parsing and Retry
node testXml.js
Test Unified Service
node testUnified.js
Test Repeated Requests / Idempotency
node testIdempotency.js

Expected result:

PASS: Repeated requests produced consistent results with no duplicate residents.
Design

The two source systems are kept independent through separate adapters:

REST Service
     ↓
restAdapter.js
     ↓
        ┐
        ├── unifiedService.js
        │
        ┘
     ↑
xmlAdapter.js
     ↑
XML Service

This separation allows the behavior of one source to change without requiring major changes to the other source or the API layer.

Documentation
DECISIONS.md — Architecture and degradation policy.
AI-USAGE.md — Documentation of AI assistance used during development.
Failure Handling

The XML source intentionally returns intermittent HTTP 500 errors.

The application retries failed XML requests up to three times. If the source remains unavailable, the API still returns data from any available source and clearly reports:

which source failed
why it failed
whether the response is partial or unavailable