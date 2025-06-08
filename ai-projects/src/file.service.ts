import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class FileService {
  constructor(private readonly configService: ConfigService) {}

  async loadFilesFromFolder(
    folderPath: string,
    format: string,
  ): Promise<string[]> {
    const files = await fs.readdir(folderPath);
    const txtFiles = files.filter((file) =>
      file.toLowerCase().endsWith(format),
    );

    const fileContents: string[] = [];
    for (const file of txtFiles) {
      const filePath = path.join(folderPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      fileContents.push(content);
    }

    return fileContents;
  }

  async loadSpecificFileFromFolder(
    folderPath: string,
    fileName: string,
  ): Promise<string | null> {
    const filePath = path.join(folderPath, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Failed to load file ${fileName}: ${error}`);
      }
      return null;
    }
  }

  async loadFileAsBuffer(
    folderPath: string,
    fileName: string,
  ): Promise<Buffer | null> {
    const filePath = path.join(folderPath, fileName);
    try {
      const content = await fs.readFile(filePath);
      return content;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Failed to load file ${fileName}: ${error}`);
      }
      return null;
    }
  }

  async saveTextToFile(
    folderPath: string,
    fileName: string,
    content: string,
  ): Promise<void> {
    const filePath = path.join(folderPath, fileName);
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to save file ${fileName}: ${error.message}`);
      }
      throw new Error(
        `Failed to save file ${fileName}: Unknown error occurred`,
      );
    }
  }

  async loadImageAsBase64(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  }
}
