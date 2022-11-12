import React, { useEffect, useState } from "react";
import classes from "./Dashboard.module.css";
import Gear from "../../components/Gear";
import AddPasswordPopup from "./PmComponents/AddPasswordPopup";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  decryptUserQueries,
  firebaseAuth,
  FSDB,
  signOutUser,
} from "../../firebase";
import QuerySlot from "./PmComponents/QuerySlot";
import MfaBox from "../../components/MfaBox.js";

const PmDashboard = (props) => {
  let navigate = useNavigate();
  const [addPasswordScreenState, setAddPasswordScreenState] = useState(false);
  const [keepOpacityNormalOnPopupState, setKeepOpacityNormalOnPopupState] =
    useState(false);
  const [popupActiveState, popupActiveSetState] = useState(false);
  const [decryptedQueriesState, setDecryptedQueriesState] = useState([]);
  const [firebaseEmail, setFirebaseEmail] = useState(
    firebaseAuth.currentUser.email
  );
  props.makeResizeable();

  const refForUserQueries = query(
    // Collection where encrypted user entries are stored
    collection(
      FSDB,
      "users",
      "filler",
      firebaseAuth.currentUser.uid,
      "mpaps",
      "ps"
    ),
    orderBy("nummy", "desc")
  );

  useEffect(() => {
    async function decryptAll() {
      const newDecryptedList = await decryptUserQueries(
        props.hashBeingUsedToEncrypt
      );
      setDecryptedQueriesState(newDecryptedList);
    }
    decryptAll();
  }, []);

  const sendToLoginPage = () => {
    navigate("/", { replace: true });
  };

  useEffect(() => {
    document.body.style.opacity = "1";
    document.body.style.background = "rgb(40, 45, 52)";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.maxWidth = "none";
    document.body.style.overflow = "scroll";
    return () => {
      document.body.style.margin = "auto";
      document.body.style.maxWidth = "38rem";
      document.body.style.overflow = "hidden";
      document.body.style.marginTop = "4%";
      document.body.style.padding = "1rem";
    };
  }, []);

  const mainDash = (
    <div>
      <div
        style={{
          opacity:
            popupActiveState && !keepOpacityNormalOnPopupState ? "0.5" : "1",
        }}
      >
        <div className={classes.headerContainer}>
          <Gear setSettingsScreenstate={props.setSettingsScreenstate} />
          <h1 id={classes.pmTitle}>PM Dashboard</h1>
          <button
            id={classes.addPasswordButton}
            onClick={() => {
              setAddPasswordScreenState(true);
              popupActiveSetState(true);
            }}
          >
            Add Password
          </button>
        </div>
      </div>
      <div
        className={classes.querySection}
        style={{
          opacity:
            popupActiveState && !keepOpacityNormalOnPopupState ? "0.5" : "1",
        }}
      >
        {decryptedQueriesState.map((query) => (
          <QuerySlot
            // query[1] is the random id of the document (query)
            key={query[1]}
            query={query}
            setPopupActiveState={popupActiveSetState}
            popupActiveState={popupActiveState} // We won't let the update tab be opened if this is true
            setKeepOpacityNormalOnPopupState={
              setKeepOpacityNormalOnPopupState
            } /*We want to keep the opacity as normal when we open an update tab
              but it still won't let them open another update tab while another one is open (or while any other popup is open) */
            hashBeingUsedToEncrypt={
              props.hashBeingUsedToEncrypt
            } /* We are passing this to the query slot so we can later pass it into the update tab of the query
              slot (it will be used to encrypt the new updated information) */
          />
        ))}
      </div>

      {addPasswordScreenState ? (
        <AddPasswordPopup
          hashBeingUsedToEncrypt={props.hashBeingUsedToEncrypt}
          closePopup={() => {
            setAddPasswordScreenState(false);
            popupActiveSetState(false);
          }}
          updateDecryptedList={async (newDecryptedQueryInfo) => {
            /* When we run this function in the add password component, we pass in the return from the "addUserQuery" cloud function
                  as an argument to this function. Then we get the information about the new query that was formed, then add it to 
                  the query list state */

            const queryInfo = newDecryptedQueryInfo.data;
            const unencryptedQuery = queryInfo.rawObjectToAdd;
            unencryptedQuery.isLink = queryInfo.isLink;
            unencryptedQuery.random = queryInfo.random;
            let copyOfCurrentQueryList = decryptedQueriesState.slice();
            copyOfCurrentQueryList.unshift([
              unencryptedQuery,
              queryInfo.IDOfNewDoc,
              queryInfo.nummy,
            ]);
            setDecryptedQueriesState(copyOfCurrentQueryList);
          }}
        />
      ) : null}
    </div>
  );

  return (
    <div>
      {props.mfaIsEnabledState && !props.mfaPassedState ? (
        <MfaBox
          email={firebaseEmail}
          onMfaCorrect={() => {
            props.setMfaPassedState(true);
            props.setMfaBoxState(false);
          }}
          hashBeingUsedToEncrypt={props.hashBeingUsedToEncrypt}
          logOut={async () => {
            await signOutUser();
            sendToLoginPage();
          }}
          authenticatorKey={props.mfaKeyState}
        />
      ) : props.mfaPassedState ? (
        mainDash
      ) : null}
    </div>
  );
};

export default PmDashboard;
