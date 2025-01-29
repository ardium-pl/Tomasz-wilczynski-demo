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

  // Extract the assigned box numbers from your structured JSON
  const assignedBoxes = new Map<number, string>([
    [jsonData.weight.box, "weight"],
    [jsonData.issueDate.box, "issueDate"],
    [jsonData.receivedDate.box, "receivedDate"],
    [jsonData.sender.box, "sender"],
    [jsonData.receiver.box, "receiver"],
    [jsonData.carRegistrationNumber.box, "carRegistrationNumber"],
    [jsonData.destination.box, "destination"],
    [jsonData.loadingPlace.box, "loadingPlace"]
  ]);

  // Load the full OCR result to find the assigned boxes
  const fullOCRData: OCRResult = JSON.parse(fs.readFileSync(jsonBlockPath, "utf8"));

  // Draw only the assigned boxes using their actual box numbers
  fullOCRData.forEach((box, index) => {
    const boxNumber = index + 1; // Assuming the box index starts at 1
    if (!assignedBoxes.has(boxNumber)) return; // Skip unassigned boxes

    const fieldName = assignedBoxes.get(boxNumber) as string; // Get the field name
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

    // Label the box with its actual box number
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    const textX = vertices[0].x + 5; // Offset from top-left corner
    const textY = vertices[0].y + 15; // Offset from top-left corner
    ctx.fillText(`Box ${boxNumber} (${fieldName})`, textX, textY);
  });

  // Save the canvas to a file
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Visualization saved to ${outputPath}`);
}