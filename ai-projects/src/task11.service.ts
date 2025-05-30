import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from './openai.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { Task3Response } from './task3.service';
type FileWithContent = {
  fileName: string;
  content: string;
};
@Injectable()
export class Task11Service {
  constructor(
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
  ) {}

  async loadTxtFilesFromFolder(folderPath: string): Promise<string[]> {
    const files = await fs.readdir(folderPath);
    const txtFiles = files.filter((file) =>
      file.toLowerCase().endsWith('.txt'),
    );

    const fileContents: string[] = [];
    for (const file of txtFiles) {
      const filePath = path.join(folderPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      fileContents.push(content);
    }

    return fileContents;
  }

  async extractKeyInformation(content: string): Promise<string> {
    const openai = this.openaiService.getInstance();

    const prompt = `
    Analyze the following text and extract key information about:
    - Persons (names, surnames - be careful with spelling mistakes (eg. "Kowaski" i "Kowalki"). System powinien rozpoznać, że to ta sama osoba.)
    - Their jobs/roles
    - Places
    - Special skills or notable characteristics
    
    Format the response as a clear, structured text, should be short, stick to the important key informations, often one or two words would be enough.
    If you're unsure about a name's spelling, include your best guess.
    
    Text to analyze:
    ${content}

    Response MUSI być w języku Polskim.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    return response.choices[0].message.content || '';
  }

  async saveTextToFile(
    content: string,
    folderPath: string,
    fileName: string,
  ): Promise<void> {
    // Ensure the output directory exists
    await fs.mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async prepareFactsKeyInfo(): Promise<string> {
    const loadedKeyFactsInfo = await this.loadTxtFilesFromFolder(
      'src/localAssets/facts_key_info',
    );
    if (loadedKeyFactsInfo?.length) {
      return loadedKeyFactsInfo[0];
    }
    const facts = await this.loadTxtFilesFromFolder('src/localAssets/facts');
    const keyInfoMap: { [key: string]: string } = {};

    for (const fact of facts) {
      const keyInfo = await this.extractKeyInformation(fact);
      const factName = `fact${Object.keys(keyInfoMap).length + 1}`;
      keyInfoMap[factName] = keyInfo;
    }

    // Save the key info map to a file
    const keyInfoContent = JSON.stringify(keyInfoMap);

    await this.saveTextToFile(
      keyInfoContent,
      'src/localAssets/facts_key_info',
      'key_info_map.txt',
    );

    return JSON.stringify(keyInfoMap);
  }

  async analyzeReportWithFacts(
    report: FileWithContent,
    facts: string,
  ): Promise<Record<string, string>> {
    const openai = this.openaiService.getInstance();

    const prompt = `
Przeanalizuj treść raportu. Zidentyfikuj kluczowe informacje: co się stało, gdzie, kto był zaangażowany, jakie przedmioty/technologie się pojawiły.
Przeanalizuj fakty. Znajdź fakty powiązane z aktualnie przetwarzanym raportem. Najczęstszym łącznikiem będą osoby wymienione w raporcie i w faktach.
Format w jakim podane są fakty to JSON:
{
fakt1: "fakty",
fakt2: "fakty 2",
etc.
}
Jeśli w raporcie pojawia się osoba, a w "faktach" znajdują się informacje o tej osobie lub inne istotne szczegóły, muszą one trafić do słów kluczowych dla tego raportu.


Wykorzystaj także informacje z nazwy pliku raportu.

Wygeneruj listę słów kluczowych:
- Słowa kluczowe muszą być w języku polskim
- Muszą być w mianowniku (np. "nauczyciel", "programista", a nie "nauczyciela", "programistów")
- Słowa powinny być oddzielone przecinkami (np. słowo1,słowo2,słowo3)
- Lista powinna precyzyjnie opisywać raport, uwzględniając treść raportu, powiązane fakty oraz informacje z nazwy pliku
- Słów kluczowych może być dowolnie wiele dla danego raportu

Jakość słów kluczowych:
- język polski, mianownik, oddzielone przecinkiem. To podstawa.
- Konkretność: Staraj się, aby słowa kluczowe były jak najbardziej specyficzne dla danego raportu i powiązanych faktów. 
- Jeśli raport wspomina o "dzikiej faunie", "zwierzynie leśnej" lub "wildlife", system walidujący prawdopodobnie oczekuje ogólniejszego słowa kluczowego, np. "zwierzęta".
- Nazwiska i imiona: Powinny być uwzględnione, jeśli są istotne.

Nazwa pliku raportu: ${report.fileName}
Treść raportu: ${report.content}
Fakty: ${facts}

Zwróć TYLKO listę słów kluczowych oddzielonych przecinkami, bez żadnych dodatkowych wyjaśnień czy formatowania.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    return {
      [report.fileName]: response.choices[0].message.content || '',
    };
  }

  async loadTxtFilesWithContentFromFolder(
    folderPath: string,
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
      filesWithContent.push({
        fileName: file,
        content: content,
      });
    }

    return filesWithContent;
  }

  async prepareFactsAndAnalyzeReports(): Promise<Record<string, string>> {
    const facts = await this.prepareFactsKeyInfo();
    const reports = await this.loadTxtFilesWithContentFromFolder(
      'src/localAssets/reporty',
    );

    const analysisPromises = reports.map((report) =>
      this.analyzeReportWithFacts(report, facts),
    );

    const results = await Promise.all(analysisPromises);

    const combinedResult = results.reduce<Record<string, string>>(
      (acc, obj) => ({ ...acc, ...obj }),
      {},
    );

    return combinedResult;
  }

  public async processWholeFlow(): Promise<Task3Response> {
    const keywordsObject = await this.prepareFactsAndAnalyzeReports();
    const res = await this.reportAnswer(keywordsObject);

    return res;
  }

  async reportAnswer(answer: object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'dokumenty',
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
      return { ...response.data, answer: answer };
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }
}
