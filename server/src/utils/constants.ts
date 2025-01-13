import { google,  } from "googleapis";
import OpenAI from "openai";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// without the any type, the code is bitching, idk why
export const auth:any = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL as string,
  key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
  project_id: process.env.GOOGLE_PROJECT_ID as string,
});

export const PDF_FOLDER_ID = process.env.PDF_FOLDER_ID as string;
export const XML_FOLDER_ID = process.env.XML_FOLDER_ID as string;

export const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

export const VISION_AUTH = {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL as string,
      private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(
        /\\n/g,
        "\n"
      ), // Handling the private key newline issue
    },
    fallback: true, // Force use of REST API instead of gRPC
  };

const dataFolder = "./data"; 
export const inputPdfFolder = path.join(dataFolder, "input-pdf");
export const imagesFolder = path.join(dataFolder,"images");
export const outputTextFolder = path.join(dataFolder,"output-text");
export const xmlFilesFolder = path.join(dataFolder, "xml-files");
