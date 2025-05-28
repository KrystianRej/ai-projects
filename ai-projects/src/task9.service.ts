import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import {
  ResponseInput,
  ResponseInputImage,
} from 'openai/resources/responses/responses';
import { createReadStream } from 'fs';
import { Task3Response } from './task3.service';
import axios from 'axios';

type FileWithContent = {
  fileName: string;
  content: string;
};

@Injectable()
export class Task9Service {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
  ) {}

  async loadPngImagesAsBase64(folderPath: string): Promise<FileWithContent[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = await fs.readdir(folderPath);
    const pngFiles = files.filter((file) =>
      file.toLowerCase().endsWith('.png'),
    );

    const filesWithBase64Content: FileWithContent[] = [];
    for (const file of pngFiles) {
      const filePath = path.join(folderPath, file);
      const data = await fs.readFile(filePath);
      filesWithBase64Content.push({
        fileName: file,
        content: data.toString('base64'),
      });
    }
    return filesWithBase64Content;
  }

  async loadMp3FilesAsStream(
    folderPath: string,
  ): Promise<{ fileName: string; content: fs.ReadStream }[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = await fs.readdir(folderPath);
    const mp3Files = files.filter((file) =>
      file.toLowerCase().endsWith('.mp3'),
    );

    const filesWithStreams: { fileName: string; content: fs.ReadStream }[] = [];
    for (const file of mp3Files) {
      const filePath = path.join(folderPath, file);
      const stream = createReadStream(filePath);
      filesWithStreams.push({
        fileName: file,
        content: stream,
      });
    }

    return filesWithStreams;
  }

  async extractTextFromMp3Files(
    filesWithStreams: { fileName: string; content: fs.ReadStream }[],
  ): Promise<FileWithContent[]> {
    const openai = this.openaiService.getInstance();

    const processFile = async (file: {
      fileName: string;
      content: fs.ReadStream;
    }): Promise<FileWithContent> => {
      try {
        const response = await openai.audio.transcriptions.create({
          file: file.content,
          model: 'whisper-1',
          response_format: 'text',
        });

        return {
          fileName: file.fileName,
          content: response,
        };
      } catch (error) {
        console.error(`Failed to transcribe ${file.fileName}:`, error);
        throw error;
      }
    };

    return Promise.all(filesWithStreams.map((file) => processFile(file)));
  }

  async saveExtractedTextToFiles(
    filesWithContent: FileWithContent[],
    outputFolder: string,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Ensure the output directory exists
    await fs.mkdir(outputFolder, { recursive: true });

    // Save each file's content
    await Promise.all(
      filesWithContent.map(async (file) => {
        const fileName = path.parse(file.fileName).name;
        const outputPath = path.join(outputFolder, `${fileName}.txt`);
        await fs.writeFile(outputPath, file.content, 'utf-8');
      }),
    );
  }

  async extractTextFromBase64Images(
    filesWithBase64Content: FileWithContent[],
  ): Promise<FileWithContent[]> {
    const prompt = `
    Extract text from the image, and return it as a string.
    `;

    const openai = this.openaiService.getInstance();

    const processImage = async (
      file: FileWithContent,
    ): Promise<FileWithContent> => {
      const imageContent: ResponseInputImage = {
        type: 'input_image',
        image_url: `data:image/png;base64,${file.content}`,
        detail: 'auto',
      };

      const messages: ResponseInput = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }, imageContent],
        },
      ];

      const response = await openai.responses.create({
        model: 'gpt-4o',
        input: messages,
        temperature: 0,
      });

      return {
        fileName: file.fileName,
        content: response.output_text,
      };
    };

    const processedFiles = await Promise.all(
      filesWithBase64Content.map((file) => processImage(file)),
    );

    return processedFiles;
  }

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
      });
    }

    return filesWithContent;
  }

  async loadTxtFilesFromFolderWithCustomExtension(
    folderPath: string,
    newExtension: string,
  ): Promise<FileWithContent[]> {
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
      const fileNameWithoutExt = path.parse(file).name;
      const newFileName = `${fileNameWithoutExt}.${newExtension}`;

      filesWithContent.push({
        fileName: newFileName,
        content: content,
      });
    }

    return filesWithContent;
  }

  async loadAllFilesFromFolder(folderPath: string): Promise<FileWithContent[]> {
    // Load and process image files
    let processedImageFiles: FileWithContent[] =
      await this.loadTxtFilesFromFolderWithCustomExtension(
        'src/localAssets/kategoryzacja_png_processed',
        'png',
      );
    if (!processedImageFiles.length) {
      console.log('wchodze do ekstrakcji png');

      const imageFiles = await this.loadPngImagesAsBase64(folderPath);
      processedImageFiles = await this.extractTextFromBase64Images(imageFiles);
      await this.saveExtractedTextToFiles(
        processedImageFiles,
        'src/localAssets/kategoryzacja_png_processed',
      );
    }

    // Load and process audio files
    let processedAudioFiles: FileWithContent[] =
      await this.loadTxtFilesFromFolderWithCustomExtension(
        'src/localAssets/kategoryzacja_mp3_processed',
        'mp3',
      );
    if (!processedAudioFiles.length) {
      console.log('wchodze do ekstrakcji mp3');
      const audioFiles = await this.loadMp3FilesAsStream(folderPath);
      processedAudioFiles = await this.extractTextFromMp3Files(audioFiles);
      await this.saveExtractedTextToFiles(
        processedAudioFiles,
        'src/localAssets/kategoryzacja_mp3_processed',
      );
    }

    // Load text files
    const textFiles = await this.loadTxtFilesFromFolder(folderPath);

    // Combine arrays
    return [...processedImageFiles, ...processedAudioFiles, ...textFiles];
  }

  async categorizeFiles(
    files: FileWithContent[],
  ): Promise<{ people: string[]; hardware: string[] }> {
    const openai = this.openaiService.getInstance();
    const categories = {
      people: [] as string[],
      hardware: [] as string[],
    };

    for (const file of files) {
      const prompt = `
Analyze the following content and categorize it according to these criteria:
1. If the text contains notes about captured people or traces of people presence - category: 'people'
2. If the text contains notes about HARDWARE malfunctions - category: 'hardware'
3. If the text doesn't match any of these categories - category: 'none'
4. Before giving answer, analyze your decision and justify it.
5. In some content's people can be described not directly as people but as some living forms.
6. For 'people' category:
- note must speceifically say that people were captured OR there must be specific evidence that some people were in given area.


<examples>
- Rozpoczęto naprawę anteny nadawczej - category: hardware
- Wykryto jednostkę organiczną w pobliżu północnego skrzydła fabryki. Została ona przekazana do kontroli. - category: people
- I heared that someone were in this area - category: none - no evidence that people were in the area
</examples>

Content to analyze:
${file.content}

Return ONLY one word: 'people', 'hardware', or 'none'.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });

      const category = response.choices[0].message.content
        ?.trim()
        .toLowerCase();

      if (category === 'people') {
        categories.people.push(file.fileName);
      } else if (category === 'hardware') {
        categories.hardware.push(file.fileName);
      }
    }

    return categories;
  }

  async performCategorization(): Promise<Task3Response> {
    const files = await this.loadAllFilesFromFolder(
      'src/localAssets/kategoryzacja',
    );
    const categories = await this.categorizeFiles(files);

    // Sort categories alphabetically
    categories.people.sort();
    categories.hardware.sort();

    console.dir(categories, { depth: null, colors: true });

    return this.reportAnswer(categories);
  }

  async reportAnswer(answer: object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'kategorie',
      apikey,
      answer: {
        ...answer,
      },
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
      return { ...response.data, robotUrl: answer };
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }
}
