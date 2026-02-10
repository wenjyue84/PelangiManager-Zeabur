#!/usr/bin/env node
/**
 * Set environment variables for Singapore deployment
 */

const SERVICE_ID = '6948cacdaf84400647912aab';
const ENV_ID = '6948c99f4947dd57c4fd2583';
const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  process.exit(1);
}

// Environment variables from .env.zeabur
const ENV_VARS = {
  DATABASE_URL: 'postgresql://neondb_owner:npg_Cplzw9SPetf1@ep-wild-star-ae4hdq5i.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  NODE_ENV: 'production',
  JWT_SECRET: 'pelangi-manager-jwt-secret-2026',
  PORT: '8080' // Zeabur typically uses 8080
};

async function setEnvironmentVariables() {
  const mutation = `
    mutation UpdateEnvironmentVariable($serviceID: ObjectID!, $environmentID: ObjectID!, $data: Map!) {
      updateEnvironmentVariable(serviceID: $serviceID, environmentID: $environmentID, data: $data)
    }
  `;

  console.log('🔧 Setting environment variables for Singapore service...\n');
  console.log('Variables to set:');
  Object.keys(ENV_VARS).forEach(key => {
    const value = key.includes('SECRET') || key.includes('URL')
      ? '***REDACTED***'
      : ENV_VARS[key];
    console.log(`  - ${key}: ${value}`);
  });

  try {
    const response = await fetch('https://api.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          serviceID: SERVICE_ID,
          environmentID: ENV_ID,
          data: ENV_VARS
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('\n❌ Failed to set environment variables:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('\n✅ Environment variables updated successfully!');
    console.log('\n⚠️  IMPORTANT: Redeploy required for changes to take effect');
    console.log('   Run: node scripts/redeploy-service.js');

    return true;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

setEnvironmentVariables();
