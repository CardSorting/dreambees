# DreamBees Video Generator

## Setup

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Firebase project
- AWS account with MediaConvert access
- Redis instance (Upstash)
- RabbitMQ instance

### Installation
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Firebase Setup
1. Run the Firebase credentials setup script:
```bash
npm run setup:firebase
```

2. Set up Firebase service account:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded JSON file as `firebase-service-account.json`
   - Move the file to the `credentials` directory created by the setup script
   - The file path should be: `credentials/firebase-service-account.json`

3. Verify the setup:
   - The credentials directory should be created
   - The service account file should be in place
   - The .gitignore file should include credentials/*.json

### Environment Variables
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in the required environment variables:
- Firebase configuration (from Firebase Console > Project Settings)
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

- AWS configuration
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket
AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain
AWS_MEDIACONVERT_ENDPOINT=your_endpoint
AWS_MEDIACONVERT_ROLE=your_role_arn
```

- Redis configuration
```env
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

- RabbitMQ configuration
```env
RABBITMQ_URL=your_rabbitmq_url
```

### Development
Run the development server:
```bash
npm run dev:all
```

This will start:
- Nuxt development server
- Background worker for processing tasks

### Production
Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

## Architecture

### Components
- Frontend: Nuxt.js application
- Backend: Node.js with Firebase Admin SDK
- Video Processing: AWS MediaConvert
- Queue System: RabbitMQ
- Cache: Redis (Upstash)

### Authentication
- Client-side: Firebase Authentication
- Server-side: Firebase Admin SDK with service account credentials
- Protected API routes with middleware validation

### Video Generation
1. Image upload and validation
2. Script generation from image
3. Audio generation from script
4. Subtitle generation and synchronization
5. Video composition with AWS MediaConvert
6. Result delivery through CloudFront CDN

## Security
- All API routes are protected with Firebase Authentication
- Service account credentials are stored securely
- Environment variables for sensitive configuration
- AWS resources accessed through IAM roles

## Troubleshooting

### Firebase Authentication
If you encounter authentication issues:
1. Verify the service account file is in the correct location
2. Check the file permissions
3. Ensure the service account has the necessary Firebase Admin SDK permissions
4. Verify the environment variables match your Firebase project settings

### Common Issues
- "Failed to initialize Firebase Admin": Check service account file location
- "Permission denied": Verify service account permissions
- "Invalid credential": Ensure service account key is valid and complete
