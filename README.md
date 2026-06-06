# SSC CGL Exam Predictor Guide

This guide explains how to use the Exam Predictor Skill to analyze SSC CGL exam papers and predict upcoming topics using either **Gemini API** or **Claude API** (Anthropic).

## How It Works

The Exam Predictor Skill follows this workflow:

1. **Text Extraction** - Extracts text from PDF exam papers in the `exam-papers/` folder
2. **Text Cleaning** - Removes headers, footers, page numbers, and OCR noise
3. **AI Analysis** - Sends cleaned text to your chosen AI API (Gemini or Claude) for pattern analysis
4. **Report Generation** - Creates a detailed markdown report with topic predictions

## Prerequisites

1. **Node.js** (v16+ recommended)
2. **API Key** - Choose ONE:
   - **Gemini API** (free tier available at [Google AI Studio](https://aistudio.google.com/app/apikey))
   - **OR Claude API** (Anthropic) (get key at [Anthropic Console](https://console.anthropic.com/))

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your API Key
Choose **either** Gemini **or** Claude setup:

#### 🔹 Option A: Gemini API (Default Configuration)
1. Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **No script modifications needed** - the `analyze.ts` script is pre-configured for Gemini

#### 🔹 Option B: Claude API (Anthropic)
1. Get a key at [Anthropic Console](https://console.anthropic.com/)
2. Install Anthropic SDK: 
   ```bash
   npm install @anthropic-ai/sdk
   ```
3. Create a `.env` file:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
4. **Modify `scripts/analyze.ts` for Claude**:
   - Open `scripts/analyze.ts` in your editor
   - Replace the imports (lines 7-10) with:
     ```typescript
     import fs from "fs";
     import path from "path";
     import Anthropic from "@anthropic-ai/sdk";
     import dotenv from "dotenv";
     ```
   - Replace the API key check (lines 24-34) with:
     ```typescript
     // Check API key
     const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
     if (!ANTHROPIC_API_KEY) {
         console.error(`\n❌ ANTHROPIC_API_KEY not set!\n`);
         console.error(`Option 1 — add to your .env file:`);
         console.error(`  ANTHROPIC_API_KEY=your_key_here\n`);
         console.error(`Option 2 — export in terminal:`);
         console.error(`  export ANTHROPIC_API_KEY=your_key_here\n`);
         console.error(`Get your key at: https://console.anthropic.com/`);
         process.exit(1);
     }
     ```
   - Replace the AI initialization (line 36) with:
     ```typescript
     const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
     ```
   - Replace the entire API call section (lines 136-165) with this Claude-specific code:
     ```typescript
     let result: object;

     try {
         const msg = await anthropic.messages.create({
             model: "claude-3-5-sonnet-20241022",
             max_tokens: 4096,
             messages: [{
                 role: "user",
                 content: prompt
             }]
         });

         const rawText = msg.content[0].text ?? "";

         console.log(`📊 Parsing Claude response...`);
         result = parseJsonFromResponse(rawText);

     } catch (err: any) {
         // If JSON parsing fails, retry with stricter system instruction
         if (err.message?.includes("JSON")) {
             console.warn(`⚠️  JSON parse failed, retrying with stricter prompt...`);

             const retryResponse = await anthropic.messages.create({
                 model: "claude-3-5-sonnet-20241022",
                 max_tokens: 4096,
                 system: "You are a JSON-only API. Respond with ONLY a valid JSON object. No text before or after. No markdown. No explanation.",
                 messages: [{
                     role: "user",
                     content: prompt
                 }]
             });

             result = parseJsonFromResponse(retryResponse.content[0].text ?? "");
         } else {
             throw err;
         }
     }
     ```
   - Save the file

### 3. Prepare Exam Papers
Place your SSC CGL question paper PDFs in the `exam-papers/` folder. The skill works best with 3-10 years of past papers.

## Running the Analysis

Execute these commands in sequence (same for both APIs once configured):

```bash
# Step 1: Extract text from PDFs
npx tsx scripts/extract.ts ./exam-papers ./extracted-texts

# Step 2: Clean the extracted text
npx tsx scripts/clean.ts ./extracted-texts ./cleaned-texts

# Step 3: Analyze with your chosen AI (Gemini or Claude)
npx tsx scripts/analyze.ts ./cleaned-texts "SSC CGL" ./ai_response.json

# Step 4: Generate the final report
npx tsx scripts/report.ts ./ai_response.json ./ANALYSIS_RESULTS.md
```

> **Note**: 
> - For Gemini: Output goes to `claude_response.json` (legacy name, but works)
> - For Claude: Output goes to `ai_response.json` (you can rename if preferred)
> - The report script works identically regardless of which API produced the JSON

## Understanding the Output

The final report `ANALYSIS_RESULTS.md` contains:

- **Overall Pattern Insight**: Trends observed across the analyzed papers
- **Top 5 Predicted Topics**: Ranked by likelihood with confidence percentages
- **Top 10 Recurring Topics**: Historical frequency analysis
- **Topics Losing Relevance**: Topics appearing less frequently in recent papers
- **Study Priority Guide**: Recommended time allocation for preparation
- **Methodology Details**: How the analysis was performed

## Customization

### Switching Between APIs
To switch between Gemini and Claude:
1. Update your `.env` file with the appropriate API key
2. For Claude: Ensure you've completed the `analyze.ts` modifications (Section 2B above)
3. For Gemini: Revert `analyze.ts` to original or reinstall dependencies

### Adjusting Analysis Parameters
You can modify:
- Number of top topics predicted (in the prompt in `analyze.ts`)
- Confidence thresholds
- Exam name (passed as second argument to analyze.ts)
- AI model (in the API call section - e.g., try "claude-3-opus-20240229" for Claude)

## Troubleshooting

### Quota Exceeded Errors
If you see "429 Too Many Requests":
- Wait a few minutes before retrying (free tiers have rate limits)
- Check your API provider's dashboard for usage details
- Consider upgrading your API plan for higher limits

### Missing Text Extraction
If PDFs extract poorly:
- Ensure PDFs are text-based (not scanned images)
- For scanned PDFs, the skill will automatically attempt OCR via tesseract.js
- You may need to install system dependencies for OCR (see tesseract.js docs)

### API-Specific Errors
**Gemini**: Check `GEMINI_API_KEY` in `.env` and [Google AI Studio](https://aistudio.google.com/app/apikey)
**Claude**: Check `ANTHROPIC_API_KEY` in `.env` and [Anthropic Console](https://console.anthropic.com/)

### Missing Dependencies
Run `npm install` again if you get module not found errors.

## Files Generated During Analysis

- `./extracted-texts/` - Raw text extracted from each PDF
- `./cleaned-texts/` - Cleaned text after noise removal
- `./ai_response.json` or `./claude_response.json` - Raw API response (depending on your choice)
- `./ANALYSIS_RESULTS.md` - Final human-readable report (this is what you want!)

## Privacy & Security

- Your API keys are stored only in your local `.env` file (never committed)
- Exam paper contents are processed locally and only sent to the API for analysis
- No data is stored or shared beyond what's necessary for the analysis

## Best Practices

1. **Use Recent Papers**: Include at least 3 years of papers for meaningful patterns
2. **Verify with Syllabus**: Cross-check predictions against the official SSC CGL syllabus
3. **Focus on High-Confidence Topics**: Prioritize the top 3 predictions (usually >85% confidence)
4. **Combine with Practice**: Use predictions to guide your practice question selection
5. **Re-run Regularly**: Update your analysis as new papers become available

## Example Output Snippet

From a recent run (using either API):
```
🎯 Top Predictions:
🥇 Data Interpretation (Pie Charts/Tables)     ██████████ 95%
🥈 Active/Passive Voice & Narration           █████████░ 92%
🥉 Blood Relations                            █████████░ 88%
#4 Art & Culture (Classical Music/Dance)      █████████░ 85%
#5 Compound & Simple Interest                 ████████░░ 82%
```

## License

This guide and the associated scripts are provided for educational purposes. SSC CGL is a trademark of the Staff Selection Commission, Government of India.

---

**Ready to analyze?** Place your SSC CGL PDFs in `exam-papers/`, choose your preferred API (Gemini or Claude), set up the credentials, and run the setup commands above!