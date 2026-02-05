/**
 * Simple test to verify endpoints are working
 */

import type { Endpoint } from 'payload'

export const testEndpoint: Endpoint = {
  path: '/test',
  method: 'get',
  handler: async (req) => {
    return Response.json({
      success: true,
      message: 'Pharmacy endpoints are working!',
      timestamp: new Date().toISOString(),
    })
  },
}