# Workflow acceptance checklist

Use this checklist when validating task allotment and leave monitoring workflows.

## Task lifecycle
- [ ] An authorized user can create a task with a title, description, assignee, and due date.
- [ ] Required fields are validated on both client and server.
- [ ] Assignees can view only tasks permitted by their role.
- [ ] Status changes are persisted and reflected consistently across the interface.
- [ ] Invalid transitions and unauthorized updates are rejected.
- [ ] Overdue tasks are identified using a consistent timezone rule.

## Leave lifecycle
- [ ] Employees can submit a leave request with valid dates and a reason.
- [ ] End dates earlier than start dates are rejected.
- [ ] Approvers can review requests within their authorization scope.
- [ ] Approval and rejection decisions retain the decision timestamp and reviewer.
- [ ] Employees can see the current request status.

## Integration checks
- [ ] Frontend validation agrees with backend validation.
- [ ] API errors are displayed without exposing stack traces.
- [ ] Concurrent updates do not silently overwrite newer state.
- [ ] Role checks are enforced by the backend, not only by hidden UI controls.

Record test data and outcomes without including real employee personal information.
