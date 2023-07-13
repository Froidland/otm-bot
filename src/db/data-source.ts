import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import {
	Match,
	OAuthRequest,
	Team,
	Tournament,
	Tryout,
	TryoutLobby,
	TryoutStage,
	User,
} from "./models";
dotenv.config();

const AppDataSource = new DataSource({
	type: "mariadb",
	host: process.env.DATABASE_HOST ?? "localhost",
	port: +(process.env.DATABASE_PORT ?? 3306),
	username: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME ?? "panchobot",
	entities: [
		User,
		Tournament,
		Match,
		Team,
		Tryout,
		TryoutLobby,
		TryoutStage,
		OAuthRequest,
	],
	synchronize: process.env.NODE_ENV === "development",
	logging: process.env.NODE_ENV === "development",
	migrations: [],
});

export default AppDataSource;
