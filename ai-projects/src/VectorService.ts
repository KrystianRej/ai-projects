/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenaiService } from './openai.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorService {
  private client!: QdrantClient;
  constructor(
    private openAIService: OpenaiService,
    private configService: ConfigService,
  ) {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
      throw new Error('QDRANT_URL must be set in environment variables');
    }

    if (!apiKey) {
      throw new Error('QDRANT_API_KEY must be set in environment variables');
    }

    this.client = new QdrantClient({ url, apiKey });
  }

  async ensureCollection(name: string) {
    const collections = await this.client.getCollections();
    if (!collections.collections.some((c) => c.name === name)) {
      await this.client.createCollection(name, {
        vectors: { size: 3072, distance: 'Cosine' },
      });
    }
  }

  async addPoints(
    collectionName: string,
    points: { id: string; content: string; metadata: Record<string, string> }[],
  ) {
    const pointsToUpsert = await Promise.all(
      points.map(async (point) => {
        const embedding = await this.openAIService.createEmbedding(
          point.content,
        );
        return {
          id: point.id,
          vector: embedding,
          payload: { ...point.metadata },
        };
      }),
    );

    await this.client.upsert(collectionName, {
      wait: true,
      points: pointsToUpsert,
    });
  }

  async performSearch(
    collectionName: string,
    query: string,
    limit: number = 5,
  ): Promise<
    {
      id: string | number;
      version: number;
      score: number;
      payload?:
        | Record<string, unknown>
        | {
            [key: string]: unknown;
          }
        | null
        | undefined;
      vector?:
        | Record<string, unknown>
        | number[]
        | number[][]
        | {
            [key: string]:
              | number[]
              | number[][]
              | {
                  indices: number[];
                  values: number[];
                }
              | undefined;
          }
        | null
        | undefined;
      shard_key?: string | number | Record<string, unknown> | null | undefined;
      order_value?: number | Record<string, unknown> | null | undefined;
    }[]
  > {
    const queryEmbedding = await this.openAIService.createEmbedding(query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.client.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
    });
  }
}
