# Logistics User Flows and Permissions

## Capability map

| Role | Access |
|------|--------|
| Organization owner/admin | Full logistics within org events/tours |
| Event/tour team member | Manage scoped records where RLS/helpers allow |
| Assigned worker/artist | View own itinerary/assignments; ack; complete tasks; permitted notes |
| Venue collaborator | Explicitly shared site-map / stop logistics only |
| Vendor contact | Limited shared order details only if guest pattern exists |
| Unassigned / other org | Deny all private logistics |

UI hiding is not authorization — enforce via `resolveAuthorizedOrgLogisticsScope`, site-map ACL, and RLS.

## Admin planning flow

1. Open `/admin/dashboard/logistics` with event/tour scope  
2. Overview shows readiness dimensions + blockers  
3. Create/import domain records per tab  
4. Assign people/resources; resolve conflicts  
5. Approve when required; confirm/publish  
6. Monitor acks, issues, costs  
7. Confirmed change → impact preview → re-notify affected  
8. Reconcile actuals; retain history  

## Assigned worker flow

1. Notification + task/itinerary surface  
2. Permission-filtered details only  
3. Acknowledge / decline / note / complete  
4. Revoke assignment → immediate loss of future reads  

## Venue collaborator flow

1. Admin shares selected map/records  
2. Collaborator edits only allowed fields  
3. Revoke keeps audit history  

## Failure recovery

- Preserve form state on failed mutation  
- Partial bulk failures enumerated  
- Idempotent publish/notify  
- Optimistic concurrency via `row_version` where added  

## Permission test matrix

| Case | Expected |
|------|----------|
| Org A admin reads Org B transport | 403 / empty |
| Unassigned user reads passenger manifest | deny |
| Assigned passenger reads own segment | allow filtered |
| Revoked collaborator reads site map | deny |
| Public share token | read-only published view |
