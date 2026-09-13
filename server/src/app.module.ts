import { FavoritesModule } from "./modules/favorites/favorites.module";
import { TrainersModule } from "./modules/trainers/trainers.module";
import { TrainerCertificatesModule } from "./modules/trainerCertificates/trainerCertificates.module";
import { TrainerConnectionsModule } from "./modules/trainerConnections/trainerConnections.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { Module } from "@nestjs/common";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { ExerciseTaxonomyModule } from "./modules/exerciseTaxonomy/exerciseTaxonomy.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    FavoritesModule,
    ExercisesModule,
    ExerciseTaxonomyModule,
    AuthModule,
    UsersModule,
    AdminModule,
    TrainersModule,
    TrainerCertificatesModule,
    TrainerConnectionsModule,
    ReviewsModule,
  ],
})
export class AppModule {}
