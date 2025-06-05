import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { AidevsApiService } from './aidevs-api.service';
import { OpenaiService } from './openai.service';
import * as fs from 'fs';
import { FileService } from './file.service';
import { Task3Response } from './task3.service';

@Injectable()
export class Task17Service {
  constructor(
    private readonly reportService: ReportService,
    private readonly aidevsApiService: AidevsApiService,
    private readonly openaiService: OpenaiService,
    private readonly fileService: FileService,
  ) {}

  private async generateFinetuneData(
    files: { inputFilePath: string; content: string }[],
    outputFilePath: string,
  ): Promise<void> {
    try {
      // Create output stream
      const writeStream = fs.createWriteStream(outputFilePath);

      // Process each file
      for (const file of files) {
        // Read the input file
        const fileContent = await fs.promises.readFile(
          file.inputFilePath,
          'utf-8',
        );
        const lines = fileContent.split('\n').filter((line) => line.trim());

        // Process each line
        for (const line of lines) {
          const data = {
            messages: [
              {
                role: 'system',
                content: 'validate data',
              },
              {
                role: 'user',
                content: line.replace(/\r/g, ''),
              },
              {
                role: 'assistant',
                content: file.content,
              },
            ],
          };

          // Write to file in JSONL format
          writeStream.write(JSON.stringify(data) + '\n');
        }
      }

      // Close the write stream
      writeStream.end();

      console.log(`Successfully generated finetune data at ${outputFilePath}`);
    } catch (error) {
      console.error('Error generating finetune data:', error);
      throw error;
    }
  }

  public async generateTaskFineTuneData(): Promise<void> {
    await this.generateFinetuneData(
      [
        {
          inputFilePath: 'src/localAssets/lab_data/correct.txt',
          content: '1',
        },
        {
          inputFilePath: 'src/localAssets/lab_data/incorect.txt',
          content: '0',
        },
      ],
      'src/localAssets/lab_data_fine_tune/finetune.jsonl',
    );
  }

  public async loadAndProcessFile(): Promise<
    Array<{ number: string; value: string }>
  > {
    try {
      // Load file content using fileService
      const fileContent = await this.fileService.loadSpecificFileFromFolder(
        'src/localAssets/lab_data',
        'verify.txt',
      );

      if (!fileContent) {
        throw Error('File is missing!');
      }

      // Split content into lines and filter out empty lines
      const lines = fileContent.split('\n').filter((line) => line.trim());

      const results: Array<{ number: string; value: string }> = [];

      // Process each line
      const openai = this.openaiService.getInstance();
      for (const line of lines) {
        const response = await openai.chat.completions.create({
          model: 'ft:gpt-4.1-mini-2025-04-14:krystian-rej:aidevs17:BerLuhW4',
          messages: [
            { role: 'system', content: 'validate data' },
            {
              role: 'user',
              content: line,
            },
          ],
        });

        if (!response.choices[0].message.content) {
          throw Error('Invalid result');
        }

        const numberMatch = line.match(/^(\d+)=/);
        if (!numberMatch) {
          throw Error('Invalid line format');
        }
        const number = numberMatch[1];

        // Parse the response and add to results
        const result = response.choices[0].message.content;
        results.push({
          number: number,
          value: result,
        });
      }

      console.log('Validation results:', results);

      return results;
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }

  async verifyAndReport(): Promise<Task3Response> {
    const results = await this.loadAndProcessFile();
    const answer = results
      .filter((result) => result.value === '1')
      .map((result) => result.number);

    return this.reportService.reportAnswer({
      task: 'research',
      answer,
    });
  }
}
