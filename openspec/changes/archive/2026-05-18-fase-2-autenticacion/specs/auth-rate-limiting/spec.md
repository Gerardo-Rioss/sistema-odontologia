# auth-rate-limiting Specification

## Purpose

Protect authentication endpoints against brute-force attacks via in-memory per-IP rate limiting.

## Requirements

### Requirement: Auth Endpoint Rate Limiting

The system MUST limit POST requests to /api/auth/* to 5 per IP per 15-minute window. Exceeded limit SHALL return HTTP 429 with Retry-After header.

#### Scenario: Normal usage within limit

- GIVEN IP has made 3 requests in current window
- WHEN a 4th request is made
- THEN request processed normally, counter incremented

#### Scenario: Limit exceeded

- GIVEN IP has made 5 requests in 14 minutes
- WHEN a 6th request is made
- THEN HTTP 429 returned with Retry-After header, body: "Demasiados intentos"

#### Scenario: Window reset

- GIVEN IP exceeded limit at minute 0
- WHEN request made at minute 16 (window expired)
- THEN counter reset, request processed normally

#### Scenario: Independent IP tracking

- GIVEN IP-A has reached the limit
- WHEN request made from IP-B
- THEN IP-B request processed normally with independent counter
