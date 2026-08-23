# AI Usage

AI tools were used as development assistance during this project. The implementation, integration, testing, and final decisions were reviewed and verified by me.

AI was used mainly as a support tool for understanding requirements, discussing implementation approaches, debugging issues, improving documentation, and reviewing test scenarios.

## How AI was used

### Requirements and planning

I used AI to help understand the Problem 3 requirements, identify the mandatory floor requirements, and break the work into smaller implementation and testing tasks.

I made the final decisions about which requirements and features to implement based on the problem statement, handbook, available time, and the behaviour of the provided services.

### Architecture and implementation

AI assistance was used to discuss and review the adapter-based architecture:

- REST Adapter for the Resident Index
- XML Adapter for the Benefits Register
- Unified Service for combining the source results
- API routes for exposing the unified response

AI was also used for guidance while implementing and reviewing specific functionality such as:

- REST pagination
- resident duplicate removal using resident IDs
- XML parsing
- XML retry handling
- graceful degradation using independent source results
- unified response status handling
- in-memory Benefits Register caching

The code was integrated into the project and tested by me in the local environment.

### Debugging

AI was used to help interpret and troubleshoot development issues, including:

- Node.js runtime errors
- API and service connectivity problems
- PowerShell commands and process/port checks
- XML service failures
- Git status, diff, and commit issues
- verification of API responses and test output

I used the explanations to make and verify the required changes rather than relying on AI output without testing.

### Testing

AI assistance was used to help design and review test scenarios for:

- REST pagination and duplicate handling
- XML parsing
- XML retry behaviour
- unified responses
- graceful degradation when a source fails
- both-source failure handling
- repeated requests and idempotency
- Benefits Register caching
- the Day-2 approximately 40% Benefits Register failure scenario

The test commands were executed locally and their actual outputs were reviewed during development.

### Documentation

AI assistance was used to help structure and review:

- `README.md`
- `DECISIONS.md`
- `AI-USAGE.md`

The final documentation was checked against the actual implementation and the project requirements.

## Developer contribution and responsibility

AI was used as a development assistant, not as a replacement for understanding or verification.

I was responsible for:

- understanding the problem requirements
- deciding the application architecture
- integrating the implementation into the repository
- running the application and provided mock services
- executing the test scripts
- investigating failures and runtime behaviour
- reviewing and modifying the generated suggestions
- making the final implementation and design decisions
- maintaining the Git history
- verifying that the final repository works as intended

I am responsible for every line in the submitted repository and should be able to explain the implementation, design decisions, tests, and expected behaviour during the Q&A.

## Summary

AI assistance was used throughout the development process for planning, implementation guidance, debugging, testing, and documentation. The final solution was assembled, reviewed, executed, and verified by me.