import { Injectable } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import { Driver, Session } from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Neo4jService {
  private driver: Driver;

  constructor(private configService: ConfigService) {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error('Missing Neo4j configuration');
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session();
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async runQuery<T = any>(
    query: string,
    params?: Record<string, any>,
  ): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }
}
