// Firebase configuration and build tracking
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, increment } = require('firebase/firestore');

// Firebase configuration - this is the config for the Z-Editor project, you can use it for your needs, but know, i will change it for release lol.
const firebaseConfig = {
  apiKey: "AIzaSyCPPLIoFbU7wv06RTHmKDytiXheLCRMHMA",
  authDomain: "z-editor-2085b.firebaseapp.com",
  projectId: "z-editor-2085b",
  storageBucket: "z-editor-2085b.firebasestorage.app",
  messagingSenderId: "818275224067",
  appId: "1:818275224067:web:f705d39814a7ca075b5c36",
  measurementId: "G-M1ETTTRJFH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Отправка информации о сборке в Firebase
 * @param {Object} buildInfo - Информация о сборке из about.json
 * @param {Object} analyticsSettings - Настройки пользователя относительно аналитики
 * @returns {Promise<void>}
 */
async function trackBuildInFirebase(buildInfo, analyticsSettings = { basicAnalytics: null, systemAnalytics: null }) {
  try {
    // Если аналитика отключена пользователем, ничего не отправляем
    if (analyticsSettings.basicAnalytics === false) {
      console.log('Analytics disabled by user. No data will be sent.');
      return;
    }

    // Create a data object that only includes what the user has allowed
    const dataToSend = createDataDiff(buildInfo, analyticsSettings);
    console.log('Sending analytics with diff:', dataToSend);

    // Check if this build has been tracked before
    const buildsRef = collection(db, 'builds');
    const q = query(buildsRef, where('buildCode', '==', dataToSend.buildCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // New build, add to collection
      await addDoc(buildsRef, {
        ...dataToSend,
        firstSeen: new Date(),
        installCount: 1
      });
      console.log('New build tracked in Firebase');
    } else {
      // Existing build, update the counter
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        installCount: increment(1),
        lastSeen: new Date()
      });
      console.log('Existing build counter updated in Firebase');
    }
  } catch (error) {
    console.error('Error tracking build in Firebase:', error);
  }
}

/**
 * Creates a data object that only includes what the user has allowed
 * @param {Object} buildInfo - Complete build information
 * @param {Object} analyticsSettings - User's analytics preferences
 * @returns {Object} Filtered data object
 */
function createDataDiff(buildInfo, analyticsSettings) {
  // Always include these fields if basic analytics is enabled
  let dataToSend = {};
  
  // If basic analytics is enabled (or null which means default/yes)
  if (analyticsSettings.basicAnalytics !== false) {
    dataToSend = {
      version: buildInfo.version,
      channel: buildInfo.channel,
      fullVersion: buildInfo.fullVersion,
      buildCode: buildInfo.buildCode,
      buildDate: buildInfo.buildDate,
      currentOS: buildInfo.currentOS, // OS name without details
      platform: buildInfo.platform || buildInfo.buildCode.split('+')[1]?.split('.')[0] || null
    };
  }
  
  // Include system information only if system analytics is enabled
  if (analyticsSettings.systemAnalytics === true) {
    dataToSend = {
      ...dataToSend,
      os: buildInfo.os, // Detailed OS info
      architecture: buildInfo.architecture,
      screenResolution: getScreenResolution()
    };
  }
  
  // Add machine ID only if basic analytics is enabled (for tracking unique installs)
  if (analyticsSettings.basicAnalytics !== false) {
    dataToSend.machineId = getMachineId();
  }
  
  return dataToSend;
}

// Helper functions for analytics
/**
 * Gets the current screen resolution
 * @returns {string} Screen resolution as WIDTHxHEIGHT
 */
function getScreenResolution() {
  try {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    return `${width}x${height}`;
  } catch (error) {
    console.error('Error getting screen resolution:', error);
    return 'unknown';
  }
}

/**
 * Gets an anonymous machine ID for tracking unique installs
 * @returns {string} Machine ID hash
 */
function getMachineId() {
  try {
    const { machineIdSync } = require('node-machine-id');
    const crypto = require('crypto');
    // Create a hashed version of the machine ID to ensure anonymity
    const hashedId = crypto.createHash('sha256')
      .update(machineIdSync())
      .digest('hex')
      .substring(0, 12); // Use only first 12 chars
    return hashedId;
  } catch (error) {
    console.error('Error getting machine ID:', error);
    // Fallback to a random ID if we can't get the machine ID
    return Math.random().toString(36).substring(2, 15);
  }
}

module.exports = {
  trackBuildInFirebase,
  // Include any other exported functions
}; 