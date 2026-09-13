import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { ReviewsRepository } from "./reviews.repository";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
