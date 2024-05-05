import { error, log } from 'firebase-functions/logger';
import { ElementHandle, Page } from 'puppeteer';
import { db } from '../../../index';
// sleep random time
export function sleep(ms: number = 1000) {
  const random = Math.floor(Math.random() * 1000) + ms;
  return new Promise((resolve) => {
    setTimeout(resolve, random);
  });
}

export function convertTojson(data: string) {
  // テキストを行ごとに分割して不要な行（ピリオドのみの行）をフィルタリング
  const lines = data
    .trim()
    .split('\n')
    .filter((line) => line !== '·');

  log('trends split by lines');
  const jsonData = [];

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\d+$/)) {
        // Rankの行を見つけた場合
        const rank = parseInt(line, 10);
        const chart = lines[i + 1].trim().split(' · ')[0];
        const keyword = lines[i + 2].trim();

        // 次の行がpostsかどうかをチェック
        if (i + 3 < lines.length && lines[i + 3].includes('posts')) {
          const posts = parseInt(lines[i + 3].replace(/[^0-9]/g, ''), 10);
          jsonData.push({ rank, chart, keyword, posts });
          i += 3; // posts行を含めて4行進める
        } else {
          jsonData.push({ rank, chart, keyword });
          i += 2; // keyword行まで含めて3行進める
        }
      }
    }
  } catch (e) {
    error(`-error-  generating trends json data`);
    error(`error:${e}`);
  }

  return jsonData;
}

// Jsonデータを受け取り、Firestoreのxtrendsコレクションに保存する
export async function saveXtrends(data: any) {
  const xtrendsRef = db.collection('XTrends').doc();

  try {
    await xtrendsRef.set(data);
    log('Document written successfully!');
  } catch (err) {
    error('Error writing document:', err);
  }
}

export async function findNextButton(page: Page) {
  let nextButton: ElementHandle<Element> | null = null;
  try {
    nextButton = await page.waitForSelector('span ::-p-text(次へ)', {
      timeout: 1000,
    });
  } catch (error) {
    log('--------  failed to find next button in Japanese');
  }
  if (!nextButton) {
    try {
      nextButton = await page.waitForSelector('span ::-p-text(Next)', {
        timeout: 1000,
      });
    } catch (error) {
      log('--------  failed to find next button in English');
    }
  }

  return nextButton;
}

export async function findLoginButton(page: Page) {
  let loginButton: ElementHandle<Element> | null = null;
  try {
    loginButton = await page.waitForSelector('span ::-p-text(ログイン)', {
      timeout: 1000,
    });
  } catch (error) {
    log('--------  failed to find login button in Japanese');
  }
  if (!loginButton) {
    try {
      loginButton = await page.waitForSelector('span ::-p-text(Log in)', {
        timeout: 1000,
      });
    } catch (error) {
      log('--------  failed to find login button in English');
    }
  }

  return loginButton;
}
