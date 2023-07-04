export * from "./models";

import AppDataSource from "./data-source";
import {
	Tournament,
	Match,
	User,
	Team,
	Tryout,
	TryoutLobby,
	TryoutStage,
} from "./models";

// TODO: This looks like a mess. Makes thinks look better in other files but this file is a mess. Research how to make this better.
const db = {
	users: AppDataSource.getRepository(User),
	tournaments: AppDataSource.getRepository(Tournament),
	matches: AppDataSource.getRepository(Match),
	teams: AppDataSource.getRepository(Team),
	tryouts: AppDataSource.getRepository(Tryout),
	tryoutStages: AppDataSource.getRepository(TryoutStage),
	tryoutLobbies: AppDataSource.getRepository(TryoutLobby),
};

export default db;
