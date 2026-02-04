# Implementation Plan: Pharmacy E-commerce Enhancements (Payload CMS)

## Overview

This implementation plan enhances an existing Payload CMS e-commerce platform with pharmacy-specific features. The system currently uses the Payload E-commerce plugin which provides orders, carts, addresses, and products collections. This plan focuses on adding pharmacy-specific enhancements: improved address management, comprehensive inventory tracking with batch numbers and expiry dates, prescription handling, and enhanced order management.

The approach builds upon Payload's existing collections and functionality rather than replacing them, ensuring compatibility with the existing e-commerce infrastructure while adding essential pharmaceutical features.

## Tasks

- [x] 1. Enhance existing Payload collections foundation
  - [x] 1.1 Review and enhance Users collection
    - Verify existing roles field supports 'admin' and 'customer' roles
    - Ensure proper access control functions are in place
    - Add any missing pharmacy-specific user fields if needed
    - Use context7, supabase-mcp and squential thingking
    - _Requirements: 7.4, 8.5_
  
  - [x] 1.2 Review Categories collection for pharmaceutical products
    - Ensure categories support pharmaceutical product classification
    - Add pharmacy-specific category fields if needed (controlled_substance, prescription_required)
    - _Requirements: 2.3_

- [x] 2. Enhance address management using existing addresses collection
  - [x] 2.1 Extend addresses collection with enhanced features
    - Add address type field (shipping, billing, both) to existing collection
    - Add default address handling (is_default_shipping, is_default_billing)
    - Add delivery instructions field
    - Implement label field for address identification ("Home", "Office", etc.)
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [x] 2.2 Create address management hooks
    - Implement beforeChange hook to ensure only one default address per type per user
    - Create beforeDelete hook to prevent deletion of addresses referenced by orders
    - Add validation hooks for address data integrity
    - _Requirements: 1.4, 1.5_
  
  - [x] 2.3 Enhance address access control
    - Review existing access control for addresses collection
    - Ensure users can only see their own addresses
    - Add admin access for address management
    - Use Context7, supabase-mcp and squential thingking
    - _Requirements: 1.3, 7.1_

- [ ] 3. Enhance products collection for pharmacy use
  - [ ] 3.1 Add pharmacy-specific fields to products collection
    - Add generic_name field for scientific/generic drug names
    - Add manufacturer field
    - Add dosage_form field (tablet, capsule, syrup, etc.)
    - Add strength field (500mg, 10ml, etc.)
    - Add requires_prescription boolean field
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 3.2 Create product management hooks
    - Implement slug generation hook if not already present
    - Create product availability calculation hook
    - Add validation hooks for pharmacy-specific fields
    - _Requirements: 2.2, 2.5_

- [ ] 4. Create new inventory collection for batch tracking
  - [ ] 4.1 Create inventory collection
    - Define collection with relationship to products
    - Add batch_number, expiry_date, and quantity tracking fields
    - Add minimum_stock_level field for reorder alerts
    - Add supplier and cost tracking fields
    - Implement proper validation (non-negative quantities, future expiry dates)
    - _Requirements: 3.1, 3.5_
  
  - [ ] 4.2 Create inventory management hooks
    - Implement stock availability calculation hooks
    - Create expired inventory identification hooks
    - Add FIFO stock allocation logic for batch selection
    - _Requirements: 3.3, 3.4, 3.6_
  
  - [ ] 4.3 Create stock level monitoring
    - Implement minimum stock level checking hooks
    - Create reorder alert system
    - Add low stock notification functionality
    - _Requirements: 3.2_

- [ ] 5. Enhance existing orders collection for prescriptions
  - [ ] 5.1 Add pharmacy-specific fields to orders collection
    - Add prescription_required boolean field
    - Add prescription_verified boolean field
    - Add verified_by relationship to users (admin who verified)
    - Add prescription_notes text field
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 5.2 Create prescription handling hooks
    - Implement beforeChange hook to check prescription requirements
    - Create prescription verification workflow hooks
    - Add order status validation for prescription orders
    - _Requirements: 5.1, 5.4, 5.5_
  
  - [ ] 5.3 Enhance order processing
    - Create hooks to validate stock availability before order confirmation
    - Implement stock deduction hooks for confirmed orders
    - Add order cancellation hooks with stock restoration
    - _Requirements: 5.2, 6.2_

- [ ] 6. Create inventory movements collection for audit trail
  - [ ] 6.1 Create inventory_movements collection
    - Define collection with relationship to inventory items
    - Add movement_type field (purchase, sale, adjustment, expiry, return)
    - Add quantity_change, quantity_before, quantity_after fields
    - Add reference fields for tracking related orders/adjustments
    - Add performed_by relationship to users
    - Add reason and notes fields
    - _Requirements: 6.1, 6.4_
  
  - [ ] 6.2 Create audit logging hooks
    - Implement afterChange hooks on inventory to log movements
    - Create batch tracking hooks for sales
    - Add administrative adjustment logging
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 6.3 Implement audit trail protection
    - Set inventory_movements collection to read-only after creation
    - Add access control to prevent modification of audit logs
    - _Requirements: 6.1, 6.4_

- [ ] 7. Enhance cart collection for stock validation
  - [ ] 7.1 Add stock validation to cart operations
    - Implement beforeChange hooks to validate stock availability
    - Create hooks to check inventory levels when adding items
    - Add real-time stock validation for cart items
    - _Requirements: 4.1, 4.5_
  
  - [ ] 7.2 Create cart-inventory integration
    - Implement hooks to update cart when stock levels change
    - Add validation to prevent overselling through cart operations
    - Create stock checking utilities for cart management
    - _Requirements: 4.2, 4.4, 4.5_

- [ ] 8. Implement comprehensive access control
  - [ ] 8.1 Review and enhance user data access
    - Ensure addresses collection access control is properly configured
    - Verify orders collection access control for user isolation
    - Review cart collection access control
    - _Requirements: 7.1, 7.2_
  
  - [ ] 8.2 Create administrative access policies
    - Implement admin-only access for inventory collection
    - Create admin access for inventory_movements collection
    - Add role validation for administrative operations
    - _Requirements: 7.3, 7.4, 6.3_

- [ ] 9. Create utility functions and endpoints
  - [ ] 9.1 Implement core business logic functions
    - Create stock availability checking utilities
    - Implement order processing utilities
    - Add prescription validation utilities
    - _Requirements: 4.5, 5.1, 8.1_
  
  - [ ] 9.2 Create custom endpoints if needed
    - Add inventory reporting endpoints
    - Create stock level monitoring endpoints
    - Implement prescription verification endpoints
    - _Requirements: 8.4, 8.5_

- [ ] 10. Add performance optimizations
  - [ ] 10.1 Optimize database queries
    - Add database indexes for inventory lookups
    - Optimize product-inventory relationship queries
    - Add indexes for audit trail queries
    - _Requirements: 8.3_
  
  - [ ] 10.2 Implement caching strategies
    - Add caching for stock availability calculations
    - Implement caching for frequently accessed product data
    - _Requirements: 8.3_

- [ ] 11. Create utility collections and functions
  - [ ] 11.1 Implement stock management utilities
    - Create low stock products query utilities
    - Implement expiring products identification
    - Add inventory valuation functions
    - _Requirements: 3.2, 3.3_
  
  - [ ] 11.2 Create reporting utilities
    - Implement sales reporting functions
    - Create inventory status reporting
    - Add prescription tracking reports
    - _Requirements: 6.5_

- [ ] 12. Final integration and testing
  - [ ] 12.1 Create test data and seed functions
    - Set up sample pharmaceutical categories and products
    - Create test inventory with various batch numbers and expiry dates
    - Add sample addresses and orders for testing
    - _Requirements: All_
  
  - [ ] 12.2 Implement data integrity measures
    - Add proper validation across all enhanced collections
    - Implement transaction safety for complex operations
    - Create data consistency checks
    - _Requirements: 8.1, 8.2_

- [ ] 13. Final checkpoint - Complete system validation
  - Ensure all Payload collections work correctly with enhancements
  - Verify pharmacy-specific functionality operates as expected
  - Test integration with existing e-commerce features
  - Ask the user if questions arise during validation

## Notes

- Enhancement approach builds upon existing Payload E-commerce plugin
- Each task references specific requirements for traceability
- Incremental development with checkpoints for validation
- Leverages Payload's collection system, hooks, and access control
- Maintains compatibility with existing e-commerce functionality
- Essential audit logging for pharmaceutical compliance
- Performance optimizations through database indexing and caching
- ACID compliance maintained through Payload's transaction handling
- Proper error handling and validation through Payload's systems
- Foundation for future pharmaceutical feature enhancements

## MVP Core Features Delivered

✅ **Enhanced Address Management** - Extended addresses collection with default handling and delivery instructions
✅ **Pharmacy Product Structure** - Products collection enhanced with pharmaceutical-specific fields
✅ **Comprehensive Inventory Tracking** - New inventory collection with batch numbers, expiry dates, and stock alerts
✅ **Prescription Order Handling** - Orders collection enhanced with prescription verification workflow
✅ **Stock Validation** - Cart collection enhanced with real-time stock checking
✅ **Audit Trail** - New inventory_movements collection for compliance tracking
✅ **Access Control** - Leverages Payload's built-in access control system
✅ **Performance Optimization** - Database indexing and query optimization
✅ **Data Integrity** - Payload's validation system with custom business rules
✅ **E-commerce Integration** - Seamless integration with existing Payload E-commerce features