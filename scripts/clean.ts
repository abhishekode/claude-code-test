/**
 * clean.ts
 * Cleans extracted exam paper text — removes headers, footers, OCR noise.
 * Usage: npx tsx scripts/clean.ts ./extracted-texts ./cleaned-texts
 */

import fs from "fs";
import path from "path";

const [, , inputDir, outputDir] = process.argv;

if (!inputDir || !outputDir) {
    console.error("Usage: npx tsx scripts/clean.ts <input-dir> <output-dir>");
    process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

// Patterns to strip from exam papers
const STRIP_PATTERNS: RegExp[] = [
    /Page\s+\d+\s+of\s+\d+/gi,
    /^\s*Page\s+\d+\s*$/gim,
    /Roll\s*No\.?\s*:?\s*[\w\d]*/gi,
    /Time\s*:\s*\d+\s*(Hours?|Hrs?)/gi,
    /Maximum\s+Marks?\s*:\s*\d+/gi,
    /Total\s+Marks?\s*:\s*\d+/gi,
    /Instructions?\s+to\s+Candidates?/gi,
    /Answer\s+all\s+questions?/gi,
    /This\s+paper\s+contains?\s+\d+\s+questions?/gi,
    /^\s*\d+\s*$/gim,           // standalone page numbers
    /---\s*Page\s+\d+\s*---/gi,
];

function cleanText(raw: string): string {
    let text = raw;

    // Apply strip patterns
    for (const pattern of STRIP_PATTERNS) {
        text = text.replace(pattern, "");
    }

    // Remove non-ASCII characters (OCR artifacts)
    text = text.replace(/[^\x00-\x7F]/g, " ");

    // Collapse 3+ consecutive blank lines into 2
    text = text.replace(/\n{3,}/g, "\n\n");

    // Collapse excessive spaces
    text = text.replace(/[ \t]{3,}/g, "  ");

    return text.trim();
}

function main() {
    const txtFiles = fs
        .readdirSync(inputDir)
        .filter((f) => f.endsWith(".txt"))
        .sort();

    if (txtFiles.length === 0) {
        console.error(`❌ No .txt files found in ${inputDir}`);
        console.error(`   Run extract.ts first.`);
        process.exit(1);
    }

    console.log(`\n🧹 Cleaning ${txtFiles.length} file(s)...\n`);

    for (const filename of txtFiles) {
        const inPath = path.join(inputDir, filename);
        const outPath = path.join(outputDir, filename);

        const raw = fs.readFileSync(inPath, "utf-8");
        const cleaned = cleanText(raw);

        const reduction = Math.round((1 - cleaned.length / Math.max(raw.length, 1)) * 100);
        fs.writeFileSync(outPath, cleaned, "utf-8");

        console.log(
            `  ✅ ${filename}: ${raw.length.toLocaleString()} → ${cleaned.length.toLocaleString()} chars (${reduction}% noise removed)`
        );
    }

    console.log(`\n✅ Cleaned texts saved to: ${outputDir}`);
}

main();