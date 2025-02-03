import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import { OCRResult } from "./types";
import { CmrDataType } from "../zod-json/invoiceJsonSchema";

export async function visualizeAssignedBoxesOnImage(
  jsonBlockPath: string,
  imagePath: string,
  jsonDataPath: string,
  outputPath: string
): Promise<void> {
  const jsonData: CmrDataType = JSON.parse(fs.readFileSync(jsonDataPath, "utf8"));

  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0);

  const assignedBoxes = new Map<number, { field: string; value: string | number; confidence: number }>([
    [jsonData.weight.box, { field: "weight", value: jsonData.weight.value, confidence: jsonData.weight.confidence }],
    [jsonData.issueDate.box, { field: "issueDate", value: jsonData.issueDate.value, confidence: jsonData.issueDate.confidence }],
    [jsonData.receivedDate.box, { field: "receivedDate", value: jsonData.receivedDate.value, confidence: jsonData.receivedDate.confidence }],
    [jsonData.sender.box, { field: "sender", value: jsonData.sender.value, confidence: jsonData.sender.confidence }],
    [jsonData.receiver.box, { field: "receiver", value: jsonData.receiver.value, confidence: jsonData.receiver.confidence }],
    [jsonData.carRegistrationNumber.box, { field: "carRegistrationNumber", value: jsonData.carRegistrationNumber.value, confidence: jsonData.carRegistrationNumber.confidence }],
    [jsonData.destination.box, { field: "destination", value: jsonData.destination.value, confidence: jsonData.destination.confidence }],
    [jsonData.loadingPlace.box, { field: "loadingPlace", value: jsonData.loadingPlace.value, confidence: jsonData.loadingPlace.confidence }]
  ]);

  const fullOCRData: OCRResult = JSON.parse(fs.readFileSync(jsonBlockPath, "utf8"));

  fullOCRData.forEach((box, index) => {
    const boxNumber = index + 1;
    if (!assignedBoxes.has(boxNumber)) return;
  
    const { field, value, confidence } = assignedBoxes.get(boxNumber)!;
    const vertices = box.boundingBox.vertices;
  
    let boxColor = "red";
    if (confidence >= 0.9) {
      boxColor = "green";
    } else if (confidence >= 0.75 && confidence < 0.9) {
      boxColor = "orange";
    }
  
    // Compute min/max x & y
    const xValues = vertices.map(v => v.x);
    const yValues = vertices.map(v => v.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
  
    // Decide how many pixels to expand (margin)
    const margin = 7;
  
    // Calculate new width/height
    const width = maxX - minX;
    const height = maxY - minY;
  
    // Draw a thicker rectangle around the expanded area
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 10; // You can change this to whatever thickness you want
    ctx.strokeRect(
      minX - margin,
      minY - margin,
      width + margin * 2,
      height + margin * 2
    );
  
    // Label the box with its actual box number, field name, and confidence level
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.fillText(
      `Box ${boxNumber} (${field}) - ${confidence.toFixed(2)}`,
      minX - margin, 
      minY - margin - 5 // Just above the expanded box
    );
  });

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Visualization saved to ${outputPath}`);
}
