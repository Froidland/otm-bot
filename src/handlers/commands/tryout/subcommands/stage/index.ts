import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { mapSet } from "./map-set";
import { mapRemove } from "./map-remove";
import { mappool } from "./mappool";
import { publish } from "./publish";

const stageGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("stage")
		.setDescription("Commands for managing tryout stages.")
		.addSubcommand(create.data)
		.addSubcommand(mapSet.data)
		.addSubcommand(mapRemove.data)
		.addSubcommand(mappool.data)
		.addSubcommand(publish.data),
	subCommands: [create, mapSet, mapRemove, mappool, publish],
};

export default stageGroup;
