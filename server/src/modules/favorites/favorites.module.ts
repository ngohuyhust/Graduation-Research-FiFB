import { ExercisesModule } from "../exercises/exercises.module";
import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";
import { FavoritesRepository } from "./favorites.repository";

@Module({
  imports: [ExercisesModule, HttpModule, DatabaseModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesRepository],
  exports: [FavoritesService, FavoritesRepository],
})
export class FavoritesModule {}
