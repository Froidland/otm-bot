import BanchoJs from "bancho.js";
import { playerList } from "./playerList";
import { panic } from "./panic";
import { replay } from "./replay";
import { history } from "./history";

export type BanchoCommand = {
	name: string;
	aliases: string[];
	description: string;
	usage: string;
	executePM?: (
		client: BanchoJs.BanchoClient,
		event: BanchoJs.PrivateMessage,
	) => Promise<void>;
	executeCM?: (
		client: BanchoJs.BanchoClient,
		event: BanchoJs.ChannelMessage,
	) => Promise<void>;
};

export class CommandError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CommandError";
	}
}

const commands: BanchoCommand[] = [playerList, panic, replay, history];

export default commands;
