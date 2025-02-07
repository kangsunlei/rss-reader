const Parser = require('rss-parser');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');

const parser = new Parser();
const RSS_FEEDS = [
    'https://www.bestblogs.dev/feeds/rss?featured=y',
];

async function fetchFeeds() {
    const articles = [];

    for (const feed of RSS_FEEDS) {
        try {
            const feedData = await parser.parseURL(feed);
            for (const item of feedData.items) {
                const qrCode = await QRCode.toDataURL(item.link);
                articles.push({
                    title: item.title,
                    content: item.content,
                    link: item.link,
                    pubDate: item.pubDate,
                    qrCode,
                });
            }
        } catch (error) {
            console.error(`Error fetching ${feed}:`, error);
        }
    }

    const content = generateHtml(articles);
    await fs.writeFile(
        path.join(__dirname, '../public/index.html'),
        content
    );
}

function generateHtml(articles) {
    const bookmarksHtml = articles.map((article, index) => `<li><a href="#article-${index}">${article.title}</a></li>`).join('');

    // 根据文章生成 HTML
    const articlesHtml = articles
        .map((article, index) => `
            <article id="article-${index}">
                <h2>${article.title}</h2>
                <p>${article.content}</p>
                <a href="${article.link}">阅读全文</a>
                <br/>
                <img src="${article.qrCode}" alt="QR Code" />
            </article>
        `)
        .join('');

    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RSS Reader</title>
        <style>
            body {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                font-size: 16px;
                line-height: 1.6;
            }
            article {
                margin-bottom: 30px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 20px;
            }

            img {
                max-width: 100%;
            }
        </style>
    </head>
    <body>
        <ol>${bookmarksHtml}</ol>
        ${articlesHtml}
    </body>
    </html>`;
}

fetchFeeds();