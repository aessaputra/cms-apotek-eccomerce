# Address Best Practices - Apotek E-commerce

## Overview

Addresses are **customer-owned data**. Admin has read-only access for support and order management. Customers manage addresses via the React Native mobile app.

## Access Control (Payload CMS)

| Role   | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Admin  | No     | Yes (all) | No | No |
| Customer | Yes (own) | Yes (own) | Yes (own) | Yes (own) |

- **Admin**: Read-only. View addresses for order processing and customer support.
- **Customer**: Full CRUD on own addresses via React Native (Supabase client).

## Supabase RLS

The `addresses` table has RLS enabled. Policy: `user_id = auth.uid()` for authenticated users.

```sql
-- Migration: enable_rls_addresses_customer_owned
CREATE POLICY "Customers manage own addresses"
  ON addresses FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Payload CMS uses service role and bypasses RLS; RLS applies to React Native (Supabase client).

## React Native Implementation

- Manage addresses in Profile screen and Checkout flow.
- Use Supabase client with user JWT for all CRUD.
- Consider Place Autocomplete (Google/Mapbox) for address input.
- Indonesian format: postal_code 5 digits, phone +62/08xx.

## Files

- `src/access/addressAdminReadOnlyAccess.ts` - Access control
- `src/collections/Addresses.ts` - Collection config
- Supabase migration: `enable_rls_addresses_customer_owned`
