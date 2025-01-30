import dotenv from "dotenv";
import * as fs from "fs";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { ZodSchema } from "zod";

dotenv.config();

export class OpenAIProcessor {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async _processChat<T>(
    messages: ChatCompletionMessageParam[],
    schema: ZodSchema<T>
  ): Promise<T> {
    const completion = await this.client.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages,
      response_format: zodResponseFormat(schema, "CmrData"),
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed as T;
    } else if (message?.refusal) {
      throw new Error(` 🤖 AI refused to process the text: ${message.refusal}`);
    } else {
      throw new Error("Failed to process chat request");
    }
  }

  public async parseOcrText<T>(
    ocrText: string,
    prompt: string,
    schema: ZodSchema<T>
  ): Promise<T> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system" as const, content: prompt },
      { role: "user" as const, content: ocrText },
    ];

    return this._processChat(messages, schema);
  }

  public async compareDataUsingGptVision<T>(
    imagePath: string,
    schema: ZodSchema<T>,
    prompt: string,
    existingData?: T
  ): Promise<T> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const messages: ChatCompletionMessageParam[] = [
      { role: "system" as const, content: prompt },
      ...(existingData
        ? [
            {
              role: "user" as const,
              content: JSON.stringify(existingData),
            },
          ]
        : []),
      {
        role: "user" as const,
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ];

    return this._processChat(messages, schema);
  }

  public async compareDataUsingGoogleVision<T>(
    ocrText: string,
    schema: ZodSchema<T>,
    prompt: string,
    existingData?: T
  ): Promise<T> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: prompt },
      ...(existingData
        ? [{ role: "user" as const, content: `Existing Data: ${JSON.stringify(existingData)}` }]
        : []),
      { role: "user", content: ocrText },
    ];

    return this._processChat(messages, schema);
  }

  public async compareJsonData<T>(
    firstJson: T,
    secondJson: T,
    prompt: string,
    ocrDataText: string,
    schema: ZodSchema<T>
  ): Promise<T> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Comparing the following JSON datasets:
        First JSON: ${JSON.stringify(firstJson, null, 2)}
        Second JSON: ${JSON.stringify(secondJson, null, 2)}
        
        Here is the original OCR text: ${ocrDataText}
        `,
      },
    ];

    return this._processChat(messages, schema);
  }
}
