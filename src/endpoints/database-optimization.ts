/**
 * Database Optimization Endpoint
 * 
 * Provides API endpoints for database performance optimization and monitoring
 * 
 * Available endpoints:
 * - POST /api/database-optimization/optimize - Run database optimizations
 * - GET /api/database-optimization/performance - Get performance metrics
 * - POST /api/database-optimization/vacuum - Run vacuum and analyze
 * - GET /api/database-optimization/indexes - Analyze index usage
 */

import {
  analyzePerformance,
  optimizeDatabase as optimizeDatabaseIndexes,
  vacuumAnalyze as vacuumAndAnalyze,
} from '@/utilities/databaseOptimization'
import {
  enableQueryStatistics,
  generatePerformanceReport,
  getPerformanceMetrics,
} from '@/utilities/performanceMonitoring'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * Optimize database indexes
 * POST /api/database-optimization/optimize
 */
export const optimizeDatabase: Endpoint = {
  path: '/database-optimization/optimize',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      req.payload.logger.info('Starting database optimization...')

      const result = await optimizeDatabaseIndexes(req.payload)

      return Response.json({
        success: result.success,
        message: result.success
          ? 'Database optimization completed successfully'
          : 'Database optimization completed with some errors',
        results: result.results,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Database optimization failed: ${errorMessage}`)

      throw new APIError(`Database optimization failed: ${errorMessage}`, 500)
    }
  },
}

/**
 * Get performance metrics and report
 * GET /api/database-optimization/performance
 */
export const getPerformanceReport: Endpoint = {
  path: '/database-optimization/performance',
  method: 'get',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const report = await generatePerformanceReport(req.payload)

      return Response.json({
        success: true,
        ...report,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to generate performance report: ${errorMessage}`)

      throw new APIError(`Failed to generate performance report: ${errorMessage}`, 500)
    }
  },
}

/**
 * Run vacuum and analyze on database
 * POST /api/database-optimization/vacuum
 */
export const vacuumDatabase: Endpoint = {
  path: '/database-optimization/vacuum',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const result = await vacuumAndAnalyze(req.payload)

      return Response.json({
        success: result.success,
        message: result.message,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Database vacuum failed: ${errorMessage}`)

      throw new APIError(`Database vacuum failed: ${errorMessage}`, 500)
    }
  },
}

/**
 * Analyze index usage and get recommendations
 * GET /api/database-optimization/indexes
 */
export const analyzeIndexes: Endpoint = {
  path: '/database-optimization/indexes',
  method: 'get',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const [indexAnalysis] = await Promise.all([
        analyzePerformance(req.payload),
      ])

      return Response.json({
        success: true,
        analysis: indexAnalysis,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Index analysis failed: ${errorMessage}`)

      throw new APIError(`Index analysis failed: ${errorMessage}`, 500)
    }
  },
}

/**
 * Enable query statistics extension
 * POST /api/database-optimization/enable-stats
 */
export const enableStats: Endpoint = {
  path: '/database-optimization/enable-stats',
  method: 'post',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const result = await enableQueryStatistics(req.payload)

      return Response.json({
        success: result.success,
        message: result.message,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to enable query statistics: ${errorMessage}`)

      throw new APIError(`Failed to enable query statistics: ${errorMessage}`, 500)
    }
  },
}

/**
 * Get basic performance metrics (lightweight)
 * GET /api/database-optimization/metrics
 */
export const getMetrics: Endpoint = {
  path: '/database-optimization/metrics',
  method: 'get',
  handler: async (req) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new APIError('Unauthorized - Admin access required', 401)
    }

    try {
      const metrics = await getPerformanceMetrics(req.payload)

      return Response.json({
        success: true,
        metrics,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Failed to get performance metrics: ${errorMessage}`)

      throw new APIError(`Failed to get performance metrics: ${errorMessage}`, 500)
    }
  },
}