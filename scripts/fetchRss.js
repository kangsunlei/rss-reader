const Parser = require('rss-parser');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');

const parser = new Parser();
const RSS_FEEDS = [
    'https://rsshub.bestblogs.dev/woshipm/popular',
    // 添加更多 RSS 源
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
                    content: `${item.content}\n\n<img src="${qrCode}" alt="QR Code" />`,
                    link: item.link,
                    pubDate: item.pubDate,
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
    // 根据文章生成 HTML
    const articlesHtml = articles
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .map(article => `
            <article>
                <h2>${article.title}</h2>
                <p>${article.content}</p>
                <a href="${article.link}">阅读全文</a>
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
        </style>
    </head>
    <body>
        <div id="content">${articlesHtml}</div>
    </body>
    </html>`;
}

fetchFeeds();