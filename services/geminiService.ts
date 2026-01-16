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
  productContext: string = "",
  sellerNameInput: string = "老闆娘"
): Promise<AnalysisResult> => {
  const ai = getClient();
  let contents: any = [];

  const sellerList = sellerNameInput.split(/[,，\s]+/).filter(n => n.trim());
  const sellerNamesDisplay = sellerList.join('、');

  const systemInstruction = `
    You are an AI assistant for a LINE OpenChat Group Buying community in Taiwan.
    Language: Traditional Chinese (Taiwan).
    Currency: TWD (NT$).

    ### IDENTITY RULES
    - **AUTHORIZED SELLERS**: 
      1. Names: [${sellerNamesDisplay || 'None specified'}].
      2. **"本人" (Self)**: Green speech bubbles / Right-aligned messages.
    - ONLY Sellers can use "上架" or "#代喊" triggers.

    ### PRODUCT CREATION TRIGGER (STRICT)
    - **MUST** find the keyword "上架" (e.g., #上架, 上架商品) in a Seller's message to create a new product. 
    - **PRICE DETECTION**: Semantic analysis (e.g., "150元", "$150").

    ### PROXY ORDERING TRIGGER (NEW: #代喊)
    - **TRIGGER**: Find the keyword "#代喊" in a Seller's message.
    - **LOGIC**: This indicates the seller is ordering for someone else.
    - **BUYER IDENTIFICATION**: Look for a name following "@" or phrases like "幫[姓名]". 
    - **RESULT**: Set the extracted customer's name as "buyerName".
    - Example: "老闆娘: #代喊 @陳小美 戒指+1" -> buyerName: "陳小美", itemName: "戒指", quantity: 1.

    ### REGULAR ORDER MATCHING
    - Match user "+1" or "A+1" to "EXISTING ACTIVE PRODUCTS" listed below.

    ### CONSOLIDATION RULE
    - Merge multiple images/text of the same item into ONE product object if they appear together.

    ### AI AGENT
    - Answer questions only if "#AI" is present.

    ### EXISTING ACTIVE PRODUCTS
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
        systemInstruction: systemInstruction,
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
                  selectedSpec: { type: Type.STRING },
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
                  specs: { type: Type.ARRAY, items: { type: Type.STRING } },
                  closingTime: { type: Type.STRING },
                  description: { type: Type.STRING },
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
      const parsed = JSON.parse(response.text);
      return {
        orders: parsed.orders || [],
        products: parsed.products || [],
        aiInteractions: parsed.aiInteractions || []
      } as AnalysisResult;
    }
    return { orders: [], products: [], aiInteractions: [] };
  } catch (error) {
    console.error("Analysis Error:", error);
    return { orders: [], products: [], aiInteractions: [] };
  }
};

// 3. Product Card Generator
export const generateProductInfo = async (file: File) => {
  const ai = getClient();
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analyze this product image.
    1. **Identify Product Name**: Use Traditional Chinese.
    2. **Write Description**: Sales tone.
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