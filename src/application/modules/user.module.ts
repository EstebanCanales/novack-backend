import { Module } from "@nestjs/common";
import { UserService } from "../services/user.service";
import { UserController } from "../../interface/controllers/user.controller";

@Module({
	controllers: [UserController],
	providers: [UserService],
})
export class UserModule {}
