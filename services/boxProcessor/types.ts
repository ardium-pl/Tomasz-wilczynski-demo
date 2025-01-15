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
  boundingBox: BoundingBox; 
  confidence?: number;
};

type Word = {
  symbols: Symbol[];
};

type Paragraph = {
  words: Word[];
};

export type TextBox = {
  paragraphs: Paragraph[];
  boundingBox: BoundingBox;
};

export type OCRResult = TextBox[]; // JSON file structure
