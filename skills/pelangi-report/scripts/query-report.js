#!/usr/bin/env node
/**
 * Pelangi Hostel Report Generator
 * Queries the production database to generate guest and maintenance reports.
 *
 * Usage: node query-report.js [guests|maintenance|full]
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load DATABASE_URL from local.env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '..', 'local.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in local.env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function getGuestReport() {
  // Get checked-in guests
  const guests = await sql`
    SELECT
      name,
      capsule_number,
      nationality,
      gender,
      id_number,
      phone_number,
      checkin_time,
      expected_checkout_date,
      payment_amount,
      payment_method,
      is_paid,
      notes
    FROM guests
    WHERE is_checked_in = true
    ORDER BY capsule_number
  `;

  // Get capsule stats
  const capsules = await sql`SELECT * FROM capsules`;
  const totalCapsules = capsules.length;
  const occupiedCount = capsules.filter(c => c.status === 'occupied').length;
  const availableCount = capsules.filter(c => c.status === 'available').length;
  const maintenanceCount = capsules.filter(c => c.status === 'maintenance').length;
  const cleaningCount = capsules.filter(c => c.status === 'cleaning').length;

  // Calculate overdue guests
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueGuests = guests.filter(g => {
    if (!g.expected_checkout_date) return false;
    const checkoutDate = new Date(g.expected_checkout_date);
    return checkoutDate < today;
  }).map(g => ({
    ...g,
    daysOverdue: Math.floor((today - new Date(g.expected_checkout_date)) / (1000 * 60 * 60 * 24))
  }));

  // Calculate outstanding payments
  const outstandingGuests = guests.filter(g => !g.is_paid || (g.notes && g.notes.includes('Outstanding')));
  const totalOutstanding = outstandingGuests.reduce((sum, g) => {
    const match = g.notes?.match(/RM([\d,]+\.?\d*)/);
    return sum + (match ? parseFloat(match[1].replace(',', '')) : 0);
  }, 0);

  // Today's checkouts
  const todayStr = today.toISOString().split('T')[0];
  const todayCheckouts = guests.filter(g => {
    if (!g.expected_checkout_date) return false;
    const checkoutStr = new Date(g.expected_checkout_date).toISOString().split('T')[0];
    return checkoutStr === todayStr;
  });

  return {
    reportType: 'guests',
    timestamp: new Date().toISOString(),
    stats: {
      totalGuests: guests.length,
      totalCapsules,
      occupiedCount: guests.length, // Use actual guest count
      availableCount: totalCapsules - guests.length,
      maintenanceCount,
      cleaningCount,
      occupancyRate: ((guests.length / totalCapsules) * 100).toFixed(1) + '%',
      overdueCount: overdueGuests.length,
      todayCheckoutsCount: todayCheckouts.length,
      totalOutstanding: `RM${totalOutstanding.toFixed(2)}`
    },
    guests,
    overdueGuests,
    todayCheckouts,
    outstandingPayments: outstandingGuests.map(g => ({
      name: g.name,
      capsule: g.capsule_number,
      notes: g.notes
    }))
  };
}

async function getMaintenanceReport() {
  const problems = await sql`
    SELECT
      id,
      capsule_number,
      description,
      reported_by,
      reported_at,
      is_resolved,
      resolved_by,
      resolved_at,
      notes
    FROM capsule_problems
    WHERE is_resolved = false
    ORDER BY reported_at DESC
  `;

  // Categorize issues
  const lightingIssues = problems.filter(p =>
    p.description.toLowerCase().includes('light'));
  const lockIssues = problems.filter(p =>
    p.description.toLowerCase().includes('lock') ||
    p.description.toLowerCase().includes('keycard'));
  const electricalIssues = problems.filter(p =>
    p.description.toLowerCase().includes('current') ||
    p.description.toLowerCase().includes('power') ||
    p.description.toLowerCase().includes('fan'));

  return {
    reportType: 'maintenance',
    timestamp: new Date().toISOString(),
    stats: {
      totalActiveIssues: problems.length,
      lightingIssues: lightingIssues.length,
      lockIssues: lockIssues.length,
      electricalIssues: electricalIssues.length
    },
    problems,
    categories: {
      lighting: lightingIssues.map(p => p.capsule_number),
      locks: lockIssues.map(p => p.capsule_number),
      electrical: electricalIssues.map(p => p.capsule_number)
    }
  };
}

async function getFullReport() {
  const [guestReport, maintenanceReport] = await Promise.all([
    getGuestReport(),
    getMaintenanceReport()
  ]);

  return {
    reportType: 'full',
    timestamp: new Date().toISOString(),
    guests: guestReport,
    maintenance: maintenanceReport
  };
}

async function main() {
  const reportType = process.argv[2] || 'guests';

  try {
    let report;
    switch (reportType) {
      case 'maintenance':
        report = await getMaintenanceReport();
        break;
      case 'full':
        report = await getFullReport();
        break;
      case 'guests':
      default:
        report = await getGuestReport();
    }

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
}

main();
