# Contributing to DreamBees

Thank you for your interest in contributing to DreamBees! This document provides guidelines and instructions for contributing, with a special focus on security considerations.

## Security First

Given our integration of Clerk authentication with Firebase, security is a top priority. Always consider:

1. Authentication flows
2. Data access patterns
3. Security rules
4. Index optimization

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dreambees.git
cd dreambees
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up Firebase:
```bash
npm run setup:firebase
```

## Development Workflow

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Start development servers:
```bash
npm run dev:all
```

3. Make your changes
4. Run tests
5. Create pull request

## Testing

Always run the full test suite before submitting:

```bash
# Run all tests
npm run test:all

# Test specific components
npm run test:rules
npm run test:auth
npm run test:queue:all
```

## Security Considerations

### 1. Authentication

When working with authentication:
- Test both Clerk and Firebase auth flows
- Verify token handling
- Check session management
- Test error scenarios

### 2. Firestore Rules

When modifying rules:
1. Update `firestore.rules`
2. Add tests in `scripts/test-firestore-rules.js`
3. Run validation:
```bash
npm run validate:rules
```
4. Test thoroughly:
```bash
npm run test:rules:with-emulator
```

### 3. Firestore Indexes

When modifying indexes:
1. Update `firestore.indexes.json`
2. Validate changes:
```bash
npm run validate:indexes
```
3. Compare with production:
```bash
npm run firebase:diff-indexes
```

## Code Style

- Follow existing patterns
- Use TypeScript
- Add JSDoc comments
- Keep functions focused
- Write clear commit messages

## Documentation

Update documentation when you:
- Add new features
- Modify security rules
- Change indexes
- Update dependencies

Key documentation:
- [Firebase Security](docs/FIREBASE_SECURITY.md)
- [Firestore Rules](docs/FIRESTORE_RULES.md)
- [Firestore Indexes](docs/FIRESTORE_INDEXES.md)

## Pull Request Process

1. **Branch Naming**
   - `feature/` for new features
   - `fix/` for bug fixes
   - `security/` for security updates
   - `docs/` for documentation

2. **PR Description**
   - Clear description
   - Security implications
   - Testing performed
   - Screenshots if relevant

3. **Checklist**
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Security rules validated
   - [ ] Indexes optimized
   - [ ] No sensitive data
   - [ ] CI/CD passes

4. **Review Process**
   - Code review
   - Security review
   - Performance review
   - Documentation review

## Security Review

Security-related changes require:
1. Security impact analysis
2. Threat modeling
3. Test coverage
4. Senior developer review

## Performance Considerations

Always consider:
1. Query performance
2. Index usage
3. Data access patterns
4. Resource utilization

## Release Process

1. Version bump
2. Changelog update
3. Security review
4. Deployment approval
5. Staged rollout

## Getting Help

- Check documentation
- Ask in issues
- Join discussions
- Contact maintainers

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Contact

- Security issues: security@yourdomain.com
- General questions: support@yourdomain.com
- Maintainers: maintainers@yourdomain.com

## Acknowledgments

Thank you to all contributors who help make DreamBees better!
