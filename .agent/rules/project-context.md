---
trigger: always_on
description: >-
---

# Project Context - Apotek E-commerce

## Tech Stack

This repository contains the **Payload CMS admin panel** for Apotek E-commerce.

| Component | Technology | Repository |
|-----------|------------|------------|
| Admin Panel | Payload CMS | This repo |
| Mobile App | React Native (Expo) | Separate repo |
| Database | Supabase PostgreSQL | Shared |
| Auth (Admin) | Payload Auth | This repo |
| Auth (Customer) | Supabase Auth | React Native app |
| Payments | Midtrans | Both |
| Storage | Supabase Storage | Shared |

## Database Schema

Core business tables (non-exhaustive):
- `admins` - Admin staff (Payload Auth, Admin Panel login)
- `profiles` - Customer profiles (Supabase Auth, no Payload login)
- `addresses` - Shipping addresses
- `categories` - Product categories
- `products` - Product listings
- `product_images` - Multiple images per product
- `inventory` - Stock quantities
- `orders` - Customer orders
- `order_items` - Items in orders
- `cart_items` - Shopping cart (React Native only)
- `payments` - Midtrans payments

Use Supabase MCP (`list_tables`) as the source of truth and keep `src/db/supabase-schema.ts` aligned. Note: Supabase also contains Payload internal tables (e.g. preferences, locks, migrations).