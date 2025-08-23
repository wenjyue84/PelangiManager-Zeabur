import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { csvSettings } from '../server/csvSettings';
import fs from 'fs';
import path from 'path';

describe('CSV Import Functionality', () => {
  const testCsvPath = path.join(process.cwd(), 'test-settings.csv');
  
  beforeAll(() => {
    // Create a test CSV file
    const testCsvContent = `key,value,description,updated_by,updated_at
testKey1,testValue1,Test description 1,test-user,2024-01-01T00:00:00.000Z
testKey2,testValue2,Test description 2,test-user,2024-01-01T00:00:00.000Z`;
    
    fs.writeFileSync(testCsvPath, testCsvContent, 'utf-8');
  });
  
  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
  });
  
  it('should import settings from CSV file', async () => {
    const result = await csvSettings.importFromFile(testCsvPath, 'test-user');
    
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should generate CSV from settings', () => {
    const testSettings = [
      { key: 'test1', value: 'value1', description: 'desc1', updated_by: 'user1', updated_at: '2024-01-01T00:00:00.000Z' },
      { key: 'test2', value: 'value2', description: 'desc2', updated_by: 'user2', updated_at: '2024-01-01T00:00:00.000Z' }
    ];
    
    const csvContent = csvSettings.generateCsvFromSettings(testSettings);
    
    expect(csvContent).toContain('key,value,description,updated_by,updated_at');
    expect(csvContent).toContain('test1,value1,desc1,user1,2024-01-01T00:00:00.000Z');
    expect(csvContent).toContain('test2,value2,desc2,user2,2024-01-01T00:00:00.000Z');
  });
  
  it('should handle invalid CSV file gracefully', async () => {
    const invalidCsvPath = path.join(process.cwd(), 'nonexistent.csv');
    
    const result = await csvSettings.importFromFile(invalidCsvPath, 'test-user');
    
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
