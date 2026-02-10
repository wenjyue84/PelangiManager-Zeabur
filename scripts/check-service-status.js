#!/usr/bin/env node
/**
 * Check Zeabur service status and get latest logs
 * Uses correct API endpoint: api.zeabur.com
 */

const PROJECT_ID = '6948c99fced85978abb44563'; // Singapore
const SERVICE_ID = '6948cacdaf84400647912aab';
const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  process.exit(1);
}

async function checkServiceStatus() {
  const query = `
    query GetService($serviceID: ObjectID!) {
      service(_id: $serviceID) {
        _id
        name
        status
        deployments {
          _id
          status
          createdAt
          finishedAt
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query,
        variables: { serviceID: SERVICE_ID }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(data.errors, null, 2));
      return null;
    }

    const service = data.data?.service;
    if (!service) {
      console.log('❌ No service found');
      return null;
    }

    console.log('='.repeat(60));
    console.log('📊 ZEABUR SERVICE STATUS (Singapore)');
    console.log('='.repeat(60));
    console.log(`Service: ${service.name}`);
    console.log(`Status: ${service.status}`);
    console.log(`Service ID: ${service._id}`);

    if (service.deployments && service.deployments.length > 0) {
      console.log('\n📦 Recent Deployments:');
      service.deployments.forEach((dep, i) => {
        console.log(`\n${i + 1}. Deployment ID: ${dep._id}`);
        console.log(`   Status: ${dep.status}`);
        console.log(`   Created: ${dep.createdAt}`);
        console.log(`   Finished: ${dep.finishedAt || 'N/A'}`);
      });

      return service.deployments[0]._id; // Return latest deployment ID
    }

    return null;
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    return null;
  }
}

async function getDeploymentLogs(deploymentID) {
  const query = `
    query GetDeploymentLogs($deploymentID: ObjectID!) {
      deployment(_id: $deploymentID) {
        _id
        status
      }
    }
  `;

  try {
    const response = await fetch('https://api.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query,
        variables: { deploymentID }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Log fetch errors:', JSON.stringify(data.errors, null, 2));
      return;
    }

    const deployment = data.data?.deployment;
    if (!deployment) {
      console.log('❌ No deployment logs found');
      return;
    }

    console.log('\n⚠️  GraphQL API does not provide log access');
    console.log('ℹ️  Check Zeabur dashboard manually for logs:');
    console.log(`   https://dash.zeabur.com/projects/6948c99fced85978abb44563/services/6948cacdaf84400647912aab`);

  } catch (error) {
    console.error('❌ Log fetch error:', error.message);
  }
}

async function main() {
  console.log('🔍 Checking Zeabur service status...\n');

  const latestDeploymentID = await checkServiceStatus();

  if (latestDeploymentID) {
    console.log('\n🔍 Fetching logs for latest deployment...');
    await getDeploymentLogs(latestDeploymentID);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Check complete');
  console.log('='.repeat(60));
}

main();
