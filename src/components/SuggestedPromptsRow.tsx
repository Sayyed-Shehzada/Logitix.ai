import React, { useMemo, useState } from 'react';
import { Message } from '../types';

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  category?: string;
}

interface SuggestedPromptsRowProps {
  lastAssistantMessage?: Message | null;
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

/**
 * Dynamically generates context-aware next-step prompt suggestions
 * tailored to the content, code, and subject matter of the last assistant response.
 */
function generateContextualPrompts(lastMsg?: Message | null): SuggestedPrompt[] {
  if (!lastMsg || !lastMsg.content) {
    return [
      {
        id: 'init-1',
        label: 'Architect System Pipeline',
        prompt: 'Architect a resilient distributed ingestion pipeline with idempotent processing.',
        icon: 'schema',
      },
      {
        id: 'init-2',
        label: 'Multi-Model Consensus',
        prompt: 'Explain how the LOGITIX consensus engine arbitrates between Gemini and Claude.',
        icon: 'psychology',
      },
      {
        id: 'init-3',
        label: 'Write TypeScript Backend',
        prompt: 'Write a type-safe Express and PostgreSQL backend service with connection pooling.',
        icon: 'terminal',
      },
      {
        id: 'init-4',
        label: 'Microphone Voice AI',
        prompt: 'Demonstrate real-time voice conversation using the Gemini 3.8 Live API.',
        icon: 'mic',
      },
    ];
  }

  const text = lastMsg.content.toLowerCase();
  const hasCode = Boolean(lastMsg.codeSnippet || lastMsg.content.includes('```') || /function|const |interface |class |import /i.test(lastMsg.content));
  const isGreeting = /welcome|hello|how can i assist|i am ready|greetings/i.test(text.slice(0, 150));
  const hasDatabase = /postgres|sql|database|firestore|mongodb|redis|query|schema|table|index|pool/i.test(text);
  const hasAuth = /auth|token|jwt|oauth|security|role|permission|firebase auth|login|credentials/i.test(text);
  const hasError = /error|failed|exception|bug|warning|troubleshoot|mitigation|retry|crash/i.test(text);
  const hasAudioOrVoice = /audio|voice|transcrib|live api|gemini-3.8-live|microphone|tts|speech/i.test(text);
  const hasArchitecture = /architecture|pipeline|consensus|distributed|system|latency|scalab|cluster|event|outbox/i.test(text);

  const suggestions: SuggestedPrompt[] = [];

  // Scenario 1: Initial greeting / welcome
  if (isGreeting && !hasCode && suggestions.length < 4) {
    return [
      {
        id: 'greet-code',
        label: 'Write Full-Stack Service',
        prompt: 'Generate a production-ready TypeScript backend service with rigorous input validation and error handling.',
        icon: 'code',
      },
      {
        id: 'greet-arch',
        label: 'Design Fault-Tolerant System',
        prompt: 'How do we design an idempotent distributed outbox architecture capable of handling 50k requests/second?',
        icon: 'hub',
      },
      {
        id: 'greet-live',
        label: 'Test Voice & Live API',
        prompt: 'Explain how Gemini 3.8 Live API delivers bidirectional real-time audio and low latency voice synthesis.',
        icon: 'graphic_eq',
      },
      {
        id: 'greet-sec',
        label: 'Zero-Trust Security Review',
        prompt: 'Provide an Attribute-Based Access Control (ABAC) and security audit checklist for cloud workloads.',
        icon: 'shield',
      },
    ];
  }

  // Scenario 2: Response contains code or implementation details
  if (hasCode) {
    suggestions.push({
      id: 'code-test',
      label: 'Write Unit Tests',
      prompt: 'Write comprehensive automated unit and integration tests covering happy paths, edge cases, and failure boundaries for this code.',
      icon: 'fact_check',
    });
    suggestions.push({
      id: 'code-perf',
      label: 'Optimize & Benchmark',
      prompt: 'Analyze performance bottlenecks in this implementation and show optimized high-throughput alternatives.',
      icon: 'speed',
    });
    suggestions.push({
      id: 'code-explain',
      label: 'Explain Step-by-Step',
      prompt: 'Walk through how this implementation functions line-by-line, highlighting critical invariants and guarantees.',
      icon: 'menu_book',
    });
    suggestions.push({
      id: 'code-types',
      label: 'Add Strict Error Bounds',
      prompt: 'Refactor this code to include comprehensive typed error boundaries, retry backoffs, and defensive sanity assertions.',
      icon: 'rule',
    });
  }

  // Scenario 3: Database, Storage or Schema
  if (hasDatabase) {
    suggestions.push({
      id: 'db-index',
      label: 'Optimize Indexes & Queries',
      prompt: 'What indexes, query plans, and concurrency isolation levels are necessary to prevent locks and optimize read/write performance?',
      icon: 'database',
    });
    suggestions.push({
      id: 'db-migration',
      label: 'Zero-Downtime Migration',
      prompt: 'How do we execute a zero-downtime schema migration and backfill strategy for this database structure?',
      icon: 'sync_alt',
    });
  }

  // Scenario 4: Authentication, Permissions or Security
  if (hasAuth) {
    suggestions.push({
      id: 'sec-audit',
      label: 'Security & Token Audit',
      prompt: 'Perform a penetration-test security audit on this auth flow, checking for token replay, privilege escalation, and session hijacking.',
      icon: 'security',
    });
    suggestions.push({
      id: 'sec-rbac',
      label: 'Role-Based Access Guard',
      prompt: 'Show how to enforce strict Multi-Role Access Control (RBAC) and least-privilege scoping across all endpoints.',
      icon: 'verified_user',
    });
  }

  // Scenario 5: Voice, Audio, or Transcribe
  if (hasAudioOrVoice) {
    suggestions.push({
      id: 'audio-pcm',
      label: 'Optimize 24kHz Audio Playback',
      prompt: 'How does Web Audio API manage 24kHz raw PCM little-endian buffer playback without audio clipping or jitter?',
      icon: 'volume_up',
    });
    suggestions.push({
      id: 'audio-db',
      label: 'Persist Transcripts to Firestore',
      prompt: 'How can we automatically structure and persist multi-speaker voice memos into Firestore with full-text search?',
      icon: 'cloud_upload',
    });
  }

  // Scenario 6: System Architecture or Distributed Systems
  if (hasArchitecture) {
    suggestions.push({
      id: 'arch-diagram',
      label: 'Generate Architecture Diagram',
      prompt: 'Provide an exhaustive ASCII architectural topology diagram detailing network boundaries, worker pools, and fallback queues.',
      icon: 'account_tree',
    });
    suggestions.push({
      id: 'arch-failure',
      label: 'Chaos & Failover Matrix',
      prompt: 'What happens when network partitions or broker node outages occur? Detail the automated failover and reconciliation playbook.',
      icon: 'warning',
    });
  }

  // Scenario 7: Errors / Debugging
  if (hasError) {
    suggestions.push({
      id: 'err-debug',
      label: 'Root Cause & Fix Checklist',
      prompt: 'Provide an actionable root cause analysis and a step-by-step diagnostic checklist to permanently resolve this error.',
      icon: 'build',
    });
    suggestions.push({
      id: 'err-fallback',
      label: 'Graceful Fallback Handler',
      prompt: 'Design a resilient circuit breaker and exponential backoff retry handler to absorb and isolate this failure mode.',
      icon: 'replay',
    });
  }

  // General fallback suggestions if needed
  if (suggestions.length < 4) {
    suggestions.push({
      id: 'gen-example',
      label: 'Show Real-World Example',
      prompt: 'Provide a concrete, production-grade enterprise example putting this into practice with full context.',
      icon: 'lightbulb',
    });
    suggestions.push({
      id: 'gen-tradeoffs',
      label: 'Compare Alternatives',
      prompt: 'What are the top 3 alternative architectural approaches and their performance, cost, and complexity trade-offs?',
      icon: 'balance',
    });
    suggestions.push({
      id: 'gen-summary',
      label: 'Executive Summary Memo',
      prompt: 'Summarize the core takeaways into a concise executive briefing document suitable for engineering leadership.',
      icon: 'description',
    });
  }

  return suggestions.slice(0, 8);
}

export const SuggestedPromptsRow: React.FC<SuggestedPromptsRowProps> = ({
  lastAssistantMessage,
  onSelectPrompt,
  disabled = false,
}) => {
  const [shuffleIndex, setShuffleIndex] = useState(0);

  // Generate prompts dynamically derived from the latest assistant message
  const allPrompts = useMemo(() => {
    return generateContextualPrompts(lastAssistantMessage);
  }, [lastAssistantMessage?.id, lastAssistantMessage?.content]);

  // Rotate through 3-4 visible prompts per cycle
  const visiblePrompts = useMemo(() => {
    const total = allPrompts.length;
    if (total <= 4) return allPrompts;
    const start = (shuffleIndex * 3) % total;
    const items: SuggestedPrompt[] = [];
    for (let i = 0; i < 4; i++) {
      items.push(allPrompts[(start + i) % total]);
    }
    return items;
  }, [allPrompts, shuffleIndex]);

  const handleShuffle = () => {
    setShuffleIndex((prev) => prev + 1);
  };

  return (
    <div className="mb-2.5 w-full">
      <div className="flex items-center justify-between pb-1.5 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#474651]">
          <span className="material-symbols-outlined text-[15px] text-[#312e81] animate-pulse">
            auto_awesome
          </span>
          <span>Suggested Next Steps:</span>
          <span className="hidden sm:inline text-[10px] text-[#777682] font-code font-normal">
            (Tailored to last synthesis response)
          </span>
        </div>

        {allPrompts.length > 4 && (
          <button
            type="button"
            onClick={handleShuffle}
            disabled={disabled}
            className="text-[10px] text-[#777682] hover:text-[#1a146b] flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-[#f3f4f3] transition-colors cursor-pointer"
            title="Cycle alternative prompt suggestions"
          >
            <span className="material-symbols-outlined text-[13px]">shuffle</span>
            <span>More suggestions</span>
          </button>
        )}
      </div>

      {/* Horizontal row of suggestion buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5 mask-fade-edges">
        {visiblePrompts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            disabled={disabled}
            className="group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f9f9f8] hover:bg-[#f0f0f8] active:bg-[#e2dfff] text-[#1a1c1c] hover:text-[#1a146b] border border-[#e2e2e2] hover:border-[#1a146b]/40 rounded-xl text-xs font-medium transition-all shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-left"
            title={`Ask LOGITIX: "${item.prompt}"`}
          >
            <span className="material-symbols-outlined text-[15px] text-[#777682] group-hover:text-[#1a146b] group-hover:scale-110 transition-all">
              {item.icon}
            </span>
            <span className="truncate max-w-[190px] sm:max-w-none">{item.label}</span>
            <span className="material-symbols-outlined text-[13px] text-[#777682] group-hover:text-[#1a146b] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              arrow_forward
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
