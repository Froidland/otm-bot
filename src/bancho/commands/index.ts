import BanchoJs from "bancho.js";
import { players } from "./playerList";
import { panic } from "./panic";

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

const commands: BanchoCommand[] = [players, panic];

export default commands;
