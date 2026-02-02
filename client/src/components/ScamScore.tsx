import { clsx } from "clsx";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

interface ScamScoreProps {
  score: number;
  className?: string;
}

export function ScamScore({ score, className }: ScamScoreProps) {
  let colorClass = "text-green-500 bg-green-500/10 border-green-500/20";
  let Icon = ShieldCheck;
  let label = "SAFE";

  if (score > 30) {
    colorClass = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    Icon = Shield;
    label = "CAUTION";
  }
  if (score > 70) {
    colorClass = "text-red-500 bg-red-500/10 border-red-500/20";
    Icon = ShieldAlert;
    label = "DANGER";
  }

  return (
    <div className={clsx("flex flex-col items-center justify-center p-4 rounded-xl border backdrop-blur-sm", colorClass, className)}>
      <div className="relative">
        <Icon className="w-8 h-8 mb-2" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", score > 70 ? "bg-red-500" : "bg-green-500")}></span>
            <span className={clsx("relative inline-flex rounded-full h-3 w-3", score > 70 ? "bg-red-500" : "bg-green-500")}></span>
        </span>
      </div>
      <span className="text-3xl font-bold font-mono tabular-nums">{score}%</span>
      <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mt-1">{label}</span>
    </div>
  );
}
