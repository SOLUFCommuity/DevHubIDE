
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IDEType, ProjectState, FileEntry, WorkflowRun, WorkflowStatus, TerminalInstance, TerminalTheme, Task, Plugin } from './types';
import { NeonButton, GlassCard, TechLoader, StatusDot, WorkflowBadge, TerminalTab, TaskItem, SearchResultItem, PluginCard } from './components/UiverseElements';
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

const COMMANDS = ['help', 'clear', 'ls', 'npm test', 'npm deploy', 'audit', 'whoami', 'theme monokai', 'theme cyberpunk', 'theme github-dark', 'cat', 'rm', 'mkdir'];

interface SearchMatch {
  fileId: string;
  fileName: string;
  line: number;
  text: string;
}

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
    lastCompileStatus: 'none'
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

  // Command History Navigation
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

  const handleCommand = async (cmd: string) => {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return;

    setCommandHistory(prev => [cleanCmd, ...prev.filter(h => h !== cleanCmd)].slice(0, 50));
    setHistoryPointer(-1);

    const parts = cleanCmd.split(' ');
    const lowerCmd = parts[0].toLowerCase();
    addLog(`soluf-th@dev:~$ ${cleanCmd}`);

    if (lowerCmd === 'clear') {
      setState(s => ({
        ...s,
        terminals: s.terminals.map(t => t.id === s.activeTerminalId ? { ...t, logs: [] } : t)
      }));
    } else if (lowerCmd === 'ls') {
      addLog('contracts/  .github/  README.md  package.json');
    } else if (lowerCmd === 'help') {
      addLog('Available commands: help, clear, ls, npm test, npm deploy, audit, whoami, cat [file], theme [monokai|cyberpunk|github-dark]');
    } else if (lowerCmd === 'whoami') {
      addLog('soluf-th-developer-agent-01');
    } else if (lowerCmd === 'audit') {
      handleAnalyze();
    } else if (lowerCmd === 'cat') {
      const fileName = parts[1];
      if (!fileName) {
        addLog('cat: missing file operand');
      } else {
        const file = allFileNames.includes(fileName);
        if (file) addLog(`Viewing content of ${fileName} (simulated)`);
        else addLog(`cat: ${fileName}: No such file or directory`);
      }
    } else if (lowerCmd === 'npm' && parts[1] === 'test') {
      addLog('Running tests...');
      await new Promise(r => setTimeout(r, 1000));
      addLog('✓ Storage.sol compiled');
      addLog('✓ Storage.sol tests passed');
      addLog('Tests completed successfully.');
    } else if (lowerCmd === 'theme') {
      const themeName = parts[1] as TerminalTheme;
      if (['monokai', 'cyberpunk', 'github-dark'].includes(themeName)) {
        setState(s => ({ ...s, terminalTheme: themeName }));
        addLog(`Terminal theme switched to ${themeName}`);
      } else {
        addLog(`Unknown theme: ${themeName || 'undefined'}`);
      }
    } else if (lowerCmd === 'npm' && parts[1] === 'deploy') {
      runWorkflow('wf2');
    } else {
      addLog(`Command not found: ${lowerCmd}`);
    }
    setCommandInput('');
    setSuggestion('');
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestion) {
        setCommandInput(suggestion);
        setSuggestion('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextPointer = Math.min(historyPointer + 1, commandHistory.length - 1);
        setHistoryPointer(nextPointer);
        setCommandInput(commandHistory[nextPointer]);
        setSuggestion('');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextPointer = historyPointer - 1;
      setHistoryPointer(nextPointer);
      if (nextPointer >= 0) {
        setCommandInput(commandHistory[nextPointer]);
      } else {
        setCommandInput('');
      }
      setSuggestion('');
    }
  };

  const onCommandChange = (val: string) => {
    setCommandInput(val);
    if (val.trim()) {
      const parts = val.split(' ');
      const currentToken = parts[parts.length - 1];
      
      // If first token, suggest command
      if (parts.length === 1) {
        const match = COMMANDS.find(c => c.startsWith(val.toLowerCase()));
        setSuggestion(match || '');
      } else {
        // If not first token, suggest file name
        const match = allFileNames.find(f => f.toLowerCase().startsWith(currentToken.toLowerCase()));
        if (match) {
          const prefix = parts.slice(0, parts.length - 1).join(' ');
          setSuggestion(`${prefix} ${match}`);
        } else {
          setSuggestion('');
        }
      }
    } else {
      setSuggestion('');
    }
  };

  const renderHighlightedCommand = (fullText: string) => {
    if (!fullText.startsWith('soluf-th@dev:~$')) return <span>{fullText}</span>;
    
    const prefix = 'soluf-th@dev:~$ ';
    const cmdBody = fullText.slice(prefix.length);
    const parts = cmdBody.split(' ');
    
    return (
      <div className="flex gap-2">
        <span className={themeStyles.prompt}>soluf-th@dev:~$</span>
        <span>
          {parts.map((part, i) => {
            let color = 'text-gray-300';
            const lowerPart = part.toLowerCase();
            
            if (i === 0) {
              if (['npm', 'hardhat', 'git', 'solc', 'cat', 'ls'].includes(lowerPart)) color = 'text-yellow-400';
              else if (COMMANDS.includes(lowerPart)) color = 'text-green-400 font-bold';
              else color = 'text-blue-400';
            } else {
              if (part.startsWith('-')) color = 'text-orange-400 italic';
              else if (['test', 'deploy', 'run', 'install'].includes(lowerPart)) color = 'text-purple-400 font-medium';
              else if (allFileNames.includes(part)) color = 'text-cyan-400 underline decoration-dotted';
              else color = 'text-gray-400';
            }
            
            return <span key={i} className={`${color} mr-1`}>{part}</span>;
          })}
        </span>
      </div>
    );
  };

  const handleAnalyze = async () => {
    const file = activeFile();
    if (!file || !file.content) return;
    setIsAiLoading(true);
    addLog(`AI: Analyzing ${file.name}...`);
    try {
      const result = await analyzeCode(file.content, file.language || 'text');
      setAiResponse(result);
      addLog(`AI: Analysis complete for ${file.name}. Found ${result.issues.length} concerns.`);
    } catch (err) {
      addLog(`AI Error: Failed to analyze code.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCompile = async () => {
    const file = activeFile();
    if (!file || file.language !== 'solidity') return;
    
    setState(s => ({ ...s, isCompiling: true, lastCompileStatus: 'none', isTerminalOpen: true }));
    addLog(`Compiler: Starting compilation for ${file.name}...`);
    
    await new Promise(r => setTimeout(r, 2000));
    
    const success = !file.content?.includes('Error');
    setState(s => ({ 
      ...s, 
      isCompiling: false, 
      lastCompileStatus: success ? 'success' : 'failed' 
    }));
    
    if (success) {
      addLog(`Compiler: Success! ABI and Bytecode generated for ${file.name}.`);
    } else {
      addLog(`Compiler: FAILED. Syntax error on line 4.`);
    }
  };

  const handleAutocomplete = async () => {
    const file = activeFile();
    if (!file || !file.content || isCompleting) return;
    setIsCompleting(true);
    setCompletion(null);
    try {
      const result = await completeCode(file.content, file.language || 'text');
      setCompletion(result.trim());
    } catch (err) {
      addLog(`Autocomplete Error: Failed to fetch code completion.`);
    } finally {
      setIsCompleting(false);
    }
  };

  const acceptCompletion = () => {
    if (!completion || !state.currentFileId) return;
    
    const updateFilesRecursively = (files: FileEntry[]): FileEntry[] => {
      return files.map(f => {
        if (f.id === state.currentFileId) {
          return { ...f, content: (f.content || '') + '\n' + completion };
        }
        if (f.children) {
          return { ...f, children: updateFilesRecursively(f.children) };
        }
        return f;
      });
    };

    setState(s => ({
      ...s,
      files: updateFilesRecursively(s.files)
    }));
    setCompletion(null);
  };

  const installPlugin = (id: string) => {
    setState(s => ({
      ...s,
      plugins: s.plugins.map(p => p.id === id ? { ...p, installed: true } : p)
    }));
    addLog(`Plugin Engine: Installed ${state.plugins.find(p => p.id === id)?.name}`);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiLoading(true);
    try {
      const response = await chatWithAI(userMsg, activeFile()?.content || '');
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      addLog(`AI Error: Failed to generate response.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const runWorkflow = async (workflowId: string) => {
    const wf = state.workflows.find(w => w.id === workflowId);
    if (!wf || wf.status === 'running') return;

    setState(s => ({
      ...s,
      isTerminalOpen: true,
      workflows: s.workflows.map(w => w.id === workflowId ? { ...w, status: 'running', logs: [] } : w)
    }));

    const steps = [
      `[${wf.workflowName}] Starting runner...`,
      `[${wf.workflowName}] Checking out code...`,
      `[${wf.workflowName}] Deployment success!`,
      `[${wf.workflowName}] Job finished.`
    ];

    for (const step of steps) {
      addLog(step);
      await new Promise(r => setTimeout(r, 800));
    }

    setState(s => ({
      ...s,
      workflows: s.workflows.map(w => w.id === workflowId ? { ...w, status: 'success' } : w)
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now()
    };
    setState(s => ({ ...s, tasks: [newTask, ...s.tasks] }));
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const deleteTask = (id: string) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.filter(t => t.id !== id)
    }));
  };

  const createNewTerminal = () => {
    const newId = `term-${Date.now()}`;
    const newTerm: TerminalInstance = { id: newId, name: 'bash', logs: ['Terminal created at ' + new Date().toLocaleTimeString()] };
    setState(s => ({ ...s, terminals: [...s.terminals, newTerm], activeTerminalId: newId }));
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.terminals.length <= 1) return;
    const newTerms = state.terminals.filter(t => t.id !== id);
    setState(s => ({ 
      ...s, 
      terminals: newTerms, 
      activeTerminalId: s.activeTerminalId === id ? newTerms[0].id : s.activeTerminalId 
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleAutocomplete();
      }
      if (e.key === 'Tab' && completion) {
        e.preventDefault();
        acceptCompletion();
      }
      if (e.key === 'Escape' && completion) {
        setCompletion(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completion, state.currentFileId, activeFile]);

  const searchInFiles = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const matches: SearchMatch[] = [];
    const query = searchQuery.toLowerCase();

    const scan = (files: FileEntry[]) => {
      for (const f of files) {
        if (f.type === 'file') {
          if (f.name.toLowerCase().includes(query)) {
            matches.push({ fileId: f.id, fileName: f.name, line: 1, text: 'File name match' });
          }
          if (f.content) {
            const lines = f.content.split('\n');
            lines.forEach((l, idx) => {
              if (l.toLowerCase().includes(query)) {
                matches.push({ fileId: f.id, fileName: f.name, line: idx + 1, text: l });
              }
            });
          }
        } else if (f.children) {
          scan(f.children);
        }
      }
    };

    scan(state.files);
    return matches.slice(0, 50);
  }, [searchQuery, state.files]);

  const renderFileTree = (files: FileEntry[], depth = 0) => {
    return files.map(file => (
      <div key={file.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          onClick={() => {
            file.type === 'file' && setState(s => ({ ...s, currentFileId: file.id }));
            setCompletion(null);
          }}
          className={`w-full text-left px-2 py-1 text-sm rounded transition-colors flex items-center gap-2 ${
            state.currentFileId === file.id ? 'bg-[#373e47] text-white' : 'text-gray-400 hover:bg-[#21262d] hover:text-gray-200'
          }`}
        >
          {file.type === 'folder' ? (
             <svg className="w-3.5 h-3.5 text-blue-400/80" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
          ) : (
             <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          )}
          {file.name}
        </button>
        {file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ));
  };

  const themeStyles = {
    'github-dark': { bg: 'bg-[#0a0c10]', text: 'text-gray-400', prompt: 'text-green-500', workflow: 'text-blue-400/80' },
    'cyberpunk': { bg: 'bg-[#1a1b26]', text: 'text-[#bb9af7]', prompt: 'text-[#f7768e]', workflow: 'text-[#7aa2f7]' },
    'monokai': { bg: 'bg-[#272822]', text: 'text-[#f8f8f2]', prompt: 'text-[#a6e22e]', workflow: 'text-[#66d9ef]' }
  }[state.terminalTheme];

  return (
    <div className="flex h-screen w-full bg-[#0d1117] overflow-hidden select-none">
      {/* Activity Bar */}
      <div className="w-16 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-4 gap-6 z-10">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">S</div>
        <div className="flex flex-col gap-6 text-gray-500">
          <button 
            title="Explorer"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'explorer' }))}
            className={`${state.activeSidebarTab === 'explorer' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {state.activeSidebarTab === 'explorer' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>

          <button 
            title="Search"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'search' }))}
            className={`${state.activeSidebarTab === 'search' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {state.activeSidebarTab === 'search' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>

          <button 
            title="Solidity Compiler"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'compiler' }))}
            className={`${state.activeSidebarTab === 'compiler' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.628.282a2 2 0 01-1.806 0l-.628-.282a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547l-.534.534a1 1 0 00.293 1.707l.951.238a2 2 0 001.022-.547l.534-.534a1 1 0 011.414 0l.534.534a2 2 0 001.022.547l.951-.238a1 1 0 00.293-1.707l-.534-.534z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10V6a2 2 0 012-2h14a2 2 0 012 2v4M3 10l9 7 9-7M3 10v10a2 2 0 002 2h14a2 2 0 002-2V10" /></svg>
            {state.activeSidebarTab === 'compiler' && <div className="absolute -left-5 top-0 w-1 h-6 bg-purple-500"></div>}
          </button>
          
          <button 
            title="Plugins"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'plugins' }))}
            className={`${state.activeSidebarTab === 'plugins' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
            {state.activeSidebarTab === 'plugins' && <div className="absolute -left-5 top-0 w-1 h-6 bg-orange-500"></div>}
          </button>

          <button 
            title="Tasks"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'tasks' }))}
            className={`${state.activeSidebarTab === 'tasks' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            {state.activeSidebarTab === 'tasks' && <div className="absolute -left-5 top-0 w-1 h-6 bg-green-500"></div>}
          </button>

          <button 
            title="Workflows"
            onClick={() => setState(s => ({ ...s, activeSidebarTab: 'actions' }))}
            className={`${state.activeSidebarTab === 'actions' ? 'text-white' : 'hover:text-gray-300'} transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {state.activeSidebarTab === 'actions' && <div className="absolute -left-5 top-0 w-1 h-6 bg-blue-500"></div>}
          </button>

          <button onClick={() => setState(s => ({...s, isAISidebarOpen: !s.isAISidebarOpen}))} className={`${state.isAISidebarOpen ? 'text-blue-400' : 'hover:text-gray-300'} transition-colors`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="w-64 bg-[#0d1117] border-r border-[#30363d] flex flex-col">
        {state.activeSidebarTab === 'explorer' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Explorer</span>
              <StatusDot status="online" />
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {renderFileTree(state.files)}
            </div>
          </>
        )}

        {state.activeSidebarTab === 'search' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Search</span>
              <div className="text-[10px] text-gray-500">{searchInFiles.length} matches</div>
            </div>
            <div className="px-4 mb-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search project..."
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-md py-1.5 pl-3 pr-8 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {searchInFiles.map((match, idx) => (
                <SearchResultItem 
                  key={`${match.fileId}-${idx}`}
                  fileName={match.fileName}
                  line={match.line}
                  text={match.text}
                  onClick={() => setState(s => ({ ...s, currentFileId: match.fileId }))}
                />
              ))}
            </div>
          </>
        )}

        {state.activeSidebarTab === 'compiler' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Solidity Compiler</span>
              {state.isCompiling && <TechLoader size="w-1 h-1" />}
            </div>
            
            <GlassCard className="!p-3 flex flex-col gap-2">
              <label className="text-[9px] text-gray-500 uppercase font-bold">Compiler Version</label>
              <select className="bg-gray-900 border border-gray-700 text-xs p-1.5 rounded focus:outline-none focus:border-purple-500">
                <option>0.8.24+commit.e11b9ed9</option>
                <option>0.8.20+commit.a1b79ed9</option>
                <option>0.7.6+commit.7338295f</option>
              </select>
              
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" className="rounded bg-gray-900 border-gray-700" defaultChecked />
                <span className="text-[10px] text-gray-400">Auto Compile</span>
              </div>
            </GlassCard>

            <button 
              onClick={handleCompile}
              disabled={state.isCompiling || !activeFile() || activeFile()?.language !== 'solidity'}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {state.isCompiling ? 'Compiling...' : `Compile ${activeFile()?.name || 'File'}`}
            </button>

            {state.lastCompileStatus !== 'none' && (
              <div className={`p-3 rounded-lg border flex items-center gap-3 ${state.lastCompileStatus === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <StatusDot status={state.lastCompileStatus === 'success' ? 'success' : 'failed'} />
                <div className="text-[10px] font-bold text-gray-300">
                  {state.lastCompileStatus === 'success' ? 'Compilation Finished Successfully' : 'Compilation Failed with Errors'}
                </div>
              </div>
            )}
          </div>
        )}

        {state.activeSidebarTab === 'plugins' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Plugin Engine</span>
              <div className="text-[9px] text-gray-600 font-mono">Marketplace</div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
              {state.plugins.map(plugin => (
                <PluginCard key={plugin.id} plugin={plugin} onInstall={() => installPlugin(plugin.id)} />
              ))}
            </div>
          </>
        )}

        {state.activeSidebarTab === 'tasks' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Project Tasks</span>
              <div className="text-[10px] text-gray-500 font-mono">
                {state.tasks.filter(t => t.completed).length}/{state.tasks.length}
              </div>
            </div>
            <div className="px-4 mb-4">
              <form onSubmit={addTask} className="relative">
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add a new task..."
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-md py-1.5 pl-3 pr-8 text-xs text-gray-300 focus:outline-none focus:border-green-500 transition-all"
                />
                <button type="submit" className="absolute right-2 top-1.5 text-green-500 hover:text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
              {state.tasks.length > 0 ? (
                state.tasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    text={task.text} 
                    completed={task.completed} 
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))
              ) : (
                <div className="text-center py-10 opacity-30">
                  <p className="text-[10px] uppercase tracking-tighter">No tasks pending</p>
                </div>
              )}
            </div>
          </>
        )}
        
        {state.activeSidebarTab === 'actions' && (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-blue-400">GitHub Actions</span>
              <StatusDot status="busy" />
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-3">
              {state.workflows.map(wf => (
                <div key={wf.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-gray-200">{wf.workflowName}</div>
                    <WorkflowBadge status={wf.status} />
                  </div>
                  <NeonButton 
                    disabled={wf.status === 'running'}
                    onClick={() => runWorkflow(wf.id)}
                    className="w-full justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Run Workflow
                  </NeonButton>
                </div>
              ))}
            </div>
          </>
        )}
        
        <div className="p-4 border-t border-[#30363d] mt-auto">
          <div className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-widest">Environment</div>
          <select 
            value={state.activeIDE}
            onChange={(e) => setState(s => ({...s, activeIDE: e.target.value as IDEType}))}
            className="w-full bg-[#161b22] border border-[#30363d] rounded p-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.values(IDEType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center overflow-x-auto">
          {activeFile() && (
            <div className="px-4 h-full border-r border-[#30363d] bg-[#0d1117] flex items-center gap-2 text-xs text-gray-300 border-t-2 border-t-blue-500">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              {activeFile()?.name}
              <button className="hover:bg-gray-700 rounded px-1 ml-2">×</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 p-4 code-font text-[13px] leading-relaxed overflow-y-auto bg-[#0d1117]">
            {activeFile()?.content?.split('\n').map((line, i) => (
              <div key={i} className="flex gap-4 group/line">
                <span className="w-8 text-right text-gray-600 select-none opacity-50">{i + 1}</span>
                <span className="text-gray-300 whitespace-pre">{line}</span>
              </div>
            )) || (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                 <div className="w-32 h-32 mb-6 opacity-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-2xl"></div>
                 <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Soluf-th Ethereum Playground</p>
                 <p className="text-[10px] mt-2 opacity-40">Ready for development. Plugin Engine: Online.</p>
              </div>
            )}
            {completion && (
              <div className="flex flex-col opacity-40 italic mt-1 border-l-2 border-blue-500/30 pl-4 bg-blue-500/5 rounded-r-lg">
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">AI Suggestion (Press Tab to accept)</div>
                {completion.split('\n').map((cline, ci) => (
                  <div key={`c-${ci}`} className="flex gap-4">
                    <span className="w-8 text-right text-gray-700 select-none text-xs">AI</span>
                    <span className="text-blue-300 whitespace-pre">{cline}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {activeFile() && (
            <div className="absolute bottom-6 right-6 flex gap-3">
              <NeonButton onClick={handleAutocomplete} disabled={isCompleting || !!completion}>
                {isCompleting ? <TechLoader size="w-1.5 h-1.5" /> : 'AI Autocomplete (⌘K)'}
              </NeonButton>
              <NeonButton onClick={handleAnalyze} disabled={isAiLoading}>
                {isAiLoading ? <TechLoader size="w-1.5 h-1.5" /> : 'Smart Audit'}
              </NeonButton>
            </div>
          )}
        </div>

        {state.isTerminalOpen && (
          <div className="h-72 bg-[#161b22] border-t border-[#30363d] flex flex-col">
            <div className="h-9 bg-[#161b22] flex items-center px-1 border-b border-[#30363d]">
              <div className="flex items-center h-full max-w-[calc(100%-100px)] overflow-x-auto terminal-tabs-scroll">
                {state.terminals.map(term => (
                  <TerminalTab 
                    key={term.id} 
                    name={term.name} 
                    active={state.activeTerminalId === term.id}
                    onClick={() => setState(s => ({ ...s, activeTerminalId: term.id }))}
                    onClose={(e) => closeTerminal(term.id, e)}
                  />
                ))}
              </div>
              <button 
                onClick={createNewTerminal}
                className="p-1 mx-1 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded transition-all"
                title="New Terminal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <div className="flex-1"></div>
              <button 
                onClick={() => setState(s => ({...s, terminals: s.terminals.map(t => t.id === s.activeTerminalId ? {...t, logs: []} : t)}))}
                className="p-1 mx-1 text-gray-500 hover:text-yellow-500 hover:bg-gray-800 rounded transition-all"
                title="Clear Terminal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button onClick={() => setState(s => ({...s, isTerminalOpen: false}))} className="px-4 text-gray-500 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            <div 
              ref={terminalLogsRef}
              className={`flex-1 p-3 code-font text-xs overflow-y-auto ${themeStyles.bg}`}
            >
              <div className="space-y-0.5">
                {activeTerminal?.logs.map((log, i) => (
                  <div key={i} className={`flex gap-2`}>
                    {renderHighlightedCommand(log)}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2 relative">
                <span className={`${themeStyles.prompt} select-none`}>soluf-th@dev:~$</span>
                <div className="relative flex-1">
                  {suggestion && (
                    <span className="absolute left-0 top-0 text-gray-600 whitespace-pre pointer-events-none opacity-50">
                      {suggestion}
                    </span>
                  )}
                  <input
                    ref={commandInputRef}
                    autoFocus
                    type="text"
                    value={commandInput}
                    onChange={(e) => onCommandChange(e.target.value)}
                    onKeyDown={handleCommandKeyDown}
                    className={`bg-transparent border-none outline-none w-full p-0 m-0 ${themeStyles.text} caret-blue-500`}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Sidebar */}
      {state.isAISidebarOpen && (
        <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col z-20 shadow-2xl">
          <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/50">
            <h2 className="text-[10px] font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
              <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-blue-500"></span> 
              Soluf-th Intelligence
            </h2>
            <button onClick={() => setState(s => ({...s, isAISidebarOpen: false}))} className="text-gray-500 hover:text-white">×</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <GlassCard title="Project Insights">
              <div className="text-[11px] text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Files Scanned:</span> <span className="text-blue-400">7</span></div>
                <div className="flex justify-between"><span>Solidity Focus:</span> <span className="text-green-400">85%</span></div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#21262d] text-gray-300 border border-[#30363d]'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isAiLoading && <TechLoader size="w-1.5 h-1.5" />}
            </div>
          </div>

          <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/50">
            <form onSubmit={handleChat} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask developer agent..."
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl py-2 pl-4 pr-10 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="absolute right-2 top-2 text-blue-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#007acc] text-white flex items-center px-3 text-[10px] font-medium z-[100]">
        <div className="flex items-center gap-3">
          <span>{state.activeIDE}</span>
          <span className="opacity-70">Plugins: {state.plugins.filter(p => p.installed).length} Loaded</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-4">
          <span>Solidity Playground</span>
          <span className="bg-white/20 px-3 h-full flex items-center font-bold">SOLUF-TH HUB</span>
        </div>
      </div>
    </div>
  );
};

export default App;
