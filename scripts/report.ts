/**
 * report.ts
 * Converts claude_response.json into a beautiful ANALYSIS_RESULTS.md file.
 * Usage: npx tsx scripts/report.ts ./claude_response.json ./ANALYSIS_RESULTS.md
 */

import fs from "fs";

const [, , inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
    console.error("Usage: npx tsx scripts/report.ts <claude_response.json> <ANALYSIS_RESULTS.md>");
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
}

interface Topic {
    topic: string;
    count: number;
    years_appeared: string[];
    subtopics: string[];
}

interface Prediction {
    rank: number;
    topic: string;
    confidence: number;
    confidence_reason: string;
    common_question_type: string;
    study_tip: string;
}

interface DecliningTopic {
    topic: string;
    reason: string;
}

interface AnalysisData {
    exam_name: string;
    papers_analyzed: number;
    years_covered: string[];
    recurring_topics: Topic[];
    predictions: Prediction[];
    topics_declining: DecliningTopic[];
    overall_insight: string;
}

function confidenceBar(confidence: number): string {
    const filled = Math.round(confidence / 10);
    const empty = 10 - filled;
    return `${"█".repeat(filled)}${"░".repeat(empty)} ${confidence}%`;
}

function confidenceEmoji(confidence: number): string {
    if (confidence >= 80) return "🔥";
    if (confidence >= 65) return "⚡";
    if (confidence >= 50) return "📈";
    return "📊";
}

function rankMedal(rank: number): string {
    const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
    return medals[rank] ?? `#${rank}`;
}

function studyTimeAllocation(confidence: number): string {
    if (confidence >= 75) return "25%";
    if (confidence >= 60) return "20%";
    return "10%";
}

function studyPriority(confidence: number): string {
    if (confidence >= 75) return "**Must prepare** — high likelihood";
    if (confidence >= 60) return "**Should prepare** — good chance";
    return "Worth covering if time permits";
}

function generateReport(data: AnalysisData): string {
    const now = new Date().toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
    });

    const yearsStr = data.years_covered?.join(", ") ?? "Multiple years";
    const maxCount = Math.max(...(data.recurring_topics ?? []).map((t) => t.count), 1);

    const lines: string[] = [];

    // ── Header ──
    lines.push(
        `# 📊 Exam Analysis Report: ${data.exam_name}`,
        "",
        `> **Generated:** ${now}  `,
        `> **Papers Analyzed:** ${data.papers_analyzed} papers (${yearsStr})  `,
        `> **Powered by:** Claude AI + Claude Code Exam Predictor Skill`,
        "",
        "---",
        ""
    );

    // ── Overall Insight ──
    if (data.overall_insight) {
        lines.push(
            "## 💡 Overall Pattern Insight",
            "",
            `> ${data.overall_insight}`,
            "",
            "---",
            ""
        );
    }

    // ── Top Predictions ──
    lines.push(
        "## 🎯 Top 5 Predicted Topics for Next Exam",
        "",
        "*These topics are most likely to appear based on historical pattern analysis.*",
        ""
    );

    for (const pred of data.predictions ?? []) {
        lines.push(
            `### ${rankMedal(pred.rank)} ${pred.topic}`,
            "",
            `**Confidence:** ${confidenceEmoji(pred.confidence)} \`${confidenceBar(pred.confidence)}\`  `,
            `**Question Type:** ${pred.common_question_type}  `,
            ""
        );

        if (pred.confidence_reason) {
            lines.push(`**Why likely:** ${pred.confidence_reason}  `, "");
        }

        if (pred.study_tip) {
            lines.push(`**Study tip:** 💡 ${pred.study_tip}`, "");
        }

        lines.push("---", "");
    }

    // ── Recurring Topics Table ──
    lines.push(
        "## 📈 Top 10 Recurring Topics (Historical Frequency)",
        "",
        "| Rank | Topic | Appearances | Years | Subtopics |",
        "|------|-------|-------------|-------|-----------|"
    );

    for (let i = 0; i < Math.min((data.recurring_topics ?? []).length, 10); i++) {
        const t = data.recurring_topics[i];
        const barLen = Math.round((t.count / maxCount) * 8);
        const bar = "█".repeat(barLen) + "░".repeat(8 - barLen);

        const yearsCell = [
            ...(t.years_appeared ?? []).slice(0, 4),
            ...(t.years_appeared?.length > 4 ? [`+${t.years_appeared.length - 4}`] : []),
        ].join(", ");

        const subtopicsCell =
            (t.subtopics ?? []).slice(0, 3).join(", ") || "—";

        lines.push(
            `| ${i + 1} | **${t.topic}** | \`${bar}\` ${t.count}x | ${yearsCell} | ${subtopicsCell} |`
        );
    }

    lines.push("", "---", "");

    // ── Declining Topics ──
    if ((data.topics_declining ?? []).length > 0) {
        lines.push(
            "## 📉 Topics Losing Relevance",
            "",
            "*Appeared in older papers but seem to be phasing out — lower priority.*",
            ""
        );

        for (const t of data.topics_declining) {
            lines.push(`- ~~**${t.topic}**~~ — ${t.reason}`);
        }

        lines.push("", "---", "");
    }

    // ── Study Plan ──
    lines.push(
        "## 📚 Recommended Study Priority",
        "",
        "Based on this analysis, here's how to allocate your prep time:",
        ""
    );

    for (const pred of data.predictions ?? []) {
        lines.push(
            `${pred.rank}. **${pred.topic}** (${studyTimeAllocation(pred.confidence)} of study time) — ${studyPriority(pred.confidence)}`
        );
    }

    lines.push(
        "",
        "> **Tip:** Topics that appear consistently across years are likely core concepts.",
        "> Cross-verify the top 3 predictions against the latest official syllabus.",
        "",
        "---",
        ""
    );

    // ── Footer ──
    lines.push(
        "## ℹ️ About This Analysis",
        "",
        `- **Method:** Pattern analysis of ${data.papers_analyzed} past papers using Claude AI`,
        "- **Accuracy note:** AI predictions are based on historical patterns. Actual exam content may vary.",
        "- **Best practice:** Focus on top 3 predictions (highest confidence) for maximum ROI.",
        "- **Regenerate:** Add more recent papers to `exam-papers/` folder and re-run for updated results.",
        "",
        "---",
        "",
        "*Generated by Exam Predictor Skill for Claude Code*"
    );

    return lines.join("\n");
}

function main() {
    console.log("\n📝 Generating ANALYSIS_RESULTS.md...");

    const raw = fs.readFileSync(inputFile, "utf-8");
    const data: AnalysisData = JSON.parse(raw);

    const md = generateReport(data);
    fs.writeFileSync(outputFile, md, "utf-8");

    console.log(`✅ Report saved to: ${outputFile}`);
    console.log(`\n${"=".repeat(52)}`);
    console.log(`  📊 ${data.exam_name} — Analysis Complete`);
    console.log(`${"=".repeat(52)}`);

    if (data.predictions?.length) {
        console.log(`\n  🎯 Top Predictions:`);
        for (const p of data.predictions) {
            const bar = "█".repeat(Math.round(p.confidence / 10)) + "░".repeat(10 - Math.round(p.confidence / 10));
            console.log(`  ${rankMedal(p.rank)} ${p.topic}`);
            console.log(`     ${bar} ${p.confidence}%`);
        }
    }

    console.log(`\n  📄 Open ANALYSIS_RESULTS.md to see the full report`);
    console.log(`${"=".repeat(52)}\n`);
}

main();