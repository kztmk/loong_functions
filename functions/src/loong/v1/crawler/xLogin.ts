import {error, log} from "firebase-functions/logger";
import {Page} from "puppeteer";
import {comfirmCode} from "../../../index";
import {findLoginButton, findNextButton, sleep} from "./utils";
/**
 * Logs in using email and password.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} email - The email address.
 * @param {string} password - The password.
 * @param {string} accountName - The account name.
 * @return {Promise<boolean>} - A promise that resolves
 *to true if login is successful, false otherwise.
 */
export async function loginByEmailAndPassword(
  page: Page,
  email: string,
  password: string,
  accountName: string
) {
  try {
    await sleep();
    const inputIdField = "input[autocomplete=\"username\"]";
    await page.waitForSelector(inputIdField);
    log("--------  waiting for finding  email field");
    sleep();
    log("--------  found email field");

    await page.type(inputIdField, email, {delay: 120});
    log("--------  typed email");
    // find next button and click
    let nextButton = await findNextButton(page);
    if (!nextButton) {
      error("-error-  failed to find next button");
      throw new Error("failed to find next button");
    }

    await nextButton.click();
    log("--------  clicked next button");
    await sleep();
    // check suspects unusual activity
    const suspectTitle = await page.$("h1");
    if (suspectTitle) {
      log("--------  found suspect title");
      const suspectText = await page.evaluate(
        (el) => el.innerText,
        suspectTitle
      );
      if (
        suspectText === "Enter your phone number or username" ||
        suspectText === "電話番号またはユーザー名を入力"
      ) {
        await page.waitForSelector("input");
        if (inputIdField) {
          await page.type("input", accountName, {delay: 120});
          log("--------  typed account name");
          nextButton = await findNextButton(page);
          if (!nextButton) {
            error(
              "-error-  failed to find next button on after account name input"
            );
            return false;
          }
          await nextButton.click();
          log("--------  clicked next button on after account name input");
        } else {
          log("-error-  failed to find input field");
          throw new Error("failed to find input field");
        }
      }
    }
    // find password field
    const inputPasswordField = "input[autocomplete=\"current-password\"]";
    await page.waitForSelector(inputPasswordField);
    log("--------  waiting for finding password field");
    sleep();
    log("--------  found password field");
    await page.type(inputPasswordField, password, {delay: 120});
    log("--------  typed password");
    // find login button and click
    const loginButton = await findLoginButton(page);
    if (!loginButton) {
      error("-error-  failed to find login button");
      return false;
    }

    await loginButton.click();
    log("--------  clicked login button");
    // check successfuly login?
    try {
      await page.waitForSelector("a[href=\"/explore\"]", {timeout: 1000});
    } catch (e) {
      try {
        // request comfirmation code
        log("--------  request comfirmation code");
        const confirmInput = await page.waitForSelector(
          "input[data-testid=\"ocfEnterTextTextInput\"]"
        );
        log("--------  found confirm input");
        if (confirmInput) {
          log("--------  type comfirmation code");
          await confirmInput.type(comfirmCode!, {delay: 120});
          const nextButton = await findNextButton(page);
          if (nextButton) {
            log("--------  found next button");
            await nextButton.click();
            return true;
          }
        }
        return false;
      } catch (e) {
        log("--------  failed to find explore link");
        return false;
      }
    }
    await sleep();
    return true;
  } catch (error) {
    log(`-error- ${error}`);
    return false;
  }
}
