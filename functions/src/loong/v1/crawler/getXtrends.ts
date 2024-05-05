import { error, log } from 'firebase-functions/logger';
import { Page } from 'puppeteer';
import { convertTojson, sleep } from './utils';

export async function getXtrends(page: Page): Promise<string> {
  try {
    // find link to /explore
    log('Finding the explore link');
    const exploreLink = await page.waitForSelector('a[href="/explore"]');
    if (!exploreLink) {
      error('Failed to find explore link');
      throw new Error('Failed to find explore link');
    }

    // click the link
    exploreLink.click();
    log('Clicked the explore link');
    // wait for the page to load
    log('Waiting for trending link to appear');
    const trendingLink = await page.waitForSelector(
      'a[href="/explore/tabs/keyword"]'
    );
    if (!trendingLink) {
      error('Failed to find trending link');
      throw new Error('Failed to find trending link');
    }

    trendingLink.click();
    log('Clicked the trending link');
    // wait for the page to load
    let hasTitleFound = false;
    const startTime = new Date().getTime();
    let isJapanese = true;
    while (!hasTitleFound) {
      try {
        const h2Contents = await page.$$eval('h2', (el) => {
          return el.map((e) => e.innerText);
        });
        for (let i = 0; i < h2Contents.length; i++) {
          if (h2Contents[i].includes('日本のトレンド')) {
            hasTitleFound = true;
            break;
          }
          if (h2Contents[i].includes('trends')) {
            hasTitleFound = true;
            isJapanese = false;
            break;
          }
        }
        if (new Date().getTime() - startTime > 3000) {
          break;
        }
      } catch (e) {
        error(`error:${e}`);
        throw new Error('Failed to get h2 contents');
      }
      await sleep(1000);
    }

    const searchTarget = isJapanese
      ? 'div[aria-label="タイムライン: 話題を検索"]'
      : 'div[aria-label="Timeline: Explore"]';

    if (hasTitleFound) {
      // await targetPage.waitForNavigation({ waitUntil: 'domcontentloaded' });
      log('h2 title found');
      const TimelineElement = await page.$(searchTarget);
      if (TimelineElement) {
        log(`Timeline: Explore found: ${isJapanese ? 'Japanese' : 'English'}`);
        const elementText = await page.$eval(searchTarget, (el: Element) =>
          'innerText' in el ? el['innerText'] : ''
        );
        if (typeof elementText === 'string') {
          const jsonDataStringity = JSON.stringify(convertTojson(elementText));
          return jsonDataStringity;
        } else {
          error('elementText is not string');
          return '';
        }
      } else {
        error('Timeline: Explore not found');
        return '';
      }
    } else {
      error('h2 title not found');
      return '';
    }
  } catch (err) {
    error('Error getting xtrends:', err);
    return '';
  }
}
