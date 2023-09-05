import { Client, REST, Routes } from "discord.js";
import { logger } from "@/utils";
import { contextCommandList, commandList } from "@/handlers";

export const onReady = async (client: Client) => {
	const rest = new REST().setToken(process.env.BOT_TOKEN!);
	const slashCommandsData = commandList.map((command) => command.data.toJSON());
	const contextMenuCommands = contextCommandList.map((command) =>
		command.data.toJSON(),
	);

	if (process.env.DEV_GUILD_ID) {
		await rest.put(
			Routes.applicationGuildCommands(
				client.user!.id,
				process.env.DEV_GUILD_ID,
			),
			{ body: [...slashCommandsData, ...contextMenuCommands] },
		);

		logger.info("Registered guild commands successfully!");

		return;
	}

	await rest.put(Routes.applicationCommands(client.user!.id), {
		body: [...slashCommandsData, ...contextCommandList],
	});
	logger.info("Registered global commands successfully!");

	// Command deletion.
	/* 
  // for guild-based commands
  await rest
    .put(
      Routes.applicationGuildCommands(client.user.id, process.env.DEV_GUILD_ID),
      { body: [] }
    )
    .then(() => console.log("Successfully deleted all guild commands."))
    .catch(console.error);

  // for global commands
  await rest
    .put(Routes.applicationCommands(client.user.id), { body: [] })
    .then(() => console.log("Successfully deleted all application commands."))
    .catch(console.error); */
};
