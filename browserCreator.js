import puppeteer from "puppeteer";

let browser;

let params = {
    headless: true,
    defaultViewport: null,
    args: ["--start-maximized"],
};

if (!browser) {
    browser = await puppeteer.launch(params);
}

export default browser;
