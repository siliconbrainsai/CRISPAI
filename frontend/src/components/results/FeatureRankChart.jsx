import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
                <p className="font-bold text-white text-sm">{item.name}</p>
                <p className="text-slate-300">
                    Invariance Score: <span className="font-semibold text-indigo-400">{item.score}</span>
                </p>
                {item.stability_score !== undefined && (
                    <p className="text-slate-300">
                        Stability: <span className="font-semibold text-emerald-400">{item.stability_score}</span>
                    </p>
                )}
                <div className="pt-1">
                    {item.is_spurious ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Rejected: Spurious Correlation
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                            Verified: Invariant Causal Feature
                        </span>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const FeatureRankChart = ({ data }) => {
    if (!data || !data.causal_features || data.causal_features.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm">
                No feature ranking data available for this analysis.
            </div>
        );
    }

    const chartData = data.causal_features.map(f => ({
        name: f.feature,
        score: f.score,
        stability_score: f.stability_score,
        is_spurious: f.is_spurious,
        fill: f.is_spurious ? '#f43f5e' : '#10b981'
    })).sort((a, b) => b.score - a.score);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Higher score indicates cross-environment stability</span>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Invariant Causal
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Spurious Shift
                    </span>
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.6} />
                        <XAxis type="number" domain={[0, 1]} stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FeatureRankChart;
