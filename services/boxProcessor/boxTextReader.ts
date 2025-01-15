//Ten kod służy do eksperymentowania ze sprawdzaniem co jest w poszczególnych boxach.
//Pokazuję index boxa i tekst, który zawiera

import fs from "fs-extra";
import { OCRResult, TextBox } from "./types";

export class BoxProcessor {
  private jsonData: OCRResult;

  constructor(jsonPath: string) {
    this.jsonData = this.loadJsonData(jsonPath);
  }

  private loadJsonData(jsonPath: string): OCRResult {
    return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  }

  public extractTextFromBox(box: TextBox): string {
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

  public sortBoxesByVerticalPosition(): OCRResult {
    return this.jsonData.sort((a, b) => {
      const aY = a.boundingBox.vertices[0].y;
      const bY = b.boundingBox.vertices[0].y;
      return aY - bY; // Sort in ascending order of y-coordinate
    });
  }

  public assignTextFromBoxes(): string[] {
    const allBoxTexts = this.jsonData.map((box) => {
      return this.extractTextFromBox(box);
    });

    return allBoxTexts;
  }
}