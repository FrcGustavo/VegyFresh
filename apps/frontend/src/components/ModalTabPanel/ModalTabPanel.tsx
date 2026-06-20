import { Box } from "@mui/material";
import { modalTabPanelStyles } from "./ModalTabPanel.styles";
import type { ModalTabPanelProps } from "./ModalTabPanel.types";

export default function ModalTabPanel({
  value,
  index,
  children,
}: ModalTabPanelProps) {
  return (
    <div hidden={value !== index} style={modalTabPanelStyles.wrapper}>
      {value === index && <Box sx={modalTabPanelStyles.content}>{children}</Box>}
    </div>
  );
}
