import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertAssessmentSchema } from "@shared/schema";
import { generatePDF } from "./pdf";

// Scoring logic
function computeScores(data: any) {
  const celkovePrijmy = (data.mesicniPrijem || 0) + (data.partnerPrijem || 0) + (data.ostatniPrijmy || 0);
  const celkoveVydaje =
    (data.najem || 0) + (data.jidloNakupy || 0) + (data.doprava || 0) +
    (data.utraty || 0) + (data.pojisteni || 0) + (data.ostatniVydaje || 0);
  const celkoveDluhy =
    (data.hypotekaDluh || 0) + (data.spotrebitelskyUver || 0) +
    (data.kreditniKarty || 0) + (data.ostatniDluhy || 0);
  const celkovyMajetek =
    (data.uspory || 0) + (data.investice || 0) + (data.nemovitosti || 0);
  const mesicniCashflow = celkovePrijmy - celkoveVydaje;
  const nouzovyFond = data.nouzovyFond || 0;

  // 1. Skóre cash flow (rodinné finance) 0–25
  let skoreCashflow = 0;
  if (celkovePrijmy > 0) {
    const cashflowRatio = mesicniCashflow / celkovePrijmy;
    if (cashflowRatio >= 0.3) skoreCashflow = 25;
    else if (cashflowRatio >= 0.2) skoreCashflow = 20;
    else if (cashflowRatio >= 0.1) skoreCashflow = 15;
    else if (cashflowRatio >= 0) skoreCashflow = 8;
    else skoreCashflow = 0;
  }

  // 2. Skóre zadluženosti 0–25
  let skoreZadluz = 0;
  if (celkoveDluhy === 0) {
    skoreZadluz = 25;
  } else if (celkovyMajetek > 0) {
    const dtiRatio = celkoveDluhy / celkovyMajetek;
    if (dtiRatio < 0.2) skoreZadluz = 22;
    else if (dtiRatio < 0.4) skoreZadluz = 18;
    else if (dtiRatio < 0.6) skoreZadluz = 12;
    else if (dtiRatio < 0.8) skoreZadluz = 6;
    else skoreZadluz = 2;
  } else {
    skoreZadluz = 0;
  }
  // Penalty za spotřebitelský úvěr a kreditní karty
  if ((data.spotrebitelskyUver || 0) > 0 || (data.kreditniKarty || 0) > 0) {
    skoreZadluz = Math.max(0, skoreZadluz - 5);
  }

  // 3. Skóre rezervy a ochrana 0–25
  let skoreRezervyOchrana = 0;
  // Nouzový fond: ideál = 3–6 měsíčních výdajů
  const idealNouzovy = celkoveVydaje * 3;
  if (nouzovyFond >= idealNouzovy * 2) skoreRezervyOchrana += 12;
  else if (nouzovyFond >= idealNouzovy) skoreRezervyOchrana += 10;
  else if (nouzovyFond >= celkoveVydaje) skoreRezervyOchrana += 6;
  else if (nouzovyFond > 0) skoreRezervyOchrana += 2;
  // Pojištění
  if (data.zivotniPojisteni) skoreRezervyOchrana += 5;
  if (data.nemocenskePoistenie) skoreRezervyOchrana += 4;
  if (data.majetkPoisteni) skoreRezervyOchrana += 4;

  // 4. Skóre spoření a investic 0–25
  let skoreSporeni = 0;
  if (celkovePrijmy > 0) {
    const sporeniRatio = (data.mesicniSporeni || 0) / celkovePrijmy;
    if (sporeniRatio >= 0.2) skoreSporeni += 15;
    else if (sporeniRatio >= 0.1) skoreSporeni += 10;
    else if (sporeniRatio >= 0.05) skoreSporeni += 5;
    else if (sporeniRatio > 0) skoreSporeni += 2;
    // Investice bonus
    if ((data.investice || 0) > celkovePrijmy * 12) skoreSporeni += 10;
    else if ((data.investice || 0) > celkovePrijmy * 6) skoreSporeni += 7;
    else if ((data.investice || 0) > 0) skoreSporeni += 4;
  }

  const celkoveSkore = Math.min(100, Math.round(skoreCashflow + skoreZadluz + skoreRezervyOchrana + skoreSporeni));

  return {
    skoreRodinneFinance: Math.round(skoreCashflow),
    skoreZadluzenost: Math.round(skoreZadluz),
    skoreRezervyOchrana: Math.round(skoreRezervyOchrana),
    skoreSporeníInvestice: Math.round(skoreSporeni),
    skoreFinancniZdrav: celkoveSkore,
    // Extra computed values for frontend
    celkovePrijmy,
    celkoveVydaje,
    celkoveDluhy,
    celkovyMajetek,
    mesicniCashflow,
    nouzovyFond,
  };
}

export function registerRoutes(httpServer: any, app: Express) {
  app.post("/api/assessments", (req, res) => {
    try {
      const parsed = insertAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const scores = computeScores(parsed.data);
      const record = storage.createAssessment({
        ...parsed.data,
        createdAt: new Date().toISOString(),
        skoreRodinneFinance: scores.skoreRodinneFinance,
        skoreZadluzenost: scores.skoreZadluzenost,
        skoreRezervyOchrana: scores.skoreRezervyOchrana,
        skoreSporeníInvestice: scores.skoreSporeníInvestice,
        skoreFinancniZdrav: scores.skoreFinancniZdrav,
      });
      res.json({ ...record, ...scores });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/assessments/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const record = storage.getAssessment(id);
    if (!record) return res.status(404).json({ error: "Not found" });
    const scores = computeScores(record);
    res.json({ ...record, ...scores });
  });

  app.get("/api/assessments", (req, res) => {
    const all = storage.getAllAssessments();
    res.json(all);
  });

  // PDF export
  app.get("/api/assessments/:id/pdf", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = storage.getAssessment(id);
      if (!record) return res.status(404).json({ error: "Not found" });
      const scores = computeScores(record);
      generatePDF({ ...record, ...scores }, res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH – update existing assessment (for "edit" flow)
  app.patch("/api/assessments/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = storage.getAssessment(id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      // Use req.body directly (camelCase from frontend) – do NOT merge with DB record
      // which uses snake_case column names and would overwrite frontend values
      const parsed = insertAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const scores = computeScores(parsed.data);
      const record = storage.updateAssessment(id, {
        ...parsed.data,
        skoreRodinneFinance: scores.skoreRodinneFinance,
        skoreZadluzenost: scores.skoreZadluzenost,
        skoreRezervyOchrana: scores.skoreRezervyOchrana,
        skoreSporeníInvestice: scores.skoreSporeníInvestice,
        skoreFinancniZdrav: scores.skoreFinancniZdrav,
      });
      res.json({ ...record, ...scores });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
