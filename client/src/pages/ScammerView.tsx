import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useConversations, useCreateConversation } from "@/hooks/use-conversations";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { Send, Phone, Video, MoreVertical, Plus } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function ScammerView() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConvos } = useConversations();
  const createConversation = useCreateConversation();
  const { data: messages, isLoading: isLoadingMessages } = useMessages(activeId);
  const sendMessage = useSendMessage();

  // Auto-select most recent active conversation or create one
  useEffect(() => {
    if (conversations && !activeId) {
      if (conversations.length > 0) {
        setActiveId(conversations[0].id);
      } else if (!createConversation.isPending) {
        // Only create if we really have none and haven't tried yet
        // For now, let's just let user create manually to avoid loops if creation fails
      }
    }
  }, [conversations, activeId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !activeId) return;
    sendMessage.mutate({
      conversationId: activeId,
      content: inputValue,
      sender: "scammer",
    });
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    createConversation.mutate("Scammer Target", {
      onSuccess: (newConvo) => setActiveId(newConvo.id),
    });
  };

  return (
    <div className="theme-scammer min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Mobile Frame */}
      <div className="w-full max-w-md bg-white h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-gray-900 relative flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20"></div>

        {/* Header */}
        <div className="bg-[#f0f2f5] px-4 pt-10 pb-3 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              {/* Online Indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 leading-tight">Sarah (Target)</h2>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-blue-500">
            <Video className="w-6 h-6" />
            <Phone className="w-6 h-6" />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-[#efeae2] overflow-y-auto p-4 space-y-3 relative">
           {/* Whatsapp-style background pattern opacity overlay could go here */}
           
           {/* Start new chat button if none selected */}
           {!activeId && (
             <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-500 text-sm">No active chat selected.</p>
                <button 
                  onClick={handleNewChat}
                  disabled={createConversation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium shadow-md transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Start New Scam
                </button>
             </div>
           )}

           <AnimatePresence initial={false}>
             {messages?.map((msg) => {
               const isMe = msg.sender === "scammer";
               return (
                 <motion.div
                   key={msg.id}
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   className={clsx(
                     "flex w-full",
                     isMe ? "justify-end" : "justify-start"
                   )}
                 >
                   <div
                     className={clsx(
                       "max-w-[80%] px-4 py-2 shadow-sm text-[15px] leading-relaxed relative",
                       isMe 
                         ? "bg-[#d9fdd3] text-gray-900 rounded-2xl rounded-tr-none" 
                         : "bg-white text-gray-900 rounded-2xl rounded-tl-none"
                     )}
                   >
                     {msg.content}
                     <div className={clsx("text-[10px] mt-1 flex items-center gap-1", isMe ? "text-green-800/60 justify-end" : "text-gray-400")}>
                        {msg.createdAt && format(new Date(msg.createdAt), 'HH:mm')}
                        {isMe && <span>✓✓</span>}
                     </div>
                   </div>
                 </motion.div>
               );
             })}
           </AnimatePresence>
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f2f5] p-3 flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <Plus className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-none focus:ring-0 focus:outline-none placeholder:text-gray-400 text-gray-800 shadow-sm"
            disabled={!activeId || sendMessage.isPending}
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-900/20 rounded-full"></div>
      </div>
    </div>
  );
}
