import { NextResponse } from "next/server";
import axios from "axios";

const HF_CHATBOT_MODEL = "google/gemma-2b-it";  // 🔹 Replace if needed
const HF_API_KEY = process.env.HF_API_KEY;
const NEWS_API_KEY = "40769658978f4efba8a4a5cb12b5c650"; 

// ✅ Function to Fetch Stock Price from Yahoo Finance
async function getStockPrice(symbol: string) {
  try {
    console.log(`🔍 Fetching stock price for: ${symbol}`);
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    
    if (!response.data.chart?.result) {
      console.error("❌ Invalid stock data from Yahoo Finance.");
      return null;
    }

    const stockData = response.data.chart.result[0];
    const latestClose = stockData.indicators?.quote[0]?.close.pop();
    console.log(`✅ Stock Price for ${symbol}: $${latestClose}`);
    return latestClose;
  } catch (error) {
    console.error("❌ Error fetching stock price:", error.message);
    return null;
  }
}

// ✅ Function to Fetch Latest News Related to Stock
async function getStockNews(symbol: string) {
  try {
    console.log(`📰 Fetching latest news for: ${symbol}`);
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${symbol}&apiKey=${NEWS_API_KEY}`
    );

    const articles = response.data.articles;
    if (!articles || articles.length === 0) {
      console.warn("⚠️ No news articles found.");
      return "No recent news available.";
    }

    // ✅ Extract latest 3 headlines for analysis
    const newsText = articles.slice(0, 3).map((a: any) => `- ${a.title}`).join("\n");

    console.log("📝 Selected News Headlines:", newsText);
    return newsText;
  } catch (error) {
    console.error("❌ Error fetching news:", error.message);
    return "No recent news available.";
  }
}

// ✅ Function to Perform Sentiment Analysis
async function analyzeSentiment(newsText: string) {
  try {
    console.log(`🔍 Analyzing sentiment for: "${newsText}"`);
    const response = await axios.post("http://localhost:3000/api/sentiment-analysis", { text: newsText });
    console.log("✅ Sentiment Analysis Result:", response.data);
    return response.data.sentiment;
  } catch (error) {
    console.error("❌ Error fetching sentiment:", error);
    return "Neutral";  // Default if sentiment API fails
  }
}

function formatAiResponse(aiDecision: string): string {
  if (!aiDecision) return "No recommendation available.";

  // ✅ Normalize & split into lines
  const lines = aiDecision.split("\n").map(line => line.trim()).filter(line => line);

  // ✅ Default fallback values
  let recommendation = "No clear recommendation found.";
  let explanation = "No explanation provided.";

  for (let i = lines.length-1; i >0; i--) {
    const line = lines[i];

    // ✅ Extract recommendation (Buy, Sell, Hold)
    if (line.toLowerCase().includes("investment recommendation") || line.toLowerCase().includes("recommendation")) {
      for (const nextLine of lines.slice(i)) {
        if (nextLine.toLowerCase().includes("buy")) {
          recommendation = "Buy";
          break;
        } else if (nextLine.toLowerCase().includes("sell")) {
          recommendation = "Sell";
          break;
        } else if (nextLine.toLowerCase().includes("hold")) {
          recommendation = "Hold";
          break;
        }
      }
    }

    // ✅ Extract explanation if available
    if (line.toLowerCase().includes("explanation")) {
      explanation = lines.slice(i).join(" ");// Take the next line as explanation
    }
  }

  return `📢 **Recommendation:** ${recommendation}\n\n📝 **Explanation:** ${explanation}`;
}
function extractRecommendation(aiDecision: string): string {
  // Extract the recommendation (Buy, Sell, or Hold)
  const recommendationRegex = /\*\*Recommendation:\*\*\s*(Buy|Sell|Hold)/i;
  const recMatch = aiDecision.match(recommendationRegex);
  const recommendation = recMatch ? recMatch[1] : "No clear recommendation found";

  // Extract the explanation (everything after **Explanation:**)
  const explanationRegex = /\*\*Explanation:\*\*\s*([\s\S]*)/i;
  const expMatch = aiDecision.match(explanationRegex);
  const explanation = expMatch ? expMatch[1].trim() : "No explanation provided";

  return `📢 **Recommendation:** ${recommendation}\n\n📝 **Explanation:** ${explanation}`;
}


// ✅ Chatbot API Route
export async function POST(req: Request) {
  try {
    console.log("🌍 Received API Request");
    const { stockSymbol, question } = await req.json();

    console.log("📌 Request Data:", { stockSymbol, question });

    // ✅ Fetch stock price
    console.log("🚀 Fetching stock data...");
    const stockPrice = await getStockPrice(stockSymbol);
    if (!stockPrice) {
      console.error("❌ Stock price not available!");
      return NextResponse.json({ error: "Stock data unavailable" }, { status: 500 });
    }

    // ✅ Fetch latest news about the stock
    console.log("🔍 Fetching stock news...");
    const newsText = await getStockNews(stockSymbol);

    // ✅ Fetch sentiment from news articles
    console.log("🔬 Analyzing sentiment...");
    const sentiment = await analyzeSentiment(newsText);

    // ✅ Prepare AI Prompt
    const prompt = `
You are a professional financial analyst.

### Stock Overview:
- **Stock Symbol:** ${stockSymbol}
- **Current Price:** $${stockPrice}
- **Market Sentiment:** ${sentiment}

### Latest Financial News:
"${newsText}"

### Investment Recommendation:
Based on the stock's performance, latest trends, and market sentiment, provide a **clear** investment recommendation (Buy, Sell, or Hold) along with a brief explanation.
`;

    console.log("📝 AI Prompt Prepared:", prompt);

    // ✅ Call Hugging Face Chatbot Model
    console.log("⚡ Sending request to Hugging Face Chatbot Model...");
    const hfResponse = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_CHATBOT_MODEL}`,
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
    );

    console.log("✅ AI Response Received:", hfResponse.data);

    // ✅ Clean AI Output
    let aiDecision = hfResponse.data[0]?.generated_text || "No response generated.";

    // ✅ Remove unnecessary spaces & ensure it starts correctly
    aiDecision = aiDecision.trim();

    // ✅ If the response is too long, summarize it to first 500 characters
    // if (aiDecision.length > 500) {
    //     aiDecision = aiDecision.slice(0, 500) + "...";
    // }

    // ✅ Format AI response to remove markdown and extract only relevant details
    aiDecision = extractRecommendation(aiDecision);
    console.log("✅ AI Decision:", aiDecision ," the end....");

    return NextResponse.json({
      stockSymbol,
      stockPrice,
      newsText,
      sentiment,
      aiDecision
    });


  } catch (error) {
    console.error("❌ ERROR in Chatbot API:", error);
    return NextResponse.json({ error: "AI response failed", details: error.message }, { status: 500 });
  }
}

