import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Task2Service } from './task2.service';
import { Task3Service, Task3Response } from './task3.service';
import { Task5Service } from './task5.service';
import { Task6Service } from './task6.service';
import { Task7Service } from './task7.service';
import { Task8Service } from './task8.service';
import { Task9Service } from './task9.service';
import { Task10Service } from './task10.service';
import { Task11Service } from './task11.service';
import { Task12Service } from './task12.service';
import { ReportInput, ReportService } from './report.service';
import { Task13Service } from './task13.service';
import { Task14Service } from './task14service';
import { Task15Service } from './task15service';
import { Task16Service } from './task16service';
import { Task17Service } from './task17service';
import { Task18Service } from './task18.service';
import {
  DroneInstruction,
  DronePosition,
  Task19Service,
} from './task19.service';
import { Task20Service } from './task20.service';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly reportService: ReportService,
    private readonly task2Service: Task2Service,
    private readonly task3Service: Task3Service,
    private readonly task5Service: Task5Service,
    private readonly task6Service: Task6Service,
    private readonly task7Service: Task7Service,
    private readonly task8Service: Task8Service,
    private readonly task9Service: Task9Service,
    private readonly task10Service: Task10Service,
    private readonly task11Service: Task11Service,
    private readonly task12Service: Task12Service,
    private readonly task13Service: Task13Service,
    private readonly task14Service: Task14Service,
    private readonly task15Service: Task15Service,
    private readonly task16Service: Task16Service,
    private readonly task17Service: Task17Service,
    private readonly task18Service: Task18Service,
    private readonly task19Service: Task19Service,
    private readonly task20Service: Task20Service,
  ) {}

  @Post('reportAnswer')
  async reportAnswer(@Body() reportInput: ReportInput): Promise<Task3Response> {
    return this.reportService.reportAnswer(reportInput);
  }

  @Get('content')
  async getContent(): Promise<string> {
    return this.appService.getAndAnswerAndPost();
  }

  @Get('verify')
  async verify(): Promise<object> {
    return this.task2Service.performVerification();
  }

  @Get('task3')
  async task3(): Promise<Task3Response> {
    return this.task3Service.updateAndReportData();
  }

  @Get('task5')
  async task5(): Promise<Task3Response> {
    return this.task5Service.censorAndReport();
  }

  @Get('task6')
  async task6(): Promise<Task3Response> {
    return this.task6Service.performTranscriptAnalysis();
  }

  @Get('task7')
  async task7(): Promise<string> {
    return this.task7Service.performMapCityIdentification();
  }

  @Get('task8')
  async task8(): Promise<Task3Response> {
    return this.task8Service.performRobotImageGeneration();
  }

  @Get('task9')
  async task9(): Promise<Task3Response> {
    return this.task9Service.performCategorization();
  }

  @Get('task10')
  async task10(): Promise<Task3Response> {
    return this.task10Service.processMarkdownAnswerQuestions();
  }

  @Get('task11')
  async task11(): Promise<Task3Response> {
    return this.task11Service.processWholeFlow();
  }

  @Get('task12/question')
  async task12Question(): Promise<Task3Response | string> {
    return this.task12Service.askRaportQuestion();
  }

  @Post('task12/generate')
  async task12Generate(): Promise<void> {
    await this.task12Service.processRaportVectorsGeneration();
  }

  @Get('task13')
  async task13(): Promise<Task3Response> {
    return this.task13Service.examineDatabaseAndReportAnswer();
  }

  @Get('task14')
  async task14(): Promise<Task3Response | null> {
    return this.task14Service.findBarbara();
  }

  @Get('task15')
  async task15(): Promise<Task3Response> {
    return this.task15Service.loadDataFindPathAndReportAnswer();
  }

  @Get('task15/transcription')
  async task15Transcription(): Promise<string> {
    return this.task15Service.createTranscription();
  }

  @Get('task16/prepare-photos')
  async task16PreparePhotos(): Promise<void> {
    await this.task16Service.processImages();
  }

  @Get('task16')
  async task16(): Promise<Task3Response> {
    return this.task16Service.generateBarbaraDescription();
  }

  @Get('task17/finetuneData')
  async task17finetune(): Promise<void> {
    await this.task17Service.generateTaskFineTuneData();
  }

  @Get('task17')
  async task17(): Promise<Task3Response> {
    return this.task17Service.verifyAndReport();
  }

  @Get('task18')
  async task18(): Promise<Task3Response> {
    return this.task18Service.processAndReportAnswers();
  }
  @Get('task18/find5')
  async task18find5(): Promise<Record<string, string>> {
    return this.task18Service.findNumber5();
  }

  @Post('task19/drone-position')
  @HttpCode(200)
  async task19dronePosition(
    @Body() droneInstruction: DroneInstruction,
  ): Promise<DronePosition> {
    return this.task19Service.getDronePosition(droneInstruction);
  }

  @Post('task20/prepare-data')
  async task20PrepareData(): Promise<void> {
    await this.task20Service.prepareData();
  }

  @Get('task20')
  async task20(): Promise<string> {
    return this.task20Service.answerQuestions();
  }
}
