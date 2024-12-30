import mysql, {
    Connection,
    ResultSetHeader,
    RowDataPacket
} from "mysql2/promise";
import { dbConfig } from "../../utils/constants";
import { logger } from "../../utils/logger";
export class MySqlService {
  public async createTcpConnection(): Promise<Connection | null> {
    let connection: Connection | null = null;
    try {
      connection = await mysql.createConnection(dbConfig);
      return connection;
    } catch (error) {
      logger.error("❌ Error creating a connection.");
      logger.error(error);
      if (connection) {
        await connection.end();
      }
      return null;
    }
  }
  public async executeSQL<T extends RowDataPacket[] | ResultSetHeader>(
    query: string
  ): Promise<T | null> {
    const connection = await this.createTcpConnection();
    if (connection) {
      try {
        const [rows] = await connection.execute<T>(query);
        logger.info("Successfully fetched the raw data! ✅");
        logger.info(
          `💾 Number of rows fetched: ${Array.isArray(rows) ? rows.length : 0}`
        );
        return rows;
      } catch (error) {
        logger.error("❌ Error executing the query.");
        logger.error(error);
        return null;
      } finally {
        await connection.end();
      }
    }
    return null;
  }
}
