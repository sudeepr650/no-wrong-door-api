# DECISIONS

## 1. Architecture

The application is divided into independent layers:

- **REST Adapter** handles communication with the Resident Index service.
- **XML Adapter** handles communication with the Benefits Register service.
- **Unified Service** combines the results from both sources.
- **Routes** expose the unified data through a single API.

This separation allows one source to change or fail without directly affecting the implementation of the other source.

---

## 2. Duplicate Handling

The Resident Index service is paginated and may return the same resident on more than one page.

Duplicate residents are removed using the resident `id` as the unique identifier. This ensures that the unified result contains each resident only once.

---

## 3. XML Retry Policy

The Benefits Register XML service can be slow and intermittently return HTTP 500 errors.

The XML adapter retries failed requests up to **3 times**.

A delay is applied between retry attempts. If all attempts fail, the source is marked as unavailable and the API continues with any data available from the other source.

---

## 4. Graceful Degradation Policy

The API does not fail completely when one source is unavailable.

### Resident Index unavailable

The API returns:

- Available Benefits Register data.
- `status: "partial"`
- `partial: true`
- `residentIndex` listed in `missingSources`.
- `sourceStatus.residentIndex.available: false`.
- A failure reason in `sourceStatus.residentIndex.reason`.

### Benefits Register unavailable

The API returns:

- Available Resident Index data.
- `status: "partial"`
- `partial: true`
- `benefitsRegister` listed in `missingSources`.
- `sourceStatus.benefitsRegister.available: false`.
- A failure reason in `sourceStatus.benefitsRegister.reason`.

### Both sources unavailable

The API returns a valid response instead of a bare server error.

The response contains:

- `status: "unavailable"`
- Empty resident and benefit lists.
- Both sources listed in `missingSources`.
- `available: false` and the failure reason for each source.

This ensures that missing data is never silently represented as an empty result.

---

## 5. Idempotency and Consistency

The API performs read-only operations and does not modify either source.

Repeated requests fetch and process source data without storing or appending results between requests.

Duplicate removal is applied consistently on every request, ensuring repeated requests do not accumulate duplicate records.

---

## 6. Identity Matching

The two source systems do not provide a shared identifier.

Identity matching is intentionally not implemented because it is a stretch goal. Incorrectly merging two different residents would be worse than returning the records separately.

The application therefore preserves each source's records independently.

---

## 7. Caching and Circuit Breaking

Caching and circuit breaking were not implemented because the mandatory floor requirements were prioritised first.

The adapter-based architecture allows these features to be added later without significantly changing the unified service or API routes.

---

## 8. Day 2 — Benefits Register Failure Rate

On Day 2, the Benefits Register was changed to fail on approximately 40% of calls.

The existing architecture was kept unchanged because the XML adapter already isolates the Benefits Register from the rest of the application. The adapter retries failed read requests up to 3 times, while the unified service uses `Promise.allSettled()` so that a failure in the XML source does not prevent available Resident Index data from being returned.

### What we changed

No application code changes were required for the Day 2 failure-rate change.

We tested the existing solution against the Benefits Register running with a 40% failure rate.

Two important cases were verified:

- When an XML request failed and a retry succeeded, the API returned `status: "complete"` with both resident and benefit data.
- When all three XML attempts failed, the API returned `status: "partial"` while still returning the available Resident Index data and reporting `benefitsRegister` in `missingSources`.

### What we chose not to change

We did not increase the retry count or add unnecessary retry logic.

We also did not make the Resident Index dependent on the Benefits Register. The two sources remain independently handled so that failure of one source does not unnecessarily make the entire API unavailable.

### What we would have done differently

If the 40% permanent failure rate had been known from the beginning, we would have considered adding caching for the Benefits Register earlier to reduce repeated calls to an unreliable source.

However, the existing retry and graceful-degradation design was sufficient to handle the Day 2 change without rewriting the application.