/**
 * Custom endpoints for pharmacy functionality
 * Requirements: 8.4, 8.5 - Custom endpoints for inventory reporting, stock monitoring, and prescription verification
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
    prescriptionTrackingReportEndpoint,
    salesReport,
} from './inventory-reports'


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
    prescriptionTrackingReportEndpoint,
    financialReport,

    // Data integrity and health check endpoints
    // dataIntegrityCheckEndpoint,
    // quickHealthCheckEndpoint,
    // fixDataIssuesEndpoint,

    // Note: Other endpoints are commented out due to import path issues
    // They can be uncommented once the utility imports are resolved
    // The endpoint files are created and ready to use:
    // - stock-monitoring.ts (checkProductStock, checkBulkStock, stockMonitor, stockAlerts)  
    // - prescription-verification.ts (pendingPrescriptionOrders, validatePrescription, verifyPrescription, removePrescriptionVerify, prescriptionStats)
]

// Individual endpoint exports for direct use
export {
    expiringProductsReport,
    financialReport,
    inventoryMovementsReport,
    inventoryStatusReport,
    inventoryStatusReportEndpoint,
    lowStockReport,
    prescriptionTrackingReportEndpoint,
    salesReport
} from './inventory-reports'

export {
    dataIntegrityCheckEndpoint, fixDataIssuesEndpoint, quickHealthCheckEndpoint
} from './data-integrity-check'

