/**
 * Custom endpoints for pharmacy functionality
 */

// Export all endpoints as an array for easy import in payload config
import {
    clearAllCache,
    clearSpecificCache,
    getCacheHealth,
    getCacheStats,
    invalidateProductCache,
    warmupCaches,
} from './cache-management'
import {
    analyzeIndexes,
    enableStats,
    getMetrics,
    getPerformanceReport,
    optimizeDatabase,
    vacuumDatabase,
} from './database-optimization'
import {
    expiringProductsReport,
    financialReport,
    inventoryMovementsReport,
    inventoryStatusReport,
    inventoryStatusReportEndpoint,
    lowStockReport,
    salesReport,
} from './inventory-reports'
import {
    checkBulkStock,
    checkProductStock,
    stockAlerts,
    stockMonitor,
} from './stock-monitoring'

export const pharmacyEndpoints = [
    // Test endpoint to verify endpoints are working


    // Database optimization endpoints
    optimizeDatabase,
    getPerformanceReport,
    vacuumDatabase,
    analyzeIndexes,
    enableStats,
    getMetrics,

    // Cache management endpoints
    getCacheStats,
    clearAllCache,
    clearSpecificCache,
    invalidateProductCache,
    warmupCaches,
    getCacheHealth,

    // Inventory reporting endpoints
    lowStockReport,
    expiringProductsReport,
    inventoryStatusReport,
    inventoryMovementsReport,

    // Advanced reporting endpoints
    salesReport,
    inventoryStatusReportEndpoint,
    financialReport,

    // Stock monitoring endpoints
    checkProductStock,
    checkBulkStock,
    stockMonitor,
    stockAlerts,

    // Data integrity and health check endpoints (optional - uncomment to enable)
    // dataIntegrityCheckEndpoint,
    // quickHealthCheckEndpoint,
    // fixDataIssuesEndpoint,
]

// Individual endpoint exports for direct use
export {
    expiringProductsReport,
    financialReport,
    inventoryMovementsReport,
    inventoryStatusReport,
    inventoryStatusReportEndpoint,
    lowStockReport,
    salesReport
} from './inventory-reports'

export {
    dataIntegrityCheckEndpoint, fixDataIssuesEndpoint, quickHealthCheckEndpoint
} from './data-integrity-check'

