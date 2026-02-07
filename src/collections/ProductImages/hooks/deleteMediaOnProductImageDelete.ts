import type { CollectionAfterDeleteHook } from 'payload'

/**
 * Best practice: When ProductImage is deleted, delete the associated Media document.
 * This triggers @payloadcms/storage-s3 handleDelete → removes file from S3/Supabase Storage.
 * Prevents orphaned files in storage.
 */
export const deleteMediaOnProductImageDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    const mediaId = doc.media && (typeof doc.media === 'object' ? doc.media.id : doc.media)
    if (mediaId && req.payload) {
        try {
            await req.payload.delete({
                collection: 'media',
                id: mediaId,
                req,
            })
        } catch (err) {
            req.payload.logger.warn(
                `[ProductImages] Failed to delete orphaned media ${mediaId} after ProductImage delete: ${err}`,
            )
        }
    }
}
