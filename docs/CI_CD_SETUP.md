# CI/CD Setup Guide

This guide explains how to set up the CI/CD pipeline for Firebase security rules and indexes deployment.

## Required GitHub Secrets

Set up the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

### Firebase Secrets
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_TOKEN=your-ci-token
```

### Clerk Secrets
```
CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key
```

## Setting Up Secrets

1. **Firebase Secrets**

   a. Get Firebase service account credentials:
   - Go to Firebase Console
   - Project Settings > Service Accounts
   - Generate New Private Key
   - Use the downloaded JSON file for the following values:
     ```
     FIREBASE_PROJECT_ID: "project_id" field
     FIREBASE_CLIENT_EMAIL: "client_email" field
     FIREBASE_PRIVATE_KEY: "private_key" field (include quotes)
     ```

   b. Generate Firebase CI token:
   ```bash
   firebase login:ci
   ```
   Use the generated token for `FIREBASE_TOKEN`

2. **Clerk Secrets**

   a. Get Clerk API keys:
   - Go to Clerk Dashboard
   - API Keys section
   - Copy the following:
     ```
     CLERK_PUBLISHABLE_KEY: Frontend API key
     CLERK_SECRET_KEY: Backend API key
     ```

## GitHub Actions Setup

The workflow is configured to:

1. Run on changes to:
   - `firestore.rules`
   - `firestore.indexes.json`
   - Related test and validation scripts

2. Perform validations:
   - Validate security rules
   - Validate indexes
   - Run tests
   - Compare with production indexes

3. Deploy on main branch:
   - Deploy rules and indexes
   - Create deployment record
   - Send notifications

## Environment Variables

The workflow automatically creates a `.env` file with the necessary variables:

```bash
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
FIREBASE_PRIVATE_KEY='${FIREBASE_PRIVATE_KEY}'
CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
```

## Deployment Process

1. **Validation Stage**
   ```yaml
   validate-and-test:
     steps:
       - Checkout code
       - Setup Node.js
       - Install dependencies
       - Create .env file
       - Validate rules and indexes
       - Run tests
   ```

2. **Deployment Stage**
   ```yaml
   deploy:
     needs: validate-and-test
     if: github.ref == 'refs/heads/main'
     steps:
       - Deploy rules and indexes
       - Create deployment record
       - Send notifications
   ```

## Monitoring Deployments

1. **GitHub Actions Dashboard**
   - View workflow runs
   - Check deployment status
   - Access logs

2. **Firebase Console**
   - Verify rules deployment
   - Check index status
   - Monitor usage

3. **Notifications**
   - Success/failure comments on PRs
   - Deployment summaries
   - Error notifications

## Troubleshooting

1. **Secret Issues**
   - Verify secret names match workflow
   - Check secret values are properly formatted
   - Ensure no extra whitespace

2. **Firebase Token**
   - Regenerate if expired
   - Verify project permissions
   - Check token format

3. **Deployment Failures**
   - Check workflow logs
   - Verify rule syntax
   - Validate index configuration

## Best Practices

1. **Secret Management**
   - Rotate secrets regularly
   - Use environment-specific keys
   - Limit secret access

2. **Testing**
   - Run tests locally before push
   - Add tests for new rules
   - Verify index changes

3. **Monitoring**
   - Review workflow runs
   - Check deployment status
   - Monitor Firebase logs

## Security Considerations

1. **Secrets**
   - Never commit secrets
   - Use GitHub secret storage
   - Rotate regularly

2. **Access Control**
   - Limit workflow permissions
   - Restrict secret access
   - Monitor usage

3. **Deployments**
   - Review changes before merge
   - Test in staging
   - Monitor production

## Support

For issues with:
- CI/CD pipeline: Create issue with 'ci' label
- Secrets: Contact repository admin
- Deployments: Check Firebase logs
