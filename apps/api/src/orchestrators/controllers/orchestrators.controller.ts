import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { BookingCheckInDto } from "../dto/booking-check-in.dto";
import { CheckoutDto } from "../dto/checkout.dto";
import { WalkInCheckInDto } from "../dto/walk-in-check-in.dto";
import { OrchestratorsService } from "../services/orchestrators.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orchestrators")
export class OrchestratorsController {
  constructor(private readonly orchestratorsService: OrchestratorsService) {}

  @Post("check-in/booking")
  @Roles("front_desk", "operations", "admin")
  checkInFromBooking(@Body() dto: BookingCheckInDto) {
    return this.orchestratorsService.checkInFromBooking(dto);
  }

  @Post("check-in/walk-in")
  @Roles("front_desk", "operations", "admin")
  walkInCheckIn(@Body() dto: WalkInCheckInDto) {
    return this.orchestratorsService.walkInCheckIn(dto);
  }

  @Post("checkout")
  @Roles("front_desk", "operations", "admin")
  checkout(@Body() dto: CheckoutDto) {
    return this.orchestratorsService.checkout(dto);
  }
}
