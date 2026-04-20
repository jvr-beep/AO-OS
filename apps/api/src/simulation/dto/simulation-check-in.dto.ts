import { IsString } from 'class-validator'

export class SimulationCheckInDto {
  @IsString() memberId: string
  @IsString() locationId: string
}

export class SimulationCheckOutDto {
  @IsString() memberId: string
  @IsString() locationId: string
}
