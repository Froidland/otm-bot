import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { pickSet } from "./pick-set";
import { pickRemove } from "./pick-remove";
import { mappool } from "./mappool";

const stageGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("stage")
		.setDescription("Commands for managing tryout stages.")
		.addSubcommand(create.data)
		.addSubcommand(pickSet.data)
		.addSubcommand(pickRemove.data)
		.addSubcommand(mappool.data),
	subCommands: [create, pickSet, pickRemove, mappool],
};

export default stageGroup;
