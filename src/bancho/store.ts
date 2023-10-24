export type AutoLobby = {
	id: string;
	name: string;
	customId: string;
	banchoId: string | null;
	players: {
		osuId: string;
		osuUsername: string;
		discordId: string | null;
	}[];
	referees: {
		osuId: string;
		osuUsername: string;
		discordId: string | null;
	}[];
	mappool: {
		beatmapId: number;
		pickId: string;
		mods: string;
	}[];
	mappoolQueue: string[]; //? Just an array of pickIds. Gets shifted when a map is picked.
	refereeRoleId: string;
	staffChannelId: string;
	playerChannelId: string;
	schedule: string;
	//? Used in case the bot crashes and we need to resume the lobby.
	lastPick: {
		beatmapId: number;
		pickId: string;
		mods: string;
		startedAt: string | null; //? Used in the threshold check for the !abort command.
	} | null;
	state:
		| "initializing"
		| "playing"
		| "waiting"
		| "overtime"
		| "override"
		| "aborted"
		| "errored"
		| "finished";
	initialOvertime: boolean;
};

// TODO: Persist this in redis as fallback in case the bot crashes.
export const ongoingTryoutLobbies: AutoLobby[] = [];
