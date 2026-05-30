# user-auth Specification

## Purpose

Complete authentication system: registration, login, JWT sessions via NextAuth v5, and password recovery flow.

## Requirements

### Requirement: User Registration

The system SHALL create accounts with email, name, and password. Password MUST be bcrypt-hashed before storage. Email MUST be unique.

#### Scenario: Successful registration

- GIVEN valid email, name, and password (per Zod schema)
- WHEN POST /api/auth/register
- THEN user persisted with hashed password, HTTP 201, redirected to /login

#### Scenario: Duplicate email

- GIVEN email already exists in User table
- WHEN registration submitted
- THEN HTTP 409, error message displayed, no user created

#### Scenario: Invalid input

- GIVEN password shorter than 8 characters or invalid email format
- WHEN form submitted
- THEN Zod validation errors displayed, no API call made

### Requirement: User Login

The system MUST authenticate users by verifying credentials against Prisma. bcrypt.compare() SHALL validate the password. On success, NextAuth establishes a JWT session with user role.

#### Scenario: Successful login

- GIVEN registered user with email "a@b.com" and password "Test1234"
- WHEN login form submitted with matching credentials
- THEN session created with role in JWT, redirected to /dashboard

#### Scenario: Wrong password

- GIVEN registered user with email "a@b.com"
- WHEN incorrect password submitted
- THEN "Credenciales inválidas" error, no session created

#### Scenario: Non-existent email

- GIVEN email not in database
- WHEN login attempted
- THEN generic error returned (no user enumeration), no session

### Requirement: JWT Session Sync

The Zustand store MUST reflect the NextAuth session state: populated after login, cleared on logout.

#### Scenario: Post-login sync

- GIVEN user completes login
- WHEN AppLayout mounts and useSession() returns session
- THEN Zustand user state set with role accessible

#### Scenario: Logout cleanup

- GIVEN authenticated session
- WHEN user signs out
- THEN Zustand user state cleared to null

### Requirement: Password Recovery

The system SHALL allow password reset via unique crypto token with 1-hour TTL.

#### Scenario: Request reset token

- GIVEN registered email
- WHEN POST /api/auth/reset-password with email
- THEN unique token generated with 1h expiresAt, generic success response

#### Scenario: Reset password with valid token

- GIVEN non-expired, unused token
- WHEN POST with token and new valid password
- THEN password updated via bcrypt, token deleted, success response

#### Scenario: Expired token rejected

- GIVEN token with expiresAt in the past
- WHEN reset submitted
- THEN "Token expirado" error, no password change

#### Scenario: Non-existent email request

- GIVEN email not in database
- WHEN reset requested
- THEN generic success response returned (no user enumeration)
