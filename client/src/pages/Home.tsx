import { Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, MessageSquareText, Lock, Users, Terminal } from "lucide-react";
import { CyberButton } from "@/components/CyberButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Matrix/Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

      <main className="container mx-auto px-4 h-screen flex flex-col items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            SYSTEM OPERATIONAL
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-2 glitch-text">
            HONEYPOT<span className="text-primary">.AI</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Autonomous counter-scam intelligence agent. Detects, engages, and extracts intel from malicious actors in real-time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="grid md:grid-cols-2 gap-6 mt-16 w-full max-w-4xl"
        >
          {/* Card 1: Scammer View */}
          <Link href="/scammer" className="group">
            <div className="h-full p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/[0.07] transition-all cursor-pointer relative overflow-hidden group-hover:-translate-y-1 duration-300">
              <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />
              
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">Scammer View</h3>
                <p className="text-muted-foreground">
                  Simulate the attacker's perspective. Interact with the AI agent in a realistic chat interface.
                </p>
                <div className="pt-4 flex items-center text-blue-400 font-mono text-sm group-hover:gap-2 transition-all">
                  <span>LAUNCH SIMULATION</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Card 2: Victim Dashboard */}
          <Link href="/dashboard" className="group">
            <div className="h-full p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/[0.07] transition-all cursor-pointer relative overflow-hidden group-hover:-translate-y-1 duration-300">
              <div className="absolute top-0 right-0 p-24 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />
              
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">Victim Dashboard</h3>
                <p className="text-muted-foreground">
                  Monitor the AI agent in real-time. View emotional analysis, extracted intel, and security reports.
                </p>
                <div className="pt-4 flex items-center text-primary font-mono text-sm group-hover:gap-2 transition-all">
                  <span>ACCESS CONSOLE</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        <footer className="absolute bottom-8 text-center text-xs text-muted-foreground font-mono opacity-50">
          SECURE CONNECTION ESTABLISHED • ENCRYPTED VIA AES-256
        </footer>
      </main>
    </div>
  );
}
