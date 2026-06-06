# SSC CGL Exam Predictor Guide

This guide explains how to use the Exam Predictor Skill to analyze SSC CGL exam papers and predict upcoming topics.

## How It Works

The Exam Predictor Skill follows this workflow:

1. **Text Extraction** - Extracts text from PDF exam papers in the `exam-papers/` folder
2. **Text Cleaning** - Removes headers, footers, page numbers, and OCR noise
3. **AI Analysis** - Sends cleaned text to Gemini API (or Claude API) for pattern analysis
4. **Report Generation** - Creates a detailed markdown report with topic predictions

## Prerequisites

1. **Node.js** (v16+ recommended)
2. **API Key** - Either:
   - Gemini API key (free tier available at [Google AI Studio](https://aistudio.google.com/app/apikey))
   - OR Anthropic API key (if you prefer to use Claude)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
Choose ONE of these options:

**Option A: Gemini API (used in this implementation)**
1. Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

**Option B: Anthropic API (alternative)**
1. Get a key at [Anthropic Console](https://console.anthropic.com/)
2. Create a `.env` file:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
3. Then modify `scripts/analyze.ts` to use Anthropic instead of Gemini (see notes below)

### 3. Prepare Exam Papers
Place your SSC CGL question paper PDFs in the `exam-papers/` folder. The skill works best with 3-10 years of past papers.

## Running the Analysis

Execute these commands in sequence:

```bash
# Step 1: Extract text from PDFs
npx tsx scripts/extract.ts ./exam-papers ./extracted-texts

# Step 2: Clean the extracted text
npx tsx scripts/clean.ts ./extracted-texts ./cleaned-texts

# Step 3: Analyze with AI (using Gemini by default)
npx tsx scripts/analyze.ts ./cleaned-texts "SSC CGL" ./claude_response.json

# Step 4: Generate the final report
npx tsx scripts/report.ts ./claude_response.json ./ANALYSIS_RESULTS.md
```

## Understanding the Output

The final report `ANALYSIS_RESULTS.md` contains:

- **Overall Pattern Insight**: Trends observed across the analyzed papers
- **Top 5 Predicted Topics**: Ranked by likelihood with confidence percentages
- **Top 10 Recurring Topics**: Historical frequency analysis
- **Topics Losing Relevance**: Topics appearing less frequently in recent papers
- **Study Priority Guide**: Recommended time allocation for preparation
- **Methodology Details**: How the analysis was performed

## Customization

### Switching to Claude API
If you prefer to use Claude instead of Gemini:

1. Install Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Edit `scripts/analyze.ts`:
   - Replace the GoogleGenAI import with Anthropic
   - Update the API key variable to use `ANTHROPIC_API_KEY`
   - Modify the API call to use Claude's messaging API
   - Adjust the prompt formatting as needed for Claude

### Adjusting Analysis Parameters
You can modify:
- Number of top topics predicted (in the prompt in `analyze.ts`)
- Confidence thresholds
- Exam name (passed as second argument to analyze.ts)

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

### Missing Dependencies
Run `npm install` again if you get module not found errors.

## Files Generated During Analysis

- `./extracted-texts/` - Raw text extracted from each PDF
- `./cleaned-texts/` - Cleaned text after noise removal
- `./claude_response.json` - Raw API response from Gemini/Claude
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

From a recent run:
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

**Ready to analyze?** Place your SSC CGL PDFs in `exam-papers/` and run the setup commands above!