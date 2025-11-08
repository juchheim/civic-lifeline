import { CheckCircle2 } from "lucide-react";

interface SuccessAlertProps {
  message: string;
  className?: string;
}

export default function SuccessAlert({ message, className = "" }: SuccessAlertProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-2 rounded-xl border border-civic-green-dark/20 bg-civic-green-dark/5 px-3 py-2 text-sm text-civic-green-dark ${className}`}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

