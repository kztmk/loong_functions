import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {error, log} from "firebase-functions/logger";
import {
  db,
  xloginAccountName,
  xloginId,
  xloginPassword,
} from "../../../index";
import {crawlX} from "./crawlX";

export const writeXtrends = functions.pubsub
  .schedule("0 3,6,9,12,15,18,21 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const xtrendsCollection = db.collection("XTrends");

    if (xloginId && xloginPassword && xloginAccountName) {
      const xtrends = await crawlX(xloginId, xloginPassword, xloginAccountName);
      const data = {
        xtrends,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        // Add new document
        await xtrendsCollection.add(data);
        log("Document written successfully!");

        // Get all documents ordered by timestamp
        const snapshot = await xtrendsCollection.orderBy("timestamp").get();

        // If there are more than 8 documents, delete the oldest one
        if (snapshot.size > 8) {
          const oldestDoc = snapshot.docs[0];
          await xtrendsCollection.doc(oldestDoc.id).delete();
          log("Oldest document deleted successfully!");
        }
      } catch (err) {
        error("Error writing document:", err);
      }
    }
    return null;
  });

export const testWriteXtrends = functions.https.onRequest(async (req, res) => {
  const xtrendsCollection = db.collection("XTrends");

  if (xloginId && xloginPassword && xloginAccountName) {
    const xtrends = await crawlX(xloginId, xloginPassword, xloginAccountName);
    const data = {
      xtrends,
    };

    try {
      // Add new document
      await xtrendsCollection.add(data);
      log("Document written successfully!");
      res.status(200).send("Document written successfully!");

      // // Get all documents ordered by timestamp
      // const snapshot = await xtrendsCollection.orderBy('timestamp').get();

      // // If there are more than 8 documents, delete the oldest one
      // if (snapshot.size > 8) {
      //   const oldestDoc = snapshot.docs[0];
      //   await xtrendsCollection.doc(oldestDoc.id).delete();
      //   log('Oldest document deleted successfully!');
      // }
    } catch (err) {
      error("Error writing document:", err);
      res.status(500).send("Error writing document:");
    }
  } else {
    res.status(400).send("Missing xlogin credentials");
  }
});
