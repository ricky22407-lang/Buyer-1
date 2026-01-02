import { GoogleGenAI, Type } from "@google/genai";
import { RawOrder, AiInteraction, Product, AnalysisResult } from "../types";
import { GEMINI_MODEL } from "../constants";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

// 1. Unified Parser: Extracts Orders, Products, and AI Questions
export const parseChatLogs = async (
  input: string | File[], 
  productContext: string = ""
): Promise<AnalysisResult> => {
  const ai = getClient();
  let contents: any = [];

  // Optimized System Instruction for Gemini Flash
  const systemInstruction = `
    You are an AI assistant for a LINE OpenChat Group Buying (Daigou) community in Taiwan.
    Language: Traditional Chinese (Taiwan).
    Currency: TWD (NT$).

    Your task is to analyze chat logs and extract:
    1. **Orders**: Customer purchases (look for +1, wants, quantities).
    2. **Products**: New product listings by the seller.
    3. **AI Questions**: Questions tagged with #AI.

    ### 1. PRODUCT EXTRACTION RULES
    Identify seller posts with hashtags:
    - **#連線價**: Type = '連線'
    - **#預購價**: Type = '預購'
    - **#現貨**: Type = '現貨'
    - **#結單 MM/DD**: Closing time.
    - **Specs**: "A. Red", "Sizes: S/M". Extract to 'specs' array.
    - **Bulk Rules**: "#買N個N元" (total price) or "#買N個單價N元" (unit price).

    ### 2. ORDER EXTRACTION RULES
    - **Keywords**: "#加單", "+1", "want", "x1", "我要".
    - **#改單**: Mark isModification = true.
    - **Specs**: If user says "Red+1" or "A+1", map "Red"/"A" to 'selectedSpec'.
    - **Pricing**: Auto-calculate 'detectedPrice' based on Bulk Rules if quantity matches.
    
    ### 3. AI AGENT RULES
    - Only answer if text contains "#AI".
    - Use the provided "Active Products" context.
    - Be polite, helpful, and concise.
    - **Safety**: Do NOT reveal cost prices.

    ### EXISTING ACTIVE PRODUCTS (Context)
    """
    ${productContext || "No previous products."}
    """
  `;

  if (typeof input === 'string') {
    contents = { parts: [{ text: `Chat Log to Analyze:\n"""\n${input}\n"""` }] };
  } else {
    const imageParts = await Promise.all(input.map(async (file) => ({
      inlineData: { mimeType: file.type, data: await fileToBase64(file) }
    })));
    contents = { parts: [...imageParts] };
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: contents,
      config: {
        systemInstruction: systemInstruction, // Moved prompt here for Flash optimization
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  buyerName: { type: Type.STRING },
                  itemName: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  detectedPrice: { type: Type.INTEGER },
                  rawText: { type: Type.STRING },
                  isModification: { type: Type.BOOLEAN },
                  selectedSpec: { type: Type.STRING, description: "The specific variant chosen (e.g. Red, XL, A)" },
                },
                required: ["buyerName", "itemName", "quantity", "rawText"],
              },
            },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['連線', '預購', '現貨'] },
                  specs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of product variants" },
                  closingTime: { type: Type.STRING },
                  description: { type: Type.STRING },
                  bulkRules: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                         qty: { type: Type.NUMBER },
                         price: { type: Type.NUMBER },
                         isUnitPrice: { type: Type.BOOLEAN }
                      }
                    }
                  }
                },
                required: ["name", "price", "type"],
              },
            },
            aiInteractions: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   buyerName: { type: Type.STRING },
                   question: { type: Type.STRING },
                   suggestedReply: { type: Type.STRING },
                 },
                 required: ["buyerName", "question", "suggestedReply"],
               }
            }
          },
        },
      },
    });

    if (response.text) {
      // @ts-ignore
      return JSON.parse(response.text) as AnalysisResult;
    }
    return { orders: [], products: [], aiInteractions: [] };
  } catch (error) {
    console.error("Analysis Error:", error);
    return { orders: [], products: [], aiInteractions: [] };
  }
};

// 2. AI Agent Service (Placeholder if needed for separate chat)
export const generateAiReply = async (input: string, productContext: string): Promise<AiInteraction[]> => {
  return []; 
};

// 3. Product Card Generator
export const generateProductInfo = async (file: File) => {
  const ai = getClient();
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analyze this product image taken in a store.
    1. **Identify Product Name**: Use Traditional Chinese.
    2. **Write Description**: Sales tone, exciting.
    3. **Detect Price**: Number only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            description: { type: Type.STRING },
            detectedPrice: { type: Type.NUMBER },
          },
          required: ["productName", "description", "detectedPrice"],
        },
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Product Analysis Error:", error);
    throw new Error("Failed to analyze product image.");
  }
};