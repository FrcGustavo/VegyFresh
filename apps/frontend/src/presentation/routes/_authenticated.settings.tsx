import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "../settings/pages/SettingsPage";
export const Route = createFileRoute("/_authenticated/settings")({ component: () => <SettingsPage /> });
