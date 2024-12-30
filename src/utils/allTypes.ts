export interface WatchDrive {
    channelId: string;
    resourceId: string;
    savedPageToken: string;
    expiration: number | null;
    lastUpdated?: Date; 
  }
