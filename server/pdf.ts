/**
 * Emparia Finance – PDF report generator (Node.js / PDFKit)
 */
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { Response } from "express";

// ── Emparia colours ─────────────────────────────────────────
const OLIVE    = "#4f5d37";
const OLIVE2   = "#3d4a2a";
const GOLD     = "#C79549";
const CREAM    = "#F5F0E8";
const CREAM_LT = "#FAF8F5";
const BORDER   = "#E0D8CC";
const TEXT     = "#28251D";
const MUTED    = "#6b6550";
const OK_C     = "#2f6b24";
const OK_BG    = "#edf7ea";
const WARN_C   = "#b83232";
const WARN_BG  = "#fdeaea";
const TIP_C    = "#9a6b0e";
const TIP_BG   = "#fdf3e0";
const WHITE    = "#ffffff";

// ── Formatting ───────────────────────────────────────────────
function czf(n: number): string {
  return Math.round(n).toLocaleString("cs-CZ") + " Kč";
}
function czfs(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mil. Kč";
  return czf(n);
}
function pct(n: number, total: number): string {
  if (!total) return "0 %";
  return Math.round((n / total) * 100) + " %";
}

// ── Font paths ────────────────────────────────────────────────
const FONT_R    = path.resolve(process.cwd(), "attached_assets", "NotoSans-Regular.ttf");
const FONT_B    = path.resolve(process.cwd(), "attached_assets", "NotoSans-Bold.ttf");
const LOGO_PATH = path.resolve(process.cwd(), "attached_assets", "emparia_logo.jpg");

// ── Main generator ───────────────────────────────────────────
export function generatePDF(data: any, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 0, info: {
    Title: `Analýza osobních financí – ${data.jmeno}`,
    Author: "Emparia Finance",
  }});

  // Register Noto Sans fonts (full Czech/diacritics support)
  doc.registerFont("NS",  FONT_R);
  doc.registerFont("NSB", FONT_B);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="emparia-analyza-${data.jmeno?.replace(/\s+/g, "-") || "klient"}.pdf"`);
  doc.pipe(res);

  const PW  = doc.page.width;
  const PH  = doc.page.height;
  const MG  = 51; // ~18mm
  const CW  = PW - 2 * MG;
  const Q   = CW / 4;

  // ── Computed values ────────────────────────────────────────
  const celkP  = (data.mesicniPrijem || 0) + (data.partnerPrijem || 0) + (data.ostatniPrijmy || 0);
  const celkV  = (data.najem || 0) + (data.jidloNakupy || 0) + (data.doprava || 0) +
                 (data.utraty || 0) + (data.pojisteni || 0) + (data.ostatniVydaje || 0);
  const cf     = celkP - celkV;
  const aktiva = (data.uspory || 0) + (data.investice || 0) + (data.nemovitosti || 0);
  const pasiva = (data.hypotekaDluh || 0) + (data.spotrebitelskyUver || 0) +
                 (data.kreditniKarty || 0) + (data.ostatniDluhy || 0);
  const ciste  = aktiva - pasiva;

  const cilRoky = data.cilRoky > 0 ? data.cilRoky
    : (data.cilVek > 0 && data.vek > 0 ? Math.max(0, data.cilVek - data.vek) : 0);
  const cilDuchod = data.cilMesicniDuchod || 0;
  let dopulozka = 0;
  let proj5 = 0;
  let cilKapital = 0;
  if (cilRoky > 0 && cilDuchod > 0) {
    const r = 0.05 / 12;
    const n = cilRoky * 12;
    const bud = cilDuchod * Math.pow(1.02, cilRoky);
    cilKapital = bud * 12 * 25;
    const stavMaj = ((data.uspory || 0) + (data.investice || 0)) * Math.pow(1 + r, n);
    const zbyva = Math.max(0, cilKapital - stavMaj);
    dopulozka = zbyva / ((Math.pow(1 + r, n) - 1) / r);
    proj5 = stavMaj + (data.mesicniSporeni || 0) * ((Math.pow(1 + r, n) - 1) / r);
  }

  const sc    = data.skoreFinancniZdrav || 0;
  const scCF  = data.skoreRodinneFinance || 0;
  const scDL  = data.skoreZadluzenost || 0;
  const scRZ  = data.skoreRezervyOchrana || 0;
  const scSP  = data.skoreSporeníInvestice || 0;
  const scLbl = sc >= 80 ? "Výborný" : sc >= 60 ? "Dobrý" : sc >= 40 ? "Průměrný" : "Rizikový";
  const datum = new Date().toLocaleDateString("cs-CZ");

  // ─────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────
  function hrule(y: number, clr = BORDER, lw = 0.5) {
    doc.save().strokeColor(clr).lineWidth(lw).moveTo(MG, y).lineTo(PW - MG, y).stroke().restore();
  }

  function rect(x: number, y: number, w: number, h: number, fill: string, radius = 3) {
    doc.save().roundedRect(x, y, w, h, radius).fillColor(fill).fill().restore();
  }

  function sectionHeader(y: number, label: string, bg = OLIVE): number {
    rect(MG, y, CW, 18, bg, 3);
    doc.save().font("NSB").fontSize(9).fillColor(WHITE)
       .text(label, MG + 9, y + 5, { width: CW - 18 }).restore();
    return y + 22;
  }

  function scoreBar(x: number, y: number, w: number, label: string, v: number, mx: number) {
    const labelW = 80;
    const numW = 28;
    const barW = w - labelW - numW - 6;
    const barX = x + labelW + 2;
    doc.save()
       .font("NS").fontSize(7.5).fillColor(MUTED)
       .text(label, x, y + 1, { width: labelW, lineBreak: false });
    // bg
    doc.roundedRect(barX, y, barW, 9, 2).fillColor(BORDER).fill();
    // fill
    if (v > 0) {
      doc.roundedRect(barX, y, barW * Math.min(v / mx, 1), 9, 2).fillColor(OLIVE).fill();
    }
    // value
    doc.font("NSB").fontSize(7.5).fillColor(TEXT)
       .text(`${v}/${mx}`, barX + barW + 3, y + 1, { width: numW, lineBreak: false });
    doc.restore();
  }

  function kpiBox(x: number, y: number, w: number, h: number, label: string, val: string,
                  bg = CREAM_LT, valColor = TEXT) {
    rect(x, y, w, h, bg, 3);
    doc.save().strokeColor(BORDER).lineWidth(0.4)
       .roundedRect(x, y, w, h, 3).stroke().restore();
    doc.save().font("NS").fontSize(7).fillColor(MUTED)
       .text(label, x + 6, y + 6, { width: w - 12 }).restore();
    doc.save().font("NSB").fontSize(9).fillColor(valColor)
       .text(val, x + 6, y + 19, { width: w - 12 }).restore();
  }

  function dataRow(x: number, y: number, w: number, label: string, val: string, odd: boolean) {
    if (odd) rect(x, y, w, 15, CREAM_LT, 0);
    doc.save().font("NS").fontSize(7.5).fillColor(MUTED)
       .text(label, x + 6, y + 3, { width: w * 0.54 }).restore();
    doc.save().font("NSB").fontSize(8).fillColor(TEXT)
       .text(val, x + w * 0.56, y + 3, { width: w * 0.4, align: "right" }).restore();
  }

  function recRow(x: number, y: number, w: number, text: string,
                  type: "ok" | "warn" | "tip"): number {
    const bg   = type === "ok" ? OK_BG : type === "warn" ? WARN_BG : TIP_BG;
    const clr  = type === "ok" ? OK_C  : type === "warn" ? WARN_C  : TIP_C;
    const icon = type === "ok" ? "OK"  : type === "warn" ? "!"     : ">>";
    // Measure text height
    const th = doc.heightOfString(text, { width: w - 26, fontSize: 8 });
    const h  = th + 12;
    rect(x, y, w, h, bg, 2);
    doc.save().font("NSB").fontSize(8).fillColor(clr)
       .text(icon, x + 6, y + 6, { width: 16 }).restore();
    doc.save().font("NS").fontSize(8).fillColor(clr)
       .text(text, x + 24, y + 6, { width: w - 30 }).restore();
    // Bottom border line
    doc.save().strokeColor(BORDER).lineWidth(0.3)
       .moveTo(x, y + h).lineTo(x + w, y + h).stroke().restore();
    return y + h;
  }

  // ─────────────────────────────────────────────────────────
  // PAGE 1
  // ─────────────────────────────────────────────────────────
  let y = 0;

  // Header strip
  rect(0, 0, PW, 42, WHITE, 0);
  // Logo
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MG, 8, { height: 26 });
  } else {
    doc.save().font("NSB").fontSize(14).fillColor(OLIVE)
       .text("emparia", MG, 13).restore();
  }
  doc.save().font("NS").fontSize(7.5).fillColor(MUTED)
     .text(`Analýza ze dne ${datum}`, 0, 17, { align: "right", width: PW - MG }).restore();
  hrule(40, BORDER, 0.5);
  y = 52;

  // Title
  doc.save().font("NSB").fontSize(18).fillColor(OLIVE)
     .text("Analýza osobních financí", MG, y).restore();
  y += 24;
  doc.save().font("NS").fontSize(8.5).fillColor(MUTED)
     .text(`${data.jmeno}  ·  věk ${data.vek} let  ·  ${data.rodinnyStav === "zenaty" ? "Ženatý/á" : data.rodinnyStav}  ·  ${data.pracovniStatus === "zamestnanec" ? "Zaměstnanec" : data.pracovniStatus}`, MG, y).restore();
  y += 10;
  hrule(y, BORDER, 0.5);
  y += 8;

  // ── Score block ──────────────────────────────────────────
  const sbH = 72;
  rect(MG, y, CW, sbH, CREAM_LT, 4);
  doc.save().strokeColor(BORDER).lineWidth(0.5).roundedRect(MG, y, CW, sbH, 4).stroke().restore();

  // Score number
  doc.save().font("NSB").fontSize(28).fillColor(OLIVE)
     .text(String(sc), MG + 4, y + 7, { width: 78, align: "center" }).restore();
  doc.save().font("NSB").fontSize(7.5).fillColor(MUTED)
     .text(`Zdraví: ${scLbl}`, MG + 4, y + 42, { width: 78, align: "center" }).restore();
  doc.save().font("NS").fontSize(7).fillColor(MUTED)
     .text("z 100 bodů", MG + 4, y + 54, { width: 78, align: "center" }).restore();

  // Score bars
  const bx = MG + 86;
  const bw = CW - 90;
  scoreBar(bx, y + 8,  bw, "Cash flow",          scCF, 25);
  scoreBar(bx, y + 23, bw, "Zadluženost",         scDL, 25);
  scoreBar(bx, y + 38, bw, "Rezervy & ochrana",   scRZ, 25);
  scoreBar(bx, y + 53, bw, "Spoření & investice", scSP, 25);
  y += sbH + 8;

  // ── KPI cards ─────────────────────────────────────────────
  const kpiW = (CW - 9) / 4;
  const kpiH = 34;
  kpiBox(MG,               y, kpiW, kpiH, "Měsíční příjmy",   czf(celkP));
  kpiBox(MG + kpiW + 3,    y, kpiW, kpiH, "Měsíční výdaje",   czf(celkV), "#fffaf4");
  kpiBox(MG + (kpiW + 3)*2, y, kpiW, kpiH, "Cash flow / měs.", czf(cf), "#f0f7ee", cf >= 0 ? OK_C : WARN_C);
  kpiBox(MG + (kpiW + 3)*3, y, kpiW, kpiH, "Čisté jmění",     czfs(ciste));
  y += kpiH + 8;

  // ── Vstupní data ──────────────────────────────────────────
  y = sectionHeader(y, "Vstupní data");

  const colW = (CW - 6) / 2;
  // Headers
  doc.save().font("NSB").fontSize(9).fillColor(OLIVE)
     .text("Příjmy", MG, y).restore();
  doc.save().font("NSB").fontSize(9).fillColor(OLIVE)
     .text("Výdaje", MG + colW + 6, y).restore();
  y += 14;

  const pr = [
    ["Čistý příjem",    czf(data.mesicniPrijem || 0)],
    ["Příjem partnera", czf(data.partnerPrijem || 0)],
    ["Ostatní příjmy",  czf(data.ostatniPrijmy || 0)],
    ["Celkem příjmy",   czf(celkP)],
  ];
  const vd = [
    ["Nájem / hypotéka", czf(data.najem || 0)],
    ["Jídlo & nákupy",   czf(data.jidloNakupy || 0)],
    ["Doprava",          czf(data.doprava || 0)],
    ["Zábava & volný čas",czf(data.utraty || 0)],
    ["Pojistné",         czf(data.pojisteni || 0)],
    ["Ostatní výdaje",   czf(data.ostatniVydaje || 0)],
    ["Celkem výdaje",    czf(celkV)],
  ];

  const maxRows = Math.max(pr.length, vd.length);
  for (let i = 0; i < maxRows; i++) {
    const rowH = 15;
    const isLast = i === maxRows - 1;
    if (pr[i]) {
      if (isLast || i === pr.length - 1) {
        rect(MG, y, colW, rowH, CREAM, 0);
        doc.save().font("NSB").fontSize(7.5).fillColor(TEXT)
           .text(pr[i][0], MG + 6, y + 3, { width: colW * 0.54 }).restore();
        doc.save().font("NSB").fontSize(8).fillColor(TEXT)
           .text(pr[i][1], MG + colW * 0.56, y + 3, { width: colW * 0.4, align: "right" }).restore();
      } else {
        dataRow(MG, y, colW, pr[i][0], pr[i][1], i % 2 === 0);
      }
    }
    if (vd[i]) {
      const isVdLast = i === vd.length - 1;
      if (isVdLast) {
        rect(MG + colW + 6, y, colW, rowH, CREAM, 0);
        doc.save().font("NSB").fontSize(7.5).fillColor(TEXT)
           .text(vd[i][0], MG + colW + 12, y + 3, { width: colW * 0.54 }).restore();
        doc.save().font("NSB").fontSize(8).fillColor(TEXT)
           .text(vd[i][1], MG + colW + 6 + colW * 0.56, y + 3, { width: colW * 0.4, align: "right" }).restore();
      } else {
        dataRow(MG + colW + 6, y, colW, vd[i][0], vd[i][1], i % 2 === 0);
      }
    }
    y += rowH;
  }
  // underline totals
  hrule(y, OLIVE, 0.5);
  y += 8;

  // ── Majetek a dluhy ───────────────────────────────────────
  y = sectionHeader(y, "Majetek a dluhy", OLIVE2);

  doc.save().font("NSB").fontSize(9).fillColor(OLIVE)
     .text("Aktiva", MG, y).text("Pasiva", MG + colW + 6, y).restore();
  y += 14;

  const ak = [
    ["Úspory a hotovost",    czf(data.uspory || 0)],
    ["Investice / penzijko", czf(data.investice || 0)],
    ["Nemovitosti",          czf(data.nemovitosti || 0)],
    ["Aktiva celkem",        czf(aktiva)],
  ];
  const pa = [
    ["Hypotéka",         czf(data.hypotekaDluh || 0)],
    ["Spotřeb. úvěry",   czf((data.spotrebitelskyUver || 0) + (data.ostatniDluhy || 0))],
    ["Kreditní karty",   czf(data.kreditniKarty || 0)],
    ["Pasiva celkem",    czf(pasiva)],
  ];

  for (let i = 0; i < 4; i++) {
    const rowH = 15;
    const isLast = i === 3;
    if (isLast) {
      rect(MG, y, colW, rowH, CREAM, 0);
      rect(MG + colW + 6, y, colW, rowH, CREAM, 0);
      doc.save().font("NSB").fontSize(7.5).fillColor(TEXT)
         .text(ak[i][0], MG + 6, y + 3, { width: colW * 0.54 })
         .text(pa[i][0], MG + colW + 12, y + 3, { width: colW * 0.54 }).restore();
      doc.save().font("NSB").fontSize(8).fillColor(TEXT)
         .text(ak[i][1], MG + colW * 0.56, y + 3, { width: colW * 0.4, align: "right" })
         .text(pa[i][1], MG + colW + 6 + colW * 0.56, y + 3, { width: colW * 0.4, align: "right" }).restore();
    } else {
      dataRow(MG, y, colW, ak[i][0], ak[i][1], i % 2 === 0);
      dataRow(MG + colW + 6, y, colW, pa[i][0], pa[i][1], i % 2 === 0);
    }
    y += rowH;
  }
  hrule(y, OLIVE, 0.5);
  y += 6;

  // Pojistění řádek
  rect(MG, y, CW, 30, CREAM_LT, 3);
  doc.save().strokeColor(BORDER).lineWidth(0.4)
     .roundedRect(MG, y, CW, 30, 3).stroke().restore();
  const pojItems = [
    ["Životní pojištění",    data.zivotniPojisteni ? "Ano" : "Nemá"],
    ["Poj. neschopnosti",    data.nemocenskePoistenie ? "Ano" : "Nemá"],
    ["Majetkové pojištění",  data.majetkPoisteni ? "Ano" : "Nemá"],
    ["Nouzový fond",         czf(data.nouzovyFond || 0)],
  ];
  const pojW = CW / 4;
  pojItems.forEach(([label, val], i) => {
    const px = MG + i * pojW;
    doc.save().font("NS").fontSize(7).fillColor(MUTED)
       .text(label, px + 6, y + 6, { width: pojW - 8 }).restore();
    doc.save().font("NSB").fontSize(8.5).fillColor(TEXT)
       .text(val, px + 6, y + 17, { width: pojW - 8 }).restore();
    if (i < 3) hrule(0, BORDER, 0); // vertical lines
  });
  y += 36;

  // ── Finanční cíle ──────────────────────────────────────────
  y = sectionHeader(y, "Finanční cíle a projekce", GOLD);

  const cilLabels: Record<string, string> = {
    sporeni_na_duchod: "Spoření na důchod",
    koupeni_nemovitosti: "Koupě nemovitosti",
    splaceni_dluhu: "Splacení dluhů",
    tvorba_rezervy: "Finanční rezerva",
    investovani: "Investování",
    vzdelani_deti: "Vzdělání dětí",
    financni_nezavislost: "Finanční nezávislost",
  };

  const cilRows = [
    ["Hlavní cíl",               cilLabels[data.hlavniCil] || data.hlavniCil || "-",
     "Cílový věk",               data.cilVek > 0 ? `${data.cilVek} let` : "-"],
    ["Cílová měsíční částka",    cilDuchod > 0 ? czf(cilDuchod) : "-",
     "Časový horizont",          cilRoky > 0 ? `${cilRoky} let` : "-"],
    ["Aktuální měsíční úložka",  czf(data.mesicniSporeni || 0),
     "Doporučená úložka (5% p.a.)", dopulozka > 0 ? czf(Math.round(dopulozka / 100) * 100) : "-"],
    ["Potřebný kapitál celkem",  cilKapital > 0 ? czfs(cilKapital) : "-",
     "Projekce při 5% p.a.",     proj5 > 0 ? czfs(proj5) : "-"],
  ];

  for (let i = 0; i < cilRows.length; i++) {
    const [l1, v1, l2, v2] = cilRows[i];
    const bg = i % 2 === 1 ? CREAM_LT : WHITE;
    rect(MG, y, CW, 16, bg, 0);
    doc.save().font("NS").fontSize(7.5).fillColor(MUTED)
       .text(l1, MG + 6, y + 4, { width: Q * 1.2 }).restore();
    doc.save().font("NSB").fontSize(8.5).fillColor(TEXT)
       .text(v1, MG + Q * 1.2 + 6, y + 3, { width: Q * 0.8 }).restore();
    doc.save().font("NS").fontSize(7.5).fillColor(MUTED)
       .text(l2, MG + Q * 2 + 6, y + 4, { width: Q * 1.2 }).restore();
    doc.save().font("NSB").fontSize(8.5).fillColor(TEXT)
       .text(v2, MG + Q * 3.2 + 6, y + 3, { width: Q * 0.8 }).restore();
    if (i < cilRows.length - 1) hrule(y + 16, BORDER, 0.3);
    y += 16;
  }
  doc.save().strokeColor(BORDER).lineWidth(0.5)
     .rect(MG, y - 64, CW, 64).stroke().restore();
  y += 8;

  // ── Doporučení ─────────────────────────────────────────────
  // Check if we need a new page
  if (y > PH - 160) {
    doc.addPage();
    rect(0, 0, PW, 42, WHITE, 0);
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, MG, 8, { height: 26 });
    }
    doc.save().font("NS").fontSize(7.5).fillColor(MUTED)
       .text(`Analýza ze dne ${datum}`, 0, 17, { align: "right", width: PW - MG }).restore();
    hrule(40, BORDER, 0.5);
    y = 52;
  }

  y = sectionHeader(y, "Doporučení a opatření", OLIVE2);

  const fondMesice = celkV > 0 ? Math.floor((data.nouzovyFond || 0) / celkV) : 0;
  const cfPct = celkP > 0 ? Math.round((cf / celkP) * 100) : 0;
  const dopulR = Math.round(dopulozka / 100) * 100;
  const gap = dopulR - (data.mesicniSporeni || 0);
  const sporeniPct = celkP > 0 ? Math.round(((data.mesicniSporeni || 0) / celkP) * 100) : 0;
  const fond = data.nouzovyFond || 0;
  const idealFond = celkV * 3;

  type RecType = "ok" | "warn" | "tip";
  const recs: [RecType, string][] = [];

  if (cf < 0) {
    recs.push(["warn", `Výdaje převyšují příjmy o ${czf(Math.abs(cf))} měsíčně. Zkontrolujte strukturu výdajů.`]);
  } else {
    recs.push(["ok", `Cash flow je zdravé – zbývá ${czf(cf)} měsíčně (${cfPct} % příjmů).`]);
  }

  if (fond <= 0) {
    recs.push(["warn", `Nemáte žádnou finanční rezervu. Cílem je min. 3 měsíční výdaje (${czf(idealFond)}).`]);
  } else if (fond < idealFond) {
    recs.push(["tip", `Nouzový fond ${czf(fond)} pokrývá ${fondMesice} měsíce výdajů. Ideál jsou 3 měsíce (${czf(idealFond)}).`]);
  } else {
    recs.push(["ok", `Nouzový fond ${czf(fond)} pokrývá ${fondMesice} měsíce výdajů – výborná ochrana.`]);
  }

  if ((data.spotrebitelskyUver || 0) + (data.kreditniKarty || 0) > 0) {
    recs.push(["warn", `Máte spotřebitelské dluhy (${czf((data.spotrebitelskyUver || 0) + (data.kreditniKarty || 0))}). Splaťte je prioritně – mají nejvyšší úroky.`]);
  }

  if (cilDuchod > 0 && cilRoky > 0 && dopulozka > 0) {
    if ((data.mesicniSporeni || 0) < dopulR * 0.8) {
      recs.push(["warn", `Pro cílovou částku ${czf(cilDuchod)}/měs. potřebujete odkládat ${czf(dopulR)}/měs. (5 % p.a.). Aktuálně odkládáte ${czf(data.mesicniSporeni || 0)} – chybí ${czf(Math.max(0, gap))}/měs.`]);
    } else {
      recs.push(["ok", `Vaše úložka ${czf(data.mesicniSporeni || 0)}/měs. postačí pro dosažení cíle ${czf(cilDuchod)}/měs. při 5 % p.a.`]);
    }
  } else if (sporeniPct < 10) {
    recs.push(["tip", `Ukládáte ${sporeniPct} % příjmů. Pravidlo 50/30/20 doporučuje alespoň 20 % měsíčně.`]);
  }

  if (!data.zivotniPojisteni) {
    recs.push(["tip", "Nemáte životní pojištění. Pokud máte závislé osoby nebo dluhy, je to klíčová ochrana."]);
  }
  if (!data.nemocenskePoistenie) {
    recs.push(["tip", "Zvažte pojištění pracovní neschopnosti – ztráta příjmu je jedním z největších finančních rizik."]);
  }
  if (data.zivotniPojisteni && data.nemocenskePoistenie && data.majetkPoisteni) {
    recs.push(["ok", "Máte sjednáno životní pojištění, pojištění neschopnosti i majetku – komplexní ochrana."]);
  }

  for (const [type, text] of recs) {
    if (y > PH - 80) {
      doc.addPage();
      y = 52;
    }
    y = recRow(MG, y, CW, text, type) + 1;
  }
  y += 8;

  // Disclaimer
  if (y > PH - 60) { doc.addPage(); y = 52; }
  hrule(y, BORDER, 0.4);
  y += 4;
  doc.save().font("NS").fontSize(7).fillColor(MUTED)
     .text(
       "Tento dokument byl vygenerován na základě údajů zadaných klientem a slouží jako orientační podklad pro finanční poradenství. " +
       "Nepředstavuje investiční doporučení ani daňové poradenství. Projekce vycházejí z předpokladu průměrné inflace 2 % p.a. a výnosu 5 % p.a. " +
       "Skutečné výsledky se mohou lišit.",
       MG, y, { width: CW }
     ).restore();

  // Footer on each page (simple approach: draw at bottom)
  const totalPages = (doc as any)._pageBuffer?.length || 1;
  for (let p = 0; p < doc.bufferedPageRange().count; p++) {
    doc.switchToPage(p);
    hrule(PH - 24, BORDER, 0.4);
    doc.save().font("NS").fontSize(7).fillColor(MUTED)
       .text("emparia.cz  ·  Dokument je důvěrný a určen výhradně pro klienta.", MG, PH - 18, { width: CW * 0.7 })
       .text(`Strana ${p + 1}`, MG, PH - 18, { width: CW, align: "right" })
       .restore();
  }

  doc.end();
}
