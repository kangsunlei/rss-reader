const Parser = require('rss-parser');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const { JSDOM } = require('jsdom');

const parser = new Parser();
const RSS_FEEDS = [
    'https://www.bestblogs.dev/feeds/rss?featured=y',
];

const outputDir = path.join(__dirname, '../public');

// 清空目录
async function clearDirectory(directory) {
    try {
        await fs.rm(directory, { recursive: true, force: true });
        await fs.mkdir(directory, { recursive: true });
    } catch (error) {
        console.error('Error clearing directory:', error);
    }
}

// 生成单篇文章的HTML
function generateArticleHtml(article) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${article.title}</title>
        <style>
            body {
                padding: 25px;
                font-size: 30px;
                line-height: 1.8;
            }
            img { max-width: 100%; }
        </style>
    </head>
    <body>
        <h2>${article.title}</h2>
        <p>${article.content}</p>
        <a href="${article.link}">阅读原文</a>
        <img width="400px" style="margin-left: -40px; display: block" src="${article.qrCode}" alt="QR Code" />
        <a href="index.html">返回目录</a>
    </body>
    </html>`;
}

async function main() {
    const articles = [];

    for (const feed of RSS_FEEDS) {
        try {
            const feedData = await parser.parseURL(feed);
            for (const item of feedData.items) {
                const qrCode = await QRCode.toDataURL(item.link);

                // 清除 content 中的部分样式
                let cleanContent = item.content;
                if (cleanContent) {
                    const dom = new JSDOM(cleanContent);
                    const firstDiv = dom.window.document.querySelector('div');
                    if (firstDiv) {
                        firstDiv.style.maxWidth = '100%';

                        const childrenDivs = firstDiv.querySelectorAll('div');
                        childrenDivs.forEach((div) => {
                            div.style.backgroundColor = '#fff';
                        });

                        const h3s = firstDiv.querySelectorAll('h3');
                        h3s.forEach((h3) => {
                            h3.style.fontSize = '1.2em';
                        });
                    }

                    cleanContent = dom.window.document.body.innerHTML;
                }

                articles.push({
                    title: item.title,
                    content: cleanContent,
                    link: item.link,
                    pubDate: item.pubDate,
                    qrCode,
                });
            }
        } catch (error) {
            console.error(`Error fetching ${feed}:`, error);
        }
    }

    // 清空输出目录
    await clearDirectory(outputDir);

    // 为每篇文章创建文件
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const fileName = `article-${i}.html`;
        await fs.writeFile(
            path.join(outputDir, fileName),
            generateArticleHtml(article)
        );
    }

    // 生成目录页
    const indexHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>文章目录</title>
        <style>
            body {
                padding: 25px;
                font-size: 30px;
                line-height: 1.8;
            }
        </style>
    </head>
    <body>
        <h1>文章目录</h1>
        <ol>
            ${articles.map((article, index) =>
        `<li><a href="article-${index}.html">${article.title}</a></li>`
    ).join('')}
        </ol>
    </body>
    </html>`;

    await fs.writeFile(
        path.join(outputDir, 'index.html'),
        indexHtml
    );
}

main();