import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
	event: "error",
})
export class ErrorListener extends Listener {
	public run(error: Error) {
		this.container.logger.error(error.stack);

		if (error.name === "ConnectTimeoutError") {
			process.exit(1);
		}
	}
}
