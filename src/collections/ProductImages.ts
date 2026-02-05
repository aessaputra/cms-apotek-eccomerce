import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import type { CollectionConfig } from 'payload'

export const ProductImages: CollectionConfig = {
    slug: 'product-images',
    dbName: 'product_images',
    admin: {
        useAsTitle: 'image_url',
        group: 'Content',
        defaultColumns: ['image_url', 'product', 'is_primary', 'sort_order'],
    },
    access: {
        create: adminOrCustomerOwner,
        read: adminOrPublishedStatus,
        update: adminOrCustomerOwner,
        delete: adminOrCustomerOwner,
    },
    fields: [
        {
            name: 'product',
            type: 'relationship',
            relationTo: 'products',
            required: true,
            admin: {
                description: 'The product this image belongs to',
            },
        },
        {
            name: 'image_url',
            type: 'text',
            required: true,
            label: 'Image URL',
            admin: {
                description: 'Full URL of the product image',
            },
        },
        {
            name: 'is_primary',
            type: 'checkbox',
            defaultValue: false,
            label: 'Is Primary Image',
            admin: {
                description: 'Set as the main image for the product listing',
            },
        },
        {
            name: 'sort_order',
            type: 'number',
            defaultValue: 0,
            label: 'Sort Order',
            admin: {
                description: 'Order of display (lower numbers first)',
            },
        },
    ],
    timestamps: true,
}
