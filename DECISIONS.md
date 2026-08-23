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
- `sourceStatus.residentIndex.available: false` and the failure reason in `sourceStatus.residentIndex.reason`.
- `sourceStatus.benefitsRegister.available: false` and the failure reason in `sourceStatus.benefitsRegister.reason`.

This ensures that missing data is never silently represented as an empty result.

---

## 5. Idempotency and Consistency

The API performs read-only operations and does not modify either source.

Repeated requests do not append or accumulate records in the unified result.
Resident deduplication is applied consistently on every request, ensuring
that repeated requests do not produce duplicate residents.

The Benefits Register cache stores a bounded copy of the latest successful
response for up to 5 minutes, but cached data does not accumulate across
requests and does not change the source data.
---

## 6. Identity Matching

The two source systems do not provide a shared identifier.

Identity matching is intentionally not implemented because it is a stretch goal. Incorrectly merging two different residents would be worse than returning the records separately.

The application therefore preserves each source's records independently.

---

## 7. Benefits Register Caching

The Benefits Register can be slow and intermittently unavailable.
To avoid repeatedly calling the source for every unified request, successful
Benefits Register responses are cached in memory for 5 minutes.

### Cache policy

- Only successful Benefits Register responses are cached.
- A valid cache entry is used for requests received within 5 minutes.
- The maximum accepted staleness is therefore 5 minutes.
- A cache hit avoids another call to the Benefits Register.
- When the cache expires, the adapter requests fresh data.
- A successful refresh replaces the cached data and resets the TTL.
- Failed refresh attempts are not cached.
- If the cache has expired and all XML retries fail, the existing graceful
  degradation policy applies.

### Why 5 minutes

A 5-minute TTL provides a practical balance between reducing repeated calls
to a slow/unreliable source and limiting the age of cached Benefits data.
The application explicitly accepts that cached Benefits data may be up to
5 minutes old.

### Failure visibility

The cache does not hide a source failure indefinitely. A valid cache can
temporarily allow the API to continue serving the last successful data.
Once the cache expires, the source must be contacted again. If that refresh
fails after the existing retry policy, the caller receives the normal
`partial` response with `benefitsRegister` in `missingSources` and the
failure reason in `sourceStatus.benefitsRegister.reason`.

---

## 8. Day 2 — Benefits Register Failure Rate

On Day 2, the Benefits Register was changed to fail on approximately 40% of
calls. The existing adapter-based architecture continued to isolate the
Benefits Register from the Resident Index.

The XML adapter retries failed requests up to 3 times. The unified service
uses `Promise.allSettled()` so that a failure in the Benefits Register does
not prevent available Resident Index data from being returned.

The caching policy was also validated against this failure scenario. A
successful Benefits Register response can be served from the 5-minute cache,
reducing repeated calls to the unreliable source. Once the cache expires,
the adapter attempts to refresh the data using the normal retry policy.

### What we changed

No special Day 2 failure-handling code was required because the existing
retry and graceful-degradation design already isolates the two sources.

Caching was added as a reliability improvement for the slow and unreliable
Benefits Register.

### What we verified

- When an XML request failed and a retry succeeded, the API returned
  `status: "complete"` with both resident and benefit data.
- When the Benefits Register was temporarily unavailable while valid cached
  data existed, the API continued returning the cached Benefits Register
  data.
- When the cache expired, the adapter contacted the Benefits Register again.
- If a refresh request failed, the existing retry policy was still applied.
- Repeated unified requests continued to return 620 residents and 540
  benefits without duplicate residents.

### What we chose not to change

We did not increase the retry count or add unnecessary retry logic.

We also did not make the Resident Index dependent on the Benefits Register.
The two sources remain independently handled so that failure of one source
does not unnecessarily make the entire API unavailable.

The cache is intentionally limited to a 5-minute TTL so that it does not
hide a permanently unavailable Benefits Register.

### Trade-off

Caching improves availability and reduces repeated calls to a slow source,
but it introduces the possibility of serving slightly stale Benefits data.

We accept a maximum staleness of 5 minutes because this provides a practical
balance between source reliability and data freshness. Once the TTL expires,
fresh data must be obtained from the Benefits Register.
