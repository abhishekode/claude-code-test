---
name: exam-predictor
description: >
  Analyze past exam question papers (PDFs) to predict upcoming exam topics using Gemini AI.
  TRIGGER THIS SKILL whenever the user says: "analyze exam papers", "predict exam topics",
  "run exam predictor", "analyze papers in folder", or places PDF files in the /exam-papers/
  folder and asks for analysis or predictions. This skill reads all PDFs from a designated
  input folder, extracts text using Node.js, calls the Gemini API, and writes a structured
  ANALYSIS_RESULTS.md file with topic frequency, confidence-scored predictions, and study tips.
  Use this skill even if the user just says "analyze my papers" or "what topics will come in exam".
---

# Exam Predictor Skill

Analyzes 3–10 years of past exam question papers (PDFs) and predicts the most likely topics
for the upcoming exam. Uses **TypeScript scripts + Gemini API**. Outputs `ANALYSIS_RESULTS.md`.

---

## Workflow Overview

```
/exam-papers/          ← User drops PDFs here
      ↓
[Step 1] Install deps (npm) + validate .env
      ↓
[Step 2] Extract text from each PDF  →  scripts/extract.ts
      ↓
[Step 3] Clean extracted text        →  scripts/clean.ts
      ↓
[Step 4] Call Gemini API             →  scripts/analyze.ts
      ↓
[Step 5] Generate report             →  scripts/report.ts
      ↓
ANALYSIS_RESULTS.md    ← Final output
```

---

## Step 1 — Setup & Validate

Check the `exam-papers/` folder exists and has PDFs:

```bash
ls exam-papers/*.pdf 2>/dev/null | wc -l
```

If no PDFs found, tell user:
> "Please place your exam question paper PDFs in the `./exam-papers/` folder, then run again."

Install dependencies:

```bash
npm install pdf-parse tesseract.js @google/genai dotenv tsx --save-dev
```

Check for `.env` file or env variable:

```bash
cat .env 2>/dev/null | grep GEMINI_API_KEY || echo $GEMINI_API_KEY
```

If missing, tell user:
> "Please set your Gemini API key. Either:
> 1. Copy `.env.example` to `.env` and fill in your key: `cp .env.example .env`
> 2. Or export in terminal: `export GEMINI_API_KEY=your_key_here`
> Get your free key at: https://aistudio.google.com/app/apikey"

---

## Step 2 — Extract Text

```bash
npx tsx scripts/extract.ts ./exam-papers ./extracted-texts
```

This creates one `.txt` per PDF in `./extracted-texts/`.

Show user output like:
```
✅ 2021_Paper.pdf → 3,102 chars
✅ 2022_Paper.pdf → 2,847 chars
⚠️  2023_Scan.pdf → empty (scanned — trying OCR...)
✅ 2023_Scan.pdf → OCR: 2,210 chars
```

---

## Step 3 — Clean Text

```bash
npx tsx scripts/clean.ts ./extracted-texts ./cleaned-texts
```

Removes headers, footers, page numbers, OCR noise from each file.

---

## Step 4 — Analyze with Gemini API

Ask the user for the exam name if not already provided:
> "What is the name of this exam? (e.g., GATE CS, UPSC Prelims, JEE Mains)"

```bash
npx tsx scripts/analyze.ts ./cleaned-texts "GATE CS" ./gemini_response.json
```

Reads `GEMINI_API_KEY` from `.env` file automatically (via dotenv).
Concatenates all cleaned texts and sends to Gemini (`gemini-2.0-flash` model).
Saves structured JSON response to `gemini_response.json`.

---

## Step 5 — Generate Report

```bash
npx tsx scripts/report.ts ./gemini_response.json ./ANALYSIS_RESULTS.md
```

Generates the final readable markdown report.

---

## Error Handling

| Error | Action |
|-------|--------|
| No PDFs in folder | Stop, tell user to add PDFs |
| PDF extraction empty | Auto-try OCR via tesseract.js |
| GEMINI_API_KEY missing | Stop, show .env setup instructions |
| Gemini returns non-JSON | Retry once with stricter system instruction |
| Less than 2 papers | Warn: predictions may be unreliable |

---

## Files Created During Run

```
.env                   ← API key (user creates from .env.example)
./extracted-texts/     ← Raw text per PDF
./cleaned-texts/       ← Cleaned text per PDF
./gemini_response.json ← Raw Gemini API response
./ANALYSIS_RESULTS.md  ← Final output ← READ THIS
```