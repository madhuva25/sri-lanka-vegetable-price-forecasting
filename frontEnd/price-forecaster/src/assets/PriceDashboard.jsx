import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const PriceDashboard = () => {
  // මේවා FastAPI Backend එකෙන් එන දත්ත විදිහට හිතන්න
  const [predictionData, setPredictionData] = useState({
    predictedPrice: 420.50,
    crop: "Carrot",
    // පහුගිය අවුරුදු 5ක (හෝ පරණ) මිල ගණන් දත්ත
    history: [
      { year: '2021', price: 180 },
      { year: '2022', price: 210 },
      { year: '2023', price: 350 },
      { year: '2024', price: 310 },
      { year: '2025', price: 390 },
      { year: '2026', price: 420 }
    ],
    // මිල වෙනස් වෙන්න බලපාපු ප්‍රධාන සාධක (Feature Importance % වලින්)
    factors: [
      { name: 'Diesel Price', impact: 45 },
      { name: 'Rainfall', impact: 25 },
      { name: 'Past Price (Lags)', impact: 20 },
      { name: 'Inflation', impact: 10 }
    ]
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#1e1e2f', color: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#4ade80' }}>🌱 Smart Crop Price Predictor Results</h2>
      
      {/* Predicted Price Display */}
      <div style={{ textAlign: 'center', margin: '20px 0', padding: '20px', backgroundColor: '#2a2a40', borderRadius: '10px' }}>
        <h3>Predicted Retail Price for {predictionData.crop}</h3>
        <h1 style={{ color: '#fbbf24', fontSize: '48px', margin: '10px 0' }}>Rs. {predictionData.predictedPrice}</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* 1. Past Price History Chart (Line Chart) */}
        <div style={{ flex: '1 1 45%', backgroundColor: '#2a2a40', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>📈 5-Year Price History</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionData.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="year" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
              <Line type="monotone" dataKey="price" stroke="#4ade80" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Factors Affecting the Price (Bar Chart) */}
        <div style={{ flex: '1 1 45%', backgroundColor: '#2a2a40', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>🔍 Key Factors Influencing this Price</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={predictionData.factors} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis type="number" stroke="#ccc" unit="%" />
              <YAxis dataKey="name" type="category" stroke="#ccc" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
              <Bar dataKey="impact" fill="#3b82f6" radius={[0, 5, 5, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default PriceDashboard;