import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assessments = sqliteTable("assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),

  // === SEKCE 1: Základní informace ===
  jmeno: text("jmeno").notNull(),
  vek: integer("vek").notNull(),
  rodinnyStav: text("rodinny_stav").notNull(), // svobodny, v_paraku, zenaty, rozvedeny, vdovec
  pocetDeti: integer("pocet_deti").notNull().default(0),
  pracovniStatus: text("pracovni_status").notNull(), // zamestnanec, osvc, podnikatel, student, duchod, nezamestnany

  // === SEKCE 2: Příjmy ===
  mesicniPrijem: real("mesicni_prijem").notNull(), // čistý měsíční příjem (Kč)
  partnerPrijem: real("partner_prijem").notNull().default(0),
  ostatniPrijmy: real("ostatni_prijmy").notNull().default(0), // pronájem, dividendy, etc.

  // === SEKCE 3: Výdaje ===
  najem: real("najem").notNull().default(0), // nájem / hypotéka
  jidloNakupy: real("jidlo_nakupy").notNull().default(0),
  doprava: real("doprava").notNull().default(0),
  utraty: real("utraty").notNull().default(0), // zábava, restaurace, koníčky
  pojisteni: real("pojisteni").notNull().default(0),
  ostatniVydaje: real("ostatni_vydaje").notNull().default(0),

  // === SEKCE 4: Majetek a dluhy ===
  uspory: real("uspory").notNull().default(0), // celkové úspory na účtech
  investice: real("investice").notNull().default(0), // akcie, fondy, etc.
  nemovitosti: real("nemovitosti").notNull().default(0), // odhadní hodnota nemovitostí
  hypotekaDluh: real("hypoteka_dluh").notNull().default(0),
  spotrebitelskyUver: real("spotrebitelsky_uver").notNull().default(0),
  kreditniKarty: real("kreditni_karty").notNull().default(0),
  ostatniDluhy: real("ostatni_dluhy").notNull().default(0),

  // === SEKCE 5: Pojištění a ochrana ===
  zivotniPojisteni: integer("zivotni_pojisteni").notNull().default(0), // 0/1
  nemocenskePoistenie: integer("nemocenske_poistenie").notNull().default(0),
  majetkPoisteni: integer("majetek_pojisteni").notNull().default(0),
  nouzovyFond: real("nouzovy_fond").notNull().default(0), // výše nouzového fondu

  // === SEKCE 6: Cíle ===
  hlavniCil: text("hlavni_cil").notNull().default(""), // sporeni_na_duchod, koupeni_nemovitosti, splaceni_dluhu, tvorba_rezervy, investovani
  casovyHorizont: text("casovy_horizont").notNull().default(""), // kratky (1-3r), stredni (3-10r), dlouhy (10+r), vlastni
  cilVek: integer("cil_vek").default(0), // konkrétní cílový věk (volitelné)
  cilRoky: integer("cil_roky").default(0), // nebo počet let (volitelné)
  cilMesicniDuchod: real("cil_mesicni_duchod").default(0), // cílová měsíční částka v důchodu (v dnešních Kč)
  mesicniSporeni: real("mesicni_sporeni").notNull().default(0),

  // === Computed scores (uloženy pro přehled) ===
  skoreRodinneFinance: real("skore_rodinne_finance"),
  skoreZadluzenost: real("skore_zadluzenost"),
  skoreRezervyOchrana: real("skore_rezervy_ochrana"),
  skoreSporeníInvestice: real("skore_sporeni_investice"),
  skoreFinancniZdrav: real("skore_financni_zdrav"),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  skoreRodinneFinance: true,
  skoreZadluzenost: true,
  skoreRezervyOchrana: true,
  skoreSporeníInvestice: true,
  skoreFinancniZdrav: true,
});

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;
