import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import * as fs from 'fs';
@Injectable()
export class OpenaiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  getInstance(): OpenAI {
    return this.openai;
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response: CreateEmbeddingResponse =
        await this.openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: text,
        });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  async transcribeAudio(filePath: string): Promise<string> {
    try {
      const fileStream = fs.createReadStream(filePath);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
}
