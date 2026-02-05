/**
 * Caching Utility
 * 
 * Provides in-memory caching for frequently accessed data to improve performance:
 * - Stock availability calculations
 * - Product data caching
 * - Category data caching
 * - User session caching
 * - Query result caching
 * 
 * Features:
 * - TTL (Time To Live) support
 * - Cache invalidation
 * - Memory usage monitoring
 * - Cache statistics
 * - Automatic cleanup
 */

import type { StockAvailabilityResult } from './stockAvailability'


/**
 * Cache entry interface
 */
interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  totalEntries: number
  totalHits: number
  totalMisses: number
  hitRate: number
  memoryUsage: number
  oldestEntry: number
  newestEntry: number
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxEntries: number
  defaultTTL: number
  cleanupInterval: number
  enableStats: boolean
}

/**
 * In-memory cache implementation with TTL support
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private stats = {
    hits: 0,
    misses: 0,
  }
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enableStats: true,
      ...config,
    }

    // Start cleanup timer
    this.startCleanup()
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Update hit count and stats
    entry.hits++
    if (this.config.enableStats) {
      this.stats.hits++
    }

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Check if key exists in cache (and is not expired)
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const now = Date.now()

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0,
      memoryUsage: this.getMemoryUsage(),
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => now - e.timestamp))
        : 0,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => now - e.timestamp))
        : 0,
    }
  }

  /**
   * Get or set pattern - retrieve from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttl)
    return value
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.debug(`Cache cleanup: removed ${cleaned} expired entries`)
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private getMemoryUsage(): number {
    let size = 0

    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // String characters are 2 bytes
      size += JSON.stringify(entry.data).length * 2
      size += 32 // Overhead for entry object
    }

    return size
  }
}

/**
 * Global cache instances
 */
const stockCache = new MemoryCache({
  maxEntries: 500,
  defaultTTL: 2 * 60 * 1000, // 2 minutes for stock data
  cleanupInterval: 30 * 1000, // 30 seconds cleanup
})

const productCache = new MemoryCache({
  maxEntries: 1000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for product data
  cleanupInterval: 60 * 1000, // 1 minute cleanup
})

const categoryCache = new MemoryCache({
  maxEntries: 100,
  defaultTTL: 30 * 60 * 1000, // 30 minutes for categories
  cleanupInterval: 5 * 60 * 1000, // 5 minutes cleanup
})

const queryCache = new MemoryCache({
  maxEntries: 200,
  defaultTTL: 5 * 60 * 1000, // 5 minutes for query results
  cleanupInterval: 60 * 1000, // 1 minute cleanup
})

/**
 * Stock availability caching functions
 */
export const stockCaching = {
  /**
   * Get cached stock availability for a product
   */
  getStockAvailability: (cacheKey: string): StockAvailabilityResult | null => {
    return stockCache.get<StockAvailabilityResult>(cacheKey)
  },

  /**
   * Cache stock availability for a product
   */
  setStockAvailability: (cacheKey: string, result: StockAvailabilityResult, ttl?: number): void => {
    stockCache.set(cacheKey, result, ttl)
  },

  /**
   * Get or calculate stock availability with caching
   */
  getOrCalculateStock: async (
    productId: string,
    calculator: () => Promise<number>
  ): Promise<number> => {
    return stockCache.getOrSet(`stock:${productId}`, calculator)
  },

  /**
   * Invalidate stock cache for a product
   */
  invalidateProduct: (productId: string): void => {
    stockCache.delete(`stock:${productId}`)
  },

  /**
   * Invalidate all stock cache
   */
  invalidateAll: (): void => {
    stockCache.clear()
  },

  /**
   * Get stock cache statistics
   */
  getStats: (): CacheStats => {
    return stockCache.getStats()
  },
}

/**
 * Product data caching functions
 */
export const productCaching = {
  /**
   * Get cached product data
   */
  getProduct: (productId: string): unknown | null => {
    return productCache.get(`product:${productId}`)
  },

  /**
   * Cache product data
   */
  setProduct: (productId: string, product: unknown, ttl?: number): void => {
    productCache.set(`product:${productId}`, product, ttl)
  },

  /**
   * Get or fetch product with caching
   */
  getOrFetchProduct: async (
    productId: string,
    fetcher: () => Promise<unknown>
  ): Promise<unknown> => {
    return productCache.getOrSet(`product:${productId}`, fetcher)
  },

  /**
   * Cache product list
   */
  setProductList: (key: string, products: unknown[], ttl?: number): void => {
    productCache.set(`products:${key}`, products, ttl)
  },

  /**
   * Get cached product list
   */
  getProductList: (key: string): unknown[] | null => {
    return productCache.get(`products:${key}`)
  },

  /**
   * Invalidate product cache
   */
  invalidateProduct: (productId: string): void => {
    productCache.delete(`product:${productId}`)
    // Also invalidate any product lists that might contain this product
    productCache.invalidatePattern('products:.*')
  },

  /**
   * Invalidate all product cache
   */
  invalidateAll: (): void => {
    productCache.clear()
  },

  /**
   * Get product cache statistics
   */
  getStats: (): CacheStats => {
    return productCache.getStats()
  },
}

/**
 * Category caching functions
 */
export const categoryCaching = {
  /**
   * Get cached categories
   */
  getCategories: (): unknown[] | null => {
    return categoryCache.get('categories:all')
  },

  /**
   * Cache categories
   */
  setCategories: (categories: unknown[], ttl?: number): void => {
    categoryCache.set('categories:all', categories, ttl)
  },

  /**
   * Get or fetch categories with caching
   */
  getOrFetchCategories: async (
    fetcher: () => Promise<unknown[]>
  ): Promise<unknown[]> => {
    return categoryCache.getOrSet('categories:all', fetcher)
  },

  /**
   * Invalidate category cache
   */
  invalidateAll: (): void => {
    categoryCache.clear()
  },

  /**
   * Get category cache statistics
   */
  getStats: (): CacheStats => {
    return categoryCache.getStats()
  },
}

/**
 * Query result caching functions
 */
export const queryCaching = {
  /**
   * Get cached query result
   */
  getQuery: (queryKey: string): unknown | null => {
    return queryCache.get(queryKey)
  },

  /**
   * Cache query result
   */
  setQuery: (queryKey: string, result: unknown, ttl?: number): void => {
    queryCache.set(queryKey, result, ttl)
  },

  /**
   * Get or execute query with caching
   */
  getOrExecuteQuery: async (
    queryKey: string,
    executor: () => Promise<unknown>
  ): Promise<unknown> => {
    return queryCache.getOrSet(queryKey, executor)
  },

  /**
   * Invalidate queries by pattern
   */
  invalidatePattern: (pattern: string): number => {
    return queryCache.invalidatePattern(pattern)
  },

  /**
   * Invalidate all query cache
   */
  invalidateAll: (): void => {
    queryCache.clear()
  },

  /**
   * Get query cache statistics
   */
  getStats: (): CacheStats => {
    return queryCache.getStats()
  },
}

/**
 * Generate cache key for complex queries
 */
export const generateCacheKey = (prefix: string, params: Record<string, unknown>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|')

  return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`
}

/**
 * Cache middleware for Payload hooks
 */
export function createCacheMiddleware(
  cacheKey: (doc: any) => string,
  ttl?: number
) {
  return {
    afterRead: [
      async ({ doc }: { doc: any }) => {
        if (doc) {
          const key = cacheKey(doc)
          productCache.set(key, doc, ttl)
        }
        return doc
      },
    ],
    afterChange: [
      async ({ doc }: { doc: any }) => {
        if (doc) {
          const key = cacheKey(doc)
          productCache.delete(key)
          // Invalidate related caches
          productCache.invalidatePattern('products:.*')
          stockCache.invalidatePattern(`stock:${doc.id}`)
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }: { doc: any }) => {
        if (doc) {
          const key = cacheKey(doc)
          productCache.delete(key)
          // Invalidate related caches
          productCache.invalidatePattern('products:.*')
          stockCache.invalidatePattern(`stock:${doc.id}`)
        }
        return doc
      },
    ],
  }
}

/**
 * Get comprehensive cache statistics
 */
export function getAllCacheStats(): {
  stock: CacheStats
  product: CacheStats
  category: CacheStats
  query: CacheStats
  total: {
    entries: number
    hits: number
    misses: number
    hitRate: number
    memoryUsage: number
  }
} {
  const stockStats = stockCaching.getStats()
  const productStats = productCaching.getStats()
  const categoryStats = categoryCaching.getStats()
  const queryStats = queryCaching.getStats()

  const totalHits = stockStats.totalHits + productStats.totalHits + categoryStats.totalHits + queryStats.totalHits
  const totalMisses = stockStats.totalMisses + productStats.totalMisses + categoryStats.totalMisses + queryStats.totalMisses

  return {
    stock: stockStats,
    product: productStats,
    category: categoryStats,
    query: queryStats,
    total: {
      entries: stockStats.totalEntries + productStats.totalEntries + categoryStats.totalEntries + queryStats.totalEntries,
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0,
      memoryUsage: stockStats.memoryUsage + productStats.memoryUsage + categoryStats.memoryUsage + queryStats.memoryUsage,
    },
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  stockCache.clear()
  productCache.clear()
  categoryCache.clear()
  queryCache.clear()
}

/**
 * Shutdown all caches (stop cleanup timers)
 */
export function shutdownCaches(): void {
  stockCache.stopCleanup()
  productCache.stopCleanup()
  categoryCache.stopCleanup()
  queryCache.stopCleanup()
}