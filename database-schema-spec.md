---
name: apotek-ecommerce-database-schema
description: >-
  Supabase PostgreSQL database schema for Apotek E-commerce MVP.
  Use when querying tables, creating migrations, or understanding data relationships.
version: "1.1.0"
last_updated: "2026-02-05"
database: Supabase PostgreSQL
tables_count: 10
---

# Database Schema Specification - Apotek E-commerce MVP

Supabase PostgreSQL schema for pharmacy e-commerce platform with RLS security.

## Quick Reference

| Table | Description | RLS | Key Relationships |
|-------|-------------|-----|-------------------|
| `profiles` | User info extending auth.users | ✅ | → auth.users |
| `addresses` | Shipping addresses | ✅ | → auth.users |
| `categories` | Product categories | ✅ | ← products |
| `products` | Product catalog | ✅ | → categories |
| `inventory` | Stock management | ✅ | → products |
| `product_images` | Product gallery | ✅ | → products |
| `cart_items` | Shopping cart | ✅ | → auth.users, products |
| `orders` | Order management | ✅ | → auth.users, addresses |
| `order_items` | Order line items | ✅ | → orders, products |
| `payments` | Midtrans payments | ✅ | → orders |

## Entity Relationship Diagram

```mermaid
erDiagram
    auth_users ||--|| profiles : "has profile"
    auth_users ||--o{ addresses : "has addresses"
    auth_users ||--o{ orders : "places"
    auth_users ||--o{ cart_items : "has cart"
    
    categories ||--o{ products : "contains"
    products ||--|| inventory : "has stock"
    products ||--o{ product_images : "has images"
    products ||--o{ cart_items : "in cart"
    products ||--o{ order_items : "ordered"
    
    addresses ||--o{ orders : "ships to"
    orders ||--o{ order_items : "contains"
    orders ||--o{ payments : "paid by"

    profiles {
        uuid id PK "FK auth.users"
        text email
        text full_name
        text phone
        text role "admin|customer"
    }
    
    addresses {
        uuid id PK
        uuid user_id FK
        text label "Home|Office|etc"
        text recipient_name
        text phone
        text address_line
        text city
        text postal_code
        boolean is_default
    }

    categories {
        uuid id PK
        text name
        text slug UK
        text logo_url
    }

    products {
        uuid id PK
        text name
        text slug UK
        text description
        uuid category_id FK
        numeric price
    }

    inventory {
        uuid id PK
        uuid product_id FK_UK
        integer quantity
        integer low_stock_threshold
    }

    product_images {
        uuid id PK
        uuid product_id FK
        text image_url
        boolean is_primary
        integer sort_order
    }

    cart_items {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        integer quantity
    }

    orders {
        uuid id PK
        uuid user_id FK
        uuid address_id FK
        numeric total_amount
        text status "pending|confirmed|completed|cancelled"
        text shipping_name
        text shipping_address
        text shipping_phone
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        text product_name
        numeric unit_price
        integer quantity
        numeric total_price
    }

    payments {
        uuid id PK
        uuid order_id FK
        text midtrans_order_id UK
        text midtrans_transaction_id
        text midtrans_payment_type
        numeric amount
        text status
        text payment_method
        jsonb midtrans_response
    }
```

---

## Table Definitions

### 1. profiles

User information extending Supabase auth.users.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | PK, FK → auth.users(id) ON DELETE CASCADE |
| `email` | text | NO | - | - |
| `full_name` | text | YES | - | - |
| `phone` | text | YES | - | - |
| `role` | text | YES | 'customer' | CHECK (role IN ('admin', 'customer')) |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Users: view/update own profile
- Admins: view/update all profiles

---

### 2. addresses

User shipping addresses with default selection.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | - | FK → auth.users(id) ON DELETE CASCADE |
| `label` | text | YES | 'Home' | - |
| `recipient_name` | text | NO | - | - |
| `phone` | text | YES | - | - |
| `address_line` | text | NO | - | - |
| `city` | text | YES | - | - |
| `postal_code` | text | YES | - | - |
| `is_default` | boolean | YES | false | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Users: full access to own addresses

---

### 3. categories

Product categories for catalog organization.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | - | - |
| `slug` | text | NO | - | UNIQUE |
| `logo_url` | text | YES | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Everyone: read access
- Admins: full CRUD

---

### 4. products

Product catalog with pricing.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | - | - |
| `slug` | text | NO | - | UNIQUE |
| `description` | text | YES | - | - |
| `category_id` | uuid | NO | - | FK → categories(id) ON DELETE RESTRICT |
| `price` | numeric(10,2) | NO | - | CHECK (price >= 0) |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Everyone: read access
- Admins: full CRUD

---

### 5. inventory

Stock management per product (1:1 relationship).

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `product_id` | uuid | NO | - | UNIQUE, FK → products(id) ON DELETE CASCADE |
| `quantity` | integer | NO | 0 | CHECK (quantity >= 0) |
| `low_stock_threshold` | integer | YES | 10 | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Everyone: read access (view stock)
- Admins: full CRUD

---

### 6. product_images

Multiple images per product with ordering.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `product_id` | uuid | NO | - | FK → products(id) ON DELETE CASCADE |
| `image_url` | text | NO | - | - |
| `is_primary` | boolean | YES | false | - |
| `sort_order` | integer | YES | 0 | - |
| `created_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Everyone: read access
- Admins: full CRUD

---

### 7. cart_items

Shopping cart with unique user-product constraint.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | - | FK → auth.users(id) ON DELETE CASCADE |
| `product_id` | uuid | NO | - | FK → products(id) ON DELETE CASCADE |
| `quantity` | integer | NO | - | CHECK (quantity > 0) |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**Unique Constraint:** UNIQUE(user_id, product_id)

**RLS Policies:**
- Users: full access to own cart

---

### 8. orders

Order management with shipping details.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | - | FK → auth.users(id) ON DELETE RESTRICT |
| `address_id` | uuid | YES | - | FK → addresses(id) |
| `total_amount` | numeric(10,2) | NO | - | CHECK (total_amount >= 0) |
| `status` | text | YES | 'pending' | CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) |
| `shipping_name` | text | NO | - | - |
| `shipping_address` | text | NO | - | - |
| `shipping_phone` | text | YES | - | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Users: view/create own orders
- Admins: view/update all orders

---

### 9. order_items

Line items within orders (denormalized product info).

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `order_id` | uuid | NO | - | FK → orders(id) ON DELETE CASCADE |
| `product_id` | uuid | NO | - | FK → products(id) ON DELETE RESTRICT |
| `product_name` | text | NO | - | Denormalized |
| `unit_price` | numeric(10,2) | NO | - | CHECK (unit_price >= 0) |
| `quantity` | integer | NO | - | CHECK (quantity > 0) |
| `total_price` | numeric(10,2) | NO | - | CHECK (total_price >= 0) |
| `created_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Users: view own order items (via orders relationship)

---

### 10. payments

Midtrans payment integration.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `order_id` | uuid | NO | - | FK → orders(id) ON DELETE RESTRICT |
| `midtrans_order_id` | text | YES | - | UNIQUE |
| `midtrans_transaction_id` | text | YES | - | - |
| `midtrans_payment_type` | text | YES | - | credit_card, bank_transfer, etc. |
| `amount` | numeric(10,2) | NO | - | CHECK (amount >= 0) |
| `status` | text | YES | 'pending' | CHECK (status IN ('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure')) |
| `payment_method` | text | YES | - | BCA, Mandiri, etc. |
| `paid_at` | timestamptz | YES | - | - |
| `expired_at` | timestamptz | YES | - | - |
| `midtrans_response` | jsonb | YES | - | Full callback data |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

**RLS Policies:**
- Users: view own payments (via orders relationship)
- Admins: view/update all payments

---

## Database Functions

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
```

Applied to: profiles, addresses, categories, products, orders, cart_items, payments

### Auto-Create Profile

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'customer');
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;
```

### Admin Check Helper

```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;
```

---

## Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| profiles | email | btree | Email lookup |
| profiles | role | btree | Role filtering |
| addresses | user_id | btree | User's addresses |
| categories | slug | btree/unique | Category lookup |
| products | slug | btree/unique | Product lookup |
| products | category_id | btree | Category filter |
| products | name, description | GIN (tsvector) | Full-text search |
| inventory | product_id | btree/unique | Stock lookup |
| product_images | product_id | btree | Product images |
| product_images | product_id + is_primary | partial | Primary image |
| cart_items | user_id | btree | User's cart |
| orders | user_id | btree | User's orders |
| orders | status | btree | Status filter |
| orders | created_at | btree | Time queries |
| order_items | order_id | btree | Order items |
| payments | order_id | btree | Payment lookup |
| payments | midtrans_order_id | btree/unique | Webhook verification |
| payments | status | btree | Status filter |

---

## Realtime Configuration

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
```

---

## Role-Based Access Summary

### Customer Role 🛒
- ✅ View/update own profile
- ✅ Manage own addresses
- ✅ Browse products, categories, images (read-only)
- ✅ View product stock (read-only)
- ✅ Full cart management (CRUD)
- ✅ Create and view own orders
- ✅ View own payments

### Admin Role 👨‍💼
- ✅ View/update all profiles
- ✅ Full CRUD on categories, products, images, inventory
- ✅ View and update all orders
- ✅ View and update all payments

---

## Query Examples

### Get products with stock
```sql
SELECT p.*, i.quantity, i.low_stock_threshold
FROM products p
JOIN inventory i ON i.product_id = p.id
WHERE i.quantity > 0;
```

### Full-text search
```sql
SELECT * FROM products 
WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) 
@@ plainto_tsquery('english', 'obat batuk');
```

### User's cart with products
```sql
SELECT ci.*, p.name, p.price, pi.image_url
FROM cart_items ci
JOIN products p ON p.id = ci.product_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
WHERE ci.user_id = auth.uid();
```

### Order with items and payment
```sql
SELECT o.*, 
       json_agg(oi) as items,
       p.status as payment_status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.id = $1
GROUP BY o.id, p.status;
```
