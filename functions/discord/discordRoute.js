import { role } from "./controller.js";

export default function discordRoute(app) {
  // Assign or remove the appropriate role to requesting user.
  app.get("/discord/role", role);
}