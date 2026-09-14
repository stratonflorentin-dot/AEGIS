import React from 'react';

const TaskGraph = () => {
  const tasks = [
    { id: 1, label: 'VOICE INPUT', status: 'done', x: 20, y: 30 },
    { id: 2, label: 'COMMAND PARSE', status: 'done', x: 50, y: 60 },
    { id: 3, label: 'AI CORE', status: 'active', x: 80, y: 30 },
    { id: 4, label: 'APP LINK', status: 'pending', x: 110, y: 60 },
    { id: 5, label: 'VOICE OUT', status: 'pending', x: 140, y: 30 },
  ];

  return (
    <div className="hud-panel p-4 h-48 overflow-hidden relative">
      <h3 className="text-[10px] font-hud mb-3 opacity-60 tracking-widest uppercase">Process Graph</h3>
      <svg className="w-full h-full" viewBox="0 0 160 80">
        {/* Connection Lines */}
        {tasks.map((task, i) => {
          if (i === tasks.length - 1) return null;
          const next = tasks[i + 1];
          return (
            <line
              key={`line-${task.id}`}
              x1={task.x} y1={task.y}
              x2={next.x} y2={next.y}
              stroke={task.status === 'done' ? 'var(--hud-primary)' : 'var(--border-hud)'}
              strokeWidth="0.5"
              strokeDasharray="2,2"
              className={task.status === 'active' ? 'animate-[dash_2s_linear_infinite]' : ''}
            />
          );
        })}
        
        {/* Nodes */}
        {tasks.map((task) => (
          <g key={task.id}>
            <circle
              cx={task.x} cy={task.y} r="3"
              fill={task.status === 'done' ? 'var(--hud-primary)' : 'transparent'}
              stroke={task.status === 'pending' ? 'var(--border-hud)' : 'var(--hud-primary)'}
              strokeWidth="0.5"
              className={task.status === 'active' ? 'animate-pulse' : ''}
            />
            {task.status === 'active' && (
              <circle
                cx={task.x} cy={task.y} r="5"
                fill="transparent"
                stroke="var(--hud-primary)"
                strokeWidth="0.2"
                className="animate-ping"
              />
            )}
            <text
              x={task.x} y={task.y + 8}
              textAnchor="middle"
              className="text-[4px] font-hud fill-hud-primary opacity-60 uppercase"
            >
              {task.label}
            </text>
          </g>
        ))}
      </svg>
      
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -10; }
        }
      `}</style>
    </div>
  );
};

export default TaskGraph;
