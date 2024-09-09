import puppeteer from "puppeteer-extra"
import Plagin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

(async () => {
  puppeteer.use(Plagin())
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let rubleExchangeRate;
  await page.goto(
    "https://www.google.com/search?q=%D0%BA%D1%83%D1%80%D1%81+%D0%B4%D0%BE%D0%BB%D0%BB%D0%B0%D1%80%D0%B0+%D0%BA+%D1%80%D1%83%D0%B1%D0%BB%D1%8E&oq=rehc+ljkkfhf&gs_lcrp=EgZjaHJvbWUqDwgCEAAYChiDARixAxiABDIGCAAQRRg5MhIIARAAGAoYgwEYsQMYyQMYgAQyDwgCEAAYChiDARixAxiABDISCAMQABgKGIMBGJIDGLEDGIAEMg8IBBAAGAoYgwEYsQMYgAQyDwgFEAAYChiDARixAxiABDIJCAYQABgKGIAEMgwIBxAAGAoYsQMYgAQyDAgIEAAYChixAxiABDIJCAkQABgKGIAE0gEINTM5OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8",
    {
      waitUntil: "domcontentloaded",
    }
  );
  //  await page.goto(
  //   "https://finance.rambler.ru/currencies/USD/",
  //   {
  //     waitUntil: "networkidle2", timeout: 30000,
  //   }
  // );
  // await page.waitForSelector('._ZXx92_y', {visible: true})
  // rubleExchangeRate = await page.evaluate(() => {
  //   ru = document.querySelector('._ZXx92_y').innerText.trim()
  //   return ru
  // })
  await page.evaluate(() => {
    window.scrollBy(0, 300);
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });
  await page.waitForSelector('._ZXx92_y', {visible: true})
  rubleExchangeRate = await page.evaluate(() => {
    ru = document.querySelector('._ZXx92_y').innerText.trim()
    return ru
  })
  console.log("RubleExchangeRate: ", rubleExchangeRate)


  // Идём в binance
  await page.goto("https://www.binance.com/ru/markets/overview?p=1", {
    waitUntil: "networkidle2", timeout: 30000,
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
    const arr = await page.evaluate((rubleExchangeRate) => {
      function floatParser(str, rate) {
        let result;
        if(str.includes(",")) {
          result = str.replace(/[^0-9,]/g, "").replace(",", ".")
        } else {
          result = str.replace(/[^0-9.]/g, "")
        }
        return (parseFloat(result) * rate).toFixed(2)
      }
      let list = Array.from(
        document.querySelectorAll('div[direction="ltr"]'),
        (el) => ({
          name: el.querySelector(".tab__column").innerText.replace("\n", " | ").padStart(45, ' '),
          price: el.querySelector('div[data-area="right"').innerText.trim().replace(",", ".").padStart(18, ' '),
          priceRu: floatParser(el.querySelector('div[data-area="right"').innerText.trim(), rubleExchangeRate || 90.6)
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

  fs.writeFileSync("data.txt", arrCurrency.map(el=>`${el.name}: ${el.price} | в рублях: ${el.priceRu}`).join("\n"))
  console.log("Закончили!")
  
  await browser.close()
})();
