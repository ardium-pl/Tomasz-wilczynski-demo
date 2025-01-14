//Ten kod służy do eksperymentowania ze sprawdzaniem co jest w poszczególnych boxach. 
//Pokazuję index boxa i tekst, który zawiera

import fs from "fs";
import { createCanvas, loadImage } from "canvas";

type Vertex = {
  x: number;
  y: number;
};

type BoundingBox = {
  vertices: Vertex[];
};

type Symbol = {
  text: string;
  property?: { detectedBreak?: { type: string } };
};

type Word = {
  symbols: Symbol[];
};

type Paragraph = {
  words: Word[];
};

type TextBox = {
  paragraphs: Paragraph[];
  boundingBox: BoundingBox;
};

type OCRResult = TextBox[]; // JSON file structure

function extractTextFromBox(box: TextBox): string {
  let text = "";

  box.paragraphs.forEach((paragraph) => {
    paragraph.words.forEach((word) => {
      word.symbols.forEach((symbol) => {
        text += symbol.text;

        // Add spaces or line breaks based on detected breaks
        if (symbol.property?.detectedBreak?.type === "SPACE") {
          text += " ";
        } else if (symbol.property?.detectedBreak?.type === "LINE_BREAK") {
          text += "\n";
        }
      });
    });
    // Add a line break between paragraphs
    text += "\n";
  });

  return text.trim(); // Remove extra line breaks at the end
}

function sortBoxesByVerticalPosition(boxes: OCRResult): OCRResult {
  return boxes.sort((a, b) => {
    const aY = a.boundingBox.vertices[0].y;
    const bY = b.boundingBox.vertices[0].y;
    return aY - bY; // Sort in ascending order of y-coordinate
  });
}

function printAllBoxes(jsonPath: string): void {
  const jsonData: OCRResult = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  jsonData.forEach((box, index) => {
    const text = extractTextFromBox(box);
    console.log(`Box ${index + 1}:\n${text}\n`);
  });
}

// Example usage
const jsonPath = "./all_blocks.json";
printAllBoxes(jsonPath)