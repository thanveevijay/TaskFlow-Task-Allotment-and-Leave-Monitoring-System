# Manual Regression Test Plan

## Scope
This plan covers the core task and leave workflows after changes to the application.

## Task workflow
| Scenario | Expected result |
|---|---|
| Submit a valid task | Task is saved and shown in the relevant list |
| Submit a task with missing required data | Validation message is shown; no incomplete task is saved |
| Update task details | Updated values remain visible after refresh |
| Change task status | New status is persisted and displayed consistently |
| Open an unknown task identifier | A safe not-found response is shown |

## Leave workflow
| Scenario | Expected result |
|---|---|
| Submit a valid leave request | Request is recorded with an initial status |
| Submit an invalid date range | Request is rejected with a clear explanation |
| Review a pending request | Only an authorized reviewer can make the decision |
| Approve or reject a request | Decision and status are persisted |
| Reopen the request view | Latest status is displayed |

## General checks
- Test with both valid and invalid input.
- Verify access control for every role-sensitive action.
- Refresh the page after mutations to check persistence.
- Confirm errors do not expose stack traces or sensitive records.

Record the build, test date, scenario, result, and any reproducible defect for each test run.
