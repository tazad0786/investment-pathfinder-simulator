import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with strict environment guidelines
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("GoogleGenAI initialized successfully on the server.");
  } else {
    console.warn("GEMINI_API_KEY environment variable is not defined. AI Assistant will operate in educational fallback mode.");
  }
} catch (error) {
  console.error("Error initializing GoogleGenAI client:", error);
}

// 1. API: Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    aiEnabled: !!ai,
    timestamp: new Date().toISOString()
  });
});

// 2. API: Advisor Chatbot using @google/genai
app.post("/api/chat", async (req, res) => {
  const { messages, userProfile } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid message history payload" });
  }

  // System instruction to guide the AI model's persona and context
  const systemInstruction = `You are 'WealthWise AI Coach', a highly professional, friendly, and smart financial advisor. 
Your goal is to guide users through the process of choosing Stocks and Mutual Funds step-by-step.
User Profile context:
- Risk Tolerance: ${userProfile?.riskTolerance || 'Not Selected'}
- Goal: ${userProfile?.goal || 'Not Selected'}
- Investment Horizon: ${userProfile?.horizon ? `${userProfile.horizon} years` : 'Not Selected'}
- Monthly Investment Capacity: ${userProfile?.monthlyInvestmentCapacity ? `₹${userProfile.monthlyInvestmentCapacity}` : 'Not Selected'}

Be objective, clear, and structure your responses with bold terms and short paragraphs.
Explain jargon like 'PE Ratio', 'Expense Ratio', 'CAGR', 'AUM', and 'Small Cap' simply.
When asked about choosing, outline clear, actionable steps:
1. Define the financial goal (Wealth, Tax saving, Retirement).
2. Match with Risk appetite (Debt for conservative, Index/Large Cap for moderate, Small/Mid cap for high growth).
3. Review fundamental ratios (PE ratio for stocks value, expense ratio and 3y/5y CAGR for mutual funds).
4. Simulate first with mock currency before investing real money.

Always remind the user professionally: 'Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.'`;

  if (!ai) {
    // Elegant educational fallback when API key is missing
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    let responseText = "Hello! I am operating in educational mode right now. Since the server API key is not fully configured yet, let me share some smart investing principles:\n\n";
    responseText += "**How to choose Stocks (3 simple steps):**\n";
    responseText += "1. **Check PE Ratio**: A high PE might mean a stock is overvalued, while a low PE can indicate a value buy.\n";
    responseText += "2. **Analyze Debt-to-Equity**: Look for companies with lower debt (< 1 is healthy) to avoid financial distress.\n";
    responseText += "3. **Revenue & Profit Growth**: Ensure the company has consistent profit growth over the last 3-5 years.\n\n";
    responseText += "**How to choose Mutual Funds (3 simple steps):**\n";
    responseText += "1. **Expense Ratio**: Choose funds with a lower expense ratio (< 1% is ideal) so more of your returns compound.\n";
    responseText += "2. **Compare 3Y & 5Y CAGR**: Look for consistent, stable performance above its category benchmark, rather than just single-year spikes.\n";
    responseText += "3. **AUM (Assets Under Management)**: Higher AUM typically represents trust and liquid stability.\n\n";
    responseText += "*Disclaimer: Mutual fund investments are subject to market risks. Please research carefully.*";
    return res.json({ text: responseText });
  }

  try {
    // Map existing history to Gemini contents structure
    // Gemini API chats expect role 'user' or 'model'
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "I apologize, but I couldn't formulate a response. Please ask me another question about stocks or mutual funds!";
    res.json({ text });
  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    res.status(500).json({
      error: "Failed to fetch response from WealthWise AI",
      details: err.message
    });
  }
});

// 3. Vite development server setup & build handler
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static assets from dist folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
});
