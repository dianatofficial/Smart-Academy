
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// This is a placeholder for the API key.
// In a real Applet environment, this would be provided securely.
const API_KEY = process.env.API_KEY;

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  public apiKeyError = signal<boolean>(false);

  constructor() {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
      this.apiKeyError.set(true);
      console.error("API key is not set. Please configure the API_KEY environment variable.");
    } else {
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
    }
  }

  async generateContent(
    prompt: string,
    systemInstruction: string,
    imageParts: { inlineData: { data: string; mimeType: string; } }[] = []
  ): Promise<string> {
    if (!this.ai) return Promise.reject('API key not configured.');
    
    const contents = {
        parts: [...imageParts, { text: prompt }]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        },
      });
      return response.text;
    } catch (error) {
      console.error('Error generating content:', error);
      return 'متاسفانه در پردازش درخواست شما خطایی رخ داد. لطفا دوباره تلاش کنید.';
    }
  }
  
  async generateWithGoogleSearch(prompt: string, systemInstruction: string): Promise<GenerateContentResponse> {
    if (!this.ai) return Promise.reject('API key not configured.');

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: [{googleSearch: {}}],
        },
      });
      return response;
    } catch (error) {
      console.error('Error generating grounded content:', error);
      throw new Error('متاسفانه در پردازش درخواست شما با جستجوی گوگل خطایی رخ داد.');
    }
  }
}
