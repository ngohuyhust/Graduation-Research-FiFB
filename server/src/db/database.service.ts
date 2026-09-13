import { Injectable } from "@nestjs/common";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
const pool = require("./pool");

export interface QueryExecutor {
  query<Row extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<Row>>;
}

@Injectable()
export class DatabaseService implements QueryExecutor {
  query<Row extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<Row>> {
    return pool.query(text, params);
  }

  withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return pool.withTransaction(callback);
  }
}
