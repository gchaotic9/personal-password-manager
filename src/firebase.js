import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  doc,
  getFirestore,
  getDoc,
  writeBatch,
  collection,
  getDocs,
} from "firebase/firestore";

import { getFunctions, httpsCallable } from "firebase/functions";

const CryptoJS = require("crypto-js");

// import {
//   initializeAppCheck,
//   ReCaptchaV3Provider,
//   getToken,
// } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyA3pL18gW3Ts88QX93bFhwmruuXLYmVKAo",
  authDomain: "personal-pm-98268.firebaseapp.com",
  databaseURL: "https://personal-pm-98268-default-rtdb.firebaseio.com",
  projectId: "personal-pm-98268",
  storageBucket: "personal-pm-98268.appspot.com",
  messagingSenderId: "507153717923",
  appId: "1:507153717923:web:192d2eff57f54195f4fd16",
  measurementId: "G-59QL5BNCX4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions();
const db = getFirestore();

// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("6LciglofAAAAAD8hjB0f5kYV809r-t30PI8rYAQz"),

//   // Optional argument. If true, the SDK automatically refreshes App Check
//   // tokens as needed.
//   isTokenAutoRefreshEnabled: true,
// });
// Firebase functions

const googleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    return `error: ${err.code}`;
  }
};

const signInToPersonalPMAccount = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    return `error: ${err.code}`;
  }
};

const createPersonalPMAccount = async (email, password) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    return `error: ${err.code}`;
  }
};

// Cloud functions
const checkIfMFATokenIsCorrect = async (
  hashedSetMasterPassValue,
  enteredMFAToken
) => {
  const checkMFACF = httpsCallable(functions, "checkIfMFATokenIsCorrect");
  const checkMFACFReturn = await checkMFACF({
    userUID: auth.currentUser.uid,
    hashedSetMasterPassValue: hashedSetMasterPassValue,
    enteredMFAToken: enteredMFAToken,
  });
  const mfaIsCorrect = checkMFACFReturn.data.enteredMFAIsCorrect;
  return mfaIsCorrect;
};

const disableMFA = async () => {
  const disableMFACF = httpsCallable(functions, "disableMFA");
  const disableMFAReturn = await disableMFACF({
    userUID: auth.currentUser.uid,
  });
  return disableMFAReturn;
};

const enableMFA = async (mfaSecretHex, hashedSetMasterPassValue) => {
  const enableMFA = httpsCallable(functions, "enableMFA");
  const enableMFACF = await enableMFA({
    mfaSecretHex: mfaSecretHex,
    hashedSetMasterPassValue: hashedSetMasterPassValue,
    userUID: auth.currentUser.uid,
  });
  return enableMFACF;
};

const updateMasterPassword = async (
  hashedCurrentMasterPassword,
  hashedNewMasterPassword,
  newRandomStringEncrypted
) => {
  const updateMasterPassword = httpsCallable(functions, "updateMasterPassword");
  const updateResult = await updateMasterPassword({
    userUID: auth.currentUser.uid,
    currentMPH: hashedCurrentMasterPassword,
    newMPH: hashedNewMasterPassword,
    newRandomStringEncrypted: newRandomStringEncrypted,
  });
  return updateResult;
};

const decryptUserQueries = async (hashedSetMasterPassValue) => {
  const decryptUserQueriesCF = httpsCallable(functions, "decryptUserQueries");
  const finalDecryptedQueryReturn = await decryptUserQueriesCF({
    hashedSetMasterPassValue: hashedSetMasterPassValue,
    userUID: auth.currentUser.uid,
  });
  console.log(finalDecryptedQueryReturn);
  const listOfDecryptedObjectsAndIDs = finalDecryptedQueryReturn.data.finalList;
  return listOfDecryptedObjectsAndIDs;
};

const addUserQuery = async (
  objectToAdd,
  hashedSetMasterPassValue,
  linkIsThere,
  id
) => {
  const addUserQuery = httpsCallable(functions, "addUserQuery");

  const finalEncryptedAddedQueryReturn = await addUserQuery({
    objectToAdd: objectToAdd,
    hashedSetMasterPassValue: hashedSetMasterPassValue,
    userUID: auth.currentUser.uid,
    isLink: linkIsThere,
    randomID: id,
  });
  return finalEncryptedAddedQueryReturn;
};

const updateUserQuery = async (
  objectToUpdate,
  hashedSetMasterPassValue,
  sourceRefID,
  importedData
) => {
  const updateUserQuery = httpsCallable(functions, "updateRawData");

  return await updateUserQuery({
    objectToUpdate: objectToUpdate,
    hashedSetMasterPassValue: hashedSetMasterPassValue,
    sourceRefID: sourceRefID,
    userUID: auth.currentUser.uid,
    isLink: objectToUpdate.isLink,
    randomID: importedData.random,
  });
};

const givePRole = async () => {
  const givePRole = httpsCallable(functions, "givePRole");
  return await givePRole({ uid: auth.currentUser.uid });
};
// End of cloud functions

const signOutUser = async () => {
  return await signOut(auth);
};

const checkForMFA = async () => {
  const mfaDoc = await getDoc(
    doc(db, "users", "filler", auth.currentUser.uid, "mfa")
  );

  const mfaSecretHex = mfaDoc.data().hex;
  console.log("SEHE: ", mfaSecretHex);

  if (mfaSecretHex.trim() == "") {
    return false;
  } else if (mfaSecretHex.trim() != "") {
    return true;
  }
};

const checkIfMasterPasswordExists = async () => {
  let refForMainUID = doc(db, "users", "filler", auth.currentUser.uid, "mpaps");
  const tempSnap = await getDoc(refForMainUID);
  const tempSnapExists = tempSnap.exists();
  console.log("temp snap exists: ", tempSnapExists);
  if (tempSnapExists) {
    return true;
  } else if (!tempSnapExists) {
    return false;
  }
};

const generateRandomString = (length) => {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result; // Returns a VERY long random id
};

const hashString = async (str) => {
  // Couldn't resolve a polyfill error with the CryptoJS module so I used this instead
  // Hashes string with sha-512
  // From stackoverflow: https://stackoverflow.com/questions/55926281/how-do-i-hash-a-string-using-javascript-with-sha512-algorithm
  const buf = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder("utf-8").encode(str)
  );
  return Array.prototype.map
    .call(new Uint8Array(buf), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
};

const uploadMasterPassword = async (requestedMasterPassword) => {
  const refForMSCheck = collection(
    /* This collection stores a string that is encrypted with the
  master pass. When the user logs in, it checks to see if the hash of the master password
  the user entered can be used to decrypt the string that is stored here. If it can,
  that means the master pass they entered is correct. If the decryption returns
  a blank string or an error, that means it is the wrong master password */
    db,
    "users",
    "filler",
    auth.currentUser.uid,
    "mpaps",
    "ms"
  );
  let refForMainUID = doc(db, "users", "filler", auth.currentUser.uid, "mpaps");

  const masterPassHash = await hashString(requestedMasterPassword);

  const randomStringToBeEncrypted = generateRandomString(250); // See line 220 for details
  const randomEncryptedString = CryptoJS.AES.encrypt(
    // Encrypting the random string with the master pass hash as the key
    randomStringToBeEncrypted,
    masterPassHash
  ).toString();

  const batch = writeBatch(db);
  batch.set(doc(refForMSCheck), {
    mph: randomEncryptedString, // See line 220 for details
  });
  batch.set(refForMainUID, {
    // We are using the .exists() method to check if the user already has a master pass setup or not. Adding this will make the .exists() method return true
    fillData: "--",
  });
  await batch.commit();
};

const checkifMasterPasswordIsCorrect = async (requestedMasterPassword) => {
  let receivedMPH;
  let randomDecryptedString;
  /* receivedMPH is a string stored in the database that has been encrypted
  with the hash of the master password. If the hash of the master password that the user is trying to login with
  is able to decrypt the string, that means the entered master password is correct */

  const refForMSCheck = collection(
    /* This collection stores a string that is encrypted with the
  master pass. When the user logs in, it checks to see if the hash of the master password
  the user entered can be used to decrypt the string that is stored here. If it can,
  that means the master pass they entered is correct. If the decryption returns
  a blank string or an error, that means it is the wrong master password */
    db,
    "users",
    "filler",
    auth.currentUser.uid,
    "mpaps",
    "ms"
  );

  const docSnapGetEncryptedString = await getDocs(refForMSCheck);
  docSnapGetEncryptedString.forEach((doc) => {
    receivedMPH = doc.data().mph;
  });
  const masterPasswordHash = await hashString(requestedMasterPassword);
  try {
    randomDecryptedString = CryptoJS.AES.decrypt(
      // Encrypting the random string with the master pass hash as the key
      receivedMPH,
      masterPasswordHash
    ).toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.log(err, masterPasswordHash);
    return false;
  }
  if (randomDecryptedString.trim() == "") {
    return false;
  } else {
    return true;
  }
};

export {
  signInToPersonalPMAccount,
  createPersonalPMAccount,
  googleSignIn,
  signOutUser,
  checkForMFA,
  checkIfMasterPasswordExists,
  uploadMasterPassword,
  generateRandomString,
  hashString,
  checkifMasterPasswordIsCorrect,
};

export {
  // Cloud functions
  checkIfMFATokenIsCorrect,
  disableMFA,
  enableMFA,
  updateMasterPassword,
  decryptUserQueries,
  addUserQuery,
  updateUserQuery,
  givePRole,
};
export const firebaseAuth = auth;
export const FSDB = db;
export default app;
