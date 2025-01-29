import dotenv from "dotenv";
import OpenAI from "openai";
import { CmrData, CmrDataType } from "./invoiceJsonSchema.ts";
import { zodResponseFormat } from "openai/helpers/zod";
import * as fs from "fs";
import { compareDataPrompt } from "./prompts.ts";
import { ChatCompletionMessageParam } from "openai/resources/index";

dotenv.config();

export class OpenAIProcessor {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseOcrText(ocrText: string, prompt: string, cmrJsonData?: CmrDataType): Promise<CmrDataType> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: prompt },
    ];
  
    // If cmrJsonData is provided, include it in the messages
    if (cmrJsonData) {
      messages.push({
        role: "user",
        content: `Here is the existing CMR data for reference:\n${JSON.stringify(cmrJsonData, null, 2)}`
      });
    }
  
    messages.push({ role: "user", content: ocrText });
  
    const completion = await this.client.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages,
      response_format: zodResponseFormat(CmrData, "CmrData"),
    });
  
    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed;
    } else if (message?.refusal) {
      throw new Error(` 🤖 AI refused to process the text: ${message.refusal}`);
    } else {
      throw new Error("Failed to parse OCR text");
    }
  }

  async uploadPhotoAndAsk(
    imagePath: string,
    cmrJsonData: CmrDataType
  ): Promise<CmrDataType> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Read image as a buffer and encode it in base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Call OpenAI chat completion with vision model
    const completion = await this.client.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: "system", content: compareDataPrompt },
        { role: "user", content: JSON.stringify(cmrJsonData) },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: zodResponseFormat(CmrData, "CmrData"),
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed;
    } else if (message?.refusal) {
      throw new Error(` 🤖 AI refused to process the text: ${message.refusal}`);
    } else {
      throw new Error("Failed to parse OCR text");
    }
  }
}
