# API Error Response Contract

## Goals
API errors should be predictable for the frontend, useful for debugging, and safe to expose to users.

## Recommended response shape
Use a consistent structure for failed requests:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "fields": {
      "title": "This field is required."
    }
  }
}
```

## Status code guidance
- 400: malformed request or invalid input
- 401: authentication is required or invalid
- 403: the authenticated user lacks permission
- 404: the requested resource does not exist or is not accessible
- 409: the operation conflicts with the current resource state
- 500: unexpected server-side failure

## Implementation rules
- Keep machine-readable error codes stable.
- Return field-level details for correctable validation errors.
- Do not expose stack traces, SQL statements, secrets, or internal paths.
- Log diagnostic details on the server with a request identifier.
- Ensure frontend components handle both known and unexpected errors.

## Verification
Test representative errors for task creation, task updates, leave submission, and leave review. Confirm that response structure and status codes remain consistent.
