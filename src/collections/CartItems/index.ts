import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrUserId } from '@/access/adminOrUserId'
import type { CollectionConfig } from 'payload'

export const CartItems: CollectionConfig = {
    slug: 'cart-items',
    dbName: 'cart_items', // Strict mapping to Supabase 'cart_items' table
    admin: {
        useAsTitle: 'product',
        defaultColumns: ['product', 'quantity', 'user'],
    },
    access: {
        create: adminOrUserId,
        read: adminOrUserId,
        update: adminOrUserId,
        delete: adminOrUserId,
    },
    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            // @ts-expect-error dbName is valid for postgres adapter
            dbName: 'user_id',
            access: {
                update: adminOnlyFieldAccess, // Users shouldn't change the owner of an item
            },
            admin: {
                description: 'User who owns this cart item',
            },
        },
        {
            name: 'product',
            type: 'relationship',
            relationTo: 'products',
            // @ts-expect-error dbName is valid for postgres adapter
            dbName: 'product_id',
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
