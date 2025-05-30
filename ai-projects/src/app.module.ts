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
    Task2Service,
    Task3Service,
    Task5Service,
    Task6Service,
    Task7Service,
    Task8Service,
    Task9Service,
    Task10Service,
    Task11Service,
  ],
})
export class AppModule {}
