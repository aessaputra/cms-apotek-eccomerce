import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'

/**
 * Variant Options override for Apotek E-commerce
 * Supabase variant_options table uses integer id; Payload defaults to UUID.
 * customIDType: 'number' aligns with Supabase schema.
 *
 * Use cases: Sachet, Box (for Pack Size), 500mg, 1g (for Strength)
 */
export const VariantOptionsCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
    ...defaultCollection,
    slug: 'variantOptions',
    dbName: 'variant_options',
    customIDType: 'number',
    lockDocuments: false,
    access: {
        create: adminOnly,
        delete: adminOnly,
        read: publicAccess,
        update: adminOnly,
    },
    admin: {
        ...defaultCollection?.admin,
        group: 'Catalog',
        useAsTitle: 'label',
        description: 'Options for variant types (e.g. Sachet, Box, 500mg)',
    },
    labels: {
        plural: 'Variant Options',
        singular: 'Variant Option',
    },
})
