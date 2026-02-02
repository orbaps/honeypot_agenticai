import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, Activity } from "lucide-react";
import { type Message } from "@shared/schema";
import { clsx } from "clsx";

interface AgentBrainProps {
  latestMessage?: Message;
  isActive: boolean;
}

export function AgentBrain({ latestMessage, isActive }: AgentBrainProps) {
  const metadata = latestMessage?.metadata as { emotion?: string; reasoning?: string; nextAction?: string } | undefined;

  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-3">
          <div className={clsx("p-2 rounded-lg transition-colors", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-foreground tracking-tight">AGENT CORTEX</h3>
            <div className="flex items-center gap-2">
              <span className={clsx("w-2 h-2 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
              <span className="text-xs text-muted-foreground font-mono uppercase">
                {isActive ? "System Online" : "Standby Mode"}
              </span>
            </div>
          </div>
        </div>
        
        {isActive && <Activity className="w-5 h-5 text-primary animate-pulse" />}
      </div>

      <div className="flex-1 space-y-4 z-10 overflow-y-auto cyber-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {metadata ? (
            <motion.div
              key={latestMessage?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Emotion Badge */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-muted-foreground uppercase">Detected Emotion</label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium inline-block">
                    {metadata.emotion || "Neutral"}
                  </div>
                </div>
              </div>

              {/* Reasoning Card */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-muted-foreground uppercase">Logic Stream</label>
                <div className="p-4 rounded-lg bg-background/50 border border-white/5 text-sm leading-relaxed text-gray-300 font-mono shadow-inner">
                   <Zap className="w-4 h-4 text-yellow-500 inline mr-2 mb-0.5" />
                   {metadata.reasoning || "Analyzing conversation context..."}
                </div>
              </div>

              {/* Next Action */}
              {metadata.nextAction && (
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Next Action Protocol</label>
                  <div className="text-primary text-sm font-bold border-l-2 border-primary pl-3 py-1">
                    {metadata.nextAction}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
              <Brain className="w-12 h-12" />
              <p className="font-mono text-xs">Waiting for input stream...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
