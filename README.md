# ⚡ Soluf-th Dev Hub

**Soluf-th Dev Hub** is a high-performance, web-based developer ecosystem and IDE dashboard designed for modern engineers. It combines the familiar interface of VS Code with specialized tools for Solidity smart contract development and cutting-edge AI assistance powered by the Google Gemini API.

![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![AI](https://img.shields.io/badge/AI-Powered-purple.svg)

---

## 🚀 Key Features

### 🖥️ Advanced IDE Interface
- **Multi-Tab Workspace:** Manage multiple files with a high-performance code editor.
- **File Explorer:** intuitive project tree navigation for contracts, workflows, and documentation.
- **Status Monitoring:** Real-time environment status, sync indicators, and module loading tracking.

### 🤖 AI Core (Gemini 3 Pro)
- **Smart Audit:** Instant security and logic auditing for code (specialized for Solidity vulnerabilities).
- **Intelligent Autocomplete:** Context-aware code completion triggered by `⌘+K`.
- **Dev Chat:** A dedicated AI sidekick for architectural advice and debugging.

### 📟 Terminal & Automation
- **Multi-Instance Terminal:** Tabbed terminal instances with customizable themes (GitHub Dark, Cyberpunk, Monokai).
- **Path Autocomplete:** Intelligent command-line suggestions for files and system commands.
- **Workflow Simulation:** Run and monitor GitHub Actions CI/CD pipelines directly from the dashboard.

### 🛠️ Developer Productivity
- **Plugin Marketplace:** Extend your workspace with compilers, debuggers, and utility libraries.
- **Project Tasks:** Integrated task management to keep your development cycle organized.
- **Global Search:** Project-wide code search with line-by-line matching.

---

## 🛠️ Tech Stack

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration:** [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 3 Flash/Pro)
- **Component Library:** Custom high-performance UI components inspired by [Uiverse.io](https://uiverse.io/)
- **Icons:** [Heroicons](https://heroicons.com/)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Google AI Studio API Key (for Gemini features)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/soluf-th-dev-hub.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## ⌨️ Shortcuts & Commands

| Shortcut | Action |
| --- | --- |
| `⌘ + K` | Trigger AI Code Completion |
| `TAB` | Accept AI Suggestion / Terminal Autocomplete |
| `ESC` | Dismiss AI Suggestion |
| `UP / DOWN` | Navigate Terminal Command History |

### Terminal Commands
- `audit`: Triggers a smart audit of the active file.
- `theme [name]`: Switches terminal theme (e.g., `theme cyberpunk`).
- `npm test`: Simulates project test suite execution.
- `cat [file]`: Quickly view file contents in the terminal.

---

## 🛡️ Security
For security policies and vulnerability reporting, please refer to [SECURITY.md](./SECURITY.md).

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with 💙 by the Soluf-th Engineering Team</p>
