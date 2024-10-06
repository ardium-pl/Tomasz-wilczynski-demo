import { google, drive_v3 } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

export const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL as string,
  key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
  project_id: process.env.GOOGLE_PROJECT_ID as string,
});

export async function listAllFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
  const drive = google.drive({ version: "v3", auth: auth });

  async function listFilesInFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
    let allFiles: drive_v3.Schema$File[] = [];
    let pageToken: string | null = null;

    try {
      do {
        const res: any = await drive.files.list({
          q: `'${folderId}' in parents`,
          pageSize: 100,
          fields: "nextPageToken, files(id, name, mimeType)",
          pageToken: pageToken || undefined,
        });

        const files = res.data.files || [];

        // Separate folders and files
        const folderFiles = files.filter((file: drive_v3.Schema$File) => file.mimeType !== "application/vnd.google-apps.folder");
        const subfolders = files.filter((file: drive_v3.Schema$File) => file.mimeType === "application/vnd.google-apps.folder");

        allFiles = allFiles.concat(folderFiles);

        // Recursively get files from subfolders
        for (const subfolder of subfolders) {
          const subfolderFiles = await listFilesInFolder(subfolder.id as string);
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

  return await listFilesInFolder(folderId);
}
