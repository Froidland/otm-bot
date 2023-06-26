import { Command } from "../interfaces/command";
import { coinflip } from "./currency";
import { balance } from "./currency/balance";
import { ping } from "./general";
import { link, profile } from "./osu";
import { createTournament } from "./tournament";
import { archiveCategory, stealEmoji } from "./utility";

export const commandList: Command[] = [
	ping,
	profile,
	link,
	archiveCategory,
	createTournament,
	stealEmoji,
	coinflip,
	balance,
];
