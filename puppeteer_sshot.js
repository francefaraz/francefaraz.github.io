const browser = await puppeteer.launch();

const page = await browser.newPage();
await page.goto('https://www.google.com');

console.log(await page.content());
await page.screenshot({path: 'screenshot.png'});

await browser.close();
