/**
 * Sdílené Emparia komponenty
 */

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";

// ============================================================
// Logo SVG – přesně z logomanuálu
// ============================================================
export function EmpariaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 52"
      className={className}
      aria-label="emparia finance"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Symbol – čtyřlístek ze sign manuálu */}
      <g transform="translate(1, 3) scale(0.85)">
        <ellipse cx="12" cy="7"  rx="5" ry="7"   fill="#4f5d37" transform="rotate(-18 12 7)" />
        <ellipse cx="23" cy="5"  rx="5" ry="7"   fill="#4f5d37" transform="rotate(18 23 5)" />
        <ellipse cx="7"  cy="19" rx="5" ry="7"   fill="#4f5d37" transform="rotate(-48 7 19)" />
        <ellipse cx="19" cy="21" rx="4.5" ry="6.5" fill="#4f5d37" transform="rotate(18 19 21)" />
      </g>

      {/* "emparia" */}
      <text
        x="34" y="33"
        fontFamily="Outfit, sans-serif"
        fontWeight="400"
        fontSize="26"
        fill="#4f5d37"
      >
        emparia
      </text>

      {/* svislá čára */}
      <line x1="158" y1="14" x2="158" y2="38" stroke="#C79549" strokeWidth="1.2" />

      {/* "FINANCE" */}
      <text
        x="163" y="33"
        fontFamily="Outfit, sans-serif"
        fontWeight="500"
        fontSize="10"
        fill="#C79549"
        letterSpacing="1.8"
      >
        FINANCE
      </text>
    </svg>
  );
}

// ============================================================
// Číslo s mezerami jako oddělovači tisíců
// – zobrazuje formátovanou hodnotu, ale edituje surové číslo
// ============================================================
function formatWithSpaces(value: number | string): string {
  if (value === "" || value === 0 || value === "0") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "";
  // Celá čísla – mezera každé 3 číslice
  return Math.round(num).toLocaleString("cs-CZ").replace(/\u00a0/g, " ");
}

interface FormattedNumInputProps {
  label: string;
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  hint?: string;
  suffix?: string;
  min?: number;
}

export function FormattedNumInput({
  label,
  value,
  onChange,
  placeholder = "0",
  hint,
  suffix = "Kč",
  min = 0,
}: FormattedNumInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const numVal = typeof value === "string" ? parseFloat(value) || 0 : value || 0;

  const handleFocus = () => {
    setFocused(true);
    // Ukaž surové číslo bez formátování
    setRawInput(numVal > 0 ? String(numVal) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(rawInput.replace(/\s/g, "").replace(",", ".")) || 0;
    onChange(parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Povol jen číslice, tečku, čárku
    const cleaned = e.target.value.replace(/[^0-9.,]/g, "");
    setRawInput(cleaned);
    const parsed = parseFloat(cleaned.replace(",", ".")) || 0;
    onChange(parsed);
  };

  const displayValue = focused ? rawInput : formatWithSpaces(numVal);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder === "0" ? "" : placeholder}
          min={min}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-sm shadow-sm transition-colors
            placeholder:text-muted-foreground
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
            disabled:cursor-not-allowed disabled:opacity-50
            font-medium tracking-wide"
          data-testid={`input-${label}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Header – sdílený mezi FormPage a ResultPage
// ============================================================
interface EmpariaHeaderProps {
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function EmpariaHeader({ subtitle, rightContent }: EmpariaHeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur border-b border-border sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EmpariaLogo className="h-9" />
          {subtitle && (
            <span className="text-xs text-muted-foreground hidden sm:block border-l border-border pl-3">
              {subtitle}
            </span>
          )}
        </div>
        {rightContent}
      </div>
    </header>
  );
}

// ============================================================
// Formátování čísla pro zobrazení (výsledky, doporučení)
// ============================================================
export function czFormat(n: number): string {
  if (n === 0) return "0 Kč";
  return Math.round(n).toLocaleString("cs-CZ").replace(/\u00a0/g, "\u00a0") + " Kč";
}
