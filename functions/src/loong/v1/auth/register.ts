import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {log} from "firebase-functions/logger";
import {sendMailRegisterUser} from "../../../helper";

// ユーザーから
// - 購入時のメールアドレス
// - アカウント作成時のメールアドレス
// - パスワード
// が送られ, それを元にユーザーが存在するかどうかを確認する。
// ユーザーが存在しない場合は, ユーザーを作成し, データベースに購入時のメールアドレスを保存する。
// ユーザーが存在する場合は, その旨を返す。

import {db} from "../../../index";

export const registerUser = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  // リクエストボディの存在を確認
  if (!req.body) {
    res.status(400).send("Request body is missing");
    return;
  }

  // パラメータの取得
  const {purchaseEmail, accountEmail, password} = req.body;

  // purchaseEmailの存在を確認
  if (!purchaseEmail) {
    res.status(400).send("purchaseEmail is missing");
    return;
  }

  // accountEmailの存在を確認
  if (!accountEmail) {
    res.status(400).send("accountEmail is missing");
    return;
  }

  // passwordの存在を確認
  if (!password) {
    res.status(400).send("password is missing");
    return;
  }

  const usersRef = db.collection("users");
  const snapshot = await usersRef
    .where("purchaseEmail", "==", purchaseEmail)
    .get();

  log("create user request", purchaseEmail);

  if (!snapshot.empty) {
    log("user exists");
    await sendMailRegisterUser(purchaseEmail, accountEmail, true);
    res.status(200).send("User already exists");
  } else {
    log("Create user: start");
    const userRecord = await admin.auth().createUser({
      email: accountEmail,
      password: password,
    });

    log("Successfully created new user:", userRecord.uid);
    // ユーザーが作成された後、データベースに購入時のメールアドレスを保存
    await usersRef.doc(userRecord.uid).set({
      purchaseEmail: purchaseEmail,
      accountEmail: accountEmail,
    });

    log("Create user: end");
    await sendMailRegisterUser(purchaseEmail, accountEmail, false);
    res.status(200).send(`User created: ${userRecord.uid}`);
  }
});
