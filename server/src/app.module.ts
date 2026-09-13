import { Module } from "@nestjs/common";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { ExerciseTaxonomyModule } from "./modules/exerciseTaxonomy/exerciseTaxonomy.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({ imports: [ExercisesModule, ExerciseTaxonomyModule, AuthModule, UsersModule, AdminModule] })
export class AppModule {}
