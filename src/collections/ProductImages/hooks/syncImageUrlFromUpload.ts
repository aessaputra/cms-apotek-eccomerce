import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Syncs image_url from upload (media) when media is set.
 * Keeps React Native app backward compatible - it reads image_url.
 * @see https://payloadcms.com/docs/fields/upload
 */
export const syncImageUrlFromUpload: CollectionBeforeChangeHook = async ({ data, req }) => {
    const mediaId = typeof data?.media === 'object' ? data.media?.id : data?.media
    if (mediaId && req.payload) {
        const media = await req.payload.findByID({
            collection: 'media',
            id: mediaId,
            depth: 0,
            req,
        })
        if (media?.url) data.image_url = media.url
    }
    return data
}
