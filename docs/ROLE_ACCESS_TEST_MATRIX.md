# Role access test matrix

Adapt this matrix to the roles implemented by the application. Backend authorization must enforce every restriction; hiding a button in the frontend is not sufficient.

| Action | Employee | Manager | Administrator |
|---|---|---|---|
| View own tasks | Allow | Allow | Allow |
| View another employee's tasks | Deny unless explicitly assigned | Scope-limited | Allow if required |
| Create or assign tasks | Deny unless permitted | Scope-limited | Allow |
| Submit own leave request | Allow | Allow | Allow |
| Approve own leave request | Deny | Deny | Deny unless a documented exception exists |
| Review team leave requests | Deny | Scope-limited | Allow |
| Change roles or permissions | Deny | Deny | Allow |

## Test cases
- Attempt each action while signed out.
- Attempt each action using a role that should be denied.
- Change an object identifier in the request to test horizontal access control.
- Verify that denied requests do not modify data.
- Confirm authorization failures return safe, consistent errors.

Document any intentional deviations from this example matrix.
