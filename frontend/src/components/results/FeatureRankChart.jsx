import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const FeatureRankChart = ({ data }) => {
    if (!data || !data.causal_features) return null;

    const chartData = data.causal_features.map(f => ({
        name: f.feature,
        score: f.score,
        fill: f.is_spurious ? '#ef4444' : '#10b981' // red for spurious, green for causal
    })).sort((a, b) => b.score - a.score);

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl mt-4 h-96">
            <h2 className="text-xl font-bold mb-4">Causal Predictors vs Spurious Correlates</h2>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} 
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FeatureRankChart;
