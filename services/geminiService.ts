
import { GoogleGenAI, Modality, Part } from "@google/genai";

// Assume API_KEY is set in the environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface SynthesisResult {
  imageUrl: string | null;
  text: string | null;
}

interface ImagePart {
  mimeType: string;
  data: string;
}

/**
 * Synthesizes a new image by sending a text prompt and multiple source images to the Gemini API.
 * @param prompt The text prompt describing the desired synthesis.
 * @param images An array of image objects, each with a MIME type and base64 data.
 * @returns A promise that resolves to an object containing the new image URL and any accompanying text.
 */
export const synthesizeImage = async (prompt: string, images: ImagePart[]): Promise<SynthesisResult> => {
  try {
    const imageParts: Part[] = images.map(image => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    }));

    const textPart: Part = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [...imageParts, textPart],
      },
      config: {
        // Must request both IMAGE and TEXT modalities for this model
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: SynthesisResult = {
      imageUrl: null,
      text: null,
    };

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType;
          const base64Data = part.inlineData.data;
          result.imageUrl = `data:${mimeType};base64,${base64Data}`;
        } else if (part.text) {
          result.text = part.text;
        }
      }
    }

    if (!result.imageUrl && !result.text) {
        throw new Error("API returned no content. The prompt might have been blocked.");
    }
    
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to synthesize image. Please check the console for more details.");
  }
};
