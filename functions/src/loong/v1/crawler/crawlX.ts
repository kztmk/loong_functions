import { error, log } from 'firebase-functions/logger';
import { Cookie } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { db } from '../../../index';
import { getXtrends } from './getXtrends';
import { loginByEmailAndPassword } from './xLogin';

async function getCookies(accountName: string): Promise<Cookie[]> {
  log('accoutname:', accountName);
  const docRef = db.collection('cookies').doc(accountName);
  const docSnapshot = await docRef.get();

  if (docSnapshot.exists) {
    // subcollectionの取得
    log('snapshot exists');
    const cookiesData = docSnapshot.get('cookies');
    if (!cookiesData) {
      log('No cookies found for account: ', accountName);
    } else {
      log(cookiesData.length, 'cookies found for account: ', accountName);
    }
    const cookies = cookiesData.map((data: any) => {
      return {
        name: data.name,
        value: data.value,
        domain: data.domain,
        path: data.path,
        expires: data.expires,
        size: data.size,
        httpOnly: data.httpOnly,
        secure: data.secure,
        session: data.session,
        sameSite: data.sameSite,
      } as Cookie;
    });
    return cookies;
  } else {
    log('snapshot not exists');
    return [];
  }
}

async function saveCookies(
  accountName: string,
  cookies: Cookie[]
): Promise<void> {
  // Save the cookies to Firestore
  await db.collection('cookies').doc(accountName).set({ cookies });
}

export async function crawlX(
  email: string,
  password: string,
  accountName: string
) {
  let updateCookie: Cookie[] = [];

  log('Start the crawler');
  // stealth mode
  puppeteer.use(StealthPlugin());
  //
  let xTrends = '';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja-JP, ja'],
  });
  // new page and go to X homepage
  const page = await browser.newPage();
  try {
    // Retrieve the cookie from Firestore
    let cookies = await getCookies(accountName);
    // Check if cookies are null or undefined
    if (!cookies) {
      log('No cookies found for account: ', accountName);
      cookies = [];
    } else {
      // Set the retrieved cookie in Puppeteer
      await page.setCookie(...cookies);
      log('--------  set cookies');
    }

    await page.goto('https://twitter.com/home');

    //check login status
    // if not login, redirect to login page
    let firstPage = '';
    const promiseLogined = page
      .waitForSelector('a[href="/home"]', { timeout: 4000 })
      .then(
        () => {
          log('--------  home Timeline found');
          return 'logined';
        },
        () => {
          if (firstPage.length === 0) {
            log('-error-  home Timeline not found');
          }
          return 'error_logined';
        }
      );
    // not login
    const promiseNeedLogin = page
      .waitForSelector('input[autocomplete="username"]', { timeout: 4000 })
      .then(
        () => {
          log('--------  need login');
          return 'need_logined';
        },
        () => {
          if (firstPage.length === 0) {
            log('--------  already logined');
          }
          return 'error_need_logined';
        }
      );

    await Promise.race([promiseLogined, promiseNeedLogin]).then((result) => {
      firstPage = result;
    });

    let loginStatus = firstPage === 'logined' ? true : false;
    if (!loginStatus) {
      loginStatus = await loginByEmailAndPassword(
        page,
        email,
        password,
        accountName
      );
    }

    if (!loginStatus) {
      error('Failed to login');
      return '';
    }
    const loginCookies = await page.cookies();
    await saveCookies(accountName, loginCookies);
    log('--------  saved login cookies');

    // Perform login and other actions
    xTrends = await getXtrends(page);
    log('--------  got trends');
    log('--------  update cookie');
    updateCookie = await page.cookies();
    await saveCookies(accountName, updateCookie);
    log('--------  saved update cookies');
    return xTrends;
  } catch (e) {
    error('Error in crawlX:', e);
  } finally {
    // Close the page and save the cookie to Firestore
    await browser.close();
    log('End the crawler');
    return xTrends;
  }
}
