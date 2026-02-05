import { adminOnly } from '@/access/adminOnly'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import { Field } from 'payload'

const replaceFields = (fields: Field[]): Field[] => {
    return fields.map((field) => {
        if ('name' in field && field.name === 'total') {
            return {
                name: 'total',
                type: 'number',
                dbName: 'amount',
            }
        }
        if ('name' in field && field.name === 'paymentMethod') {
            return {
                name: 'paymentMethod',
                type: 'text',
                dbName: 'payment_method',
            }
        }
        if ('name' in field && field.name === 'status') {
            return {
                name: 'status',
                type: 'select',
                options: [
                    { label: 'Pending', value: 'pending' },
                    { label: 'Succeeded', value: 'succeeded' },
                    { label: 'Failed', value: 'failed' },
                ],
                dbName: 'status',
            }
        }

        if ('fields' in field && !('name' in field)) {
            return {
                ...field,
                fields: replaceFields(field.fields),
            }
        }

        if (field.type === 'tabs') {
            return {
                ...field,
                tabs: field.tabs.map((tab) => ({
                    ...tab,
                    fields: replaceFields(tab.fields),
                })),
            }
        }

        return field
    })
}

export const TransactionsCollection: CollectionOverride = ({ defaultCollection }) => ({
    ...defaultCollection,
    dbName: 'payments', // Strict mapping to 'payments' table as per schema
    admin: {
        ...defaultCollection.admin,
        useAsTitle: 'id',
    },
    access: {
        read: adminOnly,
        create: adminOnly,
        update: adminOnly,
        delete: adminOnly,
    },
    fields: [
        ...replaceFields(defaultCollection.fields),
        // Flattened Midtrans fields for strict schema compliance
        {
            name: 'midtrans_order_id',
            type: 'text',
            admin: { readOnly: true },
        },
        {
            name: 'midtrans_transaction_id',
            type: 'text',
            admin: { readOnly: true },
        },
        {
            name: 'midtrans_payment_type',
            type: 'text',
            admin: { readOnly: true },
        },
        {
            name: 'midtrans_response',
            type: 'json',
            admin: { readOnly: true },
        },
    ],
})
