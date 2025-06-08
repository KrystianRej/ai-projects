import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import * as fs from 'fs';
import {
  ResponseInput,
  ResponseInputImage,
} from 'openai/resources/responses/responses';
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

  async extractTextFromBase64Image(base64File: string): Promise<string> {
    const prompt = `
    Extract text from the image. Connect words together if that makes sense. Return ONLY text from the image, nothing else. Photo may contain peacoes of notes, that may give full text when connected together into one.
    `;

    const imageContent: ResponseInputImage = {
      type: 'input_image',
      image_url: `data:image/png;base64,${base64File}`,
      detail: 'auto',
    };

    const messages: ResponseInput = [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }, imageContent],
      },
    ];

    const response = await this.openai.responses.create({
      model: 'gpt-4.1',
      input: messages,
      temperature: 0,
    });

    return response.output_text;
  }
}
