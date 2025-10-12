import React from 'react';
import { getBezierPath, EdgeProps } from 'react-flow-renderer';

const ConsumesEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, label }) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <g>
      <path
        id={id}
        style={{ stroke: '#1976d2', strokeWidth: 3, strokeDasharray: '5,5' }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {label && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" fill="#1976d2" fontSize="12px" fontWeight="bold">
            {label}
          </textPath>
        </text>
      )}
    </g>
  );
};

export default ConsumesEdge;
