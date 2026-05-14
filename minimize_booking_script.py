"""
Minimize Booking - Sales Report Pipeline
Converted from Jupyter notebook for Next.js reference
"""


# ===== SECTION 1 =====
import pandas as pd
import numpy as np
import os
import time
import json
import logging
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Union


# ===== SECTION 2 =====
# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("SalesReport")


class ExecutionTracker:
    """
    Wall-clock timing and complexity metadata for every pipeline phase.

    Usage::

        tracker = ExecutionTracker("MyReport")
        with tracker.phase("Ingestion", complexity="O(N·M)"):
            ...
        tracker.record("Ingestion", files_read=16, rows=50_000)
        print(tracker.summary())
        tracker.export_json(Path("meta.json"))
    """

    def __init__(self, report_id: str) -> None:
        self.report_id = report_id
        self.start_time = datetime.now()
        self.phases: dict = {}

    @contextmanager
    def phase(self, name: str, complexity: str = ""):
        t0 = time.perf_counter()
        label = f"[{complexity}]" if complexity else ""
        logger.info("[START] %-40s %s", name, label)
        try:
            yield
        finally:
            elapsed = time.perf_counter() - t0
            self.phases.setdefault(name, {}).update(
                elapsed_sec=round(elapsed, 4),
                complexity=complexity,
            )
            logger.info("[DONE ] %-40s %.3f s", name, elapsed)

    def record(self, phase: str, **metrics) -> None:
        """Attach arbitrary key-value metrics to an already-timed phase."""
        self.phases.setdefault(phase, {}).update(metrics)

    def summary(self) -> str:
        total = (datetime.now() - self.start_time).total_seconds()
        sep = "═" * 72
        rows = [
            sep,
            "  TECHNICAL EXECUTION REPORT",
            f"  Report   : {self.report_id}",
            f"  Generated: {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}",
            f"  Runtime  : {total:.3f} s",
            sep,
        ]
        for phase, info in self.phases.items():
            elapsed = info.get("elapsed_sec", 0)
            pct = (elapsed / total * 100) if total else 0
            rows += [
                "",
                f"  ┌─ {phase}",
                f"  │  Time       : {elapsed:.4f} s  ({pct:.1f}%)",
            ]
            if info.get("complexity"):
                rows.append(f"  │  Complexity : {info['complexity']}")
            for k, v in info.items():
                if k not in ("elapsed_sec", "complexity"):
                    rows.append(f"  │  {k:<24}: {v}")
            rows.append("  └" + "─" * 50)
        rows.append("")
        rows.append(sep)
        return "\n".join(rows)

    def export_json(self, path: Union[str, Path]) -> None:
        payload = {
            "report_id": self.report_id,
            "generated_at": datetime.now().isoformat(),
            "total_runtime_sec": (datetime.now() - self.start_time).total_seconds(),
            "phases": self.phases,
        }
        Path(path).write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info("Execution metadata → %s", path)


# ===== SECTION 3 =====
@dataclass
class ReportConfig:
    """Typed, central configuration — replaces scattered global variables."""
    version: str         = "2026-04-30"
    annotation: str      = ""
    vat_suffix: str      = ". Vat"
    format: str          = "Csv"       # "Csv" | "xlsx"
    scope: str           = "Part"      # "Part" | "All"
    mode: str            = "detailed"     # "short" | "detailed"
    only_checked_in: bool = False
    splite_by_departure: bool = False


cfg = ReportConfig()

# Backward-compat aliases used throughout
vat             = cfg.vat_suffix
version         = cfg.version
annotation      = cfg.annotation
csv_xlsx        = cfg.format
short_detailed  = cfg.mode
part_all        = cfg.scope
only_checked_in = cfg.only_checked_in
splite_by_departure = cfg.splite_by_departure

tracker = ExecutionTracker(report_id=f"SalesReport_{cfg.version}{cfg.annotation}")
logger.info("Config loaded: %s", cfg)


# ===== SECTION 4 =====
def extract_files_from_one_dir(directory: str) -> list:
    """
    Walk *directory* and return every file path found.
    Complexity: O(F) — F = total files in subtree.
    """
    all_files: list = []
    if os.path.exists(directory) and os.path.isdir(directory):
        for root, _, files in os.walk(directory):
            for f in files:
                all_files.append(f"{root}/{f}")
    else:
        logger.warning("Directory not found: %s", directory)
    return all_files


def aggregate_and_sort(
    df: pd.DataFrame,
    index_col: str,
    value_cols,
    custom_order: list,
    aggfunc: str = "sum",
    fill_missing: bool = False,
    fill_value: float = 0,
) -> pd.DataFrame:
    """
    Pivot *df* on *index_col* / *value_cols*, then align to *custom_order*.
    Complexity: O(R log R) — pivot sort dominates, R = rows in df.
    """
    pivot = df.pivot_table(index=index_col, values=value_cols, aggfunc=aggfunc)
    if fill_missing:
        return pivot.reindex(custom_order, fill_value=fill_value)
    return pivot.loc[pivot.index.intersection(custom_order)]


def flatten_dict(d: dict, parent_key: str = "", sep: str = "_") -> dict:
    """
    Recursively flatten *d* to a single level, joining key paths with *sep*.
    A single-key top-level dict is unwrapped before traversal.
    Complexity: O(D) — D = total number of leaf values.
    """
    if isinstance(d, dict) and len(d) == 1:
        d = next(iter(d.values()))
    items: list = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


# ===== SECTION 5 =====
agencies = {
    "MOH200":      {"name": "EL MOUHSSINOUNE TOURS",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MANOLIA":     {"name": "MANOLIA TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BADJI":       {"name": "BADJI TOURISME ET VOYAGE",           "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "182":         {"name": "ZOGHBI VOYAGE",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BBATA":       {"name": "TOURING B.B.ARRERIDJ",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBO":        {"name": "NOURIS EL BAHR ORAN",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ABCH186":     {"name": "ABSHER AGENCY",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MCR188":      {"name": "MICIRDA TOURS",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RELAISV":     {"name": "LE RELAIS VOYAGES",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "LOURARI":     {"name": "LOURARI VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SAMA187":     {"name": "SAMA MANAR TRAVEL",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ONATRLZ":     {"name": "ONAT RELIZANE",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RAFA":        {"name": "RAFA VOYAGE",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TRAVELM":     {"name": "TRAVEL MARKET TOURISME",             "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELIANEM":     {"name": "ELIANE MENANA VOYAGES",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "KADERT":      {"name": "KADER TRAVEL",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "KARTINA":     {"name": "KARTINA TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "JDIOUIA":     {"name": "JDIOUIA VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "GOURAYA":     {"name": "GOURAYA TOUR",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AYLOUL":      {"name": "AYLOUL VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "181":         {"name": "EL MERRINIA LILKHADAMAT SIYAHIA",    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BOUFFEE":     {"name": "BOUFFEE D'AIR VOYAGES",             "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MANAKIB":     {"name": "MANAKIB TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "GOODM":       {"name": "GOOD MORNING TRAVEL",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MISE195":     {"name": "MISE A JOUR VOYAGES",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "LEJD190":     {"name": "LEJDAR REGHAIA TRAVEL",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PINTON":      {"name": "PINTON TOUR",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBM":        {"name": "NOURIS EL BAHR MOSTAGANEM",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MYLINET":     {"name": "MYLINE TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "IDHOURAR":    {"name": "IDHOURAR TOURS",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBB":        {"name": "NOURIS EL BAHR LES VERGERS (C01)",   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBB1":       {"name": "NOURIS EL BAHR LES VERGERS (C02)",   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBB2":       {"name": "NOURIS EL BAHR LES VERGERS (C03)",   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBB3":       {"name": "NOURIS EL BAHR LES VERGERS (C04)",   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NEBB4":       {"name": "NOURIS EL BAHR LES VERGERS (C05)",   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZTCHTOLGA2":  {"name": "ZAATCHA TOLGA 2",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "WAHIBAT":     {"name": "WAHIBA TOURS",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RAHLATE":     {"name": "ALAME EL RAHLATE",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "THEARKAVE":   {"name": "THEARKAVE TOURS",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CSTTA":       {"name": "TOURING CONSTANTINE AOUATI",         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RYTELT":      {"name": "RYTEL TRAVELS",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ORANSOM":     {"name": "TOURING ORAN Summam",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MELGO":       {"name": "MELGO TRAVEL AGENCY",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PLANET":      {"name": "PLANET TRAVEL FOR YOU",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MOHMCIRDA":   {"name": "MOHAMMED MCIRDI",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAHIA":       {"name": "ZAHIA VOYAGES",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DOUA":        {"name": "DOUA EL NADJEM TRAVEL",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SPFLOTTES":   {"name": "SARL SAAPY FLOTTES",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "FORMUL1":     {"name": "FORMUL 1 VOYAGES",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELBARAKA":    {"name": "EL BARAKA VOYAGES",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "OUARDATE":    {"name": "OUARDATE AURES TOURS",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DELYWORLD":   {"name": "DELY WORLD TRAVEL",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "OUASSIM":     {"name": "OUASSIM VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "KHALEDAH":    {"name": "KHALEDAH",                           "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELSAJAYA":    {"name": "EL SAJAYA",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BENAKLIV":    {"name": "BENAKLI VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BONNEADD":    {"name": "LA BONNE ADRESSE TOURS",             "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RANADAT":     {"name": "RANADA TRAVEL SERVICE",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AZHARI":      {"name": "AZHARI VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ALUMEXA":     {"name": "ALUMEXA VOYAGE",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DRAMAST":     {"name": "DRAMAS TOURS",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MSILATA":     {"name": "TOURING M'SILA",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELAFIA":      {"name": "EL AFIA VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SKIKDATA":    {"name": "TOURING SKIKDA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "OUEDSLY":     {"name": "OUEDSLY TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BOULERBAH":   {"name": "BOULERBAH TOURISME ET VOYAGE",       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AZNAG":       {"name": "AZNAG TOURS",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CHLEFTA":     {"name": "TOURING CHLEF",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MZ185":       {"name": "MEZINE TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "KAABECHET":   {"name": "KAABECHE TRAVEL",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SABNOUR":     {"name": "SAB NOUR VOYAGES",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NOUHA":       {"name": "NOUHA TOUR",                         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MASSARA":     {"name": "MASSAR ALGIERS AGENCY",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MDMF":        {"name": "MOUAKI DADI MOHAMED FAICAL",         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELSALILE":    {"name": "EL SALILE VOYAGE",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "OVERLAND":    {"name": "OVERLAND CLICKS TRAVEL",             "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ETTAWHID":    {"name": "ETTAWHID VOYAGES",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MOUZAIATA":   {"name": "TOURING MOUZAIA",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MADIHA":      {"name": "MADIHA VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MERCUREV":    {"name": "MERCURE VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TURKEYV":     {"name": "TURKEY VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MARHABA":     {"name": "MARHABA VOYAGE",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AOULMANE":    {"name": "TOURING A.OULMANE",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ABASSI":      {"name": "ABASSI VOYAGE",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SMILET":      {"name": "SMILE TOURISME ET VOYAGES",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MECHOUARV":   {"name": "MECHOUAR VOYAGE",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MASCARATA":   {"name": "TOURING MASCARA",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TAKMEEN":     {"name": "WAKALAT TAMKEEN LILSIYAHA WA ASFAR", "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "UZMAN":       {"name": "UZMAN VOYAGES",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BEST-TRIP":   {"name": "BEST TRIP TRAVEL JM",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "JIJELTA":     {"name": "TOURING JIJEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DJELFATA":    {"name": "TOURING DJELFA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ROUIBATA":    {"name": "TOURING ROUIBA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ONATORN":     {"name": "ONAT ORAN",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TIZITA":      {"name": "TOURING TIZI OUZOU",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TINGARTIA":   {"name": "TINGARTIA TRAVEL",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ROSTOM":      {"name": "ROSTOM VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "HELPDESK":    {"name": "HELD DESK",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ANNABA":      {"name": "TOURING ANNABA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NOVELA":      {"name": "NOVELA TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CHEVALB":     {"name": "CHEVAL BLANC VOYAGES",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZEMZEMALG":   {"name": "ZEMZEM ALGER",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CORRECT":     {"name": "CORRECT TOURISME ET VOYAGE",         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MOURAM":      {"name": "MOUAKI BENANI MOURAD",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "WRENCHT":     {"name": "WRENCH TOURISME ET VOYAGE",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DOUNIAT":     {"name": "DOUNIA TRAVEL SERVICE AGENCY",       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZEMZEMORN":   {"name": "ZEMZEM ORAN",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "INTERRIVES":  {"name": "INTERRIVES VOYAGES",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "HOMELAND":    {"name": "HOMELAND AGENCY",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZYOUCEF":     {"name": "TOURING Z.YOUCEF",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BAYRAQV":     {"name": "AL BAYRAQ VOYAGE",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ADDMONDE":    {"name": "ADRESSES DU MONDE",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELDJFINE":    {"name": "SARL EL DJFINE TOUR",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NUAGE":       {"name": "NUAGE TOURS",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MEDEATA":     {"name": "TOURING MEDEA",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "OUKHOUAB":    {"name": "EL OUKHOUA BELMOKHTAR",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PRIVILEGE2":  {"name": "PRIVILEGE TOUR",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PEGASUS":     {"name": "PEGASUS TOURS",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ALQASWAA":    {"name": "AL QASWAA ALGERIE",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BEJAIATA":    {"name": "TOURING BEJAIA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ALTAVAT":     {"name": "ALTAVA TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ANAPIA":      {"name": "ANAPIA TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CHERNINE":    {"name": "CHERNINE TRAVEL",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "HMMA189":     {"name": "Hamama voyages",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "HAMADI":      {"name": "HAMADI TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BIG-PLS":     {"name": "BIG PLEASURE TRAVEL",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CHARME":      {"name": "CHARME VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SIDLINE":     {"name": "SIDLINE TOURS",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TAHARB":      {"name": "TAHAR B",                            "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "CONFIANZA":   {"name": "CONFIANZA TOUR",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ATEMOUCHNT":  {"name": "TOURING A.TEMOUCHENT",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "KALILALAA":   {"name": "KHALIL ALAA TOUR",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ABDELLAH02":  {"name": "ABDELLAH02",                         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SETIF2TA":    {"name": "TOURING SETIF 2",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SPATOURING":  {"name": "SPA TOURING BISKRA",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "VERGERSTA":   {"name": "TOURING VERGERS",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZATCHAPORT":  {"name": "ZATCHAPORT",                         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "FOUNDOQ":     {"name": "Foundoq",                            "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ABDELLAHM":   {"name": "ABDELLAHM",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NUMIDIA":     {"name": "SARL NUMIDIA TRAVEL",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ORANBDF":     {"name": "TOURING ORAN Boudiaf",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PRIVILEGE":   {"name": "PRIVILEGE",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BOOKINGZA":   {"name": "bookingza",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SOUHA":       {"name": "SOUHA TOURS",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "PASSERELLE":  {"name": "PASSERELLE - MOULAI Youcef",         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NESSMAV":     {"name": "NESSMA VOYAGES ET TOURISME",         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TACTILEA":    {"name": "TACTILE AGENCY",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NIRVANAV":    {"name": "NIRVANA VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "SAHOUA":      {"name": "SAHOUA VOYAGES",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "DOUNIAES":    {"name": "DOUNIA ES-SAFAR BLIDA",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TRAVELC":     {"name": "TRAVEL CONSULTING AB",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ABDEDDAIM":   {"name": "ABDEDDAIM VOYAGE",                   "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AWAMT":       {"name": "AWAM TRAVEL",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BOUCHERITT":  {"name": "BOUCHERIT TOURISME",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ELJOURIT":    {"name": "ELJOURI TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MAZOUNAT":    {"name": "MAZOUNA TRAVEL",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MELGOBLD":    {"name": "MELGO TRAVEL AGENCY BLIDA",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHA02":   {"name": "ZAATCHA02 Setif,Algerie",            "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAADR":  {"name": "ZAATCHA ADRAR",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK06":  {"name": "MERBAH FERIEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK10":  {"name": "BEY AMINA HANNANE",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZKDIGITAL":   {"name": "ZAATCHA DIGITAL",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "180":         {"name": "Zaatcha Voyages Kouba",              "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAMOS":  {"name": "ZAATCHA VOYAGES MOSTAGHANEM",        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK03":  {"name": "CHENNOUF Adlane",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK02":  {"name": "BELASLA AMEL",                       "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHATPZ":  {"name": "ZAATCHA TIPAZA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK05":  {"name": "BOUAZIZ Malia",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK07":  {"name": "YAMOUNE Salim",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHASBA":  {"name": "ZAATCHA VOYAGES SIDI BELABBES",      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHARLZ":  {"name": "ZAATCHA VOYAGE RELIZANE",            "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAOD":   {"name": "ZAATCHA OULED DJELLAL VOYAGES",      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "RAMBIA":      {"name": "RAMBI Amel",                         "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHATLG":  {"name": "ZAATCHA VOYAGE TOLGA",               "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHABSK":  {"name": "ZAATCHA BISKRA",                     "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK04":  {"name": "KETEB MEBAREK MAHDI",                "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHAK01":  {"name": "Boutoumou redouane",                 "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHABB":   {"name": "ZAATCHA BADREDINE BOURSAS",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "ZAATCHA01":   {"name": "ZAATCHA01",                          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "MELYNZOV":    {"name": "MELYNZO VOYAGES",                    "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "TASTICT":     {"name": "TASTIC TRAVEL",                      "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "NOMELATA":    {"name": "NOMELATA",                           "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "AQUATERRA":   {"name": "AQUA TERRA TRAVEL",                  "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "BILALT":      {"name": "BILAL TOURISME ET VOYAGES",          "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    "VAIV":        {"name": "VAI VOYAGES",                        "gsa": "Zaatcha", "currency": "DZD", "commission": 0.1,  "active": True},
    # ── NVM (France / Europe) ────────────────────────────────────────────────
    "AS-SAHEL":    {"name": "ASFAR SAHEL, S.L.",                  "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ZAFIRO-TR":   {"name": "ZAFIRO TOURS",                       "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "AFERRY":      {"name": "AFERRY LTD",                         "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "SNCM-IT":     {"name": "SNCM ITALIA SRL",                    "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "FALHI-FR":    {"name": "FALHI VOYAGES",                      "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "MANAVA-TRA":  {"name": "MANAVA TRAVEL",                      "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "LIESSE-NCE":  {"name": "LIESSE VOYAGES NICE",                "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "EL-DJAZAIR":  {"name": "EL-DJAZAIR",                         "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "SALAM-TR":    {"name": "SALAM TOURS",                        "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "IZYSAFAR":    {"name": "IZYSAFAR",                           "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "SNCM-FV":     {"name": "SNCM ITALIA FV",                     "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "NVM-AG":      {"name": "NAVIMED",                            "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "DJEMILA-V":   {"name": "DJEMILA VOYAGES",                    "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "COLOMBES-V":  {"name": "COLOMBES VOYAGES",                   "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ATLAS-VOY":   {"name": "ATLAS VOYAGES",                      "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "MED-VOY":     {"name": "MEDITERRANEE VOYAGES",               "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "LIESSE-MRS":  {"name": "LIESSE VOYAGES MARSEILLE",           "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "HELOISE":     {"name": "HELOISE VOYAGE",                     "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ATLAS-TR":    {"name": "ATLAS TOURS",                        "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "LIESSE-GNB":  {"name": "LIESSE VOYAGES GRENOBLE",            "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "NAJAH-TR":    {"name": "NAJAH TRAVEL",                       "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "TRPARTNAIR":  {"name": "TRAVEL PARTNAIR",                    "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ASFAR-CITY":  {"name": "ASFAR CITY",                         "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "FERRY-HOP":   {"name": "FERRY HOPPER S.A",                   "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ATLAS-TR5":   {"name": "ATLAS TOURS 5",                      "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ATLAS-TR1":   {"name": "ATLAS TOURS 1",                      "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "ATHIS-N7":    {"name": "ATHIS N7 SERVICES",                  "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    "FENSCH-VOY":  {"name": "FENSCH VOYAGES",                     "gsa": "NVM",     "currency": "EUR", "commission": 0.13, "active": True},
    # ── OPS ──────────────────────────────────────────────────────────────────
    "OPS":         {"name": "OCEAN PORTS & SHIPPING",             "gsa": "OPS",     "currency": "EUR", "commission": 0.1,  "active": True},
    # ── Siege (direct) ───────────────────────────────────────────────────────
    "NOURIS":      {"name": "NOURIS ELBAHR MM",                   "gsa": "Siege",   "currency": "DZD", "commission": 0.0,  "active": True},
    "NEBDG":       {"name": "Nouris Elbahr DG",                   "gsa": "Siege",   "currency": "DZD", "commission": 0.0,  "active": True},
    "TESTWEB":     {"name": "TEST WEB",                           "gsa": "Siege",   "currency": "DZD", "commission": 0.0,  "active": True},
    "TEST5":       {"name": "TEST",                               "gsa": "Siege",   "currency": "DZD", "commission": 0.0,  "active": True},
    # ── Website ──────────────────────────────────────────────────────────────
    "WEBAGTEN":    {"name": "Web agent English",                  "gsa": "Website", "currency": "EUR", "commission": 0.0,  "active": True},
}

df_agencies = pd.DataFrame(agencies).T
df_agencies.index.name = "id"
df_agencies.to_excel("../../../Result/Agencies.xlsx")


# ===== SECTION 6 =====
CUSTOM_PIVOT_ORDER = {
    "category_code": [
        "ADL","CHD","INF","DOGK","PS",
        "A2ED","A2E","A4E","A6E","B2I","B4I",
        "BIKE","MOTO","CARH","CARL","CARM",
        "REM3","REM6","TRA1","TRA2",
        "V1U4","V1U5","V1U6","V1U9",
        "V2U4","V2U5","V2U6","V2U9",
        "V3U4","V3U5","V3U6","V3U9",
        "FUEL","FUELV",
        "SECV","PCONV","PORTV","SECP","PCONP","PORTP",
        "TAXH1","TAXH2",
        "AMD","CAN",
    ],
    "category_group_code": ["P", "PR", "K9", "S", "L", "V", "F"],
    "category_group_name": [
        "Passengers",
        "Passengers PROMO RIH",
        "Vehicles",
        "Cabin",
        "Cabin M",
        "Cabin F",
        "Seats",
        "Pets",
        "Seat",
        "PAX avev GVIP",
        "GRATUITE CABINE",
        "Vehicule Gratuite",
    ],
}

custom_category_code_order       = CUSTOM_PIVOT_ORDER["category_code"]
custom_category_group_code_order = CUSTOM_PIVOT_ORDER["category_group_code"]
custom_category_group_name_order = CUSTOM_PIVOT_ORDER["category_group_name"]

used_cols = [
    "Booking code",
    "Created By User",
    "Agent Code",
    "Agent Name",
    "Customer Name",
    "Customer First Name",
    "Booking Created Time",
    "Booking Status",
    "Currency",
    "Category Code",
    "Category Group Code",
    "Category Group Name",
    "Category Specification Code",
    f"Price Excl{vat}",
    "Category Quantity",
    "Payment Balance",
    "Commission",
    "Manual Price",
    "Departure Time",
    "Departure Code",
    "Journey Code",
    "Check-in Date",
    "Check-in User Code",
    "Checked-In",
    "Booking Ref.",
]


# ===== SECTION 7 =====
with tracker.phase("File Discovery", complexity="O(F)"):
    files_list = extract_files_from_one_dir(
        f"../../../Data/SalesReportData{csv_xlsx}/{part_all}/SalesReport{csv_xlsx} {version}{annotation}"
    )
    tracker.record("File Discovery", files_found=len(files_list))

files_list


# ===== SECTION 8 =====
def extract_data(df_booking: pd.DataFrame) -> tuple:
    """
    Aggregate a booking's raw rows into two flat dicts:
      * a detailed record (full category amounts + quantities)
      * a short record (financial KPIs, journey codes, check-in flags)

    Complexity: O(K) — K = number of category codes in the booking.

    Parameters
    ----------
    df_booking : DataFrame
        All rows belonging to a single booking code (aller + retour combined).

    Returns
    -------
    (result, short_result) : tuple[dict, dict]
    """
    # ── 1. General info ──────────────────────────────────────────────────────
    booking_code       = df_booking["Booking code"].iloc[0]
    booking_user       = df_booking["Created By User"].iloc[0]
    booking_agent_code = df_booking["Agent Code"].iloc[0]
    booking_agent_name = df_booking["Agent Name"].iloc[0]

    booking_agent              = agencies.get(booking_agent_code, {})
    booking_agent_gsa          = booking_agent.get("gsa", "")
    booking_agent_gsa_commission = booking_agent.get("commission", 0)

    booking_customer_name       = df_booking["Customer Name"].iloc[0]
    booking_customer_first_name = df_booking["Customer First Name"].iloc[0]
    booking_creation_date       = df_booking["Booking Created Time"].iloc[0]
    booking_status              = df_booking["Booking Status"].iloc[0]
    booking_currency            = df_booking["Currency"].iloc[0]
    booking_agent_currency_missmatched = booking_agent.get("currency", "") != booking_currency
    booking_ref                 = df_booking["Booking Ref."].iloc[0]

    # ── 2. Aggregates ────────────────────────────────────────────────────────
    amounts_by_category_code_aggregate = aggregate_and_sort(
        df=df_booking, index_col="Category Code",
        value_cols=f"Price Excl{vat}", custom_order=custom_category_code_order,
        aggfunc="sum", fill_missing=True, fill_value=0,
    )
    amounts_by_category_group_code_aggregate = aggregate_and_sort(
        df=df_booking, index_col="Category Group Code",
        value_cols=f"Price Excl{vat}", custom_order=custom_category_group_code_order,
        aggfunc="sum", fill_missing=True, fill_value=0,
    )
    quantities_by_category_group_name_aggregate = aggregate_and_sort(
        df=df_booking, index_col="Category Group Name",
        value_cols="Category Quantity", custom_order=custom_category_group_name_order,
        aggfunc="sum", fill_missing=True, fill_value=0,
    )
    if "Fees" in quantities_by_category_group_name_aggregate.index:
        quantities_by_category_group_name_aggregate = quantities_by_category_group_name_aggregate.drop("Fees")

    quantities_dict  = flatten_dict(quantities_by_category_group_name_aggregate.to_dict(), parent_key="qty")
    amounts_code_dict  = flatten_dict(amounts_by_category_code_aggregate.to_dict(),          parent_key="amt_code")
    amounts_group_dict = flatten_dict(amounts_by_category_group_code_aggregate.to_dict(),    parent_key="amt_group")

    # ── 3. Financial summary ─────────────────────────────────────────────────
    total      = df_booking[f"Price Excl{vat}"].sum()
    balance    = df_booking["Payment Balance"].iloc[0]
    commission = df_booking["Commission"].sum()

    manual_price_without_fees = (
        df_booking.loc[
            df_booking["Category Group Code"].isin(["V", "PR", "P", "K9", "L", "S"]),
            "Manual Price",
        ].gt(0).any()
    )
    manual_price_fees = (
        df_booking.loc[
            df_booking["Category Group Code"].eq("F"),
            "Manual Price",
        ].gt(0).any()
    )
    with_vehicle_v = len(
        df_booking[
            (df_booking["Category Group Code"] == "V") &
            (df_booking["Category Code"].str.startswith("V"))
        ]
    )

    if splite_by_departure:
        (booking_depart_date, booking_depart_code,  booking_journey,
        booking_checking_date, booking_checking_user, booking_checking_status) = ("", "", "", "", "", False)

        row = df_booking.iloc[0]
        booking_depart_date, booking_depart_code = row["Departure Time"], row["Departure Code"]
        booking_journey = row["Journey Code"]
        booking_checking_date, booking_aller_checking_user = row["Check-in Date"], row["Check-in User Code"]
        booking_checking_status = df_booking["Checked-In"].any()
      
    else:
         # ── 4. Journey logic (aller / retour) ────────────────────────────────────
        departsTimes = sorted(list(df_booking["Departure Time"].dropna().unique()))

        (booking_aller_depart_date,  booking_aller_depart_code,   booking_aller_journey,
        booking_aller_checking_date, booking_aller_checking_user, booking_aller_checking_status) = ("", "", "", "", "", False)
        (booking_retour_depart_date, booking_retour_depart_code,  booking_retour_journey,
        booking_retour_checking_date, booking_retour_checking_user, booking_retour_checking_status) = ("", "", "", "", "", False)

        if len(departsTimes) == 1:
            if df_booking["Journey Code"].str.startswith(("ALG", "ORN")).any():
                row = df_booking.iloc[0]
                booking_aller_depart_date, booking_aller_depart_code = row["Departure Time"], row["Departure Code"]
                booking_aller_journey = row["Journey Code"]
                booking_aller_checking_date, booking_aller_checking_user = row["Check-in Date"], row["Check-in User Code"]
                booking_aller_checking_status = df_booking["Checked-In"].any()
            elif df_booking["Journey Code"].str.startswith(("MAR", "ALC")).any():
                row = df_booking.iloc[0]
                booking_retour_depart_date, booking_retour_depart_code = row["Departure Time"], row["Departure Code"]
                booking_retour_journey = row["Journey Code"]
                booking_retour_checking_date, booking_retour_checking_user = row["Check-in Date"], row["Check-in User Code"]
                booking_retour_checking_status = df_booking["Checked-In"].any()
        elif len(departsTimes) >= 2:
            df_aller  = df_booking[df_booking["Departure Time"] == departsTimes[0]]
            df_retour = df_booking[df_booking["Departure Time"] == departsTimes[1]]

            booking_aller_depart_date,  booking_aller_depart_code   = df_aller.iloc[0]["Departure Time"],  df_aller.iloc[0]["Departure Code"]
            booking_aller_journey       = df_aller.iloc[0]["Journey Code"]
            booking_aller_checking_date, booking_aller_checking_user = df_aller.iloc[0]["Check-in Date"],  df_aller.iloc[0]["Check-in User Code"]
            booking_aller_checking_status = df_aller["Checked-In"].any()

            booking_retour_depart_date, booking_retour_depart_code  = df_retour.iloc[0]["Departure Time"], df_retour.iloc[0]["Departure Code"]
            booking_retour_journey      = df_retour.iloc[0]["Journey Code"]
            booking_retour_checking_date, booking_retour_checking_user = df_retour.iloc[0]["Check-in Date"], df_retour.iloc[0]["Check-in User Code"]
            booking_retour_checking_status = df_retour["Checked-In"].any()

    if splite_by_departure:
        
        # ── 5. Assemble records ──────────────────────────────────────────────────
        result = {
            "booking_code":                  booking_code,
            "booking_status":                booking_status,
            "created_by":                    booking_user,
            "agent_code":                    booking_agent_code,
            "agent_name":                    booking_agent_name,
            "agent_gsa":                     booking_agent_gsa,
            "customer_last_name":            booking_customer_name,
            "customer_first_name":           booking_customer_first_name,
            "currency":                      booking_currency,
            "booking_created_at":            booking_creation_date,
            "departure_date":                booking_depart_date,
            "departure_location_code":       booking_depart_code,
            "journey_description":           booking_journey,
            "checkin_date":                  booking_checking_date,
            "checkin_user":                  booking_checking_user,
            
            **quantities_dict,
            **amounts_code_dict,
            **amounts_group_dict,
            "total_amount":              total,
            "balance_due":               balance,
            "agent_commission":          commission,
            "manual_price_without_fees": manual_price_without_fees,
            "manual_price_fees":         manual_price_fees,
            "with_vehicle_v":            with_vehicle_v,
            "booking_ref":               booking_ref,
        }
    else:

        # ── 5. Assemble records ──────────────────────────────────────────────────
        result = {
            "booking_code":                  booking_code,
            "booking_status":                booking_status,
            "created_by":                    booking_user,
            "agent_code":                    booking_agent_code,
            "agent_name":                    booking_agent_name,
            "agent_gsa":                     booking_agent_gsa,
            "customer_last_name":            booking_customer_name,
            "customer_first_name":           booking_customer_first_name,
            "currency":                      booking_currency,
            "booking_created_at":            booking_creation_date,
            "aller_departure_date":          booking_aller_depart_date,
            "aller_departure_location_code": booking_aller_depart_code,
            "aller_journey_description":     booking_aller_journey,
            "aller_checkin_date":            booking_aller_checking_date,
            "aller_checkin_user":            booking_aller_checking_user,
            "retour_departure_date":         booking_retour_depart_date,
            "retour_departure_location_code":booking_retour_depart_code,
            "retour_journey_description":    booking_retour_journey,
            "retour_checkin_date":           booking_retour_checking_date,
            "retour_checkin_user":           booking_retour_checking_user,
            **quantities_dict,
            **amounts_code_dict,
            **amounts_group_dict,
            "total_amount":              total,
            "balance_due":               balance,
            "agent_commission":          commission,
            "manual_price_without_fees": manual_price_without_fees,
            "manual_price_fees":         manual_price_fees,
            "with_vehicle_v":            with_vehicle_v,
            "booking_ref":               booking_ref,
        }
    
    count_p = df_booking[(df_booking["Category Group Code"] == "P")]["Category Quantity"].sum()
    count_p_rih = df_booking[(df_booking["Category Group Code"] == "PR")]["Category Quantity"].sum()
    
    count_vt = df_booking[
        (df_booking["Category Code"].isin(["CARL"]))
    ]["Category Quantity"].sum()
    
    count_vc = df_booking[
        (df_booking["Category Group Code"].isin(["CARM", "CARH"]))
    ]["Category Quantity"].sum()
    
    
    count_va = df_booking[
        (df_booking["Category Group Code"] == "V") &
        (~df_booking["Category Code"].isin(["CARL", "CARM", "CARH"]))
    ]["Category Quantity"].sum()
    
    count_c = quantities_dict.get("qty_Cabin", 0)
    count_l = quantities_dict.get("qty_Cabin M", 0) + quantities_dict.get("qty_Cabin F", 0)
    count_f = quantities_dict.get("qty_Seats", 0)
    
    
    # Extract values safely
    amt_group_p = amounts_group_dict.get("amt_group_P", 0)
    amt_group_pr = amounts_group_dict.get("amt_group_PR", 0)
    amt_group_k9 = amounts_group_dict.get("amt_group_K9", 0)
    amt_group_v = amounts_group_dict.get("amt_group_V", 0)
    
    amt_group_c = df_booking[
        (df_booking["Category Group Name"] == "Cabin")
    ][f"Price Excl{vat}"].sum()
    
    amt_group_l = df_booking[
        (df_booking["Category Group Name"].isin(["Cabin M","Cabin F"]))
    ][f"Price Excl{vat}"].sum()
    amt_group_s = amounts_group_dict.get("amt_group_S", 0)

    # Calculate sums
    ht_p = amt_group_p + amt_group_pr
    ht_a = amt_group_k9
    ht_v = amt_group_v
    ht_c = amt_group_c 
    ht_l = amt_group_l 
    ht_f = amt_group_s
    

    # Extract values safely using get() with default 0
    amt_fuel_v = amounts_code_dict.get("amt_code_FUELV", 0)
    amt_fuel = amounts_code_dict.get("amt_code_FUEL", 0)
    amt_sec_p = amounts_code_dict.get("amt_code_SECP", 0)
    amt_pcon_p = amounts_code_dict.get("amt_code_PCONP", 0)
    amt_port_p = amounts_code_dict.get("amt_code_PORTP", 0)
    amt_sec_v = amounts_code_dict.get("amt_code_SECV", 0)
    amt_pcon_v = amounts_code_dict.get("amt_code_PCONV", 0)
    amt_port_v = amounts_code_dict.get("amt_code_PORTV", 0)
    amt_tax_h1 = amounts_code_dict.get("amt_code_TAXH1", 0)
    amt_tax_h2 = amounts_code_dict.get("amt_code_TAXH2", 0)
    amt_amd = amounts_code_dict.get("amt_code_AMD", 0)
    amt_can = amounts_code_dict.get("amt_code_CAN", 0)

    # Calculate sums for output
    frais_passagers = amt_sec_p + amt_pcon_p + amt_port_p
    frais_vehicule = amt_sec_v + amt_pcon_v + amt_port_v
    frais_hauteur = amt_tax_h1 + amt_tax_h2

    # Calculate HT (excluding tax)
    ht = total - (amt_fuel + amt_sec_p + amt_pcon_p + amt_port_p + 
                amt_fuel_v + amt_sec_v + amt_pcon_v + amt_port_v + 
                amt_tax_h1 + amt_tax_h2 + amt_amd + amt_can)
    
    ht_x = round(ht - ht_p - ht_a - ht_v - ht_i,0)

    # Calculate commission
    calculated_commission = round(
        (amt_tax_h1 + amt_tax_h2 + amt_amd + amt_can + ht) * booking_agent_gsa_commission,
        2
    )

    # Calculate commission difference
    commission_diff = round(commission - calculated_commission, 2)

    if splite_by_departure:
        
        # Build result dictionary
        short_result = {
            "Code reservation": booking_code,
            "Statut reservation": booking_status,
            "Cree par": booking_user,
            "Date creation": booking_creation_date,
            "Code agent": booking_agent_code,
            "Nom agent": booking_agent_name,
            "GSA agent": booking_agent_gsa,
            "GSA commission agent": booking_agent_gsa_commission,
            "Nom client": booking_customer_name,
            "Prenom client": booking_customer_first_name,
            "Nombre passagers":count_p,
            "Nombre passagers RIH":count_p_rih,
            "Nombre véhicules touristique":count_vt,
            "Nombre véhicules commercial":count_vc,
            "Nombre d'autre véhicules":count_va,
            "Nombre cabine":count_c,
            "Nombre lit":count_l,
            "Nombre fauteuil":count_f,
            "Reference": booking_ref,
            
            "Code depart": booking_depart_code,
            "Check-in": booking_checking_status,
            
            "Devise": booking_currency,
            
            "Montant HT Passagers":ht_p,
            "Montant HT Véhicule":ht_v,
            "Montant HT Installation Cabin":ht_c,
            "Montant HT Installation Lit":ht_l,
            "Montant HT Installation Fauteuil":ht_f,
            "Montant HT Animaux et extra":ht_a,
            "Montant HT Autres":ht_x,
            
            "Montant Frais carburant vehicule": amt_fuel_v,
            "Montant Frais carburant": amt_fuel,
            "Montant Frais passagers": frais_passagers,
            "Montant Frais vehicule": frais_vehicule,
            "Montant Frais hauteur": frais_hauteur,
            "Montant Frais modification": amt_amd,
            "Montant Frais annulation": amt_can,
            
            "Montant HT": ht,
            "Montant TTC": total,
            "Solde restant du": balance,
            "Commission agent": commission,
            "Commission calculer agent": calculated_commission,
            "Commission diff agent": commission_diff,
            "Tarif manuel HT": manual_price_without_fees,
            "Tarif manuel Frais": manual_price_fees,
            "Devise incompatible": booking_agent_currency_missmatched,
        }
    else:
        # Build result dictionary
        short_result = {
            "Code reservation": booking_code,
            "Statut reservation": booking_status,
            "Cree par": booking_user,
            "Date creation": booking_creation_date,
            "Code agent": booking_agent_code,
            "Nom agent": booking_agent_name,
            "GSA agent": booking_agent_gsa,
            "GSA commission agent": booking_agent_gsa_commission,
            "Nom client": booking_customer_name,
            "Prenom client": booking_customer_first_name,
            "Nombre passagers":count_p,
            "Nombre passagers RIH":count_p_rih,
            "Nombre véhicules touristique":count_vt,
            "Nombre véhicules commercial":count_vc,
            "Nombre d'autre véhicules":count_va,
            "Nombre cabine":count_c,
            "Nombre lit":count_l,
            "Nombre fauteuil":count_f,
            "Reference": booking_ref,
            "Code depart aller": booking_aller_depart_code,
            "Check-in aller": booking_aller_checking_status,
            "Code depart retour": booking_retour_depart_code,
            "Check-in retour": booking_retour_checking_status,
            "Devise": booking_currency,
            
            "Montant HT Passagers":ht_p,
            "Montant HT Véhicule":ht_v,
            "Montant HT Installation Cabin":ht_c,
            "Montant HT Installation Lit":ht_l,
            "Montant HT Installation Fauteuil":ht_f,
            "Montant HT Animaux et extra":ht_a,
            "Montant HT Autres":ht_x,
            
            "Frais carburant vehicule": amt_fuel_v,
            "Frais carburant": amt_fuel,
            "Frais passagers": frais_passagers,
            "Frais vehicule": frais_vehicule,
            "Frais hauteur": frais_hauteur,
            "Frais modification": amt_amd,
            "Frais annulation": amt_can,
            
            "Montant HT": ht,
            "Montant TTC": total,
            "Solde restant du": balance,
            "Commission agent": commission,
            "Commission calculer agent": calculated_commission,
            "Commission diff agent": commission_diff,
            "Tarif manuel HT": manual_price_without_fees,
            "Tarif manuel Frais": manual_price_fees,
            "Devise incompatible": booking_agent_currency_missmatched,
        }

    return result, short_result


# ===== SECTION 9 =====
# =====================================================================
# MAIN PROCESS — Complexity: O(N * B * K)
#   N = number of source files
#   B = bookings per file (varies)
#   K = distinct category codes per booking (bounded by CUSTOM_PIVOT_ORDER)
# =====================================================================
full_data       = []
full_data_short = []

with tracker.phase("Data Extraction", complexity="O(N·B·K)"):
    total_raw_rows = 0
    total_bookings = 0

    for idx, f in enumerate(files_list, 1):
        logger.info("[%d/%d] %s", idx, len(files_list), Path(f).name)

        if csv_xlsx == "xlsx":
            df = pd.read_excel(f, usecols=used_cols, low_memory=False)
        else:
            df = pd.read_csv(f, sep=";", usecols=used_cols, low_memory=False)

        df["Category Group Name"] = (
            df["Category Group Name"].fillna("") + " " +
            df["Category Specification Code"].fillna("")
        ).str.strip()

        if only_checked_in:
            df = df[df["Checked-In"] == True].copy()

        raw_rows      = len(df)
        total_raw_rows += raw_rows
        file_bookings = 0
        


        for code in df["Booking code"].unique():
            df_booking   = df[df["Booking code"] == code]
            
            if splite_by_departure:
                depart_times = list(df_booking["Departure Time"].dropna().unique())
                if(len(depart_times) < 2):
                    df_independent = df_booking[~df_booking["Departure Time"].isin(depart_times)]
                    df_dependent   = df_booking[ df_booking["Departure Time"].isin(depart_times)]

                    combined = (
                        pd.concat([df_dependent, df_independent])
                        if len(df_dependent) > 0
                        else df_independent
                    )

                    data, data_short = extract_data(combined)
                    full_data.append(data)
                    full_data_short.append(data_short)
                    file_bookings += 1
                else:
                    # Fill missing Departure Time with the most common departure time
                    df_booking_filled = df_booking.copy()
                    
                    # Convert all to string to avoid type issues
                    df_booking_filled["Departure Time"] = df_booking_filled["Departure Time"].astype(str)
                    
                    # Replace 'nan' string with actual NaN
                    df_booking_filled["Departure Time"] = df_booking_filled["Departure Time"].replace('nan', pd.NA)
                    
                    # Fill with the mode (most frequent value) or first non-null
                    mode_value = df_booking_filled["Departure Time"].mode()
                    if len(mode_value) > 0:
                        fill_value = mode_value[0]
                    else:
                        fill_value = "00:00"
                    
                    df_booking_filled["Departure Time"] = df_booking_filled["Departure Time"].fillna(fill_value)
                    
                    # Get unique departure times for splitting
                    unique_depart_times = df_booking_filled["Departure Time"].unique()
                
                    
                    # Process each departure time group
                    for depart_time in unique_depart_times:
                        df_dependent = df_booking_filled[df_booking_filled["Departure Time"] == depart_time]
                        
                        data, data_short = extract_data(df_dependent)
                        full_data.append(data)
                        full_data_short.append(data_short)
                        file_bookings += 1
                
            else:
                depart_times = list(df_booking["Departure Time"].dropna().unique())
                df_independent = df_booking[~df_booking["Departure Time"].isin(depart_times)]
                df_dependent   = df_booking[ df_booking["Departure Time"].isin(depart_times)]

                combined = (
                    pd.concat([df_dependent, df_independent])
                    if len(df_dependent) > 0
                    else df_independent
                )

                data, data_short = extract_data(combined)
                full_data.append(data)
                full_data_short.append(data_short)
                file_bookings += 1

        total_bookings += file_bookings
        logger.info("  └→ %d raw rows | %d bookings", raw_rows, file_bookings)

    tracker.record(
        "Data Extraction",
        files_processed=len(files_list),
        total_raw_rows=total_raw_rows,
        total_bookings=total_bookings,
        avg_rows_per_booking=round(total_raw_rows / max(total_bookings, 1), 2),
    )
    logger.info(
        "Extraction complete — %d bookings from %d raw rows",
        total_bookings, total_raw_rows,
    )


# ===== SECTION 10 =====
with tracker.phase("Export — Short Report", complexity="O(B·C)"):
    df_short_final = pd.DataFrame(full_data_short)

    if splite_by_departure:
        out_short = (
            Path("../../../Result/SalesReportData") / part_all
            / f"SalesReport Splited Short {version}{annotation}.xlsx"
        )
    else:
        out_short = (
            Path("../../../Result/SalesReportData") / part_all
            / f"SalesReport Combined Short {version}{annotation}.xlsx"
        )
    out_short.parent.mkdir(parents=True, exist_ok=True)
    df_short_final.to_excel(out_short, index=False)

    tracker.record(
        "Export — Short Report",
        rows=len(df_short_final),
        columns=len(df_short_final.columns),
        file=out_short.name,
    )
    logger.info("Short report → %s  (%d rows)", out_short.name, len(df_short_final))


# ===== SECTION 11 =====
if short_detailed == "detailed":
    with tracker.phase("Export — Detailed Report", complexity="O(B·C)"):
        df_final = pd.DataFrame(full_data)

        financial_cols = [
            "total_amount", "balance_due", "agent_commission",
            "manual_price_without_fees", "manual_price_fees", "with_vehicle_v",
        ]
        ordered_cols    = [c for c in df_final.columns if c not in financial_cols] + financial_cols
        df_final        = df_final[ordered_cols]

        zero_cols       = [
            c for c in df_final.columns
            if c.startswith(("amt_group", "amt_code", "qty")) and df_final[c].sum() == 0
        ]
        df_final_filtered = df_final.drop(columns=zero_cols)

        if splite_by_departure:
            out_detailed = (
                Path("../../../Result/SalesReportData") / part_all
                / f"SalesReport Splited {version}{annotation}.xlsx"
            )
        else:
            out_detailed = (
                Path("../../../Result/SalesReportData") / part_all
                / f"SalesReport Combined {version}{annotation}.xlsx"
            )
        out_detailed.parent.mkdir(parents=True, exist_ok=True)
        df_final_filtered.to_excel(out_detailed, index=False)

        tracker.record(
            "Export — Detailed Report",
            rows=len(df_final_filtered),
            columns=len(df_final_filtered.columns),
            zero_cols_dropped=len(zero_cols),
            file=out_detailed.name,
        )
        logger.info("Detailed report → %s", out_detailed.name)


# ===== SECTION 12 =====
def generate_invoice_report(
    df_source: pd.DataFrame,
    part_all: str,
    version: str,
    annotation: str = "",
) -> None:
    """
    Build the invoicing workbook (3 sheets):
      - Facture       : all bookings, no case flags
      - Filtre_Controle: bookings flagged as test / waiting-list / direction
      - Totaux        : pivot by GSA x currency

    Complexity: O(B log B) — dominated by pivot_table sort.
    """
    df = df_source.copy()
    df["Nom client"]    = df["Nom client"].fillna("")
    df["Prenom client"] = df["Prenom client"].fillna("")
    df_remaining        = df.copy()
    
    if(splite_by_departure):
        cond_not_checked = ~df_remaining["Check-in"]
    else:
        cond_not_checked = ~df_remaining["Check-in aller"] & ~df_remaining["Check-in retour"]

    # ── Case 1: Test bookings ────────────────────────────────────────────────
    test_pattern = (
        r"(?i)^((test|tes|tst|teste|testing|etst|testx|tesqt|teset|teqt|cas|carpack|ok)"
        r"(\s(test|tes|tst|teste|testing|etst|testx|tesqt|teset|teqt|cas|carpack|ok))?"
        r"|([a-z])\5{1,}(\s([a-z])\7{1,})?|\. \.)$"
    )
    df_remaining["Cas de test"] = (
        (
            (df_remaining["Nom client"] + df_remaining["Prenom client"]).str.strip().eq("")
            | df_remaining["Nom client"].str.contains(test_pattern, na=False)
            | df_remaining["Prenom client"].str.contains(test_pattern, na=False)
            | df_remaining["Code agent"].isin(["TEST5", "TESTWEB"])
        ) & cond_not_checked
    )

    # ── Case 2: Waiting-list bookings ────────────────────────────────────────
    liste_pattern = r"(?i)liste(?:\s+d['\s]?attente(?:\s+\w+)?)?"
    df_remaining["Cas de liste dattente"] = (
        (
            df_remaining["Nom client"].str.contains(liste_pattern, na=False)
            | df_remaining["Prenom client"].str.contains(liste_pattern, na=False)
        ) & cond_not_checked
    )

    # ── Case 3: Direction generale ───────────────────────────────────────────
    direction_pattern = r"(?i)direction(?:\s+generale)?"
    df_remaining["Cas de direction generale"] = (
        (
            df_remaining["Nom client"].str.contains(direction_pattern, na=False)
            | df_remaining["Prenom client"].str.contains(direction_pattern, na=False)
        ) & cond_not_checked
    )

    case_columns = ["Cas de test", "Cas de liste dattente", "Cas de direction generale"]

    df_facture = df_remaining.drop(columns=case_columns, errors="ignore")

    df_remaining["has_any_case"] = df_remaining[case_columns].any(axis=1)
    df_controle = df_remaining.loc[df_remaining["has_any_case"]].copy()

    # ── Totaux pivot ─────────────────────────────────────────────────────────
    df_sans_test = df_remaining[~df_remaining["has_any_case"]].copy()
    df_sans_test["Solde_pos"] = df_sans_test["Solde restant du"].clip(lower=0)
    df_sans_test["Solde_neg"] = df_sans_test["Solde restant du"].clip(upper=0)
    df_sans_test["GSA_final"] = np.where(
        df_sans_test["GSA agent"] == "Siege",
        df_sans_test["Cree par"],
        df_sans_test["GSA agent"],
    )

    metrics_order = ["Montant TTC", "Commission agent", "Commission calculer agent", "Solde_pos", "Solde_neg"]
    result = df_sans_test.pivot_table(
        index="GSA_final", columns="Devise", values=metrics_order, aggfunc="sum", fill_value=0
    )
    result = result.swaplevel(0, 1, axis=1)
    currencies = result.columns.get_level_values(0).unique()
    result = result.reindex(columns=pd.MultiIndex.from_product([currencies, metrics_order]))
    result.columns = [f"{cur}_{met}" for cur, met in result.columns]
    result = result.reset_index()

    # ── Export ───────────────────────────────────────────────────────────────
    base = Path("../../../Result/SalesReportData") / part_all
    base.mkdir(parents=True, exist_ok=True)
    if(splite_by_departure):
        out = base / f"SalesReport Splited Invoice {version}{annotation}.xlsx"    
    else:
        out = base / f"SalesReport Combined Invoice {version}{annotation}.xlsx"

    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        df_facture.to_excel(writer,  sheet_name="Facture",         index=False)
        df_controle.to_excel(writer, sheet_name="Filtre_Controle", index=False)
        result.to_excel(writer,      sheet_name="Totaux",          index=False)

    logger.info("Invoice report → %s", out.name)
    logger.info(
        "  Facture: %d rows | Filtre_Controle: %d rows | Totaux: %d rows",
        len(df_facture), len(df_controle), len(result),
    )
    for col in case_columns:
        logger.info("  %-30s: %d", col, df_remaining[col].sum())


# ===== SECTION 13 =====
with tracker.phase("Invoice Report", complexity="O(B log B)"):
    generate_invoice_report(
        df_short_final,
        part_all=part_all,
        version=version,
        annotation=annotation,
    )
    tracker.record("Invoice Report", input_rows=len(df_short_final))


# ===== SECTION 14 =====
def generate_invoice_control_report(
    df_source: pd.DataFrame,
    part_all: str,
    version: str,
    annotation: str = "",
) -> None:
    """
    Flag bookings with financial anomalies (positive/negative balance,
    zero commission, commission diff, missing fuel fee).

    Complexity: O(B) — single-pass boolean column creation.
    """
    df = df_source.copy()

    df["Solde positif"]        = df["Solde restant du"] > 0
    df["Solde negatif"]        = df["Solde restant du"] < 0
    df["Commission nulle"]     = (df["Commission agent"] == 0) & (df["GSA agent"] != "Siege")
    df["Commission differente"]= df["Commission diff agent"] != 0
    df["Sans frais"]           = ((df["Frais carburant"] == 0)&(df["Frais vehicule"] == 0)&(df["Frais passagers"] == 0)) & (df["Statut reservation"] != "CAN")

    case_columns = ["Solde positif", "Solde negatif", "Commission nulle", "Commission differente", "Sans frais"]
    df["has_any_case"] = df[case_columns].any(axis=1)

    # BUG FIX: original discarded the drop result; now assigned back
    df_control = df.loc[df["has_any_case"]].drop(columns=["has_any_case"])

    base = Path("../../../Result/SalesReportData") / part_all
    base.mkdir(parents=True, exist_ok=True)
    if(splite_by_departure):
        out = base / f"SalesReport Splited Invoice Control {version}{annotation}.xlsx"
    else:
        out = base / f"SalesReport Combined Invoice Control {version}{annotation}.xlsx"

    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        df_control.to_excel(writer, sheet_name="Control", index=False)

    logger.info("Invoice control report → %s  (%d flagged rows)", out.name, len(df_control))
    for col in case_columns:
        logger.info("  %-30s: %d", col, df[col].sum())


# ===== SECTION 15 =====
with tracker.phase("Invoice Control Report", complexity="O(B)"):
    generate_invoice_control_report(
        df_short_final,
        part_all=part_all,
        version=version,
        annotation=annotation,
    )
    tracker.record("Invoice Control Report", input_rows=len(df_short_final))


# ===== SECTION 16 =====
def generate_control_report(df_source: pd.DataFrame, output_path) -> None:
    """
    ACD anomaly detection + same-journey + currency-mismatch + manual-price checks.
    Exports one sheet per anomaly category (skips empty sheets).

    Complexity: O(B) — vectorised boolean masks.
    """
    df     = df_source.copy()
    if(splite_by_departure):

        # ── Currency mismatch ────────────────────────────────────────────────────
        df_bookingrency = df.loc[df["Devise incompatible"].fillna(False)]

        # ── Manual price ─────────────────────────────────────────────────────────
        df_manual = df.loc[df["Tarif manuel Frais"].fillna(False) | df["Tarif manuel HT"].fillna(False)]

        # ── Export ───────────────────────────────────────────────────────────────
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        sheets = {
            "Devise_Incompatible": df_bookingrency,
            "Tarif_Manuel":        df_manual,
        }
    else:
        aller  = df["Code depart aller"].fillna("").astype(str)
        retour = df["Code depart retour"].fillna("").astype(str)

        # ── ACD: DZD + ALC/MAR port prefix ──────────────────────────────────────
        acd_mask = df["Devise"].eq("DZD") & (
            aller.str.startswith(("ALC", "MAR")) | retour.str.startswith(("ALC", "MAR"))
        )
        df_acd = df.loc[acd_mask]

        has_ref      = df_acd["Reference"].notna() & df_acd["Reference"].ne("")
        ref_counts   = df_acd.loc[has_ref, "Reference"].value_counts()
        dup_refs     = ref_counts[ref_counts.gt(1)].index
        uniq_refs    = ref_counts[ref_counts.eq(1)].index

        df_acd_dup   = df_acd.loc[has_ref & df_acd["Reference"].isin(dup_refs)]
        df_acd_uniq  = df_acd.loc[has_ref & df_acd["Reference"].isin(uniq_refs)]
        df_acd_noref = df_acd.loc[~has_ref]

        # ── Same journey (aller prefix == retour prefix) ─────────────────────────
        same_mask = (
            aller.ne("") & retour.ne("")
            & aller.str[:3].str.upper().eq(retour.str[:3].str.upper())
        )
        df_same = df.loc[same_mask]

        # ── Currency mismatch ────────────────────────────────────────────────────
        df_bookingrency = df.loc[df["Devise incompatible"].fillna(False)]

        # ── Manual price ─────────────────────────────────────────────────────────
        df_manual = df.loc[df["Tarif manuel Frais"].fillna(False) | df["Tarif manuel HT"].fillna(False)]

        # ── Export ───────────────────────────────────────────────────────────────
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        sheets = {
            "Cas_ACD_Ref_Doublon": df_acd_dup,
            "Cas_ACD_Ref_Unique":  df_acd_uniq,
            "Cas_ACD_Sans_Ref":    df_acd_noref,
            "Meme_Trajet":         df_same,
            "Devise_Incompatible": df_bookingrency,
            "Tarif_Manuel":        df_manual,
        }

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for sheet_name, sheet_df in sheets.items():
            if not sheet_df.empty:
                sheet_df.to_excel(writer, sheet_name=sheet_name, index=False)

    logger.info("Control report → %s", output_path.name)
    for name, sdf in sheets.items():
        logger.info("  %-26s: %d rows", name, len(sdf))


# ===== SECTION 17 =====
with tracker.phase("ACD/Anomaly Control Reports", complexity="O(B)"):
    df_nouris = df_short_final.loc[df_short_final["GSA agent"].eq("Siege")].copy()
    df_gsa    = df_short_final.loc[df_short_final["GSA agent"].ne("Siege")].copy()
    
    base = Path("../../../Result/SalesReportData") / part_all
    if(splite_by_departure):
        generate_control_report(df_nouris, base / f"SalesReport Splited Control Nouris {version}{annotation}.xlsx")
        generate_control_report(df_gsa,    base / f"SalesReport Splited Control Gsa {version}{annotation}.xlsx")
    else:
        generate_control_report(df_nouris, base / f"SalesReport Combined Control Nouris {version}{annotation}.xlsx")
        generate_control_report(df_gsa,    base / f"SalesReport Combined Control Gsa {version}{annotation}.xlsx")

    tracker.record(
        "ACD/Anomaly Control Reports",
        siege_bookings=len(df_nouris),
        gsa_bookings=len(df_gsa),
    )


# ===== SECTION 18 =====
# # ── Print formal technical summary ───────────────────────────────────────────
# print(tracker.summary())

# # ── Export execution metadata as JSON alongside the reports ──────────────────
# meta_out = (
#     Path("../../../Result/SalesReportData") / part_all
#     / f"SalesReport Execution Metadata {version}{annotation}.json"
# )
# meta_out.parent.mkdir(parents=True, exist_ok=True)
# tracker.export_json(meta_out)

