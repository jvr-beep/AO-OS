import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BookingsService } from '../services/bookings.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import { ListBookingsQueryDto } from '../dto/list-bookings.query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guest-bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('front_desk', 'operations', 'admin')
  createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }

  @Get('code/:bookingCode')
  @Roles('front_desk', 'operations', 'admin')
  getBookingByCode(@Param('bookingCode') bookingCode: string) {
    return this.bookingsService.getBookingByCode(bookingCode);
  }

  @Get('qr/:qrToken')
  @Roles('front_desk', 'operations', 'admin')
  getBookingByQrToken(@Param('qrToken') qrToken: string) {
    return this.bookingsService.getBookingByQrToken(qrToken);
  }

  @Get(':bookingId')
  @Roles('front_desk', 'operations', 'admin')
  getBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.bookingsService.getBooking(bookingId);
  }

  @Get('guests/:guestId/bookings')
  @Roles('front_desk', 'operations', 'admin')
  listGuestBookings(
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listGuestBookings(guestId, query);
  }

  @Patch(':bookingId/status')
  @Roles('front_desk', 'operations', 'admin')
  updateBookingStatus(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(bookingId, dto);
  }

  @Post(':bookingId/cancel')
  @Roles('front_desk', 'operations', 'admin')
  cancelBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: { reason?: string },
  ) {
    return this.bookingsService.cancelBooking(bookingId, body.reason);
  }
}
