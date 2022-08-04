const prompt = require('prompt-sync')();

const scrapeInputs = require('./scanner');

(async () => {
    let inputData = prompt('Please provide input:');
    inputData = JSON.parse(inputData);
    await scrapeInputs(inputData);
})();