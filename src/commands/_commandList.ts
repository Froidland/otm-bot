import { Command } from "@/interfaces/command";
import { coinflip } from "./currency";
import { balance } from "./currency/balance";
import { ping } from "./general";
import { link, profile } from "./osu";
import {
	createMatch,
	createMappack,
	createTournament,
	createTryout,
	createTryoutStage,
} from "./tournament/management/create";
import { archiveCategory, stealEmoji } from "./utility";
import { joinLobby, searchLobby } from "./tournament/players";

export const commandList: Command[] = [
	ping,
	profile,
	link,
	archiveCategory,
	createMatch,
	createMappack,
	createTournament,
	createTryout,
	createTryoutStage,
	joinLobby,
	searchLobby,
	stealEmoji,
	coinflip,
	balance,
];
