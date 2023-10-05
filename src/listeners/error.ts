import { Listener } from "@sapphire/framework";

export class ErrorListener extends Listener {
	public constructor(context: Listener.Context, options: Listener.Options) {
		super(context, {
			...options,
			event: "error",
		});
	}

	public run(error: Error) {
		this.container.logger.error(error.stack);

		if (error.name === "ConnectTimeoutError") {
			process.exit(1);
		}
	}
}
