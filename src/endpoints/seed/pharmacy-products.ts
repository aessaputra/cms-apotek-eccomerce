import type { Category } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type ProductArgs = {
    category: Category
}

const descriptionText = (text: string) => ({
    root: {
        children: [
            {
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text,
                        type: 'text',
                        version: 1,
                    },
                ],
                direction: 'ltr' as const,
                format: '' as const,
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
            },
        ],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        type: 'root',
        version: 1,
    },
})

export const productParacetamol = ({ category }: ProductArgs): RequiredDataFromCollectionSlug<'products'> => ({
    title: 'Paracetamol 500mg',
    slug: 'paracetamol-500mg',
    description: descriptionText('Effective relief for mild (minimal) to moderate pain and fever reduction.'),
    categories: [category],
    generic_name: 'Paracetamol',
    manufacturer: 'Generic Pharma',
    dosage_form: 'tablet',
    strength: '500mg',
    requires_prescription: false,
    priceInUSDEnabled: true,
    priceInUSD: 5,
    meta: {
        title: 'Paracetamol 500mg',
        description: 'Pain relief and fever reducer',
    },
    _status: 'published',
})

export const productAmoxicillin = ({ category }: ProductArgs): RequiredDataFromCollectionSlug<'products'> => ({
    title: 'Amoxicillin 500mg',
    slug: 'amoxicillin-500mg',
    description: descriptionText('Antibiotic used to treat a number of bacterial infections.'),
    categories: [category],
    generic_name: 'Amoxicillin',
    manufacturer: 'BioTech Labs',
    dosage_form: 'capsule',
    strength: '500mg',
    requires_prescription: true,
    priceInUSDEnabled: true,
    priceInUSD: 15,
    meta: {
        title: 'Amoxicillin 500mg',
        description: 'Prescription antibiotic',
    },
    _status: 'published',
})

export const productVitaminC = ({ category }: ProductArgs): RequiredDataFromCollectionSlug<'products'> => ({
    title: 'Vitamin C 1000mg',
    slug: 'vitamin-c-1000mg',
    description: descriptionText('Daily immune system support supplement.'),
    categories: [category],
    generic_name: 'Ascorbic Acid',
    manufacturer: 'HealthLife',
    dosage_form: 'tablet',
    strength: '1000mg',
    requires_prescription: false,
    priceInUSDEnabled: true,
    priceInUSD: 12,
    meta: {
        title: 'Vitamin C 1000mg',
        description: 'Immune support supplement',
    },
    _status: 'published',
})

export const productCoughSyrup = ({ category }: ProductArgs): RequiredDataFromCollectionSlug<'products'> => ({
    title: 'Cough Syrup',
    slug: 'cough-syrup',
    description: descriptionText('Relief for dry and chesty coughs.'),
    categories: [category],
    generic_name: 'Dextromethorphan',
    manufacturer: 'CoughLess',
    dosage_form: 'syrup',
    strength: '10mg/5ml',
    requires_prescription: false,
    priceInUSDEnabled: true,
    priceInUSD: 8,
    meta: {
        title: 'Cough Syrup',
        description: 'Cough relief syrup',
    },
    _status: 'published',
})

export const productIbuprofen = ({ category }: ProductArgs): RequiredDataFromCollectionSlug<'products'> => ({
    title: 'Ibuprofen 400mg',
    slug: 'ibuprofen-400mg',
    description: descriptionText('Non-steroidal anti-inflammatory drug (NSAID) for pain and inflammation.'),
    categories: [category],
    generic_name: 'Ibuprofen',
    manufacturer: 'PainAway',
    dosage_form: 'tablet',
    strength: '400mg',
    requires_prescription: false,
    priceInUSDEnabled: true,
    priceInUSD: 7,
    meta: {
        title: 'Ibuprofen 400mg',
        description: 'Anti-inflammatory pain relief',
    },
    _status: 'published',
})
