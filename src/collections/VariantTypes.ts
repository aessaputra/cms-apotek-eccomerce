import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'

/**
 * Variant Types override for Apotek E-commerce
 * Supabase variant_types table uses integer id; Payload defaults to UUID.
 * customIDType: 'number' aligns with Supabase schema.
 *
 * Use cases: Sachet, Box, Strip (pack sizes), 500mg/1g (strength)
 */
export const VariantTypesCollectionOverride: CollectionOverride = ({ defaultCollection }) => ({
    ...defaultCollection,
    slug: 'variantTypes',
    dbName: 'variant_types',
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
        description: 'Define variant types (e.g. Pack Size, Strength) for products with variants',
    },
    labels: {
        plural: 'Variant Types',
        singular: 'Variant Type',
    },
})
