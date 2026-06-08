import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Personalized AI Chat Tutor Route
app.post("/api/chat", async (req, res): Promise<void> => {
  try {
    const { messages, nativeLanguage, targetLanguage, level, interests } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Messages array is required." });
      return;
    }

    const ai = getAiClient();

    // Prepare content format for Gemini
    // Let's formulate a powerful system instruction to direct the tutor
    const systemInstruction = `
      You are a world-class dedicated personal language tutor. 
      Your student's profile:
      - Native/Explanation language: ${nativeLanguage || "Arabic"}
      - Target language to learn: ${targetLanguage || "English"}
      - Current level: ${level || "Beginner (A1)"}
      - Personal interests: ${interests || "General Conversation"}

      Role & Guidelines:
      1. Keep all replies in the target language extremely fits for their current level (${level}).
         - If Beginner (A1/A2), use simple words, clear and short sentences.
         - If Intermediate (B1/B2), use natural intermediate vocabulary with subtle idiomatic expressions.
         - If Advanced (C1), speak like a high-level native.
      2. Always incorporate their personal interests (${interests}) into the subject of conversation when appropriate! If their interest is travel, ask about travel. If it is tech, ask about technology.
      3. Gently assess their last input:
         - If they made any spelling or grammatical mistakes in the target language, construct a friendly, supportive correction in the native language (${nativeLanguage}). Be concise.
         - If their message was correct, leave the correction blank.
      4. Support learning by providing a brief translation of your target-language reply into the explanation/native language (${nativeLanguage}).
      5. Formulate 3 dynamic 'suggestedResponses' inside the JSON response. These must be natural, realistic options that the user can choose to reply with in the target language (appropriate for their level).
      
      CRITICAL: You must answer in strict JSON match the requested schema. Do not output anything except the JSON.
    `;

    // Convert client-side message representation to Gemini contents
    // The client sends: { role: 'user' | 'model', content: string }
    const geminiMessages = messages.map((m: any) => ({
      role: m.role || "user",
      parts: [{ text: m.content || "" }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiMessages,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: "The actual chat reply written in the target language." 
            },
            correction: { 
              type: Type.STRING, 
              description: "Grammar or spelling corrections for the user's latest message in the native/explanation language, or blank string if no corrections are needed." 
            },
            translation: { 
              type: Type.STRING, 
              description: "Direct translation of the reply into the native/explanation language." 
            },
            suggestedResponses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 simple, level-appropriate response suggestions in the target language to continue the dialogue."
            }
          },
          required: ["reply", "correction", "translation", "suggestedResponses"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Chat Tutor Error:", error);
    res.status(500).json({ error: error.message || "An internal error occurred." });
  }
});

// 2. Personalized Daily/Custom Lesson Generator Route
app.post("/api/lesson", async (req, res): Promise<void> => {
  try {
    const { nativeLanguage, targetLanguage, level, interests, customPrompt } = req.body;

    const ai = getAiClient();

    const systemInstruction = `
      You are an expert curriculum designer for personalized language learning.
      Create a highly customized, fun, and comprehensive single language lesson.
      
      User learning profile:
      - Native language: ${nativeLanguage || "Arabic"}
      - Target language: ${targetLanguage || "English"}
      - Proficiency level: ${level || "Beginner (A1)"}
      - User's specific interests: ${interests || "General"}
      ${customPrompt ? `- Customized focus request: ${customPrompt}` : ""}

      Ensure your lesson elements match this profile precisely:
      1. Title: Create a captivating, practical title matching their interest or custom request (e.g., 'حوار الفندق في مدريد' or 'مفردات تكنولوجيا الذكاء الاصطناعي').
      2. Objective: Briefly state what the user will master in this lesson.
      3. Vocabulary: Include exactly 5 level-appropriate words or terms in target language, with phonetics/pronunciation support, and native explanation meaning, and a realistic example sentence.
      4. Dialogue: Create a short 4-turn dialog scenario (Speaker A & Speaker B) related to the topic of the lesson in the target language with side-by-side native translation.
      5. Grammar Tip: Focus on one grammar concept relevant to their current level, explained clearly in the native language with 2 practical examples.
      6. Practice Quiz: Generate exactly 3 interactive multi-choice quiz questions focusing on the vocabulary and dialogue of this lesson. One should be a gap fill, one testing vocabulary, one testing grammar. State options, correct option, and a helpful explanation.

      CRITICAL: Return strictly JSON in the schema specified.
    `;

    const userPrompt = `Generate a fully customized lesson for learning ${targetLanguage} optimized for a user whose native language is ${nativeLanguage}, level is ${level}, and interests include: ${interests}. ${customPrompt ? `The lesson should specifically focus on: ${customPrompt}` : ""}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "Word or phrase in target language" },
                  phonetic: { type: Type.STRING, description: "Phonetic reading helper, phonetics" },
                  meaning: { type: Type.STRING, description: "Meaning in native/explanation language" },
                  exampleSentence: { type: Type.STRING, description: "Contextual sentence in target language" },
                  exampleTranslation: { type: Type.STRING, description: "Translation of example in native language" }
                },
                required: ["word", "phonetic", "meaning", "exampleSentence", "exampleTranslation"]
              }
            },
            dialogue: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING, description: "Name of speaker (e.g. Sarah, Receptionist, Waiter)" },
                  text: { type: Type.STRING, description: "Line in target language" },
                  translation: { type: Type.STRING, description: "Line translated in native language" }
                },
                required: ["speaker", "text", "translation"]
              }
            },
            grammarTip: {
              type: Type.OBJECT,
              properties: {
                concept: { type: Type.STRING },
                explanation: { type: Type.STRING, description: "Written in native explanation language" },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Sentence in target language" },
                      translation: { type: Type.STRING, description: "Sentence translated to native language" }
                    },
                    required: ["text", "translation"]
                  }
                }
              },
              required: ["concept", "explanation", "examples"]
            },
            practiceQuiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 options to choose from"
                  },
                  correctAnswer: { type: Type.STRING, description: "The exact matching correct string from options array" },
                  explanation: { type: Type.STRING, description: "Supportive explanation of why this was the correct response" }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "description", "vocabulary", "dialogue", "grammarTip", "practiceQuiz"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Lesson Generator Error:", error);
    res.status(500).json({ error: error.message || "An internal error occurred." });
  }
});

// 3. Sentence Analyzer / Demystifier Route
app.post("/api/demystify", async (req, res): Promise<void> => {
  try {
    const { sentence, nativeLanguage, targetLanguage } = req.body;

    if (!sentence) {
      res.status(400).json({ error: "Sentence parameter is required." });
      return;
    }

    const ai = getAiClient();

    const systemInstruction = `
      You are a supreme grammar analyzer and philologist.
      Decompose the provided sentence in the target language (${targetLanguage}) and explain it word-by-word for a student using ${nativeLanguage} as explanation language.
      
      Look for:
      1. Word or Compound verb units.
      2. Parts of Speech (Noun, Verb, Particle, Preposition, Conjugation, Article).
      3. Specific grammar markers (e.g. singular/plural, past/present tense, conjugation specifics, pronouns attached).
      4. Idiomatic meanings if the sentence contains an idiom or expression.
      5. A smooth natural translation.

      Provide your breakdown in the requested JSON scheme. Explanation text must be in ${nativeLanguage || "Arabic"}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Demystify the sentence: "${sentence}" from ${targetLanguage} into ${nativeLanguage}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            literalTranslation: { type: Type.STRING, description: "Smooth, natural interpretation/translation of the sentence in native language." },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  wordOrPhrase: { type: Type.STRING, description: "The word or small compound segment from the sentence." },
                  partOfSpeech: { type: Type.STRING, description: "Grammar category (Noun, Verb, Adjective, Pronoun, etc.)" },
                  meaning: { type: Type.STRING, description: "Specific definition/meaning of this segmented word in the native language." },
                  grammaticalDetail: { type: Type.STRING, description: "Grammar particulars (e.g., gender, tense, case, role, conjugation form or pronunciation helper)." }
                },
                required: ["wordOrPhrase", "partOfSpeech", "meaning", "grammaticalDetail"]
              }
            },
            culturalOrIdiomaticNote: { type: Type.STRING, description: "Cultural context, idiomatic twist or helpful tips, if any. Leave blank else." }
          },
          required: ["literalTranslation", "breakdown", "culturalOrIdiomaticNote"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Sentence Analyzer Error:", error);
    res.status(500).json({ error: error.message || "An internal error occurred." });
  }
});

// Configure Vite integration for dev, or static asset delivery for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Lughati Backend] Server running on port ${PORT}`);
  });
}

startServer();
