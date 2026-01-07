import { useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';

// 커스텀 노드 컴포넌트
function ServiceNode({ data }) {
  const getTypeStyles = type => {
    switch (type) {
      case 'Core':
        return {
          border: 'border-blue-500',
          badge: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          shadow: 'shadow-blue-100'
        };
      case 'Supporting':
        return {
          border: 'border-emerald-500',
          badge: 'bg-gradient-to-r from-emerald-500 to-teal-600',
          shadow: 'shadow-emerald-100'
        };
      case 'Generic':
        return {
          border: 'border-slate-400',
          badge: 'bg-gradient-to-r from-slate-400 to-slate-500',
          shadow: 'shadow-slate-100'
        };
      default:
        return {
          border: 'border-slate-400',
          badge: 'bg-slate-400',
          shadow: 'shadow-slate-100'
        };
    }
  };

  const styles = getTypeStyles(data.type);

  return (
    <div className={cn(
      'px-4 py-3 rounded-xl border-2 bg-white shadow-md min-w-[140px]',
      styles.border,
      styles.shadow
    )}>
      <div className={cn(
        'text-xs px-2.5 py-0.5 rounded-full text-white mb-2 inline-block font-medium',
        styles.badge
      )}>
        {data.type}
      </div>
      <div className="font-medium text-slate-900 text-sm text-center">
        {data.label}
      </div>
    </div>
  );
}

// API Gateway 노드 컴포넌트
function GatewayNode({ data }) {
  return (
    <div className="px-5 py-3 rounded-xl border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md shadow-blue-100 min-w-[140px]">
      <div className="font-semibold text-blue-700 text-sm text-center">
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = {
  service: ServiceNode,
  gateway: GatewayNode
};

function ArchitectureDiagram({ services, communications }) {
  // 노드 생성
  const initialNodes = useMemo(() => {
    const nodes = [];

    // API Gateway 노드
    nodes.push({
      id: 'api-gateway',
      type: 'gateway',
      position: { x: 300, y: 0 },
      data: { label: 'API Gateway' }
    });

    // 서비스 노드들 - 타입별로 그룹화
    const coreServices = services.filter(s => s.type === 'Core');
    const supportingServices = services.filter(s => s.type === 'Supporting');
    const genericServices = services.filter(s => s.type === 'Generic');

    let xOffset = 0;
    const yLevel1 = 120;
    const yLevel2 = 260;
    const nodeWidth = 180;

    // Supporting 서비스 (왼쪽)
    supportingServices.forEach((service, idx) => {
      nodes.push({
        id: service.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'service',
        position: { x: idx * nodeWidth, y: yLevel1 },
        data: { label: service.name, type: service.type }
      });
    });
    xOffset = supportingServices.length * nodeWidth;

    // Core 서비스 (중앙)
    coreServices.forEach((service, idx) => {
      nodes.push({
        id: service.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'service',
        position: { x: xOffset + idx * nodeWidth, y: yLevel1 },
        data: { label: service.name, type: service.type }
      });
    });

    // Generic 서비스 (아래)
    const genericStartX = (services.length * nodeWidth - genericServices.length * nodeWidth) / 2;
    genericServices.forEach((service, idx) => {
      nodes.push({
        id: service.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'service',
        position: { x: genericStartX + idx * nodeWidth, y: yLevel2 },
        data: { label: service.name, type: service.type }
      });
    });

    return nodes;
  }, [services]);

  // 엣지 생성
  const initialEdges = useMemo(() => {
    const edges = [];

    // API Gateway에서 모든 서비스로 연결
    services.forEach(service => {
      const serviceId = service.name.toLowerCase().replace(/\s+/g, '-');
      edges.push({
        id: `gateway-${serviceId}`,
        source: 'api-gateway',
        target: serviceId,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
      });
    });

    // 서비스 간 통신
    communications.forEach((comm, idx) => {
      const fromId = comm.from.toLowerCase().replace(/\s+/g, '-');
      const toId = comm.to.toLowerCase().replace(/\s+/g, '-');

      edges.push({
        id: `comm-${idx}`,
        source: fromId,
        target: toId,
        type: 'smoothstep',
        animated: comm.method === 'Event',
        style: {
          stroke: comm.method === 'Event' ? '#8b5cf6' : '#3b82f6',
          strokeWidth: 2,
          strokeDasharray: comm.method === 'Event' ? '5,5' : undefined
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: comm.method === 'Event' ? '#8b5cf6' : '#3b82f6'
        },
        label: comm.method,
        labelStyle: { fontSize: 10 }
      });
    });

    return edges;
  }, [services, communications]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[400px] bg-slate-50/50 rounded-xl border border-slate-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Controls className="bg-white border-slate-200 shadow-sm" />
        <Background gap={12} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
}

export default ArchitectureDiagram;
