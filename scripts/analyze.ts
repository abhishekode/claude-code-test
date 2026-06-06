/**
 * analyze.ts
 * Sends cleaned exam paper texts to Gemini API for topic analysis and prediction.
 * Usage: npx tsx scripts/analyze.ts ./cleaned-texts "GATE CS" ./gemini_response.json
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load .env file from project root
dotenv.config();

const [, , inputDir, examName, outputFile] = process.argv;

if (!inputDir || !examName || !outputFile) {
    console.error(
        'Usage: npx tsx scripts/analyze.ts <cleaned-texts-dir> "Exam Name" <output.json>'
    );
    process.exit(1);
}

// Check API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error(`\n❌ GEMINI_API_KEY not set!\n`);
    console.error(`Option 1 — add to your .env file:`);
    console.error(`  GEMINI_API_KEY=your_key_here\n`);
    console.error(`Option 2 — export in terminal:`);
    console.error(`  export GEMINI_API_KEY=your_key_here\n`);
    console.error(`Get your free key at: https://aistudio.google.com/app/apikey`);
    process.exit(1);
}

const GEMINI_MODEL = process.env.GEMINI_MODEL as string;
if (!GEMINI_MODEL) {
    console.error(`\n❌ GEMINI_MODEL not set!\n`);
    console.error(`Option 1 — add to your .env file:`);
    console.error(`  GEMINI_MODEL=your_model_here\n`);
    console.error(`Option 2 — export in terminal:`);
    console.error(`  export GEMINI_MODEL=your_model_here\n`);
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function loadCleanedTexts(dir: string): Record<string, string> {
    const texts: Record<string, string> = {};
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();

    for (const filename of files) {
        const label = path.parse(filename).name;
        texts[label] = fs.readFileSync(path.join(dir, filename), "utf-8");
    }

    return texts;
}

function buildPrompt(examName: string, texts: Record<string, string>): string {
    const years = Object.keys(texts);
    const combined = Object.entries(texts)
        .map(([label, content]) => `${"=".repeat(50)}\nPAPER: ${label}\n${"=".repeat(50)}\n${content}`)
        .join("\n\n");

    return `You are an expert exam pattern analyzer. Analyze these past question papers from "${examName}" covering ${years.length} year(s): ${years.join(", ")}.

Return ONLY a valid JSON object — no markdown, no explanation, just raw JSON:

{
  "exam_name": "${examName}",
  "papers_analyzed": ${years.length},
  "years_covered": ${JSON.stringify(years)},
  "recurring_topics": [
    {
      "topic": "specific topic name",
      "count": 0,
      "years_appeared": ["2020", "2021"],
      "subtopics": ["specific sub-area 1", "specific sub-area 2"]
    }
  ],
  "predictions": [
    {
      "rank": 1,
      "topic": "specific topic name",
      "confidence": 85,
      "confidence_reason": "1-2 sentence explanation",
      "common_question_type": "MCQ / Problem-solving / Short Answer / Essay",
      "study_tip": "one specific actionable tip"
    }
  ],
  "topics_declining": [
    {
      "topic": "topic name",
      "reason": "why it is fading out"
    }
  ],
  "overall_insight": "2-3 sentence summary of exam trend"
}

Rules:
- recurring_topics: top 10, sorted by count descending
- predictions: exactly 5, ranked 1-5 by likelihood, confidence as integer 0-100
- topics_declining: up to 3 topics that appeared in older papers but not recent ones
- Be specific — not "Mathematics" but "Differential Equations" or "Linear Algebra"
- Only return the JSON object, nothing else

===== PAPER TEXTS =====

${combined}`;
}

function parseJsonFromResponse(text: string): object {
    const cleaned = text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");

    try {
        return JSON.parse(cleaned);
    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Could not parse JSON from Gemini response");
    }
}

async function main() {
    console.log(`\n📂 Loading cleaned texts from: ${inputDir}`);
    const texts = loadCleanedTexts(inputDir);

    if (Object.keys(texts).length === 0) {
        console.error(`❌ No .txt files found in ${inputDir}`);
        process.exit(1);
    }

    console.log(`✅ Loaded ${Object.keys(texts).length} paper(s): ${Object.keys(texts).join(", ")}`);

    const prompt = buildPrompt(examName, texts);

    console.log(`\n🤖 Sending to Gemini API...`);
    console.log(`   Exam: ${examName}`);
    console.log(`   Papers: ${Object.keys(texts).length}`);
    console.log(`   Prompt size: ${prompt.length.toLocaleString()} chars`);
    console.log(`   Please wait...\n`);

    let result: object;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });

        const rawText = response.text ?? "";

        console.log(`📊 Parsing Gemini response...`);
        result = parseJsonFromResponse(rawText);

    } catch (err: any) {
        // If JSON parsing fails, retry with stricter system instruction
        if (err.message?.includes("JSON")) {
            console.warn(`⚠️  JSON parse failed, retrying with stricter prompt...`);

            const retryResponse = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                    systemInstruction:
                        "You are a JSON-only API. Respond with ONLY a valid JSON object. No text before or after. No markdown. No explanation.",
                },
            });

            result = parseJsonFromResponse(retryResponse.text ?? "");
        } else {
            throw err;
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf-8");

    console.log(`\n✅ Analysis saved to: ${outputFile}`);

    const data = result as any;
    if (data.predictions?.length) {
        console.log(`\n🎯 Quick Preview:`);
        data.predictions.slice(0, 3).forEach((p: any) => {
            const bar = "█".repeat(Math.round(p.confidence / 10)) + "░".repeat(10 - Math.round(p.confidence / 10));
            console.log(`   #${p.rank} ${p.topic}`);
            console.log(`      ${bar} ${p.confidence}%`);
        });
    }

    console.log(`\n→ Run report.ts to generate ANALYSIS_RESULTS.md`);
}

main().catch((err) => {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
});