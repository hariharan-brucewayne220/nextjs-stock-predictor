"use client";

import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from "@mui/material";
import axios from "axios";

interface StockResponse {
  stockSymbol: string;
  stockPrice: number;
  newsText: string;
  sentiment: string;
  aiDecision: string;
  predictedPrice?: number;
}

interface StockData {
  close: number[];
  open: number[];
  high: number[];
  low: number[];
  volume: number[];
  indicators: {
    SMA_14: number[];
    EMA_14: number[];
    RSI_14: number[];
    MACD: number[];
  };
}

interface APIError extends Error {
  response?: {
    status: number;
    data: Record<string, unknown>;
  };
}

interface PredictionResponse {
  predicted_price: number;
}

export default function Chatbot({ stockSymbol }: { stockSymbol: string }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<StockResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    setResponse(null);
    setQuestion("");
  }, [stockSymbol]);

  // ✅ Format AI Response for better readability
  function formatAiResponse(text: string): string {
    if (!text) return "No AI recommendation available.";
    text = text.replace(/### /g, "").trim();
    text = text.replace(/Stock Overview:|Investment Recommendation:|Latest Financial News:/g, "").trim();
    text = text.replace(/\*\*/g, ""); // Optionally remove markdown bold
    // Remove newline replacement so they are preserved
    return text;
  }
  

  // ✅ Handle chatbot request (AI Stock Analysis)
  const handleAskQuestion = async () => {
    if (!question) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post<StockResponse>("/api/chatbot", { stockSymbol, question });
      setResponse(res.data);
    } catch (error) {
      const apiError = error as APIError;
      console.error("❌ Error fetching chatbot response:", error);
      setError(apiError.message || "Failed to get a response. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Stock Price Prediction
  const handlePredictStock = async () => {
    setPredicting(true);
    setError(null);

    try {
      console.log("Fetching stock data...");
      const stockDataRes = await axios.get<StockData>(`/api/stock-data?symbol=${stockSymbol}`);
      const stockData = stockDataRes.data;

      console.log("Stock Data:", stockData);

      if (!stockData || !stockData.close || stockData.close.length < 150) {
        throw new Error("Not enough stock data available.");
      }

      const formattedPrices = stockData.close.slice(-150).map((_, index) => [
        stockData.close[index] || 0,
        stockData.open[index] || stockData.close[index] || 0,
        stockData.high[index] || stockData.close[index] || 0,
        stockData.low[index] || stockData.close[index] || 0,
        stockData.volume[index] || 0,
        stockData.indicators.SMA_14[index] || 0,
        stockData.indicators.EMA_14[index] || 0,
        stockData.indicators.RSI_14[index] || 50,
        stockData.indicators.MACD[index] || 0,
      ]);

      console.log("Formatted Prices:", formattedPrices);

      const predictRes = await axios.post<PredictionResponse>("/api/predict", {
        stockSymbol,
        prices: formattedPrices,
      });

      if (predictRes.data && predictRes.data.predicted_price) {
        setResponse((prev) => ({
          ...prev!,
          predictedPrice: predictRes.data.predicted_price,
        }));
      } else {
        throw new Error("Invalid prediction response");
      }
    } catch (error) {
      const apiError = error as APIError;
      console.error("❌ Error predicting stock price:", error);
      setError(apiError.message || "Failed to predict stock price. Please try again later.");
    } finally {
      setPredicting(false);
    }
  };


  return (
    <Box mt={4} textAlign="center">
      <Typography variant="h5">AI Stock Chatbot</Typography>
      <Typography variant="subtitle1" color="textSecondary">
        You are asking about: <strong>{stockSymbol}</strong>
      </Typography>

      {error && <Alert severity="error" style={{ marginTop: "10px" }}>{error}</Alert>}

      <TextField
        fullWidth
        label="Ask about this stock (e.g., 'Should I buy?')"
        variant="outlined"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ marginTop: "10px" }}
      />

      <Box display="flex" justifyContent="center" gap={2} mt={2}>
        <Button variant="contained" color="primary" onClick={handleAskQuestion} disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </Button>

        <Button variant="contained" color="secondary" onClick={handlePredictStock} disabled={predicting}>
          {predicting ? "Predicting..." : "Predict Stock Price"}
        </Button>
      </Box>

      {response && (
        <Paper elevation={3} style={{ padding: "15px", marginTop: "10px", textAlign: "left" }}>
          <Typography><strong>📌 Stock:</strong> {response.stockSymbol}</Typography>
          <Typography><strong>💰 Current Price:</strong> ${response.stockPrice?.toFixed(2)}</Typography>
          <Typography><strong>📊 Market Sentiment:</strong> {response.sentiment}</Typography>
          <Typography><strong>📰 Latest Financial News:</strong> {response.newsText || "No recent news available."}</Typography>
          <Typography><strong>📢 AI Recommendation:</strong> {formatAiResponse(response.aiDecision)}</Typography>
          {response?.predictedPrice !== undefined && !isNaN(response.predictedPrice) ? (
            <Typography><strong>🔮 Predicted Price:</strong> ${response.predictedPrice.toFixed(2)}</Typography>
          ) : null}
        </Paper>
      )}

      {(loading || predicting) && <CircularProgress style={{ marginTop: "10px" }} />}
    </Box>
  );
}
