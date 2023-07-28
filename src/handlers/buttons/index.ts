import { ButtonHandler } from "@/interfaces/buttonHandler";
import { joinTryout } from "./tryout";
import { leaveTryout } from "./tryout/leave";

export const buttonList: ButtonHandler[] = [joinTryout, leaveTryout];
