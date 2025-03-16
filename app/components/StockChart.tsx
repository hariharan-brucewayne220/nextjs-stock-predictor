"use client";

import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
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


export default function StockChart({ data }: { data: StockData }) {
  if (!data) {
    return <p>No data available</p>;
  }

  // Validate required data properties
  if (!data.timestamps?.length || !data.close?.length || data.timestamps.length !== data.close.length) {
    console.error("Invalid stock data format:", data);
    return <p>Invalid stock data format</p>;
  }

  const chartLabels = data.timestamps.map((ts: string) => {
    try {
      return new Date(ts).toLocaleDateString();
    } catch (error) {
      console.error("Error parsing timestamp:", ts, error);
      return "Invalid Date";
    }
  });

  // Validate if any dates failed to parse
  if (chartLabels.every(label => label === "Invalid Date")) {
    console.error("All timestamps are invalid");
    return <p>Invalid timestamp data</p>;
  }

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: `${data.symbol} Stock Price`,
        data: data.close,
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        borderWidth: 2,
        tension: 0.1, // Add slight smoothing
      },
      // Add SMA line if available
      ...(data.indicators?.SMA_14 ? [{
        label: "SMA (14)",
        data: data.indicators.SMA_14,
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        pointRadius: 0,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
