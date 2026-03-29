import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { EmpariaHeader, FormattedNumInput } from "@/components/emparia";
import { ChevronRight, ChevronLeft, CheckCircle2, User, TrendingUp, CreditCard, Shield, Target, Wallet } from "lucide-react";

const STEPS = [
  { id: 1, label: "Základní informace", icon: User },
  { id: 2, label: "Příjmy", icon: TrendingUp },
  { id: 3, label: "Výdaje", icon: Wallet },
  { id: 4, label: "Majetek & dluhy", icon: CreditCard },
  { id: 5, label: "Pojištění", icon: Shield },
  { id: 6, label: "Cíle", icon: Target },
];

const defaultForm = {
  jmeno: "",
  vek: "" as any,
  rodinnyStav: "",
  pocetDeti: 0,
  pracovniStatus: "",
  mesicniPrijem: "" as any,
  partnerPrijem: 0,
  ostatniPrijmy: 0,
  najem: "" as any,
  jidloNakupy: "" as any,
  doprava: "" as any,
  utraty: "" as any,
  pojisteni: 0,
  ostatniVydaje: 0,
  uspory: "" as any,
  investice: 0,
  nemovitosti: 0,
  hypotekaDluh: 0,
  spotrebitelskyUver: 0,
  kreditniKarty: 0,
  ostatniDluhy: 0,
  zivotniPojisteni: 0,
  nemocenskePoistenie: 0,
  majetkPoisteni: 0,
  nouzovyFond: "" as any,
  hlavniCil: "",
  casovyHorizont: "",
  cilVek: 0,
  cilRoky: 0,
  cilMesicniDuchod: 0,
  mesicniSporeni: "" as any,
};


export default function FormPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<typeof defaultForm>(defaultForm);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  // Parse ?edit=<id> from URL
  const editId = new URLSearchParams(search).get("edit");
  const isEditMode = !!editId;

  // Load existing data when in edit mode
  const { data: existingData } = useQuery({
    queryKey: ["/api/assessments", editId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/assessments/${editId}`);
      return res.json();
    },
    enabled: !!editId,
  });

  // Pre-fill form with existing data
  useEffect(() => {
    if (existingData) {
      setForm({
        jmeno: existingData.jmeno ?? "",
        vek: existingData.vek ?? "",
        rodinnyStav: existingData.rodinnyStav ?? "",
        pocetDeti: existingData.pocetDeti ?? 0,
        pracovniStatus: existingData.pracovniStatus ?? "",
        mesicniPrijem: existingData.mesicniPrijem ?? "",
        partnerPrijem: existingData.partnerPrijem ?? 0,
        ostatniPrijmy: existingData.ostatniPrijmy ?? 0,
        najem: existingData.najem ?? "",
        jidloNakupy: existingData.jidloNakupy ?? "",
        doprava: existingData.doprava ?? "",
        utraty: existingData.utraty ?? "",
        pojisteni: existingData.pojisteni ?? 0,
        ostatniVydaje: existingData.ostatniVydaje ?? 0,
        uspory: existingData.uspory ?? "",
        investice: existingData.investice ?? 0,
        nemovitosti: existingData.nemovitosti ?? 0,
        hypotekaDluh: existingData.hypotekaDluh ?? 0,
        spotrebitelskyUver: existingData.spotrebitelskyUver ?? 0,
        kreditniKarty: existingData.kreditniKarty ?? 0,
        ostatniDluhy: existingData.ostatniDluhy ?? 0,
        zivotniPojisteni: existingData.zivotniPojisteni ?? 0,
        nemocenskePoistenie: existingData.nemocenskePoistenie ?? 0,
        majetkPoisteni: existingData.majetkPoisteni ?? 0,
        nouzovyFond: existingData.nouzovyFond ?? "",
        hlavniCil: existingData.hlavniCil ?? "",
        casovyHorizont: existingData.casovyHorizont ?? "",
        cilVek: existingData.cilVek ?? 0,
        cilRoky: existingData.cilRoky ?? 0,
        cilMesicniDuchod: existingData.cilMesicniDuchod ?? 0,
        mesicniSporeni: existingData.mesicniSporeni ?? "",
      });
    }
  }, [existingData]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/assessments", data);
      return res.json();
    },
    onSuccess: (data) => setLocation(`/result/${data.id}`),
    onError: () => toast({ title: "Chyba", description: "Nepodařilo se uložit data.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/assessments/${editId}`, data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate cache so result page always fetches fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", editId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      setLocation(`/result/${editId}`);
    },
    onError: () => toast({ title: "Chyba", description: "Nepodařilo se aktualizovat data.", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const canNext = () => {
    if (step === 1) return form.jmeno.trim() !== "" && form.vek > 0 && form.rodinnyStav !== "" && form.pracovniStatus !== "";
    if (step === 2) return Number(form.mesicniPrijem) > 0;
    return true;
  };

  const buildPayload = () => ({
    ...form,
    vek: Number(form.vek),
    mesicniPrijem: Number(form.mesicniPrijem),
    najem: Number(form.najem) || 0,
    jidloNakupy: Number(form.jidloNakupy) || 0,
    doprava: Number(form.doprava) || 0,
    utraty: Number(form.utraty) || 0,
    uspory: Number(form.uspory) || 0,
    nouzovyFond: Number(form.nouzovyFond) || 0,
    mesicniSporeni: Number(form.mesicniSporeni) || 0,
    cilVek: Number(form.cilVek) || 0,
    cilRoky: Number(form.cilRoky) || 0,
    cilMesicniDuchod: Number(form.cilMesicniDuchod) || 0,
  });

  const handleSubmit = () => {
    const payload = buildPayload();
    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  // If editing, jump straight to step 6 on first load (most likely to be changed)
  // Actually let user navigate themselves – just show an edit banner

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#EAE2D9" }}>
      <EmpariaHeader
        subtitle={isEditMode ? "Úprava údajů" : "Analýza finančního plánu"}
        rightContent={isEditMode ? (
          <button onClick={() => setLocation(`/result/${editId}`)} className="text-xs text-muted-foreground hover:text-foreground underline">
            ← Zpět na výsledky
          </button>
        ) : undefined}
      />

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="border-b" style={{ backgroundColor: "#f5efe6", borderColor: "#C79549" }}>
          <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-2">
            <span className="text-xs" style={{ color: "#8a6520" }}>
              ✏️ Upravujete existující analýzu. Po dokončení se výsledky přepočítají.
            </span>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-border -z-0" />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const state = s.id < step ? "completed" : s.id === step ? "active" : "inactive";
              return (
                <div
                  key={s.id}
                  className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
                  onClick={() => isEditMode && setStep(s.id)}
                  title={isEditMode ? `Přejít na: ${s.label}` : undefined}
                >
                  <div className={`step-dot ${state}`}>
                    {state === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${state === "active" ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 sm:hidden">
            <p className="text-sm font-semibold text-primary text-center">Krok {step} / {STEPS.length}: {STEPS[step - 1].label}</p>
          </div>
          {isEditMode && (
            <p className="text-xs text-center text-muted-foreground mt-2">Klikněte na ikonu kroku pro rychlou navigaci</p>
          )}
        </div>

        {/* Step Cards */}
        <Card className="shadow-sm border-border/40 bg-white/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{STEPS[step - 1].label}</CardTitle>
            <CardDescription>{getStepDescription(step)}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && <Step1 form={form} set={set} />}
            {step === 2 && <Step2 form={form} set={set} />}
            {step === 3 && <Step3 form={form} set={set} />}
            {step === 4 && <Step4 form={form} set={set} />}
            {step === 5 && <Step5 form={form} set={set} />}
            {step === 6 && <Step6 form={form} set={set} />}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-2" data-testid="button-back">
              <ChevronLeft className="w-4 h-4" /> Zpět
            </Button>
          ) : <div />}

          {step < 6 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-2" style={{ backgroundColor: "#4f5d37", color: "white" }} data-testid="button-next">
              Pokračovat <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending || !canNext()}
              className="gap-2" style={{ backgroundColor: "#C79549", color: "white" }}
              data-testid="button-submit"
            >
              {isPending
                ? "Vyhodnocuji..."
                : isEditMode
                ? "Přepočítat výsledky"
                : "Zobrazit výsledky"}
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function getStepDescription(step: number) {
  const desc = [
    "Kdo jste? Základní údaje o vaší domácnosti.",
    "Jaké jsou vaše měsíční příjmy ze všech zdrojů?",
    "Co vás každý měsíc stojí? Zkuste odhadnout průměrné výdaje.",
    "Co vlastníte a co dlužíte? Přehled aktiv a pasiv.",
    "Jak jste chráněni před neočekávanými událostmi?",
    "Co chcete finančně dosáhnout? Definujte svůj hlavní cíl.",
  ];
  return desc[step - 1];
}

function Step1({ form, set }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="space-y-1.5">
        <Label>Jméno a příjmení</Label>
        <Input value={form.jmeno} onChange={e => set("jmeno", e.target.value)} placeholder="Jan Novák" data-testid="input-jmeno" />
      </div>
      <div className="space-y-1.5">
        <Label>Věk</Label>
        <Input type="number" min="18" max="99" value={form.vek || ""} onChange={e => set("vek", Number(e.target.value))} placeholder="35" data-testid="input-vek" />
      </div>
      <div className="space-y-1.5">
        <Label>Rodinný stav</Label>
        <Select value={form.rodinnyStav} onValueChange={v => set("rodinnyStav", v)}>
          <SelectTrigger><SelectValue placeholder="Vyberte..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="svobodny">Svobodný/á</SelectItem>
            <SelectItem value="v_paraku">V partnerství</SelectItem>
            <SelectItem value="zenaty">Ženatý/Vdaná</SelectItem>
            <SelectItem value="rozvedeny">Rozvedený/á</SelectItem>
            <SelectItem value="vdovec">Vdovec/Vdova</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Počet dětí v domácnosti</Label>
        <Input type="number" min="0" max="15" value={form.pocetDeti} onChange={e => set("pocetDeti", Number(e.target.value))} data-testid="input-deti" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Pracovní status</Label>
        <Select value={form.pracovniStatus} onValueChange={v => set("pracovniStatus", v)}>
          <SelectTrigger><SelectValue placeholder="Vyberte..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="zamestnanec">Zaměstnanec</SelectItem>
            <SelectItem value="osvc">OSVČ / Živnostník</SelectItem>
            <SelectItem value="podnikatel">Podnikatel (s.r.o. apod.)</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="duchod">Důchodce</SelectItem>
            <SelectItem value="nezamestnany">Nezaměstnaný/á</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Step2({ form, set }: any) {
  return (
    <div className="space-y-5">
      <FormattedNumInput label="Čistý měsíční příjem" value={form.mesicniPrijem} onChange={(v: any) => set("mesicniPrijem", v)} placeholder="50 000" hint="Váš příjem po zdanění (mzda, odměny, podnikání...)" />
      <FormattedNumInput label="Příjem partnera/partnerky" value={form.partnerPrijem} onChange={(v: any) => set("partnerPrijem", v)} hint="Pokud je relevantní, jinak nechte prázdné" />
      <FormattedNumInput label="Ostatní příjmy" value={form.ostatniPrijmy} onChange={(v: any) => set("ostatniPrijmy", v)} hint="Pronájem, dividendy, podpora, jiné pasivní příjmy" />
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          Celkové příjmy domácnosti:{" "}
          <span className="font-bold">
            {((Number(form.mesicniPrijem) || 0) + (Number(form.partnerPrijem) || 0) + (Number(form.ostatniPrijmy) || 0)).toLocaleString("cs-CZ")} Kč / měs.
          </span>
        </p>
      </div>
    </div>
  );
}

function Step3({ form, set }: any) {
  const total = [form.najem, form.jidloNakupy, form.doprava, form.utraty, form.pojisteni, form.ostatniVydaje]
    .reduce((s, v) => s + (Number(v) || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormattedNumInput label="Nájem / splátka hypotéky" value={form.najem} onChange={(v: any) => set("najem", v)} />
        <FormattedNumInput label="Jídlo & nákupy" value={form.jidloNakupy} onChange={(v: any) => set("jidloNakupy", v)} />
        <FormattedNumInput label="Doprava" value={form.doprava} onChange={(v: any) => set("doprava", v)} hint="MHD, auto, pohonné hmoty" />
        <FormattedNumInput label="Zábava & volný čas" value={form.utraty} onChange={(v: any) => set("utraty", v)} hint="Restaurace, koníčky, výlety" />
        <FormattedNumInput label="Pojistné" value={form.pojisteni} onChange={(v: any) => set("pojisteni", v)} hint="Všechny pojistky celkem" />
        <FormattedNumInput label="Ostatní výdaje" value={form.ostatniVydaje} onChange={(v: any) => set("ostatniVydaje", v)} hint="Zdraví, oblečení, vzdělání..." />
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
          Celkové výdaje: <span className="font-bold">{total.toLocaleString("cs-CZ")} Kč / měs.</span>
        </p>
      </div>
    </div>
  );
}

function Step4({ form, set }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Aktiva (co vlastníte)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormattedNumInput label="Úspory a hotovost" value={form.uspory} onChange={(v: any) => set("uspory", v)} hint="Běžné a spořicí účty" />
          <FormattedNumInput label="Investice" value={form.investice} onChange={(v: any) => set("investice", v)} hint="Akcie, fondy, krypto, penzijko" />
          <FormattedNumInput label="Nemovitosti" value={form.nemovitosti} onChange={(v: any) => set("nemovitosti", v)} hint="Odhadní hodnota vlastněných nemovitostí" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Pasiva (co dlužíte)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormattedNumInput label="Zbývající hypotéka" value={form.hypotekaDluh} onChange={(v: any) => set("hypotekaDluh", v)} />
          <FormattedNumInput label="Spotřebitelský úvěr" value={form.spotrebitelskyUver} onChange={(v: any) => set("spotrebitelskyUver", v)} />
          <FormattedNumInput label="Kreditní karty" value={form.kreditniKarty} onChange={(v: any) => set("kreditniKarty", v)} />
          <FormattedNumInput label="Ostatní dluhy" value={form.ostatniDluhy} onChange={(v: any) => set("ostatniDluhy", v)} />
        </div>
      </div>
    </div>
  );
}

function Step5({ form, set }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Jaká pojištění aktuálně máte?</Label>
        <div className="space-y-3">
          {[
            { key: "zivotniPojisteni", label: "Životní pojištění" },
            { key: "nemocenskePoistenie", label: "Pojištění pracovní neschopnosti / invalidity" },
            { key: "majetkPoisteni", label: "Majetkové pojištění (domov, auto)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <Checkbox
                id={key}
                checked={!!(form as any)[key]}
                onCheckedChange={v => set(key, v ? 1 : 0)}
                data-testid={`checkbox-${key}`}
              />
              <label htmlFor={key} className="text-sm cursor-pointer flex-1">{label}</label>
            </div>
          ))}
        </div>
      </div>
      <NumInput
        label="Výše nouzového fondu (finanční rezerva)"
        value={form.nouzovyFond}
        onChange={(v: any) => set("nouzovyFond", v)}
        hint="Kolik máte aktuálně odloženo jako nouzová rezerva na neočekávané výdaje?"
      />
    </div>
  );
}

// Pomocná funkce: počet slov pro roky
function rokySlovnik(n: number) {
  if (n === 1) return "rok";
  if (n < 5) return "roky";
  return "let";
}

// Výpočet potřebného kapitalu pro důchod (pravidlo 4% / 25x)
// Vstup: cílová měsíční částka v reálných dnešních Kč, inflace 2%, horizont v letech
function spoctiDuchoduKapital(mesicniDnesnKc: number, rokDoho: number) {
  // Hodnota v budoucních Kč (inflace 2%)
  const budouciMesicni = mesicniDnesnKc * Math.pow(1.02, rokDoho);
  // Pravidlo 4% – potřebuju 25x roční spotřebu
  return budouciMesicni * 12 * 25;
}

// Potřebná měsíční úložka pro dosažení cílkové částky při daném výnému a horizontu
function spoctiUlozku(cilKapital: number, stavajiciMajetek: number, rokDoho: number, vynos: number) {
  const zbyvaCilovat = Math.max(0, cilKapital - stavajiciMajetek * Math.pow(1 + vynos / 12, rokDoho * 12));
  if (rokDoho <= 0) return 0;
  const mesice = rokDoho * 12;
  const r = vynos / 12;
  if (r === 0) return zbyvaCilovat / mesice;
  return zbyvaCilovat / ((Math.pow(1 + r, mesice) - 1) / r);
}

function Step6({ form, set }: any) {
  const vek = Number(form.vek) || 0;
  const horizont = form.casovyHorizont;
  const mesicniPrijem = Number(form.mesicniPrijem) || 0;

  // Compute years remaining from cilVek
  const rokDoVeku = form.cilVek > 0 && vek > 0 ? Math.max(0, form.cilVek - vek) : null;
  const mesicniSporeniNum = Number(form.mesicniSporeni) || 0;
  const cilRokyNum: number | null = form.cilRoky > 0 ? form.cilRoky : (rokDoVeku !== null ? rokDoVeku : null);

  // Automatický návrh cílové důchodové částky: 70% čistého příjmu
  const navrhDuchod = Math.round((mesicniPrijem * 0.7) / 1000) * 1000;
  const cilMesicniDuchod = Number(form.cilMesicniDuchod) || 0;

  // Stávající majetek (úspořy + investice) pro odpocet
  const stavajiciMajetek = (Number(form.uspory) || 0) + (Number(form.investice) || 0);

  // Výpočet potřebného kapitálu a měsíční úložky
  const cilKapital = cilMesicniDuchod > 0 && cilRokyNum
    ? spoctiDuchoduKapital(cilMesicniDuchod, cilRokyNum)
    : null;
  const doporUlozka5 = cilKapital && cilRokyNum
    ? spoctiUlozku(cilKapital, stavajiciMajetek, cilRokyNum, 0.05)
    : null;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Hlavní finanční cíl</Label>
        <Select value={form.hlavniCil} onValueChange={v => set("hlavniCil", v)}>
          <SelectTrigger data-testid="select-cil"><SelectValue placeholder="Vyberte cíl..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sporeni_na_duchod">Spoření na důchod</SelectItem>
            <SelectItem value="koupeni_nemovitosti">Koupě nemovitosti</SelectItem>
            <SelectItem value="splaceni_dluhu">Splacení dluhů</SelectItem>
            <SelectItem value="tvorba_rezervy">Vybudování finanční rezervy</SelectItem>
            <SelectItem value="investovani">Investování a zhodnocení majetku</SelectItem>
            <SelectItem value="vzdelani_deti">Vzdělání dětí</SelectItem>
            <SelectItem value="financni_nezavislost">Finanční nezávislost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Časový horizont */}
      <div className="space-y-3">
        <Label>Časový horizont cíle</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: "kratky", label: "Do 3 let", sub: "krátkodobý" },
            { value: "stredni", label: "3–10 let", sub: "střednědobý" },
            { value: "dlouhy", label: "10+ let", sub: "dlouhodobý" },
            { value: "vlastni", label: "Vlastní", sub: "věk / roky" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { set("casovyHorizont", opt.value); if (opt.value !== "vlastni") { set("cilVek", 0); set("cilRoky", 0); } }}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                horizont === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 text-foreground"
              }`}
              data-testid={`horizont-${opt.value}`}
            >
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.sub}</div>
            </button>
          ))}
        </div>

        {/* Vlastní horizont – věk nebo počet let */}
        {horizont === "vlastni" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800 space-y-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Zadejte cílový věk nebo počet let (nebo obojí):</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Cílový věk</Label>
                <p className="text-xs text-muted-foreground">Dokdy chcete cíl splnit?</p>
                <div className="relative">
                  <Input
                    type="number"
                    min={vek + 1}
                    max="99"
                    value={form.cilVek || ""}
                    onChange={e => {
                      const v = Number(e.target.value) || 0;
                      set("cilVek", v);
                      if (v > 0 && vek > 0) set("cilRoky", Math.max(0, v - vek));
                    }}
                    placeholder={vek > 0 ? String(vek + 10) : "55"}
                    className="pr-10"
                    data-testid="input-cilVek"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">let</span>
                </div>
                {rokDoVeku !== null && rokDoVeku > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">= {rokDoVeku} {rokDoVeku === 1 ? "rok" : rokDoVeku < 5 ? "roky" : "let"} od teď</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Počet let</Label>
                <p className="text-xs text-muted-foreground">Za kolik let chcete cíl splnit?</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="80"
                    value={form.cilRoky || ""}
                    onChange={e => {
                      const r = Number(e.target.value) || 0;
                      set("cilRoky", r);
                      if (r > 0 && vek > 0) set("cilVek", vek + r);
                    }}
                    placeholder="10"
                    className="pr-10"
                    data-testid="input-cilRoky"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">let</span>
                </div>
                {form.cilRoky > 0 && vek > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">= ve věku {vek + form.cilRoky} let</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kalkulace důchodové cílové částky – zobrazit vždy pro sporení na důchod + financní nezávislost, nebo obecně */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Cílová měsíční částka po dosažení cíle</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Kolik Kč měsíčně (v dnešních cenách) chcete mít k dispozici?</p>
          </div>
          {navrhDuchod > 0 && cilMesicniDuchod === 0 && (
            <button
              type="button"
              onClick={() => set("cilMesicniDuchod", navrhDuchod)}
              className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors whitespace-nowrap"
            >
              Navrhnout: {navrhDuchod.toLocaleString("cs-CZ")} Kč
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            type="number"
            min="0"
            value={cilMesicniDuchod || ""}
            onChange={e => set("cilMesicniDuchod", Number(e.target.value) || 0)}
            placeholder={navrhDuchod > 0 ? String(navrhDuchod) : "50 000"}
            className="pr-10"
            data-testid="input-cilDuchod"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kč</span>
        </div>
        {cilMesicniDuchod > 0 && navrhDuchod > 0 && (
          <p className="text-xs text-muted-foreground">
            Doporučené: <span className="font-medium">{navrhDuchod.toLocaleString("cs-CZ")} Kč</span> (70% vašeho příjmu)
            {cilMesicniDuchod !== navrhDuchod && (
              <button type="button" onClick={() => set("cilMesicniDuchod", navrhDuchod)} className="ml-2 text-primary underline">
                Použít doporučení
              </button>
            )}
          </p>
        )}

        {/* Výpočet potřebného kapitálu */}
        {cilMesicniDuchod > 0 && cilRokyNum && cilRokyNum > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Finanční projekce</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cílová částka dnes</p>
                <p className="font-semibold">{cilMesicniDuchod.toLocaleString("cs-CZ")} Kč/měs.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Za {cilRokyNum} {rokySlovnik(cilRokyNum)} (inflace 2%)</p>
                <p className="font-semibold text-amber-600">
                  {Math.round(cilMesicniDuchod * Math.pow(1.02, cilRokyNum)).toLocaleString("cs-CZ")} Kč/měs.
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Potřebný kapitál (pravidlo 4%)</p>
                <p className="font-bold text-blue-700 dark:text-blue-400">
                  {Math.round((cilKapital || 0) / 1000).toLocaleString("cs-CZ")}k Kč
                </p>
              </div>
              {stavajiciMajetek > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Odpočet úspoř + investic</p>
                  <p className="font-semibold text-green-600">
                    − {Math.round(stavajiciMajetek * Math.pow(1 + 0.05 / 12, cilRokyNum * 12) / 1000).toLocaleString("cs-CZ")}k Kč
                  </p>
                </div>
              )}
            </div>
            {doporUlozka5 !== null && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted-foreground mb-1">Doporučená měsíční úložka při výnosu <strong>5% p.a.</strong></p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Konzervativně (3%)", rate: 0.03 },
                    { label: "Výnosně (5%)", rate: 0.05 },
                    { label: "Agresivně (7%)", rate: 0.07 },
                  ].map(({ label, rate }) => {
                    const ulozka = spoctiUlozku(cilKapital!, stavajiciMajetek, cilRokyNum!, rate);
                    const jeDoporucena = rate === 0.05;
                    return (
                      <div
                        key={label}
                        className={`rounded p-2 text-center cursor-pointer transition-colors ${
                          jeDoporucena
                            ? "bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-600"
                            : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                        }`}
                        onClick={() => set("mesicniSporeni", Math.round(ulozka / 100) * 100)}
                        title="Klikněte pro použití této hodnoty"
                      >
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-sm font-bold ${jeDoporucena ? "text-blue-700 dark:text-blue-300" : ""}`}>
                          {Math.round(ulozka / 100) * 100 > 0
                            ? (Math.round(ulozka / 100) * 100).toLocaleString("cs-CZ") + " Kč"
                            : "Již dosahujete cíle"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Kliknutím na hodnotu ji použijete jako své měsíční spoření</p>
              </div>
            )}
          </div>
        )}
      </div>

      <NumInput
        label="Kolik měsíčně odkládáte / chcete odkládat"
        value={form.mesicniSporeni}
        onChange={(v: any) => set("mesicniSporeni", v)}
        hint="Aktuální nebo plánovaná částka pro spoření / investice každý měsíc"
      />

      {/* Orientační výpočet naspoření – zahrnuje stávající majetek i nové vklady */}
      {(mesicniSporeniNum > 0 || stavajiciMajetek > 0) && cilRokyNum !== null && cilRokyNum > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-2">
            Celková nasporená částka za {cilRokyNum} {rokySlovnik(cilRokyNum)}
            {stavajiciMajetek > 0 && <span className="font-normal"> (vč. úspor a investic)</span>}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Bez výnosu", rate: 0 },
              { label: "Při 5% p.a.", rate: 0.05 },
              { label: "Při 7% p.a.", rate: 0.07 },
            ].map(({ label, rate }) => {
              const n = cilRokyNum * 12;
              const r = rate / 12;
              // FV = stávající majetek × (1+r)^n + měsíční vklady × ((1+r)^n − 1) / r
              const fvMajetek = stavajiciMajetek * Math.pow(1 + r, n);
              const fvVklady = r === 0 ? mesicniSporeniNum * n : mesicniSporeniNum * ((Math.pow(1 + r, n) - 1) / r);
              const total = fvMajetek + fvVklady;
              const jeDoporucena = rate === 0.05;
              return (
                <div key={label} className={`text-center rounded p-2 ${jeDoporucena ? "bg-green-100 dark:bg-green-800/40 ring-1 ring-green-300 dark:ring-green-600" : ""}`}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    {total >= 1000000
                      ? (total / 1000000).toFixed(1) + " mil."
                      : Math.round(total / 1000) + "k"} Kč
                  </p>
                </div>
              );
            })}
          </div>
          {stavajiciMajetek > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Stávající majetek: <span className="font-medium">{stavajiciMajetek.toLocaleString("cs-CZ")} Kč</span>
              {mesicniSporeniNum > 0 && <> + nové vklady: <span className="font-medium">{mesicniSporeniNum.toLocaleString("cs-CZ")} Kč/měs.</span></>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
