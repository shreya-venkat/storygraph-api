import "dotenv/config";

import { Window } from "happy-dom";

const USERNAME = process.env.USERNAME;

const createStorygraphUrl = (target, username, page = 1) =>
  `https://app.thestorygraph.com/${target}/${username}?page=${page}`;

const fetchPageHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${url}, Status: ${response.status}`);
  }
  return await response.text();
};

const parseBookPane = (pane) => {
  const titleEl = pane.querySelector("h3 a");
  const authorEl = pane.querySelector("p");
  const imgEl = pane.querySelector("img");
  const link = pane.querySelector("a")?.href;
  return {
    id: link ? link.split("/").pop() : null,
    title: titleEl?.textContent?.trim() || "",
    author: authorEl?.textContent?.trim() || "",
    coverUrl: imgEl?.src || null,
  };
};

const fetchAllBookPanes = async (target, username, limit = Infinity) => {
  let page = 1;
  let hasMorePages = true;
  const allBookPanes = [];

  while (hasMorePages) {
    const url = createStorygraphUrl(target, username, page);
    const htmlString = await fetchPageHtml(url);
    const window = new Window();
    const document = window.document;
    document.documentElement.innerHTML = htmlString;
    const bookPanes = [...document.querySelectorAll(".book-pane")];

    if (bookPanes.length === 0) break;

    for (let i = 0; i < limit && i < bookPanes.length; i++) {
      allBookPanes.push(bookPanes[i]);
    }
    hasMorePages = bookPanes.length >= 10;
    page++;
    if (page > 5 || allBookPanes.length >= limit) break;
  }

  return allBookPanes.filter((pane) => pane != null);
};

export const handler = async (req) => {
  const target = "to-read";
  const username = req.queryStringParameters?.username || USERNAME;
  const limit = parseInt(req.queryStringParameters?.limit) || Infinity;

  try {
    const bookPanes = await fetchAllBookPanes(target, username, limit);
    const data = bookPanes.map((pane) => parseBookPane(pane));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
