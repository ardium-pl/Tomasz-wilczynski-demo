//Ten kod rysuję boxy na obrazu i pokazuję, który tekst jest wykrywany 

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

async function visualizeBoxesOnImage(
  jsonPath: string,
  imagePath: string,
  outputPath: string
): Promise<void> {
  const jsonData: OCRResult = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // Load the image
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  // Draw the image as the canvas background
  ctx.drawImage(image, 0, 0);

  // Draw each bounding box
  jsonData.forEach((box, index) => {
    const vertices = box.boundingBox.vertices;

    // Draw bounding box
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.forEach((vertex) => {
      ctx.lineTo(vertex.x, vertex.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Mark the box with a number 
    const text = extractTextFromBox(box);
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    const textX = vertices[0].x + 5; // Offset from top-left corner
    const textY = vertices[0].y + 15; // Offset from top-left corner
    ctx.fillText(`Box ${index + 1}:`, textX, textY);
  });


    //   // Real text transcription added to the box 
    //   const text = extractTextFromBox(box);
    //   ctx.fillStyle = "black";
    //   ctx.font = "12px Arial";
    //   const textX = vertices[0].x + 5; // Offset from top-left corner
    //   const textY = vertices[0].y + 15; // Offset from top-left corner
    //   ctx.fillText(`Box ${index + 1}: ${text}`, textX, textY);
    // });

  // Save the canvas to a file
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Visualization saved to ${outputPath}`);
}


// Example usage
const jsonPath = "./all_blocks.json";
const imagePath = './base_image.png';
const outputPath = "./output_visualization.png";
//printAllBoxes(jsonPath);

visualizeBoxesOnImage(jsonPath, imagePath, outputPath).catch((err) =>
    console.error(err)
  );