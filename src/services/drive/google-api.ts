import { google, drive_v3 } from "googleapis";
import { auth } from "../../utils/constants";
import fs from "fs";
import mime from "mime";
import { v4 as uuidv4 } from "uuid";

export class GoogleDriveService {
  public readonly drive: drive_v3.Drive;
  private readonly uniqueChannelId = uuidv4();

  constructor() {
    this.drive = google.drive({ version: "v3", auth });
  }
  public async listAllFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    return this.listFilesInFolder(folderId);
  }

  public async uploadFile(
    folderId: string,
    fileName: string,
    filePath: string
  ): Promise<drive_v3.Schema$File> {
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

  public async watchDriveChanges() {
    const {
      data: { startPageToken },
    } = await this.drive.changes.getStartPageToken();

    if (!startPageToken) return console.error("No start page token found");

    const watchResponse = await this.drive.changes.watch({
      requestBody: {
        id: this.uniqueChannelId,
        type: "web_hook",
        address:
          "https://tomasz-wilczynski-demo-production.up.railway.app/drive/webhook",
      },
      pageToken: startPageToken,
    });

    console.log("Watch response:", watchResponse.data);
  }

  private async listFilesInFolder(
    folderId: string
  ): Promise<drive_v3.Schema$File[]> {
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
        const folderFiles = files.filter(
          (file) => file.mimeType !== "application/vnd.google-apps.folder"
        );
        const subfolders = files.filter(
          (file) => file.mimeType === "application/vnd.google-apps.folder"
        );

        allFiles = allFiles.concat(folderFiles);

        // Recursively get files from subfolders
        for (const subfolder of subfolders) {
          const subfolderFiles = await this.listFilesInFolder(
            subfolder.id as string
          );
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
