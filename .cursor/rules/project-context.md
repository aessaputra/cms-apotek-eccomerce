---
title: Project Context - Apotek E-commerce
description: Project overview and multi-repo architecture
tags: [project, architecture, overview]
---

# Apotek E-commerce Project Context

## 🏗️ Tech Stack

| Component | Technology | Repository |
|-----------|------------|------------|
| Admin Panel | Payload CMS | **This repo** |
| Mobile App | React Native (Expo) | Separate repo |
| Database | Supabase PostgreSQL | Shared |
| Auth (Admin) | Payload Auth | This repo |
| Auth (Customer) | Supabase Auth | React Native app |
| Payments | Midtrans | - |
| Storage | Supabase Storage | Shared |

## 📁 This Repository (cms-apotek-eccommerce)

Payload CMS admin panel for managing:
- Products & Categories
- Orders & Order Items  
- Payments (Midtrans)
- Inventory
- User Addresses

### Project Structure

```
src/
├── app/
│   └── (payload)/           # Payload admin routes
├── collections/             # Collection configs
├── globals/                 # Global configs
├── components/              # Custom admin components
├── hooks/                   # Hook functions
├── access/                  # Access control functions
└── payload.config.ts        # Main config (uses Supabase)
```

---

## 📊 Database Schema (Supabase PostgreSQL)

**10 Tables** - Use Supabase MCP (`list_tables`) as source of truth and keep `src/db/supabase-schema.ts` aligned.

### Table Overview

| Table | Description | Managed By |
|-------|-------------|------------|
| `profiles` | User profiles (admin/customer) | Supabase Auth trigger |
| `addresses` | Shipping addresses | Payload CMS / React Native |
| `categories` | Product categories | Payload CMS |
| `products` | Product listings | Payload CMS |
| `product_images` | Multiple images per product | Payload CMS |
| `inventory` | Stock quantities | Payload CMS |
| `orders` | Customer orders | Both (create: RN, manage: Payload) |
| `order_items` | Items in orders | Both |
| `cart_items` | Shopping cart | React Native only |
| `payments` | Midtrans payments | Both |

### Key Relationships

```
profiles ──┬── addresses (1:many)
           └── orders (1:many)
                  │
                  ├── order_items (1:many) ──── products
                  └── payments (1:1)

categories ──── products (1:many)
                     │
                     ├── product_images (1:many)
                     ├── inventory (1:1)
                     └── cart_items (many:many via user)
```

---

## 🔐 Access Patterns

| Platform | Role | Access Level |
|----------|------|--------------|
| Payload CMS | Service Role | Full access (bypasses RLS) |
| React Native | Anon | Read: products, categories, inventory |
| React Native | Authenticated | + Own: orders, cart, addresses, payments |
