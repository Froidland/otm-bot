import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { pickSet } from "./pick-set";

const stageGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("stage")
		.setDescription("Commands for managing tryout stages.")
		.addSubcommand(create.data)
		.addSubcommand(pickSet.data),
	subCommands: [create, pickSet],
};

export default stageGroup;
