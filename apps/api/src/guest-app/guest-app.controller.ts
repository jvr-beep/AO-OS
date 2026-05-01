import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common'
import { IsString, IsOptional, IsIn, IsInt, Min, IsDateString } from 'class-validator'
import { GuestAppService } from './guest-app.service'
import { GuestTokenService } from './guest-token.service'

class IdentifyGuestDto {
  @IsString()
  firstName!: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string
}

class BookingPaymentIntentDto {
  @IsString()
  tierId!: string

  @IsInt()
  @Min(1)
  durationMinutes!: number

  @IsString()
  @IsIn(['room', 'locker'])
  productType!: 'room' | 'locker'

  @IsOptional()
  @IsString()
  currency?: string
}

class ConfirmBookingDto {
  @IsOptional()
  @IsString()
  paymentIntentId?: string | null

  @IsString()
  tierId!: string

  @IsInt()
  @Min(1)
  durationMinutes!: number

  @IsString()
  @IsIn(['room', 'locker'])
  productType!: 'room' | 'locker'

  @IsDateString()
  arrivalDate!: string
}

@Controller('guest-app')
export class GuestAppController {
  constructor(
    private readonly service: GuestAppService,
    private readonly guestTokens: GuestTokenService,
  ) {}

  private requireGuestToken(header: string | undefined): string {
    if (!header) throw new UnauthorizedException('Guest token required')
    const payload = this.guestTokens.verify(header)
    return payload.guestId
  }

  @Get('catalog')
  @HttpCode(200)
  getCatalog() {
    return this.service.getCatalog()
  }

  @Post('identify')
  @HttpCode(200)
  identify(@Body() dto: IdentifyGuestDto) {
    return this.service.identifyGuest(dto)
  }

  @Post('booking/payment-intent')
  @HttpCode(201)
  createPaymentIntent(
    @Headers('x-guest-token') token: string | undefined,
    @Body() dto: BookingPaymentIntentDto,
  ) {
    const guestId = this.requireGuestToken(token)
    return this.service.createPaymentIntent(guestId, dto)
  }

  @Post('booking/confirm')
  @HttpCode(201)
  confirmBooking(
    @Headers('x-guest-token') token: string | undefined,
    @Body() dto: ConfirmBookingDto,
  ) {
    const guestId = this.requireGuestToken(token)
    return this.service.confirmBooking(guestId, {
      paymentIntentId: dto.paymentIntentId ?? null,
      tierId: dto.tierId,
      durationMinutes: dto.durationMinutes,
      productType: dto.productType,
      arrivalDate: dto.arrivalDate,
    })
  }

  @Get('booking/:bookingCode')
  @HttpCode(200)
  getBooking(@Param('bookingCode') bookingCode: string) {
    return this.service.getBookingByCode(bookingCode)
  }
}
