"use client";

import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from "@mui/material";
import axios from "axios";

export default function Chatbot({ stockSymbol }: { stockSymbol: string }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<{
    stockSymbol: string;
    stockPrice: number;
    newsText: string;
    sentiment: string;
    aiDecision: string;
    predictedPrice?: number;
  } | null>(null);

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
      const res = await axios.post("/api/chatbot", { stockSymbol, question });
      setResponse(res.data);
    } catch (error) {
      console.error("❌ Error fetching chatbot response:", error);
      setError("Failed to get a response. Please try again later.");
    }

    setLoading(false);
  };

  // ✅ Handle Stock Price Prediction
  const handlePredictStock = async () => {
    setPredicting(true);
    setError(null);

    try {
        console.log("Fetching stock data...");
        const stockDataRes = await axios.get(`/api/stock-data?symbol=${stockSymbol}`);
        const stockData = stockDataRes.data;

        // ✅ Log stockData to debug issues
        console.log("Stock Data:", stockData);

        // ✅ Check if data exists and is properly structured
        if (!stockData || !stockData.close || stockData.close.length < 150) {
            throw new Error("Not enough stock data available.");
        }

        // ✅ Ensure all arrays exist before mapping
        const formattedPrices = stockData.close.slice(-150).map((_, index:number) => [
            stockData.close?.[index] || 0,  // Handle missing values
            stockData.open?.[index] || stockData.close?.[index] || 0,
            stockData.high?.[index] || stockData.close?.[index] || 0,
            stockData.low?.[index] || stockData.close?.[index] || 0,
            stockData.volume?.[index] || 0,
            stockData.SMA_14?.[index] || 0,
            stockData.EMA_14?.[index] || 0,
            stockData.RSI_14?.[index] || 50, // Default neutral RSI
            stockData.MACD?.[index] || 0,
            stockData.PE_Ratio || 0, // Fundamental Data (not an array, keep as is)
        ]);

        console.log("Formatted Prices:", formattedPrices);

        // ✅ Send data to prediction API
        const predictRes = await axios.post("/api/predict", { stockSymbol, prices: formattedPrices });

        if (predictRes) {
          setResponse((prevResponse) => ({
            ...prevResponse!, // Spread the existing response (non-null assertion if you're sure it's set)
            predictedPrice: predictRes.data.predicted_price,
          }));
          
        }
    } catch (error) {
        console.error("❌ Error predicting stock price:", error);
        setError("Failed to predict stock price. Please try again later.");
    }

    setPredicting(false);
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
          <Typography><strong>💰 Current Price:</strong> ${response.stockPrice}</Typography>
          <Typography><strong>📊 Market Sentiment:</strong> {response.sentiment}</Typography>
          <Typography><strong>📰 Latest Financial News:</strong> {response.newsText || "No recent news available."}</Typography>
          <Typography><strong>📢 AI Recommendation:</strong> {formatAiResponse(response.aiDecision)}</Typography>
          {response?.predictedPrice !== undefined && !isNaN(response.predictedPrice) ? (
            <Typography><strong>🔮 Predicted Price:</strong> ${response.predictedPrice}</Typography>
          ) : null}
        </Paper>
      )}

      {(loading || predicting) && <CircularProgress style={{ marginTop: "10px" }} />}
    </Box>
  );
}
