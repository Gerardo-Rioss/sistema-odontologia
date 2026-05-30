# Delta for Appointment CRUD

## ADDED Requirements

### Requirement: Calendar Sync Side-Effect on Mutations

After create, update, or delete operations commit, the system MUST trigger calendar sync asynchronously. Sync failure SHALL NOT affect the API response.

(Existing R1–R7 contract unchanged — same endpoints, status codes, validation, and auth.)

#### Scenario: Create triggers outbound sync
- GIVEN CalendarConnection ACTIVE, valid appointment payload
- WHEN `POST /api/appointments` returns 201
- THEN `CalendarService.createEvent()` called async; `googleEventId` stored on appointment record

#### Scenario: Update triggers outbound sync
- GIVEN appointment has `googleEventId="evt-abc"`, CalendarConnection ACTIVE
- WHEN `PUT /api/appointments/[id]` returns 200
- THEN `CalendarService.updateEvent("evt-abc", changes)` called async

#### Scenario: Delete triggers outbound sync
- GIVEN appointment has `googleEventId="evt-abc"`, CalendarConnection ACTIVE
- WHEN `DELETE /api/appointments/[id]` returns 200
- THEN `CalendarService.deleteEvent("evt-abc")` called async

#### Scenario: Sync failure does not block create
- GIVEN Google Calendar API unreachable
- WHEN `POST /api/appointments` executed
- THEN 201 returned immediately, sync failure logged, retry queued

#### Scenario: Confirm triggers sync
- GIVEN appointment status=PENDING, CalendarConnection ACTIVE
- WHEN `PATCH /api/appointments/[id]/confirm` returns 200
- THEN Google event updated with status=CONFIRMED via async sync

#### Scenario: Cancel triggers sync
- GIVEN appointment status=PENDING or CONFIRMED, CalendarConnection ACTIVE
- WHEN `PATCH /api/appointments/[id]/cancel` returns 200
- THEN Google event updated with status=CANCELLED via async sync

#### Scenario: No calendar connection — no sync attempted
- GIVEN no ACTIVE CalendarConnection for dentist
- WHEN any appointment mutation succeeds
- THEN no sync triggered, no error
