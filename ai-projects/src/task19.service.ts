import { Injectable } from '@nestjs/common';
import { AidevsApiService } from './aidevs-api.service';
import { FileService } from './file.service';
import { OpenaiService } from './openai.service';
import { ReportService } from './report.service';

export type DronePosition = {
  description: string;
};

export type DroneInstruction = {
  instruction: string;
};

@Injectable()
export class Task19Service {
  constructor(
    private readonly reportService: ReportService,
    private readonly aidevsApiService: AidevsApiService,
    private readonly openaiService: OpenaiService,
    private readonly fileService: FileService,
  ) {}

  private async analyzDronePosition(instruction: string): Promise<string> {
    const prompt = `Jesteś systemem nawigacyjnym drona. Przed Tobą znajduje się mapa podzielona na siatkę 4x4 (16 kwadratów). Opis mapy od lewej do prawej, od góry do dołu:

RZĄD 1: Punkt startowy (znacznik lokalizacji), Pole, Drzewo, Dom
RZĄD 2: Pole, Wiatrak, Pole, Pole  
RZĄD 3: Pole, Pole, Skały, Dwa drzewa
RZĄD 4: Góry, Góry, Samochód, Jaskinia

ZASADY:
- Dron zawsze startuje z lewego górnego rogu (Punkt startowy)
- Odpowiadaj TYLKO krótko i konkretnie o aktualnej lokalizacji drona
- Używaj nazw: "Punkt startowy", "Pole", "Drzewo", "Dom", "Wiatrak", "Skały", "Dwa drzewa", "Góry", "Samochód", "Jaskinia"
- Zawsze podaj tylko nazwę miejsca gdzie jest dron

Dostaniesz opis w jaki sposób poruszył się Dron. Przeanalizuj całą instrukcję i dopiero podejmij decyzję.
`;
    const openai = this.openaiService.getInstance();

    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: prompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: instruction }],
        },
      ],
    });

    return response.output_text.toLowerCase();
  }

  public async getDronePosition(
    droneInput: DroneInstruction,
  ): Promise<DronePosition> {
    console.log('Input:', droneInput.instruction);
    const position = await this.analyzDronePosition(droneInput.instruction);
    console.log('Position:', position);
    return {
      description: position,
    };
  }
}
