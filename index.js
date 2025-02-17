import puppeteer from "puppeteer-extra";
import Plagin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

(async () => {
  puppeteer.use(Plagin());
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  let rubleExchangeRate;
  // await page.goto(
  //   "https://www.google.com/search?q=%D0%BA%D1%83%D1%80%D1%81+%D0%B4%D0%BE%D0%BB%D0%BB%D0%B0%D1%80%D0%B0+%D0%BA+%D1%80%D1%83%D0%B1%D0%BB%D1%8E&oq=rehc+ljkkfhf&gs_lcrp=EgZjaHJvbWUqDwgCEAAYChiDARixAxiABDIGCAAQRRg5MhIIARAAGAoYgwEYsQMYyQMYgAQyDwgCEAAYChiDARixAxiABDISCAMQABgKGIMBGJIDGLEDGIAEMg8IBBAAGAoYgwEYsQMYgAQyDwgFEAAYChiDARixAxiABDIJCAYQABgKGIAEMgwIBxAAGAoYsQMYgAQyDAgIEAAYChixAxiABDIJCAkQABgKGIAE0gEINTM5OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8",
  //   {
  //     waitUntil: "domcontentloaded",
  //   }
  // );
  await page.goto("https://finance.rambler.ru/currencies/USD/", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await page.evaluate(() => {
    window.scrollBy(0, 300);
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await page.waitForSelector("._ZXx92_y.CVUkSwiH", { visible: true });
  rubleExchangeRate = await page.evaluate(() => {
    ru = document.querySelector("._ZXx92_y.CVUkSwiH").innerText.trim();
    return ru;
  });
  // await page.waitForSelector('.SwHCTb', {visible: true})
  // rubleExchangeRate = await page.evaluate(() => {
  //   ru = document.querySelector('.SwHCTb').innerText.trim().replace(",", ".")
  //   return parseFloat(ru)
  // })

  // Идём в binance
  await page.goto("https://www.binance.com/ru/markets/overview?p=1", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  page.on("console", (msg) => {
    console.log("Браузер: ", msg.text());
  });
  await page.setViewport({ width: 1280, height: 1024 });
  await page.evaluate(() => {
    window.scrollBy(0, 500);
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  await page.waitForSelector("a.bn-pagination-item:last-child", {
    visible: true,
  });

  const pageCount = await page.evaluate(() => {
    const element = document.querySelector(
      "a.bn-pagination-item:last-child"
    );
    return element ? parseInt(element.innerText.replace(/[^0-9]/g, ""), 10) : 1;
  });

  const arrCurrency = [];
  let i = 1;
  while (pageCount >= i) {
    const elements = await page.$$('.css-vurnku .flex-1 > div')
    const len = elements.length
    const arr = await page.evaluate(async (rate, len) => {
      function floatParser(str, rate) {
        return (parseFloat(str.replace(/[^0-9.]/g, "")) * rate).toFixed(2);
      }
      const arr = []
      let j = 0;
      while (j < len) {
        const l = [...document.querySelectorAll('.css-vurnku .flex-1 > div')].slice(j, j + 6)
        let list = l.map((el) => {
          const nameElement = el.querySelector(".bn-balink .flex.flex-wrap.items-center");
          const priceElement = el.querySelector(".layout-ellipsis.body2");
          j++
          return {
            name: nameElement
              ? nameElement.innerText.replace("\n", " | ").padStart(40, " ")
              : "Не найдено".padStart(40, " "),
            price: priceElement
              ? priceElement.innerText.trim().replace(",", " ").padStart(18, " ")
              : "Не найдено".padStart(18, " "),
            priceRu: priceElement
              ? floatParser(priceElement.innerText.trim(), rate)
              : 0,
          };
        }
        );
        arr.push(...list);
        window.scrollBy(0, 400);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      return arr
    }, rubleExchangeRate, len);

    await page.waitForSelector(".bn-pagination-next", { visible: true });
    await page.click(".bn-pagination-next");
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    i++;
    arrCurrency.push(...arr);
  }
  const date = new Date();
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  };
  const formattedDate = date.toLocaleDateString("ru-RU", options);

  fs.writeFileSync(
    "data.txt",
    `${"\t".repeat(7)}Сегодня:  ${formattedDate}\n${"\t".repeat(7)
    }Курс доллара ${rubleExchangeRate} руб.\n${"\t".repeat(7)
    }Курсы валют на сегодня:\n\n` +
    arrCurrency
      .map((el) => `${el.name}: ${el.price} | в рублях: ${el.priceRu}`)
      .join("\n")
  );
  console.log("Закончили!");
  await browser.close();
})();
