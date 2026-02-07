import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

/**
 * Admins collection - Payload Admin Panel login only.
 * Per Payload best practice: separate from Users (customers).
 * Customers use Customer App (Supabase Auth); never login to Admin Panel.
 */
export const Admins: CollectionConfig = {
    slug: 'admins',
    dbName: 'admins',
    lockDocuments: false,
    access: {
        admin: () => true, // Explicit: Admins collection users can access admin panel
        create: adminOnly,
        read: adminOnly,
        update: adminOnly,
        delete: adminOnly,
    },
    admin: {
        group: 'Users',
        defaultColumns: ['full_name', 'email'],
        useAsTitle: 'full_name',
        description: 'Staff accounts for Admin Panel access. Customers use the mobile app.',
    },
    auth: {
        tokenExpiration: 1209600,
        useAPIKey: false,
    },
    fields: [
        {
            name: 'full_name',
            type: 'text',
            label: 'Full Name',
            admin: {
                description: 'Display name for admin staff',
            },
        },
        {
            name: 'phone',
            type: 'text',
            required: false,
            admin: {
                description: 'Contact number for staff',
            },
        },
        {
            name: 'role',
            type: 'select',
            defaultValue: 'admin',
            options: [{ label: 'Admin', value: 'admin' }],
            admin: {
                hidden: true,
                readOnly: true,
                description: 'Always admin for Admins collection',
            },
            saveToJWT: true,
            required: true,
        },
    ],
}
