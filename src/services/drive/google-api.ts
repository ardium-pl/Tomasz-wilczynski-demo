import fs from "fs";
import { drive_v3, google } from "googleapis";
import mime from "mime";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { WatchDrive } from "../../utils/allTypes";
import { auth } from "../../utils/constants";
import { MySqlService } from "../db/mySql";

export class GoogleDriveService {
  public readonly drive: drive_v3.Drive;
  private sql = new MySqlService();

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
    const existingRecord = await this.getWatchDriveData();

    if (existingRecord) {
      const now = Date.now();
      const channelIsValid =
        existingRecord.expiration && existingRecord.expiration > now;

      if (channelIsValid) {
        console.log(`[watchDriveChanges] Existing channel is still valid. 
                     Channel ID: ${existingRecord.channelId}`);
        // We can stop here because we already have a channel that hasn't expired.
        return;
      } else {
        console.log(`[watchDriveChanges] Existing channel is expired or missing expiration. 
                     Will create a new one.`);
      }
    } else {
      console.log(
        "[watchDriveChanges] No existing channel found. Creating a new one..."
      );
    }

    // 2) Fetch startPageToken from Drive
    const {
      data: { startPageToken },
    } = await this.drive.changes.getStartPageToken();
    if (!startPageToken) {
      console.error("No start page token found. Cannot watch changes.");
      return;
    }

    // 3) Create a new watch channel
    const uniqueChannelId = uuidv4();
    const watchResponse = await this.drive.changes.watch({
      requestBody: {
        id: uniqueChannelId,
        type: "web_hook",
        address:
          "https://tomasz-wilczynski-demo-production.up.railway.app/drive/webhook",
      },
      pageToken: startPageToken,
    });

    const { id: channelId, resourceId, expiration } = watchResponse.data;

    // 4) Insert or update the DB record
    const connection = await this.sql.createTcpConnection();

    // If you only ever keep ONE record in drive_watch,
    // you might do an UPSERT logic:
    await connection?.query(
      `
      INSERT INTO drive_watch (channel_id, resource_id, saved_page_token, expiration, last_updated)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        channel_id = VALUES(channel_id),
        resource_id = VALUES(resource_id),
        saved_page_token = VALUES(saved_page_token),
        expiration = VALUES(expiration),
        last_updated = NOW()
      `,
      [channelId, resourceId, startPageToken, expiration]
    );

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

  public async getWatchDriveData(): Promise<WatchDrive | null> {
    try {
      const result = await this.sql.executeSQL<RowDataPacket[]>(`
SELECT 
    channel_id, 
    resource_id, 
    saved_page_token, 
    expiration, 
    last_updated
FROM 
    drive_watch
ORDER BY 
    last_updated DESC 
LIMIT 1;     
      `);

      if (!result || result.length === 0) {
        return null;
      }

      const row = result[0];

      return {
        channelId: row.channel_id,
        resourceId: row.resource_id,
        savedPageToken: row.saved_page_token,
        expiration: row.expiration ? parseInt(row.expiration, 10) : null,
        lastUpdated: row.last_updated,
      };
    } catch (err) {
      console.error("Error while getting channelId or PageToken: ", err);
      return null;
    }
  }
}
