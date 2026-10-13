# Yenz Admin Interface (`mobile/admin`)

## Scope & Capabilities
1. **Administrative Metrics**: Gross order revenue, completed trips, platform commission.
2. **Vendor Application Review**: KYC document verification, store approval, and store rejection.
3. **Delivery Partner Review**: Driving license, vehicle details, bank details, and rider approval.
4. **Dispute Resolution & Override**: Force reassign or resolve stalled orders.

## Security Architecture
- Strictly protected by server-side `authorize('ADMIN')` middleware on `/api/admin/*`.
- Excluded from public mobile registration and login selectors.
- Connects using secure admin JWT bearer tokens.
