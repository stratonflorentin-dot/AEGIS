import React, { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const AlertSystem = ({ alerts, removeAlert }) => {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-72">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className={`hud-panel p-3 flex gap-3 items-start border-l-4 ${
              alert.type === 'DANGER' ? 'border-l-hud-danger' :
              alert.type === 'WARN' ? 'border-l-hud-accent' :
              alert.type === 'SUCCESS' ? 'border-l-hud-success' : 'border-l-hud-primary'
            }`}
          >
            <div className={`mt-0.5 ${
              alert.type === 'DANGER' ? 'text-hud-danger' :
              alert.type === 'WARN' ? 'text-hud-accent' :
              alert.type === 'SUCCESS' ? 'text-hud-success' : 'text-hud-primary'
            }`}>
              {alert.type === 'DANGER' ? <AlertCircle size={16} /> :
               alert.type === 'WARN' ? <AlertTriangle size={16} /> :
               alert.type === 'SUCCESS' ? <CheckCircle size={16} /> : <Info size={16} />}
            </div>
            
            <div className="flex-1">
              <div className="text-[10px] font-hud tracking-widest opacity-60 mb-1 uppercase">
                {alert.type || 'SYSTEM'}
              </div>
              <div className="text-xs font-body leading-tight">
                {alert.message}
              </div>
            </div>

            <button 
              onClick={() => removeAlert(alert.id)}
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AlertSystem;
