import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'

import { deleteMediaWhenLogoCleared } from './Categories/hooks/deleteMediaWhenLogoCleared'

/**
 * Categories collection - Strict schema match with Supabase 'categories' table
 * DB columns: id, name, slug, logo_url, created_at, updated_at
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  dbName: 'categories',
  lockDocuments: false,
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: publicAccess,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Catalog',
    defaultColumns: ['name', 'slug', 'logo'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Category name (e.g., "Pain Relief", "Antibiotics", "Vitamins")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: false,
      // @ts-expect-error dbName is valid for postgres adapter
      dbName: 'logo_id',
      admin: {
        description: 'Upload logo kategori. Ganti: klik pilih file baru. Hapus: klik X pada preview. Kelola di sini — tidak perlu pindah menu.',
      },
      // Custom validate: Media uses integer id (customIDType 'number'), default validation
      // fails when client sends string "5" or object {id:5}. Accept both.
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
      name: 'logo_url',
      type: 'text',
      label: 'Logo URL (fallback)',
      admin: {
        description: 'Legacy: paste URL if not using upload. Auto-synced when logo is uploaded.',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Normalize logo ID: client may send string "2" or object {id:2}, but Media uses customIDType 'number'
        const raw = data?.logo
        if (raw == null) return data
        let id: number | null = null
        if (typeof raw === 'object' && raw !== null && 'id' in raw) {
          id = typeof (raw as { id: unknown }).id === 'string'
            ? parseInt((raw as { id: string }).id, 10)
            : Number((raw as { id: number }).id)
        } else if (typeof raw === 'string' || typeof raw === 'number') {
          id = typeof raw === 'string' ? parseInt(raw, 10) : raw
        }
        if (id != null && !Number.isNaN(id)) data!.logo = id as unknown as typeof data.logo
        return data
      },
    ],
    afterChange: [deleteMediaWhenLogoCleared],
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate slug if not provided
        if (operation === 'create' && !data.slug && data.name) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        }
        return data
      },
      async ({ data, req }) => {
        // Sync logo_url from upload for React Native backward compatibility
        const logoId = typeof data?.logo === 'object' ? data.logo?.id : data?.logo
        if (logoId && req.payload) {
          const media = await req.payload.findByID({
            collection: 'media',
            id: logoId,
            depth: 0,
            req,
          })
          if (media?.url) data.logo_url = media.url
        }
        return data
      },
    ],
    afterRead: [
      async ({ doc }) => {
        // Populate logo_url from upload for API consumers
        if (doc.logo && typeof doc.logo === 'object' && doc.logo.url) {
          doc.logo_url = doc.logo.url
        }
        return doc
      },
    ],
  },
}
