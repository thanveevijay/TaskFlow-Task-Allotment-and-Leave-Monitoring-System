# Date and time handling rules

Task due dates and leave ranges should behave consistently across browsers and server environments.

## Recommended rules
- Store timestamps in UTC when an exact point in time is required.
- Store date-only values, such as a leave calendar date, as dates rather than converting them through local midnight.
- Define the organization's timezone for business rules and display.
- Validate date ranges on the backend.
- Reject impossible dates and end dates earlier than start dates.
- Document whether leave end dates are inclusive.

## Testing
- Test daylight-saving transitions if the application supports users in regions that observe them.
- Test browser and server configurations with different timezone settings.
- Verify overdue-task calculations around midnight.
- Verify leave duration calculations for same-day and multi-day requests.
- Confirm displayed dates do not shift after saving and reloading.

Do not rely on the browser timezone alone for authorization, approval deadlines, or business-critical date calculations.
