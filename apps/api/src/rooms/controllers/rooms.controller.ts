import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateRoomDto } from "../dto/create-room.dto";
import { ListRoomsQueryDto } from "../dto/list-rooms.query.dto";
import { RoomResponseDto } from "../dto/room.response.dto";
import { RoomsService } from "../services/rooms.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post("rooms")
  @Roles("operations", "admin")
  createRoom(@Body() body: CreateRoomDto): Promise<RoomResponseDto> {
    return this.roomsService.createRoom(body);
  }

  @Get("rooms")
  @Roles("front_desk", "operations", "admin")
  listRooms(@Query() query: ListRoomsQueryDto): Promise<RoomResponseDto[]> {
    return this.roomsService.listRooms(query);
  }

  @Get("rooms/:id")
  @Roles("front_desk", "operations", "admin")
  getRoom(@Param("id") id: string): Promise<RoomResponseDto> {
    return this.roomsService.getRoom(id);
  }
}
