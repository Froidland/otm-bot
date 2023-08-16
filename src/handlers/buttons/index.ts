import { ButtonHandler } from "@/interfaces/buttonHandler";
import { joinTryout, leaveTryout } from "./tryout";

export const buttonList: ButtonHandler[] = [joinTryout, leaveTryout];
