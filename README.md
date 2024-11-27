# DreamBees Video Generator

A Nuxt.js application for AI-powered video generation, combining image processing, text generation, and video composition.

## Setup

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Firebase project
- AWS account with MediaConvert access
- Redis instance (Upstash)
- RabbitMQ instance
- OpenAI API access

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
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NUXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
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

- Redis configuration (Upstash)
```env
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

- RabbitMQ configuration
```env
RABBITMQ_URL=your_rabbitmq_url
```

Note: Firebase Admin credentials are handled through the service account key file in credentials/firebase-service-account.json

### Development
Start the development environment:
```bash
npm run dev:all
```

This command uses concurrently to start:
- Nuxt development server (`npm run dev`)
- Background worker for processing tasks (`npm run worker:dev`)

### Testing
The project includes several test scripts:
```bash
npm run create:test-user    # Create a test user in Firebase
npm run test:auth          # Test authentication flow
npm run test:queue         # Test queue processing
npm run test:queue:all     # Test queue with worker
```

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

### Core Technologies
- Frontend: Nuxt 3 with Vue 3 and Tailwind CSS
- State Management: Pinia
- Authentication: Firebase Authentication
- Backend: Node.js with Firebase Admin SDK
- Image Processing: Sharp
- Video Processing: AWS MediaConvert
- Queue System: RabbitMQ
- Cache: Redis (Upstash)
- AI Services: OpenAI for text generation
- CDN: AWS CloudFront

### Video Generation Pipeline
1. Image upload and processing with Sharp
2. AI-powered script generation using OpenAI
3. Audio generation and processing
4. Subtitle generation and synchronization
5. Video composition with AWS MediaConvert
6. Content delivery through CloudFront CDN

### System Components
- Nuxt.js frontend application
- Background worker for processing tasks
- Queue-based job processing system
- Distributed caching with Redis
- Cloud storage with AWS S3
- Video processing with MediaConvert
- Real-time updates through Firebase

## Security
- Protected API routes with Firebase Authentication
- Secure credential management
- Environment-based configuration
- AWS IAM role-based access
- Redis token authentication
- Firestore security rules

## Troubleshooting

### Firebase Authentication
If you encounter authentication issues:
1. Verify the service account file is in place
2. Check environment variables match Firebase settings
3. Ensure the service account has required permissions
4. Verify Firebase configuration in the client

### Worker Issues
If the background worker isn't processing:
1. Check RabbitMQ connection
2. Verify Redis connectivity
3. Ensure AWS credentials are valid
4. Check worker logs for errors

### Common Issues
- "Failed to initialize Firebase": Check service account and environment variables
- "Queue connection failed": Verify RabbitMQ URL and credentials
- "Redis connection error": Check Redis URL and token
- "AWS MediaConvert error": Verify AWS credentials and roles
