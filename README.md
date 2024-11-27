# DreamBees Video Generator

A Nuxt.js application for AI-powered video generation, combining image processing, text generation, and video composition.

## Setup

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Firebase project
- AWS account with MediaConvert access
- Redis instance (Upstash)
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

### AWS Setup

#### S3 and CloudFront Configuration
1. Create an S3 bucket with the following directory structure:
   - /images - For uploaded images
   - /audio - For generated audio files
   - /subtitles - For generated subtitle files
   - /output - For final video output

2. Create a CloudFront Origin Access Control (OAC):
```json
{
    "Name": "video-generator-oac",
    "Description": "OAC for video generator S3 bucket",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
}
```

3. Create a CloudFront distribution:
   - Origin: Your S3 bucket
   - Origin access: Use the created OAC
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Cache policy: 
     - MinTTL: 3600 seconds
     - DefaultTTL: 86400 seconds
     - MaxTTL: 31536000 seconds
   - Compress objects automatically: Yes
   - Price class: Use all edge locations
   - HTTP version: HTTP/2
   - Enable IPv6: Yes

4. Update your S3 bucket policy to allow CloudFront access:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipalReadOnly",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": [
                "arn:aws:s3:::your-bucket/images/*",
                "arn:aws:s3:::your-bucket/audio/*",
                "arn:aws:s3:::your-bucket/subtitles/*",
                "arn:aws:s3:::your-bucket/output/*"
            ],
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::your-account-id:distribution/your-distribution-id"
                }
            }
        },
        {
            "Sid": "AllowMediaConvertRole",
            "Effect": "Allow",
            "Principal": {
                "Service": "mediaconvert.amazonaws.com"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket/images/*",
                "arn:aws:s3:::your-bucket/audio/*",
                "arn:aws:s3:::your-bucket/subtitles/*",
                "arn:aws:s3:::your-bucket/output/*"
            ]
        }
    ]
}
```

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
- Cache: Redis (Upstash)
- AI Services: OpenAI for text generation
- Content Delivery: AWS CloudFront with Origin Access Control

### Video Generation Pipeline
1. Image upload and processing with Sharp
2. AI-powered script generation using OpenAI
3. Audio generation and processing
4. Subtitle generation and synchronization
5. Video composition with AWS MediaConvert
6. Content delivery through CloudFront CDN with secure access

### System Components
- Nuxt.js frontend application
- Background worker for processing tasks
- Redis-based job queue system
- Distributed caching with Redis
- Cloud storage with AWS S3
- Video processing with MediaConvert
- Real-time updates through Firebase
- Secure content delivery through CloudFront

## Security
- Protected API routes with Firebase Authentication
- Secure credential management
- Environment-based configuration
- AWS IAM role-based access
- Redis token authentication
- Firestore security rules
- CloudFront Origin Access Control for S3
- HTTPS-only content delivery

## Troubleshooting

### Firebase Authentication
If you encounter authentication issues:
1. Verify the service account file is in place
2. Check environment variables match Firebase settings
3. Ensure the service account has required permissions
4. Verify Firebase configuration in the client

### AWS Services
If you encounter AWS-related issues:
1. Verify AWS credentials and region
2. Check S3 bucket permissions
3. Ensure CloudFront distribution is enabled
4. Verify MediaConvert endpoint and role
5. Check CloudFront OAC configuration

### Common Issues
- "Failed to initialize Firebase": Check service account and environment variables
- "S3 access denied": Verify bucket policy and CloudFront OAC setup
- "Redis connection error": Check Redis URL and token
- "AWS MediaConvert error": Verify AWS credentials and roles
- "Content not accessible": Check CloudFront distribution status and OAC configuration
