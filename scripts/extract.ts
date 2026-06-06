/**
 * extract.ts
 * Extracts text from all PDFs in input dir, saves as .txt in output dir.
 * Usage: npx tsx scripts/extract.ts ./exam-papers ./extracted-texts
 */

import fs from "fs";
import path from "path";
// @ts-ignore
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";

const [, , inputDir, outputDir] = process.argv;

if (!inputDir || !outputDir) {
    console.error("Usage: npx tsx scripts/extract.ts <input-dir> <output-dir>");
    process.exit(1);
}

if (!fs.existsSync(inputDir)) {
    console.error(`❌ Folder not found: ${inputDir}`);
    console.error(`   Create it and add your exam paper PDFs.`);
    process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

function extractYearFromFilename(filename: string): string | null {
    const match = filename.match(/(20\d{2}|19\d{2})/);
    return match ? match[1] : null;
}

async function extractWithPdfParse(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
}

async function extractWithOCR(filePath: string): Promise<string> {
    console.log(`     🔍 Running OCR on ${path.basename(filePath)}...`);
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return data.text || "";
}

async function main() {
    const pdfFiles = fs
        .readdirSync(inputDir)
        .filter((f) => f.toLowerCase().endsWith(".pdf"))
        .sort();

    if (pdfFiles.length === 0) {
        console.error(`❌ No PDF files found in: ${inputDir}`);
        console.error(`   Add your exam paper PDFs and try again.`);
        process.exit(1);
    }

    console.log(`\n📄 Found ${pdfFiles.length} PDF(s). Extracting text...\n`);

    let successCount = 0;

    for (const filename of pdfFiles) {
        const filePath = path.join(inputDir, filename);
        const year = extractYearFromFilename(filename);
        const label = year ?? path.parse(filename).name;
        const outPath = path.join(outputDir, `${label}.txt`);

        process.stdout.write(`  ${filename}... `);

        try {
            let text = await extractWithPdfParse(filePath);

            // Fallback to OCR if text extraction returned nothing
            if (!text.trim()) {
                process.stdout.write(`empty, trying OCR... `);
                text = await extractWithOCR(filePath);
            }

            if (!text.trim()) {
                console.log(`❌ Could not extract text`);
                continue;
            }

            const header = `SOURCE: ${filename}\nYEAR: ${year ?? "unknown"}\n\n`;
            fs.writeFileSync(outPath, header + text, "utf-8");

            console.log(`✅ ${text.length.toLocaleString()} chars → ${label}.txt`);
            successCount++;
        } catch (err: any) {
            console.log(`❌ Error: ${err.message}`);
        }
    }

    console.log(`\n✅ Extracted ${successCount}/${pdfFiles.length} files`);

    if (successCount < 2) {
        console.warn(
            `\n⚠️  Warning: Only ${successCount} file(s) extracted. Predictions work best with 3+ papers.`
        );
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});