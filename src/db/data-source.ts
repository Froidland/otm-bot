import { DataSource } from "typeorm";
import { Lobby, Team, Tournament, User } from "./models";
import * as dotenv from "dotenv";
dotenv.config();

export const AppDataSource = new DataSource({
	type: "mariadb",
	host: process.env.DATABSE_HOST ?? "localhost",
	port: +(process.env.DATABASE_PORT ?? 3306),
	username: process.env.DATABASE_USER ?? null,
	password: process.env.DATABASE_PASSWORD ?? null,
	database: process.env.DATABASE_NAME ?? "panchobot",
	entities: [User, Tournament, Lobby, Team],
	// TODO: Remove synchronize and logging when TypeORM implementation is complete.
	synchronize: true,
	logging: true,
	// TODO: Research how to use migrations.
	migrations: [],
});
