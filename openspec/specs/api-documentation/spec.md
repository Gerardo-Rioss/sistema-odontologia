# api-documentation Specification

## Purpose

Complete API endpoint documentation with request/response examples and authentication requirements.

## Requirements

### Requirement: API Endpoint Catalog

The system MUST provide `docs/API.md` documenting all API endpoints with method, path, auth requirement, and description.

| Section | Content |
|---------|---------|
| Auth | Login, register, session endpoints |
| Patients | CRUD endpoints |
| Appointments | CRUD + status endpoints |
| WhatsApp | Webhook, message, conversation endpoints |
| Calendar | OAuth, sync, webhook endpoints |

#### Scenario: Developer looks up an endpoint

- GIVEN `docs/API.md` exists
- WHEN a developer searches for a specific endpoint
- THEN each endpoint SHALL include method, path, auth header requirement, and a description

### Requirement: Request/Response Examples

Each documented endpoint SHALL include at least one request example and one response example.

#### Scenario: Developer copies a request example

- GIVEN an endpoint is documented with a request example
- WHEN the developer copies the example
- THEN the example SHALL be a valid curl command or JSON body that works against the documented endpoint

#### Scenario: Response example shows all fields

- GIVEN an endpoint response is documented
- WHEN the developer reads the response example
- THEN all fields in the response body SHALL be listed with types AND descriptions

### Requirement: Auth Requirements Documentation

`docs/API.md` SHALL document authentication flow: session cookie requirements, protected vs public endpoints, and rate limiting.

#### Scenario: Developer identifies auth requirements

- GIVEN `docs/API.md` auth section exists
- WHEN a developer checks an endpoint's auth requirements
- THEN protected endpoints SHALL be marked with auth type AND public endpoints SHALL be clearly indicated
