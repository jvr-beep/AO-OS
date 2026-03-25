import { Module } from "@nestjs/common";
import { RoomBookingsController } from "./controllers/room-bookings.controller";
import { RoomBookingsService } from "./services/room-bookings.service";

@Module({
  controllers: [RoomBookingsController],
  providers: [RoomBookingsService],
  exports: [RoomBookingsService]
})
export class RoomBookingsModule {}
