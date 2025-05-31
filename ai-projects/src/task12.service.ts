import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigService } from '@nestjs/config';

import { Task3Response } from './task3.service';
import axios from 'axios';
import { VectorService } from './VectorService';
import { randomUUID } from 'crypto';

type FileWithContent = {
  fileName: string;
  content: string;
  date: string;
};

const vectorCollectionName = 'weapons';

@Injectable()
export class Task12Service {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
    private readonly vectorService: VectorService,
  ) {}

  async loadTxtFilesFromFolder(folderPath: string): Promise<FileWithContent[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = await fs.readdir(folderPath);
    const txtFiles = files.filter((file) =>
      file.toLowerCase().endsWith('.txt'),
    );

    const filesWithContent: FileWithContent[] = [];
    for (const file of txtFiles) {
      const filePath = path.join(folderPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      filesWithContent.push({
        fileName: file,
        content: content,
        date: this.extractDateFromString(file),
      });
    }

    return filesWithContent;
  }

  private extractDateFromString(input: string): string {
    // Match dates in format YYYY_MM_DD or YYYY-MM-DD
    const dateRegex = /(\d{4})[-_](\d{2})[-_](\d{2})/;
    const match = input.match(dateRegex);

    if (!match) {
      throw new Error('No valid date found in string');
    }

    // Return in YYYY-MM-DD format
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  async generateRaportVectors(textFiles: FileWithContent[]): Promise<void> {
    // Load text files
    // const textFiles = await this.loadTxtFilesFromFolder(folderPath);

    await this.vectorService.ensureCollection(vectorCollectionName);

    await this.vectorService.addPoints(
      vectorCollectionName,
      textFiles.map((file) => ({
        id: randomUUID(),
        content: file.content,
        metadata: { date: file.date, fileName: file.fileName },
      })),
    );
  }

  public async processRaportVectorsGeneration(): Promise<void> {
    const textFiles = await this.loadTxtFilesFromFolder(
      'src/localAssets/weapons',
    );

    await this.generateRaportVectors(textFiles);
  }

  private async askQuestion(question: string): Promise<string | Task3Response> {
    const answer = await this.vectorService.performSearch(
      vectorCollectionName,
      question,
      1,
    );

    if (!answer.length) {
      return 'no answer for given question';
    }
    const metadata = answer[0].payload as { date: string; fileName: string };

    return this.reportAnswer(metadata.date);
  }

  public async askRaportQuestion(): Promise<string | Task3Response> {
    return this.askQuestion(
      'W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?',
    );
  }

  async reportAnswer(answer: string): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'wektory',
      apikey,
      answer: answer,
    };
    console.dir(payload, { depth: null, colors: true });

    try {
      const response = await axios.post<{ code: number; message: string }>(
        'https://c3ntrala.ag3nts.org/report',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return { ...response.data, answer: answer };
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }
}
