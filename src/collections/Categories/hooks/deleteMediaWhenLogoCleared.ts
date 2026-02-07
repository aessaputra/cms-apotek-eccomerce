import type { CollectionAfterChangeHook } from 'payload'

/**
 * Best practice: When category logo is cleared or replaced, delete the old Media document.
 * This triggers @payloadcms/storage-s3 handleDelete → removes file from S3/Supabase Storage.
 * Prevents orphaned files in storage.
 */
export const deleteMediaWhenLogoCleared: CollectionAfterChangeHook = async ({
    doc,
    previousDoc,
    req,
}) => {
    const hadLogo = previousDoc?.logo
    if (!hadLogo || !req.payload) return

    const oldLogoId = typeof hadLogo === 'object' ? hadLogo?.id : hadLogo
    if (!oldLogoId) return

    const hasLogo = doc?.logo
    const newLogoId = typeof hasLogo === 'object' ? hasLogo?.id : hasLogo
    if (hasLogo && String(oldLogoId) === String(newLogoId)) return // Same logo, no change

    try {
        await req.payload.delete({
            collection: 'media',
            id: oldLogoId,
            req,
        })
    } catch (err) {
        req.payload.logger.warn(
            `[Categories] Failed to delete orphaned media ${oldLogoId} after logo clear/replace: ${err}`,
        )
    }
}
