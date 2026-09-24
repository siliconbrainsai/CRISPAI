import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const CausalDAG = ({ data }) => {
    const { nodes, edges, summary } = useMemo(() => {
        if (!data) return { nodes: [], edges: [], summary: {} };

        const outcomeVar = data.outcome || 'outcome';
        const rawEdges = data.causal_edges || [];
        const rawFeatures = data.causal_features || [];

        // Collect all distinct variable names
        const nodeSet = new Set();
        if (outcomeVar) nodeSet.add(outcomeVar);
        rawEdges.forEach(e => {
            if (e.source) nodeSet.add(e.source);
            if (e.target) nodeSet.add(e.target);
        });
        rawFeatures.forEach(f => {
            if (f.feature) nodeSet.add(f.feature);
        });

        const nodeList = Array.from(nodeSet);
        const spuriousMap = {};
        rawFeatures.forEach(f => {
            spuriousMap[f.feature] = f.is_spurious;
        });

        // Layered layout: Predictors positioned on left / grid, Outcome on right
        const initialNodes = [];
        const nonOutcomeNodes = nodeList.filter(n => n !== outcomeVar);

        nonOutcomeNodes.forEach((name, idx) => {
            const isSpurious = spuriousMap[name] || false;
            // Arrange in 2 columns if many features
            const col = idx % 2;
            const row = Math.floor(idx / 2);

            initialNodes.push({
                id: name,
                position: { x: 40 + col * 180, y: 30 + row * 90 },
                data: { label: name },
                style: {
                    background: isSpurious ? '#1e293b' : '#064e3b',
                    color: isSpurious ? '#94a3b8' : '#34d399',
                    border: isSpurious ? '1px dashed #ef4444' : '1px solid #10b981',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: '8px 14px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }
            });
        });

        // Outcome node
        const outcomeY = Math.max(80, Math.min(300, (nonOutcomeNodes.length * 45)));
        initialNodes.push({
            id: outcomeVar,
            position: { x: 420, y: outcomeY },
            data: { label: `Target: ${outcomeVar}` },
            style: {
                background: '#4338ca',
                color: '#ffffff',
                border: '2px solid #818cf8',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                padding: '10px 16px',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)'
            }
        });

        // Create edges
        const initialEdges = [];

        if (rawEdges.length > 0) {
            rawEdges.forEach((edge, idx) => {
                const isDirected = edge.is_directed !== false;
                const isSpurious = spuriousMap[edge.source] || false;
                const color = isSpurious ? '#f43f5e' : '#10b981';

                initialEdges.push({
                    id: `edge-${idx}`,
                    source: edge.source,
                    target: edge.target,
                    animated: isDirected && !isSpurious,
                    label: edge.effect !== undefined ? `${edge.effect > 0 ? '+' : ''}${edge.effect}` : undefined,
                    labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 500 },
                    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
                    style: {
                        stroke: color,
                        strokeWidth: 2,
                        strokeDasharray: isDirected ? 'none' : '4,4'
                    },
                    markerEnd: isDirected ? {
                        type: MarkerType.ArrowClosed,
                        color: color,
                        width: 16,
                        height: 16
                    } : undefined
                });
            });
        } else {
            // Fallback from features if edges array was empty
            rawFeatures.forEach((feat, idx) => {
                const isSpurious = feat.is_spurious;
                const color = isSpurious ? '#f43f5e' : '#10b981';
                initialEdges.push({
                    id: `feat-edge-${idx}`,
                    source: feat.feature,
                    target: outcomeVar,
                    animated: !isSpurious,
                    style: {
                        stroke: color,
                        strokeWidth: 2,
                        strokeDasharray: isSpurious ? '4,4' : 'none'
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: color,
                        width: 16,
                        height: 16
                    }
                });
            });
        }

        return {
            nodes: initialNodes,
            edges: initialEdges,
            summary: {
                totalNodes: initialNodes.length,
                totalEdges: initialEdges.length,
                algorithm: data.algorithm || 'PC-Algorithm & IRM Ensemble'
            }
        };
    }, [data]);

    return (
        <div className="space-y-3">
            <div className="h-[280px] rounded-lg bg-slate-950/70 relative border border-slate-800 overflow-hidden">
                <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background color="#334155" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
            
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1 pt-1">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Causal Mechanism
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Spurious / Confounded
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Target Outcome
                    </span>
                </div>
                <span className="text-slate-500">
                    {summary.totalEdges} relations ({edges.filter(e => e.markerEnd).length} directed)
                </span>
            </div>
        </div>
    );
};

export default CausalDAG;
