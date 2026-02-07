import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'
import type { CollectionConfig } from 'payload'

import { syncImageUrlFromUpload } from './ProductImages/hooks/syncImageUrlFromUpload'

export const ProductImages: CollectionConfig = {
    slug: 'product-images',
    dbName: 'product_images',
    lockDocuments: false,
    admin: {
        useAsTitle: 'image_url',
        group: 'Content',
        defaultColumns: ['image_url', 'product', 'is_primary', 'sort_order'],
        hidden: true, // Manage via Products > Images tab (Join field)
    },
    access: {
        create: adminOnly,
        read: publicAccess,
        update: adminOnly,
        delete: adminOnly,
    },
    fields: [
        {
            name: 'product',
            type: 'relationship',
            relationTo: 'products',
            required: true,
            // @ts-expect-error dbName is valid for postgres adapter
            dbName: 'product_id',
            admin: {
                description: 'The product this image belongs to',
            },
        },
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            required: false,
            admin: {
                description: 'Upload image directly here — no need to go to Media menu',
            },
            // Custom validate: Media uses integer id; default validation fails when client sends string or object
            validate: (val, { t }) => {
                if (val == null || val === '') return true
                const id = typeof val === 'object' && val && 'id' in val
                    ? (val as { id: unknown }).id
                    : val
                const num = typeof id === 'string' ? parseInt(id, 10) : Number(id)
                if (Number.isNaN(num) || num < 1) return t('validation:invalidInput')
                return true
            },
        },
        {
            name: 'image_url',
            type: 'text',
            required: false,
            label: 'Image URL',
            admin: {
                description: 'Auto-synced from upload, or paste URL manually',
            },
            validate: (value, { siblingData }) => {
                if (value) return true
                if (siblingData?.media) return true
                return 'Upload an image or enter Image URL'
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
        {
            name: 'created_at',
            type: 'date',
            admin: {
                readOnly: true,
                date: {
                    pickerAppearance: 'dayAndTime',
                },
            },
            defaultValue: () => new Date(),
        },
    ],
    hooks: {
        beforeValidate: [
            ({ data }) => {
                // Normalize media ID: Media uses customIDType 'number', client may send string or object
                const raw = data?.media
                if (raw == null) return data
                let id: number | null = null
                if (typeof raw === 'object' && raw !== null && 'id' in raw) {
                    const rid = (raw as { id: unknown }).id
                    id = typeof rid === 'string' ? parseInt(rid, 10) : Number(rid)
                } else if (typeof raw === 'string' || typeof raw === 'number') {
                    id = typeof raw === 'string' ? parseInt(raw, 10) : raw
                }
                if (id != null && !Number.isNaN(id)) data!.media = id as unknown as typeof data.media
                return data
            },
        ],
        beforeChange: [syncImageUrlFromUpload],
    },
    timestamps: false,
}
