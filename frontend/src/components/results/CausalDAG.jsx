import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const CausalDAG = ({ data }) => {
    const { nodes, edges } = useMemo(() => {
        if (!data || !data.causal_features) return { nodes: [], edges: [] };

        const targetNode = {
            id: 'diagnosis',
            position: { x: 400, y: Math.max(150, data.causal_features.length * 30) },
            data: { label: 'Diagnosis' },
            style: { background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', padding: '10px' }
        };

        const initialNodes = [targetNode];
        const initialEdges = [];

        data.causal_features.forEach((feat, index) => {
            const isSpurious = feat.is_spurious;
            const yPos = 50 + index * 80;
            const nodeId = `node-${index}`;

            initialNodes.push({
                id: nodeId,
                position: { x: 50, y: yPos },
                data: { label: feat.feature },
                style: { 
                    background: isSpurious ? '#334155' : '#10b981', 
                    color: '#fff', 
                    border: 'none',
                    opacity: isSpurious ? 0.7 : 1,
                    padding: '10px'
                }
            });

            initialEdges.push({
                id: `e-${index}`,
                source: nodeId,
                target: 'diagnosis',
                animated: !isSpurious,
                style: { stroke: isSpurious ? '#ef4444' : '#10b981', strokeWidth: 2, strokeDasharray: isSpurious ? '5,5' : 'none' },
                markerEnd: { type: MarkerType.ArrowClosed, color: isSpurious ? '#ef4444' : '#10b981' },
            });
        });

        return { nodes: initialNodes, edges: initialEdges };
    }, [data]);

    return (
        <div className="bg-slate-900 rounded-lg p-4 shadow-xl mt-6">
            <h3 className="font-bold text-lg mb-2 text-slate-100">Causal Directed Acyclic Graph (DAG)</h3>
            <div className="h-80 rounded bg-slate-950/50 relative border border-slate-800">
                <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background color="#334155" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
            <div className="mt-4 flex gap-6 text-sm justify-center">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> True Causal Factor</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-700 border-2 border-red-500 border-dashed rounded-full inline-block"></span> Spurious Correlation</span>
            </div>
        </div>
    );
};

export default CausalDAG;
