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

  console.log(data + "is not available")
  if (!data || !data.timestamps || !data.close) return <p>No data available</p>;

  const chartLabels = data.timestamps.map((ts: string) => {
    try {
      return new Date(ts).toLocaleDateString(); // Ensure proper date conversion
    } catch (error) {
      console.error("Error parsing timestamp:", ts, error);
      return "Invalid Date";
    }
  });
  const chartData = {
    labels: chartLabels,//data.timestamps.map((ts: number) => new Date(ts * 1000).toLocaleDateString()),
    datasets: [
      {
        label: `${data.symbol} Stock Price`,
        data: data.close,
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        borderWidth: 2,
      },
    ],
  };
  console.log(chartData);

  return <Line data={chartData} />;
}
