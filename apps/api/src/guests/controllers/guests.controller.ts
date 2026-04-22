import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateGuestDto } from "../dto/create-guest.dto";
import { GuestLookupResponseDto } from "../dto/guest-lookup.response.dto";
import { GuestResponseDto } from "../dto/guest.response.dto";
import { LookupGuestDto } from "../dto/lookup-guest.dto";
import { UpdateGuestDto } from "../dto/update-guest.dto";
import { GuestsService } from "../services/guests.service";

@Controller("guests")
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  createGuest(@Body() body: CreateGuestDto): Promise<GuestResponseDto> {
    return this.guestsService.create(body);
  }

  @Post("lookup")
  lookupGuest(@Body() body: LookupGuestDto): Promise<GuestLookupResponseDto> {
    return this.guestsService.lookup(body);
  }

  @Get(":guestId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  getGuest(@Param("guestId") guestId: string): Promise<GuestResponseDto> {
    return this.guestsService.findOne(guestId);
  }

  @Patch(":guestId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  updateGuest(@Param("guestId") guestId: string, @Body() body: UpdateGuestDto): Promise<GuestResponseDto> {
    return this.guestsService.update(guestId, body);
  }

  @Get(":guestId/wristband-links")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listWristbandLinks(@Param("guestId") guestId: string) {
    return this.guestsService.listWristbandLinks(guestId);
  }

  @Post("merge")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  mergeGuests(@Body() body: { source_guest_id: string; target_guest_id: string }) {
    return this.guestsService.mergeGuests(body.source_guest_id, body.target_guest_id);
  }
}
