
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateCodeFromSketch = async (base64Image: string): Promise<string> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    You are an expert senior frontend engineer and UX translator.
    Your task is to convert a hand-drawn UI sketch into clean, production-ready HTML and CSS.
    
    GUIDELINES:
    - Accurately infer layout and hierarchy from the image.
    - Use semantic HTML5 elements (header, main, section, footer, nav, etc.).
    - Use Tailwind CSS for all styling (add the script tag in the head).
    - Ensure the layout is responsive (mobile-first approach).
    - Generate readable, maintainable code with clear indentation.
    - Use modern CSS patterns (Flexbox and Grid).
    - Follow accessibility best practices (ARIA labels, alt text, contrast).
    - Use placeholder images from 'https://picsum.photos' where relevant.
    - Use neutral colors unless the sketch explicitly suggests others.
    - OUTPUT ONLY THE FULL HTML CONTENT inside a markdown code block. Do not include any chat preamble.
  `;

  const prompt = "Please convert this hand-drawn UI sketch into a production-ready HTML page using Tailwind CSS.";

  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1] // Strip prefix if exists
    },
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { 
      parts: [
        { text: prompt },
        imagePart 
      ] 
    },
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
    }
  });

  const textOutput = response.text || '';
  
  // Extract code from markdown block
  const codeMatch = textOutput.match(/```html\n?([\s\S]*?)\n?```/) || textOutput.match(/```\n?([\s\S]*?)\n?```/);
  return codeMatch ? codeMatch[1].trim() : textOutput.trim();
};

export const verifyLiveDeployment = async (url: string, code: string): Promise<any> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    You are a frontend QA and live preview assistant.
    Your responsibility is to validate a deployed static website.
    
    TASK:
    - You are given the source code of a page deployed at: ${url}.
    - Perform a "Visual & Structural Audit".
    - Check for basic rendering correctness (based on the code).
    - Confirm that HTML5 and CSS (Tailwind) are applied correctly.
    - Check for semantic hierarchy, mobile responsiveness (breakpoints), and accessibility (ARIA).
    
    OUTPUT:
    - Return a list of checkpoints with their specific status.
  `;

  const prompt = `Perform a QA audit on this site code: \n\n${code}`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          checkpoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short name of the QA check (e.g., 'Semantic HTML5')" },
                status: { type: Type.STRING, description: "Brief status message (e.g., 'Passed', 'Needs Improvement')" },
                passed: { type: Type.BOOLEAN, description: "True if the check is successful" }
              },
              required: ["label", "status", "passed"]
            }
          }
        },
        required: ["checkpoints"]
      }
    },
  });

  try {
    return JSON.parse(response.text || '{"checkpoints": []}');
  } catch (e) {
    return { checkpoints: [] };
  }
};

export const fixFindingsFromAudit = async (currentCode: string, failedFindings: string[]): Promise<string> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    You are a senior frontend engineer specialized in refining and fixing UI code.
    Your goal is to take existing HTML/Tailwind code and fix specific QA issues identified in an audit.
    
    GUIDELINES:
    - Be surgical: only change what is necessary to address the findings.
    - Maintain the overall design, colors, and layout unless the finding specifically asks for a change.
    - Ensure all code is valid, responsive, and accessible.
    - OUTPUT ONLY THE FULL UPDATED HTML CONTENT inside a markdown code block.
  `;

  const prompt = `
    Please fix the following findings in this HTML code:
    
    FINDINGS TO FIX:
    ${failedFindings.join('\n')}
    
    CURRENT CODE:
    ${currentCode}
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.1,
    }
  });

  const textOutput = response.text || '';
  const codeMatch = textOutput.match(/```html\n?([\s\S]*?)\n?```/) || textOutput.match(/```\n?([\s\S]*?)\n?```/);
  return codeMatch ? codeMatch[1].trim() : textOutput.trim();
};
