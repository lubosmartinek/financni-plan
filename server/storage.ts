/**
 * In-memory storage — žádná data se neukládají na disk.
 * Každý záznam má krátkou životnost: smaže se automaticky
 * po přístupu k výsledkům nebo nejpozději po 2 hodinách.
 */
import type { Assessment, InsertAssessment } from "@shared/schema";

const TTL_MS = 5 * 60 * 1000; // 5 minut od posledni aktivity

interface StoredRecord {
  data: Assessment;
  expiresAt: number;
  accessToken: string; // jednorázový token vygenerovaný při vytvoření
}

const store = new Map<number, StoredRecord>();
let nextId = 1;

// Periodicky čistí expirované záznamy
setInterval(() => {
  const now = Date.now();
  for (const [id, rec] of store.entries()) {
    if (rec.expiresAt < now) {
      store.delete(id);
    }
  }
}, 10 * 60 * 1000); // každých 10 minut

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export type AssessmentWithScores = InsertAssessment & {
  skoreRodinneFinance: number;
  skoreZadluzenost: number;
  skoreRezervyOchrana: number;
  skoreSporeníInvestice: number;
  skoreFinancniZdrav: number;
};

export const storage = {
  /**
   * Uloží záznam do paměti. Vrátí record + accessToken.
   * Token je potřeba pro přístup k výsledkům.
   */
  createAssessment(data: AssessmentWithScores & { createdAt: string }): { record: Assessment; accessToken: string } {
    const id = nextId++;
    const record: Assessment = { id, ...data } as Assessment;
    const accessToken = generateToken();
    store.set(id, {
      data: record,
      expiresAt: Date.now() + TTL_MS,
      accessToken,
    });
    return { record, accessToken };
  },

  /**
   * Vrátí záznam POUZE pokud token odpovídá.
   * Přístup bez tokenu vrátí null.
   */
  getAssessment(id: number, accessToken: string): Assessment | null {
    const entry = store.get(id);
    if (!entry) return null;
    if (entry.accessToken !== accessToken) return null;
    if (entry.expiresAt < Date.now()) {
      store.delete(id);
      return null;
    }
    // Reset TTL při každém přístupu (sliding window)
    entry.expiresAt = Date.now() + TTL_MS;
    return entry.data;
  },

  /**
   * Smaže záznam okamžitě (voláno po stažení PDF nebo explicitně).
   * Token musí souhlasit.
   */
  deleteAssessment(id: number, accessToken: string): boolean {
    const entry = store.get(id);
    if (!entry || entry.accessToken !== accessToken) return false;
    store.delete(id);
    return true;
  },

  /**
   * Aktualizuje záznam (edit flow). Token musí souhlasit.
   */
  updateAssessment(id: number, accessToken: string, data: AssessmentWithScores): Assessment | null {
    const entry = store.get(id);
    if (!entry || entry.accessToken !== accessToken) return null;
    if (entry.expiresAt < Date.now()) {
      store.delete(id);
      return null;
    }
    const updated: Assessment = { id, createdAt: entry.data.createdAt, ...data } as Assessment;
    // Reset TTL při každé úpravě
    store.set(id, { ...entry, data: updated, expiresAt: Date.now() + TTL_MS });
    return updated;
  },

  /** Vrátí zbývající sekundy platnosti (pro frontend countdown) */
  getRemainingSeconds(id: number, accessToken: string): number | null {
    const entry = store.get(id);
    if (!entry || entry.accessToken !== accessToken) return null;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  },
};
