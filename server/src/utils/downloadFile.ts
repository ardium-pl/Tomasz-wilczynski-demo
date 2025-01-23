import fs from "fs-extra";
import { google } from "googleapis";
import path from "path";
import { auth } from "./constants";

export async function downloadFile(fileId: string, saveFolder: string, fileName: string) {
  const drive = google.drive({ version: "v3", auth: auth });

  try {
    const res = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" }
    );

    const pdfFilePath = path.join(saveFolder, fileName);

    await fs.ensureDir(saveFolder);

    const dest = fs.createWriteStream(pdfFilePath);

    res.data.pipe(dest);

    return new Promise<string>((resolve, reject) => {
      dest.on("finish", () => {
        resolve(pdfFilePath);
      });

      dest.on("error", (err) => {
        console.error(`Error saving file ${fileId}:`, err);
        reject(err);
      });
    });
  } catch (err) {
    console.error(`Error downloading file ${fileId}:`, err);
    throw err;
  }
}
