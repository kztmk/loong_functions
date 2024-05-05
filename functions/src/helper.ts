import { error, log } from 'firebase-functions/logger';
import * as nodemailer from 'nodemailer';
import { gmail_password, gmail_user, mail_from, mail_to } from './index';

export const sendMailRegisterUser = async (
  purchasedMail: string,
  userEmail: string,
  result: boolean
): Promise<void> => {
  const msg = {
    to: mail_to,
    from: mail_from,
    subject: 'ユーザーが作成されました',
    text: `ユーザー作成がありました。
      購入時のメールアドレス: ${purchasedMail}
      アカウントメールアドレス: ${userEmail}
      結果: ${result ? 'ユーザーが存在しました' : 'ユーザーが作成されました'}`,
  };

  log(gmail_user, gmail_password);
  try {
    // SMTPトランスポーターの作成
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmail_user,
        pass: gmail_password,
      },
    });
    // メールオプションの設定
    const mailOptions = {
      ...msg,
    };
    // メールの送信
    const info = await transporter.sendMail(mailOptions);
    log('Message sent: %s', info.messageId);
  } catch (err) {
    error('Error sending email: ', err);
  }
};

export const main_app_name = 'loong';
