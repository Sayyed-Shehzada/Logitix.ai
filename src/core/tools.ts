import { ToolDefinition, EmailMessage, FileNode } from '../types.js';

// Seed Email Store
export const emailStore: EmailMessage[] = [
  {
    id: 'email-1',
    subject: 'Project Submission Deadline & Guidelines',
    from: 'Dr. Robert Vance <robert.vance@university.edu>',
    to: 'Muhammad Ali <muhammad.ali@logitix.ai>',
    snippet: 'Please remember to submit your final Python PySide6 app source code and documentation by tomorrow 11:59 PM.',
    body: 'Dear Muhammad,\n\nThis is a friendly reminder that your final project submission for CS490 (Python PySide6 / AI Systems) is due tomorrow by 11:59 PM. Please make sure your repository includes full modular architecture documentation.\n\nBest regards,\nDr. Vance',
    date: 'Today, 09:15 AM',
    read: false,
    folder: 'inbox',
  },
];

// Seed File Explorer Nodes
export const fileExplorerTree: FileNode[] = [
  {
    id: 'dir-1',
    name: 'Workspace',
    path: '/Workspace',
    type: 'directory',
    children: [
      {
        id: 'dir-projects',
        name: 'projects',
        path: '/Workspace/projects',
        type: 'directory',
        children: [
          {
            id: 'f-1',
            name: 'sample_script.py',
            path: '/Workspace/projects/sample_script.py',
            type: 'file',
            size: '1.2 KB',
            language: 'python',
            content: `# Sample Python Script in User Workspace\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n`,
          },
        ],
      },
      {
        id: 'dir-docs',
        name: 'documents',
        path: '/Workspace/documents',
        type: 'directory',
        children: [
          {
            id: 'f-readme',
            name: 'workspace_notes.md',
            path: '/Workspace/documents/workspace_notes.md',
            type: 'file',
            size: '0.8 KB',
            language: 'markdown',
            content: `# Personal Workspace\nStore your custom notes, projects, and documents here.`,
          },
        ],
      },
    ],
  },
];

// Tool Declarations for Agent
export const availableTools: ToolDefinition[] = [
  {
    name: 'email_tool',
    description: 'Draft, send, read, or reply to emails on behalf of the user.',
    category: 'email',
    parameters: {
      action: 'draft | send | read_inbox | search_email',
      recipient: 'Email address or contact name',
      subject: 'Email subject title',
      body: 'Content of the email',
    },
  },
  {
    name: 'browser_tool',
    description: 'Search the live web, fetch URL contents, summarize articles, and gather online research.',
    category: 'browser',
    parameters: {
      action: 'web_search | fetch_url | summarize_page',
      query: 'Search query string',
      url: 'Target web URL',
    },
  },
  {
    name: 'file_tool',
    description: 'Search, list, read, edit, or create files and directories in the user workspace.',
    category: 'file',
    parameters: {
      action: 'list_files | read_file | write_file | search_files',
      filePath: 'Target path in workspace',
      content: 'File content to save',
    },
  },
  {
    name: 'code_tool',
    description: 'Execute JavaScript or Python code snippets safely in sandbox and return console outputs or errors.',
    category: 'code',
    parameters: {
      language: 'javascript | python',
      code: 'Executable code string',
    },
  },
  {
    name: 'notepad_tool',
    description: 'Store, read, search, edit, or delete notes in the Notepad.',
    category: 'notepad',
    parameters: {
      action: 'create_note | search_notes | delete_note',
      title: 'Note title',
      content: 'Note content body',
      category: 'General | Personal | Work | Ideas | To-Do | Code',
    },
  },
];
