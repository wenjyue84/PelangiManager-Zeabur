import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.PELANGI_API_URL || 'http://localhost:5000';
const API_TOKEN = process.env.PELANGI_API_TOKEN;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': API_TOKEN ? `Bearer ${API_TOKEN}` : undefined,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export async function callAPI<T>(
  method: string,
  path: string,
  data?: any
): Promise<T> {
  try {
    const response = await apiClient.request({
      method,
      url: path,
      data
    });
    return response.data;
  } catch (error: any) {
    console.error(`API call failed: ${method} ${path}`, error.message);
    throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
  }
}
