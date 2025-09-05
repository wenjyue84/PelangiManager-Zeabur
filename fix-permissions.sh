#!/bin/bash
# Run this script with your AWS root account or admin user credentials

echo "🔑 Adding AWS Elastic Beanstalk permissions to JayIAM user..."

# 1. Attach AWS managed policy for Elastic Beanstalk (Full Access)
aws iam attach-user-policy \
  --user-name JayIAM \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk

# 2. Attach EC2 permissions (needed for Elastic Beanstalk instances)
aws iam attach-user-policy \
  --user-name JayIAM \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

# 3. Attach S3 permissions (needed for deployment packages)
aws iam attach-user-policy \
  --user-name JayIAM \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# 4. Attach RDS permissions (for database)
aws iam attach-user-policy \
  --user-name JayIAM \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

# 5. Attach IAM read permissions (to check policies)
aws iam attach-user-policy \
  --user-name JayIAM \
  --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess

echo "✅ Permissions added successfully!"
echo "📝 JayIAM user now has:"
echo "   - Elastic Beanstalk Full Access"
echo "   - EC2 Full Access (for instances)"  
echo "   - S3 Full Access (for deployments)"
echo "   - RDS Full Access (for database)"
echo "   - IAM Read Access (to check policies)"

echo "🔄 Please run 'aws configure' again with JayIAM credentials to refresh the session"