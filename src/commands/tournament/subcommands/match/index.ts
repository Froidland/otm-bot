import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { claim } from "./claim";

const matchGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("match")
		.setDescription("Commands for managing tournament matches.")
		.addSubcommand(create.data)
		.addSubcommand(claim.data),
	subCommands: [create, claim],
};

export default matchGroup;
