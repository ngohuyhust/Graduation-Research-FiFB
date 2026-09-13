import { Module } from "@nestjs/common";
import { EmailDeliveriesRepository } from "./emailDeliveries.repository";
import { EmailDeliveriesService } from "./emailDeliveries.service";
@Module({ providers: [EmailDeliveriesRepository, EmailDeliveriesService], exports: [EmailDeliveriesRepository, EmailDeliveriesService] })
export class EmailDeliveriesModule {}
