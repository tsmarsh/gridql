const { URL,   fileURLToPath } = require('url');
const fs = require('fs');

async function parseUrl(inputUrl) {
    try {
        const urlObj = new URL(inputUrl);

        if (urlObj.protocol === 'file:') {
            const filePath = fileURLToPath(inputUrl);
            console.log(`File path: ${filePath}`);
            return fs.readFileSync(filePath, {encoding: 'utf8'});
        } else if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
            console.log(`Service URL: ${inputUrl}`);
            const response = await fetch(inputUrl);
            return await response.text(); // or response.json() based on expected content type
        } else {
            throw new Error('Unsupported URL protocol');
        }
    } catch (error) {
        console.error('Error processing URL:', error);
        throw error; // Rethrow or handle as needed
    }
}

module.exports = {
    parseUrl
}
