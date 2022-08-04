const axios = require('axios');
const cherrio = require('cheerio');
const fs = require('fs');
const path = require('path');

const outPutFileName = 'output.json';

const userUgent =
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36';

class Response {
    constructor(statusCode, data = null) {
        this.statusCode = statusCode;
        this.data = data;
    }
}

/** function normalizes url if whole domain not provided and makes sure that other webiste link will be discarded*/
const normalizeUrl = (url, website) => {
    if (
        url &&
        url.search(website) == -1 &&
        !url.startsWith('https://') &&
        !url.startsWith('http://') &&
        !url.startsWith('www.')
    ) {
        url = new URL(url, website).href;
    }
    return url;
};

/** validates that page is normal page not image , pdf . this logic needs to be refined */
const isPageValid = (url) => {
    return (url && (url.endsWith('.html') || (!url.endsWith('.jpg') && !url.endsWith('.pdf') && !url.endsWith('.jpeg'))));
};

/** accepts array of inputs and returns output */
const scrapeInputs = async (inputData) => {
    const outputs = [];

    for (const element of inputData) {
        const websites = element._website;
        for (const website of websites) {
            const websiteOutputs = await scrapeWebsite(website);
            outputs.push(...websiteOutputs);
        }
    }
    fs.writeFileSync(path.resolve(__dirname, outPutFileName), JSON.stringify(outputs), 'utf8');
    return outputs;
};

/**  goes throw given website and scrapes all valid pagesI */
const scrapeWebsite = async (website) => {
    const pages = new Set([website]);
    const pageIterator = pages.values();
    const scannedPages = new Set();
    const outputs = [];

    let page = null;

    while ((page = pageIterator.next().value)) {
        const response = await scrapePage(page);

        if (response && response.data) {
            const $ = cherrio.load(response.data);

            $('a').each((i, element) => {
                let url = normalizeUrl($(element).attr('href'), website);
                if (isPageValid(url) && !scannedPages.has(url) && url.startsWith(website)) {
                    pages.add(url);
                }
            });
        }

        if (page !== website) {
            const output = {
                _website: outputs.length === 0 ? [website] : [],
                _link: [page],
                _statusCode: [response?.statusCode],
            };
            outputs.push(output);
        }

        scannedPages.add(page);
        console.log(`Scanning ${website} scanned ${scannedPages.size} page remains ${pages.size}`);
    }
    return outputs;
};

/** 
 scrapes given page and returns response
 I set user-agent because some websites might  block requests that does not have user-agent
*/
const scrapePage = async (pageUrl) => {
    try {
        const response = await axios.get(pageUrl, {
            headers: {
                'user-agent': userUgent,
            },
        });
        return new Response(response.status, response.data);
    } catch (err) {
        if (err.response && err.response.status) {
            return new Response(err.response.status);
        }
        return null;
    }
};

module.exports = scrapeInputs;
