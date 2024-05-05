import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as loong from './loong/services';

dotenv.config();

export const mail_from = process.env.MAIL_FROM;
export const mail_to = process.env.MAIL_TO;
export const gmail_user = process.env.GMAIL_USER;
export const gmail_password = process.env.GMAIL_PASSWORD;
export const xloginId = process.env.X_LOGIN_ID;
export const xloginPassword = process.env.X_LOGIN_PASSWORD;
export const xloginAccountName = process.env.X_LOGIN_ACCOUNT_NAME;

admin.initializeApp();
export const db = admin.firestore();
export { loong };
