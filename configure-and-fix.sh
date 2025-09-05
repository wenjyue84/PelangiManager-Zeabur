#!/bin/bash

echo "🔧 Quick Setup for AWS Permissions"
echo "=================================="

# Method 1: Environment variables (temporary)
echo "Enter your AWS ROOT account credentials:"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY

# Export for current session
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY  
export AWS_DEFAULT_REGION=us-west-2

echo "🔍 Testing root account access..."
aws sts get-caller-identity

if [ $? -eq 0 ]; then
    echo "✅ Root account access confirmed!"
    echo "🔧 Adding permissions to JayIAM user..."
    
    # Run the permissions
    aws iam attach-user-policy --user-name JayIAM --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk
    aws iam attach-user-policy --user-name JayIAM --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
    aws iam attach-user-policy --user-name JayIAM --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    aws iam attach-user-policy --user-name JayIAM --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess
    aws iam attach-user-policy --user-name JayIAM --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess
    
    echo "✅ Permissions granted successfully!"
    echo "📝 Now please run 'aws configure' to switch back to JayIAM credentials"
    
else
    echo "❌ Root account access failed. Please check credentials."
fi