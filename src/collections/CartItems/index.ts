import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrUserId } from '@/access/adminOrUserId'
import type { CollectionConfig } from 'payload'

export const CartItems: CollectionConfig = {
    slug: 'cart-items',
    dbName: 'cart_items', // Strict mapping to Supabase 'cart_items' table
    admin: {
        useAsTitle: 'product_id',
        defaultColumns: ['product_id', 'quantity', 'user_id'],
    },
    access: {
        create: adminOrUserId,
        read: adminOrUserId,
        update: adminOrUserId,
        delete: adminOrUserId,
    },
    fields: [
        {
            name: 'user_id',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            access: {
                update: adminOnlyFieldAccess, // Users shouldn't change the owner of an item
            },
            admin: {
                description: 'User who owns this cart item',
            },
        },
        {
            name: 'product_id',
            type: 'relationship',
            relationTo: 'products',
            required: true,
        },
        {
            name: 'quantity',
            type: 'number',
            required: true,
            min: 1,
            admin: {
                description: 'Quantity of the product',
            },
        },
        // created_at / updated_at handled by proper Payload config (timestamps: true is default)
    ],
}
