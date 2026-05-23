import { useState, useRef, useEffect } from "react";

const AGENTS = [
  {
    id: "planner",
    name: "策划 Agent",
    role: "PLOT ARCHITECT",
    color: "#c8a96e",
    desc: "分析需求 · 拆解结构 · 制定大纲",
    systemPrompt: `你是一位专业的中文小说策划编辑，代号"策划Agent"。
你的任务是：接收用户的创作需求，输出一份详细的创作大纲。

输出格式（严格按此JSON输出，不要有任何其他内容）：
{
  "核心矛盾": "一句话概括主要冲突",
  "人物速写"const STAGES = ["idle", "planner", "writer", "editor", "done"];

function AgentCard({ agent, status }) {
  const isActive = status === "running";
  const isDone = status === "done";

  return (
    <div style={{
      border: `1px solid ${isActive ? agent.color : isDone ? agent.color + "88" : "#2a2a2a"}`,
      borderRadius: "2px", padding: "16px 20px",
      background: isActive ? `${agent.color}0a` : "transparent",
      transition: "all 0.4s ease", position: "relative", overflow: "hidden",
    }}>
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: 0, height: "2px",
          background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
          animation: "scan 1.5s linear infinite", width: "100%",
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: isActive ? agent.color : isDone ? agent.color + "99" : "#333",
          boxShadow: isActive ? `0 0 8px ${agent.color}` : "none",
          transition: "all 0.3s", flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: "11px",
          letterSpacing: "0.15em",
          color: isActive ? agent.color : isDone ? agent.color + "bb" : "#444",
        }}>
          {agent.role}
        </span>
        {isDone && <span style={{ marginLeft: "auto", color: agent.color + "99", fontSize: "11px", fontFamily: "monospace" }}>✓ DONE</span>}
        {isActive && <span style={{ marginLeft: "auto", color: agent.color, fontSize: "11px", fontFamily: "monospace", animation: "pulse 1s ease infinite" }}>● LIVE</span>}
      </div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: isActive ? "#f0e8d8" : isDone ? "#c0b8a8" : "#555", marginLeft: "20px" }}>
        {agent.name}
      </div>
      <div style={{ fontSize: "12px", color: isActive ? "#8a8070" : "#444", marginLeft: "20px", marginTop: "3px", fontFamily: "'Courier New', monospace" }}>
        {agent.desc}
      </div>
    </div>
  );
}

function OutputPanel({ label, color, content, isStreaming }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [content]);
  if (!content && !isStreaming) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{ width: "3px", height: "14px", background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.12em", color: color }}>
          {label}
        </span>
        {isStreaming && <span style={{ color: color + "88", fontSize: "11px", fontFamily: "monospace", marginLeft: "4px" }}>generating...</span>}
      </div>
      <div ref={ref} style={{
        background: "#0d0d0d", border: `1px solid ${color}33`, borderRadius: "2px",
        padding: "18px 20px", maxHeight: "320px", overflowY: "auto",
        fontSize: "13.5px", lineHeight: "1.8", color: "#c8c0b0",
        fontFamily: "'Noto Serif SC', Georgia, serif", whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {content}
        {isStreaming && <span style={{ display: "inline-block", width: "2px", height: "14px", background: color, marginLeft: "2px", verticalAlign: "middle", animation: "blink 0.7s step-end infinite" }} />}
      </div>
    </div>
  );
}export default function App() {
  const [input, setInput] = useState("");
  const [stage, setStage] = useState("idle");
  const [outputs, setOutputs] = useState({ planner: "", writer: "", editor: "" });
  const [streaming, setStreaming] = useState({ planner: false, writer: false, editor: false });
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const agentStatus = (agentId) => {
    const order = ["planner", "writer", "editor"];
    const currentIdx = order.indexOf(stage);
    const agentIdx = order.indexOf(agentId);
    if (stage === "done") return "done";
    if (stage === "idle") return "pending";
    if (agentIdx < currentIdx) return "done";
    if (agentIdx === currentIdx) return "running";
    return "pending";
  };

  const callAgent = async (agentId, userContent) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    setStage(agentId);
    setStreaming((s) => ({ ...s, [agentId]: true }));
    setOutputs((o) => ({ ...o, [agentId]: "" }));
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000, stream: true,
          system: agent.systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                fullText += parsed.delta.text;
                setOutputs((o) => ({ ...o, [agentId]: fullText }));
              }
            } catch {}
          }
        }
      }
      setStreaming((s) => ({ ...s, [agentId]: false }));
      return fullText;
    } catch (e) {
      if (e.name !== "AbortError") setError("API 调用失败：" + e.message);
      setStreaming((s) => ({ ...s, [agentId]: false }));
      return null;
    }
  };

  const run = async () => {
    if (!input.trim()) return;
    setError("");
    setOutputs({ planner: "", writer: "", editor: "" });
    setStreaming({ planner: false, writer: false, editor: false });
    const plannerOutput = await callAgent("planner", `用户创作需求：${input.trim()}`);
    if (!plannerOutput) return;
    const writerOutput = await callAgent("writer", `以下是策划Agent提供的创作大纲：\n\n${plannerOutput}\n\n请据此展开写作。`);
    if (!writerOutput) return;
    await callAgent("editor", `以下是完整的创作任务信息：\n\n【原始需求】\n${input.trim()}\n\n【策划大纲】\n${plannerOutput}\n\n【写作正文】\n${writerOutput}\n\n请进行全面审校。`);
    setStage("done");
  };

  const reset = () => {
    if (abortRef.current) abortRef.current.abort();
    setStage("idle");
    setOutputs({ planner: "", writer: "", editor: "" });
    setStreaming({ planner: false, writer: false, editor: false });
    setError("");
    setInput("");
  };

  const isRunning = ["planner", "writer", "editor"].includes(stage);return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#d0c8b8", fontFamily: "'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&display=swap');
        @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        textarea:focus { outline: none; }
      `}</style>
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#555", marginBottom: "4px" }}>MULTI-AGENT SYSTEM v1.0</div>
          <div style={{ fontSize: "20px", letterSpacing: "0.06em", color: "#e8dfc8", fontWeight: "600" }}>中文创作协作引擎</div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {AGENTS.map((a) => (
            <div key={a.id} style={{ width: "6px", height: "6px", borderRadius: "50%", background: agentStatus(a.id) !== "pending" ? a.color : "#222", transition: "background 0.3s" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 73px)" }}>
        <div style={{ borderRight: "1px solid #1a1a1a", padding: "28px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", color: "#444", marginBottom: "8px" }}>AGENT PIPELINE</div>
          {AGENTS.map((agent, i) => (
            <div key={agent.id}>
              <AgentCard agent={agent} status={agentStatus(agent.id)} />
              {i < AGENTS.length - 1 && (
                <div style={{ marginLeft: "23px", height: "16px", borderLeft: `1px dashed ${agentStatus(agent.id) === "done" ? "#333" : "#1e1e1e"}`, transition: "border-color 0.5s" }} />
              )}
            </div>
          ))}
          {stage === "done" && (
            <div style={{ marginTop: "16px", padding: "12px 16px", background: "#0d1a0d", border: "1px solid #2a4a2a", borderRadius: "2px", fontSize: "11px", color: "#6a9a6a", fontFamily: "monospace", animation: "fadeIn 0.5s ease" }}>
              ✓ 全流程完成<br />
              <span style={{ color: "#3a5a3a", marginTop: "4px", display: "block" }}>3 agents · chain complete</span>
            </div>
          )}
        </div>
        <div style={{ padding: "28px 32px", overflowY: "auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", color: "#444", marginBottom: "10px" }}>创作需求输入</div>
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="描述你的创作需求……"
              disabled={isRunning}
              style={{ width: "100%", minHeight: "100px", background: "#0d0d0d", border: "1px solid #222", borderRadius: "2px", padding: "14px 16px", color: "#c8c0b0", fontSize: "13.5px", lineHeight: "1.7", fontFamily: "'Noto Serif SC', Georgia, serif", resize: "vertical", boxSizing: "border-box", caretColor: "#c8a96e" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button onClick={run} disabled={isRunning || !input.trim()}
                style={{ padding: "10px 24px", background: isRunning || !input.trim() ? "#1a1a1a" : "#c8a96e", color: isRunning || !input.trim() ? "#444" : "#080808", border: "none", borderRadius: "2px", fontFamily: "'Courier New', monospace", fontSize: "12px", letterSpacing: "0.1em", cursor: isRunning || !input.trim() ? "not-allowed" : "pointer", fontWeight: "600" }}>
                {isRunning ? "运行中..." : "▶  启动协作流"}
              </button>
              {(isRunning || stage === "done") && (
                <button onClick={reset} style={{ padding: "10px 18px", background: "transparent", color: "#555", border: "1px solid #2a2a2a", borderRadius: "2px", fontFamily: "'Courier New', monospace", fontSize: "12px", cursor: "pointer" }}>重置</button>
              )}
            </div>
            {error && <div style={{ marginTop: "10px", color: "#c06060", fontSize: "12px", fontFamily: "monospace" }}>✗ {error}</div>}
          </div>
          <OutputPanel label="策划 AGENT · OUTPUT" color={AGENTS[0].color} content={outputs.planner} isStreaming={streaming.planner} />
          <OutputPanel label="写作 AGENT · OUTPUT" color={AGENTS[1].color} content={outputs.writer} isStreaming={streaming.writer} />
          <OutputPanel label="审校 AGENT · OUTPUT" color={AGENTS[2].color} content={outputs.editor} isStreaming={streaming.editor} />
        </div>
      </div>
    </div>
  );
}
