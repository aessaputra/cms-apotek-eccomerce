import { RequiredDataFromCollectionSlug } from 'payload'

// Pain Relief Category
export const painReliefCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'Pain Relief',
  slug: 'pain-relief',
  description: 'Over-the-counter and prescription medications for pain management including headaches, muscle pain, and inflammation.',
  controlled_substance: false,
  prescription_required: false,
  age_restriction: 12, // Minimum age 12 for most pain relievers
  is_active: true,
  sort_order: 1,
}

// Antibiotics Category
export const antibioticsCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'Antibiotics',
  slug: 'antibiotics',
  description: 'Prescription antibiotics for treating bacterial infections. All products require valid prescription.',
  controlled_substance: false,
  prescription_required: true,
  is_active: true,
  sort_order: 2,
}

// Vitamins & Supplements Category
export const vitaminsCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'Vitamins & Supplements',
  slug: 'vitamins-supplements',
  description: 'Essential vitamins, minerals, and dietary supplements to support overall health and wellness.',
  controlled_substance: false,
  prescription_required: false,
  is_active: true,
  sort_order: 3,
}

// Cold & Flu Category
export const coldFluCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'Cold & Flu',
  slug: 'cold-flu',
  description: 'Medications and remedies for cold and flu symptoms including cough, congestion, and fever.',
  controlled_substance: false,
  prescription_required: false,
  age_restriction: 6, // Some products suitable for children 6+
  is_active: true,
  sort_order: 4,
}

// First Aid Category
export const firstAidCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'First Aid',
  slug: 'first-aid',
  description: 'Essential first aid supplies including bandages, antiseptics, and wound care products.',
  controlled_substance: false,
  prescription_required: false,
  is_active: true,
  sort_order: 5,
}

// Controlled Substances Category (for testing controlled substance handling)
export const controlledSubstancesCategoryData: RequiredDataFromCollectionSlug<'categories'> = {
  title: 'Controlled Substances',
  slug: 'controlled-substances',
  description: 'Controlled medications requiring special handling and prescription verification.',
  controlled_substance: true,
  prescription_required: true,
  age_restriction: 18, // Adult only
  is_active: true,
  sort_order: 10, // Lower priority in display
}