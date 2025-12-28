
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IDEType, ProjectState, FileEntry, WorkflowRun, WorkflowStatus, TerminalInstance, TerminalTheme, Task, Plugin } from './types';
import { NeonButton, GlassCard, TechLoader, StatusDot, WorkflowBadge, TerminalTab, TaskItem, SearchResultItem, PluginCard, CyberInput, NeonToggle, GitFileItem, BranchSwitcher, GitAccordion } from './components/UiverseElements';
import { analyzeCode, chatWithAI, completeCode } from './services/gemini';

const INITIAL_FILES: FileEntry[] = [
  { 
    id: '1', name: 'contracts', type: 'folder', children: [
      { id: '2', name: 'Storage.sol', type: 'file', language: 'solidity', content: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Storage {\n    uint256 public val;\n    function store(uint256 x) public {\n        val = x;\n    }\n}' },
      { id: '3', name: 'Token.sol', type: 'file', language: 'solidity', content: 'contract Token { mapping(address=>uint) balances; }' }
    ]
  },
  { id: '4', name: '.github', type: 'folder', children: [
    { id: '5', name: 'workflows', type: 'folder', children: [
      { id: '6', name: 'main.yml', type: 'file', language: 'yaml', content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Run Tests\n        run: npm test' },
      { id: '8', name: 'deploy.yml', type: 'file', language: 'yaml', content: 'name: CD\non: [manual]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Deploy to Mainnet\n        run: hardhat deploy' }
    ]}
  ]},
  { id: '7', name: 'README.md', type: 'file', language: 'markdown', content: '# Soluf-th Project\nDeveloper hub simulation.' }
];

const INITIAL_PLUGINS: Plugin[] = [
  { id: 'p1', name: 'Solidity Compiler', description: 'Advanced Solidity compiler for EVM 1.0/2.0.', version: '0.8.24', installed: true, category: 'compiler' },
  { id: 'p2', name: 'Etherscan Verifier', description: 'Automatically verify contracts on Etherscan.', version: '1.2.0', installed: false, category: 'library' },
  { id: 'p3', name: 'Hardhat Toolbox', description: 'Essential tools for Hardhat development.', version: '2.0.4', installed: false, category: 'library' },
  { id: 'p4', name: 'OpenZeppelin Libs', description: 'Standard secure smart contract libraries.', version: '5.0.0', installed: true, category: 'library' }
];

const INITIAL_WORKFLOWS: WorkflowRun[] = [
  { id: 'wf1', workflowName: 'CI Pipeline', status: 'success', logs: ['Build started', 'npm install successful', 'Tests passed', 'Build finished'] },
  { id: 'wf2', workflowName: 'CD Deployment', status: 'idle', logs: [] }
];

const INITIAL_TERMINALS: TerminalInstance[] = [
  { id: 'term-1', name: 'bash', logs: ['Welcome to Soluf-th Bash v5.1', 'Type "help" for available commands.'] },
  { id: 'term-2', name: 'node', logs: ['Welcome to Node.js v18.16.0.', 'Type ".help" for more information.'] }
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', text: 'Optimize Solidity Storage', completed: false, createdAt: Date.now() },
  { id: 't2', text: 'Update GitHub Actions config', completed: true, createdAt: Date.now() - 100000 },
  { id: 't3', text: 'Refactor AI response handling in the UI', completed: false, createdAt: Date.now() }
];

const COMMANDS = ['help', 'clear', 'ls', 'npm test', 'npm deploy', 'audit', 'whoami', 'theme monokai', 'theme cyberpunk', 'theme github-dark', 'cat', 'rm', 'mkdir', 'git status', 'git commit', 'git push', 'git branch'];

const App: React.FC = () => {
  const [state, setState] = useState<ProjectState>({
    activeIDE: IDEType.VSCODE,
    files: INITIAL_FILES,
    currentFileId: '2',
    isTerminalOpen: true,
    isAISidebarOpen: true,
    activeSidebarTab: 'explorer',
    workflows: INITIAL_WORKFLOWS,
    terminals: INITIAL_TERMINALS,
    activeTerminalId: 'term-1',
    terminalTheme: 'github-dark',
    tasks: INITIAL_TASKS,
    plugins: INITIAL_PLUGINS,
    isCompiling: false,
    lastCompileStatus: 'none',
    git: {
      branch: 'main',
      modifiedFiles: ['2', '7'],
      stagedFiles: [],
      isPushing: false
    }
  });

  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completion, setCompletion] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoCompile, setAutoCompile] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  
  const terminalLogsRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [state.terminals, state.activeTerminalId]);

  const addLog = (msg: string, termId?: string) => {
    const targetId = termId || state.activeTerminalId;
    setState(s => ({
      ...s,
      terminals: s.terminals.map(t => t.id === targetId ? { ...t, logs: [...t.logs, msg] } : t)
    }));
  };

  const activeTerminal = state.terminals.find(t => t.id === state.activeTerminalId);

  const getFileNameById = useCallback((id: string) => {
    const findInFiles = (files: FileEntry[]): string | null => {
      for (const f of files) {
        if (f.id === id) return f.name;
        if (f.children) {
          const res = findInFiles(f.children);
          if (res) return res;
        }
      }
      return null;
    };
    return findInFiles(state.files) || 'unknown_file';
  }, [state.files]);

  const activeFile = useCallback(() => {
    const findFile = (files: FileEntry[], id: string): FileEntry | undefined => {
      for (const f of files) {
        if (f.id === id) return f;
        if (f.children) {
          const found = findFile(f.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    return state.currentFileId ? findFile(state.files, state.currentFileId) : null;
  }, [state.currentFileId, state.files]);

  const allFileNames = useMemo(() => {
    const names: string[] = [];
    const scan = (files: FileEntry[]) => {
      files.forEach(f => {
        names.push(f.name);
        if (f.children) scan(f.children);
      });
    };
    scan(state.files);
    return names;
  }, [state.files]);

  const runWorkflow = async (id: string) => {
    setState(s => ({
      ...s,
      workflows: s.workflows.map(wf => wf.id === id ? { ...wf, status: 'running', logs: ['Job dispatched...', 'Initializing runner...'] } : wf)
    }));
    addLog(`GitHub Actions: Dispatching job ${id}...`);
    await new Promise(r => setTimeout(r, 2000));
    setState(s => ({
      ...s,
      workflows: s.workflows.map(wf => wf.id === id ? { ...wf, status: 'success', logs: [...wf.logs, 'Runner started', 'Executing steps', 'Process completed with exit code 0'] } : wf)
    }));
    addLog(`GitHub Actions: Job ${id} completed successfully.`);
  };

  const installPlugin = (id: string) => {
    setState(s => ({ ...s, plugins: s.plugins.map(p => p.id === id ? { ...p, installed: true } : p) }));
    addLog(`System: Plugin ${id} installed.`);
  };

  const stageFile = (id: string) => {
    setState(s => ({
      ...s,
      git: {
        ...s.git,
        modifiedFiles: s.git.modifiedFiles.filter(fid => fid !== id),
        stagedFiles: [...s.git.stagedFiles, id]
      }
    }));
  };

  const unstageFile = (id: string) => {
    setState(s => ({
      ...s,
      git: {
        ...s.git,
        stagedFiles: s.git.stagedFiles.filter(fid => fid !== id),
        modifiedFiles: [...s.git.modifiedFiles, id]
      }
    }));
  };

  const discardChanges = (id: string) => {
    setState(s => ({
      ...s,
      git: { ...s.git, modifiedFiles: s.git.modifiedFiles.filter(fid => fid !== id) }
    }));
    addLog(`git: discarded changes in ${getFileNameById(id)}`);
  };

  const handleCommit = () => {
    if (!commitMessage.trim() || state.git.stagedFiles.length === 0) return;
    addLog(`git: committed ${state.git.stagedFiles.length} files: "${commitMessage}"`);
    setState(s => ({ ...s, git: { ...s.git, stagedFiles: [] } }));
    setCommitMessage('');
  };

  const handlePush = async () => {
    if (state.git.isPushing) return;
    setState(s => ({ ...s, git: { ...s.git, isPushing: true } }));
    addLog(`git: pushing to origin/${state.git.branch}...`);
    await new Promise(r => setTimeout(r, 2000));
    setState(s => ({ ...s, git: { ...s.git, isPushing: false } }));
    addLog(`git: push successful.`);
  };

  const switchBranch = (branch: string) => {
    setState(s => ({ ...s, git: { ...s.git, branch } }));
    addLog(`git: switched to branch '${branch}'`);
  };

  const handleCommand = async (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return;
    setCommandHistory(prev => [cleanCmd, ...prev.filter(h => h !== cleanCmd)].slice(0, 50));
    setHistoryPointer(-1);
    const parts = cleanCmd.split(' ');
    const lowerCmd = parts[0].toLowerCase();
    addLog(`soluf-th@dev:~$ ${cleanCmd}`);

    if (lowerCmd === 'clear') {
      setState(s => ({ ...s, terminals: s.terminals.map(t => t.id === s.activeTerminalId ? { ...t, logs: [] } : t) }));
    } else if (lowerCmd === 'ls') {
      addLog('contracts/  .github/  README.md  package.json');
    } else if (lowerCmd === 'git' && parts[1] === 'status') {
      addLog(`On branch ${state.git.branch}`);
      addLog(`Changes not staged for commit: ${state.git.modifiedFiles.length}`);
      addLog(`Changes to be committed: ${state.git.stagedFiles.length}`);
    } else if (lowerCmd === 'git' && parts[1] === 'branch') {
      addLog(`* ${state.git.branch}\n  develop\n  feature/ai-integration`);
    } else if (lowerCmd === 'theme') {
      const themeName = parts[1] as TerminalTheme;
      if (['monokai', 'cyberpunk', 'github-dark'].includes(themeName)) {
        setState(s => ({ ...s, terminalTheme: themeName }));
        addLog(`Terminal theme switched to ${themeName}`);
      } else {
        addLog(`Unknown theme: ${themeName || 'undefined'}`);
      }
    } else {
      addLog(`Command not found: ${lowerCmd}`);
    }
    setCommandInput('');
    setSuggestion('');
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommand(commandInput);
    else if (e.key === 'Tab') { e.preventDefault(); if (suggestion) { setCommandInput(suggestion); setSuggestion(''); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (commandHistory.length > 0) { const next = Math.min(historyPointer + 1, commandHistory.length - 1); setHistoryPointer(next); setCommandInput(commandHistory[next]); setSuggestion(''); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const next = historyPointer - 1; setHistoryPointer(next); setCommandInput(next >= 0 ? commandHistory[next] : ''); setSuggestion(''); }
  };

  const onCommandChange = (val: string) => {
    setCommandInput(val);
    if (val.trim()) {
      const parts = val.split(' ');
      const cur = parts[parts.length - 1];
      if (parts.length === 1) setSuggestion(COMMANDS.find(c => c.startsWith(val.toLowerCase())) || '');
      else {
        const match = allFileNames.find(f => f.toLowerCase().startsWith(cur.toLowerCase()));
        setSuggestion(match ? `${parts.slice(0, -1).join(' ')} ${match}` : '');
      }
    } else setSuggestion('');
  };

  const renderHighlightedCommand = (logText: string) => {
    if (!logText.startsWith('soluf-th@dev:~$')) return <span className="text-gray-400 opacity-80">{logText}</span>;
    const prefix = 'soluf-th@dev:~$ ';
    const parts = logText.slice(prefix.length).split(' ');
    return (
      <div className="flex gap-2 font-mono">
        <span className={themeStyles.prompt}>soluf-th@dev:~$</span>
        <span>
          {parts.map((p, i) => {
            let clr = 'text-gray-300';
            const lp = p.toLowerCase();
            if (i === 0) clr = ['npm', 'git', 'cat', 'ls'].includes(lp) ? 'text-yellow-400 font-bold' : 'text-blue-400';
            else clr = ['test', 'commit', 'push', 'status'].includes(lp) ? 'text-purple-400 font-bold' : p.startsWith('-') ? 'text-orange-400' : 'text-gray-400';
            return <span key={i} className={`${clr} mr-1`}>{p}</span>;
          })}
        </span>
      </div>
    );
  };

  const handleAnalyze = async () => {
    const file = activeFile();
    if (!file || !file.content) return;
    setIsAiLoading(true);
    addLog(`AI Agent: Initiating smart audit for ${file.name}...`);
    try {
      const result = await analyzeCode(file.content, file.language || 'text');
      setAiResponse(result);
      addLog(`AI Agent: Audit complete. Detected ${result.issues.length} logic concerns.`);
    } catch (err) { addLog(`AI Error: Analysis process failed.`); }
    finally { setIsAiLoading(false); }
  };

  const handleCompile = async () => {
    const file = activeFile();
    if (!file || file.language !== 'solidity') return;
    setState(s => ({ ...s, isCompiling: true, lastCompileStatus: 'none', isTerminalOpen: true }));
    addLog(`Compiler Engine: Loading EVM context for ${file.name}...`);
    await new Promise(r => setTimeout(r, 2000));
    const success = !file.content?.includes('Error');
    setState(s => ({ ...s, isCompiling: false, lastCompileStatus: success ? 'success' : 'failed' }));
    if (success) addLog(`Compiler Engine: Build success.`); else addLog(`Compiler Engine: CRITICAL FAIL.`);
  };

  const handleAutocomplete = async () => {
    const file = activeFile();
    if (!file || !file.content || isCompleting) return;
    setIsCompleting(true);
    setCompletion(null);
    try {
      const result = await completeCode(file.content, file.language || 'text');
      setCompletion(result.trim());
      if (file.id && !state.git.modifiedFiles.includes(file.id) && !state.git.stagedFiles.includes(file.id)) {
        setState(s => ({ ...s, git: { ...s.git, modifiedFiles: [...s.git.modifiedFiles, file.id] } }));
      }
    } catch (err) { addLog(`AI Assist: Completion stream interrupted.`); }
    finally { setIsCompleting(false); }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiLoading(true);
    try {
      const file = activeFile();
      const response = await chatWithAI(userMsg, `Active File: ${file?.name || 'none'}\nContent:\n${file?.content || 'no content'}`);
      setChatMessages(prev => [...prev, { role: 'model', text: response || 'No response.' }]);
    } catch (err) { setChatMessages(prev => [...prev, { role: 'model', text: 'Error connecting to Soluf AI Core.' }]); }
    finally { setIsAiLoading(false); }
  };

  const addTask = (e?: React.FormEvent) => {
    e?.preventDefault(); if (!newTaskText.trim()) return;
    const newTask: Task = { id: `task-${Date.now()}`, text: newTaskText.trim(), completed: false, createdAt: Date.now() };
    setState(s => ({ ...s, tasks: [newTask, ...s.tasks] })); setNewTaskText('');
  };

  const toggleTask = (id: string) => setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }));
  const deleteTask = (id: string) => setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));

  const createNewTerminal = () => {
    const newId = `term-${Date.now()}`;
    setState(s => ({ ...s, terminals: [...s.terminals, { id: newId, name: 'sh', logs: ['Spawned.'] }], activeTerminalId: newId }));
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); if (state.terminals.length <= 1) return;
    const newTerms = state.terminals.filter(t => t.id !== id);
    setState(s => ({ ...s, terminals: newTerms, activeTerminalId: s.activeTerminalId === id ? newTerms[0].id : s.activeTerminalId }));
  };

  const renderFileTree = (files: FileEntry[], depth = 0) => {
    return files.map(file => (
      <div key={file.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          onClick={() => { file.type === 'file' && setState(s => ({ ...s, currentFileId: file.id })); setCompletion(null); }}
          className={`w-full text-left px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center gap-2.5 mb-0.5 ${state.currentFileId === file.id ? 'bg-blue-600/20 text-blue-300 shadow-inner' : 'text-gray-500 hover:bg-[#161b22] hover:text-gray-300'}`}
        >
          {file.type === 'folder' ? <svg className="w-3.5 h-3.5 text-blue-500/60" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> : <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          {file.name}
        </button>
        {file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ));
  };

  const themeStyles = {
    'github-dark': { bg: 'bg-[#0d1117]', text: 'text-gray-400', prompt: 'text-green-500' },
    'cyberpunk': { bg: 'bg-[#1a1b26]', text: 'text-[#bb9af7]', prompt: 'text-[#f7768e]' },
    'monokai': { bg: 'bg-[#272822]', text: 'text-[#f8f8f2]', prompt: 'text-[#a6e22e]' }
  }[state.terminalTheme];

  return (
    <div className="flex h-screen w-full bg-[#0d1117] overflow-hidden select-none text-gray-300">
      {/* Activity Bar */}
      <div className="w-16 bg-[#0a0c10] border-r border-[#30363d] flex flex-col items-center py-6 gap-8 z-50">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transform hover:scale-105 transition-transform cursor-pointer">S</div>
        <div className="flex flex-col gap-6 text-gray-600">
          {[
            { id: 'explorer', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
            { id: 'git', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
            { id: 'compiler', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
            { id: 'tasks', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setState(s => ({ ...s, activeSidebarTab: tab.id as any }))} className={`transition-all duration-300 relative group ${state.activeSidebarTab === tab.id ? 'text-blue-500' : 'hover:text-gray-300'}`}>
              {tab.icon}
              {state.activeSidebarTab === tab.id && <div className="absolute -left-5 top-0 w-1.5 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
            </button>
          ))}
          <div className="h-[1px] bg-[#30363d] w-8 mx-auto my-2"></div>
          <button onClick={() => setState(s => ({...s, isAISidebarOpen: !s.isAISidebarOpen}))} className={`${state.isAISidebarOpen ? 'text-purple-400' : 'hover:text-gray-300'} transition-all`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>
        </div>
      </div>

      {/* Sidebar Content Area */}
      <div className="w-72 bg-[#0a0c10]/50 border-r border-[#30363d] flex flex-col">
        {state.activeSidebarTab === 'explorer' && (
          <div className="flex-1 flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-[#30363d]/50 mb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Explorer</span>
              <StatusDot status="online" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">{renderFileTree(state.files)}</div>
          </div>
        )}

        {state.activeSidebarTab === 'git' && (
          <div className="flex-1 flex flex-col p-5 gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Source Control</h2>
              <BranchSwitcher current={state.git.branch} onSwitch={switchBranch} />
            </div>

            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="space-y-2">
                <CyberInput 
                  value={commitMessage} 
                  onChange={setCommitMessage} 
                  placeholder="Commit message..." 
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommit(); }}
                />
                <NeonButton 
                  className="w-full" 
                  disabled={state.git.stagedFiles.length === 0 || !commitMessage.trim()}
                  onClick={handleCommit}
                >
                  Commit
                </NeonButton>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                <GitAccordion title="Staged Changes" count={state.git.stagedFiles.length} defaultOpen={state.git.stagedFiles.length > 0}>
                  {state.git.stagedFiles.map(id => (
                    <GitFileItem 
                      key={id} 
                      fileName={getFileNameById(id)} 
                      status="M" 
                      onAction={() => unstageFile(id)} 
                      actionIcon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>}
                    />
                  ))}
                </GitAccordion>

                <GitAccordion title="Changes" count={state.git.modifiedFiles.length}>
                  {state.git.modifiedFiles.map(id => (
                    <GitFileItem 
                      key={id} 
                      fileName={getFileNameById(id)} 
                      status="M" 
                      onAction={() => stageFile(id)} 
                      onDiscard={() => discardChanges(id)}
                      actionIcon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                    />
                  ))}
                </GitAccordion>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#30363d]/50">
               <NeonButton 
                variant="secondary" 
                className="w-full" 
                onClick={handlePush}
                disabled={state.git.isPushing}
               >
                 {state.git.isPushing ? <TechLoader /> : 'Sync & Push'}
               </NeonButton>
            </div>
          </div>
        )}

        {state.activeSidebarTab === 'compiler' && (
          <div className="flex-1 flex flex-col p-5 gap-6">
            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Compiler</h2>
            <GlassCard title="EVM Settings">
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-600 uppercase">Solc Version</label>
                   <select className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[11px] text-gray-300 outline-none">
                      <option>0.8.24+commit.e11b9ed9</option>
                      <option>0.8.20+commit.a1b79ed9</option>
                   </select>
                </div>
                <NeonToggle checked={autoCompile} onChange={() => setAutoCompile(!autoCompile)} label="Auto Compile" />
              </div>
            </GlassCard>
            <NeonButton variant="secondary" onClick={handleCompile} disabled={state.isCompiling || !activeFile()?.name.endsWith('.sol')}>
              {state.isCompiling ? <TechLoader /> : 'Compile Now'}
            </NeonButton>
          </div>
        )}

        {state.activeSidebarTab === 'tasks' && (
          <div className="flex-1 flex flex-col p-5 gap-4">
            <h2 className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Project Tasks</h2>
            <form onSubmit={addTask}><CyberInput value={newTaskText} onChange={setNewTaskText} placeholder="Add task..." /></form>
            <div className="flex-1 overflow-y-auto space-y-3 py-2 scrollbar-hide">
               {state.tasks.map(t => <TaskItem key={t.id} {...t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />)}
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0c10]">
        <div className="h-12 bg-[#0a0c10] border-b border-[#30363d] flex items-center overflow-x-auto terminal-tabs-scroll scrollbar-hide">
          {activeFile() && (
            <div className="px-5 h-full bg-[#0d1117] flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-400 border-r border-[#30363d] relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500"></div>
              {activeFile()?.name}
              {state.git.modifiedFiles.includes(activeFile()!.id) && <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>}
            </div>
          )}
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto code-font text-[13px] leading-relaxed bg-[#0d1117]/80 p-8">
            {activeFile()?.content?.split('\n').map((line, i) => (
              <div key={i} className="flex gap-8 group/line">
                <span className="w-10 text-right text-gray-700 select-none opacity-40 font-mono text-[11px]">{i + 1}</span>
                <span className="text-gray-300 whitespace-pre">{line}</span>
              </div>
            )) || <div className="h-full flex flex-col items-center justify-center opacity-30 uppercase tracking-[0.5em] font-black">Soluf-th</div>}
            {completion && (
              <div className="flex flex-col opacity-40 italic mt-2 border-l-2 border-blue-500/30 pl-8 bg-blue-500/5 py-2">
                <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2">AI Suggestion (TAB)</div>
                {completion.split('\n').map((cline, ci) => (
                  <div key={ci} className="flex gap-8">
                    <span className="w-10 text-right text-gray-800 select-none text-[10px] font-mono">+</span>
                    <span className="text-blue-400/80 whitespace-pre">{cline}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {activeFile() && (
            <div className="absolute bottom-10 right-10 flex gap-4">
              <NeonButton onClick={handleAutocomplete} disabled={isCompleting || !!completion}>Complete</NeonButton>
              <NeonButton onClick={handleAnalyze} disabled={isAiLoading} variant="secondary">Audit</NeonButton>
            </div>
          )}
        </div>

        {state.isTerminalOpen && (
          <div className="h-80 bg-[#0a0c10] border-t border-[#30363d] flex flex-col">
            <div className="h-10 bg-[#0a0c10] flex items-center px-2 border-b border-[#30363d]">
              <div className="flex items-center h-full max-w-[calc(100%-120px)] overflow-x-auto terminal-tabs-scroll scrollbar-hide">
                {state.terminals.map(term => <TerminalTab key={term.id} name={term.name} active={state.activeTerminalId === term.id} onClick={() => setState(s => ({ ...s, activeTerminalId: term.id }))} onClose={(e) => closeTerminal(term.id, e)} />)}
              </div>
              <button onClick={createNewTerminal} className="p-2 ml-2 text-gray-500 hover:text-blue-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></button>
              <div className="flex-1"></div>
              <button onClick={() => setState(s => ({...s, isTerminalOpen: false}))} className="px-4 text-gray-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            </div>
            <div ref={terminalLogsRef} className={`flex-1 p-5 code-font text-[11px] overflow-y-auto ${themeStyles.bg}`}>
              {activeTerminal?.logs.map((log, i) => <div key={i}>{renderHighlightedCommand(log)}</div>)}
              <div className="mt-3 flex gap-3 relative">
                <span className={`${themeStyles.prompt} select-none font-black`}>$</span>
                <div className="relative flex-1">
                  {suggestion && <span className="absolute left-0 top-0 text-gray-700 whitespace-pre italic opacity-50">{suggestion}</span>}
                  <input autoFocus type="text" value={commandInput} onChange={(e) => onCommandChange(e.target.value)} onKeyDown={handleCommandKeyDown} className={`bg-transparent border-none outline-none w-full p-0 ${themeStyles.text}`} spellCheck={false} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Sidebar */}
      {state.isAISidebarOpen && (
        <div className="w-80 bg-[#0a0c10] border-l border-[#30363d] flex flex-col z-40">
          <div className="p-6 border-b border-[#30363d] flex items-center justify-between">
            <h2 className="text-[10px] font-black text-purple-400 flex items-center gap-3 uppercase tracking-[0.2em]">AI Core</h2>
            <button onClick={() => setState(s => ({...s, isAISidebarOpen: false}))} className="text-gray-600 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-[11px] leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#161b22] text-gray-300 rounded-bl-none border border-[#30363d]'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <TechLoader />}
          </div>
          <div className="p-6 border-t border-[#30363d] bg-[#0a0c10]"><form onSubmit={handleChat}><CyberInput value={chatInput} onChange={setChatInput} placeholder="Ask AI Assistant..." /></form></div>
        </div>
      )}

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#007acc] text-white flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-widest z-[100]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">IDE: {state.activeIDE}</div>
          <span className="opacity-60">{state.git.modifiedFiles.length + state.git.stagedFiles.length} Pending Changes</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 h-full px-2 hover:bg-white/10 transition-colors cursor-pointer">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>{state.git.branch}</span>
          </div>
          <span className="bg-blue-400 px-4 h-full flex items-center text-blue-900">Soluf-th Dev Core</span>
        </div>
      </div>
    </div>
  );
};

export default App;
