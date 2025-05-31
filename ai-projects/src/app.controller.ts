import { Controller, Get, Post } from '@nestjs/common';
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
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
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
  ) {}

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
}
