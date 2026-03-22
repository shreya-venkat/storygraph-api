import "dotenv/config";

const USER_ID = process.env.USER_ID || '3519176';

const fetchFromRss = async (shelf) => {
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?key=&shelf=${shelf}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const xml = await response.text();
  
  const books = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    
    const getTag = (tag) => {
      const regex = new RegExp(`<${tag}><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}|<${tag}>([\s\S]*?)<\/${tag}>`, 'i');
      const m = item.match(regex);
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    
    const title = getTag('title');
    const author = getTag('author_name');
    const coverUrl = getTag('book_medium_image_url') || getTag('book_image_url');
    const isbn = getTag('isbn');
    const rating = getTag('user_rating');
    const dateRead = getTag('user_read_at');
    
    if (title && !title.includes('bookshelf:') && author) {
      books.push({
        title,
        author,
        coverUrl,
        isbn,
        rating: rating ? parseInt(rating) : 0,
        dateRead
      });
    }
  }
  
  return books;
};

export const handler = async (req) => {
  const shelf = req.queryStringParameters?.shelf || 'to-read';
  
  try {
    const books = await fetchFromRss(shelf);
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(books),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
