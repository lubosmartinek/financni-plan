import type { Express } from "express";
import { storage } from "./storage";
import { insertAssessmentSchema } from "@shared/schema";
import { generatePDF } from "./pdf";

// ── Scoring logic ────────────────────────────────────────────
function computeScores(data: any) {
  const celkovePrijmy = (data.mesicniPrijem || 0) + (data.partnerPrijem || 0) + (data.ostatniPrijmy || 0);
  const celkoveVydaje = (data.najem || 0) + (data.jidloNakupy || 0) + (data.doprava || 0) +
    (data.utraty || 0) + (data.pojisteni || 0) + (data.ostatniVydaje || 0);
  const celkoveDluhy = (data.hypotekaDluh || 0) + (data.spotrebitelskyUver || 0) +
    (data.kreditniKarty || 0) + (data.ostatniDluhy || 0);
  const celkovyMajetek = (data.uspory || 0) + (data.investice || 0) + (data.nemovitosti || 0);
  const mesicniCashflow = celkovePrijmy - celkoveVydaje;
  const nouzovyFond = data.nouzovyFond || 0;

  let skoreCashflow = 0;
  if (celkovePrijmy > 0) {
    const r = mesicniCashflow / celkovePrijmy;
    if (r >= 0.3) skoreCashflow = 25;
    else if (r >= 0.2) skoreCashflow = 20;
    else if (r >= 0.1) skoreCashflow = 15;
    else if (r >= 0) skoreCashflow = 8;
  }

  let skoreZadluz = 0;
  if (celkoveDluhy === 0) {
    skoreZadluz = 25;
  } else if (celkovyMajetek > 0) {
    const r = celkoveDluhy / celkovyMajetek;
    if (r < 0.2) skoreZadluz = 22;
    else if (r < 0.4) skoreZadluz = 18;
    else if (r < 0.6) skoreZadluz = 12;
    else if (r < 0.8) skoreZadluz = 6;
    else skoreZadluz = 2;
  }
  if ((data.spotrebitelskyUver || 0) > 0 || (data.kreditniKarty || 0) > 0) {
    skoreZadluz = Math.max(0, skoreZadluz - 5);
  }

  let skoreRezervyOchrana = 0;
  const idealNouzovy = celkoveVydaje * 3;
  if (nouzovyFond >= idealNouzovy * 2) skoreRezervyOchrana += 12;
  else if (nouzovyFond >= idealNouzovy) skoreRezervyOchrana += 10;
  else if (nouzovyFond >= celkoveVydaje) skoreRezervyOchrana += 6;
  else if (nouzovyFond > 0) skoreRezervyOchrana += 2;
  if (data.zivotniPojisteni) skoreRezervyOchrana += 5;
  if (data.nemocenskePoistenie) skoreRezervyOchrana += 4;
  if (data.majetkPoisteni) skoreRezervyOchrana += 4;

  let skoreSporeni = 0;
  if (celkovePrijmy > 0) {
    const r = (data.mesicniSporeni || 0) / celkovePrijmy;
    if (r >= 0.2) skoreSporeni += 15;
    else if (r >= 0.1) skoreSporeni += 10;
    else if (r >= 0.05) skoreSporeni += 5;
    else if (r > 0) skoreSporeni += 2;
    if ((data.investice || 0) > celkovePrijmy * 12) skoreSporeni += 10;
    else if ((data.investice || 0) > celkovePrijmy * 6) skoreSporeni += 7;
    else if ((data.investice || 0) > 0) skoreSporeni += 4;
  }

  return {
    skoreRodinneFinance: Math.round(skoreCashflow),
    skoreZadluzenost: Math.round(skoreZadluz),
    skoreRezervyOchrana: Math.round(skoreRezervyOchrana),
    skoreSporeníInvestice: Math.round(skoreSporeni),
    skoreFinancniZdrav: Math.min(100, Math.round(skoreCashflow + skoreZadluz + skoreRezervyOchrana + skoreSporeni)),
    celkovePrijmy,
    celkoveVydaje,
    celkoveDluhy,
    celkovyMajetek,
    mesicniCashflow,
    nouzovyFond,
  };
}

export function registerRoutes(httpServer: any, app: Express) {

  // ── POST /api/assessments ─────────────────────────────────
  // Vytvoří záznam v paměti, vrátí id + accessToken.
  // Token je nutný pro všechny další operace.
  app.post("/api/assessments", (req, res) => {
    try {
      const parsed = insertAssessmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const scores = computeScores(parsed.data);
      const { record, accessToken } = storage.createAssessment({
        ...parsed.data,
        createdAt: new Date().toISOString(),
        skoreRodinneFinance: scores.skoreRodinneFinance,
        skoreZadluzenost: scores.skoreZadluzenost,
        skoreRezervyOchrana: scores.skoreRezervyOchrana,
        skoreSporeníInvestice: scores.skoreSporeníInvestice,
        skoreFinancniZdrav: scores.skoreFinancniZdrav,
      });

      // Vrátíme id + token — frontend uloží token do session state
      res.json({ ...record, ...scores, accessToken });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/assessments/:id ──────────────────────────────
  // Vyžaduje ?token=... v query parametru.
  // Bez tokenu → 403.
  app.get("/api/assessments/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const token = req.query.token as string;
      if (!token) return res.status(403).json({ error: "Token required" });

      const record = storage.getAssessment(id, token);
      if (!record) return res.status(404).json({ error: "Not found or expired" });

      const scores = computeScores(record);
      res.json({ ...record, ...scores });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/assessments/:id ────────────────────────────
  app.patch("/api/assessments/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const token = req.query.token as string;
      if (!token) return res.status(403).json({ error: "Token required" });

      const existing = storage.getAssessment(id, token);
      if (!existing) return res.status(404).json({ error: "Not found or expired" });

      const parsed = insertAssessmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const scores = computeScores(parsed.data);
      const updated = storage.updateAssessment(id, token, {
        ...parsed.data,
        skoreRodinneFinance: scores.skoreRodinneFinance,
        skoreZadluzenost: scores.skoreZadluzenost,
        skoreRezervyOchrana: scores.skoreRezervyOchrana,
        skoreSporeníInvestice: scores.skoreSporeníInvestice,
        skoreFinancniZdrav: scores.skoreFinancniZdrav,
      });

      res.json({ ...updated, ...scores, accessToken: token });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/assessments/:id/pdf ──────────────────────────
  // Po vygenerování PDF záznam OKAMŽITĚ smaže.
  app.get("/api/assessments/:id/pdf", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const token = req.query.token as string;
      if (!token) return res.status(403).json({ error: "Token required" });

      const record = storage.getAssessment(id, token);
      if (!record) return res.status(404).json({ error: "Not found or expired" });

      const scores = computeScores(record);

      // Smaž záznam PŘED odesláním PDF
      // Smaz zaznam az PO odeslani PDF
      res.on("finish", () => storage.deleteAssessment(id, token));

      generatePDF({ ...record, ...scores }, res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/assessments/:id/ttl ───────────────────────
  // Vrátí zbývající sekundy platnosti pro countdown na frontendu.
  app.get("/api/assessments/:id/ttl", (req, res) => {
    const id = parseInt(req.params.id);
    const token = req.query.token as string;
    if (!token) return res.status(403).json({ error: "Token required" });
    const seconds = storage.getRemainingSeconds(id, token);
    if (seconds === null) return res.status(404).json({ expired: true, seconds: 0 });
    res.json({ expired: false, seconds });
  });

  // ── GET /api/assessments — ZABLOKOVÁNO ────────────────────
  app.get("/api/assessments", (_req, res) => res.status(403).json({ error: "Forbidden" }));

  return httpServer;
}
