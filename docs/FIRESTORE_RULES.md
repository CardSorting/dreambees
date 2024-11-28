# Firestore Security Rules

This document outlines our Firestore security rules implementation, which coordinates with Clerk authentication to ensure proper data access control.

## Overview

Our Firestore security rules are designed to:
- Enforce user authentication through Clerk
- Protect user data by ensuring users can only access their own data
- Validate data structure and content
- Prevent unauthorized access to collections and documents

## Structure

The rules are organized into several sections:

```javascript
// User data access
match /users/{userId} {
  // Only allow users to access their own data
  allow read: if isOwner(userId);
  allow write: if isOwner(userId);
  
  // Videos subcollection
  match /videos/{videoId} { ... }
  
  // Collections subcollection
  match /collections/{collectionId} { ... }
}
```

## Helper Functions

We use several helper functions to enforce security:

```javascript
// Check if user is authenticated
function isAuthenticated() {
  return request.auth != null;
}

// Check if user is accessing their own data
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

// Validate timestamp format
function isValidTimestamp(timestamp) {
  return timestamp is timestamp || 
         (timestamp is string && timestamp.matches('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*Z$'));
}
```

## Testing

We maintain comprehensive tests for our security rules:

1. Run tests locally:
```bash
npm run test:rules
```

2. Run tests with emulator:
```bash
npm run test:rules:with-emulator
```

3. Validate rules before deployment:
```bash
npm run validate:rules
```

## CI/CD

Our GitHub Actions workflow automatically:
1. Validates rules syntax
2. Runs security tests
3. Deploys rules to production (on main branch)

## Development Workflow

When modifying security rules:

1. Update `firestore.rules`
2. Add/update tests in `scripts/test-firestore-rules.js`
3. Run validation and tests locally
4. Create PR for review
5. Wait for CI checks to pass
6. Merge to deploy

## Common Patterns

### User Data Access
```javascript
match /users/{userId} {
  allow read, write: if isOwner(userId);
}
```

### Collection Access
```javascript
match /users/{userId}/collections/{collectionId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && isValidCollection();
  allow update: if isOwner(userId) && isValidCollectionUpdate();
  allow delete: if isOwner(userId);
}
```

### Data Validation
```javascript
function isValidCustomData(data) {
  return data is map && (
    !('theme' in data) || data.theme in ['light', 'dark', 'system']
  ) && (
    !('notificationsEnabled' in data) || data.notificationsEnabled is bool
  );
}
```

## Integration with Clerk

Our rules work with Clerk authentication by:
1. Using Clerk user IDs as Firestore document IDs
2. Verifying authentication state through Firebase custom tokens
3. Maintaining consistent user sessions across platforms

## Deployment

Rules are automatically deployed through our CI/CD pipeline when changes are merged to main. To deploy manually:

```bash
npm run deploy:rules
```

## Security Considerations

1. Always use `isAuthenticated()` check
2. Validate all input data
3. Use granular permissions
4. Test edge cases
5. Keep rules simple and maintainable

## Troubleshooting

Common issues and solutions:

1. **Authentication Errors**
   - Verify Clerk session
   - Check Firebase custom token
   - Ensure proper initialization

2. **Permission Denied**
   - Check user ID matches
   - Verify rule conditions
   - Test with emulator

3. **Validation Errors**
   - Review data structure
   - Check validation functions
   - Use emulator debug logs

## Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Clerk Documentation](https://clerk.dev/docs)
- [Testing Rules](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
