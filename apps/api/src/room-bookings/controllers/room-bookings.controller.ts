import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { BookingResponseDto } from "../dto/booking.response.dto";
import { CancelBookingDto } from "../dto/cancel-booking.dto";
import { CheckInBookingDto } from "../dto/check-in-booking.dto";
import { CheckOutBookingDto } from "../dto/check-out-booking.dto";
import { CreateBookingDto } from "../dto/create-booking.dto";
import { ListBookingsQueryDto } from "../dto/list-bookings.query.dto";
import { RoomBookingsService } from "../services/room-bookings.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomBookingsController {
  constructor(private readonly roomBookingsService: RoomBookingsService) {}

  @Post("bookings")
  @Roles("front_desk", "operations", "admin")
  createBooking(@Body() body: CreateBookingDto): Promise<BookingResponseDto> {
    return this.roomBookingsService.createBooking(body);
  }

  @Get("bookings")
  @Roles("front_desk", "operations", "admin")
  listBookings(@Query() query: ListBookingsQueryDto): Promise<BookingResponseDto[]> {
    return this.roomBookingsService.listBookings(query);
  }

  @Get("members/:id/bookings")
  @Roles("front_desk", "operations", "admin")
  listMemberBookings(
    @Param("id") memberId: string,
    @Query() query: ListBookingsQueryDto
  ): Promise<BookingResponseDto[]> {
    return this.roomBookingsService.listMemberBookings(memberId, query);
  }

  @Get("rooms/:id/bookings")
  @Roles("front_desk", "operations", "admin")
  listRoomBookings(
    @Param("id") roomId: string,
    @Query() query: ListBookingsQueryDto
  ): Promise<BookingResponseDto[]> {
    return this.roomBookingsService.listRoomBookings(roomId, query);
  }

  @Post("bookings/:id/check-in")
  @Roles("front_desk", "operations", "admin")
  checkInBooking(@Param("id") bookingId: string, @Body() body: CheckInBookingDto): Promise<BookingResponseDto> {
    return this.roomBookingsService.checkInBooking(bookingId, body);
  }

  @Post("bookings/:id/check-out")
  @Roles("front_desk", "operations", "admin")
  checkOutBooking(
    @Param("id") bookingId: string,
    @Body() body: CheckOutBookingDto
  ): Promise<BookingResponseDto> {
    return this.roomBookingsService.checkOutBooking(bookingId, body);
  }

  @Post("bookings/:id/cancel")
  @Roles("front_desk", "operations", "admin")
  cancelBooking(@Param("id") bookingId: string, @Body() body: CancelBookingDto): Promise<BookingResponseDto> {
    return this.roomBookingsService.cancelBooking(bookingId, body);
  }
}
