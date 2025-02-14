import { NextResponse } from "next/server";
import axios from "axios";

// ✅ Helper function to get timestamp (in seconds)
const getTimestamp = (daysAgo: number) => {
  return Math.floor((Date.now() - daysAgo * 24 * 60 * 60 * 1000) / 1000);
};

// ✅ Compute Simple Moving Average (SMA)
const calculateSMA = (data: number[], period: number) => {
  return data.map((_, index) =>
    index >= period
      ? data.slice(index - period, index).reduce((sum, val) => sum + val, 0) / period
      : null
  );
};

// ✅ Compute Exponential Moving Average (EMA)
const calculateEMA = (data: number[], period: number) => {
  const multiplier = 2 / (period + 1);
  return data.map((value, index, arr) => {
    if (index === 0) return value;
    return value * multiplier + arr[index - 1] * (1 - multiplier);
  });
};

// ✅ Compute Relative Strength Index (RSI)
const calculateRSI = (data: number[], period: number) => {
  const gains = [];
  const losses = [];
  const rsi = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period; i < gains.length; i++) {
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return new Array(period).fill(null).concat(rsi);
};

// ✅ Compute MACD (Moving Average Convergence Divergence)
const calculateMACD = (data: number[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9) => {
  const shortEMA = calculateEMA(data, shortPeriod);
  const longEMA = calculateEMA(data, longPeriod);

  const macd = shortEMA.map((value, index) => value - longEMA[index]);
  const signalLine = calculateEMA(macd, signalPeriod);

  return { macd, signalLine };
};


const ALPHA_VANTAGE_API_KEY = "GAY0W2NVBNCWXGUQ"; // Replace with your API key

const fetchFundamentals = async (stockSymbol: string) => {
    try {
      // Fetch stock overview data
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stockSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
  
      // Log response to debug API issues
      console.log("API Response:", response.data);
  
      // Ensure response has data
      if (!response.data || Object.keys(response.data).length === 0) {
        throw new Error(`No data returned for ${stockSymbol}`);
      }
  
      const fundamentals = response.data;
  
      return {
        PE_Ratio: parseFloat(fundamentals.PERatio) || 0,
        ROE: parseFloat(fundamentals.ReturnOnEquityTTM) || 0,
        EPS: parseFloat(fundamentals.EPS) || 0,
        Debt_to_Equity: parseFloat(fundamentals.DebtToEquity) || 0,
      };
    } catch (error) {
      console.error(`⚠️ Error fetching fundamentals for ${stockSymbol}:`, error);
      return { PE_Ratio: 0, ROE: 0, EPS: 0, Debt_to_Equity: 0 };
    }
  };

// Example usage
fetchFundamentals("AAPL").then(console.log);


// ✅ Stock Data API with Indicators & Fundamentals
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stockSymbol = searchParams.get("symbol") || "AAPL";
    const duration = parseInt(searchParams.get("days") || "250");

    console.log(`📌 Fetching ${duration} days of data for ${stockSymbol}...`);

    // ✅ Get timestamps for Yahoo Finance API
    const endTime = getTimestamp(0);
    const startTime = getTimestamp(duration);

    // ✅ Fetch historical stock data from Yahoo Finance
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&period1=${startTime}&period2=${endTime}`
    );

    if (!response.data.chart?.result?.length) {
      console.error("❌ No stock data found.");
      return NextResponse.json({ error: "No stock data available" }, { status: 404 });
    }

    const stockData = response.data.chart.result[0];

    // ✅ Extract timestamps
    const timestamps = stockData.timestamp.map((ts: number) =>
      new Date(ts * 1000).toISOString().split("T")[0]
    );

    // ✅ Extract Open, High, Low, Close, Volume
    const quote = stockData.indicators.quote[0];
    const closePrices = quote.close;
    const openPrices = quote.open || closePrices;
    const highPrices = quote.high || closePrices;
    const lowPrices = quote.low || closePrices;
    const volumes = quote.volume || new Array(closePrices.length).fill(0);

    // ✅ Compute Technical Indicators
    const SMA_14 = calculateSMA(closePrices, 14);
    const EMA_14 = calculateEMA(closePrices, 14);
    const RSI_14 = calculateRSI(closePrices, 14);
    const { macd, signalLine } = calculateMACD(closePrices);

    // ✅ Fetch Fundamentals
    const fundamentals = await fetchFundamentals(stockSymbol);

    return NextResponse.json({
      symbol: stockSymbol,
      timestamps,
      open: openPrices,
      high: highPrices,
      low: lowPrices,
      close: closePrices,
      volume: volumes,
      indicators: {
        SMA_14,
        EMA_14,
        RSI_14,
        MACD: macd,
        Signal_Line: signalLine,
      },
      fundamentals, // ✅ PE Ratio, ROE, EPS, Debt-to-Equity
    });
  } catch (error) {
    console.error("❌ Error fetching stock data:", error);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}
