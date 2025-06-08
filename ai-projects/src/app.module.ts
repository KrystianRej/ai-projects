import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenaiService } from './openai.service';
import { Task2Service } from './task2.service';
import { Task3Service } from './task3.service';
import { Task5Service } from './task5.service';
import { Task6Service } from './task6.service';
import { Task7Service } from './task7.service';
import { CloudinaryService } from './cloudinary.service';
import { Task8Service } from './task8.service';
import { Task9Service } from './task9.service';
import { Task10Service } from './task10.service';
import { Task11Service } from './task11.service';
import { VectorService } from './VectorService';
import { Task12Service } from './task12.service';
import { ReportService } from './report.service';
import { Task13Service } from './task13.service';
import { FileService } from './file.service';
import { AidevsApiService } from './aidevs-api.service';
import { Task14Service } from './task14service';
import { Neo4jService } from './neo4j.service';
import { Task15Service } from './task15service';
import { Task16Service } from './task16service';
import { Task17Service } from './task17service';
import { Task18Service } from './task18.service';
import { Task19Service } from './task19.service';
import { Task20Service } from './task20.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OpenaiService,
    CloudinaryService,
    VectorService,
    ReportService,
    Task2Service,
    Task3Service,
    Task5Service,
    Task6Service,
    Task7Service,
    Task8Service,
    Task9Service,
    Task10Service,
    Task11Service,
    Task12Service,
    Task13Service,
    Task14Service,
    Task15Service,
    Task16Service,
    Task17Service,
    Task18Service,
    Task19Service,
    Task20Service,
    FileService,
    AidevsApiService,
    Neo4jService,
  ],
})
export class AppModule {}
