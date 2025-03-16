import { NextResponse } from "next/server";
import axios from "axios";

// Define more specific types for API responses
interface AlphaVantageResponse {
  PERatio: string;
  ReturnOnEquityTTM: string;
  EPS: string;
  DebtToEquity: string;
  [key: string]: string | number; // for other potential fields
}

interface YahooFinanceQuote {
  close: number[];
  open: number[];
  high: number[];
  low: number[];
  volume: number[];
}

interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: YahooFinanceQuote[];
      };
    }>;
  };
}

interface APIErrorResponse {
  error?: string;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

interface APIError extends Error {
  response?: {
    status: number;
    data: APIErrorResponse;
  };
}

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

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!ALPHA_VANTAGE_API_KEY) {
  throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set');
}

const fetchFundamentals = async (stockSymbol: string) => {
    try {
      const maxRetries = 3;
      let retryCount = 0;
      let response;

      while (retryCount < maxRetries) {
        try {
          response = await axios.get<AlphaVantageResponse>(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stockSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            }
          );
          break;
        } catch (error) {
          retryCount++;
          const apiError = error as APIError;
          if (apiError.response?.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (retryCount === maxRetries) {
            throw error;
          }
        }
      }
  
      if (!response?.data || Object.keys(response.data).length === 0) {
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
//fetchFundamentals("AAPL").then(console.log);

// ✅ Stock Data API with Indicators & Fundamentals
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stockSymbol = searchParams.get("symbol")?.toUpperCase();
    
    if (!stockSymbol) {
      return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 });
    }

    const duration = parseInt(searchParams.get("days") || "250");
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json({ error: "Invalid duration parameter" }, { status: 400 });
    }

    console.log(`📌 Fetching ${duration} days of data for ${stockSymbol}...`);

    const endTime = getTimestamp(0);
    const startTime = getTimestamp(duration);

    const maxRetries = 3;
    let retryCount = 0;
    let response;

    while (retryCount < maxRetries) {
      try {
        response = await axios.get<YahooFinanceResponse>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&period1=${startTime}&period2=${endTime}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          }
        );
        break;
      } catch (error) {
        retryCount++;
        const apiError = error as APIError;
        if (apiError.response?.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (apiError.response?.status === 404) {
          throw new Error(`Stock symbol ${stockSymbol} not found`);
        } else if (retryCount === maxRetries) {
          throw error;
        }
      }
    }

    if (!response?.data.chart?.result?.length) {
      console.error("❌ No stock data found.");
      return NextResponse.json({ error: `No data available for ${stockSymbol}` }, { status: 404 });
    }

    const stockData = response.data.chart.result[0];
    if (!stockData.indicators?.quote?.[0]) {
      return NextResponse.json({ error: `Invalid data format for ${stockSymbol}` }, { status: 500 });
    }

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
    const apiError = error as APIError;
    const statusCode = apiError.response?.status || 500;
    const errorMessage = apiError.response?.data?.message || "Failed to fetch stock data";
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
