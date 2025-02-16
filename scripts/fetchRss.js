const Parser = require('rss-parser');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const { JSDOM } = require('jsdom');


const maxLen = 20;
const RSS_FEEDS = [
    {
        title: '精选',
        url: 'https://www.bestblogs.dev/feeds/rss?featured=y'
    },
    {
        title: '软件编程',
        url: 'https://www.bestblogs.dev/feeds/rss?category=programming'
    },
    {
        title: '产品设计',
        url: 'https://www.bestblogs.dev/feeds/rss?category=product'
    },
    {
        title: '商业',
        url: 'https://www.bestblogs.dev/feeds/rss?category=business'
    }
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
                padding: 12px;
                margin: 0;
                line-height: 1.8;
            }
            img { max-width: 100%; }
        </style>
    </head>
    <body>
        <h2>${article.title}</h2>
        <p>${new Date(article.pubDate).toLocaleString()}</p>
        <p>${article.content}</p>
        <a href="${article.link}">阅读原文</a>
        <img width="400px" style="margin-left: -40px; display: block" src="${article.qrCode}" alt="QR Code" />
        <a href="index.html">返回目录</a>
    </body>
    <script>
        document.body.style.fontSize = Math.max(window.document.body.clientWidth / 30, 14) + 'px';
    </script>
    </html>`;
}

async function main() {
    // 清空输出目录
    await clearDirectory(outputDir);
    const bookmarks = [];

    for (const feed of RSS_FEEDS) {
        console.log(`Fetching ${feed.title}...`);
        const articles = [];

        try {
            const parser = new Parser();
            const feedData = await parser.parseURL(feed.url);

            for (const item of feedData.items.slice(0, maxLen)) {
                console.log(`Generating page ${item.title}...`);
                const qrCode = await QRCode.toDataURL(item.link);

                // 清除 content 中的部分样式
                let cleanContent = item['content:encoded'] || item.content;
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

        // 增加目录
        const bookmark = { title: feed.title, articles: [] };

        // 为每篇文章创建文件
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const fileName = `${feed.title}-article-${i}.html`;

            bookmark.articles.push({ title: article.title, fileName });
            await fs.writeFile(
                path.join(outputDir, fileName),
                generateArticleHtml(article)
            );
        }

        bookmarks.push(bookmark);
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
                padding: 12px;
                line-height: 1.8;
                margin: 0;
            }

            ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            ul li {
                display: inline-block;
                padding: 0 10px;
                font-size: 1em;
            }

            ul li.active {
                border-bottom: 2px solid #000;
            }

            ol {
                display: none;
                padding-left: 2em;
            }

            ol.show {
                display: block;
            }
        </style>
    </head>
    <body>
        <ul>
        ${bookmarks.map((bookmark, index) => `<li class="${index === 0 ? 'active' : ''}" onclick="titleClicked(${index})">${bookmark.title}</li>`).join('')}
        </ul>
        ${bookmarks.map((bookmark, index) => `
            <ol class="${index === 0 ? 'show' : ''}">
                ${bookmark.articles.map((article) =>
        `<li><a href="${article.fileName}">${article.title}</a></li>`).join('')}
            </ol>
        `).join('')}
    </body>
    <script>
        var lastShowIndex = 0;
        var titles = document.querySelectorAll('ul li');
        var olList = document.querySelectorAll('ol');

        function titleClicked(index) {
            olList[lastShowIndex].classList.remove('show');
            olList[index].classList.add('show');

            titles[lastShowIndex].classList.remove('active');
            titles[index].classList.add('active');
            lastShowIndex = index;
        }
        
        document.body.style.fontSize = Math.max(window.document.body.clientWidth / 30, 14) + 'px';
    </script>
    </html>`;

    console.log('Writing index.html...');

    await fs.writeFile(
        path.join(outputDir, 'index.html'),
        indexHtml
    );

    console.log('Done!');
}

main();