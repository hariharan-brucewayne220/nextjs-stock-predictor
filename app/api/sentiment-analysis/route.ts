import { NextResponse } from "next/server";
import axios from "axios";

const SENTIMENT_API_URL = "https://hariharan220-finbert-sentiment.hf.space/predict"; // ✅ Update with your Ngrok URL

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    console.log("🟢 Sentiment Analysis Request:", text);

    // ✅ Send `text` in the URL instead of request body
    const response = await axios.post(
      `${SENTIMENT_API_URL}?text=${encodeURIComponent(text)}`,
      {}, // Empty body since text is in the URL
      { headers: { "Accept": "application/json" } }
    );

    console.log("✅ Sentiment API Response:", response.data);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("❌ Error in Sentiment Analysis:", error);
    return NextResponse.json({ error: "Failed to analyze sentiment" }, { status: 500 });
  }
}
