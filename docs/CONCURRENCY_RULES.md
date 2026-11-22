# Concurrency Rules

Use database transactions for simultaneous leave approvals and task reassignment. Re-check the current record version before saving changes and return a conflict response when another user has updated the record.