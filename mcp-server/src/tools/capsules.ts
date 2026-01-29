import { callAPI } from '../lib/http-client.js';
import { MCPTool, MCPToolResult } from '../types/mcp.js';

export const capsuleTools: MCPTool[] = [
  {
    name: 'pelangi_list_capsules',
    description: 'List all capsules with status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_get_occupancy',
    description: 'Get current occupancy statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'pelangi_check_availability',
    description: 'Get available capsules for assignment',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function listCapsules(args: any): Promise<MCPToolResult> {
  try {
    const capsules = await callAPI('GET', '/api/capsules');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(capsules, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error listing capsules: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function getOccupancy(args: any): Promise<MCPToolResult> {
  try {
    const occupancy = await callAPI('GET', '/api/occupancy');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(occupancy, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting occupancy: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function checkAvailability(args: any): Promise<MCPToolResult> {
  try {
    const available = await callAPI('GET', '/api/capsules/available');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(available, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking availability: ${error.message}`
      }],
      isError: true
    };
  }
}
