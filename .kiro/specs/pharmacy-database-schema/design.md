# Design Document

## Overview

This design specifies an enhanced pharmacy database schema built on Supabase PostgreSQL, extending the existing MVP structure with dedicated address management, comprehensive inventory tracking, and simplified product architecture. The system eliminates product variants for simplicity while adding sophisticated inventory management with batch tracking, expiry date monitoring, and stock reservation capabilities.

The architecture maintains ACID compliance through proper transaction handling, implements Row Level Security (RLS) for data isolation, and provides real-time capabilities for inventory updates. The design prioritizes pharmaceutical compliance requirements while ensuring high performance through strategic indexing and optimized query patterns.

## Architecture

### Database Platform
- **Primary Database**: Supabase PostgreSQL with Row Level Security
- **Real-time Engine**: Supabase Realtime for inventory and order updates
- **Authentication**: Supabase Auth with role-based access control
- **Storage**: Supabase Storage for product images

### Schema Architecture Principles
1. **Referential Integrity**: All foreign keys properly constrained with appropriate cascade behaviors
2. **Data Normalization**: Addresses extracted to dedicated table, inventory separated from products
3. **Audit Trail**: Comprehensive logging for inventory movements and critical operations
4. **Performance Optimization**: Strategic indexing for common query patterns
5. **Security First**: RLS policies enforce data isolation and role-based access

### Key Architectural Changes from MVP
- **Address Normalization**: Extracted from orders to dedicated `addresses` table
- **Inventory Separation**: New `inventory` table with batch and expiry tracking
- **Stock Reservation**: New `stock_reservations` table for cart management
- **Audit Logging**: New `inventory_movements` table for compliance
- **Simplified Products**: Removed variant support, single price per product

## Components and Interfaces

### Core Tables

#### 1. Enhanced Profiles Table
Extends the existing profiles structure with additional pharmacy-specific fields:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  -- Keep it simple for MVP - can add pharmacy-specific fields later
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Addresses Table (New)
Dedicated table for user address management:

```sql
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Address details
  label TEXT NOT NULL, -- "Home", "Office", "Mom's House"
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'Indonesia',
  
  -- Address types and defaults
  address_type TEXT DEFAULT 'both' CHECK (address_type IN ('shipping', 'billing', 'both')),
  is_default_shipping BOOLEAN DEFAULT false,
  is_default_billing BOOLEAN DEFAULT false,
  
  -- Metadata
  delivery_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_default_shipping_per_user 
    EXCLUDE (user_id WITH =) WHERE (is_default_shipping = true),
  CONSTRAINT unique_default_billing_per_user 
    EXCLUDE (user_id WITH =) WHERE (is_default_billing = true)
);
```

#### 3. Simplified Products Table
Removes variant complexity while maintaining essential product information:

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  
  -- Single pricing (no variants)
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  
  -- Pharmacy-specific fields
  generic_name TEXT, -- Scientific/generic name
  manufacturer TEXT,
  dosage_form TEXT, -- tablet, capsule, syrup, etc.
  strength TEXT, -- 500mg, 10ml, etc.
  requires_prescription BOOLEAN DEFAULT false,
  
  -- Product status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Basic Inventory Table (Simplified)
Simple inventory management with essential features only:

```sql
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  
  -- Basic batch information
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Simple quantity tracking
  current_quantity INTEGER NOT NULL CHECK (current_quantity >= 0),
  minimum_stock_level INTEGER DEFAULT 10 CHECK (minimum_stock_level >= 0),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(product_id, batch_number),
  CHECK (expiry_date > CURRENT_DATE)
);
```

#### 5. Simple Cart Items Table (Enhanced)
Enhanced cart with basic stock checking:

```sql
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate items in cart
  UNIQUE(user_id, product_id)
);
```

#### 6. Enhanced Orders Table
Modified to reference addresses instead of embedding them:

```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Address references
  billing_address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  shipping_address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  
  -- Order totals
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Order status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- Pharmacy-specific
  prescription_required BOOLEAN DEFAULT false,
  prescription_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. Inventory Movements Table (New)
Audit trail for all inventory changes:

```sql
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  
  -- Movement details
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'expiry', 'return')),
  quantity_change INTEGER NOT NULL, -- Positive for additions, negative for reductions
  quantity_before INTEGER NOT NULL CHECK (quantity_before >= 0),
  quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
  
  -- Reference information
  reference_type TEXT CHECK (reference_type IN ('order', 'adjustment', 'expiry', 'return')),
  reference_id UUID, -- Could reference orders, adjustments, etc.
  
  -- User and reason
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT,
  notes TEXT,
  
  -- Metadata (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Database Functions and Triggers

#### 1. Basic Stock Availability Function
Simple stock calculation with expiry checking:

```sql
CREATE OR REPLACE FUNCTION get_available_stock(product_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_available INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(current_quantity), 0)
    INTO total_available
    FROM public.inventory
    WHERE product_id = product_uuid
      AND is_active = true
      AND expiry_date > CURRENT_DATE;
    
    RETURN total_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Simple Stock Check Function
Basic overselling prevention:

```sql
CREATE OR REPLACE FUNCTION check_stock_availability(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_available_stock(p_product_id) >= p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Data Models

### Address Model
```typescript
interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: 'shipping' | 'billing' | 'both';
  is_default_shipping: boolean;
  is_default_billing: boolean;
  delivery_instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Inventory Model
```typescript
interface Inventory {
  id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  manufacture_date?: string;
  supplier?: string;
  initial_quantity: number;
  current_quantity: number;
  reserved_quantity: number;
  minimum_stock_level: number;
  unit_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Stock Reservation Model
```typescript
interface StockReservation {
  id: string;
  user_id: string;
  inventory_id: string;
  quantity: number;
  reservation_type: 'cart' | 'order';
  expires_at: string;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

Now I need to use the prework tool to analyze the acceptance criteria before writing the correctness properties section.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified as testable and will form the foundation for property-based testing of the pharmacy database schema:

### Property 1: Address Creation Validation
*For any* user and valid address data, creating a new address should result in proper field validation and correct user association
**Validates: Requirements 1.1**

### Property 2: Default Address Uniqueness
*For any* user and address type, setting an address as default should ensure only one default address exists per type per user
**Validates: Requirements 1.2**

### Property 3: Address Access Control
*For any* authenticated user, viewing addresses should return only addresses belonging to that user
**Validates: Requirements 1.3, 7.1**

### Property 4: Address Update Integrity
*For any* address referenced by existing orders, updating the address should preserve referential integrity
**Validates: Requirements 1.4**

### Property 5: Address Deletion Protection
*For any* address referenced by existing orders, attempting to delete the address should be prevented by the system
**Validates: Requirements 1.5**

### Property 6: Product Structure Validation
*For any* product creation, the system should store only essential fields (name, description, category, price) without variant complexity
**Validates: Requirements 2.1**

### Property 7: Slug Generation Uniqueness
*For any* product name, the system should generate a unique, URL-friendly slug
**Validates: Requirements 2.2**

### Property 8: Product Category Validation
*For any* product creation, the system should require and validate a valid category association
**Validates: Requirements 2.3**

### Property 9: Inventory Creation Validation
*For any* inventory addition, the system should require batch number, expiry date, and initial quantity
**Validates: Requirements 3.1**

### Property 10: Stock Level Monitoring
*For any* inventory item, when quantity reaches minimum stock level, the system should flag it for reorder
**Validates: Requirements 3.2**

### Property 11: Expired Batch Exclusion
*For any* product with expired batches, the system should exclude expired batches from availability calculations
**Validates: Requirements 3.3, 3.4**

### Property 12: Inventory Quantity Constraints
*For any* inventory operation, the system should prevent quantities from becoming negative
**Validates: Requirements 3.5**

### Property 13: FIFO Stock Allocation
*For any* product with multiple batches, stock allocation should follow FIFO (First In, First Out) ordering
**Validates: Requirements 3.6**

### Property 14: Stock Reservation Creation
*For any* cart operation, adding items should create appropriate temporary stock reservations
**Validates: Requirements 4.1**

### Property 15: Reservation Expiration Cleanup
*For any* expired stock reservation, the system should automatically release reserved quantities back to available stock
**Validates: Requirements 4.2**

### Property 16: Order Confirmation Stock Deduction
*For any* confirmed order, temporary reservations should be converted to permanent stock deductions
**Validates: Requirements 4.3**

### Property 17: Order Cancellation Stock Release
*For any* cancelled order, all associated stock reservations should be immediately released
**Validates: Requirements 4.4**

### Property 18: Overselling Prevention
*For any* product, the total of reserved and sold quantities should never exceed available stock
**Validates: Requirements 4.5**

### Property 19: Order Address Validation
*For any* order creation, the system should require and validate references to user's addresses for billing and shipping
**Validates: Requirements 5.1, 5.3, 5.5**

### Property 20: Order Address Relationship Maintenance
*For any* order with address references, the system should maintain address relationships for historical tracking
**Validates: Requirements 5.2, 5.4**

### Property 21: Inventory Movement Audit Logging
*For any* inventory quantity change, the system should log the change with timestamp, user, and reason
**Validates: Requirements 6.1**

### Property 22: Batch Tracking in Sales
*For any* product sale, the system should record which specific batches were used
**Validates: Requirements 6.2**

### Property 23: Administrative Authorization for Adjustments
*For any* inventory adjustment, the system should require and validate administrative authorization
**Validates: Requirements 6.3, 7.3**

### Property 24: Audit Log Immutability
*For any* created audit log entry, the system should prevent modification after creation
**Validates: Requirements 6.4**

### Property 25: Sales Traceability
*For any* sale transaction, the system should provide complete traceability from sale back to original batch
**Validates: Requirements 6.5**

### Property 26: Order Access Control
*For any* authenticated user, accessing orders should return only orders belonging to that user
**Validates: Requirements 7.2**

### Property 27: ACID Compliance for Inventory Operations
*For any* inventory operation, the system should maintain ACID compliance to prevent data corruption
**Validates: Requirements 8.1**

### Property 28: Concurrent Operation Safety
*For any* simultaneous inventory access by multiple users, the system should handle operations safely without data corruption
**Validates: Requirements 8.2**

### Property 29: Trigger Transaction Integrity
*For any* database trigger execution, the system should maintain transactional integrity across related tables
**Validates: Requirements 8.4**

### Property 30: Foreign Key Constraint Enforcement
*For any* database operation, the system should enforce proper foreign key constraints to maintain referential integrity
**Validates: Requirements 8.5**

## Error Handling

### Database Constraint Violations
- **Foreign Key Violations**: Return descriptive error messages when referencing non-existent records
- **Check Constraint Violations**: Validate data ranges and enums before database operations
- **Unique Constraint Violations**: Handle duplicate entries gracefully with user-friendly messages

### Inventory-Specific Error Handling
- **Insufficient Stock**: Prevent orders when requested quantity exceeds available stock
- **Expired Products**: Block sales of expired inventory with clear error messages
- **Negative Quantities**: Prevent inventory operations that would result in negative stock
- **Reservation Conflicts**: Handle concurrent reservation attempts with proper locking

### Access Control Errors
- **Unauthorized Access**: Return 403 errors for RLS policy violations
- **Invalid User Context**: Handle missing or invalid authentication tokens
- **Role Validation**: Verify user roles before administrative operations

### Transaction Failures
- **Deadlock Detection**: Implement retry logic for database deadlocks
- **Rollback Handling**: Ensure proper cleanup on transaction failures
- **Concurrent Modification**: Handle optimistic locking conflicts

## Testing Strategy

### Dual Testing Approach
The system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of address creation and validation
- Edge cases for inventory operations (zero stock, expired batches)
- Error conditions and constraint violations
- Integration points between tables and triggers

**Property Tests** focus on:
- Universal properties that hold across all valid inputs
- Comprehensive input coverage through randomization
- Invariant preservation during operations
- Concurrent operation safety

### Property-Based Testing Configuration
- **Testing Library**: Use `fast-check` for TypeScript/JavaScript or `Hypothesis` for Python
- **Minimum Iterations**: 100 iterations per property test
- **Test Tagging**: Each property test must reference its design document property
- **Tag Format**: `Feature: pharmacy-database-schema, Property {number}: {property_text}`

### Critical Test Areas
1. **Inventory Management**: Stock calculations, reservations, FIFO allocation
2. **Address Management**: User isolation, default address constraints
3. **Order Processing**: Address references, stock deductions, audit trails
4. **Access Control**: RLS policy enforcement, role-based permissions
5. **Data Integrity**: Foreign key constraints, transaction atomicity
6. **Concurrent Operations**: Race conditions, deadlock prevention

### Database Testing Patterns
- **Transaction Testing**: Verify ACID properties under concurrent load
- **Constraint Testing**: Validate all database constraints and triggers
- **Performance Testing**: Ensure indexes support common query patterns
- **Migration Testing**: Verify schema changes maintain data integrity