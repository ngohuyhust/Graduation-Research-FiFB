import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { HttpModule } from "../../common/http.module";
import { TrainingProfilesService } from "./trainingProfiles.service";
import { TrainingProfilesController } from "./trainingProfiles.controller";

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [TrainingProfilesController],
  providers: [TrainingProfilesService],
})
export class TrainingProfilesModule {}
