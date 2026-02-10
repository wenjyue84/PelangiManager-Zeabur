#!/usr/bin/env node
/**
 * Deploy MCP Server to Zeabur Frankfurt project
 *
 * This script:
 * 1. Creates a new service in Frankfurt project
 * 2. Connects it to the GitHub repo
 * 3. Configures it to build from mcp-server subdirectory
 * 4. Sets environment variables
 */

const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;
const PROJECT_ID = '6988ba46ea91e8e06ef1420c'; // Frankfurt
const ENV_ID = '6988ba462579f38ed02c6579'; // Frankfurt environment
const GITHUB_REPO = 'wenjyue84/PelangiManager-Zeabur';

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  console.log('   Set it with: export ZEABUR_TOKEN=your-token');
  process.exit(1);
}

// Environment variables for MCP server (read from current environment)
const MCP_ENV_VARS = {
  PELANGI_API_URL: process.env.PELANGI_API_URL || 'https://pelangi-manager-2.zeabur.app',
  PELANGI_API_TOKEN: process.env.PELANGI_API_TOKEN,
  MCP_SERVER_PORT: '3001',
  NODE_ENV: 'production',
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
};

// Validate required environment variables
const required = ['PELANGI_API_TOKEN', 'NVIDIA_API_KEY', 'GROQ_API_KEY'];
const missing = required.filter(key => !MCP_ENV_VARS[key]);
if (missing.length > 0) {
  console.error('❌ Error: Missing required environment variables:', missing.join(', '));
  console.log('   Load them from mcp-server/.env file');
  process.exit(1);
}

async function createMCPService() {
  console.log('🚀 Deploying MCP Server to Frankfurt...\n');

  // Step 1: Create service from GitHub
  const createServiceMutation = `
    mutation CreateService($projectID: ObjectID!, $template: ServiceTemplate!, $name: String!) {
      createService(projectID: $projectID, template: $template, name: $name) {
        _id
        name
        status
      }
    }
  `;

  try {
    console.log('📝 Step 1: Creating MCP Server service...');
    const response = await fetch('https://api.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query: createServiceMutation,
        variables: {
          projectID: PROJECT_ID,
          template: 'GIT',
          name: 'pelangi-mcp-server'
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Failed to create service:', JSON.stringify(data.errors, null, 2));
      return null;
    }

    const service = data.data?.createService;
    if (!service) {
      console.log('❌ No service created');
      return null;
    }

    console.log(`✅ Service created: ${service.name} (${service._id})`);
    console.log(`   Status: ${service.status}\n`);

    return service._id;
  } catch (error) {
    console.error('❌ Error creating service:', error.message);
    return null;
  }
}

async function configureGitRepo(serviceID) {
  console.log('📝 Step 2: Configuring GitHub repository...');

  const updateGitMutation = `
    mutation UpdateGitService($serviceID: ObjectID!, $repo: String!, $branch: String!, $rootDirectory: String) {
      updateServiceGit(
        serviceID: $serviceID,
        repo: $repo,
        branch: $branch,
        rootDirectory: $rootDirectory
      )
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
        query: updateGitMutation,
        variables: {
          serviceID: serviceID,
          repo: GITHUB_REPO,
          branch: 'main',
          rootDirectory: 'mcp-server'
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Failed to configure Git:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('✅ GitHub repository configured');
    console.log(`   Repo: ${GITHUB_REPO}`);
    console.log(`   Branch: main`);
    console.log(`   Root Directory: mcp-server\n`);

    return true;
  } catch (error) {
    console.error('❌ Error configuring Git:', error.message);
    return false;
  }
}

async function setEnvironmentVariables(serviceID) {
  console.log('📝 Step 3: Setting environment variables...');

  const mutation = `
    mutation UpdateEnvironmentVariable($serviceID: ObjectID!, $environmentID: ObjectID!, $data: Map!) {
      updateEnvironmentVariable(serviceID: $serviceID, environmentID: $environmentID, data: $data)
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
        query: mutation,
        variables: {
          serviceID: serviceID,
          environmentID: ENV_ID,
          data: MCP_ENV_VARS
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Failed to set environment variables:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('✅ Environment variables set');
    Object.keys(MCP_ENV_VARS).forEach(key => {
      const value = key.includes('KEY') || key.includes('TOKEN')
        ? '***REDACTED***'
        : MCP_ENV_VARS[key];
      console.log(`   ${key}: ${value}`);
    });
    console.log('');

    return true;
  } catch (error) {
    console.error('❌ Error setting environment variables:', error.message);
    return false;
  }
}

async function deployService(serviceID) {
  console.log('📝 Step 4: Triggering deployment...');

  const mutation = `
    mutation RedeployService($serviceID: ObjectID!, $environmentID: ObjectID!) {
      redeployService(serviceID: $serviceID, environmentID: $environmentID)
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
        query: mutation,
        variables: {
          serviceID: serviceID,
          environmentID: ENV_ID
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Failed to deploy:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('✅ Deployment triggered\n');
    return true;
  } catch (error) {
    console.error('❌ Error deploying:', error.message);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🌈 Pelangi MCP Server Deployment to Frankfurt');
  console.log('═'.repeat(60));
  console.log('');

  // Step 1: Create service
  const serviceID = await createMCPService();
  if (!serviceID) {
    console.log('\n❌ Deployment failed: Could not create service');
    return;
  }

  // Step 2: Configure Git
  const gitConfigured = await configureGitRepo(serviceID);
  if (!gitConfigured) {
    console.log('\n⚠️  Warning: Git configuration may have failed');
    console.log('   You may need to configure it manually in Zeabur dashboard');
  }

  // Step 3: Set environment variables
  const envSet = await setEnvironmentVariables(serviceID);
  if (!envSet) {
    console.log('\n⚠️  Warning: Environment variables may not be set');
    console.log('   You may need to set them manually in Zeabur dashboard');
  }

  // Step 4: Deploy
  const deployed = await deployService(serviceID);
  if (!deployed) {
    console.log('\n⚠️  Warning: Deployment may not have started');
    console.log('   You may need to trigger it manually in Zeabur dashboard');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Service ID: ${serviceID}`);
  console.log(`Project: Frankfurt (${PROJECT_ID})`);
  console.log(`Environment: ${ENV_ID}`);
  console.log('');
  console.log('⏳ Deployment in progress (2-3 minutes)');
  console.log('');
  console.log('📊 Monitor progress:');
  console.log(`   https://dash.zeabur.com/projects/${PROJECT_ID}`);
  console.log('');
  console.log('🧪 After deployment, test endpoints:');
  console.log('   Main app: https://pelangi-manager-2.zeabur.app/api/health');
  console.log('   MCP server will get its own domain (check dashboard)');
  console.log('');
  console.log('✅ Deployment script completed!');
  console.log('═'.repeat(60));
}

main();
