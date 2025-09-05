#!/bin/bash
# AWS Elastic Beanstalk Deployment Script for PelangiManager
# This script builds the application and deploys it to AWS Elastic Beanstalk

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m' 
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="pelangi-manager"
ENV_NAME="pelangi-manager-prod"
REGION="us-west-2"  # Change to your preferred region

echo -e "${BLUE}🚀 Starting AWS Elastic Beanstalk deployment for PelangiManager${NC}"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${RED}❌ EB CLI is not installed. Please install it first:${NC}"
    echo "pip install awsebcli"
    exit 1
fi

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first:${NC}"
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}🔍 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run:${NC}"
    echo "aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials configured${NC}"

# Clean and build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
rm -rf dist/
npm ci --production=false
npm run build

echo -e "${GREEN}✅ Build completed${NC}"

# Initialize EB application if not exists
if [ ! -f .elasticbeanstalk/config.yml ]; then
    echo -e "${YELLOW}🛠️ Initializing Elastic Beanstalk application...${NC}"
    eb init $APP_NAME --platform "Docker" --region $REGION
    echo -e "${GREEN}✅ EB application initialized${NC}"
fi

# Create environment if not exists
if ! eb list | grep -q $ENV_NAME; then
    echo -e "${YELLOW}🌍 Creating Elastic Beanstalk environment...${NC}"
    eb create $ENV_NAME --instance-type t3.small --cname $APP_NAME
    echo -e "${GREEN}✅ Environment created${NC}"
else
    echo -e "${GREEN}✅ Environment $ENV_NAME already exists${NC}"
fi

# Deploy to Elastic Beanstalk
echo -e "${YELLOW}📦 Deploying to Elastic Beanstalk...${NC}"
eb deploy $ENV_NAME

# Show deployment status
echo -e "${YELLOW}📊 Deployment status:${NC}"
eb status $ENV_NAME

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${BLUE}🌐 Application URL: $(eb status $ENV_NAME | grep CNAME | cut -d: -f2 | xargs)${NC}"
echo -e "${YELLOW}💡 To see logs: eb logs $ENV_NAME${NC}"
echo -e "${YELLOW}🔧 To open environment: eb open $ENV_NAME${NC}"