import { Command } from "@/interfaces/command";
import { link, profile } from "./osu";
import { archiveCategory, createMappack, stealEmoji } from "./utility";
import tournament from "./tournament";
import tryout from "./tryout";
import team from "./team";

export const commandList: Command[] = [
	profile,
	link,
	archiveCategory,
	createMappack,
	tournament,
	tryout,
	team,
	stealEmoji,
];
