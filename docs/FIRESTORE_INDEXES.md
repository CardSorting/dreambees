# Firestore Indexes Management

This document outlines how we manage and maintain Firestore indexes in coordination with our Clerk authentication system.

## Overview

Our Firestore indexes are designed to:
- Optimize query performance for common operations
- Support complex queries across collections
- Enable efficient filtering and sorting
- Minimize costs through careful index planning

## Index Structure

Our indexes are organized into two main categories:

### Single-Field Indexes
```json
{
  "collectionGroup": "videos",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### Composite Indexes
```json
{
  "collectionGroup": "videos",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "collectionId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

## Management Tools

We provide several tools for managing indexes:

1. Validation:
```bash
npm run validate:indexes
```

2. Compare with production:
```bash
npm run firebase:get-indexes
npm run firebase:diff-indexes
```

3. Deployment:
```bash
npm run deploy:indexes
```

## Development Workflow

When modifying indexes:

1. Update `firestore.indexes.json`
2. Run validation
3. Compare with production
4. Test queries locally
5. Create PR for review
6. Deploy through CI/CD

## Common Patterns

### Video Queries
```json
{
  "collectionGroup": "videos",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### Collection Queries
```json
{
  "collectionGroup": "collections",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    },
    {
      "fieldPath": "videoCount",
      "order": "DESCENDING"
    }
  ]
}
```

## Field Overrides

We use field overrides for special cases:

```json
{
  "collectionGroup": "videos",
  "fieldPath": "status",
  "indexes": [
    {
      "order": "ASCENDING",
      "queryScope": "COLLECTION"
    },
    {
      "order": "DESCENDING",
      "queryScope": "COLLECTION"
    }
  ]
}
```

## Cost Optimization

To optimize costs:

1. Use composite indexes sparingly
2. Remove unused indexes
3. Monitor query patterns
4. Use field overrides when appropriate

## Monitoring

Monitor index usage through:
1. Firebase Console
2. Query performance metrics
3. Cost reports

## CI/CD Integration

Our GitHub Actions workflow:

1. Validates index configuration
2. Compares with production
3. Deploys changes automatically
4. Reports deployment status

## Troubleshooting

Common issues and solutions:

1. **Missing Index Errors**
   - Check index configuration
   - Verify deployment status
   - Use Firebase console to create missing indexes

2. **Performance Issues**
   - Review query patterns
   - Check index usage
   - Consider composite indexes

3. **Deployment Failures**
   - Verify syntax
   - Check permissions
   - Review deployment logs

## Best Practices

1. **Index Planning**
   - Plan indexes based on query patterns
   - Consider future query needs
   - Document index purposes

2. **Performance**
   - Use composite indexes for complex queries
   - Avoid over-indexing
   - Monitor query performance

3. **Maintenance**
   - Regularly review index usage
   - Remove unused indexes
   - Keep documentation updated

## Resources

- [Firebase Indexing Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Query Performance Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Index Management CLI](https://firebase.google.com/docs/firestore/query-data/indexing#use_the_firebase_cli)

## Scripts Reference

### validate-firestore-indexes.js
Validates index configuration and estimates costs.

### diff-firestore-indexes.js
Compares local and production indexes.

### Deployment Commands
```bash
# Deploy all Firestore configurations
npm run deploy:firestore

# Deploy only indexes
npm run deploy:indexes

# Validate before deployment
npm run predeploy:indexes
```

## Security Considerations

1. **Access Control**
   - Indexes respect security rules
   - No sensitive data in index fields
   - Regular security audits

2. **Cost Control**
   - Monitor index usage
   - Remove unnecessary indexes
   - Use field overrides efficiently

## Maintenance Schedule

1. Weekly:
   - Review index usage
   - Check query performance

2. Monthly:
   - Clean up unused indexes
   - Update documentation

3. Quarterly:
   - Full index audit
   - Cost optimization review
