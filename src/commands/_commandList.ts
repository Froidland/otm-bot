import { Command } from "@/interfaces/command";
import { coinflip } from "./currency";
import { balance } from "./currency/balance";
import { ping } from "./general";
import { link, profile } from "./osu";
import { archiveCategory, createMappack, stealEmoji } from "./utility";
import tournament from "./tournament";
import tryout from "./tryout";
import team from "./team";

export const commandList: Command[] = [
	ping,
	profile,
	link,
	archiveCategory,
	createMappack,
	tournament,
	tryout,
	team,
	stealEmoji,
	coinflip,
	balance,
];
