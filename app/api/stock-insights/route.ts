import { NextResponse } from "next/server";
import axios from "axios";
interface NewsData {
  stock: string;
  summary: string;
}


const NEWS_CACHE_DURATION = 60 * 10 * 1000; // 10 minutes (Cache Duration)
const newsCache: { [key: string]: { timestamp: number; data: NewsData } } = {}; // Cache Object
let stockSymbol="";  
interface NewsArticle {
  title: string;
}

export async function GET(req: Request) {
  try {
    // ✅ Extract stock symbol from query parameters
    const { searchParams } = new URL(req.url);
    stockSymbol = searchParams.get("symbol") || "AAPL"; // Default to AAPL if not provided

    // ✅ Check if news is already cached
    if (newsCache[stockSymbol] && Date.now() - newsCache[stockSymbol].timestamp < NEWS_CACHE_DURATION) {
      console.log(`📌 Returning cached news data for ${stockSymbol}`);
      return NextResponse.json(newsCache[stockSymbol].data);
    }

    const NEWS_API_KEY = "40769658978f4efba8a4a5cb12b5c650"; // Replace with your actual NewsAPI key
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${stockSymbol}&apiKey=${NEWS_API_KEY}`
    );

    const articles = response.data.articles;
    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: `No financial news found for ${stockSymbol}.` }, { status: 404 });
    }

    // ✅ Extract latest 3 headlines
    const newsText = articles.slice(0, 3).map((a: NewsArticle) => a.title).join(". ");

    // ✅ Store result in cache
    newsCache[stockSymbol] = { timestamp: Date.now(), data: { stock: stockSymbol, summary: newsText } };

    return NextResponse.json({ stock: stockSymbol, summary: newsText });
  } catch (error) {
    console.error(`❌ Error fetching stock insights for ${stockSymbol}:`, error);
    return NextResponse.json({ error: `Failed to fetch AI insights for ${stockSymbol}.` }, { status: 500 });
  }
}
