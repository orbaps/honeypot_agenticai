# 🎨 PHASE 4 - Dynamic Victim UI (Real-Time State-Driven)

## ✅ STATUS: Backend Complete, Frontend Guide Provided

**Date**: February 3, 2026  
**Purpose**: Make UI react to backend state for judge-convincing demo

---

## 📊 PHASE 4 OVERVIEW

### Problem (Before Phase 4)
- ❌ "45% Caution" is static/hardcoded
- ❌ Intel count doesn't update live
- ❌ Agent Cortex shows generic "waiting"
- ❌ UI doesn't reflect risk escalation

### Solution (After Phase 4)
- ✅ Risk score moves in real-time (0.2 → 0.45 → 0.70 → 1.0)
- ✅ Intel list updates instantly when extracted
- ✅ Agent status changes with behavior (ACTIVE/STANDBY/EXITED)
- ✅ UI is pure projection of backend truth

---

## ✅ PHASE 4.1 & 4.2: Backend Implementation (COMPLETE)

### API Response Structure

Every message creation now returns:

```json
{
  "id": 123,
  "conversationId": 1,
  "sender": "scammer",
  "content": "Send to raj@paytm",
  "createdAt": "2026-02-03T01:25:00Z",
  "metadata": {},
  
  "extracted_intel": {
    "upi_ids": ["raj@paytm"],
    "bank_accounts": [],
    "phishing_links": [],
    "phone_numbers": []
  },
  
  "confidence_score": 0.4,
  
  "ui_state": {
    "risk_score": 0.45,
    "risk_label": "CAUTION",
    "agent_status": "ACTIVE",
    "intel_count": 1,
    "session_status": "ACTIVE",
    "current_goal": "ASK_BANK_DETAILS"
  }
}
```

### Risk Score Algorithm (Explainable for Judges)

```typescript
function computeRiskScore(session) {
  let score = 0.2; // Base suspicion
  
  // Incremental evidence
  if (phone_numbers.length > 0) score += 0.15;  // → 0.35
  if (upi_ids.length > 0)       score += 0.25;  // → 0.60
  if (bank_accounts.length > 0) score += 0.20;  // → 0.80
  if (phishing_links.length > 0) score += 0.20; // → 1.00
  
  // Exit state = confirmed scam
  if (goal === "EXIT_SAFELY")    score = 1.0;
  
  return Math.min(score, 1.0);
}
```

### Risk Label Mapping

| Score Range | Label | UI Color |
|-------------|-------|----------|
| 0.0 - 0.3 | `SAFE` | 🟢 Green |
| 0.3 - 0.6 | `CAUTION` | 🟡 Yellow |
| 0.6 - 1.0 | `HIGH RISK` | 🔴 Red |

---

## 📱 PHASE 4.3 & 4.4: Frontend Implementation Guide

### File Structure
```
client/src/
├── components/
│   ├── RiskBadge.tsx         ← Update with ui_state.risk_score
│   ├── IntelList.tsx          ← Map extracted_intel
│   ├── AgentCortex.tsx        ← Use ui_state.agent_status
│   └── ChatInterface.tsx      ← Main component
```

---

### 1. Risk Badge Component (Dynamic)

**File**: `client/src/components/RiskBadge.tsx`

```typescript
import { useEffect, useState } from 'react';

interface RiskBadgeProps {
  riskScore: number;
  riskLabel: string;
}

export function RiskBadge({ riskScore, riskLabel }: RiskBadgeProps) {
  const [displayScore, setDisplayScore] = useState(riskScore);
  
  // Smooth animation
  useEffect(() => {
    const timer = setTimeout(() => setDisplayScore(riskScore), 100);
    return () => clearTimeout(timer);
  }, [riskScore]);
  
  const getColor = () => {
    if (riskScore < 0.3) return 'bg-green-500';
    if (riskScore < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className={`badge ${getColor()} transition-all duration-500`}>
      <div className="text-2xl font-bold">
        {Math.round(displayScore * 100)}%
      </div>
      <div className="text-sm">{riskLabel}</div>
    </div>
  );
}
```

**CSS** (add smooth transitions):
```css
.badge {
  transition: background-color 0.5s ease, transform 0.3s ease;
}

.badge:hover {
  transform: scale(1.05);
}
```

---

### 2. Intel List Component (Real-Time)

**File**: `client/src/components/IntelList.tsx`

```typescript
import { useEffect, useState } from 'react';

interface IntelItem {
  type: string;
  value: string;
  timestamp: Date;
}

export function IntelList({ extractedIntel }: { extractedIntel: any }) {
  const [items, setItems] = useState<IntelItem[]>([]);
  
  useEffect(() => {
    const allIntel: IntelItem[] = [];
    
    extractedIntel.upi_ids?.forEach((value: string) => {
      allIntel.push({ type: 'UPI ID', value, timestamp: new Date() });
    });
    
    extractedIntel.bank_accounts?.forEach((value: string) => {
      allIntel.push({ type: 'Bank Account', value, timestamp: new Date() });
    });
    
    extractedIntel.phishing_links?.forEach((value: string) => {
      allIntel.push({ type: 'Phishing Link', value, timestamp: new Date() });
    });
    
    extractedIntel.phone_numbers?.forEach((value: string) => {
      allIntel.push({ type: 'Phone Number', value, timestamp: new Date() });
    });
    
    setItems(allIntel);
  }, [extractedIntel]);
  
  return (
    <div className="intel-list">
      <h3>Extracted Intelligence ({items.length})</h3>
      {items.map((item, index) => (
        <div 
          key={index} 
          className="intel-row animate-slide-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <span className="intel-type">{item.type}</span>
          <span className="intel-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
```

**CSS** (slide-in animation):
```css
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out forwards;
}

.intel-row {
  padding: 8px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.intel-row:hover {
  background-color: #f5f5f5;
}
```

---

### 3. Agent Cortex Status (Live States)

**File**: `client/src/components/AgentCortex.tsx`

```typescript
interface AgentCortexProps {
  status: 'ACTIVE' | 'STANDBY' | 'EXITED';
  currentGoal?: string;
}

export function AgentCortex({ status, currentGoal }: AgentCortexProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'ACTIVE': return 'status-active glow-green';
      case 'STANDBY': return 'status-standby dim';
      case 'EXITED': return 'status-exited disabled';
      default: return 'status-standby';
    }
  };
  
  return (
    <div className={`agent-cortex ${getStatusClass()}`}>
      <div className="status-indicator"></div>
      <div className="status-text">
        <div className="text-sm font-semibold">{status}</div>
        {currentGoal && (
          <div className="text-xs opacity-75">
            Goal: {currentGoal.replace('_', ' ')}
          </div>
        )}
      </div>
    </div>
  );
}
```

**CSS** (glowing effects):
```css
.agent-cortex {
  padding: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.status-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
}

.glow-green .status-indicator {
  background: #fff;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-standby {
  background: #6b7280;
  opacity: 0.7;
}

.status-exited {
  background: #dc2626;
  opacity: 0.5;
  pointer-events: none;
}
```

---

### 4. Main Chat Interface Integration

**File**: `client/src/components/ChatInterface.tsx`

```typescript
import { useState, useEffect } from 'react';
import { RiskBadge } from './RiskBadge';
import { IntelList } from './IntelList';
import { AgentCortex } from './AgentCortex';

export function ChatInterface() {
  const [uiState, setUiState] = useState({
    risk_score: 0.2,
    risk_label: 'SAFE',
    agent_status: 'STANDBY',
    intel_count: 0,
    session_status: 'ACTIVE',
    current_goal: null
  });
  
  const [extractedIntel, setExtractedIntel] = useState({
    upi_ids: [],
    bank_accounts: [],
    phishing_links: [],
    phone_numbers: []
  });
  
  // After sending/receiving message
  const handleMessageResponse = (response: any) => {
    // PHASE 4.3: Update UI from backend response
    if (response.ui_state) {
      setUiState(response.ui_state);
    }
    
    if (response.extracted_intel) {
      setExtractedIntel(response.extracted_intel);
    }
  };
  
  return (
    <div className="chat-interface">
      {/* Risk Badge */}
      <RiskBadge 
        riskScore={uiState.risk_score} 
        riskLabel={uiState.risk_label} 
      />
      
      {/* Agent Status */}
      <AgentCortex 
        status={uiState.agent_status} 
        currentGoal={uiState.current_goal} 
      />
      
      {/* Intel List */}
      <IntelList extractedIntel={extractedIntel} />
      
      {/* Chat messages... */}
    </div>
  );
}
```

---

## 🎬 Demo Flow (What Judges Will See)

### Initial State
```
Risk: 20% SAFE (green)
Agent: STANDBY (dim)
Intel: 0 items
```

### Scammer sends: "Call me at +911234567890"
```
→ Risk: 35% CAUTION (yellow) [smooth transition]
→ Agent: ACTIVE (glowing green)
→ Intel: 1 item appears [slide-in animation]
  - Phone Number: +911234567890
```

### Scammer sends: "Send to raj@paytm"
```
→ Risk: 60% CAUTION (yellow→red transition)
→ Agent: ACTIVE (pulsing)
→ Intel: 2 items
  - Phone Number: +911234567890
  - UPI ID: raj@paytm [new row slides in]
```

### Scammer sends: "Account 12345678901"
```
→ Risk: 80% HIGH RISK (red, urgent glow)
→ Agent: ACTIVE
→ Intel: 3 items
  - Phone Number: +911234567890
  - UPI ID: raj@paytm
  - Bank Account: 12345678901 [slides in]
```

### Agent reaches EXIT_SAFELY
```
→ Risk: 100% HIGH RISK (maximum alert)
→ Agent: EXITED (disabled, gray out)
→ Intel: 3 items (locked)
→ Session: COMPLETED
```

---

## ✅ PHASE 4 SUCCESS CHECKLIST

### Backend (✅ COMPLETE)
- [x] ✅ ui_state added to API response
- [x] ✅ computeRiskScore() implemented
- [x] ✅ getRiskLabel() mapping
- [x] ✅ agent_status exposed
- [x] ✅ intel_count calculated
- [x] ✅ current_goal included

### Frontend (📋 TODO)
- [ ] Update RiskBadge to use ui_state.risk_score
- [ ] Add smooth CSS transitions for risk changes
- [ ] Map extracted_intel to IntelList component
- [ ] Add slide-in animations for new intel
- [ ] Update AgentCortex with status indicator
- [ ] Add glow/pulse effects for ACTIVE status
- [ ] Connect all components to API response

---

## 🎨 Minimum Required for Demo

If short on time, implement only:

1. **Dynamic Risk Score** (30 min)
   - Update badge number from ui_state.risk_score
   - Change color based on risk_label
   - Add CSS transition

2. **Live Intel List** (30 min)
   - Map extracted_intel array
   - Add fade-in for new items
   - Show count

3. **Agent Status Indicator** (15 min)
   - Show ACTIVE/EXITED state
   - Add glowing dot for ACTIVE
   - Dim out when EXITED

**Total**: ~75 minutes for demo-ready UI

---

## 🚫 What Phase 4 Does NOT Include

❌ No backend refactor (already done)  
❌ No new API endpoints (using existing)  
❌ No WebSockets needed (polling is fine)  
❌ No major design overhaul (update existing components)

---

## 🎯 Expected Judge Reaction

**Before Phase 4**:  
"Okay, the backend logic is good, but the UI looks static..."

**After Phase 4**:  
"Wow! Look at that risk score climbing in real-time! The intel list updates instantly! This feels alive and production-ready!" ⭐⭐⭐

---

## 📊 API Response Example (Real Demo Data)

```json
{
  "id": 456,
  "content": "Send ₹100 to raj123@paytm for verification",
  "sender": "scammer",
  
  "extracted_intel": {
    "upi_ids": ["raj123@paytm"],
    "bank_accounts": [],
    "phishing_links": [],
    "phone_numbers": []
  },
  
  "confidence_score": 0.4,
  
  "ui_state": {
    "risk_score": 0.45,
    "risk_label": "CAUTION",
    "agent_status": "ACTIVE",
    "intel_count": 1,
    "session_status": "ACTIVE",
    "current_goal": "ASK_BANK_DETAILS"
  }
}
```

Frontend immediately shows:
- Risk badge: 45% CAUTION (yellow)
- Intel list: 1 new item slides in
- Agent cortex: ACTIVE (glowing)

---

## 🏆 CONCLUSION

**Phase 4 Backend: ✅ COMPLETE**

The backend now exposes all necessary UI state in every API response. Frontend just needs to:
1. Read `response.ui_state`
2. Update component state
3. Let CSS transitions handle the magic

**This creates the "cause → effect" narrative judges expect!**

---

**Implementation**: Antigravity Agent  
**Completion**: February 3, 2026  
**Status**: Backend ready, frontend guide provided
