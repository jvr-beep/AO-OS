import { Module } from '@nestjs/common'
import { KioskController } from './kiosk.controller'
import { KioskBookingService } from './kiosk-booking.service'
import { QrTokenService } from './qr-token.service'
import { AccessControlModule } from '../access-control/access-control.module'
import { StripeModule } from '../stripe/stripe.module'
import { VoiceModule } from '../voice/voice.module'
import { LocationModule } from '../location/location.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [AccessControlModule, StripeModule, VoiceModule, LocationModule, InventoryModule],
  controllers: [KioskController],
  providers: [KioskBookingService, QrTokenService],
  exports: [QrTokenService],
})
export class KioskModule {}
