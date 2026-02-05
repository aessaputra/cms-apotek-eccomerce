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
| Auth | Supabase Auth | Shared |
| Payments | Midtrans | Both |
| Storage | Supabase Storage | Shared |

## Database Schema

10 Tables in Supabase PostgreSQL:
- `profiles` - User profiles (admin/customer)
- `addresses` - Shipping addresses
- `categories` - Product categories
- `products` - Product listings
- `product_images` - Multiple images per product
- `inventory` - Stock quantities
- `orders` - Customer orders
- `order_items` - Items in orders
- `cart_items` - Shopping cart (React Native only)
- `payments` - Midtrans payments

See `database-schema-spec.md` for full schema.