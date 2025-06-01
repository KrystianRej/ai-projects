import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { AidevsApiService } from './aidevs-api.service';
import { Neo4jService } from './neo4j.service';
import { Task3Response } from './task3.service';

type User = {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
};

type Connection = {
  user1_id: string;
  user2_id: string;
};

@Injectable()
export class Task15Service {
  constructor(
    private readonly reportService: ReportService,
    private readonly aidevsApiService: AidevsApiService,
    private readonly neo4jService: Neo4jService,
  ) {}

  private async selectFromBanan<T>(colleciton: string): Promise<{
    reply: T[];
    error: string;
  }> {
    return this.aidevsApiService.postToMySqlRequest<{
      reply: T[];
      error: string;
    }>(`SELECT * FROM ${colleciton}`);
  }

  public async extractUsersAndConnections(): Promise<{
    users: User[];
    connections: Connection[];
  }> {
    const usersRecords = await this.selectFromBanan<User>('users');
    const connectionsRecords =
      await this.selectFromBanan<Connection>('connections');

    return {
      users: usersRecords.reply,
      connections: connectionsRecords.reply,
    };
  }

  public async loadDataToNeo4j(
    users: User[],
    connections: Connection[],
  ): Promise<void> {
    const session = this.neo4jService.getSession();
    try {
      // Clean up existing data
      await session.run('MATCH (n) DETACH DELETE n');

      // Create users nodes
      for (const user of users) {
        await session.run(
          `
          CREATE (u:User {
            userId: $userId,
            username: $username,
            access_level: $accessLevel,
            is_active: $isActive,
            lastlog: $lastlog
          })
          `,
          {
            userId: user.id,
            username: user.username,
            accessLevel: user.access_level,
            isActive: user.is_active,
            lastlog: user.lastlog,
          },
        );
      }

      // Create relationships between users
      for (const connection of connections) {
        await session.run(
          `
          MATCH (u1:User {userId: $user1Id})
          MATCH (u2:User {userId: $user2Id})
          CREATE (u1)-[:KNOWS]->(u2)
          `,
          {
            user1Id: connection.user1_id,
            user2Id: connection.user2_id,
          },
        );
      }
    } finally {
      await session.close();
    }
  }

  public async findShortestPath(): Promise<string> {
    const query = `
      MATCH (start:User {username: 'Rafał'}), (end:User {username: 'Barbara'})
      MATCH path = shortestPath((start)-[*]-(end))
      RETURN [node in nodes(path) | node.username] as path
    `;

    const result = await this.neo4jService.runQuery<{ path: string[] }>(query);
    console.log('Shortest path result:');
    console.dir(result, { depth: null, colors: null });

    if (!result.length || !result[0].path.length) {
      throw new Error('No path found between Rafał and Barbara');
    }

    return result[0].path.join(',');
  }

  public async loadDataFindPathAndReportAnswer(): Promise<Task3Response> {
    const { users, connections } = await this.extractUsersAndConnections();
    await this.loadDataToNeo4j(users, connections);
    const path = await this.findShortestPath();
    return this.reportService.reportAnswer({
      task: 'connections',
      answer: path,
    });
  }
}
