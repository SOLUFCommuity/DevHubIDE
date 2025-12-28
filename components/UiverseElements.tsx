
import React, { useState } from 'react';

// Specialized Neon Button with pulsing glow effect
export const NeonButton: React.FC<{ onClick?: () => void, children: React.ReactNode, active?: boolean, className?: string, disabled?: boolean, variant?: 'primary' | 'secondary' | 'danger' }> = ({ onClick, children, active, className = '', disabled = false, variant = 'primary' }) => {
  const variants = {
    primary: active 
      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
      : 'hover:bg-blue-600/10 text-gray-400 border-transparent hover:border-blue-500/30 hover:text-blue-300',
    secondary: active
      ? 'bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
      : 'hover:bg-purple-600/10 text-gray-400 border-transparent hover:border-purple-500/30 hover:text-purple-300',
    danger: 'hover:bg-red-600/10 text-gray-400 border-transparent hover:border-red-500/30 hover:text-red-400',
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg transition-all duration-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border disabled:opacity-30 disabled:cursor-not-allowed bg-[#161b22] group ${variants[variant]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
    </button>
  );
};

// High-tech Cyber Input
export const CyberInput: React.FC<{ value: string, onChange: (val: string) => void, placeholder?: string, type?: string, icon?: React.ReactNode, onKeyDown?: (e: React.KeyboardEvent) => void }> = ({ value, onChange, placeholder, type = 'text', icon, onKeyDown }) => (
  <div className="relative group w-full">
    {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">{icon}</div>}
    <input
      type={type}
      value={value}
      onKeyDown={onKeyDown}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#0d1117] border border-[#30363d] group-hover:border-[#484f58] focus:border-blue-500/50 rounded-lg py-2 ${icon ? 'pl-10' : 'pl-3'} pr-3 text-xs text-gray-300 outline-none transition-all focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:ring-1 focus:ring-blue-500/20`}
    />
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-blue-500 group-focus-within:w-full transition-all duration-300"></div>
  </div>
);

// Neon Toggle Switch
export const NeonToggle: React.FC<{ checked: boolean, onChange: () => void, label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between gap-3 cursor-pointer group" onClick={onChange}>
    {label && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">{label}</span>}
    <div className={`relative w-8 h-4 rounded-full transition-all duration-300 ${checked ? 'bg-blue-600/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-gray-800'}`}>
      <div className={`absolute top-1 left-1 w-2 h-2 rounded-full transition-all duration-300 ${checked ? 'translate-x-4 bg-blue-400 shadow-[0_0_5px_white]' : 'bg-gray-500'}`}></div>
    </div>
  </div>
);

// Glassmorphism Card with animated border
export const GlassCard: React.FC<{ children: React.ReactNode, title?: string, className?: string, headerAction?: React.ReactNode }> = ({ children, title, className = '', headerAction }) => (
  <div className={`relative bg-[#161b22]/60 backdrop-blur-xl border border-[#30363d] rounded-2xl p-4 shadow-2xl overflow-hidden group/card ${className}`}>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
    {title && (
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</h3>
        {headerAction}
      </div>
    )}
    <div className="relative z-10">{children}</div>
  </div>
);

// Modern Plugin Card
export const PluginCard: React.FC<{ plugin: { name: string, description: string, version: string, installed: boolean }, onInstall: () => void }> = ({ plugin, onInstall }) => (
  <div className="relative p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-blue-500/50 transition-all group overflow-hidden">
    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
       <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <h4 className="text-xs font-black text-gray-100 uppercase tracking-tight">{plugin.name}</h4>
    </div>
    <p className="text-[10px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">{plugin.description}</p>
    <div className="flex items-center justify-between">
       <span className="text-[9px] font-mono text-gray-600">v{plugin.version}</span>
       <button 
         onClick={onInstall}
         disabled={plugin.installed}
         className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all
           ${plugin.installed 
             ? 'text-green-500 bg-green-500/10 border border-green-500/20' 
             : 'text-blue-400 bg-blue-400/10 border border-blue-400/20 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}
       >
         {plugin.installed ? 'Loaded' : 'Install'}
       </button>
    </div>
  </div>
);

export const TechLoader: React.FC<{ size?: string }> = ({ size = 'w-1.5 h-1.5' }) => (
  <div className="flex items-center justify-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <div 
        key={i} 
        className={`${size} bg-blue-500 rounded-sm animate-pulse`} 
        style={{ animationDelay: `${i * 0.2}s` }}
      ></div>
    ))}
  </div>
);

export const StatusDot: React.FC<{ status: 'online' | 'offline' | 'busy' | 'success' | 'failed' | 'running' }> = ({ status }) => {
  const colors = {
    online: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]',
    offline: 'bg-gray-700',
    busy: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]',
    success: 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]',
    failed: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
    running: 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.6)]'
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status]} transition-all duration-500`}></div>;
};

export const WorkflowBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    idle: 'bg-gray-800 text-gray-500 border-gray-700'
  }[status] || 'bg-gray-800 text-gray-500 border-gray-700';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] border font-black uppercase tracking-tighter ${styles}`}>
      {status}
    </span>
  );
};

export const TerminalTab: React.FC<{ name: string, active: boolean, onClick: () => void, onClose: (e: React.MouseEvent) => void }> = ({ name, active, onClick, onClose }) => (
  <div 
    onClick={onClick}
    className={`group flex items-center gap-3 px-4 h-full cursor-pointer transition-all border-b-2 text-[9px] font-black uppercase tracking-[0.1em]
      ${active ? 'bg-[#0d1117] text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-[#1f242b]'}`}
  >
    <div className={`w-1.5 h-1.5 rounded-sm ${active ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,1)]' : 'bg-gray-700'}`}></div>
    <span>{name}</span>
    <button 
      onClick={onClose}
      className={`opacity-0 group-hover:opacity-100 hover:text-white rounded px-1 transition-all hover:bg-white/10`}
    >
      ×
    </button>
  </div>
);

export const TaskItem: React.FC<{ text: string, completed: boolean, onToggle: () => void, onDelete: () => void }> = ({ text, completed, onToggle, onDelete }) => (
  <div className="group flex items-center justify-between p-3 rounded-xl bg-[#161b22] hover:bg-[#1c2128] transition-all border border-[#30363d] hover:border-blue-500/30">
    <div className="flex items-center gap-3 overflow-hidden">
      <div 
        onClick={onToggle}
        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
          completed ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'border-gray-700 hover:border-blue-500'
        }`}
      >
        {completed && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-[11px] font-medium transition-all truncate ${completed ? 'text-gray-600 line-through italic' : 'text-gray-300'}`}>
        {text}
      </span>
    </div>
    <button 
      onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all rounded-md hover:bg-red-500/10"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
  </div>
);

export const SearchResultItem: React.FC<{ fileName: string, line: number, text: string, onClick: () => void }> = ({ fileName, line, text, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full text-left p-3 rounded-xl bg-[#161b22] hover:bg-[#1c2128] transition-all border border-[#30363d] hover:border-blue-500/30 group"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black text-blue-400 flex items-center gap-2 uppercase tracking-tight">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        {fileName}
      </span>
      <span className="text-[9px] font-mono text-gray-600 group-hover:text-blue-500/50">L{line}</span>
    </div>
    <div className="text-[10px] text-gray-500 font-mono truncate pl-3 border-l-2 border-blue-500/20">
      {text.trim()}
    </div>
  </button>
);

export const GitFileItem: React.FC<{ fileName: string, status: 'M' | 'A' | 'D', onAction: () => void, actionIcon: React.ReactNode, onDiscard?: () => void }> = ({ fileName, status, onAction, actionIcon, onDiscard }) => (
  <div className="group flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#161b22] transition-colors">
    <div className="flex items-center gap-3 overflow-hidden">
      <span className={`w-4 text-[9px] font-black text-center ${status === 'M' ? 'text-orange-400' : status === 'A' ? 'text-green-400' : 'text-red-400'}`}>
        {status}
      </span>
      <span className="text-[11px] text-gray-300 truncate font-medium">{fileName}</span>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      {onDiscard && (
        <button 
          onClick={onDiscard}
          className="p-1 text-gray-600 hover:text-red-400 transition-colors"
          title="Discard changes"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
      <button 
        onClick={onAction}
        className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
      >
        {actionIcon}
      </button>
    </div>
  </div>
);

export const BranchSwitcher: React.FC<{ current: string, onSwitch: (b: string) => void }> = ({ current, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const branches = ['main', 'develop', 'feature/ai-integration', 'fix/smart-audit'];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group"
      >
        <svg className="w-3 h-3 text-blue-400 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        <span className="text-[9px] font-mono text-blue-400 font-black">{current}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-[100] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-1 mb-2 text-[8px] font-black text-gray-600 uppercase tracking-widest">Select Branch</div>
          {branches.map(b => (
            <button
              key={b}
              onClick={() => { onSwitch(b); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[10px] font-medium transition-colors hover:bg-blue-500/10 ${current === b ? 'text-blue-400 bg-blue-500/5' : 'text-gray-400'}`}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const GitAccordion: React.FC<{ title: string, count: number, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, count, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2 py-1 hover:bg-white/5 rounded-md group transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">{title}</span>
        </div>
        <span className="text-[9px] font-mono text-gray-700 bg-white/5 px-1.5 rounded">{count}</span>
      </button>
      {isOpen && <div className="pl-2 space-y-0.5">{children}</div>}
    </div>
  );
};
