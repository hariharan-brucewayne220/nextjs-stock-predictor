import { NextResponse } from "next/server";
import axios from "axios";

const HF_CHATBOT_MODEL = "https://hariharan220-stock-predictor.hf.space/predict";
const HF_API_KEY = process.env.HF_API_KEY;

export async function POST(req: Request) {
  try {
    const { stockSymbol, prices } = await req.json();
    console.log(`📈 Predicting stock price for ${stockSymbol}`);

    if (!prices || prices.length !== 150 || prices[0].length !== 10) {
      throw new Error(`Invalid input shape: Expected (150, 10) but got (${prices.length}, ${prices[0]?.length || 0})`);
    }

    const response = await axios.post(
      HF_CHATBOT_MODEL,
      { stock_symbol: stockSymbol, prices },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Prediction successful:", response.data);
    console.log("✅ api key:", HF_API_KEY);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("❌ Error in stock prediction:", error);
    return NextResponse.json({ error: "Failed to predict stock price" }, { status: 500 });
  }
}
