export type LobbyUser = {
	osuId: string;
	osuUsername: string;
	discordId: string | null;
};

type Map = {
	beatmapId: number;
	pickId: string;
	mods: string;
};

type LobbyState =
	| "initializing"
	| "playing"
	| "waiting"
	| "overtime"
	| "override"
	| "aborted"
	| "errored"
	| "panicked"
	| "finished";

type BaseLobby = {
	id: string;
	name: string;
	banchoId: string | null;
	players: LobbyUser[];
	referees: LobbyUser[];
	mappool: Map[];
	mappoolQueue: string[]; //? Just an array of pickIds. Gets shifted when a map is picked.
	mappoolHistory: Map[]; //? Used in case the bot crashes and we need to resume the lobby.
	currentStartedAt: string | null;
	refereeRoleId: string;
	staffNotifChannelId: string;
	playerNotifChannelId: string;
	schedule: string;
	state: LobbyState;
	initialOvertime: boolean;
};

export type TryoutLobby = BaseLobby & {
	type: "tryout";
	customId: string;
};

export type QualifierLobby = BaseLobby & {
	type: "qualifier";
	teamName: string;
	captain: LobbyUser;
	inLobbyPlayerCount: number;
};

export type AutoLobby = TryoutLobby | QualifierLobby;

// TODO: Persist this in redis as fallback in case the bot crashes.
export const lobbyStore: AutoLobby[] = [];
