/**
 * Performance Monitoring Utility
 * 
 * This utility provides functions to monitor database and application performance:
 * - Query performance analysis
 * - Slow query identification
 * - Cache hit ratio monitoring
 * - Connection pool monitoring
 * - Performance recommendations
 */

import type { Payload } from 'payload'

/**
 * Interface for slow query information
 */
interface SlowQuery {
  query: string
  calls: number
  totalTime: number
  avgTime: number
  rows: number
}

/**
 * Interface for performance metrics
 */
interface PerformanceMetrics {
  cacheHitRatio: number
  connectionCount: number
  activeConnections: number
  slowQueries: SlowQuery[]
  tableStats: Array<{
    table: string
    seqScans: number
    seqTupRead: number
    idxScans: number
    idxTupFetch: number
  }>
}

/**
 * Get slow queries from pg_stat_statements
 * Requires pg_stat_statements extension to be enabled
 */
export async function getSlowQueries(
  payload: Payload,
  limit: number = 10
): Promise<SlowQuery[]> {
  try {
    // Temporarily disabled due to Drizzle API compatibility
    payload.logger.warn(`Slow query analysis temporarily disabled (limit: ${limit})`)
    return []
  } catch (error) {
    payload.logger.error('Failed to get slow queries:', String(error))
    return []
  }
}

/**
 * Get cache hit ratio for database performance monitoring
 */
export async function getCacheHitRatio(payload: Payload): Promise<number> {
  try {
    const query = `
      SELECT 
        ROUND(
          (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 
          2
        ) as cache_hit_ratio
      FROM pg_statio_user_tables
      WHERE heap_blks_hit + heap_blks_read > 0
    `
    
    const result = await payload.db.drizzle.execute(query)
    const ratio = result.rows?.[0]?.cache_hit_ratio
    
    return ratio ? parseFloat(String(ratio)) : 0
  } catch (error) {
    payload.logger.error('Failed to get cache hit ratio:', String(error))
    return 0
  }
}

/**
 * Get connection statistics
 */
export async function getConnectionStats(payload: Payload): Promise<{
  total: number
  active: number
  idle: number
  waiting: number
}> {
  try {
    const query = `
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    
    const result = await payload.db.drizzle.execute(query)
    const stats = result.rows?.[0]
    
    return {
      total: parseInt(String(stats?.total || '0')),
      active: parseInt(String(stats?.active || '0')),
      idle: parseInt(String(stats?.idle || '0')),
      waiting: parseInt(String(stats?.waiting || '0')),
    }
  } catch (error) {
    payload.logger.error('Failed to get connection stats:', String(error))
    return { total: 0, active: 0, idle: 0, waiting: 0 }
  }
}

/**
 * Get table access statistics
 */
export async function getTableAccessStats(payload: Payload): Promise<Array<{
  table: string
  seqScans: number
  seqTupRead: number
  idxScans: number
  idxTupFetch: number
  ratio: number
}>> {
  try {
    const query = `
      SELECT 
        schemaname || '.' || relname as table,
        seq_scan as seq_scans,
        seq_tup_read as seq_tup_read,
        idx_scan as idx_scans,
        idx_tup_fetch as idx_tup_fetch,
        CASE 
          WHEN seq_scan + idx_scan = 0 THEN 0
          ELSE ROUND((idx_scan::float / (seq_scan + idx_scan)) * 100, 2)
        END as ratio
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY seq_tup_read DESC
      LIMIT 20
    `
    
    const result = await payload.db.drizzle.execute(query)
    
    return (result.rows || []).map((row: any) => ({
      table: String(row.table),
      seqScans: parseInt(String(row.seq_scans || '0')),
      seqTupRead: parseInt(String(row.seq_tup_read || '0')),
      idxScans: parseInt(String(row.idx_scans || '0')),
      idxTupFetch: parseInt(String(row.idx_tup_fetch || '0')),
      ratio: parseFloat(String(row.ratio || '0')),
    }))
  } catch (error) {
    payload.logger.error('Failed to get table access stats:', String(error))
    return []
  }
}

/**
 * Get comprehensive performance metrics
 */
export async function getPerformanceMetrics(payload: Payload): Promise<PerformanceMetrics> {
  const [slowQueries, cacheHitRatio, connectionStats, tableStats] = await Promise.all([
    getSlowQueries(payload),
    getCacheHitRatio(payload),
    getConnectionStats(payload),
    getTableAccessStats(payload),
  ])
  
  return {
    cacheHitRatio,
    connectionCount: connectionStats.total,
    activeConnections: connectionStats.active,
    slowQueries,
    tableStats,
  }
}

/**
 * Generate performance recommendations based on metrics
 */
export function generatePerformanceRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = []
  
  // Cache hit ratio recommendations
  if (metrics.cacheHitRatio < 95) {
    recommendations.push(
      `Cache hit ratio is ${metrics.cacheHitRatio}%. Consider increasing shared_buffers or work_mem.`
    )
  }
  
  // Connection recommendations
  if (metrics.activeConnections > 50) {
    recommendations.push(
      `High number of active connections (${metrics.activeConnections}). Consider connection pooling.`
    )
  }
  
  // Slow query recommendations
  if (metrics.slowQueries.length > 0) {
    const slowestQuery = metrics.slowQueries[0]
    recommendations.push(
      `Slowest query averages ${slowestQuery.avgTime.toFixed(2)}ms. Consider adding indexes or optimizing the query.`
    )
  }
  
  // Table scan recommendations
  const tablesWithHighSeqScans = metrics.tableStats.filter(
    table => table.seqScans > 1000 && table.ratio < 50
  )
  
  if (tablesWithHighSeqScans.length > 0) {
    recommendations.push(
      `Tables with high sequential scans: ${tablesWithHighSeqScans.map(t => t.table).join(', ')}. Consider adding indexes.`
    )
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Database performance looks good! No immediate optimizations needed.')
  }
  
  return recommendations
}

/**
 * Monitor query performance for a specific operation
 */
export class QueryPerformanceMonitor {
  private startTime: number
  private operation: string
  private payload: Payload
  
  constructor(payload: Payload, operation: string) {
    this.payload = payload
    this.operation = operation
    this.startTime = Date.now()
  }
  
  /**
   * End monitoring and log performance metrics
   */
  end(additionalInfo?: Record<string, any>): void {
    const duration = Date.now() - this.startTime
    
    if (duration > 1000) {
      this.payload.logger.warn(`Slow operation detected: ${this.operation} took ${duration}ms`, additionalInfo || {})
    } else if (duration > 500) {
      this.payload.logger.info(`Moderate operation duration: ${this.operation} took ${duration}ms`, additionalInfo || {})
    } else {
      this.payload.logger.debug(`Operation completed: ${this.operation} took ${duration}ms`, additionalInfo || {})
    }
  }
  
  /**
   * Add checkpoint with timing information
   */
  checkpoint(name: string, additionalInfo?: Record<string, any>): void {
    const duration = Date.now() - this.startTime
    
    this.payload.logger.debug(`${this.operation} - ${name}: ${duration}ms`, additionalInfo || {})
  }
}

/**
 * Create a performance monitor for an operation
 */
export function createPerformanceMonitor(payload: Payload, operation: string): QueryPerformanceMonitor {
  return new QueryPerformanceMonitor(payload, operation)
}

/**
 * Analyze and report on database performance
 */
export async function generatePerformanceReport(payload: Payload): Promise<{
  metrics: PerformanceMetrics
  recommendations: string[]
  summary: string
}> {
  payload.logger.info('Generating performance report...')
  
  const metrics = await getPerformanceMetrics(payload)
  const recommendations = generatePerformanceRecommendations(metrics)
  
  const summary = `
Performance Summary:
- Cache Hit Ratio: ${metrics.cacheHitRatio}%
- Active Connections: ${metrics.activeConnections}/${metrics.connectionCount}
- Slow Queries: ${metrics.slowQueries.length}
- Tables Analyzed: ${metrics.tableStats.length}
- Recommendations: ${recommendations.length}
  `.trim()
  
  payload.logger.info('Performance report generated successfully')
  
  return {
    metrics,
    recommendations,
    summary,
  }
}

/**
 * Enable pg_stat_statements extension for query monitoring
 */
export async function enableQueryStatistics(payload: Payload): Promise<{ success: boolean; message: string }> {
  try {
    // Check if extension is already enabled
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as enabled
    `
    
    const checkResult = await payload.db.drizzle.execute(checkQuery)
    const isEnabled = checkResult.rows?.[0]?.enabled
    
    if (isEnabled) {
      return {
        success: true,
        message: 'pg_stat_statements extension is already enabled',
      }
    }
    
    // Try to enable the extension
    await payload.db.drizzle.execute('CREATE EXTENSION IF NOT EXISTS pg_stat_statements')
    
    payload.logger.info('pg_stat_statements extension enabled successfully')
    
    return {
      success: true,
      message: 'pg_stat_statements extension enabled successfully. Restart required for full functionality.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error(`Failed to enable pg_stat_statements: ${errorMessage}`)
    
    return {
      success: false,
      message: `Failed to enable pg_stat_statements: ${errorMessage}`,
    }
  }
}