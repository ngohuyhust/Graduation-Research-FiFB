import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { TrainersController } from "./trainers.controller";
import { TrainersService } from "./trainers.service";
import { TrainersRepository } from "./trainers.repository";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [TrainersController],
  providers: [TrainersService, TrainersRepository],
  exports: [TrainersService, TrainersRepository],
})
export class TrainersModule {}
