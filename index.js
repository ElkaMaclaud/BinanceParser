import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.binance.com/ru/markets/overview?p=1", {
    waitUntil: "domcontentloaded",
  });
  page.on("console", (msg) => {
    console.log("Браузер: ", msg.text())
  })
  await page.setViewport({ width: 1280, height: 1024 });
  await page.evaluate(() => {
    window.scrollBy(0, 500); 
  });
  
  await page.waitForSelector("button.css-fyte2i:nth-last-child(2)", { visible: true });

  const pageCount = await page.evaluate(() => {
    const element = document.querySelector("button.css-fyte2i:nth-last-child(2)")
    return element ? parseInt(element.innerText.replace(/[^0-9]/g, ''), 10) : 1
  })
  
  const arrCurrency = [];
  let i = 0
  while (pageCount > i) {
    const arr = await page.evaluate(() => {
      let list = Array.from(
        document.querySelectorAll('div[direction="ltr"]'),
        (el) => ({
          name: el.querySelector(".tab__column").innerText.replace("\n", " | ").padEnd(45, ' '),
          price: el.querySelector('div[data-area="right"').innerText,
        })
      );
      return list
    });

    await page.evaluate(() => {
      window.scrollBy(0, 500); 
    })
    await page.waitForSelector("#next-page", { visible: true })
    await page.click("#next-page")
    await new Promise((resolve) => {setTimeout(resolve, 5000)})
    i++
    arrCurrency.push(...arr)
  }

  fs.writeFileSync("data.txt", arrCurrency.map(el=>`${el.name}: ${el.price}`).join("\n"))
  console.log("КОНЕЦ!!!")
  
  await browser.close()
})();
