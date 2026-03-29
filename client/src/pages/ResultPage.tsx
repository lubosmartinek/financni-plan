import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, RotateCcw, Target, Pencil } from "lucide-react";

const SCORE_COLORS = {
  excellent: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", badge: "bg-green-100 text-green-800", ring: "#22c55e" },
  good: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", badge: "bg-blue-100 text-blue-800", ring: "#3b82f6" },
  fair: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", badge: "bg-amber-100 text-amber-800", ring: "#f59e0b" },
  poor: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", badge: "bg-red-100 text-red-800", ring: "#ef4444" },
};

function getScoreLevel(score: number): keyof typeof SCORE_COLORS {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Výborný";
  if (score >= 60) return "Dobrý";
  if (score >= 40) return "Průměrný";
  return "Rizikový";
}

function ScoreGauge({ score }: { score: number }) {
  const level = getScoreLevel(score);
  const color = SCORE_COLORS[level].ring;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2;
  const offset = halfCircumference - (score / 100) * halfCircumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 80" className="w-48 h-28">
        {/* Background arc */}
        <path
          d="M 14 76 A 56 56 0 0 1 126 76"
          fill="none"
          stroke="hsl(214 32% 91%)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 14 76 A 56 56 0 0 1 126 76"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={halfCircumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
        {/* Score text */}
        <text x="70" y="65" textAnchor="middle" className="text-2xl font-bold" style={{ fontSize: "22px", fontWeight: 700, fill: color }}>{score}</text>
        <text x="70" y="76" textAnchor="middle" style={{ fontSize: "9px", fill: "hsl(215 16% 47%)" }}>{getScoreLabel(score)}</text>
      </svg>
      <p className="text-xs text-muted-foreground -mt-2">z 100 bodů</p>
    </div>
  );
}

function CzFormat(n: number) {
  return Math.round(n).toLocaleString("cs-CZ") + " Kč";
}

function getRecommendations(data: any): Array<{ type: "warning" | "tip" | "ok", text: string }> {
  const recs: Array<{ type: "warning" | "tip" | "ok", text: string }> = [];
  const cashflow = data.mesicniCashflow || 0;
  const prijmy = data.celkovePrijmy || 1;
  const dluhy = data.celkoveDluhy || 0;
  const majetek = data.celkovyMajetek || 0;
  const nouzovyFond = data.nouzovyFond ?? 0;
  const vydaje = data.celkoveVydaje || 1;

  // Cash flow
  if (cashflow < 0) {
    recs.push({ type: "warning", text: `Vaše výdaje převyšují příjmy o ${CzFormat(Math.abs(cashflow))} měsíčně. Okamžitě zmapujte, kde lze ušetřit.` });
  } else if (cashflow / prijmy < 0.1) {
    recs.push({ type: "warning", text: `Měsíčně vám zbývá jen ${CzFormat(cashflow)} (${((cashflow / prijmy) * 100).toFixed(0)}% příjmů). Doporučujeme cílit na min. 20% volného cash flow.` });
  } else {
    recs.push({ type: "ok", text: `Cash flow je zdravé – zbývá vám ${CzFormat(cashflow)} měsíčně (${((cashflow / prijmy) * 100).toFixed(0)}% příjmů).` });
  }

  // Nouzový fond – vždy počítáme z aktuálních dat ze serveru
  const idealFond = vydaje * 3;
  if (nouzovyFond <= 0) {
    recs.push({ type: "warning", text: `Nemáte žádnou finanční rezervu. Cílem je mít min. 3 měsíční výdaje (${CzFormat(idealFond)}) stranou.` });
  } else if (nouzovyFond < vydaje) {
    recs.push({ type: "warning", text: `Nouzový fond je velmi nízký (${CzFormat(nouzovyFond)}). Cílem je mít min. 3 měsíční výdaje (${CzFormat(idealFond)}).` });
  } else if (nouzovyFond < idealFond) {
    recs.push({ type: "tip", text: `Nouzový fond máte ${CzFormat(nouzovyFond)} – dobrý začátek. Doplňte ho na ideál ${CzFormat(idealFond)} (3 měs. výdajů).` });
  } else {
    recs.push({ type: "ok", text: `Nouzový fond je dostatečný – ${CzFormat(nouzovyFond)} pokrývá ${Math.floor(nouzovyFond / (vydaje || 1))} měsíce výdajů. Skvělá ochrana.` });
  }

  // Zadluženost
  if ((data.spotrebitelskyUver || 0) > 0 || (data.kreditniKarty || 0) > 0) {
    recs.push({ type: "warning", text: `Máte spotřebitelský úvěr nebo kreditní karty (${CzFormat((data.spotrebitelskyUver || 0) + (data.kreditniKarty || 0))}). Splaťte tyto dluhy prioritně – mají nejvyšší úroky.` });
  }
  if (dluhy > 0 && majetek > 0 && dluhy / majetek > 0.6) {
    recs.push({ type: "warning", text: `Poměr dluhů k majetku je ${((dluhy / majetek) * 100).toFixed(0)}%. Zdravá hodnota je pod 40%.` });
  }

  // Pojištění
  if (!data.zivotniPojisteni) {
    recs.push({ type: "tip", text: "Nemáte životní pojištění. Pokud máte závislé osoby nebo dluhy, je to klíčová ochrana." });
  }
  if (!data.nemocenskePoistenie) {
    recs.push({ type: "tip", text: "Zvažte pojištění pracovní neschopnosti – ztráta příjmu ze zdravotních důvodů je jedním z největších finančních rizik." });
  }

  // Spoření – obecné pravidlo 50/30/20
  const sporeniRatio = (data.mesicniSporeni || 0) / prijmy;
  if (sporeniRatio < 0.1) {
    recs.push({ type: "tip", text: `Ukládáte ${((sporeniRatio) * 100).toFixed(0)}% příjmů. Pravidlo 50/30/20 doporučuje alespoň 20% měsíčně do spoření a investic.` });
  } else if (sporeniRatio >= 0.2) {
    recs.push({ type: "ok", text: `Odkládáte ${((sporeniRatio) * 100).toFixed(0)}% příjmů – výborné finanční chování!` });
  } else {
    recs.push({ type: "tip", text: `Ukládáte ${((sporeniRatio) * 100).toFixed(0)}% příjmů. Zvyšte úložku na 20% pro rychlejší dosažení cíle.` });
  }

  // Spoření vs. cílová úložka z kalkulace
  const cilRoky = (data.cilRoky > 0 ? data.cilRoky
    : (data.cilVek > 0 && data.vek > 0 ? Math.max(0, data.cilVek - data.vek) : 0));
  const cilDuchod = data.cilMesicniDuchod || 0;
  if (cilDuchod > 0 && cilRoky > 0) {
    const stavajiciMajetek = (data.uspory || 0) + (data.investice || 0);
    const budouciMesicni = cilDuchod * Math.pow(1.02, cilRoky);
    const cilKapital = budouciMesicni * 12 * 25;
    const r = 0.05 / 12;
    const m = cilRoky * 12;
    const zbyva = Math.max(0, cilKapital - stavajiciMajetek * Math.pow(1 + r, m));
    const doporUlozka = zbyva / ((Math.pow(1 + r, m) - 1) / r);
    const aktuSporeni = data.mesicniSporeni || 0;
    if (aktuSporeni < doporUlozka * 0.8) {
      recs.push({
        type: "warning",
        text: `Pro dosažení cílové částky ${CzFormat(cilDuchod)}/měs. potřebujete odkládat ${CzFormat(Math.round(doporUlozka / 100) * 100)}/měs. (při 5% p.a.). Aktuálně odkládáte ${CzFormat(aktuSporeni)}.`
      });
    } else if (aktuSporeni >= doporUlozka) {
      recs.push({
        type: "ok",
        text: `Vaše měsíční úložka ${CzFormat(aktuSporeni)} postačí pro dosažení cílové částky ${CzFormat(cilDuchod)}/měs. při 5% p.a. Jste na správné cestě.`
      });
    } else {
      recs.push({
        type: "tip",
        text: `Pro cíl ${CzFormat(cilDuchod)}/měs. je ideální úložka ${CzFormat(Math.round(doporUlozka / 100) * 100)}/měs. Zvýšením o ${CzFormat(Math.round((doporUlozka - aktuSporeni) / 100) * 100)} cíl pohodlně dosahujete.`
      });
    }
  }

  return recs;
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/assessments", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/assessments/${id}`);
      return res.json();
    },
    // Always re-fetch on mount so edits are immediately reflected
    staleTime: 0,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nepodařilo se načíst výsledky.</p>
      </div>
    );
  }

  const totalScore = data.skoreFinancniZdrav ?? 0;
  const level = getScoreLevel(totalScore);
  const colors = SCORE_COLORS[level];
  const recommendations = getRecommendations(data);

  // Radar data
  const radarData = [
    { subject: "Cash flow", A: data.skoreRodinneFinance ?? 0, max: 25 },
    { subject: "Zadluženost", A: data.skoreZadluzenost ?? 0, max: 25 },
    { subject: "Rezervy & pojištění", A: data.skoreRezervyOchrana ?? 0, max: 25 },
    { subject: "Spoření & investice", A: data.skoreSporeníInvestice ?? 0, max: 25 },
  ];

  // Pie chart – výdaje
  const vydajePie = [
    { name: "Nájem/Hypotéka", value: data.najem || 0 },
    { name: "Jídlo & Nákupy", value: data.jidloNakupy || 0 },
    { name: "Doprava", value: data.doprava || 0 },
    { name: "Zábava", value: data.utraty || 0 },
    { name: "Pojistné", value: data.pojisteni || 0 },
    { name: "Ostatní", value: data.ostatniVydaje || 0 },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

  // Bar chart – aktiva vs pasiva
  const bilanceData = [
    { name: "Úspory", value: data.uspory || 0, type: "aktivum" },
    { name: "Investice", value: data.investice || 0, type: "aktivum" },
    { name: "Nemovitosti", value: data.nemovitosti || 0, type: "aktivum" },
    { name: "Hypotéka", value: -(data.hypotekaDluh || 0), type: "pasivum" },
    { name: "Úvěry/Karty", value: -((data.spotrebitelskyUver || 0) + (data.kreditniKarty || 0) + (data.ostatniDluhy || 0)), type: "pasivum" },
  ].filter(d => d.value !== 0);

  const cileLabels: Record<string, string> = {
    sporeni_na_duchod: "Spoření na důchod",
    koupeni_nemovitosti: "Koupě nemovitosti",
    splaceni_dluhu: "Splacení dluhů",
    tvorba_rezervy: "Finanční rezerva",
    investovani: "Investování",
    vzdelani_deti: "Vzdělání dětí",
    financni_nezavislost: "Finanční nezávislost",
  };
  const horizontLabels: Record<string, string> = {
    kratky: "Krátkodobý (do 3 let)",
    stredni: "Střednědobý (3–10 let)",
    dlouhy: "Dlouhodobý (10+ let)",
    vlastni: "Vlastní horizont",
  };

  // Build horizon display string
  const horizontDisplay = (() => {
    if (data.casovyHorizont === "vlastni") {
      const parts = [];
      if (data.cilVek > 0) parts.push(`do věku ${data.cilVek} let`);
      if (data.cilRoky > 0) parts.push(`za ${data.cilRoky} ${data.cilRoky === 1 ? "rok" : data.cilRoky < 5 ? "roky" : "let"}`);
      return parts.length ? parts.join(" / ") : "Vlastní horizont";
    }
    return horizontLabels[data.casovyHorizont] || data.casovyHorizont;
  })();

  // Projected savings
  // FV = stávající majetek × (1+r)^n + měsíční vklad × ((1+r)^n − 1) / r
  const cilRokyPro = data.cilRoky > 0
    ? data.cilRoky
    : (data.cilVek > 0 && data.vek > 0 ? Math.max(0, data.cilVek - data.vek) : null);

  function fvTotal(mesicniVklad: number, stavMajetek: number, roky: number, rateAnnual: number) {
    const r = rateAnnual / 12;
    const n = roky * 12;
    const fvMajetek = stavMajetek * Math.pow(1 + r, n);
    const fvVklady = r === 0 ? mesicniVklad * n : mesicniVklad * ((Math.pow(1 + r, n) - 1) / r);
    return Math.round(fvMajetek + fvVklady);
  }

  const stavajiciMajetekPro = (data.uspory || 0) + (data.investice || 0);
  const projekce = cilRokyPro && (data.mesicniSporeni > 0 || stavajiciMajetekPro > 0)
    ? fvTotal(data.mesicniSporeni || 0, stavajiciMajetekPro, cilRokyPro, 0.05)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" fill="none">
              <rect width="32" height="32" rx="8" fill="hsl(221 83% 53%)" />
              <path d="M8 22 L12 16 L17 20 L22 10 L28 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="22" cy="10" r="2" fill="white"/>
            </svg>
            <div>
              <h1 className="text-base font-semibold">Výsledky analýzy</h1>
              <p className="text-xs text-muted-foreground">{data.jmeno}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation(`/?edit=${id}`)} className="gap-1.5" data-testid="button-edit">
              <Pencil className="w-3.5 h-3.5" /> Upravit údaje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="gap-1.5" data-testid="button-new-analysis">
              <RotateCcw className="w-3.5 h-3.5" /> Nová analýza
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Hero score card */}
        <Card className={`border-2 ${level === "excellent" ? "border-green-200" : level === "good" ? "border-blue-200" : level === "fair" ? "border-amber-200" : "border-red-200"}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreGauge score={totalScore} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <h2 className="text-xl font-bold">Finanční zdraví: {getScoreLabel(totalScore)}</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>{totalScore}/100</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Výsledek je vypočítán na základě čtyř klíčových oblastí vašich osobních financí.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Cash flow", score: data.skoreRodinneFinance ?? 0 },
                    { label: "Zadluženost", score: data.skoreZadluzenost ?? 0 },
                    { label: "Rezervy & Ochrana", score: data.skoreRezervyOchrana ?? 0 },
                    { label: "Spoření & Invest.", score: data.skoreSporeníInvestice ?? 0 },
                  ].map(({ label, score }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{score}/25</span>
                      </div>
                      <Progress value={(score / 25) * 100} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Měsíční příjmy",
              value: CzFormat(data.celkovePrijmy || 0),
              icon: TrendingUp,
              color: "text-green-600",
            },
            {
              label: "Měsíční výdaje",
              value: CzFormat(data.celkoveVydaje || 0),
              icon: TrendingDown,
              color: "text-amber-600",
            },
            {
              label: "Měsíční cash flow",
              value: CzFormat(data.mesicniCashflow || 0),
              icon: (data.mesicniCashflow || 0) >= 0 ? CheckCircle2 : AlertTriangle,
              color: (data.mesicniCashflow || 0) >= 0 ? "text-blue-600" : "text-red-600",
            },
            {
              label: "Čisté jmění",
              value: CzFormat((data.celkovyMajetek || 0) - (data.celkoveDluhy || 0)),
              icon: Info,
              color: ((data.celkovyMajetek || 0) - (data.celkoveDluhy || 0)) >= 0 ? "text-green-600" : "text-red-600",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-sm font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`w-4 h-4 ${color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Radar chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Přehled oblastí</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(214 32% 91%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Skóre" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Výdaje pie */}
          {vydajePie.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Struktura výdajů</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={vydajePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={false}>
                      {vydajePie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => CzFormat(Number(v))} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bilance bar chart */}
        {bilanceData.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Aktiva vs. Pasiva (bilance majetku)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bilanceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Math.abs(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => CzFormat(Math.abs(Number(v)))} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {bilanceData.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Doporučení a opatření</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                rec.type === "warning"
                  ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800"
                  : rec.type === "ok"
                  ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800"
              }`}>
                {rec.type === "warning" && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                {rec.type === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                {rec.type === "tip" && <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                <p className={`text-sm ${
                  rec.type === "warning" ? "text-red-700 dark:text-red-300"
                  : rec.type === "ok" ? "text-green-700 dark:text-green-300"
                  : "text-blue-700 dark:text-blue-300"
                }`}>{rec.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Goal summary */}
        <Card className="shadow-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-blue-200 mb-1">Váš finanční cíl</p>
                <h3 className="text-base font-bold mb-2">{cileLabels[data.hlavniCil] || data.hlavniCil}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 text-xs">Horizont:</span> {horizontDisplay}
                  </p>
                  {data.cilMesicniDuchod > 0 && (
                    <p className="text-sm text-blue-100">
                      <span className="text-blue-300 text-xs">Cílová částka:</span> <span className="font-semibold">{CzFormat(data.cilMesicniDuchod)}</span>/měs.
                    </p>
                  )}
                  {data.mesicniSporeni > 0 && (
                    <p className="text-sm text-blue-100">
                      <span className="text-blue-300 text-xs">Odkládáte:</span> <span className="font-semibold">{CzFormat(data.mesicniSporeni)}</span>/měs.
                    </p>
                  )}
                  {projekce && (
                    <p className="text-sm text-blue-100">
                      <span className="text-blue-300 text-xs">Nasporíš celkem (5% p.a.):</span>{" "}
                      <span className="font-bold text-white">{projekce >= 1000000 ? (projekce / 1000000).toFixed(1) + " mil. Kč" : Math.round(projekce / 1000) + "k Kč"}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Target className="w-7 h-7 text-blue-300 opacity-80" />
                <button
                  onClick={() => setLocation(`/?edit=${id}`)}
                  className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 transition-colors rounded px-2 py-1 text-white"
                  data-testid="button-edit-goal"
                >
                  <Pencil className="w-3 h-3" /> Upravit
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3 pb-8">
          <Button variant="outline" onClick={() => setLocation(`/?edit=${id}`)} className="gap-2" data-testid="button-edit-bottom">
            <Pencil className="w-4 h-4" /> Upravit údaje
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2" data-testid="button-new-bottom">
            <RotateCcw className="w-4 h-4" /> Nová analýza
          </Button>
        </div>
      </main>
    </div>
  );
}
