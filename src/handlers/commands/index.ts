import { Command } from "@/interfaces/command";
import { link, profile } from "./osu";
import { archiveCategory, stealEmoji } from "./utility";
import tournament from "./tournament";
import tryout from "./tryout";
import team from "./team";

export const commandList: Command[] = [
	profile,
	link,
	archiveCategory,
	tournament,
	tryout,
	team,
	stealEmoji,
];
