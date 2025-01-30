import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import { OCRResult } from "./types";
import { CmrDataType } from "../../src/zod-json/invoiceJsonSchema";

export async function visualizeAssignedBoxesOnImage(
  jsonBlockPath: string,
  imagePath: string,
  jsonDataPath: string,
  outputPath: string
): Promise<void> {
  const jsonData: CmrDataType = JSON.parse(fs.readFileSync(jsonDataPath, "utf8"));

  // Load the image
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  // Draw the image as the canvas background
  ctx.drawImage(image, 0, 0);

  // Extract the assigned box numbers, values, and confidence levels
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

  // Load the full OCR result to find the assigned boxes
  const fullOCRData: OCRResult = JSON.parse(fs.readFileSync(jsonBlockPath, "utf8"));

  // Draw only the assigned boxes using their actual box numbers
  fullOCRData.forEach((box, index) => {
    const boxNumber = index + 1; // Assuming the box index starts at 1
    if (!assignedBoxes.has(boxNumber)) return; // Skip unassigned boxes

    const { field, value, confidence } = assignedBoxes.get(boxNumber) as { field: string; value: string | number; confidence: number };
    const vertices = box.boundingBox.vertices;

    // Determine box color based on confidence level
    let boxColor = "red"; // Default: low confidence
    if (confidence >= 0.9) {
      boxColor = "green"; // High confidence
    } else if (confidence >= 0.75 && confidence < 0.9) {
      boxColor = "orange"; // Medium confidence
    }

    // Draw bounding box
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    vertices.forEach((vertex) => {
      ctx.lineTo(vertex.x, vertex.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Label the box with its actual box number, field name, and confidence level
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    const textX = vertices[0].x + 5; // Offset from top-left corner
    const textY = vertices[0].y + 15; // Offset from top-left corner
    ctx.fillText(`Box ${boxNumber} (${field}) - ${confidence.toFixed(2)}`, textX, textY);
  });

  // Save the canvas to a file
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Visualization saved to ${outputPath}`);
}
