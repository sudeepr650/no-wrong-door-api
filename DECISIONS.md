# DECISIONS

## 1. Architecture

The application is divided into independent layers:

- **REST Adapter** handles communication with the Resident Index service.
- **XML Adapter** handles communication with the Benefits Register service.
- **Unified Service** combines the results from both sources.
- **Routes** expose the unified data through a single API.

The source systems are intentionally kept independent. The unified service does not depend on either adapter succeeding before processing the other result.

This separation was chosen because the problem explicitly expects source behaviour to be changeable without requiring the rest of the application to be rewritten.

---

## 2. Duplicate Handling

The Resident Index service is paginated and may return the same resident on more than one page.

Duplicate residents are removed using the resident `id` as the unique identifier.

Deduplication is performed while combining the paginated Resident Index results, ensuring that the unified result contains each Resident Index record only once.

This is required because accepting every page result without deduplication would produce duplicate residents in the unified response.

---

## 3. XML Retry Policy

The Benefits Register XML service can be slow and intermittently return HTTP 500 errors.

The XML adapter retries a failed request up to **3 attempts**.

A delay is applied between retry attempts.

If an attempt succeeds, the successful response is parsed and returned.

If all 3 attempts fail, the XML adapter throws the final error to the unified service. The unified service handles that failure independently from the Resident Index result.

The retry policy is intentionally limited to 3 attempts rather than retrying indefinitely. This prevents an unreliable source from blocking the overall API indefinitely.

---

## 4. Graceful Degradation Policy

The main reliability decision is that a failure of one source must not unnecessarily make the entire unified API fail.

The caller-visible policy is:

1. Return all data successfully obtained from available sources.
2. If exactly one source is unavailable, return `status: "partial"` and `partial: true`.
3. If both sources are unavailable, return `status: "unavailable"`.
4. List unavailable sources in `missingSources`.
5. Set the affected source's `sourceStatus.<source>.available` to `false`.
6. Provide the failure reason in `sourceStatus.<source>.reason`.
7. Never silently represent a failed source as an empty successful result.

### Resident Index unavailable

The API returns:

- Available Benefits Register data.
- `status: "partial"`.
- `partial: true`.
- `residentIndex` in `missingSources`.
- `sourceStatus.residentIndex.available: false`.
- The failure reason in `sourceStatus.residentIndex.reason`.
- An empty `data.residents` list because no Resident Index data was successfully obtained.

The caller therefore knows that the resident data is missing rather than assuming that there are simply no residents.

### Benefits Register unavailable

The API returns:

- Available Resident Index data.
- `status: "partial"`.
- `partial: true`.
- `benefitsRegister` in `missingSources`.
- `sourceStatus.benefitsRegister.available: false`.
- The failure reason in `sourceStatus.benefitsRegister.reason`.
- An empty `data.benefits` list because no Benefits Register data was successfully obtained.

The caller therefore knows that the benefits data is missing rather than assuming that there are simply no benefits records.

### Both sources unavailable

The API returns a valid response instead of a bare server error.

The response contains:

- `status: "unavailable"`.
- `partial: false`.
- `unavailable: true`.
- Empty resident and benefit lists.
- Both sources in `missingSources`.
- `sourceStatus.residentIndex.available: false` and its failure reason.
- `sourceStatus.benefitsRegister.available: false` and its failure reason.

This makes the complete source failure visible to the caller.

---

## 5. Idempotency and Consistency

The API performs read-only operations and does not modify either source.

Repeated requests do not append or accumulate records in the unified result.

Resident deduplication is applied consistently to the Resident Index data on every request.

The Benefits Register cache stores only a bounded copy of the latest successful response and does not accumulate records across requests.

Therefore, repeated requests do not create additional records or change the source data.

The repository test `testIdempotency.js` verifies that repeated unified requests return consistent counts and no duplicate residents.

---

## 6. Identity Matching

The two source systems do not provide a shared identifier.

Identity matching across the Resident Index and Benefits Register is intentionally **not implemented**.

This is a stretch goal rather than a floor requirement.

Attempting to infer that two records belong to the same resident without a reliable shared key could incorrectly merge two different people. Incorrectly merging residents would be worse than returning the source records separately.

The application therefore preserves Resident Index and Benefits Register records independently.

If identity matching were added later, it would require a stated confidence threshold and a policy for uncertain matches.

---

## 7. Benefits Register Caching

Caching was added as an optional reliability improvement after the mandatory floor requirements were implemented.

The Benefits Register can be slow and intermittently unavailable. Successful Benefits Register responses are therefore cached in memory for **5 minutes**.

### Cache policy

- Only successful Benefits Register responses are cached.
- A valid cache entry is used for requests received within 5 minutes.
- The maximum accepted cache staleness is therefore 5 minutes.
- A cache hit avoids another request to the Benefits Register.
- When the cache expires, the adapter requests fresh data.
- A successful refresh replaces the previous cached data and resets the TTL.
- Failed refresh attempts are not cached.

### Cache and source failure behaviour

When a valid cache exists, the API can continue serving the last successful Benefits Register response without repeatedly calling the unreliable source.

This improves availability but means the Benefits data may be slightly stale.

When the cache expires, the Benefits Register must be contacted again.

If the refresh succeeds, the new response replaces the cached data.

If the refresh fails after the normal retry policy, the existing graceful degradation policy applies and the caller receives a `partial` response with:

- `benefitsRegister` in `missingSources`.
- `sourceStatus.benefitsRegister.available: false`.
- The failure reason in `sourceStatus.benefitsRegister.reason`.

The cache therefore does not hide a source failure indefinitely.

### Why 5 minutes

A 5-minute TTL provides a practical balance between reducing repeated calls to a slow or unreliable source and limiting data staleness.

The application explicitly accepts that cached Benefits Register data may be up to 5 minutes old.

---

## 8. Day 2 — Benefits Register Failure Rate

On Day 2, the Benefits Register was changed to fail on approximately 40% of calls.

The existing adapter-based architecture was deliberately kept unchanged because the XML adapter already isolates the Benefits Register from the Resident Index.

The XML adapter continues to retry failed requests up to 3 times.

The unified service uses `Promise.allSettled()` so that a failure in the Benefits Register does not prevent available Resident Index data from being returned.

The caching policy also reduces repeated calls to the unreliable Benefits Register while a valid cache entry exists.

### What changed

No special Day-2 failure-handling path was required.

The existing architecture was able to accommodate the changed failure behaviour because:

- Source communication is isolated in adapters.
- The XML adapter owns retry behaviour.
- The unified service handles source results independently.
- Graceful degradation is already part of the unified response contract.
- Successful Benefits Register responses can be served from the 5-minute cache.

This avoided rewriting the application when the source failure rate changed.

### What was verified during development

The implementation was tested against the provided services during development.

Verified behaviour includes:

- A successful XML retry returns the Benefits Register data normally.
- The unified service returns `status: "complete"` when both source operations succeed.
- Repeated unified requests return 620 residents and 540 benefits without accumulating duplicate residents.
- A valid Benefits Register cache produces cache hits on subsequent requests within the TTL.
- When the XML service is unavailable and no valid cache is available, the XML adapter exhausts its 3 attempts and the unified service can degrade to the available Resident Index data.

### What we chose not to change

We did not increase the retry count or introduce indefinite retries.

We did not make the Resident Index dependent on the Benefits Register.

We did not add identity matching because it is a stretch goal and there is no shared identifier.

We did not add a user interface because the problem explicitly accepts command-line demonstration and interface quality is not assessed for this problem.

We did not add a database or persistence layer because it is not required for this read-only integration.

We did not add authentication or authorisation because they are not required.

We also did not add a circuit breaker at this stage. It is an optional extension and was intentionally kept outside the mandatory implementation so that reliability improvements would not compromise the required floor.

---

## 9. What Was Cut and Why

The following optional features were not prioritised over the mandatory floor:

### Identity matching

Not implemented because there is no shared identifier between the two sources and incorrect matching could create incorrect resident associations.

### Circuit breaking

Not implemented in the current version.

A circuit breaker could reduce calls to a source that is comprehensively unavailable, but the existing retry, graceful-degradation, adapter separation, and caching behaviour were prioritised first.

### User interface

Not implemented because a command-line demonstration is sufficient for this problem.

### Database or persistence

Not implemented because the API is read-only and persistence is not required.

### Authentication and authorisation

Not implemented because they are outside the stated requirements.

These choices were made to keep the solution focused on the mandatory floor and the reliability behaviour that is central to the problem.

---

## 10. What the Solution Does Not Do

The current solution does not:

- Identify or merge residents across the two source systems.
- Persist source data in a database.
- Provide authentication or authorisation.
- Provide a user interface.
- Handle additional external source systems beyond the two provided services.
- Implement a circuit breaker.

These are intentional scope decisions rather than undocumented limitations.

---

## 11. What We Would Fix or Improve First

If additional development time were available, the first optional reliability improvement I would consider would be a circuit breaker for the Benefits Register.

A circuit breaker could reduce repeated calls to a source that is comprehensively unavailable and allow controlled recovery attempts after a cooldown period. It was not retained in the current version because the mandatory floor and caching behaviour were prioritised first.

If further time were available after that, identity matching could be investigated using a conservative confidence-based approach with an explicit policy for uncertain matches.

Identity matching would only be introduced if its accuracy could be demonstrated safely; uncertain matches should not be silently merged.

---

## 12. Key Trade-offs

### Availability vs. freshness

The 5-minute Benefits Register cache improves availability and reduces repeated calls to a slow source, but it allows cached data to become slightly stale.

The accepted maximum staleness is 5 minutes.

### Retry vs. latency

Retrying failed XML requests improves the chance of recovering from temporary failures but adds latency when the source remains unavailable.

A maximum of 3 attempts was chosen as a bounded compromise.

### Independent sources vs. cross-source identity

Keeping the two source records independent avoids incorrect identity merges when no shared key exists.

This means the current API does not produce a single confidently matched person record across both systems, but it avoids silently returning incorrect associations.

### Simplicity vs. optional resilience features

Caching was added because it provides a useful reliability improvement with limited complexity.

Circuit breaking was left out of the current version so that optional resilience logic would not distract from the mandatory floor.

---

## 13. Summary of Key Decisions

The solution prioritises:

1. Independent source adapters.
2. Complete REST pagination with duplicate removal.
3. Bounded XML retries.
4. Explicit graceful degradation.
5. Read-only idempotent behaviour.
6. Transparent reporting of missing sources and failure reasons.
7. A defensible 5-minute Benefits Register cache.
8. A design that can accommodate the Day-2 source failure-rate change without rewriting the application.

The mandatory floor was prioritised before optional extensions. The current implementation deliberately avoids risky identity matching and other non-required functionality.