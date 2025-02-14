"use client";

import { useState, useEffect } from "react";
import { Container, Typography, Box, CircularProgress, Paper, TextField, MenuItem } from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import StockChart from "./components/StockChart";
import Chatbot from "./components/Chatbot";  // Import Chatbot Component

const STOCK_OPTIONS = ["AAPL", "GOOGL", "MSFT", "TSLA","NVDA"]; // ✅ Stock Selection
interface StockData {
  symbol: string;
  timestamps: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  indicators: {
    SMA_14: number[];
    EMA_14: number[];
    RSI_14: number[];
    MACD: number[];
    Signal_Line: number[];
  };
}

export default function Home() {
  const [stockSymbol, setStockSymbol] = useState("AAPL"); // ✅ Default stock
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    axios.get(`/api/stock-data?symbol=${stockSymbol}`)
      .then((response) => {
        setStockData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching stock data:", error);
        setLoading(false);
      });

    axios.get(`/api/stock-insights?symbol=${stockSymbol}`)
      .then((response) => {
        setAiInsights(response.data.summary);
      })
      .catch((error) => {
        console.error("Error fetching AI insights:", error);
      });
  }, [stockSymbol]); // ✅ Fetch new data when stockSymbol changes

  return (
    <Container maxWidth="md">
      <Box mt={4} textAlign="center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <Typography variant="h4" gutterBottom>
            AI-Powered Stock Insights
          </Typography>
        </motion.div>

        {/* ✅ Stock Selector */}
        <TextField
          select
          label="Choose a Stock"
          value={stockSymbol}
          onChange={(e) => setStockSymbol(e.target.value)}
          fullWidth
          style={{ marginBottom: "15px" }}
        >
          {STOCK_OPTIONS.map((symbol) => (
            <MenuItem key={symbol} value={symbol}>
              {symbol}
            </MenuItem>
          ))}
        </TextField>

        {loading || stockData === null ? (
            <CircularProgress />
          ) : (
            <StockChart data={stockData} />
          )}


        {/* AI Insights Section */}
        <Box mt={4}>
          <Typography variant="h5">AI-Generated Summary</Typography>
          {aiInsights ? (
            <Paper elevation={3} style={{ padding: "15px", marginTop: "10px" }}>
              <Typography>{aiInsights}</Typography>
            </Paper>
          ) : (
            <Typography>Loading AI insights...</Typography>
          )}
        </Box>

        {/* AI Chatbot Section */}
        <Box mt={4}>
          <Chatbot stockSymbol={stockSymbol} />  {/* ✅ Pass stock symbol */}
        </Box>

      </Box>
    </Container>
  );
}
