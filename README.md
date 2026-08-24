# No Wrong Door API

A unified API that combines resident information from two independent source systems:

- **Resident Index** — paginated REST service
- **Benefits Register** — slow and unreliable XML service

The API is designed to handle pagination, duplicate records, temporary source failures, retries, graceful degradation, idempotent repeated requests, and Benefits Register caching.

## Mandatory Floor Requirements

The solution is designed to satisfy all four mandatory floor requirements for Problem 3:

| Floor requirement | Implementation |
|---|---|
| Graceful degradation | Available data is returned when a source fails, while the missing source and failure reason are explicitly reported. |
| Retry-safe / idempotent behaviour | XML requests are retried up to 3 times and repeated requests do not accumulate records. |
| Duplicate handling | Resident records are deduplicated using the resident `id` across paginated responses. |
| Clean-clone execution | Setup and verification instructions are provided for running the solution from a fresh clone. |

## Implemented Features

- Fetches all pages from the Resident Index REST service.
- Removes duplicate residents using the resident `id`.
- Fetches and parses Benefits Register XML records.
- Retries failed XML requests up to 3 times.
- Continues with available data when one source is unavailable.
- Reports unavailable sources and failure reasons.
- Returns `complete`, `partial`, or `unavailable` status.
- Provides consistent results for repeated requests.
- Caches successful Benefits Register responses for 5 minutes.

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

## Requirements
Node.js 18 or later
Python 3

Check the versions:

node --version
npm --version
python --version
## Setup
1. Clone the repository
git clone https://github.com/sudeepr650/no-wrong-door-api.git
cd no-wrong-door-api



2. Install dependencies
npm install
3. Start the provided mock services

The Brite Spark mock services/data pack are provided separately by the organizers and are not included in this repository.

They are required for local execution and demonstration.

The services use:

Resident Index REST service: http://127.0.0.1:8081
Benefits Register XML service: http://127.0.0.1:8082

Open a terminal in the provided services folder.

Terminal 1 — Resident Index
python rest_service.py --port 8081
Terminal 2 — Benefits Register
python xml_service.py --port 8082

Keep both services running.

4. Start the No Wrong Door API

Open another terminal inside the project:

node src/app.js

The API is available at:

http://localhost:3000
## API Endpoints
Health Check
GET /health

Example:

Invoke-RestMethod "http://localhost:3000/health"

Expected:

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
partial — whether exactly one source is unavailable
unavailable — whether both sources are unavailable
missingSources — unavailable source names
sourceStatus — availability and failure reason for each source
data.residents — Resident Index records
data.benefits — Benefits Register records
## Response Behaviour
Source availability	API status
Both sources available	complete
Resident Index unavailable	partial
Benefits Register unavailable	partial
Both sources unavailable	unavailable

When a source fails, the API returns the data available from the other source and identifies the failed source through missingSources and sourceStatus.

If both sources fail, the API returns a valid unavailable response instead of a bare server error.

## Benefits Register Caching

Successful Benefits Register responses are cached in memory for 5 minutes.

Only successful responses are cached.
A valid cache entry avoids another XML request.
When the cache expires, a fresh XML request is made.
A successful refresh replaces the cached data.
Failed refresh attempts are not cached.

A valid cache can allow the API to continue serving the last successful Benefits data temporarily.

If the cache has expired and the refresh fails after the normal retry policy, the existing graceful-degradation behaviour is used.

The cache therefore improves availability while accepting a maximum possible staleness of 5 minutes.

## Testing
REST pagination and duplicate handling
node testRest.js

Expected successful result includes:

Total unique residents: 620
XML parsing and retry
node testXml.js

Expected successful result includes:

Total records: 540

The XML adapter retries failed requests up to 3 times.

Unified service
node testUnified.js

Expected successful result includes:

Status: complete
Partial: false
Residents: 620
Benefits: 540
Repeated requests / idempotency
node testIdempotency.js

Expected result:

PASS: Repeated requests produced consistent results with no duplicate residents.
Day-2 Failure Testing

The Day-2 scenario uses an approximately 40% Benefits Register failure rate.

Start the XML service with:

python xml_service.py --port 8082 --failure-rate 0.40

The application should continue to retry failed XML requests up to 3 times. If the Benefits Register remains unavailable after the retries and no valid cached response is available, the API returns the available Resident Index data with `status: "partial"` and identifies `benefitsRegister` in `missingSources`.

Because the failure is intentionally intermittent, individual requests may succeed or fail. The important behaviour is that a Benefits Register failure does not unnecessarily prevent available Resident Index data from being returned.

## Documentation
DECISIONS.md

Documents:

architecture decisions
duplicate handling
retry policy
graceful degradation
idempotency
identity matching decision
caching decision
Day-2 failure handling
rejected or deferred features
trade-offs
future improvements
AI-USAGE.md

Documents the AI assistance used during development and the developer's responsibility for the final implementation.

## Scope

The current solution intentionally does not include:

cross-source identity matching
database persistence
authentication or authorisation
user interface
circuit breaker

Identity matching is not implemented because the two source systems do not provide a shared identifier.

Optional reliability improvements such as a circuit breaker may be considered only after the mandatory floor has been fully verified.

## Final Verification

Before submission:

Verify the working tree is clean.
Verify the Git history.
Perform a clean-clone test.
Install dependencies using npm install.
Start the organizer-provided mock services.
Start the API.
Verify /health.
Verify /api/unified.
Run all repository tests.
Verify the Day-2 approximately 40% failure scenario.

The final repository contains the solution and required submission files only. The organizer-provided mock services/data pack are not included.