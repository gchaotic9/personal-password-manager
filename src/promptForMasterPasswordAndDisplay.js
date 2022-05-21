// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.4/firebase-app.js";
// import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.4/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged,
  getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/9.6.4/firebase-auth.js";

import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
} from "https://www.gstatic.com/firebasejs/9.6.4/firebase-app-check.js";

import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.4/firebase-functions.js";

import {
  doc,
  setDoc,
  getFirestore,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  startAfter,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/9.6.4/firebase-firestore.js";

// import {} from "nw.js";

const crypto = require("crypto");
const CryptoJS = require("crypto-js");

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3pL18gW3Ts88QX93bFhwmruuXLYmVKAo",
  authDomain: "personal-pm-98268.firebaseapp.com",
  projectId: "personal-pm-98268",
  storageBucket: "personal-pm-98268.appspot.com",
  messagingSenderId: "507153717923",
  appId: "1:507153717923:web:192d2eff57f54195f4fd16",
  measurementId: "G-59QL5BNCX4",
};
// Initialize Firebase

export let hashedSetMasterPassValue; // Exporting the hash of the master password to encrypt and decrypt

try {
  try {
    nw.App.clearCache();
    const app = initializeApp(firebaseConfig);
    console.log("running");
    nw.App.clearCache();
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        "6LciglofAAAAAD8hjB0f5kYV809r-t30PI8rYAQz"
      ),

      // Optional argument. If true, the SDK automatically refreshes App Check
      // tokens as needed.
      isTokenAutoRefreshEnabled: true,
    });
    console.log("ran");
  } catch (err) {
    console.log(err);
  }
  const db = getFirestore(); // Changed from getDatabase() to getFirestore()
  async function mainInit() {
    // async function waitForAuth() {
    //   return getAuth();
    // }

    const auth = await getAuth();
    const functions = await getFunctions();
    let initiated = false; // Using this to check if the auth token has been refreshed or not
    onAuthStateChanged(auth, async (mainUser) => {
      if (!initiated) {
        if (mainUser) {
          async function generateRandomString(length) {
            let result = "";
            let characters =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
              result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
              );
            }
            return result; // Returns a VERY long random id
          }
          // Checks if user is signed in
          initiated = true; // Setting this to true makes it so this wont run again when the reauth happens
          const mainUser = auth.currentUser;
          let openUrlObject =
            {}; /* This is where we store the links that open when 
          the user clicks on the icon for a query. The reason this is being stored in an object is
          because if the user decides to update the link, we can just update the object. The
          object will contain the randomID of the query as the key, and the url as the value*/
          let currentEncryptedString = "";
          const randomStringToBeEncrypted = await generateRandomString(250); // See line 145 for details
          mainUser.getIdTokenResult().then((res) => {
            // Checking if user a free trial, premium, or admin
            console.log("Res is: ", res);
            console.log("Claims are: ", res.claims);
            const aStatus = res.claims.a;
            const pStatus = res.claims.p;
            const ftStatus = res.claims.ft;
            if (aStatus || pStatus) {
              // Adding premium css if paid member or admin
              let premiumStyles = `
              #titleHeader {
                background: linear-gradient(to right, #fedb37 0%, #fdb931 8%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              `;
              let premiumStyleSheet = document.createElement("style");
              premiumStyleSheet.innerHTML = premiumStyles;
              document.head.appendChild(premiumStyleSheet);
            }
          });
          const init = async () => {
            let userUID = mainUser.uid;
            console.log(userUID);
            let originalMarginTop = 0.0;
            let refForMainUID = doc(db, "users", "filler", userUID, "mpaps");

            let refForMSCheck = collection(
              /* This collection stores a string that is encrypted with the
            master pass. When the user logs in, I check to see if the master password
            the enter can be used to decrypt the string that is stored here. If it can,
            that means the master pass they entered is correct. If the decryption returns
            a blank string, that means it is the wrong master password*/
              db,
              "users",
              "filler",
              userUID,
              "mpaps",
              "ms"
            );
            let refForPS = query(
              collection(db, "users", "filler", userUID, "mpaps", "ps"),
              orderBy("nummy", "desc") // "Nummy" is just the timestamp of creation
            );

            async function checkIfEnteredMPIsCorrect(enteredMP) {
              let receivedMPH; // This is the random string that is encrypted with the master pass
              // See line 145 for more details
              if (currentEncryptedString.trim() == "") {
                const docSnapGetEncryptedString = await getDocs(refForMSCheck);
                console.log("got it again on line 144 (getDocs)");
                docSnapGetEncryptedString.forEach((doc) => {
                  receivedMPH = doc.data().mph;
                });
                currentEncryptedString = receivedMPH;
                console.log("THE CES: ", currentEncryptedString);
                console.log("THE MINI RMPH: ", receivedMPH);
              } else {
                receivedMPH = currentEncryptedString;
                console.log("THE RMPH: ", receivedMPH);
              }

              const hashedEnteredMasterPassword = crypto
                .createHash("sha512")
                .update(enteredMP)
                .digest("hex");
              const decryptedMPString = CryptoJS.AES.decrypt(
                receivedMPH,
                hashedEnteredMasterPassword
              ).toString(CryptoJS.enc.Utf8);
              console.log("LOG: ", decryptedMPString);
              if (decryptedMPString.trim().length == 0) {
                return false;
              } else {
                return true;
              }
            }

            const writeBlankDataToFS = async () => {
              // This is for the exists method to work
              // It wont't regognize the doc if it doesn't have any set data
              const docRefForUID = await setDoc(refForMainUID, {
                fillData: "--",
              })
                .then(() => {
                  console.log("set Doc line 160");
                  alert("Data added successfully");
                })
                .catch((err) => {
                  alert("Error has been logged");
                  console.log(err);
                });
              // WRITE
            };
            const writeStringEncryptedWithMPToFS = async (
              stringEncryptedWithHash
            ) => {
              // See line 145 for details
              const docRefForUID = await addDoc(refForMSCheck, {
                mph: stringEncryptedWithHash,
              })
                .then(() => {
                  console.log("add Doc line 176");
                  alert("Data added successfully");
                })
                .catch((err) => {
                  alert("Error has been logged");
                  console.log(err);
                });
            };
            const dimAbleToDarken = () => {
              Array.from(
                document
                  .getElementById("ableToDarken")
                  .getElementsByTagName("div")
              ).forEach((cv) => {
                cv.style.opacity = "0.7";
              });
            };
            const resetDimAbleToDarken = () => {
              Array.from(
                document
                  .getElementById("ableToDarken")
                  .getElementsByTagName("div")
              ).forEach((cv) => {
                cv.style.opacity = "1";
              });
            };

            const changeMPWindow = Array.from(
              document.getElementsByClassName("changeMasterPasswordScreen")
            )[0];

            changeMPWindow.addEventListener("animationend", (ani) => {
              let aniName = ani.animationName;
              if (aniName == "pushOutMPTab") {
                changeMPWindow.style.padding = "3%";
                changeMPWindow.style.width = "37%";
                Array.from(
                  document.getElementsByClassName("changeMasterPasswordHeader")
                )[0].style.display = "initial";
                Array.from(
                  document.getElementsByClassName("changeMPInputsContainer")
                )[0].style.display = "flex";
                Array.from(
                  document.getElementsByClassName("changeMPFooter")
                )[0].style.display = "flex";
                Array.from(
                  document.getElementsByClassName(
                    "closeChangeMasterPasswordWindow"
                  )
                )[0].style.display = "initial";
              } else if (aniName == "pullInMPTab") {
                changeMPWindow.style.padding = "0%";
                changeMPWindow.style.width = "0%";
                Array.from(
                  document.getElementsByClassName("changeMasterPasswordHeader")
                )[0].style.display = "none";
                Array.from(
                  document.getElementsByClassName("changeMPInputsContainer")
                )[0].style.display = "none";
                Array.from(
                  document.getElementsByClassName("changeMPFooter")
                )[0].style.display = "none";
                Array.from(
                  document.getElementsByClassName(
                    "closeChangeMasterPasswordWindow"
                  )
                )[0].style.display = "none";
              }
            });

            const showChangeMPWindow = () => {
              changeMPWindow.style.animation = "pushOutMPTab 0.3s ease";
            };
            const hideChangeMPWindow = () => {
              changeMPWindow.style.animation = "pullInMPTab 0.3s ease";
            };
            // Testing security rules here

            // getDoc(
            //   doc(db, "users", "filler", "RNxt4drrCLg2QSVA8KbQhcCuvLp1", "r")
            // ).then((tempSnap) => {
            //   console.log("YOHOHOHOH ", tempSnap);
            // });
            const checkIfUIDExistsInFS = async () => {
              getDoc(refForMainUID)
                .then((tempSnap) => {
                  console.log("get Doc line 214");
                  console.log("temp is ", tempSnap);
                  console.log("If snap exists or not is ", tempSnap.exists());
                  if (tempSnap.exists()) {
                    // If statement checking if user already has a Master Password
                    console.log(tempSnap.data(), " exists!");
                    document.body.style.pointerEvents = "none";
                    document.getElementById(
                      "setupMasterPasswordScreen"
                    ).style.display = "initial";
                    document.getElementById(
                      "setupMasterPasswordScreen"
                    ).style.pointerEvents = "auto";
                    document.body.style.opacity = ".65";
                    document.getElementById(
                      "createMasterPasswordHeader"
                    ).textContent = "Enter Master Password";
                    document.getElementById(
                      "passwordStrengthBar"
                    ).style.display = "none";
                    document.getElementById(
                      "reenterPasswordStrengthBar"
                    ).style.display = "none";
                    document.getElementById(
                      "confirmMasterPasswordButton"
                    ).style.marginTop = "10%";
                    document.getElementById(
                      "confirmMasterPasswordButton"
                    ).textContent = "Login to Personal PM";
                    document.getElementById("newMasterPasswordField").id =
                      "newAndEnterMasterPasswordField";
                    document.getElementById(
                      "confirmMasterPasswordButton"
                    ).style.marginTop = "5%";
                    document.getElementById(
                      "newAndEnterMasterPasswordField"
                    ).style.border = "none";
                    document.getElementById(
                      "newAndEnterMasterPasswordField"
                    ).style.borderBottom = "1px solid teal";

                    document.getElementById("renterMP").style.display = "none";

                    //----------------------Check if master password is correct----------------------//
                    async function checkRequestedMP() {
                      let rawRequest = document.getElementById(
                        "newAndEnterMasterPasswordField"
                      ).value;
                      const masterPasswordIsCorrect =
                        await checkIfEnteredMPIsCorrect(rawRequest);
                      if (masterPasswordIsCorrect) {
                        // Master password is correct and user is logged in

                        const hashedValueOfCorrectMP = crypto
                          .createHash("sha512")
                          .update(rawRequest)
                          .digest("hex");
                        hashedSetMasterPassValue = hashedValueOfCorrectMP; /* 
                        Just making a variable that has the correct hash of the
                        master password */

                        let orderNumber =
                          -10000; /* This negative number is for making updated
                        queries go to the top of the page. The more negative order number an
                        element has, the higher it will go on the page. This number will -1
                        everytime an query gets updated so that if another query gets updated
                        after, it will go even higher than the previously updated one*/
                        document.getElementById(
                          "setupMasterPasswordScreen"
                        ).style.display = "none";
                        document.body.style.pointerEvents = "auto";
                        document.body.style.opacity = "1";
                        // Add settings option
                        function ieSettingsFunction() {
                          document
                            .getElementById("settingsButton")
                            .addEventListener("click", () => {
                              document.body.style.userSelect = "none";
                              document.getElementById(
                                "settingsScreen"
                              ).style.userSelect = "auto";
                              document.body.style.pointerEvents = "none";
                              document.getElementById(
                                "headerFlexbox"
                              ).style.opacity = ".5";
                              document.getElementById(
                                "queryScreen"
                              ).style.opacity = ".5";
                              document.getElementById(
                                "settingsScreen"
                              ).style.display = "flex";
                              document.getElementById(
                                "settingsScreen"
                              ).style.pointerEvents = "auto";
                              document.getElementById(
                                "settingsScreen"
                              ).style.opacity = "1";
                            });
                          document
                            .getElementById("closeSettings")
                            .addEventListener("click", () => {
                              document.body.style.userSelect = "auto";
                              document.getElementById(
                                "settingsScreen"
                              ).style.userSelect = "none";
                              document.body.style.pointerEvents = "auto";
                              document.body.style.opacity = "1";
                              document.getElementById(
                                "headerFlexbox"
                              ).style.opacity = "1";
                              document.getElementById(
                                "queryScreen"
                              ).style.opacity = "1";
                              document.getElementById(
                                "settingsScreen"
                              ).style.display = "none";
                              document.getElementById(
                                "settingsScreen"
                              ).style.pointerEvents = "none";
                              document.getElementById(
                                "settingsScreen"
                              ).style.opacity = "1";
                            });
                        }
                        ieSettingsFunction();

                        // CODE UNDERNEATH IS FOR INSIDE THE SETTINGS PAGE
                        const changeMasterPasswordSettingsButton = Array.from(
                          document.getElementsByClassName(
                            "changeMasterPassword"
                          )
                        )[0];
                        const closeChangeMasterPasswordTabButton = Array.from(
                          document.getElementsByClassName(
                            "closeChangeMasterPasswordWindow"
                          )
                        )[0];
                        const logOutSettingsButton = Array.from(
                          document.getElementsByClassName("logOutOfPMAccount")
                        )[0];

                        logOutSettingsButton.addEventListener("click", () => {
                          document.getElementById("fromPMToMain").click();
                        });

                        changeMasterPasswordSettingsButton.addEventListener(
                          "click",
                          () => {
                            showChangeMPWindow();
                          }
                        );

                        closeChangeMasterPasswordTabButton.addEventListener(
                          "click",
                          () => {
                            hideChangeMPWindow();
                          }
                        );

                        Array.from(
                          document.getElementsByClassName(
                            "confirmMasterPasswordChange"
                          )
                        )[0].addEventListener("click", async () => {
                          // Listener to change master password
                          const arrayOfChangeMPInputBoxes = Array.from(
                            document.getElementsByClassName("changeMPInput")
                          );
                          const enterCurrentMPInputBox =
                            arrayOfChangeMPInputBoxes[0];
                          const enterNewMPInputBox =
                            arrayOfChangeMPInputBoxes[1];
                          const reEnterNewMPInputBox =
                            arrayOfChangeMPInputBoxes[2];

                          // Use CF for this
                          const updateMasterPassword = httpsCallable(
                            functions,
                            "updateMasterPassword"
                          );
                          await updateMasterPassword({
                            userUID: userUID,
                          });
                        });

                        // Listener to show and hide password text
                        Array.from(
                          document.getElementsByClassName(
                            "showNewMPPasswordsButton"
                          )
                        )[0].addEventListener("click", () => {
                          /* Here im checking the type of the first input box (out of the three that show up in the change master pass window) 
                          If it is text I change it to password (and the other way around) I could of checked for any of 
                          the input boxes, but they would all be the same since im changing the type for them all at once */

                          const currentInputType = Array.from(
                            document.getElementsByClassName("changeMPInput")
                          )[0].type;
                          const arrayOfInputBoxesToCheck = Array.from(
                            document.getElementsByClassName("changeMPInput")
                          );
                          if (currentInputType == "password") {
                            arrayOfInputBoxesToCheck[0].type = "text";
                            arrayOfInputBoxesToCheck[1].type = "text";
                            arrayOfInputBoxesToCheck[2].type = "text";
                          } else if (currentInputType == "text") {
                            arrayOfInputBoxesToCheck[0].type = "password";
                            arrayOfInputBoxesToCheck[1].type = "password";
                            arrayOfInputBoxesToCheck[2].type = "password";
                          }

                          document
                            .getElementById("showPasswordsIcon")
                            .classList.toggle("fa-eye-slash");
                        });

                        // Add settings option (end)
                        // await getDocs(refForPS).then(async (docSnapp) => {
                        console.log("get Docs line 314");
                        // Getting each object of each user query and putting them in an array
                        // The array gets sent to a cloud function to be decrypted
                        // The cloud function will return all of the decrypted objects
                        console.log(
                          "THE HASSSSSSSSSHHHHHHHHHHH: ",
                          hashedSetMasterPassValue
                        );
                        console.log("(AND UID): ", userUID);
                        const decryptUserQueriesCF = httpsCallable(
                          functions,
                          "decryptUserQueries"
                        );

                        const finalDecryptedQueryReturn =
                          await decryptUserQueriesCF({
                            hashedSetMasterPassValue: hashedSetMasterPassValue,
                            userUID: userUID,
                          });
                        const listOfDecryptedObjectsAndIDs =
                          finalDecryptedQueryReturn.data.finalList;
                        /* The "listOfDecryptedObjectsAndIDs" is a list with lists containing an object of a doc and its doc id
                        Ex. 
                        [
                          [{user: randomUser, pass: randomPass}, randomID],
                          [{user: randomUser, pass: randomPass}, randomID],
                          [{user: randomUser, pass: randomPass}, randomID]
                        ]
                        */
                        listOfDecryptedObjectsAndIDs.forEach(async (e) => {
                          let docToShow;
                          let docToShowID;
                          e.forEach((i) => {
                            if (typeof i == "object") {
                              docToShow = i;
                            } else if (typeof i == "string") {
                              docToShowID = i;
                            }
                          });
                          const docToShowRef = doc(
                            db,
                            "users",
                            "filler",
                            userUID,
                            "mpaps",
                            "ps",
                            docToShowID
                          );
                          await startUpShow(docToShow, docToShowRef);
                        });

                        async function startUpShow(sourceDoc, sourceDocRef) {
                          const importedData = sourceDoc;
                          console.log("THE REFREF IS: ", sourceDocRef);
                          console.log("IMPORTED DATA IS.... ", importedData);

                          let rawRandomID;
                          function getDecryptedID() {
                            rawRandomID = importedData.random;
                          }
                          getDecryptedID();

                          let mainDiv = document.createElement("div");
                          mainDiv.setAttribute("id", `mainDiv${rawRandomID}`);
                          mainDiv.style.marginTop = `${originalMarginTop}%`;
                          document
                            .getElementById("queryScreen")
                            .appendChild(mainDiv);
                          document
                            .getElementById(`mainDiv${rawRandomID}`)
                            .classList.add("mainDivClass");
                          ////////
                          let infoDiv = document.createElement("div");
                          infoDiv.setAttribute("id", `infoDiv${rawRandomID}`);
                          document
                            .getElementById(`mainDiv${rawRandomID}`)
                            .appendChild(infoDiv);
                          document
                            .getElementById(`infoDiv${rawRandomID}`)
                            .classList.add("infoDiv");
                          let line = document.createElement("div");
                          // let divForSection = document.createElement("div");
                          line.setAttribute("id", `line${rawRandomID}`);
                          // line.style.marginTop = `${originalMarginTop}%`;
                          document
                            .getElementById(`mainDiv${rawRandomID}`)
                            .appendChild(line);
                          document
                            .getElementById(`line${rawRandomID}`)
                            .classList.add("queryLine");
                          // Subinfo span is for everything except the three toggles
                          let subInfoSpan = document.createElement("span");
                          subInfoSpan.setAttribute(
                            "id",
                            `subInfoSpan${rawRandomID}`
                          );
                          subInfoSpan.setAttribute("class", `subInfoSpan`);
                          document
                            .getElementById(`infoDiv${rawRandomID}`)
                            .appendChild(subInfoSpan);
                          //
                          if (importedData.isLink == "true") {
                            async function addLetterBox() {
                              console.log("Its been true");
                              let icon = document.createElement("img");
                              let websiteLink = importedData.directLink;
                              if (
                                websiteLink.substring(0, 5) == "http:" ||
                                websiteLink.substring(0, 6) == "https:" ||
                                websiteLink.substring(0, 7) == "http://" ||
                                websiteLink.substring(0, 8) == "https://"
                              ) {
                                icon.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${websiteLink}&size=48`;
                              } else {
                                icon.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${websiteLink}&size=48`;
                              }

                              icon.style.marginBottom = "-1%";
                              icon.setAttribute("id", `icon${rawRandomID}`);
                              document
                                .getElementById(`subInfoSpan${rawRandomID}`)
                                .appendChild(icon);
                              document
                                .getElementById(`icon${rawRandomID}`)
                                .classList.add("linkIcons");
                              console.log("Its been true end");
                            }
                            addLetterBox();
                          } else {
                            let listOfColors = [
                              "#198582",
                              "#3d3dad",
                              "#830a08",
                              "#ffa800",
                              "#626f7a",
                            ];
                            async function addLetterBox() {
                              // console.log("Its been false");
                              let firstLetterOfAppName = importedData.website;
                              firstLetterOfAppName =
                                firstLetterOfAppName[0].toUpperCase();
                              console.log(
                                "First letter is ",
                                firstLetterOfAppName
                              );
                              let letterBox = document.createElement("div");
                              letterBox.style.backgroundColor =
                                listOfColors[
                                  Math.floor(
                                    Math.random() * listOfColors.length
                                  )
                                ];
                              letterBox.setAttribute(
                                "id",
                                `letterBox${rawRandomID}`
                              );
                              let letterBoxLetter =
                                document.createElement("h4");
                              letterBoxLetter.textContent =
                                firstLetterOfAppName;
                              letterBoxLetter.setAttribute(
                                "id",
                                `letterBoxLetter${rawRandomID}`
                              );
                              document
                                .getElementById(`subInfoSpan${rawRandomID}`)
                                .appendChild(letterBox);
                              document
                                .getElementById(`letterBox${rawRandomID}`)
                                .appendChild(letterBoxLetter);
                              document
                                .getElementById(`letterBox${rawRandomID}`)
                                .classList.add("letterLinkIcons");
                              document
                                .getElementById(`letterBoxLetter${rawRandomID}`)
                                .classList.add("letterBoxLetter");
                              console.log("Its been false end");
                            }
                            addLetterBox();
                          }
                          ///////////////////////////////////////////////////////////////////////////////////////////
                          async function createThreeContainerHolder() {
                            let threeToggles = document.createElement("div");
                            threeToggles.setAttribute("class", "tholder");
                            threeToggles.id = `threeToggles${rawRandomID}`;
                            document
                              .getElementById(`infoDiv${rawRandomID}`)
                              .appendChild(threeToggles);
                          }
                          async function showUserAndPass() {
                            let shownAppName = document.createElement("input");
                            let decryptedShownAppName = importedData.website;
                            shownAppName.value =
                              decryptedShownAppName.charAt(0).toUpperCase() +
                              decryptedShownAppName.slice(1);
                            // if (importedData.isLink == "true") {
                            // } else {
                            //   shownAppName.style.marginLeft = "13%";
                            // }
                            shownAppName.readOnly = true;
                            shownAppName.setAttribute(
                              "id",
                              `shownAppName${rawRandomID}`
                            );

                            document
                              .getElementById(`subInfoSpan${rawRandomID}`)
                              .appendChild(shownAppName);
                            document
                              .getElementById(`shownAppName${rawRandomID}`)
                              .classList.add("shownAppName");
                            if (importedData.isLink == "true") {
                              document.getElementById(
                                `icon${rawRandomID}`
                              ).style.cursor = "pointer";
                            }
                            let shownEmail = document.createElement("input");
                            shownEmail.value = importedData.email;
                            shownEmail.setAttribute(
                              "id",
                              `shownEmail${rawRandomID}`
                            );
                            shownEmail.readOnly = true;
                            document
                              .getElementById(`subInfoSpan${rawRandomID}`)
                              .appendChild(shownEmail);
                            document
                              .getElementById(`shownEmail${rawRandomID}`)
                              .classList.add("shownEmail");
                          }
                          async function requestUpdateQueryFunction() {
                            document
                              .getElementById(`mainDiv${rawRandomID}`)
                              .addEventListener("click", async (clickedEvt) => {
                                if (
                                  // This if statement checks if a query is clicked
                                  // If a query is clicked, it will launch an update screen for it
                                  clickedEvt.target.className.includes(
                                    "infoDiv"
                                  ) ||
                                  clickedEvt.target.className.includes(
                                    "mainDivClass"
                                  ) ||
                                  clickedEvt.target.className.includes(
                                    "shownAppName"
                                  ) ||
                                  clickedEvt.target.className.includes(
                                    "shownEmail"
                                  )
                                ) {
                                  //
                                  async function checkIfUpdateScreenExists() {
                                    let arrayOfExistingUpdateScreens = [];
                                    async function createAndAddUpdatesCheckList() {
                                      Array.from(
                                        // mc is the main container for the dashboard
                                        Array.from(
                                          document.getElementsByClassName("mc")
                                        )[0].children
                                      ).forEach((eleS) => {
                                        if (eleS.tagName == "SPAN") {
                                          if (eleS.id != "ableToDarken") {
                                            // If the element is a span, and the ID of it is not "ableToDarken", then the element is an update tab
                                            // "eleS" will have 2 child elements
                                            // The first one is the update tab, and the second is the confirm delete popup

                                            arrayOfExistingUpdateScreens.push(
                                              Array.from(eleS.children)[0].id
                                            );
                                          }
                                        }
                                      });
                                    }
                                    async function confirmUpdateList() {
                                      if (
                                        arrayOfExistingUpdateScreens.includes(
                                          `updateQueryScreen${rawRandomID}`
                                        )
                                      ) {
                                        return true;
                                      } else {
                                        return false;
                                      }
                                    }
                                    await createAndAddUpdatesCheckList();
                                    return await confirmUpdateList();
                                  }
                                  async function showNewUpdateScreen() {
                                    let updateExists =
                                      await checkIfUpdateScreenExists();
                                    if (updateExists) {
                                      // Will run if an update tab for a query has already been created
                                      console.log("true");
                                      document.getElementById(
                                        `updateQueryScreen${rawRandomID}`
                                      ).style.animation = "";
                                      document.getElementById(
                                        `updateQueryScreen${rawRandomID}`
                                      ).style.animation =
                                        "pushOutUpdateTab 0.3s ease";
                                      document
                                        .getElementById(
                                          `updateQueryScreen${rawRandomID}`
                                        )
                                        .classList.remove("prototype"); // Removing this class indicates that the update tab has been opened before
                                      // document.getElementById(
                                      //   "ableToDarken"
                                      // ).style.animation = "fadeSlight 0.25s ease";
                                      dimAbleToDarken();
                                    } else if (updateExists == false) {
                                      // Code to run when creating a new update tab
                                      // This is created when the user clicks on a query the first time to edit it
                                      // If the user closes out of the update tab then clicks on the SAME query to edit it again, then this else if statement won't run
                                      console.log("false");
                                      const mcParent = Array.from(
                                        document.getElementsByClassName("mc")
                                      )[0];

                                      // Adding html of new update tab
                                      // Added the prototype class to the first line of the html below
                                      // Use this class to tell when the first time the update tab is being opened
                                      // This is useful when we add the click event listener for the save and cancel buttons
                                      // Will get rid of prototype class in the if statement above (when we open the update tab and it has already been opened before)

                                      // The prototype class is also added to the edit button when it is clicked the first time
                                      let htmlOfNewUpdateScreen = `
                              <div id="updateQueryScreen${rawRandomID}" class="updateQueryScreen prototype uce">
                                <table id="queryInfoTable${rawRandomID}" class="queryInfoTable uce">
                                  <thead class="uce">
                                    <tr class="uce">
                                      <td class="uce">
                                        <img id="updateScreenIcon${rawRandomID}" class="updateScreenIcon uce" src="" alt="" />
                                      </td>
                                    </tr>
                                    <tr class="uce">
                                      <td class="uce">
                                        <h2 id="updateScreenQueryNameHeader${rawRandomID}" class="updateScreenQueryNameHeader uce"></h2>
                                      </td>
                                    </tr>
                                  </thead>
                                  <tbody class="uce">
                                    <tr class="uce">
                                      <td class="uce">
                                        <div id="strongUpdateDisplayTextNameContainer${rawRandomID}" class="strongUpdateDisplayTextContainer strongUpdateDisplayTextNameContainer uce">
                                          <input
                                          class="strongUpdateDisplayText strongUpdateDisplayTextName uce"
                                          id="strongUpdateDisplayTextName${rawRandomID}" readonly
                                          ></input>
                                          <small class="smallUpdateDisplayText uce">Name</small>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr class="uce">
                                      <td class="uce">
                                        <div id="strongUpdateDisplayTextEmailContainer${rawRandomID}" class="strongUpdateDisplayTextContainer strongUpdateDisplayTextEmailContainer uce">
                                          <input
                                          class="strongUpdateDisplayText strongUpdateDisplayTextEmail uce"
                                          id="strongUpdateDisplayTextEmail${rawRandomID}" readonly
                                          ></input>
                                          <small class="smallUpdateDisplayText uce">Email</small>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr class="uce">
                                      <td class="uce">
                                        <div id="strongUpdateDisplayTextPasswordContainer${rawRandomID}" class="strongUpdateDisplayTextContainer strongUpdateDisplayTextPasswordContainer uce">
                                          <input
                                          class="strongUpdateDisplayText strongUpdateDisplayTextPassword uce"
                                          id="strongUpdateDisplayTextPassword${rawRandomID}" readonly
                                          ></input>
                                          <small class="smallUpdateDisplayText uce">Password</small>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr class="uce">
                                      <td class="uce">
                                        <div id="strongUpdateDisplayTextURLContainer${rawRandomID}" class="strongUpdateDisplayTextContainer strongUpdateDisplayTextURLContainer uce">
                                          <input
                                            class="strongUpdateDisplayText strongUpdateDisplayTextURL uce"
                                            id="strongUpdateDisplayTextURL${rawRandomID}" readonly
                                          ></input>
                                          <small class="smallUpdateDisplayText uce">URL/Link</small>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                  <tfoot class="uce">
                                    <tr id="editRow${rawRandomID}" class="editRow uce">
                                      <td class="uce">
                                        <button id="editButtonUpdate${rawRandomID}" class="editButtonUpdate prototype uce">Edit</button>
                                      </td>
                                    </tr>
                                    <tr id="saveRow${rawRandomID}" class="saveRow uce">
                                      <td class="uce">
                                        <button id="saveButtonUpdate${rawRandomID}" class="saveButtonUpdate uce">Save</button>
                                      </td>
                                    </tr>
                                    <tr id="cancelRow${rawRandomID}" class="cancelRow uce">
                                      <td class="uce">
                                        <button id="cancelButtonUpdate${rawRandomID}" class="cancelButtonUpdate uce">Cancel</button>
                                      </td>
                                    </tr>
                                    <tr id="deleteRow${rawRandomID}" class="deleteRow uce">
                                        <td class="uce">
                                          <button id="deleteQueryButton${rawRandomID}" class="deleteQueryButton uce">Delete</button>
                                        </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              `;
                                      let updateHolder =
                                        document.createElement("span");
                                      updateHolder.innerHTML =
                                        htmlOfNewUpdateScreen;
                                      mcParent.appendChild(updateHolder);

                                      /* We are putting in the class "uce" so 
                                the update tab wil not disapper when the popup gets clicked*/

                                      // This is a "confirm delete" popup when a user deletes a query
                                      let htmlOfConfirmDeletePopup = `
                                <div id="cdel${rawRandomID}" class="cdel uce">
                                  <h2 id="askConfirmDelete${rawRandomID}" class="askConfirmDelete uce">Delete this item?</h2>
                                  <p id="delmessage${rawRandomID}" class="delmessage uce">Are you sure you want to delete this item?</p>
                                  <button id="yesdel${rawRandomID}" class="yesdel delConfirmAndCancel uce">Delete</button>
                                  <button id="canceldel${rawRandomID}" class="canceldel delConfirmAndCancel uce">Cancel</button>
                                </div>
                                `;

                                      // We want the popup to be in the same span tag as the update tab

                                      // Adding the popup to the span tag
                                      let confirmDeletePopup =
                                        document.createElement("span");
                                      confirmDeletePopup.innerHTML =
                                        htmlOfConfirmDeletePopup;
                                      updateHolder.appendChild(
                                        confirmDeletePopup
                                      );

                                      document.getElementById(
                                        `delmessage${rawRandomID}`
                                      ).textContent = `Are you sure you want to delete ${importedData.website}?`;

                                      // Listener to delete query that was added
                                      console.log("listener created");
                                      document
                                        .getElementById(`yesdel${rawRandomID}`) // Confirm delete button
                                        .addEventListener("click", async () => {
                                          console.log(
                                            "Delete button has been clicked"
                                          );
                                          await deleteDoc(sourceDocRef); // Deleting query
                                          console.log("A delete has been made");

                                          // Animation to delete query from main page
                                          document.getElementById(
                                            `mainDiv${rawRandomID}`
                                          ).style.animation =
                                            "fadeAway 0.3s ease";
                                          document
                                            .getElementById(
                                              `mainDiv${rawRandomID}`
                                            )
                                            .addEventListener(
                                              "animationend",
                                              () => {
                                                document.getElementById(
                                                  `mainDiv${rawRandomID}`
                                                ).style.display = "none";
                                              }
                                            );
                                          document // No need to also hide the confirm delete popup since the whole span will be deleted
                                            .getElementById(
                                              `updateQueryScreen${rawRandomID}`
                                            )
                                            .parentNode.remove();

                                          document.getElementById(
                                            "ableToDarken"
                                          ).style.pointerEvents = "auto"; // Allowing user to interact with background
                                          resetDimAbleToDarken(); // Undim screen
                                        });

                                      document
                                        .getElementById(
                                          `canceldel${rawRandomID}`
                                        )
                                        .addEventListener("click", () => {
                                          document.getElementById(
                                            // Hide confirm delete tab
                                            `cdel${rawRandomID}`
                                          ).style.display = "none";

                                          document.getElementById(
                                            // Push update tab back out
                                            `updateQueryScreen${rawRandomID}`
                                          ).style.animation =
                                            "pushOutUpdateTab 0.3s ease";
                                          document.getElementById(
                                            "ableToDarken"
                                          ).style.pointerEvents = "auto"; // Allowing user to interact with background
                                        });
                                      let deleteButton =
                                        document.getElementById(
                                          `deleteQueryButton${rawRandomID}`
                                        );
                                      deleteButton.addEventListener(
                                        "click",
                                        async () => {
                                          document.getElementById(
                                            `cdel${rawRandomID}`
                                          ).style.display = "initial";
                                          document.getElementById(
                                            `updateQueryScreen${rawRandomID}`
                                          ).style.animation =
                                            "pullInUpdateTab 0.3s ease";
                                          document.getElementById(
                                            "ableToDarken"
                                          ).style.pointerEvents = "none"; // Not allowing user to interact with background while delete popup is active
                                        }
                                      );

                                      // Animation listeners
                                      const updateInputFieldsForAniListeners = [
                                        document.getElementById(
                                          `strongUpdateDisplayTextName${rawRandomID}`
                                        ),
                                        document.getElementById(
                                          `strongUpdateDisplayTextEmail${rawRandomID}`
                                        ),
                                        document.getElementById(
                                          `strongUpdateDisplayTextPassword${rawRandomID}`
                                        ),
                                        document.getElementById(
                                          `strongUpdateDisplayTextURL${rawRandomID}`
                                        ),
                                      ];
                                      updateInputFieldsForAniListeners.forEach(
                                        (eleani) => {
                                          eleani.addEventListener(
                                            "animationend",
                                            (aniEvt) => {
                                              if (
                                                aniEvt.animationName ==
                                                "updateInputBoxesGlow"
                                              ) {
                                                eleani.style.boxShadow =
                                                  "rgb(255, 255, 255) 0px 0px 12px 1px";
                                              } else if (
                                                aniEvt.animationName ==
                                                "updateInputBoxesNormal"
                                              ) {
                                                eleani.style.boxShadow =
                                                  "0px 10px 30px 5px rgba(0, 0, 0.15)";
                                              }
                                            }
                                          );
                                        }
                                      );
                                      //
                                      document
                                        .getElementById(
                                          `updateQueryScreen${rawRandomID}`
                                        )
                                        .addEventListener(
                                          "animationend",
                                          (aniii) => {
                                            console.log(
                                              "the ani0 is ",
                                              aniii.animationName
                                            );
                                            if (
                                              aniii.animationName ==
                                              "pushOutUpdateTab"
                                            ) {
                                              document.getElementById(
                                                `updateQueryScreen${rawRandomID}`
                                              ).style.width = "40%";
                                            }
                                            if (
                                              aniii.animationName ==
                                              "pullInUpdateTab"
                                            ) {
                                              document.getElementById(
                                                `updateQueryScreen${rawRandomID}`
                                              ).style.width = "0%";
                                            }
                                            if (
                                              aniii.animationName ==
                                              "updateTabToDark"
                                            ) {
                                              console.log(
                                                "Its been to dark: ",
                                                aniii.animationName
                                              );
                                              document.getElementById(
                                                `updateQueryScreen${rawRandomID}`
                                              ).style.backgroundColor =
                                                "#0b0b0b";
                                            }
                                            if (
                                              aniii.animationName ==
                                              "updateTabToNormal"
                                            ) {
                                              document.getElementById(
                                                `updateQueryScreen${rawRandomID}`
                                              ).style.backgroundColor =
                                                "#0c1213";
                                            }
                                          }
                                        );
                                      // This won't excecute if the update tab has already been opened before because this runs in an else if statement that only excecutes of the update tab doesn't exist at all yet
                                      // setTimeout(() => {
                                      // Setting timeout because when click on query to open update tab, the click will register to open and close the tab right away because that same click will also trigger this listener to close the tab
                                      document // Listener to close update tab by clicking out of it
                                        .getElementById("htmlMain")
                                        .addEventListener(
                                          "mousedown",
                                          (updateClickEvt) => {
                                            if (
                                              updateClickEvt.target.className
                                                .split(" ")
                                                .includes("uce") //If an element is in the update tab box, it contains a class of "uce"
                                            ) {
                                              console.log("Contains uce");
                                            } else {
                                              if (
                                                // Doesn't do the animation if update tab is already closed in and not showing
                                                document.getElementById(
                                                  `updateQueryScreen${rawRandomID}`
                                                ).style.width == "40%"
                                              ) {
                                                console.log("no contain");
                                                if (
                                                  // Checking if update tab is in edit mode while trying to close the update tab
                                                  document.getElementById(
                                                    `cancelButtonUpdate${rawRandomID}`
                                                  ).style.display ==
                                                    "initial" &&
                                                  document.getElementById(
                                                    `saveButtonUpdate${rawRandomID}`
                                                  ).style.display ==
                                                    "initial" &&
                                                  document.getElementById(
                                                    `editButtonUpdate${rawRandomID}`
                                                  ).style.display == "none"
                                                ) {
                                                  console.log(
                                                    "Exiting edit mode..."
                                                  );
                                                  // Checking if update tab is in edit mode, send click event to cancel button to discard changes and go out of edit mode
                                                  document
                                                    .getElementById(
                                                      `cancelButtonUpdate${rawRandomID}`
                                                    )
                                                    .click();
                                                }
                                                let newUpdateTab =
                                                  document.getElementById(
                                                    `updateQueryScreen${rawRandomID}`
                                                  );
                                                newUpdateTab.style.animation =
                                                  "";
                                                newUpdateTab.style.animation =
                                                  "pullInUpdateTab 0.3s ease";
                                                resetDimAbleToDarken();
                                                // Array.from(
                                                //   document
                                                //     .getElementById(
                                                //       "ableToDarken"
                                                //     )
                                                //     .getElementsByTagName("div")
                                                // ).forEach((cv) => {
                                                //   cv.style.animation =
                                                //     "fadeBack 0.25s ease";
                                                // });
                                              }
                                            }
                                          }
                                        );
                                      // }, 200);

                                      async function listenForEditRequest() {
                                        console.log("Up here in func");
                                        console.log(
                                          "EDIT ELE SHOULD BE....... ",
                                          document.getElementById(
                                            `editButtonUpdate${rawRandomID}`
                                          )
                                        );
                                        document
                                          .getElementById(
                                            `editButtonUpdate${rawRandomID}`
                                          )
                                          .addEventListener("click", () => {
                                            // Checking if its the first time this edit button has been clicked
                                            let editButtonClickedFirstTime;
                                            if (
                                              Array.from(
                                                document.getElementById(
                                                  `editButtonUpdate${rawRandomID}`
                                                ).classList
                                              ).includes("prototype")
                                            ) {
                                              console.log("first time?");
                                              editButtonClickedFirstTime = true;
                                            } else {
                                              console.log("NOT FIRST TIME");
                                              editButtonClickedFirstTime = false;
                                            }

                                            console.log(
                                              "DA NAME... ",
                                              document.getElementById(
                                                `strongUpdateDisplayTextName${rawRandomID}`
                                              ).value
                                            );
                                            //
                                            let originalUpdateInputFields = {
                                              ogName: document.getElementById(
                                                `strongUpdateDisplayTextName${rawRandomID}`
                                              ).value,
                                              ogEmail: document.getElementById(
                                                `strongUpdateDisplayTextEmail${rawRandomID}`
                                              ).value,
                                              ogPass: document.getElementById(
                                                `strongUpdateDisplayTextPassword${rawRandomID}`
                                              ).value,
                                              ogLink: document
                                                .getElementById(
                                                  `strongUpdateDisplayTextURL${rawRandomID}`
                                                )
                                                .value.trim(),
                                            };

                                            // Making input fields editable
                                            document.getElementById(
                                              `strongUpdateDisplayTextName${rawRandomID}`
                                            ).readOnly = false;
                                            document.getElementById(
                                              `strongUpdateDisplayTextEmail${rawRandomID}`
                                            ).readOnly = false;
                                            document.getElementById(
                                              `strongUpdateDisplayTextPassword${rawRandomID}`
                                            ).readOnly = false;
                                            document.getElementById(
                                              `strongUpdateDisplayTextURL${rawRandomID}`
                                            ).readOnly = false;
                                            // Making input fields editable
                                            //
                                            const updateInputFields = [
                                              document.getElementById(
                                                `strongUpdateDisplayTextName${rawRandomID}`
                                              ),
                                              document.getElementById(
                                                `strongUpdateDisplayTextEmail${rawRandomID}`
                                              ),
                                              document.getElementById(
                                                `strongUpdateDisplayTextPassword${rawRandomID}`
                                              ),
                                              document.getElementById(
                                                `strongUpdateDisplayTextURL${rawRandomID}`
                                              ),
                                            ];

                                            // Listener adds light blue glow if any of the fields become different from the original values
                                            if (editButtonClickedFirstTime) {
                                              updateInputFields.forEach(
                                                (
                                                  updateQueryField,
                                                  queryFieldIndexIndentifer
                                                ) => {
                                                  updateQueryField.addEventListener(
                                                    "keyup",
                                                    () => {
                                                      // The order of "originalUpdateInputFields" and "updateInputFields" are both the same
                                                      // The are both name of query, email of query, password of query, URL of query
                                                      let ogValue =
                                                        Object.values(
                                                          originalUpdateInputFields
                                                        )[
                                                          queryFieldIndexIndentifer
                                                        ];
                                                      if (
                                                        // Checking if value of query field input box has changed
                                                        ogValue.trim() !=
                                                        updateQueryField.value
                                                      ) {
                                                        console.log(
                                                          "NOT EQUAL!!",
                                                          {
                                                            og: ogValue,
                                                            current:
                                                              updateQueryField.value,
                                                          }
                                                        );
                                                        // Light blue box shadow
                                                        updateQueryField.style.boxShadow =
                                                          "rgb(0 218 201) 0px 0px 12px 1px";
                                                      } else {
                                                        // Regular white glow box shadow
                                                        updateQueryField.style.boxShadow =
                                                          "rgb(255 255 255) 0px 0px 12px 1px";
                                                      }
                                                    }
                                                  );
                                                }
                                              );
                                            }

                                            //
                                            let saveButton =
                                              document.getElementById(
                                                `saveButtonUpdate${rawRandomID}`
                                              );
                                            let cancelButton =
                                              document.getElementById(
                                                `cancelButtonUpdate${rawRandomID}`
                                              );
                                            let editButtonUpdate =
                                              document.getElementById(
                                                `editButtonUpdate${rawRandomID}`
                                              );
                                            editButtonUpdate.style.display =
                                              "none";
                                            cancelButton.style.display =
                                              "initial";
                                            // Bug fix //
                                            Array.from(
                                              document.getElementsByClassName(
                                                "cancelButtonUpdate"
                                              )
                                            ).forEach((ele) => {
                                              ele.textContent = "Cancel";
                                            });
                                            // Bug fix //
                                            saveButton.style.display =
                                              "initial";

                                            if (editButtonClickedFirstTime) {
                                              // This is why the prototype class was added
                                              // Checks if this is the first time the update tab is being created
                                              // If this was just ran everytime the update tab was opened, the cancel button and save button click event listeners would stack and would get created multiple times
                                              // This could cause too many writes to the database
                                              console.log(
                                                "STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN STARTING UP LISTENERS AGAIN ....1"
                                              );
                                              cancelButton.addEventListener(
                                                "click",
                                                () => {
                                                  console.log(
                                                    "Should show once cancel"
                                                  );
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextName${rawRandomID}`
                                                  ).value =
                                                    originalUpdateInputFields.ogName;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextEmail${rawRandomID}`
                                                  ).value =
                                                    originalUpdateInputFields.ogEmail;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextPassword${rawRandomID}`
                                                  ).value =
                                                    originalUpdateInputFields.ogPass;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextURL${rawRandomID}`
                                                  ).value =
                                                    originalUpdateInputFields.ogLink;

                                                  // Making input fields NON editable
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextName${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextEmail${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextPassword${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextURL${rawRandomID}`
                                                  ).readOnly = true;
                                                  // Making input fields NON editable

                                                  // Reset visual properties
                                                  document.getElementById(
                                                    `updateQueryScreen${rawRandomID}`
                                                  ).style.animation =
                                                    "updateTabToNormal 0.4s ease";
                                                  updateInputFields.forEach(
                                                    (displayTextInputEle) => {
                                                      displayTextInputEle.style.animation =
                                                        "updateInputBoxesNormal 0.4s ease";
                                                    }
                                                  );
                                                  document.getElementById(
                                                    `saveButtonUpdate${rawRandomID}`
                                                  ).style.display = "none";
                                                  document.getElementById(
                                                    `cancelButtonUpdate${rawRandomID}`
                                                  ).style.display = "none";
                                                  document.getElementById(
                                                    `editButtonUpdate${rawRandomID}`
                                                  ).style.display = "initial";
                                                  // Reset visual properties
                                                }
                                              );
                                              saveButton.addEventListener(
                                                "click",
                                                () => {
                                                  // Making input fields NON editable
                                                  console.log(
                                                    "Save button has been clicked (should only show once)"
                                                  );
                                                  console.log(
                                                    "hh has happened save"
                                                  );
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextName${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextEmail${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextPassword${rawRandomID}`
                                                  ).readOnly = true;
                                                  document.getElementById(
                                                    `strongUpdateDisplayTextURL${rawRandomID}`
                                                  ).readOnly = true;
                                                  // Making input fields NON editable

                                                  let nameIsTheSame;
                                                  let emailIsTheSame;
                                                  let passIsTheSame;
                                                  let linkIsTheSame;

                                                  if (
                                                    originalUpdateInputFields.ogName ==
                                                    document.getElementById(
                                                      `strongUpdateDisplayTextName${rawRandomID}`
                                                    ).value
                                                  ) {
                                                    nameIsTheSame = true;
                                                  } else {
                                                    nameIsTheSame = false;
                                                  }
                                                  if (
                                                    originalUpdateInputFields.ogEmail ==
                                                    document.getElementById(
                                                      `strongUpdateDisplayTextEmail${rawRandomID}`
                                                    ).value
                                                  ) {
                                                    emailIsTheSame = true;
                                                  } else {
                                                    emailIsTheSame = false;
                                                  }
                                                  if (
                                                    originalUpdateInputFields.ogPass ==
                                                    document.getElementById(
                                                      `strongUpdateDisplayTextPassword${rawRandomID}`
                                                    ).value
                                                  ) {
                                                    passIsTheSame = true;
                                                  } else {
                                                    passIsTheSame = false;
                                                  }
                                                  if (
                                                    originalUpdateInputFields.ogLink ==
                                                    document
                                                      .getElementById(
                                                        `strongUpdateDisplayTextURL${rawRandomID}`
                                                      )
                                                      .value.trim()
                                                  ) {
                                                    linkIsTheSame = true;
                                                  } else {
                                                    linkIsTheSame = false;
                                                  }
                                                  // setTimeout(() => {
                                                  if (
                                                    // Checks if none of the values were changed so no need to send update request
                                                    nameIsTheSame &&
                                                    emailIsTheSame &&
                                                    passIsTheSame &&
                                                    linkIsTheSame
                                                  ) {
                                                    console.log(
                                                      "Will not update query"
                                                    );
                                                  } else {
                                                    // Code to update values
                                                    console.log(
                                                      "will update query"
                                                    );
                                                    console.log(
                                                      "A normal object: ",
                                                      {
                                                        hey: "oh hey",
                                                        bye: "oh ok bye",
                                                      }
                                                    );
                                                    let objectToUpdate = {}; // Contains all the values to be updated
                                                    async function loadingQueryUpdate() {
                                                      orderNumber -= 1; // Makes the query that is about to be updated go to the top of the screen when its done updating
                                                      objectToUpdate = {};

                                                      // Adding name to object to update
                                                      let newName =
                                                        document.getElementById(
                                                          `strongUpdateDisplayTextName${rawRandomID}`
                                                        ).value;
                                                      objectToUpdate.website =
                                                        newName;
                                                      //

                                                      // Adding email to object to update
                                                      let newEmail =
                                                        document.getElementById(
                                                          `strongUpdateDisplayTextEmail${rawRandomID}`
                                                        ).value;

                                                      objectToUpdate.email =
                                                        newEmail;
                                                      console.log(
                                                        "update doc line 1276"
                                                      );
                                                      //

                                                      // Adding pass to object to update
                                                      let newPass =
                                                        document.getElementById(
                                                          `strongUpdateDisplayTextPassword${rawRandomID}`
                                                        ).value;

                                                      objectToUpdate.pass =
                                                        newPass;
                                                      console.log(
                                                        "update Doc line 1302"
                                                      );
                                                      //

                                                      // Adding link is present boolean value to object to update
                                                      if (
                                                        document
                                                          .getElementById(
                                                            `strongUpdateDisplayTextURL${rawRandomID}`
                                                          )
                                                          .value.trim()
                                                          .length != 0
                                                      ) {
                                                        objectToUpdate.isLink =
                                                          "true";
                                                        console.log(
                                                          "update Doc line 1329"
                                                        );
                                                      } else if (
                                                        document
                                                          .getElementById(
                                                            `strongUpdateDisplayTextURL${rawRandomID}`
                                                          )
                                                          .value.trim()
                                                          .length == 0
                                                      ) {
                                                        objectToUpdate.isLink =
                                                          "false";
                                                        console.log(
                                                          "update doc line 1348"
                                                        );
                                                      }

                                                      // Adding link to object to update
                                                      let newLink =
                                                        document.getElementById(
                                                          `strongUpdateDisplayTextURL${rawRandomID}`
                                                        ).value;

                                                      objectToUpdate.directLink =
                                                        newLink;
                                                      console.log(
                                                        "update doc line 1366"
                                                      );

                                                      //
                                                    }
                                                    loadingQueryUpdate().then(
                                                      async () => {
                                                        /* The "original values" are what we
                                                            are using to determine wether or not
                                                            we should send the update request
                                                            through. Before the user clicks edit,
                                                            we get the values that are in the input
                                                            boxes. When the user clicks save, we 
                                                            check if the input boxes have stayed the
                                                            same. If they have, we don't send the update
                                                            request */

                                                        /* Here we are updating the "original
                                                            values" after the update. Because lets say
                                                            after this update, the user wants to update
                                                            the values back to how they were before.
                                                            The update will not go through because they
                                                            will be detected as the same as the original
                                                            values. So we have to change the "original values"
                                                            to what the values are after the update */

                                                        console.log(
                                                          "THIS IS THE THE THE THE THE LOGGG: ",
                                                          objectToUpdate
                                                        );

                                                        console.log(
                                                          "STRIGIFIED OBJECT TO UPDATE: ",
                                                          JSON.stringify(
                                                            objectToUpdate
                                                          )
                                                        );

                                                        console.log(
                                                          "ban: ",
                                                          sourceDocRef
                                                        );
                                                        const updateUserQuery =
                                                          httpsCallable(
                                                            functions,
                                                            "updateRawData"
                                                          );
                                                        let sourceRef =
                                                          sourceDocRef;

                                                        console.log(
                                                          "SENDING: ",
                                                          userUID
                                                        );

                                                        await updateUserQuery({
                                                          objectToUpdate:
                                                            objectToUpdate,
                                                          hashedSetMasterPassValue:
                                                            hashedSetMasterPassValue,
                                                          sourceRefID:
                                                            sourceRef.id,
                                                          userUID: userUID,
                                                          isLink:
                                                            objectToUpdate.isLink,
                                                          randomID:
                                                            importedData.random,
                                                        })
                                                          .then((result) => {
                                                            console.log(
                                                              "Sucess updateUserQuery"
                                                            );
                                                            console.log(result);
                                                            auth.currentUser
                                                              .getIdTokenResult(
                                                                true
                                                              )
                                                              .then(
                                                                (
                                                                  idTokenResult
                                                                ) => {
                                                                  console.log(
                                                                    "the result ",
                                                                    idTokenResult
                                                                  );
                                                                  console.log(
                                                                    "the result claims ",
                                                                    idTokenResult.claims
                                                                  );
                                                                  document.body.style.pointerEvents =
                                                                    "auto";
                                                                  document.body.style.opacity =
                                                                    "1";
                                                                }
                                                              );
                                                          })
                                                          .then(() => {
                                                            console.log(
                                                              "THIS IS THE THE THE THE THE LOGGG: ",
                                                              objectToUpdate
                                                            );
                                                            if (
                                                              !nameIsTheSame
                                                            ) {
                                                              // Changing the name of the query that shows up on the main dashboard to the updated one
                                                              document.getElementById(
                                                                `shownAppName${rawRandomID}`
                                                              ).value = document.getElementById(
                                                                `strongUpdateDisplayTextName${rawRandomID}`
                                                              ).value;

                                                              // Changing the name of the query that shows up in the update tab
                                                              document.getElementById(
                                                                `updateScreenQueryNameHeader${rawRandomID}`
                                                              ).textContent = document.getElementById(
                                                                `strongUpdateDisplayTextName${rawRandomID}`
                                                              ).value;
                                                            }
                                                            if (
                                                              !emailIsTheSame
                                                            ) {
                                                              // Changing the email of the query that shows up on the main dashboard to the updated one
                                                              document.getElementById(
                                                                `shownEmail${rawRandomID}`
                                                              ).value = document.getElementById(
                                                                `strongUpdateDisplayTextEmail${rawRandomID}`
                                                              ).value;
                                                            }

                                                            if (
                                                              !linkIsTheSame
                                                            ) {
                                                              console.log(
                                                                "LINK IS NOT THE SAME\nLINK IS NOT THE SAME\nLINK IS NOT THE SAME\nLINK IS NOT THE SAME\nLINK IS NOT THE SAME\n"
                                                              );
                                                              // Updating the icon being displayed
                                                              let newWebsiteLink =
                                                                document.getElementById(
                                                                  `strongUpdateDisplayTextURL${rawRandomID}`
                                                                ).value;
                                                              if (
                                                                newWebsiteLink.substring(
                                                                  0,
                                                                  5
                                                                ) == "http:" ||
                                                                newWebsiteLink.substring(
                                                                  0,
                                                                  6
                                                                ) == "https:" ||
                                                                newWebsiteLink.substring(
                                                                  0,
                                                                  7
                                                                ) ==
                                                                  "http://" ||
                                                                newWebsiteLink.substring(
                                                                  0,
                                                                  8
                                                                ) == "https://"
                                                              ) {
                                                                document.getElementById(
                                                                  `icon${rawRandomID}`
                                                                ).src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${newWebsiteLink.trim()}&size=96`;
                                                                document.getElementById(
                                                                  `updateScreenIcon${rawRandomID}`
                                                                ).src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${newWebsiteLink.trim()}&size=96`;
                                                              } else {
                                                                document.getElementById(
                                                                  `icon${rawRandomID}`
                                                                ).src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${newWebsiteLink.trim()}&size=96`;
                                                                document.getElementById(
                                                                  `updateScreenIcon${rawRandomID}`
                                                                ).src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${newWebsiteLink.trim()}&size=96`;
                                                              }

                                                              // Updating the link that gets opened when the user clicks on the icon
                                                              openUrlObject[
                                                                rawRandomID
                                                              ] =
                                                                newWebsiteLink.trim();
                                                              console.log(
                                                                "Updated object: ",
                                                                openUrlObject
                                                              );
                                                              console.log(
                                                                "Updated object for spec raw: ",
                                                                openUrlObject[
                                                                  rawRandomID
                                                                ]
                                                              );
                                                              console.log(
                                                                "ben: ",
                                                                openUrlObject[
                                                                  rawRandomID
                                                                ]
                                                              );
                                                            }
                                                            originalUpdateInputFields =
                                                              {
                                                                ogName:
                                                                  document.getElementById(
                                                                    `strongUpdateDisplayTextName${rawRandomID}`
                                                                  ).value,
                                                                ogEmail:
                                                                  document.getElementById(
                                                                    `strongUpdateDisplayTextEmail${rawRandomID}`
                                                                  ).value,
                                                                ogPass:
                                                                  document.getElementById(
                                                                    `strongUpdateDisplayTextPassword${rawRandomID}`
                                                                  ).value,
                                                                ogLink: document
                                                                  .getElementById(
                                                                    `strongUpdateDisplayTextURL${rawRandomID}`
                                                                  )
                                                                  .value.trim(),
                                                              };
                                                            // Moving query to the top of the screen
                                                            document.getElementById(
                                                              `mainDiv${rawRandomID}`
                                                            ).style.order =
                                                              orderNumber.toString();
                                                          });
                                                      }
                                                    );
                                                  }

                                                  // Reset visual properties
                                                  document.getElementById(
                                                    `updateQueryScreen${rawRandomID}`
                                                  ).style.animation =
                                                    "updateTabToNormal 0.4s ease";
                                                  updateInputFields.forEach(
                                                    (displayTextInputEle) => {
                                                      displayTextInputEle.style.animation =
                                                        "updateInputBoxesNormal 0.4s ease";
                                                    }
                                                  );
                                                  document.getElementById(
                                                    `saveButtonUpdate${rawRandomID}`
                                                  ).style.display = "none";
                                                  document.getElementById(
                                                    `cancelButtonUpdate${rawRandomID}`
                                                  ).style.display = "none";
                                                  document.getElementById(
                                                    `editButtonUpdate${rawRandomID}`
                                                  ).style.display = "initial";
                                                  // Reset visual properties

                                                  // }, 2000);
                                                }
                                              );
                                            }

                                            updateInputFields.forEach(
                                              (displayTextInputEle) => {
                                                displayTextInputEle.style.animation =
                                                  "updateInputBoxesGlow 0.4s ease";
                                              }
                                            );
                                            document.getElementById(
                                              `updateQueryScreen${rawRandomID}`
                                            ).style.animation =
                                              "updateTabToDark 0.4s ease";
                                            document
                                              .getElementById(
                                                `editButtonUpdate${rawRandomID}`
                                              )
                                              .classList.remove("prototype"); // Removing this class indicates that the edit button has been clicked before
                                          });
                                      }
                                      await listenForEditRequest();

                                      document.getElementById(
                                        `updateQueryScreen${rawRandomID}`
                                      ).style.display = "initial";
                                      document.body.style.overflow = "hidden";
                                      document
                                        .getElementById("scrollToTop")
                                        .click();
                                      document.getElementById(
                                        `updateQueryScreen${rawRandomID}`
                                      ).style.animation =
                                        "pushOutUpdateTab 0.3s ease";
                                      console.log("Down here");
                                      // Add listener to close update tab

                                      // THIS HAS BEEN MOVED OUT OF EDIT BUTTON LISTENER TO AVIOD LISTENER STACKING

                                      // document.body.addEventListener(
                                      //   "click",
                                      //   (updateClickEvt) => {
                                      //     if (
                                      //       updateClickEvt.target.className
                                      //         .split(" ")
                                      //         .includes("uce")
                                      //     ) {
                                      //       console.log("Contains uce");
                                      //     } else {
                                      //       console.log("no contain");
                                      //     }
                                      //   }
                                      // );
                                      // // Done with adding listener to close update tab
                                      const showUpdateScreenIcon = async () => {
                                        let websiteLinkForUpdateIcon =
                                          importedData.directLink;
                                        let updateScreenIcon =
                                          document.getElementById(
                                            `updateScreenIcon${rawRandomID}`
                                          );
                                        console.log(
                                          "websiteLinkForUpdateIcon issssssss ",
                                          websiteLinkForUpdateIcon
                                        );
                                        console.log(
                                          "icon element is... ",
                                          updateScreenIcon
                                        );
                                        if (
                                          websiteLinkForUpdateIcon.substring(
                                            0,
                                            5
                                          ) == "http:" ||
                                          websiteLinkForUpdateIcon.substring(
                                            0,
                                            6
                                          ) == "https:" ||
                                          websiteLinkForUpdateIcon.substring(
                                            0,
                                            7
                                          ) == "http://" ||
                                          websiteLinkForUpdateIcon.substring(
                                            0,
                                            8
                                          ) == "https://"
                                        ) {
                                          updateScreenIcon.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${websiteLinkForUpdateIcon.trim()}&size=96`; // Can change back to 96
                                        } else {
                                          updateScreenIcon.src = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${websiteLinkForUpdateIcon.trim()}&size=96`;
                                        }
                                      };
                                      await showUpdateScreenIcon();

                                      //
                                      // Array.from(
                                      //   document
                                      //     .getElementById("ableToDarken")
                                      //     .getElementsByTagName("div")
                                      // ).forEach((cv) => {
                                      //   cv.style.animation =
                                      //     "fadeSlight 0.25s ease";
                                      // });
                                      dimAbleToDarken();
                                      //
                                      const displayAllCurrentInfoUpdate =
                                        async () => {
                                          let displayNameForUpdateIcon =
                                            importedData.website;
                                          let displayEmailForUpdateIcon =
                                            importedData.email;
                                          let displayPasswordForUpdateIcon =
                                            importedData.pass;
                                          let displayURLForUpdateIcon =
                                            importedData.directLink;
                                          document.getElementById(
                                            `updateScreenQueryNameHeader${rawRandomID}`
                                          ).textContent =
                                            displayNameForUpdateIcon
                                              .substring(0, 1)
                                              .toUpperCase() +
                                            displayNameForUpdateIcon.substring(
                                              1,
                                              displayNameForUpdateIcon.length
                                            );
                                          console.log(
                                            "THE EMAILLLL: ",
                                            displayEmailForUpdateIcon
                                          );
                                          document.getElementById(
                                            `strongUpdateDisplayTextName${rawRandomID}`
                                          ).value =
                                            displayNameForUpdateIcon.trim();
                                          document.getElementById(
                                            `strongUpdateDisplayTextEmail${rawRandomID}`
                                          ).value =
                                            displayEmailForUpdateIcon.trim();
                                          document.getElementById(
                                            `strongUpdateDisplayTextPassword${rawRandomID}`
                                          ).value =
                                            displayPasswordForUpdateIcon.trim();
                                          document.getElementById(
                                            `strongUpdateDisplayTextURL${rawRandomID}`
                                          ).value =
                                            displayURLForUpdateIcon.trim();
                                        };
                                      await displayAllCurrentInfoUpdate();
                                    }
                                    //
                                  }
                                  showNewUpdateScreen();
                                }
                                // Other animation listeners
                              }); // End of event listener
                            document
                              .getElementById(`editContainer${rawRandomID}`)
                              .classList.add("toggler");
                          }
                          async function eyeToggleAddFunction() {
                            let eyeContainer = document.createElement("div");
                            eyeContainer.setAttribute(
                              "id",
                              `eyeContainer${rawRandomID}`
                            );
                            document
                              .getElementById(`threeToggles${rawRandomID}`)
                              .appendChild(eyeContainer);
                            document
                              .getElementById(`eyeContainer${rawRandomID}`)
                              .classList.add("eyeContainer");
                            let eye = document.createElement("i");
                            eye.setAttribute("id", `eye${rawRandomID}`);
                            document
                              .getElementById(`eyeContainer${rawRandomID}`)
                              .appendChild(eye);
                            document
                              .getElementById(`eye${rawRandomID}`)
                              .setAttribute("class", "far fa-eye");
                            document
                              .getElementById(`eye${rawRandomID}`)
                              .classList.add("eyeClass");
                            // Password Shower //

                            const togglePassword = document.getElementById(
                              `eyeContainer${rawRandomID}`
                            );
                            const password = document.getElementById(
                              `hiddenPasswordInputBox${rawRandomID}`
                            );
                            if (importedData.isLink == "true") {
                              document.getElementById(
                                `eyeContainer${rawRandomID}`
                              ).style.marginTop = "1.2%";
                            } else {
                              document.getElementById(
                                `eyeContainer${rawRandomID}`
                              ).style.marginTop = "0.9%";
                            }
                            togglePassword.addEventListener(
                              "click",
                              function (e) {
                                // toggle the type attribute
                                const type =
                                  password.getAttribute("type") === "password"
                                    ? "text"
                                    : "password";
                                password.setAttribute("type", type);
                                // toggle the eye slash icon
                                document
                                  .getElementById(`eye${rawRandomID}`)
                                  .classList.toggle("fa-eye-slash");
                              }
                            );
                            document
                              .getElementById(`eyeContainer${rawRandomID}`)
                              .classList.add("toggler");
                            // Password Shower //
                          }
                          async function trash() {
                            // Trash Icon //
                            let trashContainer = document.createElement("div");
                            trashContainer.setAttribute(
                              "id",
                              `trashContainer${rawRandomID}`
                            );
                            document
                              .getElementById(`threeToggles${rawRandomID}`)
                              .appendChild(trashContainer);
                            document
                              .getElementById(`trashContainer${rawRandomID}`)
                              .classList.add("trashContainer");
                            let trash = document.createElement("i");
                            trash.setAttribute("id", `trash${rawRandomID}`);
                            document
                              .getElementById(`trashContainer${rawRandomID}`)
                              .appendChild(trash);
                            document
                              .getElementById(`trash${rawRandomID}`)
                              .setAttribute("class", "far fa-trash-alt");
                            document
                              .getElementById(`trash${rawRandomID}`)
                              .classList.add("trashClass");
                            if (importedData.isLink == "true") {
                              document.getElementById(
                                `trashContainer${rawRandomID}`
                              ).style.marginTop = "1.2%";
                            } else {
                              document.getElementById(
                                `trashContainer${rawRandomID}`
                              ).style.marginTop = "0.9%";
                            }
                            document
                              .getElementById(`trashContainer${rawRandomID}`)
                              .addEventListener("click", () => {
                                async function deleteOne() {
                                  // const docRefToDelete = query(
                                  //   collection(db, userUID, "mpaps", "ps"),
                                  //   where("random", "==", rawRandomID)
                                  // );
                                  const docSnapToDelete = await getDocs(
                                    query(
                                      collection(
                                        db,
                                        "users",
                                        "filler",
                                        userUID,
                                        "mpaps",
                                        "ps"
                                      ),
                                      where("random", "==", rawRandomID)
                                    )
                                  ).then(() => {
                                    console.log("get Docs line 1655");
                                  });
                                  // console.log("snap is ", docSnapToDelete);
                                  // );
                                  docSnapToDelete.forEach((doc) => {
                                    console.log("The ref ", sourceDocRef);
                                    deleteDoc(sourceDocRef).then(() => {
                                      console.log("Delete doc line 1693");
                                    });
                                  });
                                  // console.log("plain ", docRefToDelete);
                                  // console.log("plainData ", docRefToDelete.data());
                                  // deleteDoc(docRefToDelete);
                                }
                                deleteOne();
                                document.getElementById(
                                  `mainDiv${rawRandomID}`
                                ).style.animation = "fadeAway 0.3s ease";
                                document
                                  .getElementById(`mainDiv${rawRandomID}`)
                                  .addEventListener("animationend", (mid) => {
                                    console.log(mid);
                                    if (mid.animationName == "fadeAway")
                                      document.getElementById(
                                        `mainDiv${rawRandomID}`
                                      ).style.display = "none";
                                  });
                              });
                            document
                              .getElementById(`trashContainer${rawRandomID}`)
                              .classList.add("toggler");
                            // Trash Icon //
                          }
                          async function copyButtonFunction() {
                            let copyContainer = document.createElement("div");
                            copyContainer.setAttribute(
                              "id",
                              `copyContainer${rawRandomID}`
                            );
                            document
                              .getElementById(`threeToggles${rawRandomID}`)
                              .appendChild(copyContainer);
                            document
                              .getElementById(`copyContainer${rawRandomID}`)
                              .classList.add("copyContainer");
                            let copy = document.createElement("i");
                            copy.setAttribute("id", `copy${rawRandomID}`);
                            document
                              .getElementById(`copyContainer${rawRandomID}`)
                              .appendChild(copy);
                            document
                              .getElementById(`copy${rawRandomID}`)
                              .setAttribute("class", "far fa-copy");
                            document
                              .getElementById(`copy${rawRandomID}`)
                              .classList.add("copyClass");
                            if (importedData.isLink == "true") {
                              document.getElementById(
                                `copyContainer${rawRandomID}`
                              ).style.marginTop = "1.2%";
                            } else {
                              document.getElementById(
                                `copyContainer${rawRandomID}`
                              ).style.marginTop = "0.9%";
                            }
                            document
                              .getElementById(`copyContainer${rawRandomID}`)
                              .addEventListener("click", () => {
                                navigator.clipboard.writeText(
                                  document.getElementById(
                                    `hiddenPasswordInputBox${rawRandomID}`
                                  ).value
                                );
                              });
                            document
                              .getElementById(`copyContainer${rawRandomID}`)
                              .classList.add("toggler");
                          }

                          async function websiteRedirectFunction() {
                            // Website Redirect //
                            let decryptedLink = importedData.directLink;
                            openUrlObject[rawRandomID] = decryptedLink;
                            let urlStringBool = importedData.isLink;
                            if (urlStringBool == "true") {
                              document
                                .getElementById(`icon${rawRandomID}`)
                                .addEventListener("click", () => {
                                  if (importedData.isLink == "true") {
                                    let linkFromObject =
                                      /* This value will change if the user
                                    updates the url*/
                                      openUrlObject[rawRandomID];
                                    if (linkFromObject.trim() != "") {
                                      /* This if statement checks
                                    if the user deleted the url in an update */
                                      /* If the query just didn't have a url by default, than importedData.isLink would equal false
                                    so this if statement wouldn't even be running */
                                      if (
                                        linkFromObject.includes("http") &&
                                        linkFromObject.includes("://")
                                      ) {
                                        nw.Shell.openExternal(linkFromObject);
                                      } else {
                                        nw.Shell.openExternal(
                                          "http://" + linkFromObject
                                        );
                                      }
                                    }
                                  }
                                });
                            }

                            // Website Redirect //
                          }

                          async function activate() {
                            await createThreeContainerHolder();
                            await showUserAndPass();
                            await websiteRedirectFunction();
                            await requestUpdateQueryFunction();
                            await eyeToggleAddFunction();
                            await copyButtonFunction();
                            await trash();
                          }
                          activate();
                        }
                      } else {
                        // document.getElementById(
                        //   "newAndEnterMasterPasswordField"
                        // ).style.backgroundColor = "#3d333c";
                        document.getElementById(
                          "newAndEnterMasterPasswordField"
                        ).style.borderBottom = "1px solid rgb(132, 66, 66)";
                      }
                    }
                    //
                    setTimeout(() => {
                      // Focuses login or create master pass input field when page loads
                      document
                        .getElementById("newAndEnterMasterPasswordField")
                        .focus();
                    }, 500);

                    //
                    document
                      .getElementById("confirmMasterPasswordButton")
                      .addEventListener("click", () => {
                        checkRequestedMP();
                      });
                    document
                      .getElementById("newAndEnterMasterPasswordField")
                      .addEventListener("keyup", (evt) => {
                        if (evt.keyCode === 13) {
                          document
                            .getElementById("confirmMasterPasswordButton")
                            .click();
                        }
                      });
                  } else {
                    // User does NOT have a master password set up
                    document.getElementById("renterMP").style.display =
                      "initial";

                    // Making padding 2% for input boxes because we are adding the password strength meter
                    let enterMasterPassBox = document.getElementById(
                      "newMasterPasswordField"
                    );
                    let confirmMasterPassBox =
                      document.getElementById("renterMP");
                    enterMasterPassBox.style.paddingBottom = "2%";
                    confirmMasterPassBox.style.paddingBottom = "2%";
                    //
                    console.log(tempSnap.data(), " doesn't exist :(");
                    document.body.style.pointerEvents = "none";
                    document.getElementById(
                      "setupMasterPasswordScreen"
                    ).style.display = "initial";
                    document.getElementById(
                      "setupMasterPasswordScreen"
                    ).style.pointerEvents = "auto";
                    document.body.style.opacity = ".65";

                    //----------------------Creating master password----------------------//
                    document
                      .getElementById("confirmMasterPasswordButton")
                      .addEventListener("click", async () => {
                        let rawMPInput = document
                          .getElementById("newMasterPasswordField")
                          .value.trim();
                        let rawREMPInput = document
                          .getElementById("renterMP")
                          .value.trim();
                        if (rawMPInput == rawREMPInput) {
                          let correctPasswordHash = crypto
                            .createHash("sha512")
                            .update(rawMPInput)
                            .digest("hex");
                          if (
                            document.getElementById("passwordStrengthBar")
                              .value == 4 ||
                            document.getElementById("passwordStrengthBar")
                              .value == 3
                          ) {
                            hashedSetMasterPassValue = correctPasswordHash; /* 
                            Just making a variable that has the correct hash of the
                            master password */

                            const randomStringEncrypted = CryptoJS.AES.encrypt(
                              // Encrypting the random string with the master pass hash as the key
                              randomStringToBeEncrypted,
                              correctPasswordHash
                            ).toString();

                            await writeStringEncryptedWithMPToFS(
                              // See line 145 for details
                              randomStringEncrypted
                            )
                              .then(async () => {
                                await writeBlankDataToFS(); // To check if the user has a master pass set up, we check for this data
                              })
                              .catch((err) => {
                                console.log(err);
                              });

                            document.getElementById(
                              "setupMasterPasswordScreen"
                            ).style.display = "none";
                            document.body.style.pointerEvents = "auto";
                            document.body.style.opacity = "1";
                          } else {
                            document.getElementById(
                              "newMasterPasswordField"
                            ).style.borderBottom = "2px solid #844242";
                            document.getElementById(
                              "renterMP"
                            ).style.borderBottom = "2px solid #844242";
                            document.getElementById(
                              "createMPError"
                            ).textContent = "Password is too weak";
                            document.getElementById(
                              "confirmMasterPasswordButton"
                            ).style.marginTop = "4%";
                          }
                        } else {
                          console.log("diff");
                          document.getElementById(
                            "newMasterPasswordField"
                          ).style.borderBottom = "2px solid #844242";

                          document.getElementById(
                            "renterMP"
                          ).style.borderBottom = "2px solid #844242";
                          document.getElementById("createMPError").textContent =
                            "Passwords do not match";
                          document.getElementById(
                            "confirmMasterPasswordButton"
                          ).style.marginTop = "4%";
                        }
                      });
                    //----------------------Adding master password----------------------//
                  }
                })
                .catch((err) => {
                  console.log(err);
                });
            };
            checkIfUIDExistsInFS();
            // auth.currentUser.getIdTokenResult(true)
            // auth.currentUser.getIdTokenResult(true).then((idTokenResult) => {
            //   console.log("the result ", idTokenResult);
            //   console.log("the result claims ", idTokenResult.claims);
            // });
            //----------------------Checking if master password exists----------------------//

            // Animation end listeners //
            Array.from(
              document
                .getElementById("ableToDarken")
                .getElementsByTagName("div")
            )[0].addEventListener("animationend", (anii) => {
              console.log("fade ani trig");
              if (anii.animationName == "fadeSlight") {
                Array.from(
                  document
                    .getElementById("ableToDarken")
                    .getElementsByTagName("div")
                ).forEach((cv) => {
                  cv.style.opacity = "0.7";
                });
                document.getElementById("ableToDarken").style.pointerEvents =
                  "none";
                document.getElementById("ableToDarken").style.userSelect =
                  "none";
              } else if (anii.animationName == "fadeBack") {
                console.log("ITS ELSE IF!!!!!!");
                Array.from(
                  document
                    .getElementById("ableToDarken")
                    .getElementsByTagName("div")
                ).forEach((cv) => {
                  cv.style.opacity = "1";
                });
                document.getElementById("ableToDarken").style.pointerEvents =
                  "auto";
                document.getElementById("ableToDarken").style.userSelect =
                  "auto";
              }
            });
            // Array.from(
            //   document.getElementsByClassName("updateQueryScreen")
            // ).forEach((ele) => {
            //   ele.addEventListener("animationend", (anii) => {
            //     console.log("is NOT ididididid ", anii.target.style.id);
            //     if (anii.animationName == "pushOutUpdateTab") {
            //       console.log("is idididid ", anii.target.style.id);
            //       document.getElementById(
            //         `updateQueryScreen${anii.target.style.id}`
            //       ).style.width = "40%";
            //     }
            //   });
            // });

            // Array.from(
            //   document.getElementsByClassName("updateQueryScreen")
            // ).forEach((ele) => {
            //   ele.addEventListener("animationend", (op) => {
            //     console.log("anii was ", op);
            //     if (op.animationName == "updateTabToDark") {
            //       updateQueryScreen.style.backgroundColor = "#0b0b0b";
            //     }
            //   });
            // });
            // Array.from(
            //   document.getElementsByClassName("updateQueryScreen")
            // ).forEach((ele) => {
            //   ele.addEventListener("animationend", (op) => {
            //     console.log("anii was ", op);
            //     if (op.animationName == "updateTabToNormal") {
            //       document.getElementById(
            //         "updateQueryScreen"
            //       ).style.backgroundColor = "#0c1213";
            //     }
            //   });
            // });

            // Array.from(
            //   document.getElementsByClassName("strongUpdateDisplayText")
            // ).forEach((displayTextInputEle) => {
            //   displayTextInputEle.addEventListener("animationend", (op) => {
            //     if (op.animationName == "updateInputBoxesNormal") {
            //       displayTextInputEle.style.boxShadow =
            //         "0px 10px 30px 5px rgba(0, 0, 0.15)";
            //     }
            //   });
            // });
            // Array.from(
            //   document.getElementsByClassName("strongUpdateDisplayText")
            // ).forEach((displayTextInputEle) => {
            //   displayTextInputEle.addEventListener("animationend", (op) => {
            //     if (op.animationName == "updateInputBoxesGlow") {
            //       displayTextInputEle.style.boxShadow =
            //         "0px 0px 12px 1px rgb(255, 255, 255)";
            //     }
            //   });
            // });
            // document
            //   .getElementById("updateQueryScreen")
            //   .addEventListener("animationend", (anii) => {
            //     if (anii.animationName == "pushOutUpdateTab") {
            //       document.getElementById("updateQueryScreen").style.width = "40%";
            //     }
            //   });
            // Animation end listeners //
          };
          init();
        } else {
          // Checks if user is signed out
          console.log("User is signed out");
          // User is signed out
          // ...
        }
      } else {
        console.log("Already initiated");
      }
    });
  }
  mainInit();
} catch (err) {
  console.log(err);
}
