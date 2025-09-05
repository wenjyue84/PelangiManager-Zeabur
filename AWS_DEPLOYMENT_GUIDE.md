# 🚀 AWS Deployment Guide for PelangiManager

This guide provides step-by-step instructions to deploy PelangiManager to AWS using three different strategies.

## 📋 Prerequisites

### Required Tools
```bash
# 1. AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. EB CLI (for Elastic Beanstalk deployment)
pip install awsebcli

# 3. Docker (for containerized deployments)
# Follow installation guide for your OS: https://docs.docker.com/get-docker/
```

### AWS Account Setup
1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Configure AWS credentials:
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, and preferred region
   ```

---

## 🥇 Option 1: AWS Elastic Beanstalk (RECOMMENDED)

**Best for:** Quick deployment, managed infrastructure, beginner-friendly

### Step 1: Quick Deploy
```bash
# Automated deployment script
./scripts/deploy-aws.sh
```

### Step 2: Manual Setup (Alternative)
```bash
# 1. Initialize EB application
eb init pelangi-manager --platform Docker --region us-west-2

# 2. Create environment with database
eb create pelangi-manager-prod --instance-type t3.small --database.engine postgres

# 3. Deploy
eb deploy
```

### Step 3: Configure Database
1. Go to AWS RDS Console
2. Find your PostgreSQL instance
3. Copy the connection string
4. Set environment variable in EB:
   ```bash
   eb setenv DATABASE_URL="postgresql://username:password@host:5432/dbname"
   ```

### Step 4: Configure Environment Variables
```bash
eb setenv NODE_ENV=production \
         SESSION_SECRET="your-secure-session-secret" \
         PORT=8080
```

### Step 5: Access Your Application
```bash
eb open  # Opens application in browser
```

**Estimated Cost:** $25-50/month

---

## 🥈 Option 2: AWS App Runner

**Best for:** Container-based deployment, automatic CI/CD from GitHub

### Step 1: Prepare Repository
1. Push your code to GitHub
2. Ensure Dockerfile is in root directory (✅ already created)

### Step 2: Create App Runner Service
1. Go to AWS App Runner Console
2. Click "Create service"
3. Choose "Source code repository"
4. Connect to GitHub and select your repository
5. Configure build settings:
   ```yaml
   version: 1.0
   runtime: docker
   build:
     commands:
       build:
         - echo "Build completed"
   run:
     runtime-version: latest
     command: npm start
     network:
       port: 8080
       env: PORT=8080
   ```

### Step 3: Configure Environment Variables
Add these in App Runner console:
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...` (from RDS)
- `SESSION_SECRET=your-secret`

**Estimated Cost:** $20-40/month

---

## 🥉 Option 3: AWS Amplify + Lambda (Advanced)

**Best for:** Serverless architecture, global scale, pay-per-use

### Step 1: Frontend (Amplify)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli
amplify configure

# Initialize Amplify
amplify init
amplify add hosting
amplify publish
```

### Step 2: Backend (Lambda + API Gateway)
*This requires more advanced setup and is beyond the scope of this guide. Consider using AWS SAM or Serverless Framework.*

**Estimated Cost:** $10-30/month (scales with usage)

---

## 🗄️ Database Setup (All Options)

### Option A: AWS RDS PostgreSQL (Recommended)
1. Go to AWS RDS Console
2. Create database:
   - Engine: PostgreSQL 15
   - Instance class: db.t3.micro (free tier)
   - Storage: 20GB GP2
   - Master username: `pelangi_user`
   - Master password: `[secure-password]`
   - Database name: `pelangi_manager`

### Option B: In-Memory Storage (Testing Only)
Your app will automatically use in-memory storage if no `DATABASE_URL` is set.

---

## 🔧 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `8080` (EB/App Runner) |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Session encryption key | `your-secure-random-string` |

---

## 🎛️ Post-Deployment Checklist

### 1. Verify Application Health
```bash
curl https://your-app-url.elasticbeanstalk.com/api/database/config
# Should return: {"current":{"type":"database","label":"PostgreSQL"}}
```

### 2. Test Core Functionality
- ✅ Login with admin credentials: `admin@pelangi.com` / `admin123`
- ✅ Check capsule management
- ✅ Test guest check-in flow
- ✅ Verify database persistence

### 3. Configure Custom Domain (Optional)
1. Register domain or use existing
2. Add CNAME record pointing to EB environment
3. Configure SSL certificate in AWS Certificate Manager

### 4. Set Up Monitoring
- Enable CloudWatch monitoring
- Set up alarms for:
  - High CPU usage (>80%)
  - Application errors
  - Database connection issues

---

## 🚨 Troubleshooting

### Common Issues

**Build Fails**
```bash
# Check build logs
eb logs --all

# Common solutions:
npm ci --production=false  # Install dev dependencies for build
```

**Database Connection Error**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database
```

**Application Won't Start**
```bash
# Check if port 8080 is configured
eb config
# Ensure PORT=8080 in environment variables
```

### Useful Commands
```bash
# View application logs
eb logs

# Check environment status
eb status

# Connect to database
psql $DATABASE_URL

# Scale environment
eb scale 2  # 2 instances

# Terminate environment (careful!)
eb terminate pelangi-manager-prod
```

---

## 💰 Cost Optimization Tips

1. **Use t3.micro instances** for testing ($6/month)
2. **Enable auto-scaling** to handle traffic spikes
3. **Use RDS t3.micro** (free tier eligible)
4. **Set up CloudWatch alarms** to monitor costs
5. **Consider reserved instances** for production

---

## 🔄 CI/CD Pipeline (Optional)

Set up GitHub Actions for automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS EB
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci && npm run build
      - run: eb deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 📞 Support

If you encounter issues:
1. Check AWS CloudWatch logs
2. Verify all environment variables are set
3. Ensure RDS security groups allow connections
4. Review the troubleshooting section above

**Good luck with your deployment! 🚀**