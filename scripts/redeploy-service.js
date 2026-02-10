#!/usr/bin/env node
/**
 * Redeploy Zeabur service
 */

const PROJECT_ID = '6948c99fced85978abb44563'; // Singapore
const SERVICE_ID = '6948cacdaf84400647912aab';
const ENV_ID = '6948c99f4947dd57c4fd2583';
const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  process.exit(1);
}

async function redeployService() {
  const mutation = `
    mutation RedeployService($serviceID: ObjectID!, $environmentID: ObjectID!) {
      redeployService(serviceID: $serviceID, environmentID: $environmentID)
    }
  `;

  console.log('🚀 Initiating redeploy for Singapore service...\n');
  console.log(`Service ID: ${SERVICE_ID}`);
  console.log(`Environment ID: ${ENV_ID}`);

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
          environmentID: ENV_ID
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Redeploy failed:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('\n✅ Redeploy triggered successfully!');
    console.log('\n⏳ Deployment in progress...');
    console.log('   This may take 2-3 minutes');
    console.log('\n📊 Monitor progress:');
    console.log('   Dashboard: https://dash.zeabur.com/projects/6948c99fced85978abb44563');
    console.log('\n🧪 Test endpoint after 3 minutes:');
    console.log('   curl https://pelangi-manager.zeabur.app/api/health');

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

redeployService();
