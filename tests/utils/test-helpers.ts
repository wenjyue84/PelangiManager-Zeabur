import { Page, expect } from '@playwright/test';

// Mock data generators
export const TestData = {
  names: {
    first: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
  },
  
  phonePrefixes: ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019'],
  
  nationalities: ['Malaysian', 'Singaporean', 'Indonesian', 'Thai', 'Vietnamese', 'Filipino', 'Chinese', 'Indian', 'American', 'British'],
  
  paymentMethods: [
    { value: 'cash', label: 'Cash (Paid to Guest/Person)' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'online_platform', label: 'Online Platform (Booking.com, Agoda, etc.)' }
  ],
  
  quickNotes: [
    'Late arrival after 10 PM',
    'Prefer bottom capsule',
    'Early arrival before 2 PM',
    'Quiet area preferred',
    'Extra bedding needed'
  ],
  
  faqItems: [
    'IC vs Passport - which one should I provide?',
    'How do I upload my document photo?',
    'What phone number format should I use?',
    'Why do you need my gender?',
    'How is my privacy protected?',
    'Can I edit my information after check-in?'
  ]
};

// Utility functions
export function generateRandomName(): string {
  const firstName = TestData.names.first[Math.floor(Math.random() * TestData.names.first.length)];
  const lastName = TestData.names.last[Math.floor(Math.random() * TestData.names.last.length)];
  return `${firstName} ${lastName}`;
}

export function generateRandomPhone(): string {
  const prefix = TestData.phonePrefixes[Math.floor(Math.random() * TestData.phonePrefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
  return `${prefix}${number}`;
}

export function generateRandomIC(): string {
  const year = Math.floor(Math.random() * 30) + 70; // 1970-1999
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  const state = Math.floor(Math.random() * 16) + 1;
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${year.toString().slice(-2)}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${state.toString().padStart(2, '0')}${random}`;
}

export function generateRandomPassport(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
  return `${letter1}${letter2}${numbers}`;
}

export function generateRandomDate(): string {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30); // 30 days from now
  
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

export function generateRandomGender(): string {
  const options = ['male', 'female', 'other', 'prefer-not-to-say'];
  return options[Math.floor(Math.random() * options.length)];
}

export function generateRandomPaymentMethod(): string {
  const methods = TestData.paymentMethods.map(m => m.value);
  return methods[Math.floor(Math.random() * methods.length)];
}

// Common test actions
export async function fillPersonalInformation(page: Page, data: {
  name?: string;
  phone?: string;
  gender?: string;
  nationality?: string;
  checkInDate?: string;
  checkOutDate?: string;
}) {
  const name = data.name || generateRandomName();
  const phone = data.phone || generateRandomPhone();
  const gender = data.gender || generateRandomGender();
  const nationality = data.nationality || 'Malaysian';
  const checkInDate = data.checkInDate || new Date().toISOString().split('T')[0];
  const checkOutDate = data.checkOutDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await page.fill('#nameAsInDocument', name);
  await page.fill('#phoneNumber', phone);
  
  // Select gender
  await page.click('text=Gender');
  await page.click(`text=${gender}`);
  
  // Select nationality
  await page.click('text=Select nationality');
  await page.fill('input[placeholder="Search nationality..."]', nationality);
  await page.click(`text=${nationality}`);
  
  // Fill dates
  await page.fill('#checkInDate', checkInDate);
  await page.fill('#checkOutDate', checkOutDate);

  return { name, phone, gender, nationality, checkInDate, checkOutDate };
}

export async function fillIdentityDocuments(page: Page, data: {
  useIC?: boolean;
  icNumber?: string;
  passportNumber?: string;
}) {
  const useIC = data.useIC ?? Math.random() > 0.5;
  
  if (useIC) {
    const icNumber = data.icNumber || generateRandomIC();
    await page.fill('#icNumber', icNumber);
    return { icNumber, passportNumber: '' };
  } else {
    const passportNumber = data.passportNumber || generateRandomPassport();
    await page.fill('#passportNumber', passportNumber);
    return { icNumber: '', passportNumber };
  }
}

export async function fillEmergencyContact(page: Page, data: {
  contact?: string;
  phone?: string;
  notes?: string;
}) {
  const contact = data.contact || generateRandomName();
  const phone = data.phone || generateRandomPhone();
  const notes = data.notes || 'Automated test notes';

  await page.fill('#emergencyContact', contact);
  await page.fill('#emergencyPhone', phone);
  await page.fill('#notes', notes);

  return { contact, phone, notes };
}

export async function selectPaymentMethod(page: Page, method: string, description?: string) {
  await page.click('text=Select payment method');
  await page.click(`text=${method}`);
  
  if (method === 'cash' && description) {
    await page.fill('#guestPaymentDescription', description);
  }
}

// Validation helpers
export async function expectFormField(page: Page, fieldId: string, expectedValue: string) {
  await expect(page.locator(`#${fieldId}`)).toHaveValue(expectedValue);
}

export async function expectFormSectionVisible(page: Page, sectionName: string) {
  await expect(page.locator(`text=${sectionName}`)).toBeVisible();
}

export async function expectValidationError(page: Page, errorMessage: string) {
  await expect(page.locator(`text=${errorMessage}`)).toBeVisible();
}

// Mobile testing helpers
export async function testMobileViewport(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
}

export async function testTabletViewport(page: Page) {
  await page.setViewportSize({ width: 768, height: 1024 });
}

export async function testDesktopViewport(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
}

// Common assertions
export async function expectPageTitle(page: Page, title: string) {
  await expect(page.locator('h1')).toContainText(title);
}

export async function expectFormSubmitted(page: Page) {
  // This will need to be adjusted based on your success page or confirmation
  await expect(page.locator('text=Check-in successful')).toBeVisible();
}

// Mock token generator for testing
export function generateMockToken(): string {
  return `test-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Wait for specific conditions
export async function waitForFormReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#nameAsInDocument')).toBeVisible();
}

export async function waitForAutosave(page: Page, token: string) {
  // Wait for autosave (500ms delay + buffer)
  await page.waitForTimeout(600);
  
  // Verify draft was saved
  const draft = await page.evaluate((t) => {
    return localStorage.getItem(`guest-checkin-draft:${t}`);
  }, token);
  
  expect(draft).toBeTruthy();
  return JSON.parse(draft!);
}
