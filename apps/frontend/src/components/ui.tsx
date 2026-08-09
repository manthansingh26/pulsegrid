import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';

export const StatusBadge = ({ status }: { status: string }) => {
  let icon = <HelpCircle size={12} />;
  
  if (status === 'up') icon = <CheckCircle size={12} />;
  if (status === 'degraded') icon = <AlertTriangle size={12} />;
  if (status === 'down') icon = <AlertCircle size={12} />;

  return (
    <span className={`status-badge ${status || 'unknown'}`}>
      {icon} {status || 'Unknown'}
    </span>
  );
};

export const StatusIndicator = ({ status }: { status: string }) => (
  <div className={`status-indicator ${status || 'unknown'}`} />
);

export const StatCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
  </div>
);

export const LoadingState = ({ message = 'Loading data...' }: { message?: string }) => (
  <div className="state-container">
    <Loader2 className="state-icon animate-spin" size={32} />
    <div className="state-title">{message}</div>
  </div>
);

export const EmptyState = ({ title = 'No data', message = '' }: { title?: string; message?: string }) => (
  <div className="state-container">
    <div className="state-title">{title}</div>
    <div>{message}</div>
  </div>
);

export const ErrorState = ({ message = 'Something went wrong.' }: { message?: string }) => (
  <div className="state-container">
    <AlertCircle className="state-icon text-red-500" size={32} />
    <div className="state-title">Error</div>
    <div>{message}</div>
  </div>
);
