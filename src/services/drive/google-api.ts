import { google, drive_v3 } from "googleapis";
import { auth } from "../../utils/constants";
import fs from "fs";
import mime from "mime";

export class GoogleDriveService {
  private drive: drive_v3.Drive;

  constructor() {
    this.drive = google.drive({ version: "v3", auth });
  }
  public async listAllFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    return this.listFilesInFolder(folderId);
  }
  
  public async uploadFile(folderId: string, fileName: string, filePath: string): Promise<drive_v3.Schema$File> {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const fileMimeType = mime.getType(filePath) || "application/octet-stream";
    const media = {
      mimeType: fileMimeType,
      body: fs.createReadStream(filePath),
    };

    try {
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id, name, mimeType, parents",
      });

      return response.data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  private async listFilesInFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
    let allFiles: drive_v3.Schema$File[] = [];
    let pageToken: string | null = null;

    try {
      do {
        const res: any = await this.drive.files.list({
          q: `'${folderId}' in parents`,
          pageSize: 100,
          fields: "nextPageToken, files(id, name, mimeType)",
          pageToken: pageToken || undefined,
        });

        const files: drive_v3.Schema$File[] = res.data.files || [];

        // Separate folders and files
        const folderFiles = files.filter((file) => file.mimeType !== "application/vnd.google-apps.folder");
        const subfolders = files.filter((file) => file.mimeType === "application/vnd.google-apps.folder");

        allFiles = allFiles.concat(folderFiles);

        // Recursively get files from subfolders
        for (const subfolder of subfolders) {
          const subfolderFiles = await this.listFilesInFolder(subfolder.id as string);
          allFiles = allFiles.concat(subfolderFiles);
        }

        pageToken = res.data.nextPageToken || null;
      } while (pageToken);

      return allFiles;
    } catch (err) {
      console.error("Error listing files:", err);
      throw err;
    }
  }
}
