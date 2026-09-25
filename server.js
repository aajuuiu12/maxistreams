const express = require('express');

const axios = require('axios');

const cors = require('cors');

const urlModule = require('url');



const app = express();

app.use(cors());



const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const REFERER = "https://iframe.rumsport8.live/";



app.get('/proxy', async (req, res) => {

    const targetUrl = req.query.u;

    if (!targetUrl) return res.status(400).send("Missing stream URL.");



    const isManifest = targetUrl.includes('.m3u8') || targetUrl.includes('m3u');



    try {

        const response = await axios({

            method: 'GET',

            url: targetUrl,

            headers: { 'User-Agent': USER_AGENT, 'Referer': REFERER },

            responseType: isManifest ? 'text' : 'stream',

            timeout: 20000,

            validateStatus: (status) => status >= 200 && status < 400

        });



        if (response.headers['content-type']) {

            res.setHeader('Content-Type', response.headers['content-type']);

        }



        if (isManifest) {

            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;

            const currentProxyUrl = `${protocol}://${req.get('host')}${req.baseUrl}${req.path}`;



            const lines = response.data.split('\n');

            const rewrittenLines = lines.map(line => {

                line = line.trim();

                if (!line) return '';

                if (line.startsWith('#')) {

                    if (line.includes('URI="')) {

                        return line.replace(/URI="([^"]+)"/, (match, uri) => {

                            const absoluteUri = resolveUrl(baseUrl, uri);

                            return `URI="${currentProxyUrl}?u=${encodeURIComponent(absoluteUri)}"`;

                        });

                    }

                    return line;

                } else {

                    const absoluteUri = resolveUrl(baseUrl, line);

                    return `${currentProxyUrl}?u=${encodeURIComponent(absoluteUri)}`;

                }

            });



            return res.send(rewrittenLines.join('\n'));

        } else {

            response.data.pipe(res);

        }

    } catch (error) {

        if (!res.headersSent) res.status(500).send("Stream Proxy Failed");

    }

});



function resolveUrl(baseUrl, relativeUrl) {

    if (urlModule.parse(relativeUrl).protocol) return relativeUrl;

    if (relativeUrl.startsWith('/')) {

        const parsed = urlModule.parse(baseUrl);

        return `${parsed.protocol}//${parsed.host}${relativeUrl}`;

    }

    return baseUrl + relativeUrl;

}



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
