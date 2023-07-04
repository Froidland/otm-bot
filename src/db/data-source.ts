import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Match, Team, Tournament, Tryout, TryoutLobby, User } from "./models";
dotenv.config();

const AppDataSource = new DataSource({
	type: "mariadb",
	host: process.env.DATABSE_HOST ?? "localhost",
	port: +(process.env.DATABASE_PORT ?? 3306),
	username: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME ?? "panchobot",
	entities: [User, Tournament, Match, Team, Tryout, TryoutLobby],
	// TODO: Remove synchronize and logging when TypeORM implementation is complete.
	synchronize: true,
	logging: true,
	// TODO: Research how to use migrations.
	migrations: [],
});

export default AppDataSource;
