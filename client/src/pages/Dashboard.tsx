import { useState, useEffect, useRef } from "react";
import { useConversations, useConversation, useUpdateConversation, useClearConversation } from "@/hooks/use-conversations";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { useReports, useGenerateReport } from "@/hooks/use-reports";
import { AgentBrain } from "@/components/AgentBrain";
import { ScamScore } from "@/components/ScamScore";
import { CyberButton } from "@/components/CyberButton";
import { 
  Bot, AlertTriangle, Download, Trash2, Menu, X, 
  Send, User, Search, RefreshCw, ChevronRight 
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { data: conversations, isLoading: isLoadingConvos } = useConversations();
  
  // Select first conversation on load
  useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside 
        className={clsx(
          "bg-secondary/20 border-r border-white/5 flex-col w-80 fixed md:relative h-full z-30 transition-all duration-300 backdrop-blur-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-80"
        )}
      >
        <div className="p-4 h-16 flex items-center justify-between border-b border-white/5">
          <div className={clsx("flex items-center gap-3 overflow-hidden transition-all", !sidebarOpen && "md:hidden lg:flex")}>
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold font-mono tracking-wider">HONEYPOT</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-md md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-4rem)] cyber-scrollbar">
          <div className={clsx("transition-all", !sidebarOpen && "md:hidden lg:block")}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase mb-3">Active Threats</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search ID..." 
                className="w-full bg-background border border-white/10 rounded-md py-2 pl-9 pr-4 text-sm focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            {conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={clsx(
                  "w-full p-3 rounded-lg border text-left transition-all hover:translate-x-1 group relative overflow-hidden",
                  selectedId === conv.id 
                    ? "bg-primary/5 border-primary/30 text-primary" 
                    : "bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.04] text-muted-foreground"
                )}
              >
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <span className={clsx("font-medium truncate pr-2", !sidebarOpen && "md:hidden lg:block")}>
                    {conv.title}
                  </span>
                  <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-white/10", !sidebarOpen && "md:hidden lg:block")}>
                    #{conv.id}
                  </span>
                </div>
                <div className={clsx("flex items-center justify-between text-xs opacity-70 relative z-10", !sidebarOpen && "md:hidden lg:block")}>
                   <span>{format(new Date(conv.createdAt!), 'MMM d, HH:mm')}</span>
                   <span className={clsx(conv.isAgentActive ? "text-green-500" : "text-yellow-500")}>
                     {conv.isAgentActive ? "● ACTIVE" : "○ PAUSED"}
                   </span>
                </div>
                
                {/* Minimized view icon */}
                <div className={clsx("hidden md:flex lg:hidden items-center justify-center", sidebarOpen && "hidden")}>
                    <div className={clsx("w-2 h-2 rounded-full", selectedId === conv.id ? "bg-primary" : "bg-muted-foreground")} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-background to-background">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-background/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-md">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold font-mono flex items-center gap-2">
                DASHBOARD <ChevronRight className="w-4 h-4 text-muted-foreground" /> <span className="text-primary">LIVE MONITOR</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
               EXIT CONSOLE
             </Link>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-hidden p-6 relative">
          {selectedId ? (
            <ConversationView conversationId={selectedId} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <AlertTriangle className="w-16 h-16 opacity-20" />
              <p className="font-mono">SELECT A THREAT VECTOR TO MONITOR</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ConversationView({ conversationId }: { conversationId: number }) {
  const { data: conversation } = useConversation(conversationId);
  const { data: messages } = useMessages(conversationId);
  const { data: reports } = useReports(conversationId);
  
  const updateConversation = useUpdateConversation();
  const clearConversation = useClearConversation();
  const generateReport = useGenerateReport();
  const sendMessage = useSendMessage();
  
  const [manualInput, setManualInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToggleAgent = () => {
    if (!conversation) return;
    updateConversation.mutate({
      id: conversationId,
      updates: { isAgentActive: !conversation.isAgentActive }
    });
  };

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    sendMessage.mutate({
      conversationId,
      content: manualInput,
      sender: "agent" // Manual override
    });
    setManualInput("");
  };

  const latestAgentMsg = messages?.filter(m => m.sender === 'agent' || m.sender === 'system').pop();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full max-h-full">
      
      {/* LEFT COLUMN: Chat Feed & Controls (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-hidden">
        {/* Stats Bar */}
        <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <ScamScore score={conversation?.scamScore || 0} className="w-24 h-24 -my-2" />
            <div>
              <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Status</div>
              <div className="flex items-center gap-2">
                 <span className={clsx("w-2 h-2 rounded-full", conversation?.isAgentActive ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                 <span className="font-bold tracking-tight">{conversation?.status?.toUpperCase()}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Intel Count</div>
              <div className="font-bold text-xl">{reports?.length || 0}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CyberButton 
               size="sm" 
               variant={conversation?.isAgentActive ? "danger" : "primary"}
               onClick={handleToggleAgent}
               isLoading={updateConversation.isPending}
            >
              {conversation?.isAgentActive ? "PAUSE AI" : "RESUME AI"}
            </CyberButton>
            
            <CyberButton 
               size="sm" 
               variant="ghost" 
               className="text-muted-foreground hover:text-red-400"
               onClick={() => {
                 if (confirm("Are you sure you want to clear chat history?")) {
                   clearConversation.mutate(conversationId);
                 }
               }}
            >
              <Trash2 className="w-4 h-4" />
            </CyberButton>
          </div>
        </div>

        {/* Live Chat Feed */}
        <div className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden relative">
          <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE INTERCEPT FEED
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 cyber-scrollbar" ref={scrollRef}>
            {messages?.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <p className="font-mono">NO INTERCEPTED PACKETS</p>
              </div>
            )}
            
            {messages?.map((msg) => {
              const isAgent = msg.sender === 'agent' || msg.sender === 'system';
              return (
                <div key={msg.id} className={clsx("flex gap-4", isAgent ? "flex-row-reverse" : "")}>
                   <div className={clsx(
                     "w-8 h-8 rounded flex items-center justify-center shrink-0",
                     isAgent ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-500"
                   )}>
                     {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                   </div>
                   <div className={clsx("flex flex-col max-w-[80%]", isAgent ? "items-end" : "items-start")}>
                      <div className={clsx(
                        "p-3 rounded-lg text-sm leading-relaxed border",
                        isAgent 
                          ? "bg-primary/10 border-primary/20 text-foreground rounded-tr-none" 
                          : "bg-white/5 border-white/10 text-muted-foreground rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 font-mono opacity-50">
                        {format(new Date(msg.createdAt!), 'HH:mm:ss')} • {msg.sender.toUpperCase()}
                      </span>
                   </div>
                </div>
              );
            })}
          </div>

          {/* Manual Override Input */}
          <form onSubmit={handleManualSend} className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
             <input
               value={manualInput}
               onChange={(e) => setManualInput(e.target.value)}
               placeholder="Override protocol... (Manual Message)"
               className="flex-1 bg-background/50 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-primary/50 focus:outline-none transition-colors"
             />
             <CyberButton type="submit" size="sm" disabled={!manualInput.trim()}>
               <Send className="w-4 h-4" />
             </CyberButton>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Brain & Intel (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
        
        {/* Agent Brain Visualization */}
        <div className="h-[45%]">
          <AgentBrain 
            latestMessage={latestAgentMsg} 
            isActive={conversation?.isAgentActive ?? true} 
          />
        </div>

        {/* Extracted Intel Table */}
        <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold font-mono text-sm tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              EXTRACTED INTELLIGENCE
            </h3>
            <CyberButton 
              size="sm" 
              variant="secondary" 
              className="h-7 text-xs"
              onClick={() => generateReport.mutate(conversationId)}
              isLoading={generateReport.isPending}
            >
              <Download className="w-3 h-3" /> EXPORT PDF
            </CyberButton>
          </div>
          
          <div className="flex-1 overflow-y-auto cyber-scrollbar">
            {reports?.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 p-8 text-center">
                 <p className="text-xs font-mono">NO PII DETECTED YET</p>
               </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reports?.map((report) => (
                    <tr key={report.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {report.intelType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-foreground truncate max-w-[150px]" title={report.intelValue}>
                        {report.intelValue}
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground font-mono">
                        {format(new Date(report.createdAt!), 'HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
