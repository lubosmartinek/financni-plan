import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { assessments, type Assessment, type InsertAssessment } from "@shared/schema";
import { eq } from "drizzle-orm";

const sqlite = new Database("db.sqlite");
export const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    jmeno TEXT NOT NULL,
    vek INTEGER NOT NULL,
    rodinny_stav TEXT NOT NULL,
    pocet_deti INTEGER NOT NULL DEFAULT 0,
    pracovni_status TEXT NOT NULL,
    mesicni_prijem REAL NOT NULL,
    partner_prijem REAL NOT NULL DEFAULT 0,
    ostatni_prijmy REAL NOT NULL DEFAULT 0,
    najem REAL NOT NULL DEFAULT 0,
    jidlo_nakupy REAL NOT NULL DEFAULT 0,
    doprava REAL NOT NULL DEFAULT 0,
    utraty REAL NOT NULL DEFAULT 0,
    pojisteni REAL NOT NULL DEFAULT 0,
    ostatni_vydaje REAL NOT NULL DEFAULT 0,
    uspory REAL NOT NULL DEFAULT 0,
    investice REAL NOT NULL DEFAULT 0,
    nemovitosti REAL NOT NULL DEFAULT 0,
    hypoteka_dluh REAL NOT NULL DEFAULT 0,
    spotrebitelsky_uver REAL NOT NULL DEFAULT 0,
    kreditni_karty REAL NOT NULL DEFAULT 0,
    ostatni_dluhy REAL NOT NULL DEFAULT 0,
    zivotni_pojisteni INTEGER NOT NULL DEFAULT 0,
    nemocenske_poistenie INTEGER NOT NULL DEFAULT 0,
    majetek_pojisteni INTEGER NOT NULL DEFAULT 0,
    nouzovy_fond REAL NOT NULL DEFAULT 0,
    hlavni_cil TEXT NOT NULL DEFAULT '',
    casovy_horizont TEXT NOT NULL DEFAULT '',
    cil_vek INTEGER DEFAULT 0,
    cil_roky INTEGER DEFAULT 0,
    cil_mesicni_duchod REAL DEFAULT 0,
    mesicni_sporeni REAL NOT NULL DEFAULT 0,
    skore_rodinne_finance REAL,
    skore_zadluzenost REAL,
    skore_rezervy_ochrana REAL,
    skore_sporeni_investice REAL,
    skore_financni_zdrav REAL
  )
`);

export type AssessmentWithScores = InsertAssessment & {
  skoreRodinneFinance: number;
  skoreZadluzenost: number;
  skoreRezervyOchrana: number;
  skoreSporeníInvestice: number;
  skoreFinancniZdrav: number;
};

export interface IStorage {
  createAssessment(data: InsertAssessment & {
    createdAt: string;
    skoreRodinneFinance: number;
    skoreZadluzenost: number;
    skoreRezervyOchrana: number;
    skoreSporeníInvestice: number;
    skoreFinancniZdrav: number;
  }): Assessment;
  getAssessment(id: number): Assessment | undefined;
  getAllAssessments(): Assessment[];
  updateAssessment(id: number, data: AssessmentWithScores): Assessment;
}

export const storage: IStorage = {
  createAssessment(data) {
    return db.insert(assessments).values(data).returning().get();
  },
  getAssessment(id) {
    return db.select().from(assessments).where(eq(assessments.id, id)).get();
  },
  getAllAssessments() {
    return db.select().from(assessments).all();
  },
  updateAssessment(id, data) {
    const { ...rest } = data;
    return db.update(assessments).set(rest).where(eq(assessments.id, id)).returning().get();
  },
};
