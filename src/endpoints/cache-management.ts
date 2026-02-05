/**
 * Cache Management Endpoint
 * 
 * Provides API endpoints for cache management and monitoring
 * 
 * Available endpoints:
 * - GET /api/cache-management/stats - Get cache statistics
 * - POST /api/cache-management/clear - Clear all caches
 * - POST /api/cache-management/clear/:type - Clear specific cache type
 * - POST /api/cache-management/invalidate/:productId - Invalidate product caches
 */

import {
    categoryCaching,
    clearAllCaches,
    getAllCacheStats,
    productCaching,
    queryCaching,
    stockCaching,
} from '@/utilities/caching'
import { invalidateAllStockCaches, invalidateStockCache } from '@/utilities/stockAvailability'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * Get cache statistics
 * GET /api/cache-management/stats
 */
export const getCacheStats: Endpoint = {
  path: '/cache-management/stats',
  method: 'get',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const stats = getAllCacheStats()
      
      return Response.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to get cache stats: ${errorMessage}`)
      
      throw new APIError(`Failed to get cache stats: ${errorMessage}`, 500)
    }
  },
}

/**
 * Clear all caches
 * POST /api/cache-management/clear
 */
export const clearAllCache: Endpoint = {
  path: '/cache-management/clear',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      clearAllCaches()
      
      req.payload.logger.info('All caches cleared by admin user')
      
      return Response.json({
        success: true,
        message: 'All caches cleared successfully',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to clear all caches: ${errorMessage}`)
      
      throw new APIError(`Failed to clear all caches: ${errorMessage}`, 500)
    }
  },
}

/**
 * Clear specific cache type
 * POST /api/cache-management/clear/:type
 */
export const clearSpecificCache: Endpoint = {
  path: '/cache-management/clear/:type',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    const { type } = req.routeParams as { type?: string }

    if (!type) {
      throw new APIError('Cache type is required', 400)
    }

    try {
      let message = ''
      
      switch (type.toLowerCase()) {
        case 'stock':
          stockCaching.invalidateAll()
          invalidateAllStockCaches()
          message = 'Stock cache cleared successfully'
          break
        case 'product':
          productCaching.invalidateAll()
          message = 'Product cache cleared successfully'
          break
        case 'category':
          categoryCaching.invalidateAll()
          message = 'Category cache cleared successfully'
          break
        case 'query':
          queryCaching.invalidateAll()
          message = 'Query cache cleared successfully'
          break
        default:
          throw new APIError(`Invalid cache type: ${type}. Valid types: stock, product, category, query`, 400)
      }
      
      req.payload.logger.info(`${message} by admin user`)
      
      return Response.json({
        success: true,
        message,
        type,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to clear ${type} cache: ${errorMessage}`)
      
      throw new APIError(`Failed to clear ${type} cache: ${errorMessage}`, 500)
    }
  },
}

/**
 * Invalidate caches for a specific product
 * POST /api/cache-management/invalidate/:productId
 */
export const invalidateProductCache: Endpoint = {
  path: '/cache-management/invalidate/:productId',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    const { productId } = req.routeParams as { productId?: string }

    if (!productId) {
      throw new APIError('Product ID is required', 400)
    }

    try {
      // Invalidate stock cache for the product
      invalidateStockCache(productId)
      
      // Invalidate product cache
      productCaching.invalidateProduct(productId)
      
      req.payload.logger.info(`Caches invalidated for product ${productId} by admin user`)
      
      return Response.json({
        success: true,
        message: `Caches invalidated for product ${productId}`,
        productId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to invalidate cache for product ${productId}: ${errorMessage}`)
      
      throw new APIError(`Failed to invalidate cache for product ${productId}: ${errorMessage}`, 500)
    }
  },
}

/**
 * Warm up caches by pre-loading frequently accessed data
 * POST /api/cache-management/warmup
 */
export const warmupCaches: Endpoint = {
  path: '/cache-management/warmup',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      req.payload.logger.info('Starting cache warmup...')
      
      let warmedItems = 0
      
      // Warm up categories
      const categories = await req.payload.find({
        collection: 'categories',
        limit: 100,
      })
      
      categoryCaching.setCategories(categories.docs, 30 * 60 * 1000) // 30 minutes
      warmedItems += categories.docs.length
      
      // Warm up popular products (first 50)
      const products = await req.payload.find({
        collection: 'products',
        limit: 50,
        sort: '-createdAt',
      })
      
      for (const product of products.docs) {
        productCaching.setProduct(`product:${product.id}`, product, 10 * 60 * 1000) // 10 minutes
        warmedItems++
      }
      
      req.payload.logger.info(`Cache warmup completed: ${warmedItems} items cached`)
      
      return Response.json({
        success: true,
        message: `Cache warmup completed: ${warmedItems} items cached`,
        warmedItems,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Cache warmup failed: ${errorMessage}`)
      
      throw new APIError(`Cache warmup failed: ${errorMessage}`, 500)
    }
  },
}

/**
 * Get cache health and recommendations
 * GET /api/cache-management/health
 */
export const getCacheHealth: Endpoint = {
  path: '/cache-management/health',
  method: 'get',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || !req.user.roles?.includes('admin')) {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const stats = getAllCacheStats()
      const recommendations: string[] = []
      
      // Analyze cache performance and provide recommendations
      if (stats.total.hitRate < 50) {
        recommendations.push('Cache hit rate is low (<50%). Consider increasing cache TTL or warming up caches.')
      }
      
      if (stats.total.memoryUsage > 50 * 1024 * 1024) { // 50MB
        recommendations.push('Cache memory usage is high (>50MB). Consider reducing cache size or TTL.')
      }
      
      if (stats.stock.totalEntries === 0) {
        recommendations.push('Stock cache is empty. Consider warming up stock data for better performance.')
      }
      
      if (stats.product.totalEntries === 0) {
        recommendations.push('Product cache is empty. Consider warming up product data for better performance.')
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Cache performance looks good! No immediate optimizations needed.')
      }
      
      const health = {
        status: stats.total.hitRate > 70 ? 'healthy' : stats.total.hitRate > 50 ? 'warning' : 'critical',
        hitRate: stats.total.hitRate,
        memoryUsage: stats.total.memoryUsage,
        totalEntries: stats.total.entries,
        recommendations,
      }
      
      return Response.json({
        success: true,
        health,
        stats,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to get cache health: ${errorMessage}`)
      
      throw new APIError(`Failed to get cache health: ${errorMessage}`, 500)
    }
  },
}