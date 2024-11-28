const firebase = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const projectId = 'dreambees-test';

/**
 * Creates a test environment with the given authentication.
 */
function getTestEnv(auth) {
  return firebase.initializeTestApp({ projectId, auth }).firestore();
}

/**
 * Creates an admin environment.
 */
function getAdminEnv() {
  return firebase.initializeAdminApp({ projectId }).firestore();
}

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    // Load the rules file
    const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
    await firebase.loadFirestoreRules({
      projectId,
      rules
    });
  });

  afterAll(async () => {
    await Promise.all(firebase.apps().map(app => app.delete()));
  });

  afterEach(async () => {
    await firebase.clearFirestoreData({ projectId });
  });

  // Test user data access
  describe('User Profile', () => {
    const userId = 'user123';
    const userProfile = {
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customData: {
        theme: 'dark',
        notificationsEnabled: true,
        displayName: 'Test User'
      }
    };

    test('can read own profile', async () => {
      const db = getTestEnv({ uid: userId });
      const userRef = db.collection('users').doc(userId);
      await firebase.assertSucceeds(userRef.get());
    });

    test('cannot read other user profile', async () => {
      const db = getTestEnv({ uid: 'other-user' });
      const userRef = db.collection('users').doc(userId);
      await firebase.assertFails(userRef.get());
    });

    test('can create valid profile', async () => {
      const db = getTestEnv({ uid: userId });
      const userRef = db.collection('users').doc(userId);
      await firebase.assertSucceeds(userRef.set(userProfile));
    });

    test('cannot create profile with invalid theme', async () => {
      const db = getTestEnv({ uid: userId });
      const userRef = db.collection('users').doc(userId);
      const invalidProfile = {
        ...userProfile,
        customData: { ...userProfile.customData, theme: 'invalid' }
      };
      await firebase.assertFails(userRef.set(invalidProfile));
    });
  });

  // Test video access
  describe('Videos', () => {
    const userId = 'user123';
    const videoData = {
      url: 'https://example.com/video.mp4',
      createdAt: new Date().toISOString()
    };

    test('can create valid video', async () => {
      const db = getTestEnv({ uid: userId });
      const videoRef = db.collection(`users/${userId}/videos`).doc('video123');
      await firebase.assertSucceeds(videoRef.set(videoData));
    });

    test('cannot create video with invalid URL', async () => {
      const db = getTestEnv({ uid: userId });
      const videoRef = db.collection(`users/${userId}/videos`).doc('video123');
      const invalidVideo = { ...videoData, url: 'invalid-url' };
      await firebase.assertFails(videoRef.set(invalidVideo));
    });

    test('cannot access other user videos', async () => {
      const db = getTestEnv({ uid: 'other-user' });
      const videoRef = db.collection(`users/${userId}/videos`).doc('video123');
      await firebase.assertFails(videoRef.get());
    });
  });

  // Test collection access
  describe('Collections', () => {
    const userId = 'user123';
    const collectionData = {
      name: 'My Collection',
      createdAt: new Date().toISOString(),
      videoCount: 0
    };

    test('can create valid collection', async () => {
      const db = getTestEnv({ uid: userId });
      const collectionRef = db.collection(`users/${userId}/collections`).doc('col123');
      await firebase.assertSucceeds(collectionRef.set(collectionData));
    });

    test('cannot create collection with empty name', async () => {
      const db = getTestEnv({ uid: userId });
      const collectionRef = db.collection(`users/${userId}/collections`).doc('col123');
      const invalidCollection = { ...collectionData, name: '' };
      await firebase.assertFails(collectionRef.set(invalidCollection));
    });

    test('cannot create collection with negative video count', async () => {
      const db = getTestEnv({ uid: userId });
      const collectionRef = db.collection(`users/${userId}/collections`).doc('col123');
      const invalidCollection = { ...collectionData, videoCount: -1 };
      await firebase.assertFails(collectionRef.set(invalidCollection));
    });
  });
});
